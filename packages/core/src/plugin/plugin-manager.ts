import fs from 'fs-extra';
import path from 'path';
import { Model } from 'mongoose';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { PluginRegistry } from './plugin-registry';
import { PluginLoader } from './plugin-loader';
import { PluginHooks } from './plugin-hooks';
import { 
  type Plugin, 
  type PluginManifest, 
  type PluginRecord,
  type PluginDependency,
  type PluginError,
  type PluginEvent, 
  PluginStatus
} from './plugin-types';

export interface PluginManagerConfig {
  pluginsDirectory: string;
  autoLoad: boolean;
  enabledByDefault: boolean;
  maxConcurrentOperations: number;
  operationTimeout: number;
}

export interface PluginOperationResult {
  success: boolean;
  plugin: string;
  message: string;
  error?: PluginError;
}

export class PluginManager {
  private static instance: PluginManager;
  private logger = new Logger('PluginManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private registry = PluginRegistry.getInstance();
  private loader = PluginLoader.getInstance();
  private hooks = PluginHooks.getInstance();
  private pluginModel: Model<PluginRecord> | null = null;
  private initialized = false;
  private activeOperations = new Set<string>();

  private readonly defaultConfig: PluginManagerConfig = {
    pluginsDirectory: './packages/plugins',
    autoLoad: true,
    enabledByDefault: false,
    maxConcurrentOperations: 5,
    operationTimeout: 30000,
  };

  private constructor() {}

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * Initialize plugin manager
   */
  public async initialize(pluginModel?: Model<PluginRecord>): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Plugin manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Plugin Manager...');

      // Set plugin model for database operations
      if (pluginModel) {
        this.pluginModel = pluginModel;
      }

      // Load configuration
      const config = this.config.get('plugins', this.defaultConfig);

      // Ensure plugins directory exists
      await fs.ensureDir((await config).pluginsDirectory);

      // Auto-load plugins if enabled
      if ((await config).autoLoad) {
        await this.loadAllPlugins();
        await this.activateEnabledPlugins();
      }

      this.initialized = true;
      this.logger.info('Plugin Manager initialized successfully');

      // Emit initialization event
      await this.events.emit('plugin_manager:initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Plugin Manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown plugin manager
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      this.logger.info('Shutting down Plugin Manager...');

      // Deactivate all active plugins
      const activePlugins = this.registry.getActive();
      for (const entry of activePlugins) {
        await this.deactivatePlugin(entry.manifest.name);
      }

      // Clear all loaded plugins
      await this.loader.clearAll();

      // Clear registry
      this.registry.clear();

      // Clear hooks
      this.hooks.clear();

      this.initialized = false;
      this.logger.info('Plugin Manager shutdown complete');

      // Emit shutdown event
      await this.events.emit('plugin_manager:shutdown');
    } catch (error) {
      this.logger.error('Error during Plugin Manager shutdown:', error);
      throw error;
    }
  }

  /**
   * Load all plugins from directory
   */
  public async loadAllPlugins(): Promise<PluginOperationResult[]> {
    const config = this.config.get('plugins', this.defaultConfig);
    const results: PluginOperationResult[] = [];

    try {
      this.logger.info(`Loading plugins from: ${(await config).pluginsDirectory}`);

      const loadedPlugins = await this.loader.loadPluginsFromDirectory((await config).pluginsDirectory);

      for (const loadedPlugin of loadedPlugins) {
        try {
          // Register plugin
          this.registry.register(
            loadedPlugin.name,
            loadedPlugin.manifest,
            loadedPlugin.path,
            loadedPlugin.instance
          );

          // Update database record
          await this.updatePluginRecord(loadedPlugin);

          results.push({
            success: true,
            plugin: loadedPlugin.name,
            message: `Plugin loaded successfully: ${loadedPlugin.name} v${loadedPlugin.manifest.version}`,
          });

          // Emit load event
          await this.events.emit('plugin:loaded', {
            plugin: loadedPlugin.name,
            manifest: loadedPlugin.manifest,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            success: false,
            plugin: loadedPlugin.name,
            message: `Failed to register plugin: ${errorMsg}`,
            error: {
              code: 'REGISTRATION_FAILED',
              message: errorMsg,
              context: { plugin: loadedPlugin.name },
            },
          });
        }
      }

      this.logger.info(`Loaded ${results.filter(r => r.success).length} plugins`);
      return results;
    } catch (error) {
      this.logger.error('Error loading plugins:', error);
      throw error;
    }
  }

