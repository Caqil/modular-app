import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/logger';
import { Validator } from '../utils/validator';
import { Sanitizer } from '../utils/sanitizer';
import { FileHandler } from '../utils/file-handler';
import type { Plugin, PluginManifest } from './plugin-types';

export interface LoadedPlugin {
  name: string;
  manifest: PluginManifest;
  instance: Plugin;
  path: string;
  size: number;
  checksum: string;
}

export interface PluginLoadOptions {
  validateManifest: boolean;
  validateCode: boolean;
  allowUnsafe: boolean;
  timeout: number;
}

export class PluginLoader {
  private static instance: PluginLoader;
  private logger = new Logger('PluginLoader');
  private loadedPlugins = new Map<string, LoadedPlugin>();

  private static readonly DEFAULT_OPTIONS: PluginLoadOptions = {
    validateManifest: true,
    validateCode: true,
    allowUnsafe: false,
    timeout: 30000, // 30 seconds
  };

  private constructor() {}

  public static getInstance(): PluginLoader {
    if (!PluginLoader.instance) {
      PluginLoader.instance = new PluginLoader();
    }
    return PluginLoader.instance;
  }

  /**
   * Load plugin from directory
   */
  public async loadPlugin(
    pluginPath: string,
    options: Partial<PluginLoadOptions> = {}
  ): Promise<LoadedPlugin> {
    const config = { ...PluginLoader.DEFAULT_OPTIONS, ...options };
    
    this.logger.info(`Loading plugin from: ${pluginPath}`);

    try {
      // Validate plugin directory
      await this.validatePluginDirectory(pluginPath);

      // Load and validate manifest
      const manifest = await this.loadManifest(pluginPath, config);

      // Load plugin code
      const instance = await this.loadPluginCode(pluginPath, manifest, config);

      // Get plugin metadata
      const stats = await fs.stat(pluginPath);
      const size = await this.calculateDirectorySize(pluginPath);
      const checksum = await this.calculatePluginChecksum(pluginPath);

      const loadedPlugin: LoadedPlugin = {
        name: manifest.name,
        manifest,
        instance,
        path: pluginPath,
        size,
        checksum,
      };

      // Cache loaded plugin
      this.loadedPlugins.set(manifest.name, loadedPlugin);

      this.logger.info(`Plugin loaded successfully: ${manifest.name} v${manifest.version}`);

      return loadedPlugin;
    } catch (error) {
      this.logger.error(`Failed to load plugin from ${pluginPath}:`, error);
      throw error;
    }
  }

  /**
   * Load multiple plugins from directory
   */
  public async loadPluginsFromDirectory(
    pluginsDir: string,
    options: Partial<PluginLoadOptions> = {}
  ): Promise<LoadedPlugin[]> {
    this.logger.info(`Loading plugins from directory: ${pluginsDir}`);

    const loadedPlugins: LoadedPlugin[] = [];

    try {
      // Check if directory exists
      if (!(await fs.pathExists(pluginsDir))) {
        this.logger.warn(`Plugins directory does not exist: ${pluginsDir}`);
        return loadedPlugins;
      }

      // Read plugin directories
      const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
      const pluginDirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

      this.logger.info(`Found ${pluginDirs.length} potential plugin directories`);

      // Load each plugin
      for (const pluginDir of pluginDirs) {
        const pluginPath = path.join(pluginsDir, pluginDir);
        
        try {
          const plugin = await this.loadPlugin(pluginPath, options);
          loadedPlugins.push(plugin);
        } catch (error) {
          this.logger.error(`Failed to load plugin from ${pluginDir}:`, error);
          // Continue loading other plugins
        }
      }

      this.logger.info(`Successfully loaded ${loadedPlugins.length} plugins`);

      return loadedPlugins;
    } catch (error) {
      this.logger.error(`Error loading plugins from directory ${pluginsDir}:`, error);
      throw error;
    }
  }

