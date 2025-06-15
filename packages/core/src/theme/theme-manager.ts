import fs from 'fs-extra';
import path from 'path';
import { Model } from 'mongoose';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ThemeRegistry } from './theme-registry';
import { ThemeLoader } from './theme-loader';
import { 
  Theme, 
  ThemeManifest, 
  ThemeStatus, 
  ThemeRecord,
  ThemeError,
  ThemeEvent,
  ThemeSettings 
} from './theme-types';

export interface ThemeManagerConfig {
  themesDirectory: string;
  autoLoad: boolean;
  defaultTheme: string;
  maxConcurrentOperations: number;
  operationTimeout: number;
}

export interface ThemeOperationResult {
  success: boolean;
  theme: string;
  message: string;
  error?: ThemeError;
}

export class ThemeManager {
  private static instance: ThemeManager;
  private logger = new Logger('ThemeManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private registry = ThemeRegistry.getInstance();
  private loader = ThemeLoader.getInstance();
  private themeModel: Model<ThemeRecord> | null = null;
  private initialized = false;
  private activeOperations = new Set<string>();

  private readonly defaultConfig: ThemeManagerConfig = {
    themesDirectory: './themes',
    autoLoad: true,
    defaultTheme: 'default',
    maxConcurrentOperations: 3,
    operationTimeout: 30000,
  };

  private constructor() {}

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Initialize theme manager
   */
  public async initialize(themeModel?: Model<ThemeRecord>): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Theme manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Theme Manager...');

      // Set theme model for database operations
      if (themeModel) {
        this.themeModel = themeModel;
      }

      // Load configuration
      const config = this.config.get('themes', this.defaultConfig);

      // Ensure themes directory exists
      await fs.ensureDir(config.themesDirectory);

      // Auto-load themes if enabled
      if (config.autoLoad) {
        await this.loadAllThemes();
        await this.activateActiveTheme();
      }

      this.initialized = true;
      this.logger.info('Theme Manager initialized successfully');

      // Emit initialization event
      await this.events.emit('theme_manager:initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Theme Manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown theme manager
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      this.logger.info('Shutting down Theme Manager...');

      // Deactivate active theme
      const activeTheme = this.registry.getActive();
      if (activeTheme) {
        await this.deactivateTheme(activeTheme.manifest.name);
      }

      // Clear all loaded themes
      await this.loader.clearAll();

      // Clear registry
      this.registry.clear();

      this.initialized = false;
      this.logger.info('Theme Manager shutdown complete');

      // Emit shutdown event
      await this.events.emit('theme_manager:shutdown');
    } catch (error) {
      this.logger.error('Error during Theme Manager shutdown:', error);
      throw error;
    }
  }

  /**
   * Load all themes from directory
   */
  public async loadAllThemes(): Promise<ThemeOperationResult[]> {
    const config = this.config.get('themes', this.defaultConfig);
    const results: ThemeOperationResult[] = [];

    try {
      this.logger.info(`Loading themes from: ${config.themesDirectory}`);

      const loadedThemes = await this.loader.loadThemesFromDirectory(config.themesDirectory);

      for (const loadedTheme of loadedThemes) {
        try {
          // Register theme
          this.registry.register(
            loadedTheme.name,
            loadedTheme.manifest,
            loadedTheme.path,
            loadedTheme.instance
          );

          // Update database record
          await this.updateThemeRecord(loadedTheme);

          results.push({
            success: true,
            theme: loadedTheme.name,
            message: `Theme loaded successfully: ${loadedTheme.name} v${loadedTheme.manifest.version}`,
          });

          // Emit load event
          await this.events.emit('theme:loaded', {
            theme: loadedTheme.name,
            manifest: loadedTheme.manifest,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            success: false,
            theme: loadedTheme.name,
            message: `Failed to register theme: ${errorMsg}`,
            error: {
              code: 'REGISTRATION_FAILED',
              message: errorMsg,
              context: { theme: loadedTheme.name },
            },
          });
        }
      }

      this.logger.info(`Loaded ${results.filter(r => r.success).length} themes`);
      return results;
    } catch (error) {
      this.logger.error('Error loading themes:', error);
      throw error;
    }
  }

