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
  label: string;
  description?: string;
  group: string;
  section?: string;
  public: boolean;
  required?: boolean;
  editable: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean | string;
  };
  choices?: Record<string, string>;
  conditional?: {
    dependsOn: string;
    value: any;
    operator?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
  };
  encrypted?: boolean;
  sensitive?: boolean;
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
 * Set setting value (create if not exists, update if exists)
 * This is an upsert operation that handles both creation and updates
 */
async setSetting(
  key: string,
  value: any,
  options?: {
    type?: ISetting['type'];
    description?: string;
    group?: string;
    public?: boolean;
    editable?: boolean;
    force?: boolean; // Allow updating non-editable settings
  }
): Promise<ISetting> {
  try {
    const normalizedKey = key.toLowerCase().trim();

    // Validate key format
    if (!this.isValidKey(normalizedKey)) {
      throw new Error('Invalid setting key format');
    }

    // Check if setting already exists
    const existingSetting = await this.findOne({ key: normalizedKey });

    if (existingSetting) {
      // Setting exists - update it
      
      // Check if setting is editable (unless force is true)
      if (!existingSetting.editable && !options?.force) {
        throw new Error(`Setting '${key}' is not editable. Use force option to override.`);
      }

      // Validate and sanitize value based on existing type
      const settingType = options?.type || existingSetting.type;
      const validatedValue = this.validateValue(value, settingType);

      // Update the setting
      const updatedSetting = await this.updateOne(
        { key: normalizedKey },
        { 
          value: validatedValue,
          ...(options?.type && { type: options.type }),
          ...(options?.description && { description: Sanitizer.sanitizeText(options.description) }),
          ...(options?.group && { group: Sanitizer.sanitizeText(options.group).toLowerCase() }),
          ...(options?.public !== undefined && { public: options.public }),
          ...(options?.editable !== undefined && { editable: options.editable }),
        }
      );

      if (!updatedSetting) {
        throw new Error(`Failed to update setting '${key}'`);
      }

      // Update cache
      this.setCacheValue(normalizedKey, validatedValue);

      this.logger.debug('Setting updated via setSetting', {
        key: normalizedKey,
        oldValue: existingSetting.value,
        newValue: validatedValue,
        type: settingType,
      });

      // Emit setting change event
      if (this.events) {
        await this.events.emit('setting:changed', {
          key: normalizedKey,
          oldValue: existingSetting.value,
          newValue: validatedValue,
          type: settingType,
          action: 'updated',
          timestamp: new Date(),
        });
      }

      return updatedSetting;

    } else {
      // Setting doesn't exist - create it
      
      const settingType = options?.type || 'string';
      const description = options?.description || `Setting: ${key}`;
      const group = options?.group || 'general';
      const isPublic = options?.public || false;
      const editable = options?.editable !== undefined ? options.editable : true;

      // Validate and sanitize value
      const validatedValue = this.validateValue(value, settingType);
      
      const settingData: Partial<ISetting> = {
        key: normalizedKey,
        value: validatedValue,
        type: settingType,
        description: Sanitizer.sanitizeText(description),
        group: Sanitizer.sanitizeText(group).toLowerCase(),
        public: isPublic,
        editable,
      };

      const newSetting = await this.create(settingData);

      // Update cache
      this.setCacheValue(normalizedKey, validatedValue);

      this.logger.debug('Setting created via setSetting', {
        key: normalizedKey,
        value: validatedValue,
        type: settingType,
        group,
        public: isPublic,
      });

      // Emit setting creation event
      if (this.events) {
        await this.events.emit('setting:created', {
          key: normalizedKey,
          value: validatedValue,
          type: settingType,
          group,
          public: isPublic,
          action: 'created',
          timestamp: new Date(),
        });
      }

      return newSetting;
    }

  } catch (error) {
    this.logger.error('Error in setSetting:', error);
    throw error;
  }
}

/**
 * Set multiple settings at once
 * Convenience method for bulk upsert operations
 */