  /**
   * Unload plugin
   */
  public async unloadPlugin(name: string): Promise<boolean> {
    const plugin = this.loadedPlugins.get(name);
    if (!plugin) {
      this.logger.warn(`Plugin not found for unloading: ${name}`);
      return false;
    }

    try {
      // Call plugin's deactivate method if it exists
      if (plugin.instance.deactivate) {
        await plugin.instance.deactivate();
      }

      // Remove from cache
      this.loadedPlugins.delete(name);

      // Clear module cache
      this.clearModuleCache(plugin.path);

      this.logger.info(`Plugin unloaded: ${name}`);
      return true;
    } catch (error) {
      this.logger.error(`Error unloading plugin ${name}:`, error);
      throw error;
    }
  }

  /**
   * Reload plugin
   */
  public async reloadPlugin(name: string, options?: Partial<PluginLoadOptions>): Promise<LoadedPlugin> {
    const plugin = this.loadedPlugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin not found for reloading: ${name}`);
    }

    // Unload first
    await this.unloadPlugin(name);

    // Load again
    return this.loadPlugin(plugin.path, options);
  }

  /**
   * Get loaded plugin
   */
  public getLoadedPlugin(name: string): LoadedPlugin | null {
    return this.loadedPlugins.get(name) || null;
  }

  /**
   * Get all loaded plugins
   */
  public getAllLoadedPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Check if plugin is loaded
   */
  public isPluginLoaded(name: string): boolean {
    return this.loadedPlugins.has(name);
  }

  /**
   * Validate plugin directory structure
   */
  private async validatePluginDirectory(pluginPath: string): Promise<void> {
    // Check if directory exists
    if (!(await fs.pathExists(pluginPath))) {
      throw new Error(`Plugin directory does not exist: ${pluginPath}`);
    }

    // Check if it's a directory
    const stats = await fs.stat(pluginPath);
    if (!stats.isDirectory()) {
      throw new Error(`Plugin path is not a directory: ${pluginPath}`);
    }

    // Check for required files
    const manifestPath = path.join(pluginPath, 'plugin.json');
    if (!(await fs.pathExists(manifestPath))) {
      throw new Error(`Plugin manifest not found: ${manifestPath}`);
    }

    const packagePath = path.join(pluginPath, 'package.json');
    if (!(await fs.pathExists(packagePath))) {
      throw new Error(`Package.json not found: ${packagePath}`);
    }
  }

  /**
   * Load and validate plugin manifest
   */
  private async loadManifest(
    pluginPath: string,
    options: PluginLoadOptions
  ): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, 'plugin.json');

    try {
      // Read manifest file
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      
      // Sanitize JSON content
      const sanitizedContent = Sanitizer.sanitizeJson(manifestContent);
      if (!sanitizedContent) {
        throw new Error('Invalid JSON in plugin manifest');
      }

      const manifest = sanitizedContent as PluginManifest;

      // Validate manifest if required
      if (options.validateManifest) {
        const validation = Validator.validate(Validator.pluginManifestSchema, manifest);
        if (!validation.success) {
          throw new Error(`Invalid plugin manifest: ${validation.errors.message}`);
        }
      }

      // Sanitize manifest fields
      manifest.name = Sanitizer.sanitizeText(manifest.name);
      manifest.title = Sanitizer.sanitizeText(manifest.title);
      manifest.description = Sanitizer.sanitizeText(manifest.description);
      manifest.author = Sanitizer.sanitizeText(manifest.author);

      if (manifest.homepage) {
        manifest.homepage = Sanitizer.sanitizeUrl(manifest.homepage);
      }

      if (manifest.repository) {
        manifest.repository = Sanitizer.sanitizeUrl(manifest.repository);
      }

      return manifest;
    } catch (error) {
      throw new Error(`Failed to load plugin manifest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load plugin code
   */
  private async loadPluginCode(
    pluginPath: string,
    manifest: PluginManifest,
    options: PluginLoadOptions
  ): Promise<Plugin> {
    const mainPath = path.resolve(pluginPath, manifest.main);

    try {
      // Check if main file exists
      if (!(await fs.pathExists(mainPath))) {
        throw new Error(`Plugin main file not found: ${mainPath}`);
      }

      // Security check - ensure main file is within plugin directory
      if (!mainPath.startsWith(path.resolve(pluginPath))) {
        throw new Error('Plugin main file is outside plugin directory');
      }

      // Clear module cache for hot reloading
      this.clearModuleCache(mainPath);

      // Load plugin module with timeout
      const pluginModule = await this.loadModuleWithTimeout(mainPath, options.timeout);

      // Get plugin class
      const PluginClass = pluginModule.default || pluginModule;
      if (typeof PluginClass !== 'function') {
        throw new Error('Plugin must export a class as default export');
      }

      // Create plugin instance
      const instance = new PluginClass();

      // Validate plugin instance
      if (!this.isValidPluginInstance(instance)) {
        throw new Error('Plugin instance does not implement required interface');
      }

      // Set manifest reference
      instance.manifest = manifest;
      instance.path = pluginPath;

      return instance;
    } catch (error) {
      throw new Error(`Failed to load plugin code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load module with timeout
   */
  private async loadModuleWithTimeout(modulePath: string, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Plugin loading timeout after ${timeout}ms`));
      }, timeout);