  /**
   * Install plugin from path
   */
  public async installPlugin(pluginPath: string): Promise<PluginOperationResult> {
    try {
      this.logger.info(`Installing plugin from: ${pluginPath}`);

      // Load plugin
      const loadedPlugin = await this.loader.loadPlugin(pluginPath);

      // Check if plugin already exists
      if (this.registry.has(loadedPlugin.name)) {
        throw new Error(`Plugin already installed: ${loadedPlugin.name}`);
      }

      // Check dependencies
      const depCheck = await this.checkDependencies(loadedPlugin.manifest);
      if (!depCheck.satisfied) {
        throw new Error(`Unsatisfied dependencies: ${depCheck.missing.join(', ')}`);
      }

      // Register plugin
      this.registry.register(
        loadedPlugin.name,
        loadedPlugin.manifest,
        loadedPlugin.path,
        loadedPlugin.instance
      );

      // Update status
      this.registry.updateStatus(loadedPlugin.name, PluginStatus.INSTALLED);

      // Save to database
      await this.savePluginRecord(loadedPlugin);

      // Call plugin install method
      if (loadedPlugin.instance.install) {
        await loadedPlugin.instance.install();
      }

      this.logger.info(`Plugin installed: ${loadedPlugin.name}`);

      // Emit install event
      await this.events.emit('plugin:installed', {
        plugin: loadedPlugin.name,
        manifest: loadedPlugin.manifest,
      });

      return {
        success: true,
        plugin: loadedPlugin.name,
        message: `Plugin installed successfully: ${loadedPlugin.name} v${loadedPlugin.manifest.version}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to install plugin from ${pluginPath}:`, error);

      return {
        success: false,
        plugin: path.basename(pluginPath),
        message: `Installation failed: ${errorMsg}`,
        error: {
          code: 'INSTALLATION_FAILED',
          message: errorMsg,
          context: { pluginPath },
        },
      };
    }
  }

  /**
   * Activate plugin
   */
  public async activatePlugin(name: string): Promise<PluginOperationResult> {
    if (this.activeOperations.has(name)) {
      return {
        success: false,
        plugin: name,
        message: 'Plugin operation already in progress',
      };
    }

    this.activeOperations.add(name);

    try {
      this.logger.info(`Activating plugin: ${name}`);

      const entry = this.registry.get(name);
      if (!entry) {
        throw new Error(`Plugin not found: ${name}`);
      }

      if (entry.status === PluginStatus.ACTIVE) {
        throw new Error(`Plugin already active: ${name}`);
      }

      // Check dependencies
      const depCheck = this.registry.checkDependencies(name);
      if (!depCheck.satisfied) {
        throw new Error(`Unsatisfied dependencies: ${depCheck.missing.join(', ')}`);
      }

      // Emit before activation event
      await this.hooks.doAction('plugin:before_activate', { plugin: name });

      // Load plugin if not loaded
      if (!entry.instance) {
        const loadedPlugin = await this.loader.loadPlugin(entry.path);
        this.registry.setInstance(name, loadedPlugin.instance);
      }

      // Call plugin activate method
      if (entry.instance!.activate) {
        await entry.instance!.activate();
      }

      // Register plugin hooks and filters
      await this.registerPluginHooks(entry.instance!, name);

      // Update status
      this.registry.updateStatus(name, PluginStatus.ACTIVE);

      // Update database
      await this.updatePluginStatus(name, PluginStatus.ACTIVE);

      this.logger.info(`Plugin activated: ${name}`);

      // Emit activation events
      await this.hooks.doAction('plugin:activated', { plugin: name });
      await this.events.emit('plugin:activated', {
        plugin: name,
        manifest: entry.manifest,
      });

      return {
        success: true,
        plugin: name,
        message: `Plugin activated successfully: ${name}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to activate plugin ${name}:`, error);

      // Update error status
      this.registry.updateStatus(name, PluginStatus.ERROR, errorMsg);
      await this.updatePluginStatus(name, PluginStatus.ERROR, errorMsg);

      return {
        success: false,
        plugin: name,
        message: `Activation failed: ${errorMsg}`,
        error: {
          code: 'ACTIVATION_FAILED',
          message: errorMsg,
          context: { plugin: name },
        },
      };
    } finally {
      this.activeOperations.delete(name);
    }
  }