  /**
   * Install theme from path
   */
  public async installTheme(themePath: string): Promise<ThemeOperationResult> {
    try {
      this.logger.info(`Installing theme from: ${themePath}`);

      // Load theme
      const loadedTheme = await this.loader.loadTheme(themePath);

      // Check if theme already exists
      if (this.registry.has(loadedTheme.name)) {
        throw new Error(`Theme already installed: ${loadedTheme.name}`);
      }

      // Register theme
      this.registry.register(
        loadedTheme.name,
        loadedTheme.manifest,
        loadedTheme.path,
        loadedTheme.instance
      );

      // Update status
      this.registry.updateStatus(loadedTheme.name, ThemeStatus.INSTALLED);

      // Save to database
      await this.saveThemeRecord(loadedTheme);

      // Call theme install method
      if (loadedTheme.instance.install) {
        await loadedTheme.instance.install();
      }

      this.logger.info(`Theme installed: ${loadedTheme.name}`);

      // Emit install event
      await this.events.emit('theme:installed', {
        theme: loadedTheme.name,
        manifest: loadedTheme.manifest,
      });

      return {
        success: true,
        theme: loadedTheme.name,
        message: `Theme installed successfully: ${loadedTheme.name} v${loadedTheme.manifest.version}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to install theme from ${themePath}:`, error);

      return {
        success: false,
        theme: path.basename(themePath),
        message: `Installation failed: ${errorMsg}`,
        error: {
          code: 'INSTALLATION_FAILED',
          message: errorMsg,
          context: { themePath },
        },
      };
    }
  }

  /**
   * Activate theme
   */
  public async activateTheme(name: string): Promise<ThemeOperationResult> {
    if (this.activeOperations.has(name)) {
      return {
        success: false,
        theme: name,
        message: 'Theme operation already in progress',
      };
    }

    this.activeOperations.add(name);

    try {
      this.logger.info(`Activating theme: ${name}`);

      const entry = this.registry.get(name);
      if (!entry) {
        throw new Error(`Theme not found: ${name}`);
      }

      if (entry.isActive) {
        throw new Error(`Theme already active: ${name}`);
      }

      // Deactivate current active theme
      const currentActive = this.registry.getActive();
      if (currentActive) {
        await this.deactivateTheme(currentActive.manifest.name);
      }

      // Load theme if not loaded
      if (!entry.instance) {
        const loadedTheme = await this.loader.loadTheme(entry.path);
        this.registry.setInstance(name, loadedTheme.instance);
      }

      // Call theme activate method
      if (entry.instance!.activate) {
        await entry.instance!.activate();
      }

      // Set as active theme
      this.registry.setActive(name);

      // Update database
      await this.updateThemeStatus(name, ThemeStatus.ACTIVE);

      this.logger.info(`Theme activated: ${name}`);

      // Emit activation event
      await this.events.emit('theme:activated', {
        theme: name,
        manifest: entry.manifest,
      });

      return {
        success: true,
        theme: name,
        message: `Theme activated successfully: ${name}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to activate theme ${name}:`, error);

      // Update error status
      this.registry.updateStatus(name, ThemeStatus.ERROR, errorMsg);
      await this.updateThemeStatus(name, ThemeStatus.ERROR, errorMsg);

      return {
        success: false,
        theme: name,
        message: `Activation failed: ${errorMsg}`,
        error: {
          code: 'ACTIVATION_FAILED',
          message: errorMsg,
          context: { theme: name },
        },
      };
    } finally {
      this.activeOperations.delete(name);
    }
  }

