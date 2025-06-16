import type { Types } from 'mongoose';

// Export enum as value
export enum PluginStatus {
  INSTALLED = 'installed',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  UPDATING = 'updating',
  UNINSTALLING = 'uninstalling',
}

// Export enum as value
export enum PluginCapability {
  CONTENT_MANAGEMENT = 'content-management',
  FRONTEND_RENDERING = 'frontend-rendering',
  ADMIN_INTERFACE = 'admin-interface',
  API_ENDPOINTS = 'api-endpoints',
  WEBHOOKS = 'webhooks',
  CUSTOM_FIELDS = 'custom-fields',
  WIDGETS = 'widgets',
  SHORTCODES = 'shortcodes',
  BLOCKS = 'blocks',
  AUTHENTICATION = 'authentication',
  CACHING = 'caching',
  SEO = 'seo',
  ANALYTICS = 'analytics',
  ECOMMERCE = 'ecommerce',
  FORMS = 'forms',
  MEDIA = 'media',
  SOCIAL = 'social',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
}

// All interfaces remain the same but are type exports
export interface PluginManifest {
  name: string;
  version: string;
  title: string;
  description: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: string;
  main: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  requirements: {
    cmsVersion: string;
    nodeVersion: string;
    phpVersion?: string;
  };
  capabilities: PluginCapability[];
  hooks?: string[];
  filters?: string[];
  adminMenu?: PluginAdminMenu;
  publicRoutes?: PluginRoute[];
  adminRoutes?: PluginRoute[];
  settings?: PluginSettingsSchema;
  permissions?: PluginPermission[];
  textDomain?: string;
  domainPath?: string;
  network?: boolean;
  tags?: string[];
  tested?: string;
  requiresWP?: string;
}

export interface PluginAdminMenu {
  title: string;
  icon: string;
  position: number;
  capability?: string;
  submenu?: Array<{
    title: string;
    path: string;
    capability?: string;
  }>;
}

export interface PluginRoute {
  path: string;
  component: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  middleware?: string[];
  capability?: string;
}

export interface PluginSettingsSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'email' | 'url' | 'color' | 'date' | 'file';
    default: any;
    label: string;
    description?: string;
    required?: boolean;
    choices?: Record<string, string>;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      custom?: string;
    };
    group?: string;
    conditional?: {
      field: string;
      value: any;
      operator?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
    };
  };
}

export interface PluginPermission {
  name: string;
  description: string;
  group?: string;
}

export interface Plugin {
  manifest: PluginManifest;
  status: PluginStatus;
  path: string;
  settings?: Record<string, any>;
  hooks?: Record<string, Function>;
  filters?: Record<string, Function>;
  routes?: PluginRoute[];
  
  // Lifecycle methods
  activate?(): Promise<void>;
  deactivate?(): Promise<void>;
  install?(): Promise<void>;
  uninstall?(): Promise<void>;
  update?(oldVersion: string, newVersion: string): Promise<void>;
  
  // Hook registration methods
  registerHook?(hookName: string, callback: Function, priority?: number): void;
  registerFilter?(filterName: string, callback: Function, priority?: number): void;
  registerRoute?(route: PluginRoute): void;
  registerSetting?(key: string, schema: PluginSettingsSchema[string]): void;
}

export interface PluginHook {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  since: string;
  plugin?: string;
}

export interface PluginFilter {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  returnType: string;
  since: string;
  plugin?: string;
}

export interface PluginRecord {
  _id: Types.ObjectId;
  name: string;
  version: string;
  status: PluginStatus;
  settings: Record<string, any>;
  installedAt: Date;
  activatedAt?: Date;
  lastUpdated?: Date;
  errorMessage?: string;
  metadata: {
    path: string;
    fileSize: number;
    checksum: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginDependency {
  name: string;
  version: string;
  type: 'plugin' | 'theme' | 'core';
  required: boolean;
}

export interface PluginError {
  code: string;
  message: string;
  file?: string;
  line?: number;
  stack?: string;
  context?: Record<string, any>;
}

export interface PluginEvent {
  type: 'installed' | 'activated' | 'deactivated' | 'updated' | 'uninstalled' | 'error';
  plugin: string;
  timestamp: Date;
  data?: Record<string, any>;
  error?: PluginError;
}
