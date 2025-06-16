/**
 * Default configuration values for the Modular App CMS
 * These values are used as fallbacks when environment variables or database settings are not available
 */

export interface DatabaseConfig {
  uri: string;
  name: string;
  options: {
    maxPoolSize: number;
    minPoolSize: number;
    maxIdleTimeMS: number;
    serverSelectionTimeoutMS: number;
    connectTimeoutMS: number;
    retryWrites: boolean;
    retryReads: boolean;
  };
}

export interface AuthConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: string;
  };
  bcrypt: {
    rounds: number;
  };
  session: {
    timeout: number; // in minutes
    maxConcurrent: number;
  };
  oauth: {
    google: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
    };
    github: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
    };
    facebook: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
    };
  };
  twoFactor: {
    enabled: boolean;
    issuer: string;
    algorithm: string;
    digits: number;
    period: number;
  };
}

export interface CacheConfig {
  enabled: boolean;
  adapter: 'memory' | 'redis' | 'file';
  redis?: {
    url: string;
    password?: string;
    db: number;
    keyPrefix: string;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
  };
  memory: {
    maxSize: number; // in MB
    ttl: number; // in seconds
  };
  file: {
    directory: string;
    maxSize: number; // in MB
    ttl: number; // in seconds
  };
}

export interface MediaConfig {
  uploads: {
    directory: string;
    maxFileSize: number; // in bytes
    allowedTypes: string[];
    allowedMimeTypes: string[];
    imageOptimization: {
      enabled: boolean;
      quality: number;
      formats: string[];
      sizes: number[];
    };
  };
  storage: {
    adapter: 'local' | 's3' | 'cloudinary' | 'azure';
    local: {
      publicPath: string;
      privatePath: string;
    };
    s3?: {
      bucket: string;
      region: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      endpoint?: string;
    };
    cloudinary?: {
      cloudName?: string;
      apiKey?: string;
      apiSecret?: string;
    };
    azure?: {
      storageAccount?: string;
      storageKey?: string;
      containerName?: string;
    };
  };
}

export interface EmailConfig {
  enabled: boolean;
  adapter: 'smtp' | 'sendgrid' | 'ses' | 'mailgun' | 'postmark';
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user?: string;
      pass?: string;
    };
    tls?: {
      rejectUnauthorized: boolean;
    };
  };
  sendgrid?: {
    apiKey?: string;
  };
  ses?: {
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  mailgun?: {
    domain?: string;
    apiKey?: string;
    host?: string;
  };
  postmark?: {
    serverToken?: string;
  };
  from: {
    name: string;
    email: string;
  };
  templates: {
    directory: string;
    defaultLanguage: string;
  };
}

export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keyLength: number;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
  cors: {
    enabled: boolean;
    origin: string | string[] | boolean;
    credentials: boolean;
    optionsSuccessStatus: number;
    methods: string[];
    allowedHeaders: string[];
  };
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean;
    xssFilter: boolean;
  };
  bruteForce: {
    enabled: boolean;
    maxAttempts: number;
    lockoutDuration: number; // in minutes
    whitelistedIPs: string[];
  };
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    preventReuse: number; // number of previous passwords to prevent reuse
  };
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
  console: {
    enabled: boolean;
    colorize: boolean;
    timestamp: boolean;
  };
  file: {
    enabled: boolean;
    directory: string;
    filename: string;
    maxFiles: number;
    maxSize: string;
    datePattern: string;
  };
  database: {
    enabled: boolean;
    collection: string;
    maxSize: number; // max documents
    ttl: number; // in days
  };
  external: {
    enabled: boolean;
    service?: 'sentry' | 'winston-cloudwatch' | 'datadog';
    config?: Record<string, any>;
  };
}

export interface PluginConfig {
  enabled: boolean;
  directory: string;
  autoLoad: boolean;
  enabledByDefault: boolean;
  maxConcurrentOperations: number;
  operationTimeout: number; // in ms
  allowRemoteInstall: boolean;
  trustedSources: string[];
  sandboxing: {
    enabled: boolean;
    allowFileAccess: boolean;
    allowNetworkAccess: boolean;
    allowDatabaseAccess: boolean;
  };
}

export interface ThemeConfig {
  enabled: boolean;
  directory: string;
  autoLoad: boolean;
  default: string;
  allowCustomCSS: boolean;
  allowCustomJS: boolean;
  customization: {
    colors: {
      enabled: boolean;
      presets: Record<string, string[]>;
    };
    typography: {
      enabled: boolean;
      fonts: string[];
      sizes: number[];
    };
    layout: {
      enabled: boolean;
      maxWidth: number;
      sidebars: string[];
    };
  };
}

