import { z } from 'zod';
import { config } from 'dotenv';
import path from 'path';
import { Logger } from '../utils/logger';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Environment validation schema using Zod
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  HOST: z.string().default('localhost'),

  // Database Configuration
  MONGODB_URI: z.string().url().default('mongodb://localhost:27017/modular-app'),
  MONGODB_DB_NAME: z.string().min(1).default('modular-app'),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().min(1).default(10),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().min(0).default(2),

  // Authentication
  JWT_SECRET: z.string().min(32).default('your-super-secret-jwt-key-change-this-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),

  // NextAuth (optional)
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),

  // Google OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // GitHub OAuth (optional)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Facebook OAuth (optional)
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),

  // Redis/Caching (optional)
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().min(0).max(15).default(0),
  CACHE_ADAPTER: z.enum(['memory', 'redis', 'file']).default('memory'),

  // File Uploads
  UPLOAD_DIR: z.string().default('./public/uploads'),
  MAX_FILE_SIZE: z.coerce.number().min(1).default(52428800), // 50MB
  ALLOWED_FILE_TYPES: z.string().default('jpg,jpeg,png,gif,webp,svg,pdf,mp4,mp3,doc,docx'),

  // Email Configuration (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().min(1).max(65535).optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // SendGrid (optional)
  SENDGRID_API_KEY: z.string().optional(),

  // AWS SES (optional)
  AWS_SES_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Mailgun (optional)
  MAILGUN_DOMAIN: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),

  // Postmark (optional)
  POSTMARK_SERVER_TOKEN: z.string().optional(),

  // File Storage (optional)
  STORAGE_ADAPTER: z.enum(['local', 's3', 'cloudinary', 'azure']).default('local'),
  
  // S3 Storage (optional)
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),

  // Cloudinary (optional)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Azure Storage (optional)
  AZURE_STORAGE_ACCOUNT: z.string().optional(),
  AZURE_STORAGE_KEY: z.string().optional(),
  AZURE_CONTAINER_NAME: z.string().optional(),

  // Security
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().min(1000).default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().min(1).default(100),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().min(1).default(5),
  LOCKOUT_DURATION: z.coerce.number().min(1).default(30), // minutes

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  LOG_TO_FILE: z.coerce.boolean().default(true),
  LOG_DIR: z.string().default('./logs'),
  LOG_MAX_FILES: z.coerce.number().min(1).default(5),
  LOG_MAX_SIZE: z.string().default('20m'),

  // Debug
  DEBUG: z.coerce.boolean().default(false),
  VERBOSE: z.coerce.boolean().default(false),

  // Plugin System
  PLUGINS_ENABLED: z.coerce.boolean().default(true),
  PLUGINS_DIR: z.string().default('./packages/plugins'),
  PLUGINS_AUTO_LOAD: z.coerce.boolean().default(true),
  PLUGINS_ALLOW_REMOTE_INSTALL: z.coerce.boolean().default(false),

  // Theme System
  THEMES_ENABLED: z.coerce.boolean().default(true),
  THEMES_DIR: z.string().default('./themes'),
  THEMES_AUTO_LOAD: z.coerce.boolean().default(true),
  DEFAULT_THEME: z.string().default('default'),

  // Performance
  ENABLE_COMPRESSION: z.coerce.boolean().default(true),
  ENABLE_CACHING: z.coerce.boolean().default(true),
  CACHE_TTL: z.coerce.number().min(1).default(300), // 5 minutes
  MINIFY_HTML: z.coerce.boolean().default(false),
  MINIFY_CSS: z.coerce.boolean().default(true),
  MINIFY_JS: z.coerce.boolean().default(true),

  // API
  API_ENABLED: z.coerce.boolean().default(true),
  API_PREFIX: z.string().default('/api'),
  API_VERSION: z.string().default('v1'),
  API_RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
  API_RATE_LIMIT_MAX: z.coerce.number().min(1).default(1000),
  API_DOCS_ENABLED: z.coerce.boolean().default(true),

  // Site Settings
  SITE_TITLE: z.string().default('Modular App'),
  SITE_DESCRIPTION: z.string().default('A modern CMS built with Next.js and TypeScript'),
  SITE_URL: z.string().url().default('http://localhost:3000'),
  SITE_LANGUAGE: z.string().default('en'),
  SITE_TIMEZONE: z.string().default('UTC'),

  // Maintenance
  MAINTENANCE_MODE: z.coerce.boolean().default(false),
  MAINTENANCE_MESSAGE: z.string().default('Site is under maintenance. Please check back later.'),
  MAINTENANCE_ALLOWED_IPS: z.string().default(''),

  // External Services (optional)
  SENTRY_DSN: z.string().url().optional(),
  GOOGLE_ANALYTICS_ID: z.string().optional(),
  RECAPTCHA_SITE_KEY: z.string().optional(),
  RECAPTCHA_SECRET_KEY: z.string().optional(),

  // Webhooks (optional)
  WEBHOOK_SECRET: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),

  // Development/Testing
  TEST_DATABASE_URI: z.string().url().optional(),
  SKIP_EMAIL_VERIFICATION: z.coerce.boolean().default(false),
  MOCK_EXTERNAL_SERVICES: z.coerce.boolean().default(false),
});

