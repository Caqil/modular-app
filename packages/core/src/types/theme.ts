import type { Types } from 'mongoose';

// Export enum as value
export enum ThemeStatus {
  INSTALLED = 'installed',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  UPDATING = 'updating',
  UNINSTALLING = 'uninstalling',
}

// Export enum as value
export enum ThemeSupport {
  CUSTOM_LOGO = 'custom-logo',
  CUSTOM_COLORS = 'custom-colors',
  CUSTOM_FONTS = 'custom-fonts',
  MENUS = 'menus',
  WIDGETS = 'widgets',
  POST_THUMBNAILS = 'post-thumbnails',
  CUSTOM_HEADER = 'custom-header',
  CUSTOM_BACKGROUND = 'custom-background',
  RESPONSIVE = 'responsive',
  DARK_MODE = 'dark-mode',
  RTL = 'rtl',
  ACCESSIBILITY = 'accessibility',
  WOOCOMMERCE = 'woocommerce',
  EDITOR_STYLES = 'editor-styles',
  BLOCK_EDITOR = 'block-editor',
}

// All interfaces remain the same but are type exports
export interface ThemeManifest {
  name: string;
  version: string;
  title: string;
  description: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: string;
  screenshot?: string;
  tags?: string[];
  supports: ThemeSupport[];
  templates: Record<string, ThemeTemplate>;
  customizer?: ThemeCustomizer;
  menus?: ThemeMenu[];
  widgetAreas?: ThemeWidgetArea[];
  postFormats?: string[];
  requirements: {
    cmsVersion: string;
    nodeVersion: string;
  };
  textDomain?: string;
  domainPath?: string;
  colors?: ThemeColor[];
  fonts?: ThemeFont[];
}

export interface ThemeTemplate {
  title: string;
  description: string;
  file: string;
  type?: 'page' | 'post' | 'archive' | 'single' | 'home' | 'search' | '404';
  postTypes?: string[];
  categories?: string[];
  tags?: string[];
  custom?: boolean;
}

export interface ThemeCustomizer {
  sections: ThemeCustomizerSection[];
  panels?: ThemeCustomizerPanel[];
}

export interface ThemeCustomizerPanel {
  id: string;
  title: string;
  description?: string;
  priority?: number;
  type?: string;
}

export interface ThemeCustomizerSection {
  id: string;
  title: string;
  description?: string;
  panel?: string;
  priority?: number;
  settings: ThemeCustomizerSetting[];
}

export interface ThemeCustomizerSetting {
  id: string;
  type: 'text' | 'textarea' | 'email' | 'url' | 'number' | 'select' | 'radio' | 'checkbox' | 'color' | 'image' | 'range';
  label: string;
  description?: string;
  default: any;
  choices?: Record<string, string>;
  min?: number;
  max?: number;
  step?: number;
  capability?: string;
  transport?: 'refresh' | 'postMessage';
  sanitizeCallback?: string;
  validation?: {
    required?: boolean;
    pattern?: string;
    custom?: string;
  };
}

export interface ThemeMenu {
  id: string;
  title: string;
  description: string;
  location?: string;
}

export interface ThemeWidgetArea {
  id: string;
  title: string;
  description: string;
  beforeWidget?: string;
  afterWidget?: string;
  beforeTitle?: string;
  afterTitle?: string;
}

export interface ThemeColor {
  name: string;
  slug: string;
  color: string;
}

export interface ThemeFont {
  name: string;
  family: string;
  variants?: string[];
  subsets?: string[];
  source?: 'google' | 'local' | 'system';
}

export interface Theme {
  manifest: ThemeManifest;
  status: ThemeStatus;
  path: string;
  settings?: Record<string, any>;
  
  // Lifecycle methods
  activate?(): Promise<void>;
  deactivate?(): Promise<void>;
  install?(): Promise<void>;
  uninstall?(): Promise<void>;
  update?(oldVersion: string, newVersion: string): Promise<void>;
  
  // Template methods
  renderTemplate?(template: string, data: Record<string, any>): Promise<string>;
  getTemplate?(name: string): Promise<string | null>;
  getAsset?(path: string): Promise<string | null>;
}

export interface ThemeRecord {
  _id: Types.ObjectId;
  name: string;
  version: string;
  status: ThemeStatus;
  settings: Record<string, any>;
  installedAt: Date;
  activatedAt?: Date;
  lastUpdated?: Date;
  errorMessage?: string;
  metadata: {
    path: string;
    fileSize: number;
    checksum: string;
    screenshot?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ThemeSettings {
  [key: string]: any;
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  logo?: string;
  favicon?: string;
  customCss?: string;
  headerCode?: string;
  footerCode?: string;
}

export interface ThemeError {
  code: string;
  message: string;
  file?: string;
  line?: number;
  stack?: string;
  context?: Record<string, any>;
}

export interface ThemeEvent {
  type: 'installed' | 'activated' | 'deactivated' | 'updated' | 'uninstalled' | 'error';
  theme: string;
  timestamp: Date;
  data?: Record<string, any>;
  error?: ThemeError;
}