import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { EventType } from '../events/event-types';
import { ConfigManager } from '../config/config-manager';
import { DatabaseConnection } from '../database/connection';
import { PluginManager } from '../plugin/plugin-manager';
import { ThemeManager } from '../theme/theme-manager';
import { HookManager } from '../hooks/hook-manager';
import { UserManager } from './user-manager';
import { ContentManager } from './content-manager';
import { MediaManager } from './media-manager';
import { SettingsManager } from './settings-manager';
import { 
  CMSConfig, 
  CMSInstance, 
  CMSStatus, 
  CMSError, 
  CMSStats 
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
  developmentMode: boolean;
  enableHotReload: boolean;
  gracefulShutdownTimeout: number;
  healthCheckInterval: number;
}

export interface CMSHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    plugins: boolean;
    themes: boolean;
    cache: boolean;
    filesystem: boolean;
  };
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface CMSBootstrapResult {
  success: boolean;
  status: CMSStatus;
  errors: CMSError[];
  warnings: string[];
  bootTime: number;
  components: {
    database: boolean;
    config: boolean;
    events: boolean;
    plugins: boolean;
    themes: boolean;
    hooks: boolean;
    managers: boolean;
  };
}

/**
 * Central CMS Manager - Orchestrates all CMS components
 * Acts as the main entry point and lifecycle manager for the entire CMS
 */
export class CMSManager implements CMSInstance {
  private static instance: CMSManager;
  private logger: Logger;
  private status: CMSStatus = CMSStatus.INITIALIZING;
  private initialized = false;
  private startTime = Date.now();
  private healthCheckTimer?: NodeJS.Timeout;
  private shutdownHandlers: Array<() => Promise<void>> = [];
  private errors: CMSError[] = [];

  // Core managers and components
  public readonly config: ConfigManager;
  public readonly events: EventManager;
  public readonly database: DatabaseConnection;
  public readonly plugins: PluginManager;
  public readonly themes: ThemeManager;
  public readonly hooks: HookManager;
  public readonly users: UserManager;
  public readonly content: ContentManager;
  public readonly media: MediaManager;
  public readonly settings: SettingsManager;

  private readonly defaultConfig: CMSManagerConfig = {
    autoStart: true,
    developmentMode: process.env.NODE_ENV === 'development',
    enableHotReload: true,
    gracefulShutdownTimeout: 30000,
    healthCheckInterval: 60000, // 1 minute
  };