  /**
   * Deactivate plugin
   */
  public async deactivatePlugin(name: string): Promise<PluginOperationResult> {
    if (this.activeOperations.has(name)) {
      return {
        success: false,
        plugin: name,
        message: 'Plugin operation already in progress',
      };
    }

    this.activeOperations.add(name);

    try {
      this.logger.info(`Deactivating plugin: ${name}`);

      const entry = this.registry.get(name);
      if (!entry) {
        throw new Error(`Plugin not found: ${name}`);
      }

      if (entry.status !== PluginStatus.ACTIVE) {
        throw new Error(`Plugin not active: ${name}`);
      }

      // Emit before deactivation event
      await this.hooks.doAction('plugin:before_deactivate', { plugin: name });

      // Call plugin deactivate method
      if (entry.instance && entry.instance.deactivate) {
        await entry.instance.deactivate();
      }

      // Remove plugin hooks and filters
      this.hooks.removePluginHooks(name);

      // Update status
      this.registry.updateStatus(name, PluginStatus.INSTALLED);

      // Update database
      await this.updatePluginStatus(name, PluginStatus.INSTALLED);

      this.logger.info(`Plugin deactivated: ${name}`);

      // Emit deactivation events
      await this.hooks.doAction('plugin:deactivated', { plugin: name });
      await this.events.emit('plugin:deactivated', {
        plugin: name,
        manifest: entry.manifest,
      });

      return {
        success: true,
        plugin: name,
        message: `Plugin deactivated successfully: ${name}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to deactivate plugin ${name}:`, error);

      return {
        success: false,
        plugin: name,
        message: `Deactivation failed: ${errorMsg}`,
        error: {
          code: 'DEACTIVATION_FAILED',
          message: errorMsg,
          context: { plugin: name },
        },
      };
    } finally {
      this.activeOperations.delete(name);
    }
  }

  /**
   * Uninstall plugin
   */
  public async uninstallPlugin(name: string): Promise<PluginOperationResult> {
    try {
      this.logger.info(`Uninstalling plugin: ${name}`);

      const entry = this.registry.get(name);
      if (!entry) {
        throw new Error(`Plugin not found: ${name}`);
      }

      // Deactivate if active
      if (entry.status === PluginStatus.ACTIVE) {
        await this.deactivatePlugin(name);
      }

      // Call plugin uninstall method
      if (entry.instance && entry.instance.uninstall) {
        await entry.instance.uninstall();
      }

      // Unload plugin
      await this.loader.unloadPlugin(name);

      // Remove from registry
      this.registry.unregister(name);

      // Remove from database
      await this.removePluginRecord(name);

      this.logger.info(`Plugin uninstalled: ${name}`);

      // Emit uninstall event
      await this.events.emit('plugin:uninstalled', {
        plugin: name,
        manifest: entry.manifest,
      });

      return {
        success: true,
        plugin: name,
        message: `Plugin uninstalled successfully: ${name}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to uninstall plugin ${name}:`, error);

      return {
        success: false,
        plugin: name,
        message: `Uninstallation failed: ${errorMsg}`,
        error: {
          code: 'UNINSTALLATION_FAILED',
          message: errorMsg,
          context: { plugin: name },
        },
      };
    }
  }

  /**
   * Update plugin
   */
  public async updatePlugin(name: string, newPluginPath: string): Promise<PluginOperationResult> {
    try {
      this.logger.info(`Updating plugin: ${name}`);

      const entry = this.registry.get(name);
      if (!entry) {
        throw new Error(`Plugin not found: ${name}`);
      }

      const wasActive = entry.status === PluginStatus.ACTIVE;

      // Load new plugin version
      const newPlugin = await this.loader.loadPlugin(newPluginPath);

      if (newPlugin.name !== name) {
        throw new Error('Plugin name mismatch');
      }

      // Deactivate current version
      if (wasActive) {
        await this.deactivatePlugin(name);
      }

      // Call update method on old version
      if (entry.instance && entry.instance.update) {
        await entry.instance.update(entry.manifest.version, newPlugin.manifest.version);
      }

      // Unload old version
      await this.loader.unloadPlugin(name);

      // Register new version
      this.registry.register(name, newPlugin.manifest, newPlugin.path, newPlugin.instance);

      // Update database record
      await this.updatePluginRecord(newPlugin);

      // Reactivate if it was active
      if (wasActive) {
        await this.activatePlugin(name);
      }

      this.logger.info(`Plugin updated: ${name} from v${entry.manifest.version} to v${newPlugin.manifest.version}`);

      // Emit update event
      await this.events.emit('plugin:updated', {
        plugin: name,
        oldVersion: entry.manifest.version,
        newVersion: newPlugin.manifest.version,
      });

      return {
        success: true,
        plugin: name,
        message: `Plugin updated successfully: ${name} v${newPlugin.manifest.version}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update plugin ${name}:`, error);

      return {
        success: false,
        plugin: name,
        message: `Update failed: ${errorMsg}`,
        error: {
          code: 'UPDATE_FAILED',
          message: errorMsg,
          context: { plugin: name },
        },
      };
    }
  }

  /**
   * Get plugin info
   */
  public getPlugin(name: string): {
    manifest: PluginManifest;
    status: PluginStatus;
    instance: Plugin | null;
    path: string;
    record?: PluginRecord;
  } | null {
    const entry = this.registry.get(name);
    if (!entry) return null;

    return {
      manifest: entry.manifest,
      status: entry.status,
      instance: entry.instance,
      path: entry.path,
    };
  }

