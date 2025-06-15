
export interface HookCallback {
  (...args: any[]): any;
}

export interface FilterCallback {
  (value: any, ...args: any[]): any;
}

export interface ActionHookDefinition {
  name: string;
  description: string;
  parameters: HookParameter[];
  since: string;
  plugin?: string;
  deprecated?: {
    version: string;
    alternative?: string;
  };
}

export interface FilterHookDefinition {
  name: string;
  description: string;
  parameters: HookParameter[];
  returnType: string;
  since: string;
  plugin?: string;
  deprecated?: {
    version: string;
    alternative?: string;
  };
}

export interface HookParameter {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  default?: any;
}

export interface RegisteredHook {
  id: string;
  callback: HookCallback;
  priority: number;
  plugin: string;
  addedAt: Date;
  once?: boolean | undefined;
  condition?: ((...args: any[]) => boolean) | undefined;
  timeout?: number | undefined;
  errorHandler?: ((error: Error, ...args: any[]) => void) | undefined;
}

export interface RegisteredFilter {
  id: string;
  callback: FilterCallback;
  priority: number;
  plugin: string;
  addedAt: Date;
  condition?: ((value: any, ...args: any[]) => boolean) | undefined;
  timeout?: number | undefined;
  errorHandler?: ((error: Error, value: any, ...args: any[]) => any) | undefined;
}

export interface HookExecution {
  hookName: string;
  hookType: 'action' | 'filter';
  executedAt: Date;
  duration: number;
  plugin: string;
  success: boolean;
  error?: string | undefined;
  args?: any[] | undefined;
  result?: any;
}

export interface HookStats {
  totalHooks: number;
  totalFilters: number;
  executionCount: number;
  averageExecutionTime: number;
  errorCount: number;
  hooksByPlugin: Record<string, number>;
  filtersByPlugin: Record<string, number>;
  executionsByHook: Record<string, number>;
  slowestHooks: Array<{
    name: string;
    averageTime: number;
    executions: number;
  }>;
}

export interface HookManagerConfig {
  enableMetrics: boolean;
  enableHistory: boolean;
  historySize: number;
  defaultTimeout: number;
  maxHooksPerType: number;
  enableDebugging: boolean;
  enableProfiling: boolean;
}

export enum CoreHooks {
  // System hooks
  SYSTEM_INIT = 'system:init',
  SYSTEM_READY = 'system:ready',
  SYSTEM_SHUTDOWN = 'system:shutdown',

  // CMS hooks
  CMS_INIT = 'cms:init',
  CMS_LOADED = 'cms:loaded',
  CMS_READY = 'cms:ready',

  // Plugin hooks
  PLUGIN_LOADED = 'plugin:loaded',
  PLUGIN_BEFORE_ACTIVATE = 'plugin:before_activate',
  PLUGIN_ACTIVATED = 'plugin:activated',
  PLUGIN_BEFORE_DEACTIVATE = 'plugin:before_deactivate',
  PLUGIN_DEACTIVATED = 'plugin:deactivated',

  // Theme hooks
  THEME_LOADED = 'theme:loaded',
  THEME_BEFORE_ACTIVATE = 'theme:before_activate',
  THEME_ACTIVATED = 'theme:activated',
  THEME_BEFORE_DEACTIVATE = 'theme:before_deactivate',
  THEME_DEACTIVATED = 'theme:deactivated',

  // Content hooks
  CONTENT_BEFORE_CREATE = 'content:before_create',
  CONTENT_CREATED = 'content:created',
  CONTENT_BEFORE_UPDATE = 'content:before_update',
  CONTENT_UPDATED = 'content:updated',
  CONTENT_BEFORE_DELETE = 'content:before_delete',
  CONTENT_DELETED = 'content:deleted',
  CONTENT_BEFORE_PUBLISH = 'content:before_publish',
  CONTENT_PUBLISHED = 'content:published',

  // User hooks
  USER_BEFORE_REGISTER = 'user:before_register',
  USER_REGISTERED = 'user:registered',
  USER_BEFORE_LOGIN = 'user:before_login',
  USER_LOGIN = 'user:login',
  USER_LOGOUT = 'user:logout',
  USER_BEFORE_UPDATE = 'user:before_update',
  USER_UPDATED = 'user:updated',

  // Media hooks
  MEDIA_BEFORE_UPLOAD = 'media:before_upload',
  MEDIA_UPLOADED = 'media:uploaded',
  MEDIA_BEFORE_DELETE = 'media:before_delete',
  MEDIA_DELETED = 'media:deleted',

  // Admin hooks
  ADMIN_INIT = 'admin:init',
  ADMIN_MENU = 'admin:menu',
  ADMIN_DASHBOARD = 'admin:dashboard',

  // API hooks
  API_BEFORE_REQUEST = 'api:before_request',
  API_AFTER_REQUEST = 'api:after_request',
  API_ERROR = 'api:error',
}

export enum CoreFilters {
  // Content filters
  CONTENT_RENDER = 'content:render',
  CONTENT_EXCERPT = 'content:excerpt',
  CONTENT_TITLE = 'content:title',
  CONTENT_META = 'content:meta',

  // Admin filters
  ADMIN_MENU_ITEMS = 'admin:menu_items',
  ADMIN_DASHBOARD_WIDGETS = 'admin:dashboard_widgets',
  ADMIN_USER_CAPABILITIES = 'admin:user_capabilities',

  // Theme filters
  THEME_TEMPLATE_PATH = 'theme:template_path',
  THEME_ASSET_URL = 'theme:asset_url',
  THEME_CUSTOMIZER_SETTINGS = 'theme:customizer_settings',

  // Plugin filters
  PLUGIN_SETTINGS = 'plugin:settings',
  PLUGIN_CAPABILITIES = 'plugin:capabilities',

  // User filters
  USER_DISPLAY_NAME = 'user:display_name',
  USER_AVATAR_URL = 'user:avatar_url',
  USER_ROLE_CAPABILITIES = 'user:role_capabilities',

  // Media filters
  MEDIA_UPLOAD_SIZE_LIMIT = 'media:upload_size_limit',
  MEDIA_ALLOWED_TYPES = 'media:allowed_types',
  MEDIA_THUMBNAIL_SIZES = 'media:thumbnail_sizes',

  // API filters
  API_RESPONSE_DATA = 'api:response_data',
  API_ERROR_MESSAGE = 'api:error_message',
  API_RATE_LIMIT = 'api:rate_limit',

  // Database filters
  DATABASE_QUERY = 'database:query',
  DATABASE_RESULTS = 'database:results',

  // Cache filters
  CACHE_KEY = 'cache:key',
  CACHE_TTL = 'cache:ttl',
  CACHE_DATA = 'cache:data',
}

export interface HookRegistrationOptions {
  priority?: number;
  once?: boolean;
  condition?: (...args: any[]) => boolean;
  timeout?: number;
  errorHandler?: (error: Error, ...args: any[]) => void;
}

export interface FilterRegistrationOptions {
  priority?: number;
  condition?: (value: any, ...args: any[]) => boolean;
  timeout?: number;
  errorHandler?: (error: Error, value: any, ...args: any[]) => any;
}
