import { FilterQuery } from 'mongoose';
import { BaseRepository } from './base-repository';
import { Setting, type ISetting } from '../models/setting';
import { Sanitizer } from '../../utils/sanitizer';


export interface SettingGroup {
  general: Record<string, any>;
  site: Record<string, any>;
  email: Record<string, any>;
  media: Record<string, any>;
  security: Record<string, any>;
  appearance: Record<string, any>;
  [key: string]: Record<string, any>;
}

export interface SettingDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  defaultValue: any;
  description: string;
  group: string;
  public: boolean;
  editable: boolean;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export class SettingsRepository extends BaseRepository<ISetting> {
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super(Setting, 'Setting');
  }

  /**
   * Initialize default settings
   */
  async initializeDefaults(): Promise<void> {
    try {
      this.logger.info('Initializing default settings...');

      const defaultSettings = this.getDefaultSettings();
      
      for (const setting of defaultSettings) {
        const existing = await this.getSetting(setting.key);
        
        if (existing === null) {
          await this.createSetting(
            setting.key,
            setting.defaultValue,
            setting.type,
            setting.description,
            setting.group,
            setting.public,
            setting.editable
          );
        }
      }

      // Clear cache after initialization
      this.clearCache();

      this.logger.info('Default settings initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing default settings:', error);
      throw error;
    }
  }

  /**
   * Create a new setting
   */
  async createSetting(
    key: string,
    value: any,
    type: ISetting['type'] = 'string',
    description: string = '',
    group: string = 'general',
    isPublic: boolean = false,
    editable: boolean = true
  ): Promise<ISetting> {
    try {
      // Validate key format
      if (!this.isValidKey(key)) {
        throw new Error('Invalid setting key format');
      }

      // Check if setting already exists
      const existing = await this.findOne({ key });
      if (existing) {
        throw new Error(`Setting with key '${key}' already exists`);
      }

      // Validate and sanitize value
      const validatedValue = this.validateValue(value, type);
      
      const settingData: Partial<ISetting> = {
        key: key.toLowerCase().trim(),
        value: validatedValue,
        type,
        description: Sanitizer.sanitizeText(description),
        group: Sanitizer.sanitizeText(group).toLowerCase(),
        public: isPublic,
        editable,
      };

      const setting = await this.create(settingData);

      // Update cache
      this.setCacheValue(key, validatedValue);

      this.logger.debug('Setting created', {
        key,
        type,
        group,
        public: isPublic,
      });

      return setting;
    } catch (error) {
      this.logger.error('Error creating setting:', error);
      throw error;
    }
  }

  /**
   * Get setting value by key
   */
  async getSetting(key: string, defaultValue: any = null): Promise<any> {
    try {
      const normalizedKey = key.toLowerCase().trim();

      // Check cache first
      const cachedValue = this.getCacheValue(normalizedKey);
      if (cachedValue !== undefined) {
        return cachedValue;
      }

      // Fetch from database
      const setting = await this.findOne({ key: normalizedKey });
      
      if (!setting) {
        this.logger.debug('Setting not found', { key: normalizedKey });
        return defaultValue;
      }

      // Cache the value
      this.setCacheValue(normalizedKey, setting.value);

      return setting.value;
    } catch (error) {
      this.logger.error('Error getting setting:', error);
      return defaultValue;
    }
  }

  /**
   * Update setting value
   */
  async updateSetting(key: string, value: any): Promise<ISetting | null> {
    try {
      const normalizedKey = key.toLowerCase().trim();

      const setting = await this.findOne({ key: normalizedKey });
      if (!setting) {
        throw new Error(`Setting '${key}' not found`);
      }

      if (!setting.editable) {
        throw new Error(`Setting '${key}' is not editable`);
      }

      // Validate and sanitize value
      const validatedValue = this.validateValue(value, setting.type);

      const updatedSetting = await this.updateOne(
        { key: normalizedKey },
        { value: validatedValue }
      );

      if (updatedSetting) {
        // Update cache
        this.setCacheValue(normalizedKey, validatedValue);

        this.logger.debug('Setting updated', {
          key: normalizedKey,
          oldValue: setting.value,
          newValue: validatedValue,
        });

        // Emit setting change event
        await this.events.emit('setting:changed', {
          key: normalizedKey,
          oldValue: setting.value,
          newValue: validatedValue,
          type: setting.type,
        });
      }

      return updatedSetting;
    } catch (error) {
      this.logger.error('Error updating setting:', error);
      throw error;
    }
  }

  /**
   * Delete setting
   */
  async deleteSetting(key: string): Promise<boolean> {
    try {
      const normalizedKey = key.toLowerCase().trim();

      const setting = await this.findOne({ key: normalizedKey });
      if (!setting) {
        return false;
      }

      if (!setting.editable) {
        throw new Error(`Setting '${key}' cannot be deleted`);
      }

      const deleted = await this.deleteOne({ key: normalizedKey });

      if (deleted) {
        // Remove from cache
        this.removeCacheValue(normalizedKey);

        this.logger.debug('Setting deleted', { key: normalizedKey });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Error deleting setting:', error);
      throw error;
    }
  }

  /**
   * Get settings by group
   */
  async getSettingsByGroup(
    group: string,
    includePrivate: boolean = false
  ): Promise<Record<string, any>> {
    try {
      const filter: FilterQuery<ISetting> = {
        group: group.toLowerCase().trim(),
      };

      if (!includePrivate) {
        filter.public = true;
      }

      const settings = await this.findMany(filter);

      const result: Record<string, any> = {};
      for (const setting of settings) {
        result[setting.key] = setting.value;
        
        // Cache the value
        this.setCacheValue(setting.key, setting.value);
      }

      return result;
    } catch (error) {
      this.logger.error('Error getting settings by group:', error);
      throw error;
    }
  }

  /**
   * Get all settings grouped
   */
  async getAllSettingsGrouped(includePrivate: boolean = false): Promise<SettingGroup> {
    try {
      const filter: FilterQuery<ISetting> = {};
      if (!includePrivate) {
        filter.public = true;
      }

      const settings = await this.findMany(filter);

      const grouped: SettingGroup = {
        general: {},
        site: {},
        email: {},
        media: {},
        security: {},
        appearance: {},
      };

      for (const setting of settings) {
        const group = setting.group || 'general';
        
        if (!grouped[group]) {
          grouped[group] = {};
        }
        
        grouped[group][setting.key] = setting.value;

        // Cache the value
        this.setCacheValue(setting.key, setting.value);
      }

      return grouped;
    } catch (error) {
      this.logger.error('Error getting all settings grouped:', error);
      throw error;
    }
  }

  /**
   * Get public settings (safe for frontend)
   */
  async getPublicSettings(): Promise<Record<string, any>> {
    try {
      const settings = await this.findMany({ public: true });

      const result: Record<string, any> = {};
      for (const setting of settings) {
        result[setting.key] = setting.value;
        
        // Cache the value
        this.setCacheValue(setting.key, setting.value);
      }

      return result;
    } catch (error) {
      this.logger.error('Error getting public settings:', error);
      throw error;
    }
  }

  /**
   * Bulk update settings
   */
  async bulkUpdateSettings(
    updates: Record<string, any>
  ): Promise<{
    successful: string[];
    failed: Array<{ key: string; error: string }>;
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as Array<{ key: string; error: string }>,
    };

    for (const [key, value] of Object.entries(updates)) {
      try {
        await this.updateSetting(key, value);
        results.successful.push(key);
      } catch (error) {
        results.failed.push({
          key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.info('Bulk settings update completed', {
      successful: results.successful.length,
      failed: results.failed.length,
    });

    return results;
  }

  /**
   * Reset setting to default value
   */
  async resetSetting(key: string): Promise<ISetting | null> {
    try {
      const defaultSettings = this.getDefaultSettings();
      const defaultSetting = defaultSettings.find(s => s.key === key);

      if (!defaultSetting) {
        throw new Error(`No default value found for setting '${key}'`);
      }

      return this.updateSetting(key, defaultSetting.defaultValue);
    } catch (error) {
      this.logger.error('Error resetting setting:', error);
      throw error;
    }
  }

  /**
   * Reset all settings in a group
   */
  async resetGroup(group: string): Promise<void> {
    try {
      const defaultSettings = this.getDefaultSettings().filter(s => s.group === group);

      for (const defaultSetting of defaultSettings) {
        try {
          await this.updateSetting(defaultSetting.key, defaultSetting.defaultValue);
        } catch (error) {
          this.logger.error(`Error resetting setting ${defaultSetting.key}:`, error);
        }
      }

      this.logger.info(`Reset settings group: ${group}`);
    } catch (error) {
      this.logger.error('Error resetting settings group:', error);
      throw error;
    }
  }

  /**
   * Export settings
   */
  async exportSettings(
    includePrivate: boolean = false,
    groups?: string[]
  ): Promise<ISetting[]> {
    try {
      const filter: FilterQuery<ISetting> = {};

      if (!includePrivate) {
        filter.public = true;
      }

      if (groups && groups.length > 0) {
        filter.group = { $in: groups };
      }

      return this.findMany(filter, {
        sort: { group: 1, key: 1 },
      });
    } catch (error) {
      this.logger.error('Error exporting settings:', error);
      throw error;
    }
  }

  /**
   * Import settings
   */
  async importSettings(
    settings: Array<{
      key: string;
      value: any;
      type?: ISetting['type'];
      description?: string;
      group?: string;
    }>
  ): Promise<{
    created: number;
    updated: number;
    errors: Array<{ key: string; error: string }>;
  }> {
    const results = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ key: string; error: string }>,
    };

    for (const settingData of settings) {
      try {
        const existing = await this.findOne({ key: settingData.key });

        if (existing) {
          if (existing.editable) {
            await this.updateSetting(settingData.key, settingData.value);
            results.updated++;
          } else {
            results.errors.push({
              key: settingData.key,
              error: 'Setting is not editable',
            });
          }
        } else {
          await this.createSetting(
            settingData.key,
            settingData.value,
            settingData.type || 'string',
            settingData.description || '',
            settingData.group || 'general'
          );
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          key: settingData.key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.info('Settings import completed', {
      created: results.created,
      updated: results.updated,
      errors: results.errors.length,
    });

    return results;
  }

  /**
   * Clear settings cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.logger.debug('Settings cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    expired: number;
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
      hitRate: 0, // Would need to track hits/misses for this
      expired,
    };
  }

  /**
   * Validate setting value based on type
   */
  private validateValue(value: any, type: ISetting['type']): any {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error('Value must be a string');
        }
        return Sanitizer.sanitizeText(value);

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error('Value must be a number');
        }
        return num;

      case 'boolean':
        if (typeof value === 'boolean') {
          return value;
        }
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower === 'true' || lower === '1') return true;
          if (lower === 'false' || lower === '0') return false;
        }
        throw new Error('Value must be a boolean');

      case 'json':
        if (typeof value === 'object') {
          return value;
        }
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            throw new Error('Value must be valid JSON');
          }
        }
        throw new Error('Value must be valid JSON');

      default:
        return value;
    }
  }

  /**
   * Validate setting key format
   */
  private isValidKey(key: string): boolean {
    // Key should be lowercase, alphanumeric with underscores/dots
    const keyPattern = /^[a-z0-9._]+$/;
    return keyPattern.test(key) && key.length >= 2 && key.length <= 100;
  }

  /**
   * Get value from cache
   */
  private getCacheValue(key: string): any {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && expiry < Date.now()) {
      // Cache expired
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return undefined;
    }

    return this.cache.get(key);
  }

  /**
   * Set value in cache
   */
  private setCacheValue(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * Remove value from cache
   */
  private removeCacheValue(key: string): void {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }

  /**
   * Get default settings definitions
   */
  private getDefaultSettings(): SettingDefinition[] {
    return [
      // General Settings
      {
        key: 'site.title',
        type: 'string',
        defaultValue: 'Modular App',
        description: 'Website title',
        group: 'general',
        public: true,
        editable: true,
      },
      {
        key: 'site.description',
        type: 'string',
        defaultValue: 'A modern CMS built with Next.js',
        description: 'Website description',
        group: 'general',
        public: true,
        editable: true,
      },
      {
        key: 'site.url',
        type: 'string',
        defaultValue: 'http://localhost:3000',
        description: 'Website URL',
        group: 'general',
        public: true,
        editable: true,
      },
      {
        key: 'site.language',
        type: 'string',
        defaultValue: 'en',
        description: 'Default language',
        group: 'general',
        public: true,
        editable: true,
      },
      {
        key: 'site.timezone',
        type: 'string',
        defaultValue: 'UTC',
        description: 'Default timezone',
        group: 'general',
        public: true,
        editable: true,
      },

      // Site Settings
      {
        key: 'posts.per_page',
        type: 'number',
        defaultValue: 10,
        description: 'Number of posts per page',
        group: 'site',
        public: true,
        editable: true,
      },
      {
        key: 'comments.enabled',
        type: 'boolean',
        defaultValue: true,
        description: 'Enable comments',
        group: 'site',
        public: true,
        editable: true,
      },
      {
        key: 'comments.moderation',
        type: 'boolean',
        defaultValue: true,
        description: 'Moderate comments before publishing',
        group: 'site',
        public: false,
        editable: true,
      },
      {
        key: 'registration.enabled',
        type: 'boolean',
        defaultValue: true,
        description: 'Allow user registration',
        group: 'site',
        public: true,
        editable: true,
      },

      // Email Settings
      {
        key: 'email.from_name',
        type: 'string',
        defaultValue: 'Modular App',
        description: 'Email sender name',
        group: 'email',
        public: false,
        editable: true,
      },
      {
        key: 'email.from_address',
        type: 'string',
        defaultValue: 'noreply@modular-app.com',
        description: 'Email sender address',
        group: 'email',
        public: false,
        editable: true,
      },

      // Media Settings
      {
        key: 'media.max_upload_size',
        type: 'number',
        defaultValue: 50 * 1024 * 1024, // 50MB
        description: 'Maximum upload file size in bytes',
        group: 'media',
        public: false,
        editable: true,
      },
      {
        key: 'media.allowed_types',
        type: 'json',
        defaultValue: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'audio/mp3', 'application/pdf'
        ],
        description: 'Allowed file MIME types',
        group: 'media',
        public: false,
        editable: true,
      },

      // Security Settings
      {
        key: 'security.max_login_attempts',
        type: 'number',
        defaultValue: 5,
        description: 'Maximum failed login attempts before lockout',
        group: 'security',
        public: false,
        editable: true,
      },
      {
        key: 'security.lockout_duration',
        type: 'number',
        defaultValue: 30, // minutes
        description: 'Account lockout duration in minutes',
        group: 'security',
        public: false,
        editable: true,
      },
      {
        key: 'security.session_timeout',
        type: 'number',
        defaultValue: 24 * 60, // 24 hours in minutes
        description: 'Session timeout in minutes',
        group: 'security',
        public: false,
        editable: true,
      },

      // Appearance Settings
      {
        key: 'theme.active',
        type: 'string',
        defaultValue: 'default',
        description: 'Active theme name',
        group: 'appearance',
        public: true,
        editable: true,
      },
      {
        key: 'theme.dark_mode',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable dark mode by default',
        group: 'appearance',
        public: true,
        editable: true,
      },
    ];
  }
}