// ===================================================================
// COMPREHENSIVE CORE PACKAGE EXPORTS - ALL MODULES INCLUDED
// ===================================================================

// ===================================================================
// DATABASE EXPORTS
// ===================================================================

// Database Models - Aliased to avoid conflicts
export { 
  User as UserModel, 
  Post as PostModel, 
  Page as PageModel, 
  Media as MediaModel, 
  Category as CategoryModel, 
  Tag as TagModel, 
  Comment as CommentModel, 
  Plugin as PluginModel, 
  Setting as SettingModel 
} from './database/models';

// Database Model Interfaces
export type {
  IUser,
  IPost,
  IPage,
  IMedia,
  ICategory,
  ITag,
  IComment,
  IPlugin,
  ISetting
} from './database/models';

// Database utilities and constants
export {
  MODEL_NAMES,
  COLLECTION_NAMES,
  MODELS,
  initializeModels,
  initializeDefaultData,
  initializeDatabase
} from './database/models';

// Database connection
export { DatabaseConnection } from './database/connection';

// Database repositories
export * from './database/repositories/base-repository';
export * from './database/repositories/content-repository';
export * from './database/repositories/user-repository';
export * from './database/repositories/settings-repository';

// ===================================================================
// TYPE EXPORTS
// ===================================================================


export {
  ContentStatus,
  ContentType,
} from './types/content';

export {
  UserRole,
  UserStatus,
} from './types/user';

// Content Types
export type {
  BaseContent,
  PostType,
  PageType,
  MediaType,
  CommentType,
  CategoryType,
  TagType,
  ContentStats,
  ContentMeta,
  ContentRevision,
} from './types/content';

// User Types
export type {
  UserProfile,
  UserPreferences,
  UserMeta,
  UserCapability,
  UserPermission,
  UserStats,
  AuthToken,
  LoginCredentials,
  RegisterData,
  PasswordReset,
  PasswordResetRequest,
  EmailVerification,
} from './types/user';

// Plugin Types
export type * from './types/plugin';

// CMS Types
export type * from './types/cms';

// Auth Types - Using specific exports to avoid conflicts
export type {
  AuthSession,
  AuthError,
  AuthErrorCode,
  TokenPayload,
  RefreshTokenPayload,
  TokenValidationResult,
  TokenRefreshResult,
  PasswordValidationResult,
  PasswordHashResult,
  TwoFactorVerification,
  TwoFactorBackupCode,
  OAuthState,
  OAuthProfile,
  OAuthTokens,
  OAuthUserInfo,
} from './types/auth-types';

// ===================================================================
// CORE MANAGERS
// ===================================================================

// Core Managers
export { ConfigManager } from './config/config-manager';
export { PluginManager } from './plugin/plugin-manager';

// ===================================================================
// UTILITIES
// ===================================================================

// Core Utilities
export { Logger } from './utils/logger';
export { Sanitizer } from './utils/sanitizer';
export { Validator } from './utils/validator';
export * from './utils/date-utils';

// ===================================================================
// HOOKS AND EVENTS
// ===================================================================

// Hooks and Events
export { HookManager } from './hooks/hook-manager';
export { EventManager } from './events/event-manager';
export type * from './hooks/hook-types';
export type * from './events/event-types';

// ===================================================================
// CACHE
// ===================================================================

// Cache Management
export { CacheManager } from './cache/cache-manager';

// ===================================================================
// AUTHENTICATION
// ===================================================================

// Auth Managers
export { AuthManager } from './auth/auth-manager';
export { PermissionManager } from './auth/permission-manager';

// Auth Handlers
export { JWTHandler } from './auth/jwt-handler';
export { PasswordHandler } from './auth/password-handler';

// Auth Manager Types with aliases to avoid conflicts
export type {
  AuthManagerConfig,
  RegistrationData,
  AuthStats,
} from './auth/auth-manager';

export type {
  PermissionManagerConfig,
  Permission,
  Capability,
  ResourcePermission,
} from './auth/permission-manager';

// ===================================================================
// CMS MANAGERS
// ===================================================================

// CMS Managers
export { CMSManager } from './cms/cms-manager';
export { ContentManager } from './cms/content-manager';
export { UserManager } from './cms/user-manager';

// CMS Manager Types with aliases to avoid conflicts
export type {
  CMSManagerConfig,
  CMSHealth,
} from './cms/cms-manager';

export type {
  ContentManagerConfig,
} from './cms/content-manager';

export type {
  UserManagerConfig,
  PasswordPolicy,
  AuthResult,
  TwoFactorSetup,
  BulkUserOperation,
  BulkUserResult,
} from './cms/user-manager';

// ===================================================================
// API MANAGEMENT
// ===================================================================

// API Managers
export { APIManager } from './api/api-manager';
export { RouteManager } from './api/route-manager';
export { MiddlewareManager } from './api/middleware-manager';

// API Types
export type * from './api/api-types';

export type {
  APIManagerConfig,
  APIServerInfo,
} from './api/api-manager';

// ===================================================================
// CONFIGURATION
// ===================================================================

// Configuration
export * from './config/env-config';
// ===================================================================
// MIGRATIONS AND SETUP
// ===================================================================

// Database migrations and setup
export * from './database/migrations/initial-setup';

// ===================================================================
// DEFAULT EXPORTS
// ===================================================================

// Default exports for backwards compatibility
export { ConfigManager as default } from './config/config-manager';