export interface PerformanceConfig {
  caching: {
    pages: {
      enabled: boolean;
      ttl: number; // in seconds
      excludePaths: string[];
    };
    api: {
      enabled: boolean;
      ttl: number; // in seconds
      excludeEndpoints: string[];
    };
    assets: {
      enabled: boolean;
      ttl: number; // in seconds
      compression: boolean;
    };
  };
  compression: {
    enabled: boolean;
    level: number;
    threshold: number; // in bytes
  };
  optimization: {
    minifyHTML: boolean;
    minifyCSS: boolean;
    minifyJS: boolean;
    removeComments: boolean;
    lazyLoading: boolean;
  };
}

export interface APIConfig {
  enabled: boolean;
  version: string;
  prefix: string;
  documentation: {
    enabled: boolean;
    path: string;
    title: string;
    description: string;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    keyGenerator?: string;
  };
  authentication: {
    required: boolean;
    methods: ('jwt' | 'apikey' | 'oauth')[];
  };
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
  };
  versioning: {
    enabled: boolean;
    strategy: 'header' | 'query' | 'uri';
    header?: string;
    query?: string;
  };
}

export interface SiteConfig {
  general: {
    title: string;
    description: string;
    url: string;
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    charset: string;
  };
  seo: {
    enabled: boolean;
    metaDescription: string;
    keywords: string[];
    ogImage?: string;
    twitterCard: 'summary' | 'summary_large_image' | 'app' | 'player';
    robots: {
      index: boolean;
      follow: boolean;
      archive: boolean;
      snippet: boolean;
      imageindex: boolean;
    };
    sitemap: {
      enabled: boolean;
      frequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
      priority: number;
    };
  };
  content: {
    pagination: {
      postsPerPage: number;
      maxPages: number;
    };
    comments: {
      enabled: boolean;
      moderation: boolean;
      allowAnonymous: boolean;
      maxDepth: number;
    };
    revisions: {
      enabled: boolean;
      maxRevisions: number;
      autoSave: boolean;
      autoSaveInterval: number; // in seconds
    };
  };
  maintenance: {
    enabled: boolean;
    message: string;
    allowedIPs: string[];
    bypassKey?: string;
  };
}

/**
 * Complete default configuration
 */
export interface DefaultConfig {
  database: DatabaseConfig;
  auth: AuthConfig;
  cache: CacheConfig;
  media: MediaConfig;
  email: EmailConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
  plugins: PluginConfig;
  themes: ThemeConfig;
  performance: PerformanceConfig;
  api: APIConfig;
  site: SiteConfig;
}

/**
 * Default configuration values
 */