  /**
   * List all plugins
   */
  public listPlugins(): Array<{
    name: string;
    title: string;
    version: string;
    status: PluginStatus;
    author: string;
    description: string;
  }> {
    return Array.from(this.registry.getAll().values()).map(entry => ({
      name: entry.manifest.name,
      title: entry.manifest.title,
      version: entry.manifest.version,
      status: entry.status,
      author: entry.manifest.author,
      description: entry.manifest.description,
    }));
  }

  /**
   * Get plugin statistics
   */
  public getStats(): {
    total: number;
    active: number;
    installed: number;
    withErrors: number;
    loadedSize: number;
    capabilities: Record<string, number>;
  } {
    const registryStats = this.registry.getStats();
    const loaderStats = this.loader.getStats();

    return {
      ...registryStats,
      loadedSize: loaderStats.totalSize,
    };
  }

  /**
   * Check plugin dependencies
   */
  private async checkDependencies(manifest: PluginManifest): Promise<{
    satisfied: boolean;
    missing: string[];
    conflicts: string[];
  }> {
    return this.registry.checkDependencies(manifest.name);
  }

  /**
   * Register plugin hooks
   */
  private async registerPluginHooks(plugin: Plugin, pluginName: string): Promise<void> {
    if (!plugin.hooks) return;

    for (const [hookName, callback] of Object.entries(plugin.hooks)) {
      this.hooks.addAction(hookName, callback, 10, pluginName);
    }

    if (!plugin.filters) return;

    for (const [filterName, callback] of Object.entries(plugin.filters)) {
      this.hooks.addFilter(filterName, callback, 10, pluginName);
    }
  }

  /**
   * Activate enabled plugins from database
   */
  private async activateEnabledPlugins(): Promise<void> {
    if (!this.pluginModel) return;

    try {
      const enabledPlugins = await this.pluginModel.find({
        status: PluginStatus.ACTIVE,
      });

      for (const pluginRecord of enabledPlugins) {
        if (this.registry.has(pluginRecord.name)) {
          await this.activatePlugin(pluginRecord.name);
        }
      }
    } catch (error) {
      this.logger.error('Error activating enabled plugins:', error);
    }
  }

  /**
   * Save plugin record to database
   */
  private async savePluginRecord(loadedPlugin: any): Promise<void> {
    if (!this.pluginModel) return;

    try {
      await this.pluginModel.findOneAndUpdate(
        { name: loadedPlugin.name },
        {
          name: loadedPlugin.name,
          version: loadedPlugin.manifest.version,
          status: PluginStatus.INSTALLED,
          settings: {},
          installedAt: new Date(),
          metadata: {
            path: loadedPlugin.path,
            fileSize: loadedPlugin.size,
            checksum: loadedPlugin.checksum,
          },
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      this.logger.error('Error saving plugin record:', error);
    }
  }

  /**
   * Update plugin record
   */
  private async updatePluginRecord(loadedPlugin: any): Promise<void> {
    if (!this.pluginModel) return;

    try {
      await this.pluginModel.findOneAndUpdate(
        { name: loadedPlugin.name },
        {
          version: loadedPlugin.manifest.version,
          lastUpdated: new Date(),
          metadata: {
            path: loadedPlugin.path,
            fileSize: loadedPlugin.size,
            checksum: loadedPlugin.checksum,
          },
        }
      );
    } catch (error) {
      this.logger.error('Error updating plugin record:', error);
    }
  }

  /**
   * Update plugin status in database
   */
  private async updatePluginStatus(
    name: string,
    status: PluginStatus,
    errorMessage?: string
  ): Promise<void> {
    if (!this.pluginModel) return;

    try {
      const updateData: any = { status };
      
      if (status === PluginStatus.ACTIVE) {
        updateData.activatedAt = new Date();
      }
      
      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      } else {
        updateData.$unset = { errorMessage: 1 };
      }

      await this.pluginModel.findOneAndUpdate({ name }, updateData);
    } catch (error) {
      this.logger.error('Error updating plugin status:', error);
    }
  }

  /**
   * Remove plugin record from database
   */
  private async removePluginRecord(name: string): Promise<void> {
    if (!this.pluginModel) return;

    try {
      await this.pluginModel.findOneAndDelete({ name });
    } catch (error) {
      this.logger.error('Error removing plugin record:', error);
    }
  }

  /**
   * Get hooks manager instance
   */
  public getHooks(): PluginHooks {
    return this.hooks;
  }

  /**
   * Get registry instance
   */
  public getRegistry(): PluginRegistry {
    return this.registry;
  }

  /**
   * Get loader instance
   */
  public getLoader(): PluginLoader {
    return this.loader;
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}