  private constructor() {
    this.logger = new Logger('CMSManager');
    
    // Initialize core components
    this.config = ConfigManager.getInstance();
    this.events = EventManager.getInstance();
    this.database = DatabaseConnection.getInstance();
    this.plugins = PluginManager.getInstance();
    this.themes = ThemeManager.getInstance();
    this.hooks = HookManager.getInstance();
    this.users = UserManager.getInstance();
    this.content = ContentManager.getInstance();
    this.media = MediaManager.getInstance();
    this.settings = SettingsManager.getInstance();

    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  public static getInstance(): CMSManager {
    if (!CMSManager.instance) {
      CMSManager.instance = new CMSManager();
    }
    return CMSManager.instance;
  }

  /**
   * Check if CMS is initialized
   */
  public isInitialized(): boolean {
    return this.initialized && this.status === CMSStatus.READY;
  }

  /**
   * Get current CMS status
   */
  public getStatus(): CMSStatus {
    return this.status;
  }

  /**
   * Get CMS errors
   */
  public getErrors(): CMSError[] {
    return [...this.errors];
  }

  /**
   * Initialize the entire CMS
   */
  public async initialize(cmsConfig?: Partial<CMSConfig>): Promise<CMSBootstrapResult> {
    const startTime = Date.now();
    
    if (this.initialized) {
      this.logger.warn('CMS already initialized');
      return this.createBootstrapResult(true, startTime, [], ['CMS already initialized']);
    }

    this.logger.info('Starting CMS initialization...');
    this.status = CMSStatus.INITIALIZING;

    const errors: CMSError[] = [];
    const warnings: string[] = [];
    const components = {
      database: false,
      config: false,
      events: false,
      plugins: false,
      themes: false,
      hooks: false,
      managers: false,
    };

    try {
      // Emit initialization start
      await this.events.emit(EventType.CMS_INITIALIZED, {
        type: 'initialization_started',
        timestamp: new Date(),
        config: cmsConfig,
      });

      // 1. Initialize configuration
      this.logger.info('Initializing configuration...');
      if (cmsConfig) {
        await this.config.set('cms', cmsConfig, 'override');
      }
      components.config = true;

      // 2. Initialize database connection
      this.logger.info('Connecting to database...');
      await this.database.connect();
      await initializeModels();
      components.database = true;

      // 3. Initialize events
      this.logger.info('Initializing event system...');
      await this.events.initialize();
      components.events = true;

      // 4. Initialize hooks
      this.logger.info('Initializing hooks...');
      await this.hooks.initialize();
      components.hooks = true;

      // 5. Initialize core managers
      this.logger.info('Initializing managers...');
      await this.initializeManagers();
      components.managers = true;

      // 6. Initialize plugins
      this.logger.info('Initializing plugins...');
      try {
        await this.plugins.initialize(Plugin);
        components.plugins = true;
      } catch (error) {
        this.logger.warn('Plugin initialization failed:', error);
        warnings.push('Plugin system failed to initialize');
        errors.push(this.createError('PLUGIN_INIT_ERROR', 'Plugin initialization failed', error));
      }

      // 7. Initialize themes
      this.logger.info('Initializing themes...');
      try {
        await this.themes.initialize(Theme);
        components.themes = true;
      } catch (error) {
        this.logger.warn('Theme initialization failed:', error);
        warnings.push('Theme system failed to initialize');
        errors.push(this.createError('THEME_INIT_ERROR', 'Theme initialization failed', error));
      }

      // 8. Setup health monitoring
      await this.setupHealthMonitoring();

      // 9. Run post-initialization hooks
      await this.runPostInitializationHooks();

      this.initialized = true;
      this.status = CMSStatus.READY;

      const bootTime = Date.now() - startTime;
      
      this.logger.info('CMS initialization completed successfully', {
        bootTime: `${bootTime}ms`,
        components: Object.keys(components).filter(k => components[k as keyof typeof components]),
        warnings: warnings.length,
        errors: errors.length,
      });

      // Emit initialization complete
      await this.events.emit(EventType.CMS_INITIALIZED, {
        type: 'initialization_completed',
        timestamp: new Date(),
        bootTime,
        components,
        errors: errors.length,
        warnings: warnings.length,
      });

      return this.createBootstrapResult(true, startTime, errors, warnings, components);

    } catch (error) {
      this.status = CMSStatus.ERROR;
      const cmsError = this.createError('CMS_INIT_ERROR', 'CMS initialization failed', error);
      errors.push(cmsError);
      this.errors.push(cmsError);

      this.logger.error('CMS initialization failed:', error);

      // Emit initialization failed
      await this.events.emit(EventType.SYSTEM_ERROR, {
        type: 'cms_initialization_failed',
        error: cmsError,
        timestamp: new Date(),
      });

      return this.createBootstrapResult(false, startTime, errors, warnings, components);
    }
  }

  /**
   * Shutdown the CMS gracefully
   */
  public async shutdown(): Promise<void> {
    if (this.status === CMSStatus.SHUTDOWN || this.status === CMSStatus.SHUTTING_DOWN) {
      this.logger.warn('CMS already shutdown or shutting down');
      return;
    }

    this.logger.info('Starting CMS shutdown...');
    this.status = CMSStatus.SHUTTING_DOWN;

    try {
      // Emit shutdown start
      await this.events.emit(EventType.CMS_SHUTDOWN, {
        type: 'shutdown_started',
        timestamp: new Date(),
      });

      // Stop health monitoring
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
      }

      // Run shutdown handlers in reverse order
      for (const handler of this.shutdownHandlers.reverse()) {
        try {
          await handler();
        } catch (error) {
          this.logger.error('Error in shutdown handler:', error);
        }
      }

      // Shutdown managers
      await this.shutdownManagers();

      // Shutdown plugins
      try {
        await this.plugins.shutdown();
      } catch (error) {
        this.logger.error('Error shutting down plugins:', error);
      }

      // Shutdown themes
      try {
        await this.themes.shutdown();
      } catch (error) {
        this.logger.error('Error shutting down themes:', error);
      }

      // Shutdown database
      await this.database.disconnect();

      // Final event
      await this.events.emit(EventType.CMS_SHUTDOWN, {
        type: 'shutdown_completed',
        timestamp: new Date(),
      });

      this.status = CMSStatus.SHUTDOWN;
      this.initialized = false;

      this.logger.info('CMS shutdown completed');

    } catch (error) {
      this.logger.error('Error during CMS shutdown:', error);
      this.status = CMSStatus.ERROR;
      throw error;
    }
  }

  /**
   * Restart the CMS
   */
  public async restart(): Promise<CMSBootstrapResult> {
    this.logger.info('Restarting CMS...');
    
    await this.shutdown();
    
    // Reset state
    this.errors = [];
    this.startTime = Date.now();
    
    return await this.initialize();
  }

