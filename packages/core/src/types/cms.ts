import type { PluginManager } from '../plugin/plugin-manager';
import type { HookManager } from '../hooks/hook-manager';
import type { EventManager } from '../events/event-manager';
import type { ConfigManager } from '../config/config-manager';
import type { CacheManager } from '../cache/cache-manager';
import { DatabaseConnection } from './database';
import Logger from '../utils/logger';

export interface CMSConfig {
  database: {
    uri: string;
    name: string;
    options?: Record<string, any>;
  };
  cache: {
    enabled: boolean;
    provider: 'redis' | 'memory';
    url?: string;
    options?: Record<string, any>;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
  };
  upload: {
    directory: string;
    maxFileSize: number;
    allowedTypes: string[];
  };
  email?: {
    provider: 'smtp' | 'sendgrid';
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    apiKey?: string;
  };
  features: {
    registration: boolean;
    comments: boolean;
    multisite: boolean;
  };
  security: {
    rateLimiting: boolean;
    maxRequests: number;
    windowMs: number;
  };
}

export interface CMSInstance {
  plugins: PluginManager;
  hooks: HookManager;
  events: EventManager;
  config: ConfigManager;
  database: DatabaseConnection;
  cache: CacheManager;
  logger: Logger;
  isInitialized(): boolean;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export enum CMSStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  SHUTTING_DOWN = 'shutting_down',
  SHUTDOWN = 'shutdown',
}

export interface CMSError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  timestamp: Date;
}

export interface CMSEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: Date;
  source: string;
}

export interface CMSHook {
  name: string;
  callback: Function;
  priority: number;
  plugin?: string;
}

export interface CMSFilter {
  name: string;
  callback: Function;
  priority: number;
  plugin?: string;
}

export interface CMSStats {
  uptime: number;
  requests: number;
  activePlugins: number;
  memoryUsage: NodeJS.MemoryUsage;
  databaseConnections: number;
  cacheHitRate?: number;
}

export interface CMSSetting {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  group?: string;
  public?: boolean;
}