/**
 * Parsed and validated environment variables
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Environment configuration manager
 */
export class EnvConfigManager {
  private static instance: EnvConfigManager;
  private logger: Logger;
  private config!: EnvConfig;
  private isValidated = false;

  private constructor() {
    this.logger = new Logger('EnvConfigManager');
  }

  public static getInstance(): EnvConfigManager {
    if (!EnvConfigManager.instance) {
      EnvConfigManager.instance = new EnvConfigManager();
    }
    return EnvConfigManager.instance;
  }

  /**
   * Initialize and validate environment configuration
   */
  public initialize(): EnvConfig {
    if (this.isValidated) {
      return this.config;
    }

    try {
      this.logger.info('Validating environment configuration...');

      // Parse and validate environment variables
      const result = envSchema.safeParse(process.env);

      if (!result.success) {
        const errors = result.error.issues.map(issue => {
          return `${issue.path.join('.')}: ${issue.message}`;
        });

        this.logger.error('Environment validation failed:', {
          errors,
          provided: Object.keys(process.env).filter(key => key.startsWith('NODE_') || 
            key.startsWith('MONGODB_') || 
            key.startsWith('JWT_') ||
            key.startsWith('REDIS_') ||
            key.startsWith('SMTP_')).sort()
        });

        throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
      }

      this.config = result.data;
      this.isValidated = true;

      // Log successful validation (without sensitive data)
      this.logger.info('Environment configuration validated successfully', {
        nodeEnv: this.config.NODE_ENV,
        port: this.config.PORT,
        host: this.config.HOST,
        database: this.config.MONGODB_DB_NAME,
        cacheAdapter: this.config.CACHE_ADAPTER,
        storageAdapter: this.config.STORAGE_ADAPTER,
        pluginsEnabled: this.config.PLUGINS_ENABLED,
        themesEnabled: this.config.THEMES_ENABLED,
        apiEnabled: this.config.API_ENABLED,
      });

      // Validate environment-specific requirements
      this.validateEnvironmentRequirements();

      return this.config;

    } catch (error) {
      this.logger.error('Failed to initialize environment configuration:', error);
      throw error;
    }
  }

  /**
   * Get environment configuration
   */
  public getConfig(): EnvConfig {
    if (!this.isValidated) {
      return this.initialize();
    }
    return this.config;
  }