  /**
   * Perform health check
   */
  public async healthCheck(): Promise<CMSHealthCheck> {
    const checks = {
      database: false,
      plugins: false,
      themes: false,
      cache: false,
      filesystem: false,
    };

    try {
      // Database check
      checks.database = await this.database.isConnected();

      // Plugins check
      checks.plugins = this.plugins.isInitialized();

      // Themes check
      checks.themes = this.themes.isInitialized();

      // Cache check (if available)
      try {
        // This would check cache if implemented
        checks.cache = true;
      } catch {
        checks.cache = false;
      }

      // Filesystem check
      try {
        const fs = require('fs-extra');
        await fs.access(process.cwd());
        checks.filesystem = true;
      } catch {
        checks.filesystem = false;
      }

    } catch (error) {
      this.logger.error('Health check error:', error);
    }

    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      version: process.env.CMS_VERSION || '1.0.0',
    };
  }

  /**
   * Get CMS statistics
   */
  public async getStats(): Promise<CMSStats> {
    try {
      const [
        pluginStats,
        themeStats,
        userCount,
        postCount,
        memoryUsage
      ] = await Promise.all([
        this.plugins.getStats(),
        this.themes.getStats(),
        this.users.getTotalCount(),
        this.content.getTotalCount({ type: 'post' }),
        process.memoryUsage()
      ]);

      return {
        uptime: Date.now() - this.startTime,
        requests: 0, // Would need request counter
        activePlugins: pluginStats.active,
        activeTheme: themeStats.active || 'default',
        memoryUsage,
        databaseConnections: this.database.isConnected() ? 1 : 0,
        cacheHitRate: undefined, // Would need cache stats
        users: userCount,
        posts: postCount,
      };

    } catch (error) {
      this.logger.error('Error getting CMS stats:', error);
      throw error;
    }
  }

  /**
   * Register shutdown handler
   */
  public onShutdown(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Add CMS error
   */
  public addError(code: string, message: string, details?: any): void {
    const error = this.createError(code, message, details);
    this.errors.push(error);
    
    this.logger.error(`CMS Error [${code}]: ${message}`, details);
    
    // Emit error event
    this.events.emit(EventType.SYSTEM_ERROR, {
      type: 'cms_error',
      error,
      timestamp: new Date(),
    });
  }

  /**
   * Clear all errors
   */
  public clearErrors(): void {
    this.errors = [];
  }

  /**
   * Initialize core managers
   */
  private async initializeManagers(): Promise<void> {
    await Promise.all([
      this.settings.initialize(Setting),
      this.users.initialize(User),
      this.content.initialize(Post, Page),
      this.media.initialize(Media),
    ]);
  }

  /**
   * Shutdown managers
   */
  private async shutdownManagers(): Promise<void> {
    await Promise.all([
      this.settings.shutdown(),
      this.users.shutdown(),
      this.content.shutdown(),
      this.media.shutdown(),
    ]);
  }

  /**
   * Setup health monitoring
   */
  private async setupHealthMonitoring(): Promise<void> {
    const config = await this.config.get('cms.healthCheck', this.defaultConfig);
    
    if (config.healthCheckInterval > 0) {
      this.healthCheckTimer = setInterval(async () => {
        try {
          const health = await this.healthCheck();
          
          if (health.status !== 'healthy') {
            this.logger.warn('CMS health check failed', health);
            
            await this.events.emit(EventType.SYSTEM_ERROR, {
              type: 'health_check_failed',
              health,
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
   * Run post-initialization hooks
   */
  private async runPostInitializationHooks(): Promise<void> {
    try {
      await this.hooks.doAction('cms:after_init', {
        cms: this,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.warn('Error running post-initialization hooks:', error);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    shutdownSignals.forEach(signal => {
      process.on(signal, async () => {
        this.logger.info(`Received ${signal}, starting graceful shutdown...`);
        try {
          await this.shutdown();
          process.exit(0);
        } catch (error) {
          this.logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception:', error);
      this.addError('UNCAUGHT_EXCEPTION', 'Uncaught exception occurred', error);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      this.addError('UNHANDLED_REJECTION', 'Unhandled promise rejection', { reason, promise });
    });
  }

  /**
   * Create error object
   */
  private createError(code: string, message: string, details?: any): CMSError {
    return {
      code,
      message,
      details,
      stack: details instanceof Error ? details.stack : undefined,
      timestamp: new Date(),
    };
  }

  /**
   * Create bootstrap result
   */
  private createBootstrapResult(
    success: boolean,
    startTime: number,
    errors: CMSError[],
    warnings: string[],
    components?: any
  ): CMSBootstrapResult {
    return {
      success,
      status: this.status,
      errors,
      warnings,
      bootTime: Date.now() - startTime,
      components: components || {
        database: false,
        config: false,
        events: false,
        plugins: false,
        themes: false,
        hooks: false,
        managers: false,
      },
    };
  }
}

/**
 * Get the singleton CMS manager instance
 */
export function getCMSManager(): CMSManager {
  return CMSManager.getInstance();
}

/**
 * Initialize and start the CMS
 */
export async function startCMS(config?: Partial<CMSConfig>): Promise<CMSBootstrapResult> {
  const cms = CMSManager.getInstance();
  return await cms.initialize(config);
}

/**
 * Shutdown the CMS
 */
export async function shutdownCMS(): Promise<void> {
  const cms = CMSManager.getInstance();
  await cms.shutdown();
}

export default CMSManager;