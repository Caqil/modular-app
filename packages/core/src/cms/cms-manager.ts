import { PluginManager } from '../plugin/plugin-manager';
import { ThemeManager } from '../theme/theme-manager';
import { HookManager } from '../hooks/hook-manager';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { DatabaseConnection } from '../database/connection';
import { CacheManager } from '../cache/cache-manager';
import { Logger } from '../utils/logger';

export class CMSManager {
  private static instance: CMSManager;
  private initialized = false;

  public readonly plugins: PluginManager;
  public readonly themes: ThemeManager;
  public readonly hooks: HookManager;
  public readonly events: EventManager;
  public readonly config: ConfigManager;
  public readonly database: DatabaseConnection;
  public readonly cache: CacheManager;
  public readonly logger: Logger;

  private constructor() {
    this.logger = new Logger('CMS');
    this.config = ConfigManager.getInstance();
    this.database = DatabaseConnection.getInstance();
    this.cache = CacheManager.getInstance();
    this.events = EventManager.getInstance();
    this.hooks = HookManager.getInstance();
    this.plugins = PluginManager.getInstance();
    this.themes = ThemeManager.getInstance();
  }

  public static getInstance(): CMSManager {
    if (!CMSManager.instance) {
      CMSManager.instance = new CMSManager();
    }
    return CMSManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.info('Initializing CMS...');

      // Initialize core systems
      await this.config.load();
      await this.database.connect();
      await this.cache.connect();

      // Initialize managers
      await this.events.initialize();
      await this.hooks.initialize();
      await this.plugins.initialize();
      await this.themes.initialize();

      this.initialized = true;
      this.logger.info('CMS initialized successfully');

      // Emit initialization event
      await this.events.emit('cms:initialized');
    } catch (error) {
      this.logger.error('Failed to initialize CMS:', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      this.logger.info('Shutting down CMS...');

      // Emit shutdown event
      await this.events.emit('cms:shutdown');

      // Shutdown in reverse order
      await this.themes.shutdown();
      await this.plugins.shutdown();
      await this.hooks.shutdown();
      await this.events.shutdown();
      await this.cache.disconnect();
      await this.database.disconnect();

      this.initialized = false;
      this.logger.info('CMS shutdown complete');
    } catch (error) {
      this.logger.error('Error during CMS shutdown:', error);
      throw error;
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}