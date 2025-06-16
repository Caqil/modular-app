import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { EventType } from '../events/event-types';
import { HookManager } from '../hooks/hook-manager';
import { CoreFilters } from '../hooks/hook-types';
import { CacheManager } from '../cache/cache-manager';
import { ConfigManager } from '../config/config-manager';
import { SettingsRepository, SettingGroup } from '../database/repositories/settings-repository';
import { Setting, type ISetting } from '../database/models/setting';
import { Sanitizer } from '../utils/sanitizer';

export interface SettingDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  defaultValue: any;
  label: string;
  description?: string;
  group: string;
  public: boolean;
  editable: boolean;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string | RegExp;
    enum?: any[];
    custom?: (value: any) => boolean | string;
  };
  dependencies?: string[];
  ui?: {
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'color' | 'file' | 'number' | 'email' | 'url';
    placeholder?: string;
    help?: string;
    options?: Array<{ label: string; value: any }>;
    multiple?: boolean;
    rows?: number;
    step?: number;
  };
}

export interface SettingsGroup {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  order: number;
  settings: SettingDefinition[];
}

export interface SettingsSchema {
  version: string;
  groups: SettingsGroup[];
}

export interface SettingUpdateResult {
  success: boolean;
  setting?: ISetting;
  errors?: string[];
  warnings?: string[];
}

export interface SettingsBulkUpdateResult {
  success: number;
  failed: number;
  results: Array<{
    key: string;
    success: boolean;
    error?: string;
  }>;
}

export interface SettingsExportData {
  version: string;
  exportedAt: Date;
  settings: Array<{
    key: string;
    value: any;
    type: string;
    group: string;
  }>;
  metadata: {
    totalSettings: number;
    publicSettings: number;
    groups: string[];
  };
}

export interface SettingsImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{
    key: string;
    error: string;
  }>;
}

/**
 * Settings Manager
 * Manages system settings, configuration persistence, and settings UI schema
 */
export class SettingsManager {
  private static instance: SettingsManager;
  private logger: Logger;
  private events: EventManager;
  private hooks: HookManager;
  private cache: CacheManager;
  private config: ConfigManager;
  private settingsRepo: SettingsRepository;
  private initialized = false;
  private schema?: SettingsSchema;
  private watchers = new Map<string, Set<(value: any, oldValue?: any) => void>>();

