import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { EventType } from '../events/event-types';
import { SettingsRepository } from '../database/repositories/settings-repository';
import { EnvConfigManager, type EnvConfig } from './env-config';
import { defaultConfig, type DefaultConfig } from './default-config';
import { Sanitizer } from '../utils/sanitizer';

export type ConfigSource = 'default' | 'environment' | 'database' | 'override';

export interface ConfigValue {
  value: any;
  source: ConfigSource;
  lastUpdated: Date;
  description?: string;
}

export interface ConfigChange {
  key: string;
  oldValue: any;
  newValue: any;
  source: ConfigSource;
  timestamp: Date;
}

export interface ConfigManagerOptions {
  enableHotReload: boolean;
  cacheEnabled: boolean;
  cacheTTL: number; // in seconds
  validateOnGet: boolean;
  fallbackToDefault: boolean;
  priorityOrder: ConfigSource[];
}

export interface ConfigValidationRule {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'url' | 'email' | 'json';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ConfigSchema {
  [key: string]: ConfigValidationRule | ConfigSchema;
}

/**
 * Configuration Manager
 * Manages configuration from multiple sources with priority ordering and caching
 */
export class ConfigManager extends EventEmitter {
  private static instance: ConfigManager;
  private logger: Logger;
  private events: EventManager | null = null; // CHANGED: Defer initialization
  private envConfig: EnvConfigManager;
  private settingsRepo?: SettingsRepository;
  private cache = new Map<string, ConfigValue>();
  private cacheExpiry = new Map<string, number>();
  private overrides = new Map<string, any>();
  private watchers = new Map<string, Set<(value: any) => void>>();
  private initialized = false;
  private options: ConfigManagerOptions;

  private readonly defaultOptions: ConfigManagerOptions = {
    enableHotReload: true,
    cacheEnabled: true,
    cacheTTL: 300, // 5 minutes
    validateOnGet: false,
    fallbackToDefault: true,
    priorityOrder: ['override', 'database', 'environment', 'default'],
  };

  private constructor(options?: Partial<ConfigManagerOptions>) {
    super();
    this.logger = new Logger('ConfigManager');
    // CHANGED: Don't initialize EventManager in constructor
    this.envConfig = EnvConfigManager.getInstance();
    this.options = { ...this.defaultOptions, ...options };
    
    // Increase max listeners to handle many config watchers
    this.setMaxListeners(100);
  }

