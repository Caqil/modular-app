import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { CacheManager } from '../cache/cache-manager';
import { HookManager } from '../hooks/hook-manager';
import { Validator } from '../utils/validator';
import { Sanitizer } from '../utils/sanitizer';
import { EventType } from '../events/event-types';
import { CoreHooks, CoreFilters } from '../hooks/hook-types';
import { SettingDefinition, SettingsRepository } from '../database/repositories/settings-repository';
import { type ISetting as OriginalISetting } from '../database/models';

// Extend ISetting to include 'encrypted' property
export interface ISetting extends OriginalISetting {
  encrypted?: boolean;
}

export interface SettingsManagerConfig {
  cacheEnabled: boolean;
  cacheTTL: number;
  enableHistory: boolean;
  historySize: number;
  enableValidation: boolean;
  enableEncryption: boolean;
  autoBackup: boolean;
  backupInterval: number;
}


export interface SettingGroup {
  name: string;
  label: string;
  description?: string;
  icon?: string;
  order: number;
  sections: SettingSection[];
}

export interface SettingSection {
  name: string;
  label: string;
  description?: string;
  order: number;
  settings: string[];
}

export interface SettingValue {
  value: any;
  type: string;
  group: string;
  section?: string;
  lastModified: Date;
  modifiedBy?: string;
  public: boolean;
  encrypted: boolean;
}

export interface SettingHistory {
  settingKey: string;
  oldValue: any;
  newValue: any;
  changedBy: string | undefined;
  changedAt: Date;
  reason: string | undefined;
}

export interface BulkSettingsUpdate {
  settings: Record<string, any>;
  group?: string;
  section?: string;
  validate?: boolean;
}

