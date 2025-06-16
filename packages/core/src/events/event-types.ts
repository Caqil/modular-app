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
  SYSTEM_INIT = 'system:init',
  SYSTEM_READY = 'system:ready',
  SYSTEM_SHUTDOWN = 'system:shutdown',
  SYSTEM_ERROR = 'system:error',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_MAINTENANCE_START = 'system:maintenance_start',
  SYSTEM_MAINTENANCE_END = 'system:maintenance_end',
  
  // CMS events
  CMS_INITIALIZING = 'cms:initializing',
  CMS_INITIALIZED = 'cms:initialized',
  CMS_READY = 'cms:ready',
  CMS_SHUTDOWN = 'cms:shutdown',
  CMS_ERROR = 'cms:error',
  CMS_CONFIG_CHANGED = 'cms:config_changed',
  CMS_UPDATE_AVAILABLE = 'cms:update_available',
  CMS_UPDATE_INSTALLED = 'cms:update_installed',
  
  // User events
  USER_REGISTERED = 'user:registered',
  USER_LOGIN = 'user:login',
  USER_LOGOUT = 'user:logout',
  USER_LOGIN_FAILED = 'user:login_failed',
  USER_PASSWORD_CHANGED = 'user:password_changed',
  USER_PASSWORD_RESET = 'user:password_reset',
  USER_PROFILE_UPDATED = 'user:profile_updated',
  USER_ROLE_CHANGED = 'user:role_changed',
  USER_ACTIVATED = 'user:activated',
  USER_DEACTIVATED = 'user:deactivated',
  USER_DELETED = 'user:deleted',
  USER_BANNED = 'user:banned',
  USER_UNBANNED = 'user:unbanned',
  
  // Content events
  CONTENT_CREATED = 'content:created',
  CONTENT_UPDATED = 'content:updated',
  CONTENT_DELETED = 'content:deleted',
  CONTENT_PUBLISHED = 'content:published',
  CONTENT_UNPUBLISHED = 'content:unpublished',
  CONTENT_SCHEDULED = 'content:scheduled',
  CONTENT_VIEWED = 'content:viewed',
  CONTENT_LIKED = 'content:liked',
  CONTENT_SHARED = 'content:shared',
  CONTENT_COMMENTED = 'content:commented',
  CONTENT_RESTORED = 'content:restored',
  CONTENT_TRASHED = 'content:trashed',
  
  // Post events
  POST_CREATED = 'post:created',
  POST_UPDATED = 'post:updated',
  POST_DELETED = 'post:deleted',
  POST_PUBLISHED = 'post:published',
  POST_UNPUBLISHED = 'post:unpublished',
  POST_SCHEDULED = 'post:scheduled',
  POST_FEATURED = 'post:featured',
  POST_UNFEATURED = 'post:unfeatured',
  
  // Page events
  PAGE_CREATED = 'page:created',
  PAGE_UPDATED = 'page:updated',
  PAGE_DELETED = 'page:deleted',
  PAGE_PUBLISHED = 'page:published',
  PAGE_UNPUBLISHED = 'page:unpublished',
  
  // Comment events
  COMMENT_CREATED = 'comment:created',
  COMMENT_UPDATED = 'comment:updated',
  COMMENT_DELETED = 'comment:deleted',
  COMMENT_APPROVED = 'comment:approved',
  COMMENT_REJECTED = 'comment:rejected',
  COMMENT_SPAM = 'comment:spam',
  COMMENT_REPLIED = 'comment:replied',
  
  // Category events
  CATEGORY_CREATED = 'category:created',
  CATEGORY_UPDATED = 'category:updated',
  CATEGORY_DELETED = 'category:deleted',
  
  // Tag events
  TAG_CREATED = 'tag:created',
  TAG_UPDATED = 'tag:updated',
  TAG_DELETED = 'tag:deleted',
  
  // Media events
  MEDIA_UPLOADED = 'media:uploaded',
  MEDIA_DELETED = 'media:deleted',
  MEDIA_UPDATED = 'media:updated',
  MEDIA_PROCESSED = 'media:processed',
  MEDIA_OPTIMIZED = 'media:optimized',
  MEDIA_CONVERTED = 'media:converted',
  MEDIA_BULK_UPLOADED = 'media:bulk_uploaded',
  MEDIA_BULK_DELETED = 'media:bulk_deleted',
  
  // Plugin events
  PLUGIN_INSTALLED = 'plugin:installed',
  PLUGIN_ACTIVATED = 'plugin:activated',
  PLUGIN_DEACTIVATED = 'plugin:deactivated',
  PLUGIN_UPDATED = 'plugin:updated',
  PLUGIN_UNINSTALLED = 'plugin:uninstalled',
  PLUGIN_ERROR = 'plugin:error',
  PLUGIN_SETTINGS_CHANGED = 'plugin:settings_changed',
  
  // Settings events
  SETTING_CREATED = 'setting:created',
  SETTING_UPDATED = 'setting:updated',
  SETTING_DELETED = 'setting:deleted',
  SETTINGS_IMPORTED = 'settings:imported',
  SETTINGS_EXPORTED = 'settings:exported',
  SETTINGS_RESET = 'settings:reset',
  SETTINGS_BACKUP_CREATED = 'settings:backup_created',
  SETTINGS_BACKUP_RESTORED = 'settings:backup_restored',
  
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
  DATABASE_BACKUP_CREATED = 'database:backup_created',
  DATABASE_BACKUP_RESTORED = 'database:backup_restored',
  DATABASE_OPTIMIZED = 'database:optimized',
  
  // Cache events
  CACHE_INIT = 'cache:init',
  CACHE_HIT = 'cache:hit',
  CACHE_MISS = 'cache:miss',
  CACHE_SET = 'cache:set',
  CACHE_DELETE = 'cache:delete',
  CACHE_CLEAR = 'cache:clear',
  CACHE_FLUSH = 'cache:flush',
  CACHE_ERROR = 'cache:error',
  
  // API events
  API_REQUEST = 'api:request',
  API_RESPONSE = 'api:response',
  API_ERROR = 'api:error',
  API_RATE_LIMIT = 'api:rate_limit',
  API_AUTH_FAILED = 'api:auth_failed',
  API_VALIDATION_FAILED = 'api:validation_failed',
  
  // Security events
  SECURITY_LOGIN_ATTEMPT = 'security:login_attempt',
  SECURITY_LOGIN_FAILED = 'security:login_failed',
  SECURITY_ACCOUNT_LOCKED = 'security:account_locked',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security:suspicious_activity',
  SECURITY_MALWARE_DETECTED = 'security:malware_detected',
  SECURITY_BRUTE_FORCE_DETECTED = 'security:brute_force_detected',
  SECURITY_FILE_UPLOAD_BLOCKED = 'security:file_upload_blocked',
  
  // Email events
  EMAIL_SENT = 'email:sent',
  EMAIL_FAILED = 'email:failed',
  EMAIL_BOUNCED = 'email:bounced',
  EMAIL_OPENED = 'email:opened',
  EMAIL_CLICKED = 'email:clicked',
  EMAIL_UNSUBSCRIBED = 'email:unsubscribed',
  
  // Search events
  SEARCH_QUERY = 'search:query',
  SEARCH_RESULTS = 'search:results',
  SEARCH_NO_RESULTS = 'search:no_results',
  SEARCH_INDEX_UPDATED = 'search:index_updated',
  SEARCH_INDEX_REBUILT = 'search:index_rebuilt',
  
  // Widget events
  WIDGET_CREATED = 'widget:created',
  WIDGET_UPDATED = 'widget:updated',
  WIDGET_DELETED = 'widget:deleted',
  WIDGET_RENDERED = 'widget:rendered',
  
  // Form events
  FORM_SUBMITTED = 'form:submitted',
  FORM_VALIDATION_FAILED = 'form:validation_failed',
  FORM_CREATED = 'form:created',
  FORM_UPDATED = 'form:updated',
  FORM_DELETED = 'form:deleted',
  
  // Backup events
  BACKUP_STARTED = 'backup:started',
  BACKUP_COMPLETED = 'backup:completed',
  BACKUP_FAILED = 'backup:failed',
  BACKUP_RESTORED = 'backup:restored',
  BACKUP_SCHEDULED = 'backup:scheduled',
  
  // Performance events
  PERFORMANCE_SLOW_QUERY = 'performance:slow_query',
  PERFORMANCE_HIGH_MEMORY = 'performance:high_memory',
  PERFORMANCE_HIGH_CPU = 'performance:high_cpu',
  PERFORMANCE_OPTIMIZED = 'performance:optimized',
  
  // Analytics events
  ANALYTICS_PAGE_VIEW = 'analytics:page_view',
  ANALYTICS_EVENT = 'analytics:event',
  ANALYTICS_CONVERSION = 'analytics:conversion',
  ANALYTICS_REPORT_GENERATED = 'analytics:report_generated',
  
  // Maintenance events
  MAINTENANCE_MODE_ON = 'maintenance:mode_on',
  MAINTENANCE_MODE_OFF = 'maintenance:mode_off',
  MAINTENANCE_TASK_STARTED = 'maintenance:task_started',
  MAINTENANCE_TASK_COMPLETED = 'maintenance:task_completed',
  MAINTENANCE_TASK_FAILED = 'maintenance:task_failed',
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