  /**
   * Deactivate theme
   */
  public async deactivateTheme(name: string): Promise<ThemeOperationResult> {
    try {
      this.logger.info(`Deactivating theme: ${name}`);

      const entry = this.registry.get(name);
      if (!entry) {
        throw new Error(`Theme not found: ${name}`);
      }

      if (!entry.isActive) {
        throw new Error(`Theme not active: ${name}`);
      }

      // Call theme deactivate method
      if (entry.instance && entry.instance.deactivate) {
        await entry.instance.deactivate();
      }

      // Update status
      this.registry.updateStatus(name, ThemeStatus.INSTALLED);

      // Update database
      await this.updateThemeStatus(name, ThemeStatus.INSTALLED);

      this.logger.info(`Theme deactivated: ${name}`);

      // Emit deactivation event
      await this.events.emit('theme:deactivated', {
        theme: name,
        manifest: entry.manifest,
      });

      return {
        success: true,
        theme: name,
        message: `Theme deactivated successfully: ${name}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to deactivate theme ${name}:`, error);

      return {
        success: false,
        theme: name,
        message: `Deactivation failed: ${errorMsg}`,
        error: {
          code: 'DEACTIVATION_FAILED',
          message: errorMsg,
          context: { theme: name },
        },
      };
    }
  }

  /**
   * Uninstall theme
   */
  public async uninstallTheme(name: string): Promise<ThemeOperationResult> {
    try {
      this.logger.info(`Uninstalling theme: ${name}`);

      const entry = this.registry.get(name);
      if (!entry) {
        throw new Error(`Theme not found: ${name}`);
      }

      // Can't uninstall active theme
      if (entry.isActive) {
        throw new Error('Cannot uninstall active theme');
      }

      // Call theme uninstall method
      if (entry.instance && entry.instance.uninstall) {
        await entry.instance.uninstall();
      }

      // Unload theme
      await this.loader.unloadTheme(name);

      // Remove from registry
      this.registry.unregister(name);

      // Remove from database
      await this.removeThemeRecord(name);

      this.logger.info(`Theme uninstalled: ${name}`);

      // Emit uninstall event
      await this.events.emit('theme:uninstalled', {
        theme: name,
        manifest: entry.manifest,
      });

      return {
        success: true,
        theme: name,
        message: `Theme uninstalled successfully: ${name}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to uninstall theme ${name}:`, error);

      return {
        success: false,
        theme: name,
        message: `Uninstallation failed: ${errorMsg}`,
        error: {
          code: 'UNINSTALLATION_FAILED',
          message: errorMsg,
          context: { theme: name },
        },
      };
    }
  }

  /**
   * Get active theme
   */
  public getActiveTheme(): {
    manifest: ThemeManifest;
    instance: Theme | null;
    settings: ThemeSettings;
  } | null {
    const active = this.registry.getActive();
    if (!active) return null;

    return {
      manifest: active.manifest,
      instance: active.instance,
      settings: {}, // TODO: Load from database
    };
  }

  /**
   * Get theme info
   */
  public getTheme(name: string): {
    manifest: ThemeManifest;
    status: ThemeStatus;
    instance: Theme | null;
    path: string;
    isActive: boolean;
  } | null {
    const entry = this.registry.get(name);
    if (!entry) return null;

    return {
      manifest: entry.manifest,
      status: entry.status,
      instance: entry.instance,
      path: entry.path,
      isActive: entry.isActive,
    };
  }

  /**
   * List all themes
   */
  public listThemes(): Array<{
    name: string;
    title: string;
    version: string;
    status: ThemeStatus;
    author: string;
    description: string;
    isActive: boolean;
    screenshot?: string;
  }> {
    return Array.from(this.registry.getAll().values()).map(entry => ({
      name: entry.manifest.name,
      title: entry.manifest.title,
      version: entry.manifest.version,
      status: entry.status,
      author: entry.manifest.author,
      description: entry.manifest.description,
      isActive: entry.isActive,
      screenshot: entry.manifest.screenshot,
    }));
  }

  /**
   * Get theme statistics
   */
  public getStats(): {
    total: number;
    active: number;
    installed: number;
    withErrors: number;
    loadedSize: number;
    supports: Record<string, number>;
  } {
    const registryStats = this.registry.getStats();
    const loaderStats = this.loader.getStats();

    return {
      ...registryStats,
      loadedSize: loaderStats.totalSize,
    };
  }