  /**
   * Get specific configuration value
   */
  public get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    const config = this.getConfig();
    return config[key];
  }

  /**
   * Check if environment is development
   */
  public isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  /**
   * Check if environment is production
   */
  public isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  /**
   * Check if environment is test
   */
  public isTest(): boolean {
    return this.get('NODE_ENV') === 'test';
  }

  /**
   * Check if environment is staging
   */
  public isStaging(): boolean {
    return this.get('NODE_ENV') === 'staging';
  }

  /**
   * Get database configuration
   */
  public getDatabaseConfig(): {
    uri: string;
    name: string;
    options: {
      maxPoolSize: number;
      minPoolSize: number;
    };
  } {
    const config = this.getConfig();
    return {
      uri: config.MONGODB_URI,
      name: config.MONGODB_DB_NAME,
      options: {
        maxPoolSize: config.MONGODB_MAX_POOL_SIZE,
        minPoolSize: config.MONGODB_MIN_POOL_SIZE,
      },
    };
  }

  /**
   * Get JWT configuration
   */
  public getJWTConfig(): {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  } {
    const config = this.getConfig();
    return {
      secret: config.JWT_SECRET,
      expiresIn: config.JWT_EXPIRES_IN,
      refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
    };
  }

  /**
   * Get cache configuration
   */
  public getCacheConfig(): {
    adapter: 'memory' | 'redis' | 'file';
    redis?: {
      url: string;
      password?: string;
      db: number;
    };
  } {
    const config = this.getConfig();
    const cacheConfig: any = {
      adapter: config.CACHE_ADAPTER,
    };

    if (config.CACHE_ADAPTER === 'redis' && config.REDIS_URL) {
      cacheConfig.redis = {
        url: config.REDIS_URL,
        password: config.REDIS_PASSWORD,
        db: config.REDIS_DB,
      };
    }

    return cacheConfig;
  }

  /**
   * Get email configuration
   */
  public getEmailConfig(): {
    enabled: boolean;
    adapter: 'smtp' | 'sendgrid' | 'ses' | 'mailgun' | 'postmark';
    smtp?: {
      host: string;
      port: number;
      secure: boolean;
      auth?: {
        user: string;
        pass: string;
      };
    };
    sendgrid?: {
      apiKey: string;
    };
    mailgun?: {
      domain: string;
      apiKey: string;
    };
    postmark?: {
      serverToken: string;
    };
  } {
    const config = this.getConfig();
    
    const emailConfig: any = {
      enabled: false,
      adapter: 'smtp',
    };

    // SMTP Configuration
    if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
      emailConfig.enabled = true;
      emailConfig.adapter = 'smtp';
      emailConfig.smtp = {
        host: config.SMTP_HOST,
        port: config.SMTP_PORT || 587,
        secure: config.SMTP_SECURE,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      };
    }

    // SendGrid Configuration
    if (config.SENDGRID_API_KEY) {
      emailConfig.enabled = true;
      emailConfig.adapter = 'sendgrid';
      emailConfig.sendgrid = {
        apiKey: config.SENDGRID_API_KEY,
      };
    }

    // Mailgun Configuration
    if (config.MAILGUN_DOMAIN && config.MAILGUN_API_KEY) {
      emailConfig.enabled = true;
      emailConfig.adapter = 'mailgun';
      emailConfig.mailgun = {
        domain: config.MAILGUN_DOMAIN,
        apiKey: config.MAILGUN_API_KEY,
      };
    }

    // Postmark Configuration
    if (config.POSTMARK_SERVER_TOKEN) {
      emailConfig.enabled = true;
      emailConfig.adapter = 'postmark';
      emailConfig.postmark = {
        serverToken: config.POSTMARK_SERVER_TOKEN,
      };
    }

    return emailConfig;
  }

  /**
   * Get storage configuration
   */
  public getStorageConfig(): {
    adapter: 'local' | 's3' | 'cloudinary' | 'azure';
    local?: {
      directory: string;
    };
    s3?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      endpoint?: string;
    };
    cloudinary?: {
      cloudName: string;
      apiKey: string;
      apiSecret: string;
    };
    azure?: {
      storageAccount: string;
      storageKey: string;
      containerName: string;
    };
  } {
    const config = this.getConfig();
    
    const storageConfig: any = {
      adapter: config.STORAGE_ADAPTER,
    };

    switch (config.STORAGE_ADAPTER) {
      case 'local':
        storageConfig.local = {
          directory: config.UPLOAD_DIR,
        };
        break;

      case 's3':
        if (config.S3_BUCKET && config.S3_REGION && config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY) {
          storageConfig.s3 = {
            bucket: config.S3_BUCKET,
            region: config.S3_REGION,
            accessKeyId: config.S3_ACCESS_KEY_ID,
            secretAccessKey: config.S3_SECRET_ACCESS_KEY,
            endpoint: config.S3_ENDPOINT,
          };
        }
        break;

      case 'cloudinary':
        if (config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
          storageConfig.cloudinary = {
            cloudName: config.CLOUDINARY_CLOUD_NAME,
            apiKey: config.CLOUDINARY_API_KEY,
            apiSecret: config.CLOUDINARY_API_SECRET,
          };
        }
        break;

      case 'azure':
        if (config.AZURE_STORAGE_ACCOUNT && config.AZURE_STORAGE_KEY && config.AZURE_CONTAINER_NAME) {
          storageConfig.azure = {
            storageAccount: config.AZURE_STORAGE_ACCOUNT,
            storageKey: config.AZURE_STORAGE_KEY,
            containerName: config.AZURE_CONTAINER_NAME,
          };
        }
        break;
    }

    return storageConfig;
  }

  /**
   * Get CORS origins as array
   */
  public getCorsOrigins(): string[] {
    const origins = this.get('CORS_ORIGINS');
    return origins.split(',').map(origin => origin.trim()).filter(Boolean);
  }

  /**
   * Get allowed file types as array
   */
  public getAllowedFileTypes(): string[] {
    const types = this.get('ALLOWED_FILE_TYPES');
    return types.split(',').map(type => type.trim().toLowerCase()).filter(Boolean);
  }

  /**
   * Get maintenance allowed IPs as array
   */
  public getMaintenanceAllowedIPs(): string[] {
    const ips = this.get('MAINTENANCE_ALLOWED_IPS');
    if (!ips) return [];
    return ips.split(',').map(ip => ip.trim()).filter(Boolean);
  }

  /**
   * Check if a feature is enabled
   */
  public isFeatureEnabled(feature: 'plugins' | 'themes' | 'api' | 'caching' | 'compression'): boolean {
    const config = this.getConfig();
    
    switch (feature) {
      case 'plugins':
        return config.PLUGINS_ENABLED;
      case 'themes':
        return config.THEMES_ENABLED;
      case 'api':
        return config.API_ENABLED;
      case 'caching':
        return config.ENABLE_CACHING;
      case 'compression':
        return config.ENABLE_COMPRESSION;
      default:
        return false;
    }
  }

  /**
   * Validate environment-specific requirements
   */
  private validateEnvironmentRequirements(): void {
    const config = this.config;

    // Production-specific validations
    if (config.NODE_ENV === 'production') {
      const productionErrors: string[] = [];

      // JWT Secret should be changed from default
      if (config.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
        productionErrors.push('JWT_SECRET must be changed from default value in production');
      }

      // NextAuth Secret should be set
      if (!config.NEXTAUTH_SECRET) {
        productionErrors.push('NEXTAUTH_SECRET is required in production');
      }

      // Database should not be localhost in production
      if (config.MONGODB_URI.includes('localhost') || config.MONGODB_URI.includes('127.0.0.1')) {
        this.logger.warn('Using localhost database in production - consider using a managed database service');
      }

      // Redis should be configured for production caching
      if (config.CACHE_ADAPTER === 'redis' && !config.REDIS_URL) {
        productionErrors.push('REDIS_URL is required when using Redis cache adapter in production');
      }

      if (productionErrors.length > 0) {
        throw new Error(`Production environment validation failed:\n${productionErrors.join('\n')}`);
      }
    }

    // Development-specific warnings
    if (config.NODE_ENV === 'development') {
      if (config.LOG_LEVEL === 'silly' || config.LOG_LEVEL === 'debug') {
        this.logger.warn('Verbose logging enabled - this may impact performance');
      }
    }

    // General validations
    if (config.BCRYPT_ROUNDS < 10) {
      this.logger.warn('BCRYPT_ROUNDS is set lower than recommended (10+)');
    }

    if (config.MAX_FILE_SIZE > 100 * 1024 * 1024) { // 100MB
      this.logger.warn('MAX_FILE_SIZE is set very high - consider implementing chunked uploads for large files');
    }
  }

  /**
   * Get sanitized config for logging (removes sensitive data)
   */
  public getSanitizedConfig(): Partial<EnvConfig> {
    const config = this.getConfig();
    const sanitized = { ...config };

    // Remove sensitive fields
    const sensitiveFields = [
      'JWT_SECRET',
      'NEXTAUTH_SECRET',
      'MONGODB_URI',
      'REDIS_URL',
      'SMTP_PASS',
      'SENDGRID_API_KEY',
      'AWS_SECRET_ACCESS_KEY',
      'MAILGUN_API_KEY',
      'POSTMARK_SERVER_TOKEN',
      'S3_SECRET_ACCESS_KEY',
      'CLOUDINARY_API_SECRET',
      'AZURE_STORAGE_KEY',
      'SENTRY_DSN',
      'RECAPTCHA_SECRET_KEY',
      'WEBHOOK_SECRET',
    ] as (keyof EnvConfig)[];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        (sanitized as any)[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

/**
 * Default environment configuration instance
 */
export const envConfig = EnvConfigManager.getInstance();

/**
 * Initialize and get environment configuration
 */
export function getEnvConfig(): EnvConfig {
  return envConfig.getConfig();
}

/**
 * Check if running in development
 */
export function isDev(): boolean {
  return envConfig.isDevelopment();
}

/**
 * Check if running in production
 */
export function isProd(): boolean {
  return envConfig.isProduction();
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return envConfig.isTest();
}

export default envConfig;