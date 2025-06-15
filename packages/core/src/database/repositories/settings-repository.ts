import { Model, Types } from 'mongoose';
import { BaseRepositoryImpl } from './base-repository';
import { Sanitizer } from '../../utils/sanitizer';

// Define the setting model interface
export interface ISetting {
  _id: Types.ObjectId;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  group?: string;
  public: boolean;
  editable: boolean;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    choices?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsGroup {
  name: string;
  title: string;
  description?: string;
  settings: ISetting[];
}

export interface SettingValue {
  key: string;
  value: any;
  type: ISetting['type'];
}

export interface SettingsBackup {
  timestamp: Date;
  settings: Record<string, any>;
  version: string;
  description?: string;
}

export class SettingsRepository extends BaseRepositoryImpl<ISetting> {
  private cache = new Map<string, ISetting>();
  private cacheExpiry = new Map<string, number>();
  private readonly cacheTimeout = 300000; // 5 minutes

  constructor(model: Model<ISetting>) {
    super(model);
  }

  /**
   * Get setting value by key
   */
  async get(key: string, defaultValue?: any): Promise<any> {
    try {
      this.logger.debug('Getting setting', { key });

      // Check cache first
      const cached = this.getCachedSetting(key);
      if (cached) {
        return this.parseSettingValue(cached.value, cached.type);
      }

      const setting = await this.findOne({ key });
      if (!setting) {
        this.logger.debug('Setting not found, returning default', { key, defaultValue });
        return defaultValue;
      }

      // Cache the setting
      this.setCachedSetting(setting);

      return this.parseSettingValue(setting.value, setting.type);
    } catch (error) {
      this.logger.error('Error getting setting:', error);
      return defaultValue;
    }
  }

  /**
   * Set setting value
   */
  async set(
    key: string,
    value: any,
    options: {
      type?: ISetting['type'];
      description?: string;
      group?: string;
      public?: boolean;
      editable?: boolean;
      validation?: ISetting['validation'];
    } = {}
  ): Promise<ISetting> {
    try {
      this.logger.debug('Setting value', { key, type: options.type });

      const sanitizedKey = this.sanitizeSettingKey(key);
      if (!sanitizedKey) {
        throw new Error('Invalid setting key');
      }

      // Determine type if not provided
      const type = options.type || this.inferType(value);

      // Validate value
      this.validateSettingValue(value, type, options.validation);

      // Serialize value for storage
      const serializedValue = this.serializeValue(value, type);

      const settingData: Partial<ISetting> = {
        key: sanitizedKey,
        value: serializedValue,
        type,
        description: options.description ? Sanitizer.sanitizeText(options.description) : undefined,
        group: options.group ? Sanitizer.sanitizeText(options.group) : 'general',
        public: options.public ?? false,
        editable: options.editable ?? true,
        validation: options.validation,
      };

      // Update existing setting or create new one
      let setting = await this.findOne({ key: sanitizedKey });
      if (setting) {
        setting = await this.updateById(setting._id, settingData);
      } else {
        setting = await this.create(settingData);
      }

      if (!setting) {
        throw new Error('Failed to save setting');
      }

      // Update cache
      this.setCachedSetting(setting);

      this.logger.info('Setting saved', { key: sanitizedKey, type });

      return setting;
    } catch (error) {
      this.logger.error('Error setting value:', error);
      throw error;
    }
  }

  /**
   * Delete setting
   */
  async deleteSetting(key: string): Promise<boolean> {
    try {
      this.logger.debug('Deleting setting', { key });

      const sanitizedKey = this.sanitizeSettingKey(key);
      if (!sanitizedKey) {
        return false;
      }

      const deleted = await this.deleteOne({ key: sanitizedKey });

      if (deleted) {
        // Remove from cache
        this.cache.delete(sanitizedKey);
        this.cacheExpiry.delete(sanitizedKey);
        this.logger.info('Setting deleted', { key: sanitizedKey });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Error deleting setting:', error);
      throw error;
    }
  }

  /**
   * Get multiple settings by keys
   */
  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    try {
      this.logger.debug('Getting multiple settings', { keys });

      const sanitizedKeys = keys.map(key => this.sanitizeSettingKey(key)).filter(Boolean);
      const settings = await this.findMany({ key: { $in: sanitizedKeys } });

      const result: Record<string, any> = {};
      for (const setting of settings) {
        result[setting.key] = this.parseSettingValue(setting.value, setting.type);
      }

      return result;
    } catch (error) {
      this.logger.error('Error getting multiple settings:', error);
      throw error;
    }
  }

