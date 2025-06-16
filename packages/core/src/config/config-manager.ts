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
  private events: EventManager;
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
    this.events = EventManager.getInstance();
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

      // Emit initialization event
      await this.events.emit(EventType.CMS_CONFIG_CHANGED, {
        type: 'config_manager_initialized',
        timestamp: new Date(),
      });

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

      // Emit change event
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

    await Promise.all(
      keys.map(async (key) => {
        try {
          result[key] = await this.get(key);
        } catch (error) {
          this.logger.warn(`Failed to get configuration '${key}':`, error);
          result[key] = undefined;
        }
      })
    );

    return result;
  }

  /**
   * Get configuration by prefix
   */
  public async getByPrefix(prefix: string): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    // Check overrides
    for (const [key, value] of this.overrides.entries()) {
      if (key.startsWith(prefix)) {
        result[key] = value;
      }
    }

    // Check environment variables
    const envConfig = this.envConfig.getConfig();
    for (const [key, value] of Object.entries(envConfig)) {
      const configKey = this.envKeyToConfigKey(key);
      if (configKey.startsWith(prefix)) {
        result[configKey] = value;
      }
    }

    // Check database settings
    if (this.settingsRepo) {
      try {
        const dbSettings = await this.settingsRepo.findMany({
          key: { $regex: `^${prefix.replace(/\./g, '\\.')}` }
        });

        for (const setting of dbSettings) {
          if (!result.hasOwnProperty(setting.key)) {
            result[setting.key] = setting.value;
          }
        }
      } catch (error) {
        this.logger.warn('Failed to get database settings by prefix:', error);
      }
    }

    // Check default configuration
    const defaultValues = this.getDefaultValuesByPrefix(prefix);
    for (const [key, value] of Object.entries(defaultValues)) {
      if (!result.hasOwnProperty(key)) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Watch for configuration changes
   */
  public watch(key: string, callback: (value: any, oldValue?: any) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    
    this.watchers.get(key)!.add(callback);

    // Return unwatch function
    return () => {
      const keyWatchers = this.watchers.get(key);
      if (keyWatchers) {
        keyWatchers.delete(callback);
        if (keyWatchers.size === 0) {
          this.watchers.delete(key);
        }
      }
    };
  }

  /**
   * Remove configuration override
   */
  public removeOverride(key: string): void {
    if (this.overrides.has(key)) {
      this.overrides.delete(key);
      
      // Clear cache for this key
      this.cache.delete(key);
      this.cacheExpiry.delete(key);

      this.logger.debug(`Configuration override removed: ${key}`);
    }
  }

  /**
   * Clear all overrides
   */
  public clearOverrides(): void {
    this.overrides.clear();
    this.clearCache();
    this.logger.debug('All configuration overrides cleared');
  }

  /**
   * Clear configuration cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.logger.debug('Configuration cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    hitRate: number;
    expired: number;
    keys: string[];
  } {
    const now = Date.now();
    let expired = 0;

    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (expiry < now) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      expired,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Get configuration sources summary
   */
  public getSourcesSummary(): {
    overrides: number;
    environment: number;
    database: number;
    default: number;
  } {
    const envConfig = this.envConfig.getConfig();
    
    return {
      overrides: this.overrides.size,
      environment: Object.keys(envConfig).length,
      database: 0, // Would need async call to get accurate count
      default: this.countDefaultKeys(),
    };
  }

  /**
   * Validate configuration schema
   */
  public validateSchema(schema: ConfigSchema, config?: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const configToValidate = config || {};

    const validateObject = (obj: any, schemaObj: ConfigSchema, path = ''): void => {
      for (const [key, rule] of Object.entries(schemaObj)) {
        const fullPath = path ? `${path}.${key}` : key;
        const value = obj[key];

        if (typeof rule === 'object' && !('type' in rule)) {
          // Nested schema
          if (typeof value === 'object' && value !== null) {
            validateObject(value, rule as ConfigSchema, fullPath);
          } else if (value !== undefined) {
            errors.push(`${fullPath}: Expected object, got ${typeof value}`);
          }
        } else {
          // Validation rule
          const validationRule = rule as ConfigValidationRule;
          const error = this.validateValue(value, validationRule, fullPath);
          if (error) {
            errors.push(error);
          }
        }
      }
    };

    validateObject(configToValidate, schema);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Reload configuration from all sources
   */
  public async reload(): Promise<void> {
    try {
      this.logger.info('Reloading configuration...');

      // Clear cache
      this.clearCache();

      // Reinitialize environment config
      this.envConfig.initialize();

      // Preload configurations
      await this.preloadConfigurations();

      // Emit reload event
      await this.events.emit(EventType.CMS_CONFIG_CHANGED, {
        type: 'config_reloaded',
        timestamp: new Date(),
      });

      this.logger.info('Configuration reloaded successfully');

    } catch (error) {
      this.logger.error('Error reloading configuration:', error);
      throw error;
    }
  }

  /**
   * Get configuration value from specific source
   */
  public async getFromSource<T = any>(key: string, source: ConfigSource): Promise<T | undefined> {
    switch (source) {
      case 'override':
        return this.overrides.get(key) as T;
        
      case 'environment':
        return this.getEnvironmentValue<T>(key);
        
      case 'database':
        if (this.settingsRepo) {
          return await this.settingsRepo.getSetting(key) as T;
        }
        return undefined;
        
      case 'default':
        return this.getDefaultValue<T>(key);
        
      default:
        return undefined;
    }
  }

  /**
   * Resolve configuration value based on priority order
   */
  private async resolveValue<T = any>(key: string): Promise<T | undefined> {
    for (const source of this.options.priorityOrder) {
      const value = await this.getFromSource<T>(key, source);
      if (value !== undefined && value !== null) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Get cached configuration value
   */
  private getCachedValue<T>(key: string): T | undefined {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && expiry < Date.now()) {
      // Cache expired
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return undefined;
    }

    const cached = this.cache.get(key);
    return cached?.value as T;
  }

  /**
   * Set cached configuration value
   */
  private setCachedValue(key: string, value: any, source: ConfigSource): void {
    this.cache.set(key, {
      value,
      source,
      lastUpdated: new Date(),
    });
    
    this.cacheExpiry.set(key, Date.now() + (this.options.cacheTTL * 1000));
  }

  /**
   * Get environment configuration value
   */
  private getEnvironmentValue<T>(key: string): T | undefined {
    const envConfig = this.envConfig.getConfig();
    const envKey = this.configKeyToEnvKey(key);
    
    return envConfig[envKey as keyof EnvConfig] as T;
  }

  /**
   * Get default configuration value
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

    return current as T;
  }

  /**
   * Get default configuration values by prefix
   */
  private getDefaultValuesByPrefix(prefix: string): Record<string, any> {
    const result: Record<string, any> = {};
    const keys = prefix.split('.');
    let current: any = defaultConfig;

    // Navigate to the prefix level
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return result;
      }
    }

    // Flatten the object
    const flatten = (obj: any, path = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        const finalPath = prefix ? `${prefix}.${fullPath}` : fullPath;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          flatten(value, fullPath);
        } else {
          result[finalPath] = value;
        }
      }
    };

    if (typeof current === 'object' && current !== null) {
      flatten(current);
    }

    return result;
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
   * Count default configuration keys
   */
  private countDefaultKeys(): number {
    const countKeys = (obj: any): number => {
      let count = 0;
      for (const [, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          count += countKeys(value);
        } else {
          count++;
        }
      }
      return count;
    };

    return countKeys(defaultConfig);
  }

  /**
   * Notify configuration watchers
   */
  private notifyWatchers(key: string, newValue: any): void {
    const keyWatchers = this.watchers.get(key);
    if (keyWatchers) {
      for (const callback of keyWatchers) {
        try {
          callback(newValue);
        } catch (error) {
          this.logger.error(`Error in configuration watcher for '${key}':`, error);
        }
      }
    }
  }

  /**
   * Validate configuration value
   */
  private validateValue(value: any, rule: ConfigValidationRule, path: string): string | null {
    // Check if required
    if (rule.required && (value === undefined || value === null)) {
      return `${path}: Required value is missing`;
    }

    if (value === undefined || value === null) {
      return null; // Not required and not provided
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${path}: Expected string, got ${typeof value}`;
        }
        break;
        
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `${path}: Expected number, got ${typeof value}`;
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${path}: Expected boolean, got ${typeof value}`;
        }
        break;
        
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return `${path}: Expected object, got ${typeof value}`;
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          return `${path}: Expected array, got ${typeof value}`;
        }
        break;
        
      case 'url':
        if (typeof value !== 'string' || !/^https?:\/\/.+/.test(value)) {
          return `${path}: Expected valid URL`;
        }
        break;
        
      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return `${path}: Expected valid email`;
        }
        break;
        
      case 'json':
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          }
        } catch {
          return `${path}: Expected valid JSON`;
        }
        break;
    }

    // Range validation
    if (rule.min !== undefined) {
      if (typeof value === 'number' && value < rule.min) {
        return `${path}: Value must be at least ${rule.min}`;
      }
      if (typeof value === 'string' && value.length < rule.min) {
        return `${path}: String must be at least ${rule.min} characters`;
      }
    }

    if (rule.max !== undefined) {
      if (typeof value === 'number' && value > rule.max) {
        return `${path}: Value must be at most ${rule.max}`;
      }
      if (typeof value === 'string' && value.length > rule.max) {
        return `${path}: String must be at most ${rule.max} characters`;
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return `${path}: Value does not match required pattern`;
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      return `${path}: Value must be one of: ${rule.enum.join(', ')}`;
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (typeof result === 'string') {
        return `${path}: ${result}`;
      }
      if (result === false) {
        return `${path}: Custom validation failed`;
      }
    }

    return null;
  }

  /**
   * Setup hot reload for database configuration changes
   */
  private async setupHotReload(): Promise<void> {
    if (!this.settingsRepo) return;

    try {
      // Listen for setting changes
      this.events.on('setting:changed', async (event) => {
        const { key, newValue } = event.payload;
        
        // Update cache
        if (this.options.cacheEnabled) {
          this.setCachedValue(key, newValue, 'database');
        }

        // Notify watchers
        this.notifyWatchers(key, newValue);

        this.logger.debug(`Configuration hot-reloaded: ${key}`);
      });

      this.logger.debug('Configuration hot reload enabled');

    } catch (error) {
      this.logger.warn('Failed to setup configuration hot reload:', error);
    }
  }

  /**
   * Preload essential configurations
   */
  private async preloadConfigurations(): Promise<void> {
    const essentialKeys = [
      'site.title',
      'site.description',
      'site.url',
      'auth.jwt.secret',
      'cache.enabled',
      'plugins.enabled',
      'themes.enabled',
    ];

    await Promise.all(
      essentialKeys.map(async (key) => {
        try {
          await this.get(key);
        } catch (error) {
          this.logger.warn(`Failed to preload configuration '${key}':`, error);
        }
      })
    );

    this.logger.debug(`Preloaded ${essentialKeys.length} essential configurations`);
  }
}

/**
 * Default configuration manager instance
 */
export const configManager = ConfigManager.getInstance();

/**
 * Get configuration value
 */
export async function getConfig<T = any>(key: string, defaultValue?: T): Promise<T> {
  return configManager.get(key, defaultValue);
}

/**
 * Get configuration value synchronously
 */
export function getConfigSync<T = any>(key: string, defaultValue?: T): T {
  return configManager.getSync(key, defaultValue);
}

/**
 * Set configuration value
 */
export async function setConfig(key: string, value: any, source: ConfigSource = 'override'): Promise<void> {
  return configManager.set(key, value, source);
}

/**
 * Watch for configuration changes
 */
export function watchConfig(key: string, callback: (value: any, oldValue?: any) => void): () => void {
  return configManager.watch(key, callback);
}

export default ConfigManager;