  private constructor() {
    this.logger = new Logger('SettingsManager');
    this.events = EventManager.getInstance();
    this.hooks = HookManager.getInstance();
    this.cache = CacheManager.getInstance();
    this.config = ConfigManager.getInstance();
    this.settingsRepo = new SettingsRepository();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * Initialize settings manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Settings manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Settings Manager...');

      // Initialize default settings
      await this.settingsRepo.initializeDefaults();

      // Load settings schema
      await this.loadSettingsSchema();

      // Setup settings hooks
      await this.setupSettingsHooks();

      // Setup change listeners
      await this.setupChangeListeners();

      this.initialized = true;
      this.logger.info('Settings Manager initialized successfully');

      // Emit initialization event
      await this.events.emit(EventType.CMS_INITIALIZED, {
        type: 'settings_manager_initialized',
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Failed to initialize Settings Manager:', error);
      throw error;
    }
  }

  // ===================================================================
  // SETTING OPERATIONS
  // ===================================================================

  /**
   * Get setting value
   */
  public async getSetting<T = any>(key: string, defaultValue?: T): Promise<T> {
    try {
      // Apply filters to allow plugins to modify settings
      const filteredKey = await this.hooks.applyFilters(CoreFilters.PLUGIN_SETTINGS, key);
      
      const value = await this.settingsRepo.getSetting(filteredKey, defaultValue);
      
      // Apply post-get filters
      return await this.hooks.applyFilters(`setting:get:${key}`, value);

    } catch (error) {
      this.logger.error(`Error getting setting '${key}':`, error);
      return defaultValue as T;
    }
  }

  /**
   * Set setting value
   */
  public async setSetting(
    key: string,
    value: any,
    options: {
      validateSchema?: boolean;
      skipHooks?: boolean;
      source?: string;
    } = {}
  ): Promise<SettingUpdateResult> {
    try {
      this.logger.debug('Setting value', { key, hasValue: value !== undefined });

      const result: SettingUpdateResult = {
        success: false,
        errors: [],
        warnings: [],
      };

      // Get old value for comparison
      const oldValue = await this.getSetting(key);

      // Validate against schema if requested
      if (options.validateSchema !== false) {
        const validation = await this.validateSetting(key, value);
        if (!validation.valid) {
          result.errors = validation.errors;
          return result;
        }
      }

      // Apply pre-set filters
      if (!options.skipHooks) {
        value = await this.hooks.applyFilters(`setting:before_set:${key}`, value, oldValue);
      }

      // Update setting
      const setting = await this.settingsRepo.setSetting(key, value, {
        force: true, // Settings manager can override non-editable settings
      });

      result.success = true;
      result.setting = setting;

      // Notify watchers
      this.notifyWatchers(key, value, oldValue);

      // Apply post-set hooks
      if (!options.skipHooks) {
        await this.hooks.doAction(`setting:after_set:${key}`, value, oldValue);
      }

      // Emit setting change event
      await this.events.emit(EventType.CMS_CONFIG_CHANGED, {
        type: 'setting_changed',
        key,
        oldValue,
        newValue: value,
        source: options.source || 'settings_manager',
        timestamp: new Date(),
      });

      this.logger.info('Setting updated successfully', { 
        key,
        changed: value !== oldValue 
      });

      return result;

    } catch (error) {
      this.logger.error(`Error setting '${key}':`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Delete setting
   */
  public async deleteSetting(key: string): Promise<boolean> {
    try {
      this.logger.info('Deleting setting', { key });

      const oldValue = await this.getSetting(key);
      const deleted = await this.settingsRepo.deleteSetting(key);

      if (deleted) {
        // Notify watchers
        this.notifyWatchers(key, undefined, oldValue);

        // Emit deletion event
        await this.events.emit(EventType.CMS_CONFIG_CHANGED, {
          type: 'setting_deleted',
          key,
          oldValue,
          timestamp: new Date(),
        });

        this.logger.info('Setting deleted successfully', { key });
      }

      return deleted;

    } catch (error) {
      this.logger.error(`Error deleting setting '${key}':`, error);
      throw error;
    }
  }

  /**
   * Get all settings grouped by category
   */
  public async getAllSettings(includePrivate: boolean = false): Promise<SettingGroup> {
    try {
      const cacheKey = `all_settings:${includePrivate}`;
      
      // Check cache
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const settings = await this.settingsRepo.getAllSettingsGrouped(includePrivate);

      // Cache results
      await this.cache.set(cacheKey, settings, 300); // 5 minutes

      return settings;

    } catch (error) {
      this.logger.error('Error getting all settings:', error);
      throw error;
    }
  }

  /**
   * Get settings by group
   */
  public async getSettingsByGroup(
    group: string,
    includePrivate: boolean = false
  ): Promise<Record<string, any>> {
    try {
      return await this.settingsRepo.getSettingsByGroup(group, includePrivate);
    } catch (error) {
      this.logger.error(`Error getting settings for group '${group}':`, error);
      throw error;
    }
  }

  /**
   * Get public settings (safe for frontend)
   */
  public async getPublicSettings(): Promise<Record<string, any>> {
    try {
      const cacheKey = 'public_settings';
      
      // Check cache
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const settings = await this.settingsRepo.getPublicSettings();

      // Cache results
      await this.cache.set(cacheKey, settings, 600); // 10 minutes

      return settings;

    } catch (error) {
      this.logger.error('Error getting public settings:', error);
      throw error;
    }
  }

  // ===================================================================
  // BULK OPERATIONS
  // ===================================================================

  /**
   * Update multiple settings at once
   */
  public async bulkUpdateSettings(
    updates: Record<string, any>,
    options: {
      validateSchema?: boolean;
      continueOnError?: boolean;
      source?: string;
    } = {}
  ): Promise<SettingsBulkUpdateResult> {
    try {
      this.logger.info('Bulk updating settings', { count: Object.keys(updates).length });

      const result: SettingsBulkUpdateResult = {
        success: 0,
        failed: 0,
        results: [],
      };

      for (const [key, value] of Object.entries(updates)) {
        try {
          const setOptions: { validateSchema?: boolean; skipHooks?: boolean; source?: string } = {};
          if (options.validateSchema !== undefined) setOptions.validateSchema = options.validateSchema;
          if (options.source !== undefined) setOptions.source = options.source;
          
          const updateResult = await this.setSetting(key, value, setOptions);

          if (updateResult.success) {
            result.success++;
            result.results.push({ key, success: true });
          } else {
            result.failed++;
            result.results.push({
              key,
              success: false,
              error: updateResult.errors?.join(', ') || 'Unknown error',
            });
          }

          // Stop on first error unless continueOnError is true
          if (!updateResult.success && !options.continueOnError) {
            break;
          }

        } catch (error) {
          result.failed++;
          result.results.push({
            key,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          if (!options.continueOnError) {
            break;
          }
        }
      }

      this.logger.info('Bulk settings update completed', {
        success: result.success,
        failed: result.failed,
      });

      return result;

    } catch (error) {
      this.logger.error('Error in bulk settings update:', error);
      throw error;
    }
  }

  // ===================================================================
  // SCHEMA MANAGEMENT
  // ===================================================================

  /**
   * Register settings schema
   */
  public registerSchema(schema: SettingsSchema): void {
    this.schema = schema;
    this.logger.info('Settings schema registered', {
      version: schema.version,
      groups: schema.groups.length,
      totalSettings: schema.groups.reduce((sum, group) => sum + group.settings.length, 0),
    });
  }

  /**
   * Get settings schema
   */
  public getSchema(): SettingsSchema | undefined {
    return this.schema;
  }

  /**
   * Get setting definition by key
   */
  public getSettingDefinition(key: string): SettingDefinition | undefined {
    if (!this.schema) return undefined;

    for (const group of this.schema.groups) {
      const setting = group.settings.find(s => s.key === key);
      if (setting) return setting;
    }

    return undefined;
  }

  /**
   * Validate setting against schema
   */
  public async validateSetting(key: string, value: any): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const result = { valid: true, errors: [] as string[] };

    const definition = this.getSettingDefinition(key);
    if (!definition) {
      // If no definition found, allow the setting (for dynamic settings)
      return result;
    }

    // Type validation
    const typeValid = this.validateType(value, definition.type);
    if (!typeValid) {
      result.valid = false;
      result.errors.push(`Value must be of type ${definition.type}`);
      return result;
    }

    // Validation rules
    if (definition.validation) {
      const validation = definition.validation;

      // Required check
      if (validation.required && (value === null || value === undefined || value === '')) {
        result.valid = false;
        result.errors.push('Value is required');
      }

      // Min/Max validation
      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          result.valid = false;
          result.errors.push(`Value must be at least ${validation.min}`);
        }
        if (validation.max !== undefined && value > validation.max) {
          result.valid = false;
          result.errors.push(`Value must be at most ${validation.max}`);
        }
      }

      if (typeof value === 'string') {
        if (validation.min !== undefined && value.length < validation.min) {
          result.valid = false;
          result.errors.push(`Value must be at least ${validation.min} characters`);
        }
        if (validation.max !== undefined && value.length > validation.max) {
          result.valid = false;
          result.errors.push(`Value must be at most ${validation.max} characters`);
        }
      }

      // Pattern validation
      if (validation.pattern && typeof value === 'string') {
        const pattern = typeof validation.pattern === 'string' 
          ? new RegExp(validation.pattern) 
          : validation.pattern;
          
        if (!pattern.test(value)) {
          result.valid = false;
          result.errors.push('Value does not match required pattern');
        }
      }

      // Enum validation
      if (validation.enum && !validation.enum.includes(value)) {
        result.valid = false;
        result.errors.push(`Value must be one of: ${validation.enum.join(', ')}`);
      }

      // Custom validation
      if (validation.custom) {
        const customResult = validation.custom(value);
        if (typeof customResult === 'string') {
          result.valid = false;
          result.errors.push(customResult);
        } else if (customResult === false) {
          result.valid = false;
          result.errors.push('Custom validation failed');
        }
      }
    }

    return result;
  }

  // ===================================================================
  // IMPORT/EXPORT
  // ===================================================================

  /**
   * Export settings
   */
  public async exportSettings(options: {
    groups?: string[];
    includePrivate?: boolean;
  } = {}): Promise<SettingsExportData> {
    try {
      this.logger.info('Exporting settings', options);

      const allSettings = await this.settingsRepo.findMany({});
      
      let filteredSettings = allSettings;

      // Filter by groups if specified
      if (options.groups?.length) {
        filteredSettings = filteredSettings.filter(setting => 
          options.groups!.includes(setting.group)
        );
      }

      // Filter private settings if needed
      if (!options.includePrivate) {
        filteredSettings = filteredSettings.filter(setting => setting.public);
      }

      const exportData: SettingsExportData = {
        version: '1.0.0',
        exportedAt: new Date(),
        settings: filteredSettings.map(setting => ({
          key: setting.key,
          value: setting.value,
          type: setting.type,
          group: setting.group,
        })),
        metadata: {
          totalSettings: filteredSettings.length,
          publicSettings: filteredSettings.filter(s => s.public).length,
          groups: [...new Set(filteredSettings.map(s => s.group))],
        },
      };

      this.logger.info('Settings exported successfully', {
        total: exportData.settings.length,
        groups: exportData.metadata.groups.length,
      });

      return exportData;

    } catch (error) {
      this.logger.error('Error exporting settings:', error);
      throw error;
    }
  }

  /**
   * Import settings
   */
  public async importSettings(
    data: SettingsExportData,
    options: {
      overwriteExisting?: boolean;
      validateSchema?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<SettingsImportResult> {
    try {
      this.logger.info('Importing settings', {
        total: data.settings.length,
        dryRun: options.dryRun,
      });

      const result: SettingsImportResult = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };

      for (const settingData of data.settings) {
        try {
          const existing = await this.settingsRepo.findOne({ key: settingData.key });

          if (existing && !options.overwriteExisting) {
            result.skipped++;
            continue;
          }

          // Validate if requested
          if (options.validateSchema) {
            const validation = await this.validateSetting(settingData.key, settingData.value);
            if (!validation.valid) {
              result.errors.push({
                key: settingData.key,
                error: validation.errors.join(', '),
              });
              continue;
            }
          }

          if (!options.dryRun) {
            await this.setSetting(settingData.key, settingData.value, {
              validateSchema: false, // Already validated above
              source: 'import',
            });
          }

          if (existing) {
            result.updated++;
          } else {
            result.imported++;
          }

        } catch (error) {
          result.errors.push({
            key: settingData.key,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.logger.info('Settings import completed', {
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors.length,
        dryRun: options.dryRun,
      });

      return result;

    } catch (error) {
      this.logger.error('Error importing settings:', error);
      throw error;
    }
  }

  // ===================================================================
  // WATCHERS & LISTENERS
  // ===================================================================

  /**
   * Watch for setting changes
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
   * Clear all caches
   */
  public async clearCache(): Promise<void> {
    try {
      await this.settingsRepo.clearCache();
      await this.cache.deletePattern('all_settings:*');
      await this.cache.deletePattern('public_settings*');
      
      this.logger.debug('Settings cache cleared');
    } catch (error) {
      this.logger.warn('Error clearing settings cache:', error);
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  /**
   * Load settings schema from plugins and core
   */
  private async loadSettingsSchema(): Promise<void> {
    try {
      // Load core settings schema
      const coreSchema = this.getCoreSettingsSchema();
      this.registerSchema(coreSchema);

      // Apply filters to allow plugins to extend schema
      const extendedSchema = await this.hooks.applyFilters('settings:schema', this.schema);
      this.schema = extendedSchema;

      this.logger.debug('Settings schema loaded');
    } catch (error) {
      this.logger.error('Error loading settings schema:', error);
    }
  }

  /**
   * Get core settings schema
   */
  private getCoreSettingsSchema(): SettingsSchema {
    return {
      version: '1.0.0',
      groups: [
        {
          id: 'general',
          label: 'General',
          description: 'Basic site configuration',
          icon: 'settings',
          order: 1,
          settings: [
            {
              key: 'site.title',
              type: 'string',
              defaultValue: 'Modular App',
              label: 'Site Title',
              description: 'The name of your website',
              group: 'general',
              public: true,
              editable: true,
              validation: {
                required: true,
                min: 1,
                max: 100,
              },
              ui: {
                type: 'text',
                placeholder: 'Enter site title',
              },
            },
            {
              key: 'site.description',
              type: 'string',
              defaultValue: 'A modern CMS built with Next.js',
              label: 'Site Description',
              description: 'A brief description of your website',
              group: 'general',
              public: true,
              editable: true,
              validation: {
                max: 500,
              },
              ui: {
                type: 'textarea',
                rows: 3,
                placeholder: 'Enter site description',
              },
            },
            {
              key: 'site.url',
              type: 'string',
              defaultValue: 'http://localhost:3000',
              label: 'Site URL',
              description: 'The public URL of your website',
              group: 'general',
              public: true,
              editable: true,
              validation: {
                required: true,
                pattern: /^https?:\/\/.+/,
              },
              ui: {
                type: 'url',
                placeholder: 'https://example.com',
              },
            },
          ],
        },
        {
          id: 'security',
          label: 'Security',
          description: 'Security and privacy settings',
          icon: 'shield',
          order: 2,
          settings: [
            {
              key: 'security.max_login_attempts',
              type: 'number',
              defaultValue: 5,
              label: 'Max Login Attempts',
              description: 'Maximum failed login attempts before lockout',
              group: 'security',
              public: false,
              editable: true,
              validation: {
                min: 1,
                max: 20,
              },
              ui: {
                type: 'number',
                step: 1,
              },
            },
          ],
        },
      ],
    };
  }

  /**
   * Setup settings hooks
   */
  private async setupSettingsHooks(): Promise<void> {
    try {
      // Setup core setting filters
      this.hooks.addFilter('setting:get:site.title', async (value: string) => {
        return Sanitizer.sanitizeText(value);
      });

      this.logger.debug('Settings hooks setup completed');
    } catch (error) {
      this.logger.error('Error setting up settings hooks:', error);
    }
  }

  /**
   * Setup change listeners
   */
  private async setupChangeListeners(): Promise<void> {
    try {
      // Listen to setting changes from other sources
      this.events.on('setting:changed', async (event) => {
        const { key, newValue, oldValue } = event.payload;
        this.notifyWatchers(key, newValue, oldValue);
      });

      this.logger.debug('Settings change listeners setup completed');
    } catch (error) {
      this.logger.error('Error setting up change listeners:', error);
    }
  }

  /**
   * Notify setting watchers
   */
  private notifyWatchers(key: string, newValue: any, oldValue?: any): void {
    const keyWatchers = this.watchers.get(key);
    if (keyWatchers) {
      for (const callback of keyWatchers) {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          this.logger.error(`Error in setting watcher for '${key}':`, error);
        }
      }
    }
  }

  /**
   * Validate value type
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'json':
        return typeof value === 'object';
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }
}

export default SettingsManager;