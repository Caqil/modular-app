import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Logger } from '../../utils/logger';
import { Sanitizer } from '../../utils/sanitizer';
import { EventManager } from '../../events/event-manager';
import { EventType } from '../../events/event-types';
import { SettingsRepository } from '../repositories/settings-repository';
import { UserRepository } from '../repositories/user-repository';
import { User, type IUser } from '../models/user';
import { Setting } from '../models/setting';
import { Plugin } from '../models/plugin';
import { Theme } from '../models/theme';
import { UserRole, UserStatus } from '../../types/user';
import { PluginStatus } from '../../types/plugin';

export interface SetupConfig {
  admin: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  };
  site: {
    title: string;
    description?: string;
    url: string;
    language?: string;
    timezone?: string;
  };
  database: {
    skipIndexes?: boolean;
    skipData?: boolean;
  };
  plugins?: {
    autoActivate?: string[];
  };
  theme?: {
    active?: string;
  };
}

export interface SetupResult {
  success: boolean;
  message: string;
  data?: {
    admin: {
      id: string;
      username: string;
      email: string;
    };
    settings: {
      count: number;
      initialized: string[];
    };
    plugins: {
      installed: number;
      activated: number;
    };
    theme: {
      active?: string;
    };
  };
  errors?: string[];
}

export interface SetupProgress {
  step: string;
  progress: number;
  total: number;
  message: string;
  completed: boolean;
}

export type SetupProgressCallback = (progress: SetupProgress) => void;

/**
 * Initial setup manager for first-time CMS installation
 * Handles database initialization, admin user creation, and default content
 */
export class InitialSetup {
  private logger: Logger;
  private events: EventManager;
  private settingsRepo: SettingsRepository;
  private userRepo: UserRepository;
  private progressCallback?: SetupProgressCallback;

  constructor() {
    this.logger = new Logger('InitialSetup');
    this.events = EventManager.getInstance();
    this.settingsRepo = new SettingsRepository();
    this.userRepo = new UserRepository();
  }

