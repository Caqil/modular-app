export interface EventPayload {
  [key: string]: any;
}

export interface EventMetadata {
  timestamp: Date;
  source: string;
  version: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface Event {
  type: string;
  payload: EventPayload;
  metadata: EventMetadata;
}

export interface EventListener {
  id: string;
  callback: EventCallback;
  options: EventListenerOptions;
  plugin?: string;
  addedAt: Date;
}

export interface EventListenerOptions {
  once?: boolean;
  priority?: number;
  timeout?: number;
  condition?: (event: Event) => boolean;
  errorHandler?: (error: Error, event: Event) => void;
}

export type EventCallback = (event: Event) => void | Promise<void>;

export interface EventStats {
  totalEvents: number;
  totalListeners: number;
  eventsByType: Record<string, number>;
  listenersByType: Record<string, number>;
  averageProcessingTime: number;
  errorCount: number;
}

export interface EventHistory {
  event: Event;
  processedAt: Date;
  listenerCount: number;
  processingTime: number;
  errors: Array<{
    listenerId: string;
    error: string;
    timestamp: Date;
  }>;
}

export interface EventQueueItem {
  event: Event;
  priority: number;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
}

export enum EventType {
  // System events
  SYSTEM_STARTUP = 'system:startup',
  SYSTEM_SHUTDOWN = 'system:shutdown',
  SYSTEM_ERROR = 'system:error',
  
  // CMS events
  CMS_INITIALIZED = 'cms:initialized',
  CMS_SHUTDOWN = 'cms:shutdown',
  CMS_CONFIG_CHANGED = 'cms:config_changed',
  
  // User events
  USER_REGISTERED = 'user:registered',
  USER_LOGIN = 'user:login',
  USER_LOGOUT = 'user:logout',
  USER_PROFILE_UPDATED = 'user:profile_updated',
  USER_ROLE_CHANGED = 'user:role_changed',
  USER_DELETED = 'user:deleted',
  
  // Content events
  CONTENT_CREATED = 'content:created',
  CONTENT_UPDATED = 'content:updated',
  CONTENT_DELETED = 'content:deleted',
  CONTENT_PUBLISHED = 'content:published',
  CONTENT_UNPUBLISHED = 'content:unpublished',
  CONTENT_VIEWED = 'content:viewed',
  
  // Media events
  MEDIA_UPLOADED = 'media:uploaded',
  MEDIA_DELETED = 'media:deleted',
  MEDIA_UPDATED = 'media:updated',
  
  // Plugin events
  PLUGIN_INSTALLED = 'plugin:installed',
  PLUGIN_ACTIVATED = 'plugin:activated',
  PLUGIN_DEACTIVATED = 'plugin:deactivated',
  PLUGIN_UPDATED = 'plugin:updated',
  PLUGIN_UNINSTALLED = 'plugin:uninstalled',
  PLUGIN_ERROR = 'plugin:error',
  
  // Theme events
  THEME_INSTALLED = 'theme:installed',
  THEME_ACTIVATED = 'theme:activated',
  THEME_DEACTIVATED = 'theme:deactivated',
  THEME_UPDATED = 'theme:updated',
  THEME_UNINSTALLED = 'theme:uninstalled',
  THEME_CUSTOMIZED = 'theme:customized',
  
  // Hook events
  HOOK_ADDED = 'hook:added',
  HOOK_REMOVED = 'hook:removed',
  HOOK_EXECUTED = 'hook:executed',
  HOOK_ERROR = 'hook:error',
  
  // Database events
  DATABASE_CONNECTED = 'database:connected',
  DATABASE_DISCONNECTED = 'database:disconnected',
  DATABASE_ERROR = 'database:error',
  DATABASE_MIGRATION = 'database:migration',
  
  // Cache events
  CACHE_HIT = 'cache:hit',
  CACHE_MISS = 'cache:miss',
  CACHE_SET = 'cache:set',
  CACHE_DELETE = 'cache:delete',
  CACHE_CLEAR = 'cache:clear',
  
  // API events
  API_REQUEST = 'api:request',
  API_RESPONSE = 'api:response',
  API_ERROR = 'api:error',
  API_RATE_LIMIT = 'api:rate_limit',
}

export interface EventFilter {
  types?: string[];
  source?: string;
  plugin?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasErrors?: boolean;
}

export interface EventEmitterConfig {
  maxListeners: number;
  enableHistory: boolean;
  historySize: number;
  enableQueue: boolean;
  queueSize: number;
  defaultTimeout: number;
  enableMetrics: boolean;
}