export interface BulkUpdateResult {
  successful: string[];
  failed: Array<{
    key: string;
    error: string;
  }>;
  stats: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface SettingsExport {
  version: string;
  timestamp: Date;
  settings: Record<string, any>;
  groups: SettingGroup[];
  metadata: {
    totalSettings: number;
    exportedBy?: string;
    includesPublic: boolean;
    includesPrivate: boolean;
  };
}

/**
 * Settings Manager
 * Manages application settings with validation, caching, and grouping
 */
export class SettingsManager {
  private static instance: SettingsManager;
  private logger = new Logger('SettingsManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private cache = CacheManager.getInstance();
  private hooks = HookManager.getInstance();
  private settingsRepo = new SettingsRepository();
  private initialized = false;
  private definitions = new Map<string, SettingDefinition>();
  private groups = new Map<string, SettingGroup>();
  private history: SettingHistory[] = [];

  private readonly defaultConfig: SettingsManagerConfig = {
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour
    enableHistory: true,
    historySize: 1000,
    enableValidation: true,
    enableEncryption: false,
    autoBackup: true,
    backupInterval: 86400000, // 24 hours
  };

  private constructor() {}

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

      // Register default settings definitions
      await this.registerDefaultDefinitions();

      // Register settings hooks
      await this.registerHooks();

      // Initialize default settings
      await this.initializeDefaultSettings();

      // Setup auto backup if enabled
      const config = await this.config.get('settings', this.defaultConfig);
      if (config.autoBackup) {
        setInterval(() => this.createBackup(), config.backupInterval);
      }

      this.initialized = true;
      this.logger.info('Settings Manager initialized successfully');

      await this.events.emit(EventType.SYSTEM_INIT, {
        component: 'SettingsManager',
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
      const cacheKey = `setting:${key}`;
      const config = await this.config.get('settings', this.defaultConfig);

      // Check cache first
      if (config.cacheEnabled) {
        const cached = await this.cache.get<T>(cacheKey);
        if (cached !== null && cached !== undefined) {
          return cached as T;
        }
      }

      // Get from database
      const setting = await this.settingsRepo.getSetting(key);
      
      if (setting) {
        let value = setting.value;

        // Decrypt if needed
        if (setting.encrypted && config.enableEncryption) {
          value = await this.decryptValue(value);
        }

        // Apply filters
        value = await this.hooks.applyFilters(CoreFilters.PLUGIN_SETTINGS, value, key);

        // Cache value
        if (config.cacheEnabled) {
          await this.cache.set(cacheKey, value, config.cacheTTL);
        }

        return value;
      }

      // Return default value or definition default
      const definition = this.definitions.get(key);
      const finalDefault = defaultValue !== undefined ? defaultValue : definition?.defaultValue;

      if (finalDefault !== undefined && config.cacheEnabled) {
        await this.cache.set(cacheKey, finalDefault, config.cacheTTL);
      }

      return finalDefault;

    } catch (error) {
      this.logger.error(`Error getting setting '${key}':`, error);
      throw error;
    }
  }

/**
 * Set setting value
 */
public async setSetting(
  key: string,
  value: any,
  options: {
    group?: string;
    section?: string;
    validate?: boolean;
    changedBy?: string;
    reason?: string;
  } = {}
): Promise<void> {
  try {
    this.logger.debug('Setting value', { key, value: this.sanitizeLogValue(value) });

    const config = await this.config.get('settings', this.defaultConfig);
    const definition = this.definitions.get(key);

    // Validate value if enabled
    if ((options.validate ?? config.enableValidation) && definition) {
      await this.validateSettingValue(key, value, definition);
    }

    // Sanitize value
    const sanitizedValue = await this.sanitizeSettingValue(value, definition);

    // Get current value for history
    const currentSetting = await this.settingsRepo.getSetting(key);
    const oldValue = currentSetting?.value;

    // Encrypt value if needed
    let finalValue = sanitizedValue;
    const shouldEncrypt = definition?.encrypted && config.enableEncryption;
    
    if (shouldEncrypt) {
      finalValue = await this.encryptValue(sanitizedValue);
    }

    // Fix: Map JS types to valid ISetting types
    const mappedType = this.mapJsTypeToSettingType(sanitizedValue);
    
    // Prepare setting data (only include properties that exist on ISetting)
    const settingData: Partial<ISetting> = {
      key,
      value: finalValue,
      type: definition?.type || mappedType,
      group: options.group || definition?.group || 'general',
      // Remove section and encrypted - they don't exist on ISetting interface
      public: definition?.public ?? true,
    };

    // Update or create setting
    await this.settingsRepo.setSetting(key, settingData);

    // Add to history
    if (config.enableHistory && oldValue !== sanitizedValue) {
      this.addToHistory(key, oldValue, sanitizedValue, options.changedBy, options.reason);
    }

    // Clear cache
    await this.clearSettingCache(key);

    // Emit events
    await this.events.emit(EventType.CMS_CONFIG_CHANGED, {
      key,
      oldValue,
      newValue: sanitizedValue,
      changedBy: options.changedBy,
      timestamp: new Date(),
    });

    this.logger.info('Setting updated successfully', {
      key,
      group: settingData.group,
      public: settingData.public,
    });

  } catch (error) {
    this.logger.error(`Error setting '${key}':`, error);
    throw error;
  }
}

/**
 * Map JavaScript type to valid ISetting type
 */
private mapJsTypeToSettingType(value: any): ISetting['type'] {
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  // Map object, array, and any other complex type to 'json'
  if (typeof value === 'object') {
    return 'json';
  }
  return 'json';
}
  /**
   * Get multiple settings by group or keys
   */
  public async getSettings(options: {
    group?: string;
    section?: string;
    keys?: string[];
    publicOnly?: boolean;
  } = {}): Promise<Record<string, any>> {
    try {
      const cacheKey = `settings:${JSON.stringify(options)}`;
      const config = await this.config.get('settings', this.defaultConfig);

      // Check cache first
      if (config.cacheEnabled) {
        const cached = await this.cache.get<Record<string, any>>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Build filter
      const filter: Record<string, any> = {};
      
      if (options.group) {
        filter.group = options.group;
      }

      if (options.section) {
        filter.section = options.section;
      }

      if (options.keys) {
        filter.key = { $in: options.keys };
      }

      if (options.publicOnly) {
        filter.public = true;
      }

      // Get settings from database
      const settings = await this.settingsRepo.findMany(filter);
      
      const result: Record<string, any> = {};

      for (const setting of settings) {
        let value = setting.value;

        // Decrypt if needed
       const definition = this.definitions.get(setting.key);
if (definition?.encrypted && config.enableEncryption) {
          try {
            value = await this.decryptValue(value);
          } catch (error) {
            this.logger.warn(`Failed to decrypt setting '${setting.key}':`, error);
            continue;
          }
        }

        // Apply filters
        value = await this.hooks.applyFilters(CoreFilters.PLUGIN_SETTINGS, value, setting.key);

        result[setting.key] = value;
      }

      // Add default values for missing settings
      if (options.group) {
        for (const [key, definition] of this.definitions) {
          if (definition.group === options.group && !result.hasOwnProperty(key)) {
            result[key] = definition.defaultValue;
          }
        }
      }

      // Cache result
      if (config.cacheEnabled) {
        await this.cache.set(cacheKey, result, config.cacheTTL);
      }

      return result;

    } catch (error) {
      this.logger.error('Error getting settings:', error);
      throw error;
    }
  }

  /**
   * Update multiple settings
   */
  public async updateSettings(update: BulkSettingsUpdate): Promise<BulkUpdateResult> {
    try {
      this.logger.info('Updating multiple settings', {
        count: Object.keys(update.settings).length,
        group: update.group,
        section: update.section,
      });

      const result: BulkUpdateResult = {
        successful: [],
        failed: [],
        stats: {
          total: Object.keys(update.settings).length,
          successful: 0,
          failed: 0,
        },
      };

      for (const [key, value] of Object.entries(update.settings)) {
        try {
          const options: {
            group?: string;
            section?: string;
            validate?: boolean;
          } = {};
          if (update.group !== undefined) options.group = update.group;
          if (update.section !== undefined) options.section = update.section;
          if (update.validate !== undefined) options.validate = update.validate;

          await this.setSetting(key, value, options);

          result.successful.push(key);
          result.stats.successful++;

        } catch (error) {
          result.failed.push({
            key,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.stats.failed++;
        }
      }

      this.logger.info('Bulk settings update completed', result.stats);

      return result;

    } catch (error) {
      this.logger.error('Error in bulk settings update:', error);
      throw error;
    }
  }

  /**
   * Delete setting
   */
  public async deleteSetting(key: string): Promise<boolean> {
    try {
      this.logger.debug('Deleting setting', { key });

      // Get current value for history
      const currentSetting = await this.settingsRepo.getSetting(key);
      
      // Delete from database
      const deleted = await this.settingsRepo.deleteSetting(key);

      if (deleted) {
        // Add to history
        const config = await this.config.get('settings', this.defaultConfig);
        if (config.enableHistory) {
          this.addToHistory(key, currentSetting?.value, undefined);
        }

        // Clear cache
        await this.clearSettingCache(key);

        this.logger.info('Setting deleted successfully', { key });
      }

      return deleted;

    } catch (error) {
      this.logger.error(`Error deleting setting '${key}':`, error);
      throw error;
    }
  }

  // ===================================================================
  // SETTING DEFINITIONS
  // ===================================================================

  /**
   * Register setting definition
   */
  public registerDefinition(definition: SettingDefinition): void {
    this.logger.debug('Registering setting definition', { key: definition.key });

    this.definitions.set(definition.key, definition);

    // Ensure group exists
    if (!this.groups.has(definition.group)) {
      this.registerGroup({
        name: definition.group,
        label: definition.group.charAt(0).toUpperCase() + definition.group.slice(1),
        order: this.groups.size,
        sections: [],
      });
    }

    // Add to group section
    const group = this.groups.get(definition.group)!;
    if (definition.section) {
      let section = group.sections.find(s => s.name === definition.section);
      if (!section) {
        section = {
          name: definition.section,
          label: definition.section.charAt(0).toUpperCase() + definition.section.slice(1),
          order: group.sections.length,
          settings: [],
        };
        group.sections.push(section);
      }
      
      if (!section.settings.includes(definition.key)) {
        section.settings.push(definition.key);
      }
    }
  }

  /**
   * Register setting group
   */
  public registerGroup(group: SettingGroup): void {
    this.logger.debug('Registering setting group', { name: group.name });
    this.groups.set(group.name, group);
  }

  /**
   * Get setting definition
   */
  public getDefinition(key: string): SettingDefinition | undefined {
    return this.definitions.get(key);
  }

  /**
   * Get all setting definitions
   */
  public getDefinitions(group?: string): SettingDefinition[] {
    const definitions = Array.from(this.definitions.values());
    
    if (group) {
      return definitions.filter(def => def.group === group);
    }

    return definitions;
  }

  /**
   * Get setting groups
   */
  public getGroups(): SettingGroup[] {
    return Array.from(this.groups.values()).sort((a, b) => a.order - b.order);
  }

  // ===================================================================
  // IMPORT/EXPORT
  // ===================================================================

 /**
 * Export settings
 */
public async exportSettings(options: {
  groups?: string[];
  publicOnly?: boolean;
  includeDefaults?: boolean;
} = {}): Promise<SettingsExport> {
  try {
    this.logger.info('Exporting settings', options);

    // Get settings based on options
    const filter: Record<string, any> = {};
    
    if (options.groups) {
      filter.group = { $in: options.groups };
    }

    if (options.publicOnly) {
      filter.public = true;
    }

    const settings = await this.settingsRepo.findMany(filter);
    const settingsMap: Record<string, any> = {};

    for (const setting of settings) {
      let value = setting.value;

      const definition = this.definitions.get(setting.key);
      if (definition?.encrypted) {
        continue; 
      }

      settingsMap[setting.key] = value;
    }

    // Include defaults if requested
    if (options.includeDefaults) {
      for (const [key, definition] of this.definitions) {
        if (!settingsMap.hasOwnProperty(key)) {
          if (!options.groups || options.groups.includes(definition.group)) {
            if (!options.publicOnly || definition.public) {
              // Don't include encrypted defaults
              if (!definition.encrypted) {
                settingsMap[key] = definition.defaultValue;
              }
            }
          }
        }
      }
    }

    const exportData: SettingsExport = {
      version: '1.0.0',
      timestamp: new Date(),
      settings: settingsMap,
      groups: options.groups ? 
        this.getGroups().filter(g => options.groups!.includes(g.name)) :
        this.getGroups(),
      metadata: {
        totalSettings: Object.keys(settingsMap).length,
        includesPublic: !options.publicOnly || options.publicOnly,
        includesPrivate: !options.publicOnly,
      },
    };

    this.logger.info('Settings exported successfully', {
      count: exportData.metadata.totalSettings,
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
    exportData: SettingsExport,
    options: {
      overwrite?: boolean;
      validateOnly?: boolean;
      groups?: string[];
    } = {}
  ): Promise<BulkUpdateResult> {
    try {
      this.logger.info('Importing settings', {
        count: Object.keys(exportData.settings).length,
        overwrite: options.overwrite,
        validateOnly: options.validateOnly,
      });

      // Filter settings by groups if specified
      let settingsToImport = exportData.settings;
      if (options.groups) {
        const filteredSettings: Record<string, any> = {};
        for (const [key, value] of Object.entries(exportData.settings)) {
          const definition = this.definitions.get(key);
          if (definition && options.groups.includes(definition.group)) {
            filteredSettings[key] = value;
          }
        }
        settingsToImport = filteredSettings;
      }

      // Validate import data
      if (options.validateOnly) {
        const result = await this.validateImportData(settingsToImport);
        this.logger.info('Settings validation completed', result.stats);
        return result;
      }

      // Import settings
      const result = await this.updateSettings({
        settings: settingsToImport,
        validate: true,
      });

      this.logger.info('Settings imported successfully', result.stats);

      return result;

    } catch (error) {
      this.logger.error('Error importing settings:', error);
      throw error;
    }
  }

  // ===================================================================
  // HISTORY AND BACKUP
  // ===================================================================

  /**
   * Get setting history
   */
  public getHistory(key?: string, limit: number = 50): SettingHistory[] {
    let history = this.history;

    if (key) {
      history = history.filter(h => h.settingKey === key);
    }

    return history
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Create settings backup
   */
  public async createBackup(): Promise<SettingsExport> {
    try {
      this.logger.info('Creating settings backup');

      const backup = await this.exportSettings({
        publicOnly: false,
        includeDefaults: false,
      });

      // Save backup to storage (implementation depends on storage strategy)
      // This could be file system, database, or cloud storage

      this.logger.info('Settings backup created successfully');

      return backup;

    } catch (error) {
      this.logger.error('Error creating settings backup:', error);
      throw error;
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

 /**
 * Register default setting definitions
 */
private async registerDefaultDefinitions(): Promise<void> {
  // ===================================================================
  // GENERAL SETTINGS
  // ===================================================================
  
  // Site settings
  this.registerDefinition({
    key: 'site.title',
    type: 'string',
    defaultValue: 'Modular CMS',
    label: 'Site Title',
    description: 'The title of your website',
    group: 'general',
    section: 'site',
    public: true,
    required: true,
    editable: true,
    validation: {
      min: 1,
      max: 255,
    },
  });

  this.registerDefinition({
    key: 'site.description',
    type: 'string',
    defaultValue: 'A modern, modular content management system',
    label: 'Site Description',
    description: 'A brief description of your website',
    group: 'general',
    section: 'site',
    public: true,
    editable: true,
    validation: {
      max: 500,
    },
  });

  this.registerDefinition({
    key: 'site.url',
    type: 'string',
    defaultValue: 'http://localhost:3000',
    label: 'Site URL',
    description: 'The URL of your website',
    group: 'general',
    section: 'site',
    public: true,
    required: true,
    editable: true,
    validation: {
      pattern: /^https?:\/\/.+/,
    },
  });

  this.registerDefinition({
    key: 'site.language',
    type: 'string',
    defaultValue: 'en',
    label: 'Default Language',
    description: 'Default language for your website',
    group: 'general',
    section: 'site',
    public: true,
    editable: true,
    choices: {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
    },
  });

  this.registerDefinition({
    key: 'site.timezone',
    type: 'string',
    defaultValue: 'UTC',
    label: 'Timezone',
    description: 'Default timezone for dates and times',
    group: 'general',
    section: 'site',
    public: true,
    editable: true,
    choices: {
      'UTC': 'UTC',
      'America/New_York': 'Eastern Time',
      'America/Chicago': 'Central Time',
      'America/Denver': 'Mountain Time',
      'America/Los_Angeles': 'Pacific Time',
      'Europe/London': 'London',
      'Europe/Paris': 'Paris',
      'Europe/Berlin': 'Berlin',
      'Asia/Tokyo': 'Tokyo',
      'Asia/Shanghai': 'Shanghai',
      'Australia/Sydney': 'Sydney',
    },
  });

  this.registerDefinition({
    key: 'site.admin_email',
    type: 'string',
    defaultValue: 'admin@example.com',
    label: 'Admin Email',
    description: 'Administrator email address',
    group: 'general',
    section: 'site',
    public: false,
    required: true,
    editable: true,
    sensitive: true,
    validation: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  });

  // ===================================================================
  // CONTENT SETTINGS
  // ===================================================================

  this.registerDefinition({
    key: 'posts.per_page',
    type: 'number',
    defaultValue: 10,
    label: 'Posts Per Page',
    description: 'Number of posts to display per page',
    group: 'content',
    section: 'posts',
    public: true,
    editable: true,
    validation: {
      min: 1,
      max: 100,
    },
  });

  this.registerDefinition({
    key: 'posts.default_status',
    type: 'string',
    defaultValue: 'draft',
    label: 'Default Post Status',
    description: 'Default status for new posts',
    group: 'content',
    section: 'posts',
    public: false,
    editable: true,
    choices: {
      'draft': 'Draft',
      'published': 'Published',
      'scheduled': 'Scheduled',
    },
  });

  this.registerDefinition({
    key: 'posts.allow_excerpts',
    type: 'boolean',
    defaultValue: true,
    label: 'Allow Post Excerpts',
    description: 'Enable manual excerpts for posts',
    group: 'content',
    section: 'posts',
    public: true,
    editable: true,
  });

  this.registerDefinition({
    key: 'posts.excerpt_length',
    type: 'number',
    defaultValue: 150,
    label: 'Auto Excerpt Length',
    description: 'Number of words for automatic excerpts',
    group: 'content',
    section: 'posts',
    public: true,
    editable: true,
    validation: {
      min: 10,
      max: 500,
    },
  });

  // Comments
  this.registerDefinition({
    key: 'comments.enabled',
    type: 'boolean',
    defaultValue: true,
    label: 'Enable Comments',
    description: 'Allow users to comment on posts',
    group: 'content',
    section: 'comments',
    public: true,
    editable: true,
  });

  this.registerDefinition({
    key: 'comments.moderation',
    type: 'boolean',
    defaultValue: true,
    label: 'Comment Moderation',
    description: 'Moderate comments before publishing',
    group: 'content',
    section: 'comments',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'comments.registration_required',
    type: 'boolean',
    defaultValue: false,
    label: 'Registration Required',
    description: 'Require user registration to comment',
    group: 'content',
    section: 'comments',
    public: true,
    editable: true,
  });

  this.registerDefinition({
    key: 'comments.max_depth',
    type: 'number',
    defaultValue: 3,
    label: 'Maximum Comment Depth',
    description: 'Maximum depth for threaded comments',
    group: 'content',
    section: 'comments',
    public: false,
    editable: true,
    validation: {
      min: 1,
      max: 10,
    },
  });

  // ===================================================================
  // USER & REGISTRATION SETTINGS
  // ===================================================================

  this.registerDefinition({
    key: 'users.registration_enabled',
    type: 'boolean',
    defaultValue: true,
    label: 'User Registration',
    description: 'Allow new user registration',
    group: 'users',
    section: 'registration',
    public: true,
    editable: true,
  });

  this.registerDefinition({
    key: 'users.default_role',
    type: 'string',
    defaultValue: 'subscriber',
    label: 'Default User Role',
    description: 'Default role for new users',
    group: 'users',
    section: 'registration',
    public: false,
    editable: true,
    choices: {
      'subscriber': 'Subscriber',
      'contributor': 'Contributor',
      'author': 'Author',
      'editor': 'Editor',
    },
  });

  this.registerDefinition({
    key: 'users.email_verification',
    type: 'boolean',
    defaultValue: true,
    label: 'Email Verification',
    description: 'Require email verification for new accounts',
    group: 'users',
    section: 'registration',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'users.strong_passwords',
    type: 'boolean',
    defaultValue: true,
    label: 'Require Strong Passwords',
    description: 'Enforce strong password requirements',
    group: 'users',
    section: 'security',
    public: false,
    editable: true,
  });

  // ===================================================================
  // EMAIL SETTINGS
  // ===================================================================

  this.registerDefinition({
    key: 'email.from_name',
    type: 'string',
    defaultValue: 'Modular CMS',
    label: 'From Name',
    description: 'Name used in outgoing emails',
    group: 'email',
    section: 'smtp',
    public: false,
    editable: true,
    validation: {
      min: 1,
      max: 100,
    },
  });

  this.registerDefinition({
    key: 'email.from_address',
    type: 'string',
    defaultValue: 'noreply@example.com',
    label: 'From Address',
    description: 'Email address used for outgoing emails',
    group: 'email',
    section: 'smtp',
    public: false,
    required: true,
    editable: true,
    sensitive: true,
    validation: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  });

  this.registerDefinition({
    key: 'email.reply_to',
    type: 'string',
    defaultValue: '',
    label: 'Reply To Address',
    description: 'Email address for replies (optional)',
    group: 'email',
    section: 'smtp',
    public: false,
    editable: true,
    validation: {
      pattern: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  });

  this.registerDefinition({
    key: 'email.notifications_enabled',
    type: 'boolean',
    defaultValue: true,
    label: 'Email Notifications',
    description: 'Enable email notifications',
    group: 'email',
    section: 'notifications',
    public: false,
    editable: true,
  });

  // ===================================================================
  // MEDIA SETTINGS
  // ===================================================================

  this.registerDefinition({
    key: 'media.max_upload_size',
    type: 'number',
    defaultValue: 50 * 1024 * 1024, // 50MB
    label: 'Max Upload Size',
    description: 'Maximum file upload size in bytes',
    group: 'media',
    section: 'uploads',
    public: false,
    editable: true,
    validation: {
      min: 1024 * 1024, // 1MB minimum
      max: 500 * 1024 * 1024, // 500MB maximum
    },
  });

  this.registerDefinition({
    key: 'media.allowed_types',
    type: 'json',
    defaultValue: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mp3', 'audio/wav', 'audio/ogg',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    label: 'Allowed File Types',
    description: 'Allowed MIME types for file uploads',
    group: 'media',
    section: 'uploads',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'media.image_quality',
    type: 'number',
    defaultValue: 85,
    label: 'Image Quality',
    description: 'JPEG compression quality (1-100)',
    group: 'media',
    section: 'images',
    public: false,
    editable: true,
    validation: {
      min: 1,
      max: 100,
    },
  });

  this.registerDefinition({
    key: 'media.thumbnail_size',
    type: 'json',
    defaultValue: { width: 150, height: 150 },
    label: 'Thumbnail Size',
    description: 'Default thumbnail dimensions',
    group: 'media',
    section: 'images',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'media.medium_size',
    type: 'json',
    defaultValue: { width: 300, height: 300 },
    label: 'Medium Size',
    description: 'Medium image dimensions',
    group: 'media',
    section: 'images',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'media.large_size',
    type: 'json',
    defaultValue: { width: 1024, height: 1024 },
    label: 'Large Size',
    description: 'Large image dimensions',
    group: 'media',
    section: 'images',
    public: false,
    editable: true,
  });

  // ===================================================================
  // SECURITY SETTINGS
  // ===================================================================

  this.registerDefinition({
    key: 'security.max_login_attempts',
    type: 'number',
    defaultValue: 5,
    label: 'Max Login Attempts',
    description: 'Maximum failed login attempts before lockout',
    group: 'security',
    section: 'authentication',
    public: false,
    editable: true,
    validation: {
      min: 1,
      max: 20,
    },
  });

  this.registerDefinition({
    key: 'security.lockout_duration',
    type: 'number',
    defaultValue: 30,
    label: 'Lockout Duration',
    description: 'Account lockout duration in minutes',
    group: 'security',
    section: 'authentication',
    public: false,
    editable: true,
    validation: {
      min: 1,
      max: 1440, // 24 hours
    },
  });

  this.registerDefinition({
    key: 'security.session_timeout',
    type: 'number',
    defaultValue: 1440, // 24 hours
    label: 'Session Timeout',
    description: 'Session timeout in minutes',
    group: 'security',
    section: 'authentication',
    public: false,
    editable: true,
    validation: {
      min: 30,
      max: 10080, // 1 week
    },
  });

  this.registerDefinition({
    key: 'security.two_factor_enabled',
    type: 'boolean',
    defaultValue: false,
    label: 'Two-Factor Authentication',
    description: 'Enable 2FA for user accounts',
    group: 'security',
    section: 'authentication',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'security.password_min_length',
    type: 'number',
    defaultValue: 8,
    label: 'Minimum Password Length',
    description: 'Minimum required password length',
    group: 'security',
    section: 'passwords',
    public: false,
    editable: true,
    validation: {
      min: 6,
      max: 128,
    },
  });

  this.registerDefinition({
    key: 'security.force_ssl',
    type: 'boolean',
    defaultValue: false,
    label: 'Force SSL',
    description: 'Force HTTPS for all admin pages',
    group: 'security',
    section: 'general',
    public: false,
    editable: true,
  });

  // ===================================================================
  // APPEARANCE SETTINGS
  // ===================================================================

  this.registerDefinition({
    key: 'theme.dark_mode',
    type: 'boolean',
    defaultValue: false,
    label: 'Dark Mode',
    description: 'Enable dark mode by default',
    group: 'appearance',
    section: 'theme',
    public: true,
    editable: true,
  });

  this.registerDefinition({
    key: 'theme.custom_css',
    type: 'string',
    defaultValue: '',
    label: 'Custom CSS',
    description: 'Additional CSS styles',
    group: 'appearance',
    section: 'customization',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'theme.custom_footer_text',
    type: 'string',
    defaultValue: '',
    label: 'Custom Footer Text',
    description: 'Custom text for website footer',
    group: 'appearance',
    section: 'customization',
    public: true,
    editable: true,
    validation: {
      max: 500,
    },
  });

  // ===================================================================
  // SEO SETTINGS
  // ===================================================================

  this.registerDefinition({
    key: 'seo.meta_description',
    type: 'string',
    defaultValue: '',
    label: 'Default Meta Description',
    description: 'Default meta description for pages',
    group: 'seo',
    section: 'meta',
    public: true,
    editable: true,
    validation: {
      max: 160,
    },
  });

  this.registerDefinition({
    key: 'seo.meta_keywords',
    type: 'string',
    defaultValue: '',
    label: 'Default Meta Keywords',
    description: 'Default meta keywords for pages',
    group: 'seo',
    section: 'meta',
    public: true,
    editable: true,
    validation: {
      max: 255,
    },
  });

  this.registerDefinition({
    key: 'seo.robots_txt',
    type: 'string',
    defaultValue: 'User-agent: *\nDisallow:',
    label: 'Robots.txt Content',
    description: 'Content for robots.txt file',
    group: 'seo',
    section: 'crawlers',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'seo.sitemap_enabled',
    type: 'boolean',
    defaultValue: true,
    label: 'Generate Sitemap',
    description: 'Automatically generate XML sitemap',
    group: 'seo',
    section: 'sitemap',
    public: false,
    editable: true,
  });

  // ===================================================================
  // PERFORMANCE SETTINGS
  // ===================================================================

  this.registerDefinition({
    key: 'performance.cache_enabled',
    type: 'boolean',
    defaultValue: true,
    label: 'Enable Caching',
    description: 'Enable server-side caching',
    group: 'performance',
    section: 'caching',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'performance.cache_ttl',
    type: 'number',
    defaultValue: 3600, // 1 hour
    label: 'Cache TTL',
    description: 'Cache time-to-live in seconds',
    group: 'performance',
    section: 'caching',
    public: false,
    editable: true,
    validation: {
      min: 60,
      max: 86400, // 24 hours
    },
  });

  this.registerDefinition({
    key: 'performance.compression_enabled',
    type: 'boolean',
    defaultValue: true,
    label: 'Enable Compression',
    description: 'Enable gzip compression',
    group: 'performance',
    section: 'optimization',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'performance.minify_css',
    type: 'boolean',
    defaultValue: true,
    label: 'Minify CSS',
    description: 'Minify CSS files in production',
    group: 'performance',
    section: 'optimization',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'performance.minify_js',
    type: 'boolean',
    defaultValue: true,
    label: 'Minify JavaScript',
    description: 'Minify JavaScript files in production',
    group: 'performance',
    section: 'optimization',
    public: false,
    editable: true,
  });

  // ===================================================================
  // API SETTINGS
  // ===================================================================

  this.registerDefinition({
    key: 'api.enabled',
    type: 'boolean',
    defaultValue: true,
    label: 'Enable API',
    description: 'Enable REST API endpoints',
    group: 'api',
    section: 'general',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'api.rate_limit',
    type: 'number',
    defaultValue: 1000,
    label: 'API Rate Limit',
    description: 'API requests per hour per IP',
    group: 'api',
    section: 'security',
    public: false,
    editable: true,
    validation: {
      min: 100,
      max: 10000,
    },
  });

  this.registerDefinition({
    key: 'api.require_authentication',
    type: 'boolean',
    defaultValue: false,
    label: 'Require Authentication',
    description: 'Require authentication for API access',
    group: 'api',
    section: 'security',
    public: false,
    editable: true,
  });

  // ===================================================================
  // MAINTENANCE SETTINGS
  // ===================================================================

  this.registerDefinition({
    key: 'maintenance.mode_enabled',
    type: 'boolean',
    defaultValue: false,
    label: 'Maintenance Mode',
    description: 'Enable maintenance mode',
    group: 'maintenance',
    section: 'general',
    public: false,
    editable: true,
  });

  this.registerDefinition({
    key: 'maintenance.message',
    type: 'string',
    defaultValue: 'Website is currently under maintenance. Please check back later.',
    label: 'Maintenance Message',
    description: 'Message displayed during maintenance',
    group: 'maintenance',
    section: 'general',
    public: false,
    editable: true,
    validation: {
      max: 500,
    },
  });

  this.registerDefinition({
    key: 'maintenance.allowed_ips',
    type: 'json',
    defaultValue: [],
    label: 'Allowed IPs',
    description: 'IP addresses allowed during maintenance',
    group: 'maintenance',
    section: 'access',
    public: false,
    editable: true,
  });

  this.logger.info('Default setting definitions registered successfully');
}

  /**
   * Register settings hooks
   */
  private async registerHooks(): Promise<void> {
    // Register setting value filter
    await this.hooks.addFilter(CoreFilters.PLUGIN_SETTINGS, (value: any, key: string) => {
      return value;
    });
  }

  /**
   * Initialize default settings
   */
  private async initializeDefaultSettings(): Promise<void> {
    for (const [key, definition] of this.definitions) {
      const existing = await this.settingsRepo.getSetting(key);
      
      if (!existing && definition.defaultValue !== undefined) {
        await this.setSetting(
          key,
          definition.defaultValue,
          {
            group: definition.group,
            ...(typeof definition.section === 'string' ? { section: definition.section } : {}),
            validate: false,
          }
        );
      }
    }
  }

  /**
   * Validate setting value
   */
  private async validateSettingValue(
    key: string,
    value: any,
    definition: SettingDefinition
  ): Promise<void> {
    if (!definition.validation) return;

    const validation = definition.validation;

    // Type validation
    if (definition.type === 'number' && typeof value !== 'number') {
      throw new Error(`Setting '${key}' must be a number`);
    }

    if (definition.type === 'boolean' && typeof value !== 'boolean') {
      throw new Error(`Setting '${key}' must be a boolean`);
    }

    // Required validation
    if (definition.required && (value === undefined || value === null || value === '')) {
      throw new Error(`Setting '${key}' is required`);
    }

    // Min/max validation
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        throw new Error(`Setting '${key}' must be at least ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        throw new Error(`Setting '${key}' must be at most ${validation.max}`);
      }
    }

    if (typeof value === 'string') {
      if (validation.min !== undefined && value.length < validation.min) {
        throw new Error(`Setting '${key}' must be at least ${validation.min} characters`);
      }
      if (validation.max !== undefined && value.length > validation.max) {
        throw new Error(`Setting '${key}' must be at most ${validation.max} characters`);
      }
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      if (!validation.pattern.test(value)) {
        throw new Error(`Setting '${key}' does not match required pattern`);
      }
    }

    // Enum validation
    if (validation.enum && !validation.enum.includes(value)) {
      throw new Error(`Setting '${key}' must be one of: ${validation.enum.join(', ')}`);
    }

    // Custom validation
    if (validation.custom) {
      const result = validation.custom(value);
      if (result !== true) {
        throw new Error(typeof result === 'string' ? result : `Setting '${key}' is invalid`);
      }
    }
  }

  /**
   * Sanitize setting value
   */
  private async sanitizeSettingValue(value: any, definition?: SettingDefinition): Promise<any> {
    if (value === null || value === undefined) {
      return value;
    }

    if (definition?.type === 'string' && typeof value === 'string') {
      return definition.sensitive ? value : Sanitizer.sanitizeText(value);
    }

    return value;
  }

  /**
   * Encrypt setting value (placeholder implementation)
   */
  private async encryptValue(value: any): Promise<string> {
    // Implementation would use a proper encryption library
    // This is a placeholder
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  /**
   * Decrypt setting value (placeholder implementation)
   */
  private async decryptValue(encryptedValue: string): Promise<any> {
    // Implementation would use a proper decryption library
    // This is a placeholder
    try {
      return JSON.parse(Buffer.from(encryptedValue, 'base64').toString());
    } catch {
      return encryptedValue;
    }
  }

  /**
   * Add to setting history
   */
  private addToHistory(
    key: string,
    oldValue: any,
    newValue: any,
    changedBy?: string,
    reason?: string
  ): void {
    const config = this.config.getSync('settings', this.defaultConfig);
    
    this.history.push({
      settingKey: key,
      oldValue,
      newValue,
      changedBy,
      changedAt: new Date(),
      reason,
    });

    // Trim history if too large
    if (this.history.length > config.historySize) {
      this.history = this.history.slice(-config.historySize);
    }
  }

  /**
   * Validate import data
   */
  private async validateImportData(settings: Record<string, any>): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      successful: [],
      failed: [],
      stats: {
        total: Object.keys(settings).length,
        successful: 0,
        failed: 0,
      },
    };

    for (const [key, value] of Object.entries(settings)) {
      try {
        const definition = this.definitions.get(key);
        if (definition) {
          await this.validateSettingValue(key, value, definition);
        }

        result.successful.push(key);
        result.stats.successful++;

      } catch (error) {
        result.failed.push({
          key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.stats.failed++;
      }
    }

    return result;
  }

  /**
   * Clear setting cache
   */
  private async clearSettingCache(key?: string): Promise<void> {
    const config = await this.config.get('settings', this.defaultConfig);
    if (!config.cacheEnabled) return;

    if (key) {
      await this.cache.delete(`setting:${key}`);
    }

    // Clear group/section caches
    await this.cache.deletePattern('settings:*');
  }

  /**
   * Sanitize value for logging
   */
  private sanitizeLogValue(value: any): any {
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    
    if (typeof value === 'object') {
      return '[object]';
    }

    return value;
  }

  
}

/**
 * Default settings manager instance
 */
export const settingsManager = SettingsManager.getInstance();

export default SettingsManager;