  /**
   * Get theme template
   */
  public async getTemplate(templateName: string, themeName?: string): Promise<string | null> {
    const theme = themeName ? this.registry.get(themeName) : this.registry.getActive();
    if (!theme) return null;

    return this.loader.getThemeTemplate(theme.manifest.name, templateName);
  }

  /**
   * Get theme asset
   */
  public async getAsset(assetPath: string, themeName?: string): Promise<string | null> {
    const theme = themeName ? this.registry.get(themeName) : this.registry.getActive();
    if (!theme) return null;

    return this.loader.getThemeAsset(theme.manifest.name, assetPath);
  }

  /**
   * Activate active theme from database
   */
  private async activateActiveTheme(): Promise<void> {
    if (!this.themeModel) return;

    try {
      const activeTheme = await this.themeModel.findOne({
        status: ThemeStatus.ACTIVE,
      });

      if (activeTheme && this.registry.has(activeTheme.name)) {
        await this.activateTheme(activeTheme.name);
      } else {
        // Activate default theme
        const config = this.config.get('themes', this.defaultConfig);
        if (this.registry.has(config.defaultTheme)) {
          await this.activateTheme(config.defaultTheme);
        }
      }
    } catch (error) {
      this.logger.error('Error activating active theme:', error);
    }
  }

  /**
   * Save theme record to database
   */
  private async saveThemeRecord(loadedTheme: any): Promise<void> {
    if (!this.themeModel) return;

    try {
      await this.themeModel.findOneAndUpdate(
        { name: loadedTheme.name },
        {
          name: loadedTheme.name,
          version: loadedTheme.manifest.version,
          status: ThemeStatus.INSTALLED,
          settings: {},
          installedAt: new Date(),
          metadata: {
            path: loadedTheme.path,
            fileSize: loadedTheme.size,
            checksum: loadedTheme.checksum,
            screenshot: loadedTheme.screenshot,
          },
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      this.logger.error('Error saving theme record:', error);
    }
  }

  /**
   * Update theme record
   */
  private async updateThemeRecord(loadedTheme: any): Promise<void> {
    if (!this.themeModel) return;

    try {
      await this.themeModel.findOneAndUpdate(
        { name: loadedTheme.name },
        {
          version: loadedTheme.manifest.version,
          lastUpdated: new Date(),
          metadata: {
            path: loadedTheme.path,
            fileSize: loadedTheme.size,
            checksum: loadedTheme.checksum,
            screenshot: loadedTheme.screenshot,
          },
        }
      );
    } catch (error) {
      this.logger.error('Error updating theme record:', error);
    }
  }

  /**
   * Update theme status in database
   */
  private async updateThemeStatus(
    name: string,
    status: ThemeStatus,
    errorMessage?: string
  ): Promise<void> {
    if (!this.themeModel) return;

    try {
      const updateData: any = { status };
      
      if (status === ThemeStatus.ACTIVE) {
        // Deactivate all other themes first
        await this.themeModel.updateMany(
          { status: ThemeStatus.ACTIVE },
          { status: ThemeStatus.INSTALLED }
        );
        updateData.activatedAt = new Date();
      }
      
      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      } else {
        updateData.$unset = { errorMessage: 1 };
      }

      await this.themeModel.findOneAndUpdate({ name }, updateData);
    } catch (error) {
      this.logger.error('Error updating theme status:', error);
    }
  }

  /**
   * Remove theme record from database
   */
  private async removeThemeRecord(name: string): Promise<void> {
    if (!this.themeModel) return;

    try {
      await this.themeModel.findOneAndDelete({ name });
    } catch (error) {
      this.logger.error('Error removing theme record:', error);
    }
  }

  /**
   * Get registry instance
   */
  public getRegistry(): ThemeRegistry {
    return this.registry;
  }

  /**
   * Get loader instance
   */
  public getLoader(): ThemeLoader {
    return this.loader;
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}