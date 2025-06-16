import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { PluginManager } from '../plugin/plugin-manager';
import { ThemeManager } from '../theme/theme-manager';
import { HookManager } from '../hooks/hook-manager';
import { DatabaseConnection } from '../database/connection';
import { CacheManager } from '../cache/cache-manager';
import { EventType } from '../events/event-types';
import { CoreHooks } from '../hooks/hook-types';
import { 
  type CMSConfig, 
  type CMSInstance, 
  type CMSStats, 
  type CMSError,
  type CMSEvent,
  CMSStatus 
} from '../types/cms';
import { 
  User, 
  Post, 
  Page, 
  Media, 
  Plugin, 
  Theme, 
  Setting,
  initializeModels 
} from '../database/models';

export interface CMSManagerConfig {
  autoStart: boolean;
  gracefulShutdown: boolean;
  shutdownTimeout: number;
  healthCheckInterval: number;
  metricsEnabled: boolean;
  performanceMonitoring: boolean;
}

export interface CMSHealth {
  status: CMSStatus;
  uptime: number;
  database: boolean;
  cache: boolean;
  plugins: number;
  themes: number;
  errors: CMSError[];
  lastCheck: Date;
}

/**
 * Central CMS Manager
 * Orchestrates all CMS components and manages the overall system lifecycle
 */
export class CMSManager implements CMSInstance {
  private static instance: CMSManager;
  private _events = EventManager.getInstance();
  private _config = ConfigManager.getInstance();
  private _plugins = PluginManager.getInstance();
  private _themes = ThemeManager.getInstance();
  private _hooks = HookManager.getInstance();
  private _database = DatabaseConnection.getInstance();
  private _cache = CacheManager.getInstance();
  private _status: CMSStatus = CMSStatus.INITIALIZING;
  private _initialized = false;
  private _startTime = new Date();
  private _errors: CMSError[] = [];
  private _stats: CMSStats | null = null;
  private _healthCheckInterval?: NodeJS.Timer;

  private readonly defaultConfig: CMSManagerConfig = {
    autoStart: true,
    gracefulShutdown: true,
    shutdownTimeout: 30000,
    healthCheckInterval: 60000, // 1 minute
    metricsEnabled: true,
    performanceMonitoring: false,
  };

  private constructor() {}

  public static getInstance(): CMSManager {
    if (!CMSManager.instance) {
      CMSManager.instance = new CMSManager();
    }
    return CMSManager.instance;
  }

  // Getters for component access
  public get plugins(): PluginManager { return this._plugins; }
  public get themes(): ThemeManager { return this._themes; }
  public get hooks(): HookManager { return this._hooks; }
  public get events(): EventManager { return this._events; }
  public get config(): ConfigManager { return this._config; }
  public get database(): DatabaseConnection { return this._database; }
  public get cache(): CacheManager { return this._cache; }
  public get logger(): Logger { return this.logger; }

  /**
   * Check if CMS is initialized
   */
  public isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Get current CMS status
   */
  public getStatus(): CMSStatus {
    return this._status;
  }

  /**
   * Initialize the entire CMS system
   */
  public async initialize(cmsConfig?: Partial<CMSConfig>): Promise<void> {
    if (this._initialized) {
      this.logger.warn('CMS already initialized');
      return;
    }

    try {
      this.logger.info('🚀 Starting Modular CMS...');
      this._status = CMSStatus.INITIALIZING;

      // Emit initialization start event
      await this._events.emit(EventType.CMS_INITIALIZING);

      // 1. Initialize configuration
      await this.initializeConfig(cmsConfig);

      // 2. Initialize database
      await this.initializeDatabase();

      // 3. Initialize cache
      await this.initializeCache();

      // 4. Initialize database models
      await this.initializeModels();

      // 5. Initialize core managers in order
      await this.initializeCoreManagers();

      // 6. Load and activate plugins
      await this.initializePlugins();

      // 7. Load and activate theme
      await this.initializeThemes();

      // 8. Start health monitoring
      await this.startHealthMonitoring();

      // 9. Emit hooks for post-initialization
      await this._hooks.doAction(CoreHooks.SYSTEM_INIT, {
        timestamp: new Date(),
        version: process.env.CMS_VERSION || '1.0.0',
      });

      this._status = CMSStatus.READY;
      this._initialized = true;
      this._startTime = new Date();

      this.logger.info('✅ Modular CMS initialized successfully', {
        uptime: this.getUptime(),
        status: this._status,
      });

      // Emit ready event
      await this._events.emit(EventType.CMS_READY, {
        uptime: this.getUptime(),
        timestamp: new Date(),
      });

    } catch (error) {
      this._status = CMSStatus.ERROR;
      const cmsError = this.createError(
        'INITIALIZATION_FAILED',
        error instanceof Error ? error.message : 'Unknown initialization error',
        { error }
      );
      
      this._errors.push(cmsError);
      this.logger.error('❌ CMS initialization failed:', error);
      
      await this._events.emit(EventType.CMS_ERROR, cmsError);
      throw error;
    }
  }

  /**
   * Gracefully shutdown the CMS
   */
  public async shutdown(): Promise<void> {
    if (!this._initialized) {
      this.logger.warn('CMS not initialized, nothing to shutdown');
      return;
    }

    try {
      this.logger.info('🛑 Shutting down Modular CMS...');
      this._status = CMSStatus.SHUTTING_DOWN;

      await this._events.emit(EventType.CMS_SHUTTING_DOWN);

      // Stop health monitoring
      if (this._healthCheckInterval) {
        clearInterval(this._healthCheckInterval);
      }

      // Shutdown components in reverse order
      await this._plugins.shutdown();
      await this._themes.shutdown();
      await this._hooks.shutdown();
      await this._cache.disconnect();
      await this._database.disconnect();

      this._status = CMSStatus.SHUTDOWN;
      this._initialized = false;

      this.logger.info('✅ CMS shutdown completed');
      await this._events.emit(EventType.CMS_SHUTDOWN);

    } catch (error) {
      this.logger.error('❌ Error during CMS shutdown:', error);
      throw error;
    }
  }

