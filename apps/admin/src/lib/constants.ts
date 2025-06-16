export {
  UserRole,
  UserStatus,
  ContentStatus,
  ContentType,
} from '@modular-app/core';

// Admin-specific constants
export const ADMIN_CONSTANTS = {
  // UI Configuration
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 64,
  TOAST_DURATION: 5000,
  ANIMATION_DURATION: 200,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],

  // File Upload Limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],

  // Cache Keys
  CACHE_KEYS: {
    USER_STATS: 'admin:user:stats',
    CONTENT_STATS: 'admin:content:stats',
    PLUGIN_LIST: 'admin:plugins:list',
    SETTINGS: 'admin:settings',
    DASHBOARD_DATA: 'admin:dashboard:data',
  } as const,

  // Admin Routes
  ROUTES: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    CONTENT: '/admin/content',
    POSTS: '/admin/content/posts',
    PAGES: '/admin/content/pages',
    MEDIA: '/admin/media',
    PLUGINS: '/admin/plugins',
    SETTINGS: '/admin/settings',
    PROFILE: '/admin/profile',
    ANALYTICS: '/admin/analytics',
  } as const,

  // Permissions
  PERMISSIONS: {
    MANAGE_USERS: 'manage_users',
    MANAGE_CONTENT: 'manage_content',
    MANAGE_MEDIA: 'manage_media',
    MANAGE_PLUGINS: 'manage_plugins',
    MANAGE_SETTINGS: 'manage_settings',
    VIEW_ANALYTICS: 'view_analytics',
    MANAGE_COMMENTS: 'manage_comments',
    MODERATE_CONTENT: 'moderate_content',
  } as const,

  // Status Colors for UI
  STATUS_COLORS: {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    neutral: 'bg-gray-100 text-gray-800',
  } as const,

  // Theme Configuration
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto',
  } as const,
} as const;