  public static getInstance(options?: Partial<ConfigManagerOptions>): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(options);
    }
    return ConfigManager.instance;
  }

  /**
   * Initialize configuration manager
   */
  public async initialize(settingsRepository?: SettingsRepository): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Configuration manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Configuration Manager...');

      // CHANGED: Initialize EventManager here instead of in constructor
      this.events = EventManager.getInstance();

      // Initialize environment configuration
      this.envConfig.initialize();

      // Set settings repository for database configuration
      if (settingsRepository) {
        this.settingsRepo = settingsRepository;
      }

      // Setup hot reload if enabled
      if (this.options.enableHotReload && this.settingsRepo) {
        await this.setupHotReload();
      }

      // Load and cache essential configurations
      await this.preloadConfigurations();

      this.initialized = true;

      // Emit initialization event only if EventManager is initialized
      if (this.events && this.events.isInitialized()) {
        await this.events.emit(EventType.CMS_CONFIG_CHANGED, {
          type: 'config_manager_initialized',
          timestamp: new Date(),
        });
      }

      this.logger.info('Configuration Manager initialized successfully', {
        cacheEnabled: this.options.cacheEnabled,
        hotReloadEnabled: this.options.enableHotReload,
        priorityOrder: this.options.priorityOrder,
      });

    } catch (error) {
      this.logger.error('Failed to initialize Configuration Manager:', error);
      throw error;
    }
  }

  /**
   * Get configuration value with priority-based resolution
   */
  public async get<T = any>(key: string, defaultValue?: T): Promise<T> {
    try {
      // Check cache first
      if (this.options.cacheEnabled) {
        const cached = this.getCachedValue<T>(key);
        if (cached !== undefined) {
          return cached;
        }
      }

      // Resolve value based on priority order
      const configValue = await this.resolveValue(key);
      
      if (configValue === undefined || configValue === null) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        
        if (this.options.fallbackToDefault) {
          const fallback = this.getDefaultValue<T>(key);
          if (fallback !== undefined) {
            return fallback;
          }
        }
        
        return undefined as T;
      }

      // Cache the resolved value
      if (this.options.cacheEnabled) {
        this.setCachedValue(key, configValue, 'database');
      }

      return configValue;

    } catch (error) {
      this.logger.error(`Error getting configuration '${key}':`, error);
      
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      
      throw error;
    }
  }

  /**
   * Get configuration value synchronously (from cache or defaults only)
   */
  public getSync<T = any>(key: string, defaultValue?: T): T {
    // Check cache first
    if (this.options.cacheEnabled) {
      const cached = this.getCachedValue<T>(key);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Check overrides
    if (this.overrides.has(key)) {
      return this.overrides.get(key) as T;
    }

    // Check environment variables
    const envValue = this.getEnvironmentValue<T>(key);
    if (envValue !== undefined) {
      return envValue;
    }

    // Check default configuration
    const defaultConfigValue = this.getDefaultValue<T>(key);
    if (defaultConfigValue !== undefined) {
      return defaultConfigValue;
    }

    return defaultValue as T;
  }

  /**
   * Set configuration value
   */
  public async set(key: string, value: any, source: ConfigSource = 'override'): Promise<void> {
    try {
      const oldValue = await this.get(key);

      switch (source) {
        case 'override':
          this.overrides.set(key, value);
          break;
          
        case 'database':
          if (this.settingsRepo) {
            // Use setSetting which handles both create and update
            await this.settingsRepo.setSetting(key, value);
          } else {
            throw new Error('Database configuration requires settings repository');
          }
          break;
          
        default:
          throw new Error(`Cannot set configuration with source: ${source}`);
      }

      // Update cache
      if (this.options.cacheEnabled) {
        this.setCachedValue(key, value, source);
      }

      // Notify watchers
      this.notifyWatchers(key, value);

      // Emit change event only if EventManager is available and initialized
      if (this.events && this.events.isInitialized()) {
        const change: ConfigChange = {
          key,
          oldValue,
          newValue: value,
          source,
          timestamp: new Date(),
        };

        await this.events.emit(EventType.CMS_CONFIG_CHANGED, {
          type: 'config_value_changed',
          change,
          timestamp: new Date(),
        });
      }

      this.logger.debug('Configuration updated', {
        key,
        source,
        hasOldValue: oldValue !== undefined,
      });

    } catch (error) {
      this.logger.error(`Error setting configuration '${key}':`, error);
      throw error;
    }
  }

  /**
   * Get multiple configuration values
   */
  public async getMany(keys: string[]): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    for (const key of keys) {
      try {
        result[key] = await this.get(key);
      } catch (error) {
        this.logger.warn(`Failed to get configuration '${key}':`, error);
        result[key] = undefined;
      }
    }
    
    return result;
  }

  /**
   * Set multiple configuration values
   */
  public async setMany(values: Record<string, any>, source: ConfigSource = 'override'): Promise<void> {
    const promises = Object.entries(values).map(([key, value]) => 
      this.set(key, value, source)
    );
    
    await Promise.all(promises);
  }

  /**
   * Delete configuration value
   */
  public async delete(key: string): Promise<void> {
    try {
      // Remove from overrides
      this.overrides.delete(key);

      // Remove from database if available
      if (this.settingsRepo) {
        await this.settingsRepo.deleteSetting(key);
      }

      // Remove from cache
      this.cache.delete(key);
      this.cacheExpiry.delete(key);

      // Notify watchers
      this.notifyWatchers(key, undefined);

      // Emit change event only if EventManager is available and initialized
      if (this.events && this.events.isInitialized()) {
        await this.events.emit(EventType.CMS_CONFIG_CHANGED, {
          type: 'config_value_deleted',
          key,
          timestamp: new Date(),
        });
      }

      this.logger.debug('Configuration deleted', { key });

    } catch (error) {
      this.logger.error(`Error deleting configuration '${key}':`, error);
      throw error;
    }
  }

  /**
   * Watch for configuration changes
   */
  public watch(key: string, callback: (value: any) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    
    this.watchers.get(key)!.add(callback);
    
    // Return unwatch function
    return () => {
      const watchers = this.watchers.get(key);
      if (watchers) {
        watchers.delete(callback);
        if (watchers.size === 0) {
          this.watchers.delete(key);
        }
      }
    };
  }

  /**
   * Check if configuration exists
   */
  public async has(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Get all configuration keys
   */
  public async getKeys(): Promise<string[]> {
    const keys = new Set<string>();
    
    // Add override keys
    for (const key of this.overrides.keys()) {
      keys.add(key);
    }
    
    // Add environment keys - get from the actual config object
    try {
      const envConfig = this.envConfig.getConfig();
      for (const envKey of Object.keys(envConfig)) {
        // Convert environment key to config key format
        const configKey = this.envKeyToConfigKey(envKey);
        keys.add(configKey);
      }
    } catch (error) {
      this.logger.debug('Failed to get environment configuration keys:', error);
    }
    
    // Add default config keys
    for (const key of Object.keys(defaultConfig)) {
      keys.add(key);
    }
    
    // Add database keys if available
    if (this.settingsRepo) {
      try {
        // Get all settings and extract keys
        const allSettings = await this.settingsRepo.findMany({});
        for (const setting of allSettings) {
          keys.add(setting.key);
        }
      } catch (error) {
        this.logger.warn('Failed to get database configuration keys:', error);
      }
    }
    
    return Array.from(keys);
  }

  // ===================================================================
  // PRIVATE METHODS
  // ===================================================================

  /**
   * Resolve configuration value based on priority order
   */
  private async resolveValue(key: string): Promise<any> {
    for (const source of this.options.priorityOrder) {
      const value = await this.getValueFromSource(key, source);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Get value from specific source
   */
  private async getValueFromSource(key: string, source: ConfigSource): Promise<any> {
    switch (source) {
      case 'override':
        return this.overrides.get(key);
        
      case 'database':
        if (this.settingsRepo) {
          try {
            const setting = await this.settingsRepo.getSetting(key);
            return setting; // getSetting returns the value directly or null
          } catch (error) {
            this.logger.debug(`Database config error for '${key}':`, error);
            return undefined;
          }
        }
        return undefined;
        
      case 'environment':
        return this.getEnvironmentValue(key);
        
      case 'default':
        return this.getDefaultValue(key);
        
      default:
        return undefined;
    }
  }

  /**
   * Get cached value
   */
  private getCachedValue<T>(key: string): T | undefined {
    if (!this.options.cacheEnabled) {
      return undefined;
    }

    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return undefined;
    }

    const cached = this.cache.get(key);
    return cached ? cached.value : undefined;
  }

  /**
   * Set cached value
   */
  private setCachedValue(key: string, value: any, source: ConfigSource): void {
    if (!this.options.cacheEnabled) {
      return;
    }

    const configValue: ConfigValue = {
      value,
      source,
      lastUpdated: new Date(),
    };

    this.cache.set(key, configValue);
    
    if (this.options.cacheTTL > 0) {
      this.cacheExpiry.set(key, Date.now() + (this.options.cacheTTL * 1000));
    }
  }

  /**
   * Get environment value
   */
  private getEnvironmentValue<T>(key: string): T | undefined {
    try {
      const envConfig = this.envConfig.getConfig();
      const envKey = this.configKeyToEnvKey(key);
      
      return envConfig[envKey as keyof EnvConfig] as T;
    } catch (error) {
      this.logger.debug(`Failed to get environment value for '${key}':`, error);
      return undefined;
    }
  }

  /**
   * Get default value
   */
  private getDefaultValue<T>(key: string): T | undefined {
    const keys = key.split('.');
    let current: any = defaultConfig;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Notify watchers
   */
  private notifyWatchers(key: string, value: any): void {
    const watchers = this.watchers.get(key);
    if (watchers) {
      for (const callback of watchers) {
        try {
          callback(value);
        } catch (error) {
          this.logger.error(`Error in configuration watcher for '${key}':`, error);
        }
      }
    }
  }

  /**
   * Setup hot reload
   */
  private async setupHotReload(): Promise<void> {
    if (!this.settingsRepo) {
      return;
    }

    this.logger.debug('Setting up configuration hot reload...');

    // Setup database change listener through events if available
    try {
      if (this.events && this.events.isInitialized()) {
        // Listen for setting change events from the SettingsRepository
        this.events.on('setting:changed', async (event) => {
          const { key, newValue } = event.payload;
          
          this.logger.debug(`Configuration hot reload: ${key}`);
          
          // Update cache
          if (this.options.cacheEnabled) {
            this.setCachedValue(key, newValue, 'database');
          }
          
          // Notify watchers
          this.notifyWatchers(key, newValue);
          
          // Emit change event
          if (this.events && this.events.isInitialized()) {
            this.events.emit(EventType.CMS_CONFIG_CHANGED, {
              type: 'config_hot_reload',
              key,
              value: newValue,
              timestamp: new Date(),
            }).catch(error => {
              this.logger.error('Error emitting hot reload event:', error);
            });
          }
        });

        // Also listen for setting creation events
        this.events.on('setting:created', async (event) => {
          const { key, value } = event.payload;
          
          this.logger.debug(`Configuration hot reload (new): ${key}`);
          
          // Update cache
          if (this.options.cacheEnabled) {
            this.setCachedValue(key, value, 'database');
          }
          
          // Notify watchers
          this.notifyWatchers(key, value);
        });
      }
    } catch (error) {
      this.logger.warn('Failed to setup configuration hot reload:', error);
    }
  }

  /**
   * Preload essential configurations
   */
  private async preloadConfigurations(): Promise<void> {
    const essentialKeys = [
      'database.uri',
      'cache.enabled',
      'logging.level',
      'security.jwt.secret',
      'events.enabled',
    ];

    this.logger.debug('Preloading essential configurations...');

    for (const key of essentialKeys) {
      try {
        await this.get(key);
      } catch (error) {
        this.logger.debug(`Failed to preload configuration '${key}':`, error);
      }
    }
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.logger.debug('Configuration cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit rate tracking
    };
  }

  /**
   * Convert configuration key to environment key
   */
  private configKeyToEnvKey(key: string): string {
    return key.toUpperCase().replace(/\./g, '_');
  }

  /**
   * Convert environment key to configuration key
   */
  private envKeyToConfigKey(envKey: string): string {
    return envKey.toLowerCase().replace(/_/g, '.');
  }

  /**
   * Validate configuration value
   */
  public validate(key: string, value: any, schema?: ConfigValidationRule): boolean {
    if (!schema) {
      return true; // No validation rule provided
    }

    try {
      // Type validation
      switch (schema.type) {
        case 'string':
          if (typeof value !== 'string') return false;
          break;
        case 'number':
          if (typeof value !== 'number') return false;
          break;
        case 'boolean':
          if (typeof value !== 'boolean') return false;
          break;
        case 'object':
          if (typeof value !== 'object' || value === null) return false;
          break;
        case 'array':
          if (!Array.isArray(value)) return false;
          break;
        case 'url':
          try {
            new URL(value);
          } catch {
            return false;
          }
          break;
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) return false;
          break;
        case 'json':
          try {
            JSON.parse(value);
          } catch {
            return false;
          }
          break;
      }

      // Required validation
      if (schema.required && (value === undefined || value === null)) {
        return false;
      }

      // Min/Max validation
      if (schema.min !== undefined) {
        if (typeof value === 'number' && value < schema.min) return false;
        if (typeof value === 'string' && value.length < schema.min) return false;
        if (Array.isArray(value) && value.length < schema.min) return false;
      }

      if (schema.max !== undefined) {
        if (typeof value === 'number' && value > schema.max) return false;
        if (typeof value === 'string' && value.length > schema.max) return false;
        if (Array.isArray(value) && value.length > schema.max) return false;
      }

      // Pattern validation
      if (schema.pattern && typeof value === 'string') {
        if (!schema.pattern.test(value)) return false;
      }

      // Enum validation
      if (schema.enum && !schema.enum.includes(value)) {
        return false;
      }

      // Custom validation
      if (schema.custom) {
        const result = schema.custom(value);
        if (typeof result === 'boolean') {
          return result;
        } else if (typeof result === 'string') {
          return false; // Custom validation failed with error message
        }
      }

      return true;

    } catch (error) {
      this.logger.error(`Validation error for '${key}':`, error);
      return false;
    }
  }

  /**
   * Get initialization status
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown configuration manager
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Configuration Manager...');

    // Clear all watchers
    this.watchers.clear();

    // Clear cache
    this.clearCache();

    // Clear overrides
    this.overrides.clear();

    this.initialized = false;
    this.logger.info('Configuration Manager shutdown complete');
  }
}