  /**
   * Set multiple settings at once
   */
  async setMultiple(settings: Record<string, any>): Promise<ISetting[]> {
    try {
      this.logger.debug('Setting multiple values', { count: Object.keys(settings).length });

      const results: ISetting[] = [];

      for (const [key, value] of Object.entries(settings)) {
        try {
          const setting = await this.set(key, value);
          results.push(setting);
        } catch (error) {
          this.logger.error(`Error setting ${key}:`, error);
          // Continue with other settings
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Error setting multiple values:', error);
      throw error;
    }
  }

  /**
   * Get settings by group
   */
  async getByGroup(group: string): Promise<SettingsGroup> {
    try {
      this.logger.debug('Getting settings by group', { group });

      const sanitizedGroup = Sanitizer.sanitizeText(group);
      const settings = await this.findMany(
        { group: sanitizedGroup },
        { sort: { key: 1 } }
      );

      return {
        name: sanitizedGroup,
        title: this.formatGroupTitle(sanitizedGroup),
        settings,
      };
    } catch (error) {
      this.logger.error('Error getting settings by group:', error);
      throw error;
    }
  }

  /**
   * Get all settings grouped
   */
  async getAllGrouped(): Promise<SettingsGroup[]> {
    try {
      this.logger.debug('Getting all settings grouped');

      const settings = await this.findMany({}, { sort: { group: 1, key: 1 } });

      // Group settings by group
      const grouped = settings.reduce((acc, setting) => {
        const group = setting.group || 'general';
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(setting);
        return acc;
      }, {} as Record<string, ISetting[]>);

      // Convert to SettingsGroup array
      return Object.entries(grouped).map(([groupName, groupSettings]) => ({
        name: groupName,
        title: this.formatGroupTitle(groupName),
        settings: groupSettings,
      }));
    } catch (error) {
      this.logger.error('Error getting all settings grouped:', error);
      throw error;
    }
  }

  /**
   * Get public settings (for frontend use)
   */
  async getPublicSettings(): Promise<Record<string, any>> {
    try {
      this.logger.debug('Getting public settings');

      const settings = await this.findMany({ public: true });

      const result: Record<string, any> = {};
      for (const setting of settings) {
        result[setting.key] = this.parseSettingValue(setting.value, setting.type);
      }

      return result;
    } catch (error) {
      this.logger.error('Error getting public settings:', error);
      throw error;
    }
  }

  /**
   * Search settings
   */
  async searchSettings(query: string): Promise<ISetting[]> {
    try {
      this.logger.debug('Searching settings', { query });

      const sanitizedQuery = Sanitizer.sanitizeSearchQuery(query);

      return await this.findMany({
        $or: [
          { key: { $regex: sanitizedQuery, $options: 'i' } },
          { description: { $regex: sanitizedQuery, $options: 'i' } },
          { group: { $regex: sanitizedQuery, $options: 'i' } },
        ],
      });
    } catch (error) {
      this.logger.error('Error searching settings:', error);
      throw error;
    }
  }

  /**
   * Backup all settings
   */
  async backupSettings(description?: string): Promise<SettingsBackup> {
    try {
      this.logger.debug('Creating settings backup');

      const settings = await this.findMany({});
      const settingsData: Record<string, any> = {};

      for (const setting of settings) {
        settingsData[setting.key] = {
          value: setting.value,
          type: setting.type,
          description: setting.description,
          group: setting.group,
          public: setting.public,
          editable: setting.editable,
          validation: setting.validation,
        };
      }

      const backup: SettingsBackup = {
        timestamp: new Date(),
        settings: settingsData,
        version: '1.0.0', // TODO: Get from package.json or config
        description: description ? Sanitizer.sanitizeText(description) : undefined,
      };

      this.logger.info('Settings backup created', { 
        settingsCount: settings.length,
        description,
      });

      return backup;
    } catch (error) {
      this.logger.error('Error creating settings backup:', error);
      throw error;
    }
  }

  /**
   * Restore settings from backup
   */
  async restoreSettings(backup: SettingsBackup): Promise<number> {
    try {
      this.logger.debug('Restoring settings from backup', {
        timestamp: backup.timestamp,
        settingsCount: Object.keys(backup.settings).length,
      });

      let restoredCount = 0;

      for (const [key, settingData] of Object.entries(backup.settings)) {
        try {
          await this.set(key, settingData.value, {
            type: settingData.type,
            description: settingData.description,
            group: settingData.group,
            public: settingData.public,
            editable: settingData.editable,
            validation: settingData.validation,
          });
          restoredCount++;
        } catch (error) {
          this.logger.error(`Error restoring setting ${key}:`, error);
          // Continue with other settings
        }
      }

      // Clear cache after restore
      this.clearCache();

      this.logger.info('Settings restored', { restoredCount });

      return restoredCount;
    } catch (error) {
      this.logger.error('Error restoring settings:', error);
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetToDefaults(): Promise<number> {
    try {
      this.logger.debug('Resetting settings to defaults');

      // Get default settings
      const defaults = this.getDefaultSettings();

      // Delete all existing settings
      await this.deleteMany({});

      // Set defaults
      let resetCount = 0;
      for (const [key, defaultSetting] of Object.entries(defaults)) {
        try {
          await this.set(key, defaultSetting.value, {
            type: defaultSetting.type,
            description: defaultSetting.description,
            group: defaultSetting.group,
            public: defaultSetting.public,
            editable: defaultSetting.editable,
            validation: defaultSetting.validation,
          });
          resetCount++;
        } catch (error) {
          this.logger.error(`Error setting default ${key}:`, error);
        }
      }

      // Clear cache
      this.clearCache();

      this.logger.info('Settings reset to defaults', { resetCount });

      return resetCount;
    } catch (error) {
      this.logger.error('Error resetting settings to defaults:', error);
      throw error;
    }
  }

  /**
   * Validate setting value
   */
  private validateSettingValue(
    value: any,
    type: ISetting['type'],
    validation?: ISetting['validation']
  ): void {
    if (!validation) return;

    if (validation.required && (value === undefined || value === null || value === '')) {
      throw new Error('Setting value is required');
    }

    if (type === 'string' && typeof value === 'string') {
      if (validation.min && value.length < validation.min) {
        throw new Error(`Setting value must be at least ${validation.min} characters`);
      }
      if (validation.max && value.length > validation.max) {
        throw new Error(`Setting value must be at most ${validation.max} characters`);
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        throw new Error('Setting value does not match required pattern');
      }
    }

    if (type === 'number' && typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        throw new Error(`Setting value must be at least ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        throw new Error(`Setting value must be at most ${validation.max}`);
      }
    }

    if (validation.choices && !validation.choices.includes(String(value))) {
      throw new Error(`Setting value must be one of: ${validation.choices.join(', ')}`);
    }
  }

  /**
   * Infer type from value
   */
  private inferType(value: any): ISetting['type'] {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return 'string';
  }

  /**
   * Serialize value for storage
   */
  private serializeValue(value: any, type: ISetting['type']): any {
    switch (type) {
      case 'object':
      case 'array':
        return JSON.stringify(value);
      case 'boolean':
        return Boolean(value);
      case 'number':
        return Number(value);
      case 'string':
      default:
        return String(value);
    }
  }

  /**
   * Parse setting value from storage
   */
  private parseSettingValue(value: any, type: ISetting['type']): any {
    try {
      switch (type) {
        case 'object':
        case 'array':
          return typeof value === 'string' ? JSON.parse(value) : value;
        case 'boolean':
          return typeof value === 'string' ? value === 'true' : Boolean(value);
        case 'number':
          return typeof value === 'string' ? parseFloat(value) : Number(value);
        case 'string':
        default:
          return String(value);
      }
    } catch (error) {
      this.logger.error('Error parsing setting value:', error);
      return value;
    }
  }

  /**
   * Sanitize setting key
   */
  private sanitizeSettingKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '')
      .replace(/^[._-]+|[._-]+$/g, '');
  }

  /**
   * Format group title
   */
  private formatGroupTitle(group: string): string {
    return group
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Cache management
   */
  private getCachedSetting(key: string): ISetting | null {
    const cached = this.cache.get(key);
    const expiry = this.cacheExpiry.get(key);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // Remove expired entry
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
    return null;
  }

  private setCachedSetting(setting: ISetting): void {
    this.cache.set(setting.key, setting);
    this.cacheExpiry.set(setting.key, Date.now() + this.cacheTimeout);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.logger.debug('Settings cache cleared');
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): Record<string, Omit<ISetting, '_id' | 'createdAt' | 'updatedAt'>> {
    return {
      'site.title': {
        key: 'site.title',
        value: 'Modular App',
        type: 'string',
        description: 'Site title displayed in browser tabs and search results',
        group: 'general',
        public: true,
        editable: true,
        validation: { required: true, min: 1, max: 100 },
      },
      'site.description': {
        key: 'site.description',
        value: 'A modern, extensible CMS built with Next.js',
        type: 'string',
        description: 'Brief description of your site',
        group: 'general',
        public: true,
        editable: true,
        validation: { max: 200 },
      },
      'site.url': {
        key: 'site.url',
        value: 'http://localhost:3000',
        type: 'string',
        description: 'Full URL of your site',
        group: 'general',
        public: true,
        editable: true,
        validation: { required: true, pattern: '^https?://.+' },
      },
      'admin.posts_per_page': {
        key: 'admin.posts_per_page',
        value: 10,
        type: 'number',
        description: 'Number of posts to show per page in admin',
        group: 'admin',
        public: false,
        editable: true,
        validation: { min: 1, max: 100 },
      },
      'security.jwt_expires_in': {
        key: 'security.jwt_expires_in',
        value: '7d',
        type: 'string',
        description: 'JWT token expiration time',
        group: 'security',
        public: false,
        editable: true,
        validation: { required: true },
      },
      'upload.max_file_size': {
        key: 'upload.max_file_size',
        value: 5242880, // 5MB
        type: 'number',
        description: 'Maximum file upload size in bytes',
        group: 'media',
        public: false,
        editable: true,
        validation: { min: 1024, max: 104857600 }, // 1KB to 100MB
      },
    };
  }
}