  /**
   * Get CMS statistics
   */
  public async getStats(): Promise<CMSStats> {
    const memoryUsage = process.memoryUsage();
    const pluginStats = this._plugins.getStats();
    const themeStats = this._themes.getStats();
    const cacheStats = await this._cache.getStats();

    this._stats = {
      uptime: this.getUptime(),
      requests: 0, // Would be tracked by middleware
      activePlugins: pluginStats.active,
      activeTheme: String(themeStats.active || 'none'),
      memoryUsage,
      databaseConnections: 1, // Single connection for now
      cacheHitRate: cacheStats?.hitRate,
    };

    return this._stats;
  }

  /**
   * Get CMS health status
   */
  public async getHealth(): Promise<CMSHealth> {
    const databaseHealthy = await this._database.healthCheck();
    const cacheHealthy = await this._cache.healthCheck();
    const pluginStats = this._plugins.getStats();
    const themeStats = this._themes.getStats();

    return {
      status: this._status,
      uptime: this.getUptime(),
      database: databaseHealthy,
      cache: cacheHealthy,
      plugins: pluginStats.total,
      themes: themeStats.total,
      errors: this._errors.slice(-10), // Last 10 errors
      lastCheck: new Date(),
    };
  }

  /**
   * Handle CMS errors
   */
  public handleError(error: Error, context?: Record<string, any>): void {
    const cmsError = this.createError(
      'RUNTIME_ERROR',
      error.message,
      { ...context, stack: error.stack }
    );

    this._errors.push(cmsError);

    // Keep only last 100 errors
    if (this._errors.length > 100) {
      this._errors = this._errors.slice(-100);
    }

    this.logger.error('CMS Error:', cmsError);
    this._events.emit(EventType.CMS_ERROR, cmsError);
  }

  /**
   * Initialize configuration
   */
  private async initializeConfig(cmsConfig?: Partial<CMSConfig>): Promise<void> {
    this.logger.debug('Initializing configuration...');
    
    // Set provided config as overrides
    if (cmsConfig) {
      for (const [key, value] of Object.entries(cmsConfig)) {
        await this._config.set(key, value, 'override');
      }
    }

    this.logger.debug('Configuration initialized');
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    this.logger.debug('Initializing database...');
    
    const dbConfig = await this._config.get('database', {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/modular-cms',
      name: 'modular-cms'
    });

    await this._database.connect(dbConfig);
    this.logger.debug('Database initialized');
  }

  /**
   * Initialize cache system
   */
  private async initializeCache(): Promise<void> {
    this.logger.debug('Initializing cache...');
    
    const cacheConfig = await this._config.get('cache', {
      enabled: true,
      provider: 'memory'
    });

    if (cacheConfig.enabled) {
      await this._cache.connect(cacheConfig);
    }
    
    this.logger.debug('Cache initialized');
  }

  /**
   * Initialize database models
   */
  private async initializeModels(): Promise<void> {
    this.logger.debug('Initializing database models...');
    await initializeModels();
    this.logger.debug('Database models initialized');
  }

  /**
   * Initialize core managers
   */
  private async initializeCoreManagers(): Promise<void> {
    this.logger.debug('Initializing core managers...');

    // Initialize in dependency order
    await this._hooks.initialize();
    await this._config.initialize();
    await this._events.initialize();

    this.logger.debug('Core managers initialized');
  }

  /**
   * Initialize plugins
   */
  private async initializePlugins(): Promise<void> {
    this.logger.debug('Initializing plugins...');
    await this._plugins.initialize(Plugin);
    this.logger.debug('Plugins initialized');
  }

  /**
   * Initialize themes
   */
  private async initializeThemes(): Promise<void> {
    this.logger.debug('Initializing themes...');
    await this._themes.initialize(Theme);
    this.logger.debug('Themes initialized');
  }

  /**
   * Start health monitoring
   */
  private async startHealthMonitoring(): Promise<void> {
    const config = await this._config.get('cms', this.defaultConfig);
    
    if (config.healthCheckInterval > 0) {
      this._healthCheckInterval = setInterval(async () => {
        try {
          const health = await this.getHealth();
          
          if (!health.database || !health.cache) {
            this.logger.warn('Health check failed', health);
            await this._events.emit(EventType.CMS_ERROR, {
              code: 'HEALTH_CHECK_FAILED',
              message: 'System health check failed',
              details: health,
              timestamp: new Date(),
            });
          }
        } catch (error) {
          this.logger.error('Health check error:', error);
        }
      }, config.healthCheckInterval);
    }
  }

  /**
   * Get uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this._startTime.getTime()) / 1000);
  }

  /**
   * Create standardized CMS error
   */
  private createError(code: string, message: string, details?: Record<string, any>): CMSError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
    };
  }
}

/**
 * Default CMS manager instance
 */
export const cmsManager = CMSManager.getInstance();

/**
 * Initialize CMS with configuration
 */
export async function initializeCMS(config?: Partial<CMSConfig>): Promise<CMSManager> {
  const cms = CMSManager.getInstance();
  await cms.initialize(config);
  return cms;
}

/**
 * Get CMS instance
 */
export function getCMS(): CMSManager {
  return CMSManager.getInstance();
}

export default CMSManager;