import { 
  ContentStatus,
  ContentType,
  UserRole,
  UserStatus,
  type IUser,
  type IPost
} from '@modular-app/core/client'; // Use client entry point

export const ADMIN_CONSTANTS = {
  // App metadata
  APP: {
    NAME: 'Modular App Admin',
    VERSION: '1.0.0',
    DESCRIPTION: 'Modern Content Management System Administration Panel',
  },

  // Routes
  ROUTES: {
    DASHBOARD: '/admin',
    POSTS: '/admin/posts',
    PAGES: '/admin/pages',
    MEDIA: '/admin/media',
    USERS: '/admin/users',
    COMMENTS: '/admin/comments',
    CATEGORIES: '/admin/categories',
    TAGS: '/admin/tags',
    PLUGINS: '/admin/plugins',
    THEMES: '/admin/themes',
    SETTINGS: '/admin/settings',
    ANALYTICS: '/admin/analytics',
    PROFILE: '/admin/profile',
    LOGIN: '/admin/login',
    LOGOUT: '/admin/logout',
  },

  // Content statuses from core (client-safe)
  CONTENT_STATUS: ContentStatus,
  CONTENT_TYPE: ContentType,
  USER_ROLE: UserRole,
  USER_STATUS: UserStatus,

  // Permissions
  PERMISSIONS: {
    MANAGE_CONTENT: 'content:manage',
    MANAGE_USERS: 'users:manage',
    MANAGE_COMMENTS: 'comments:manage',
    MANAGE_MEDIA: 'media:manage',
    MANAGE_PLUGINS: 'plugins:manage',
    MANAGE_THEMES: 'themes:manage',
    MANAGE_SETTINGS: 'settings:manage',
    VIEW_ANALYTICS: 'analytics:view',
  },

  // UI Constants
  UI: {
    PAGE_SIZES: [10, 25, 50, 100],
    DEFAULT_PAGE_SIZE: 25,
    SIDEBAR_WIDTH: 280,
    SIDEBAR_COLLAPSED_WIDTH: 80,
  },

  // File upload limits
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],
    MAX_FILENAME_LENGTH: 255,
  },

  // Validation
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_TITLE_LENGTH: 255,
    MAX_EXCERPT_LENGTH: 500,
    SLUG_PATTERN: /^[a-z0-9-]+$/,
  },
} as const;