export const defaultConfig: DefaultConfig = {
  database: {
    uri: 'mongodb://localhost:27017/modular-app',
    name: 'modular-app',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },

  auth: {
    jwt: {
      secret: 'your-super-secret-jwt-key-change-this-in-production',
      expiresIn: '7d',
      refreshExpiresIn: '30d',
      algorithm: 'HS256',
    },
    bcrypt: {
      rounds: 12,
    },
    session: {
      timeout: 1440, // 24 hours
      maxConcurrent: 5,
    },
    oauth: {
      google: {
        enabled: false,
      },
      github: {
        enabled: false,
      },
      facebook: {
        enabled: false,
      },
    },
    twoFactor: {
      enabled: false,
      issuer: 'Modular App',
      algorithm: 'sha1',
      digits: 6,
      period: 30,
    },
  },

  cache: {
    enabled: true,
    adapter: 'memory',
    redis: {
      url: 'redis://localhost:6379',
      db: 0,
      keyPrefix: 'modular-app:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    },
    memory: {
      maxSize: 100, // 100MB
      ttl: 300, // 5 minutes
    },
    file: {
      directory: './cache',
      maxSize: 500, // 500MB
      ttl: 3600, // 1 hour
    },
  },

  media: {
    uploads: {
      directory: './public/uploads',
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'mp4', 'mp3', 'doc', 'docx'],
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
        'video/mp4',
        'audio/mp3',
        'audio/mpeg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      imageOptimization: {
        enabled: true,
        quality: 80,
        formats: ['webp', 'jpg'],
        sizes: [150, 300, 600, 1200, 1920],
      },
    },
    storage: {
      adapter: 'local',
      local: {
        publicPath: '/uploads',
        privatePath: './storage/private',
      },
    },
  },

  email: {
    enabled: false,
    adapter: 'smtp',
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {},
      tls: {
        rejectUnauthorized: false,
      },
    },
    from: {
      name: 'Modular App',
      email: 'noreply@modular-app.com',
    },
    templates: {
      directory: './templates/email',
      defaultLanguage: 'en',
    },
  },

  security: {
    encryption: {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
    },
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false,
      standardHeaders: true,
      legacyHeaders: false,
    },
    cors: {
      enabled: true,
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
    helmet: {
      enabled: true,
      contentSecurityPolicy: false, // Disabled for development
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      dnsPrefetchControl: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: false, // Disabled for development
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: true,
      xssFilter: true,
    },
    bruteForce: {
      enabled: true,
      maxAttempts: 5,
      lockoutDuration: 30, // 30 minutes
      whitelistedIPs: ['127.0.0.1', '::1'],
    },
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: false,
      preventReuse: 5,
    },
  },

  logging: {
    level: 'info',
    console: {
      enabled: true,
      colorize: true,
      timestamp: true,
    },
    file: {
      enabled: true,
      directory: './logs',
      filename: 'modular-app-%DATE%.log',
      maxFiles: 5,
      maxSize: '20m',
      datePattern: 'YYYY-MM-DD',
    },
    database: {
      enabled: false,
      collection: 'logs',
      maxSize: 10000,
      ttl: 30, // 30 days
    },
    external: {
      enabled: false,
    },
  },

  plugins: {
    enabled: true,
    directory: './packages/plugins',
    autoLoad: true,
    enabledByDefault: false,
    maxConcurrentOperations: 5,
    operationTimeout: 30000,
    allowRemoteInstall: false,
    trustedSources: ['https://registry.modular-app.com'],
    sandboxing: {
      enabled: true,
      allowFileAccess: false,
      allowNetworkAccess: false,
      allowDatabaseAccess: true,
    },
  },

  themes: {
    enabled: true,
    directory: './themes',
    autoLoad: true,
    default: 'default',
    allowCustomCSS: true,
    allowCustomJS: false,
    customization: {
      colors: {
        enabled: true,
        presets: {
          default: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'],
          dark: ['#1e40af', '#dc2626', '#16a34a', '#d97706'],
          light: ['#60a5fa', '#f87171', '#4ade80', '#fbbf24'],
        },
      },
      typography: {
        enabled: true,
        fonts: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat'],
        sizes: [12, 14, 16, 18, 20, 24, 32, 48],
      },
      layout: {
        enabled: true,
        maxWidth: 1200,
        sidebars: ['left', 'right', 'both', 'none'],
      },
    },
  },

  performance: {
    caching: {
      pages: {
        enabled: true,
        ttl: 300, // 5 minutes
        excludePaths: ['/admin', '/api', '/auth'],
      },
      api: {
        enabled: true,
        ttl: 60, // 1 minute
        excludeEndpoints: ['/api/auth', '/api/admin'],
      },
      assets: {
        enabled: true,
        ttl: 86400, // 24 hours
        compression: true,
      },
    },
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024, // 1KB
    },
    optimization: {
      minifyHTML: false,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      lazyLoading: true,
    },
  },

  api: {
    enabled: true,
    version: 'v1',
    prefix: '/api',
    documentation: {
      enabled: true,
      path: '/docs',
      title: 'Modular App API',
      description: 'API documentation for Modular App CMS',
    },
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
    },
    authentication: {
      required: false,
      methods: ['jwt', 'apikey'],
    },
    cors: {
      enabled: true,
      allowedOrigins: ['*'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    versioning: {
      enabled: true,
      strategy: 'uri',
    },
  },

  site: {
    general: {
      title: 'Modular App',
      description: 'A modern CMS built with Next.js and TypeScript',
      url: 'http://localhost:3000',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      charset: 'UTF-8',
    },
    seo: {
      enabled: true,
      metaDescription: 'A modern, extensible CMS built with Next.js, TypeScript, and MongoDB',
      keywords: ['cms', 'nextjs', 'typescript', 'mongodb', 'modular'],
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
        archive: true,
        snippet: true,
        imageindex: true,
      },
      sitemap: {
        enabled: true,
        frequency: 'weekly',
        priority: 0.7,
      },
    },
    content: {
      pagination: {
        postsPerPage: 10,
        maxPages: 100,
      },
      comments: {
        enabled: true,
        moderation: true,
        allowAnonymous: false,
        maxDepth: 5,
      },
      revisions: {
        enabled: true,
        maxRevisions: 20,
        autoSave: true,
        autoSaveInterval: 60, // 1 minute
      },
    },
    maintenance: {
      enabled: false,
      message: 'Site is under maintenance. Please check back later.',
      allowedIPs: [],
    },
  },
};

export default defaultConfig;