async setSettings(
  settings: Record<string, any> | Array<{
    key: string;
    value: any;
    type?: ISetting['type'];
    description?: string;
    group?: string;
    public?: boolean;
    editable?: boolean;
  }>,
  options?: {
    force?: boolean;
    continueOnError?: boolean;
  }
): Promise<{
  successful: Array<{ key: string; action: 'created' | 'updated'; setting: ISetting }>;
  failed: Array<{ key: string; error: string }>;
}> {
  const results = {
    successful: [] as Array<{ key: string; action: 'created' | 'updated'; setting: ISetting }>,
    failed: [] as Array<{ key: string; error: string }>,
  };

  let settingsArray: Array<{
    key: string;
    value: any;
    type?: ISetting['type'];
    description?: string;
    group?: string;
    public?: boolean;
    editable?: boolean;
  }>;

  // Convert Record to Array format if needed
  if (Array.isArray(settings)) {
    settingsArray = settings;
  } else {
    settingsArray = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
    }));
  }

  for (const settingData of settingsArray) {
    try {
      // Check if setting exists to determine action
      const existingSetting = await this.findOne({ key: settingData.key.toLowerCase().trim() });
      const action = existingSetting ? 'updated' : 'created';

      const settingOptions = {
        ...(settingData.type && { type: settingData.type }),
        ...(settingData.description && { description: settingData.description }),
        ...(settingData.group && { group: settingData.group }),
        ...(settingData.public !== undefined && { public: settingData.public }),
        ...(settingData.editable !== undefined && { editable: settingData.editable }),
        ...(options?.force !== undefined && { force: options.force }),
      };

      const setting = await this.setSetting(settingData.key, settingData.value, settingOptions);

      results.successful.push({
        key: settingData.key,
        action,
        setting,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      results.failed.push({
        key: settingData.key,
        error: errorMessage,
      });

      this.logger.error(`Failed to set setting '${settingData.key}':`, error);

      // Stop on first error unless continueOnError is true
      if (!options?.continueOnError) {
        break;
      }
    }
  }

  this.logger.info('Bulk setSetting completed', {
    total: settingsArray.length,
    successful: results.successful.length,
    failed: results.failed.length,
  });

  return results;
}

/**
 * Set setting with type inference from value
 * Convenience method that automatically determines the type
 */
async setSettingAuto(
  key: string,
  value: any,
  options?: {
    description?: string;
    group?: string;
    public?: boolean;
    editable?: boolean;
    force?: boolean;
  }
): Promise<ISetting> {
  // Infer type from value
  let inferredType: ISetting['type'] = 'string';

  if (typeof value === 'number') {
    inferredType = 'number';
  } else if (typeof value === 'boolean') {
    inferredType = 'boolean';
  } else if (typeof value === 'object' && value !== null) {
    inferredType = 'json';
  } else if (typeof value === 'string') {
    // Try to parse as JSON first
    try {
      JSON.parse(value);
      inferredType = 'json';
    } catch {
      inferredType = 'string';
    }
  }

  return this.setSetting(key, value, {
    ...options,
    type: inferredType,
  });
}

/**
 * Helper method to check if a setting can be modified
 */
async canModifySetting(key: string, force: boolean = false): Promise<{
  canModify: boolean;
  reason?: string;
  setting?: ISetting;
}> {
  try {
    const normalizedKey = key.toLowerCase().trim();
    const setting = await this.findOne({ key: normalizedKey });

    if (!setting) {
      return { canModify: true }; // Can create new setting
    }

    if (!setting.editable && !force) {
      return {
        canModify: false,
        reason: 'Setting is not editable',
        setting,
      };
    }

    return {
      canModify: true,
      setting,
    };

  } catch (error) {
    return {
      canModify: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
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
      label: 'Site Title',
      description: 'Website title',
      group: 'general',
      public: true,
      editable: true,
    },
    {
      key: 'site.description',
      type: 'string',
      defaultValue: 'A modern CMS built with Next.js',
      label: 'Site Description',
      description: 'Website description',
      group: 'general',
      public: true,
      editable: true,
    },
    {
      key: 'site.url',
      type: 'string',
      defaultValue: 'http://localhost:3000',
      label: 'Site URL',
      description: 'Website URL',
      group: 'general',
      public: true,
      editable: true,
    },
    {
      key: 'site.language',
      type: 'string',
      defaultValue: 'en',
      label: 'Default Language',
      description: 'Default language',
      group: 'general',
      public: true,
      editable: true,
    },
    {
      key: 'site.timezone',
      type: 'string',
      defaultValue: 'UTC',
      label: 'Timezone',
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
      label: 'Posts Per Page',
      description: 'Number of posts per page',
      group: 'site',
      public: true,
      editable: true,
    },
    {
      key: 'comments.enabled',
      type: 'boolean',
      defaultValue: true,
      label: 'Enable Comments',
      description: 'Enable comments',
      group: 'site',
      public: true,
      editable: true,
    },
    {
      key: 'comments.moderation',
      type: 'boolean',
      defaultValue: true,
      label: 'Comment Moderation',
      description: 'Moderate comments before publishing',
      group: 'site',
      public: false,
      editable: true,
    },
    {
      key: 'registration.enabled',
      type: 'boolean',
      defaultValue: true,
      label: 'User Registration',
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
      label: 'Email From Name',
      description: 'Email sender name',
      group: 'email',
      public: false,
      editable: true,
    },
    {
      key: 'email.from_address',
      type: 'string',
      defaultValue: 'noreply@modular-app.com',
      label: 'Email From Address',
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
      label: 'Max Upload Size',
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
      label: 'Allowed File Types',
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
      label: 'Max Login Attempts',
      description: 'Maximum failed login attempts before lockout',
      group: 'security',
      public: false,
      editable: true,
    },
    {
      key: 'security.lockout_duration',
      type: 'number',
      defaultValue: 30, // minutes
      label: 'Lockout Duration',
      description: 'Account lockout duration in minutes',
      group: 'security',
      public: false,
      editable: true,
    },
    {
      key: 'security.session_timeout',
      type: 'number',
      defaultValue: 24 * 60, // 24 hours in minutes
      label: 'Session Timeout',
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
      label: 'Active Theme',
      description: 'Active theme name',
      group: 'appearance',
      public: true,
      editable: true,
    },
    {
      key: 'theme.dark_mode',
      type: 'boolean',
      defaultValue: false,
      label: 'Dark Mode',
      description: 'Enable dark mode by default',
      group: 'appearance',
      public: true,
      editable: true,
    },
  ];
}
}