  /**
   * Set progress callback for setup monitoring
   */
  setProgressCallback(callback: SetupProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Check if the CMS is already installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      // Check if admin user exists
      const adminExists = await this.userRepo.findOne({ role: UserRole.ADMIN });
      
      // Check if essential settings exist
      const siteTitle = await this.settingsRepo.getSetting('site.title');
      
      return !!(adminExists && siteTitle);
    } catch (error) {
      this.logger.error('Error checking installation status:', error);
      return false;
    }
  }

  /**
   * Run the complete initial setup process
   */
  async run(config: SetupConfig): Promise<SetupResult> {
    const startTime = Date.now();
    let settingsResult = { count: 0, initialized: [] };
    try {
      this.logger.info('Starting initial CMS setup...');
      
      await this.events.emit(EventType.CMS_INITIALIZED, {
        type: 'setup_started',
        timestamp: new Date(),
        config: {
          admin: { username: config.admin.username, email: config.admin.email },
          site: config.site,
        }
      });

      // Validate configuration
      await this.validateConfig(config);
      this.updateProgress('validation', 1, 8, 'Configuration validated');

      // Check if already installed
      if (await this.isInstalled()) {
        throw new Error('CMS is already installed. Please run migration instead.');
      }

      // Initialize database indexes
      if (!config.database.skipIndexes) {
        await this.initializeIndexes();
        this.updateProgress('indexes', 2, 8, 'Database indexes created');
      }

      // Initialize default settings
      if (!config.database.skipData) {
        const settingsResult = await this.initializeSettings(config.site);
        this.updateProgress('settings', 3, 8, `${settingsResult.count} settings initialized`);
      }

      // Create admin user
      const adminUser = await this.createAdminUser(config.admin);
      this.updateProgress('admin', 4, 8, `Admin user '${adminUser.username}' created`);

      // Initialize plugins
      const pluginsResult = await this.initializePlugins(config.plugins);
      this.updateProgress('plugins', 5, 8, `${pluginsResult.activated} plugins activated`);

      // Initialize theme
      const themeResult = await this.initializeTheme(config.theme);
      this.updateProgress('theme', 6, 8, `Theme '${themeResult.active}' activated`);

      // Create sample content (optional)
      await this.createSampleContent();
      this.updateProgress('content', 7, 8, 'Sample content created');

      // Finalize setup
      await this.finalizeSetup();
      this.updateProgress('finalize', 8, 8, 'Setup completed successfully');

      const setupTime = Date.now() - startTime;
      
      const result: SetupResult = {
        success: true,
        message: `CMS setup completed successfully in ${setupTime}ms`,
        data: {
          admin: {
            id: adminUser.id.toString(),
            username: adminUser.username,
            email: adminUser.email,
          },
          settings: settingsResult,
          plugins: pluginsResult,
          theme: themeResult,
        }
      };

      await this.events.emit(EventType.CMS_INITIALIZED, {
        type: 'setup_completed',
        timestamp: new Date(),
        duration: setupTime,
        result
      });

      this.logger.info('Initial CMS setup completed successfully', { 
        duration: setupTime,
        adminUser: adminUser.username 
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown setup error';
      
      this.logger.error('Initial setup failed:', error);
      
      await this.events.emit(EventType.SYSTEM_ERROR, {
        type: 'setup_failed',
        error: errorMessage,
        timestamp: new Date(),
      });

      return {
        success: false,
        message: `Setup failed: ${errorMessage}`,
        errors: [errorMessage]
      };
    }
  }

  /**
   * Validate setup configuration
   */
  private async validateConfig(config: SetupConfig): Promise<void> {
    const errors: string[] = [];

    // Validate admin config
    if (!config.admin.username || config.admin.username.length < 3) {
      errors.push('Admin username must be at least 3 characters');
    }

    if (!config.admin.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.admin.email)) {
      errors.push('Valid admin email is required');
    }

    if (!config.admin.password || config.admin.password.length < 8) {
      errors.push('Admin password must be at least 8 characters');
    }

    // Validate site config
    if (!config.site.title || config.site.title.trim().length === 0) {
      errors.push('Site title is required');
    }

    if (!config.site.url || !/^https?:\/\/.+/.test(config.site.url)) {
      errors.push('Valid site URL is required');
    }

    // Check for existing admin user with same email/username
    const existingUser = await User.findOne({
      $or: [
        { email: config.admin.email },
        { username: config.admin.username }
      ]
    });

    if (existingUser) {
      if (existingUser.email === config.admin.email) {
        errors.push('User with this email already exists');
      }
      if (existingUser.username === config.admin.username) {
        errors.push('User with this username already exists');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Initialize database indexes
   */
  private async initializeIndexes(): Promise<void> {
    try {
      this.logger.info('Creating database indexes...');

      const models = [User, Setting, Plugin, Theme];
      
      for (const model of models) {
        await model.createIndexes();
        this.logger.debug(`Indexes created for ${model.modelName}`);
      }

      this.logger.info('Database indexes created successfully');
    } catch (error) {
      this.logger.error('Error creating database indexes:', error);
      throw new Error('Failed to create database indexes');
    }
  }

  /**
   * Initialize default settings
   */
  private async initializeSettings(siteConfig: SetupConfig['site']): Promise<{ count: number; initialized: string[] }> {
    try {
      this.logger.info('Initializing default settings...');

      // Initialize default settings from repository
      await this.settingsRepo.initializeDefaults();

      // Override with setup configuration
      const settingsToUpdate = [
        { key: 'site.title', value: siteConfig.title },
        { key: 'site.description', value: siteConfig.description || '' },
        { key: 'site.url', value: siteConfig.url },
        { key: 'site.language', value: siteConfig.language || 'en' },
        { key: 'site.timezone', value: siteConfig.timezone || 'UTC' },
        { key: 'cms.installed', value: true },
        { key: 'cms.installed_at', value: new Date() },
        { key: 'cms.version', value: process.env.CMS_VERSION || '1.0.0' },
      ];

      const initialized: string[] = [];
      
      for (const setting of settingsToUpdate) {
        await this.settingsRepo.setSetting(setting.key, setting.value);
        initialized.push(setting.key);
      }

      this.logger.info(`${initialized.length} settings initialized`);

      return {
        count: initialized.length,
        initialized
      };
    } catch (error) {
      this.logger.error('Error initializing settings:', error);
      throw new Error('Failed to initialize default settings');
    }
  }

  /**
   * Create admin user
   */
  private async createAdminUser(adminConfig: SetupConfig['admin']): Promise<IUser> {
    try {
      this.logger.info('Creating admin user...');

      const userData = {
        username: Sanitizer.sanitizeUsername(adminConfig.username),
        email: Sanitizer.sanitizeEmail(adminConfig.email),
        password: adminConfig.password, // Will be hashed in repository
        ...(adminConfig.firstName && { firstName: Sanitizer.sanitizeText(adminConfig.firstName) }),
        ...(adminConfig.lastName && { lastName: Sanitizer.sanitizeText(adminConfig.lastName) }),
        role: UserRole.ADMIN as 'admin',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
        preferences: {
          theme: 'auto' as 'auto',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            comments: true,
            mentions: true,
          },
          privacy: {
            profileVisibility: 'public' as 'public',
            showEmail: false,
            allowMessages: true,
          },
        },
        metadata: {
          source: 'initial_setup',
        },
      };

      const adminUser = await this.userRepo.create(userData);

      await this.events.emit(EventType.USER_REGISTERED, {
        id: adminUser.id.toString(),
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        source: 'initial_setup',
        timestamp: new Date(),
      });

      this.logger.info(`Admin user created: ${adminUser.username} (${adminUser.email})`);

      return adminUser;
    } catch (error) {
      this.logger.error('Error creating admin user:', error);
      throw new Error('Failed to create admin user');
    }
  }

  /**
   * Initialize plugins
   */
  private async initializePlugins(pluginConfig?: SetupConfig['plugins']): Promise<{ installed: number; activated: number }> {
    try {
      this.logger.info('Initializing plugins...');

      let activated = 0;
      const installed = await Plugin.countDocuments();

      // Auto-activate specified plugins
      if (pluginConfig?.autoActivate?.length) {
        for (const pluginName of pluginConfig.autoActivate) {
          try {
            const plugin = await Plugin.findOne({ name: pluginName });
            if (plugin && plugin.status === PluginStatus.INSTALLED) {
              plugin.status = PluginStatus.ACTIVE;
              plugin.activatedAt = new Date();
              await plugin.save();
              activated++;

              await this.events.emit(EventType.PLUGIN_ACTIVATED, {
                id: plugin.id.toString(),
                name: plugin.name,
                version: plugin.version,
                source: 'initial_setup',
                timestamp: new Date(),
              });
            }
          } catch (error) {
            this.logger.warn(`Failed to activate plugin ${pluginName}:`, error);
          }
        }
      }

      this.logger.info(`Plugins initialized: ${installed} installed, ${activated} activated`);

      return { installed, activated };
    } catch (error) {
      this.logger.error('Error initializing plugins:', error);
      throw new Error('Failed to initialize plugins');
    }
  }

  /**
   * Initialize theme
   */
  private async initializeTheme(themeConfig?: SetupConfig['theme']): Promise<{ active: string }> {
    try {
      this.logger.info('Initializing theme...');

      const themeName = themeConfig?.active || 'default';
      
      // Set active theme in settings
      await this.settingsRepo.getSetting('theme.active', themeName);

      // Activate theme if it exists in database
      const theme = await Theme.findOne({ name: themeName });
      if (theme) {
        theme.status = 'active';
        theme.activatedAt = new Date();
        await theme.save();

        await this.events.emit(EventType.THEME_ACTIVATED, {
          id: theme.id.toString(),
          name: theme.name,
          version: theme.version,
          source: 'initial_setup',
          timestamp: new Date(),
        });
      }

      this.logger.info(`Theme initialized: ${themeName}`);

      return { active: themeName };
    } catch (error) {
      this.logger.error('Error initializing theme:', error);
      throw new Error('Failed to initialize theme');
    }
  }

  /**
   * Create sample content (optional)
   */
  private async createSampleContent(): Promise<void> {
    try {
      this.logger.info('Creating sample content...');

      // This could be expanded to create sample posts, pages, etc.
      // For now, we'll just log that this step completed
      
      this.logger.info('Sample content creation completed');
    } catch (error) {
      this.logger.error('Error creating sample content:', error);
      // Don't throw here as this is optional
    }
  }

  /**
   * Finalize setup process
   */
  private async finalizeSetup(): Promise<void> {
    try {
      // Set installation completion flag
      await this.settingsRepo.setSetting('cms.setup_completed', true);
      await this.settingsRepo.setSetting('cms.setup_completed_at', new Date());

      // Clear any setup-related caches
      this.settingsRepo.clearCache();

      this.logger.info('Setup finalization completed');
    } catch (error) {
      this.logger.error('Error finalizing setup:', error);
      throw new Error('Failed to finalize setup');
    }
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(step: string, current: number, total: number, message: string): void {
    const progress: SetupProgress = {
      step,
      progress: current,
      total,
      message,
      completed: current === total
    };

    this.logger.info(`Setup progress: ${step} (${current}/${total}) - ${message}`);

    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Cleanup partial setup on failure
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.warn('Cleaning up partial setup...');

      // Remove any created admin users
      await User.deleteMany({ 
        role: UserRole.ADMIN,
        'metadata.source': 'initial_setup'
      });

      // Remove setup-specific settings
      await Setting.deleteMany({
        key: { $regex: /^cms\.(installed|setup_)/ }
      });

      // Reset plugin activation status
      await Plugin.updateMany(
        { status: PluginStatus.ACTIVE },
        { 
          status: PluginStatus.INSTALLED,
          $unset: { activatedAt: 1 }
        }
      );

      this.logger.info('Setup cleanup completed');
    } catch (error) {
      this.logger.error('Error during setup cleanup:', error);
    }
  }
}

/**
 * Factory function to create and run initial setup
 */
export async function runInitialSetup(
  config: SetupConfig,
  progressCallback?: SetupProgressCallback
): Promise<SetupResult> {
  const setup = new InitialSetup();
  
  if (progressCallback) {
    setup.setProgressCallback(progressCallback);
  }

  return await setup.run(config);
}

/**
 * Check if CMS is already installed
 */
export async function checkInstallationStatus(): Promise<{
  installed: boolean;
  adminExists: boolean;
  settingsExist: boolean;
}> {
  try {
    const adminExists = !!(await User.findOne({ role: UserRole.ADMIN }));
    const settingsExist = !!(await Setting.findOne({ key: 'cms.installed' }));
    
    return {
      installed: adminExists && settingsExist,
      adminExists,
      settingsExist
    };
  } catch (error) {
    console.error('Error checking installation status:', error);
    return {
      installed: false,
      adminExists: false,
      settingsExist: false
    };
  }
}

export default InitialSetup;