      try {
        const module = require(modulePath);
        clearTimeout(timer);
        resolve(module);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Validate plugin instance
   */
  private isValidPluginInstance(instance: any): instance is Plugin {
    return (
      instance &&
      typeof instance === 'object' &&
      (typeof instance.activate === 'function' || instance.activate === undefined) &&
      (typeof instance.deactivate === 'function' || instance.deactivate === undefined)
    );
  }

  /**
   * Clear module cache
   */
  private clearModuleCache(modulePath: string): void {
    const resolvedPath = require.resolve(modulePath);
    
    // Delete from require cache
    delete require.cache[resolvedPath];

    // Also clear related modules in the same directory
    const moduleDir = path.dirname(resolvedPath);
    Object.keys(require.cache).forEach(key => {
      if (key.startsWith(moduleDir)) {
        delete require.cache[key];
      }
    });
  }

  /**
   * Calculate directory size
   */
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        totalSize += await this.calculateDirectorySize(itemPath);
      } else {
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  /**
   * Calculate plugin checksum
   */
  private async calculatePluginChecksum(pluginPath: string): Promise<string> {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');

    // Hash the manifest file
    const manifestPath = path.join(pluginPath, 'plugin.json');
    const manifestContent = await fs.readFile(manifestPath);
    hash.update(manifestContent);

    // Hash the main plugin file
    const manifest = JSON.parse(manifestContent.toString());
    const mainPath = path.join(pluginPath, manifest.main);
    
    if (await fs.pathExists(mainPath)) {
      const mainContent = await fs.readFile(mainPath);
      hash.update(mainContent);
    }

    return hash.digest('hex');
  }

  /**
   * Get loader statistics
   */
  public getStats(): {
    loadedCount: number;
    totalSize: number;
    plugins: Array<{
      name: string;
      version: string;
      size: number;
      path: string;
    }>;
  } {
    const plugins = Array.from(this.loadedPlugins.values());
    
    return {
      loadedCount: plugins.length,
      totalSize: plugins.reduce((total, plugin) => total + plugin.size, 0),
      plugins: plugins.map(plugin => ({
        name: plugin.name,
        version: plugin.manifest.version,
        size: plugin.size,
        path: plugin.path,
      })),
    };
  }

  /**
   * Clear all loaded plugins
   */
  public async clearAll(): Promise<void> {
    const pluginNames = Array.from(this.loadedPlugins.keys());
    
    for (const name of pluginNames) {
      await this.unloadPlugin(name);
    }

    this.logger.info('All plugins cleared from loader');
  }
}