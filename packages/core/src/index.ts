// ===================================================================
// CORE PACKAGE EXPORTS
// ===================================================================

// Theme exports
export {
  ThemeStatus,
  ThemeSupport,
  type Theme,
  type ThemeManifest,
  type ThemeRecord,
  type ThemeError,
  type ThemeEvent,
  type ThemeTemplate,
  type ThemeCustomizer,
  type ThemeCustomizerPanel,
  type ThemeCustomizerSection,
  type ThemeCustomizerSetting,
  type ThemeMenu,
  type ThemeWidgetArea,
  type ThemeColor,
  type ThemeFont,
  type ThemeSettings,
} from './types/theme';

// Content exports
export {
  ContentType,
  ContentStatus,
  type BaseContent,
  type PostType,
  type PageType,
  type MediaType,
  type CommentType,
  type CategoryType,
  type TagType,
  type ContentQuery,
} from './types/content';


// Database models
export {
  User,
  Post,
  Page,
  Media,
  Category,
  Tag,
  Comment,
  Plugin,
  Theme as ThemeModel,
  Setting,
  type IPost,
  type IPage,
  type IMedia,
  type ICategory,
  type ITag,
  type IComment,
  type IPlugin,
  type ITheme,
  type ISetting,
} from './database/models';

// Utilities
export { Logger } from './utils/logger';
export { Sanitizer } from './utils/sanitizer';
export { Validator } from './utils/validator';

// Managers
export { HookManager } from './hooks/hook-manager';
export { EventManager } from './events/event-manager';
export { ThemeManager } from './theme/theme-manager';
export { ContentManager } from './cms/content-manager';
export { ConfigManager } from './config/config-manager';
export { CacheManager } from './cache/cache-manager';

// Hook types
export {
  CoreHooks,
  CoreFilters,
  type HookCallback,
  type FilterCallback,
  type ActionHookDefinition,
  type FilterHookDefinition,
  type RegisteredHook,
  type RegisteredFilter,
} from './hooks/hook-types';


// Database types
export {
  type PaginatedResult,
  type QueryOptions,
} from './types/database';