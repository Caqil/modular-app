// Database Models Index
// Centralized exports for all database models

export { User, type IUser } from './user';
export { Post, type IPost } from './post';
export { Page, type IPage } from './page';
export { Media, type IMedia } from './media';
export { Category, type ICategory } from './taxonomy';
export { Tag, type ITag } from './taxonomy';
export { Comment, type IComment } from './taxonomy';
export { Plugin, type IPlugin } from './plugin';
export { Theme, type ITheme } from './theme';
export { Setting, type ISetting } from './setting';

// Model collection names for reference
export const MODEL_NAMES = {
  USER: 'User',
  POST: 'Post',
  PAGE: 'Page',
  MEDIA: 'Media',
  CATEGORY: 'Category',
  TAG: 'Tag',
  COMMENT: 'Comment',
  PLUGIN: 'Plugin',
  THEME: 'Theme',
  SETTING: 'Setting',
} as const;

// Collection names for direct MongoDB operations
export const COLLECTION_NAMES = {
  USERS: 'users',
  POSTS: 'posts',
  PAGES: 'pages',
  MEDIA: 'media',
  CATEGORIES: 'categories',
  TAGS: 'tags',
  COMMENTS: 'comments',
  PLUGINS: 'plugins',
  THEMES: 'themes',
  SETTINGS: 'settings',
} as const;

// Model registry for dynamic access
export const MODELS = {
  [MODEL_NAMES.USER]: () => require('./user').User,
  [MODEL_NAMES.POST]: () => require('./post').Post,
  [MODEL_NAMES.PAGE]: () => require('./page').Page,
  [MODEL_NAMES.MEDIA]: () => require('./media').Media,
  [MODEL_NAMES.CATEGORY]: () => require('./taxonomy').Category,
  [MODEL_NAMES.TAG]: () => require('./taxonomy').Tag,
  [MODEL_NAMES.COMMENT]: () => require('./taxonomy').Comment,
  [MODEL_NAMES.PLUGIN]: () => require('./plugin').Plugin,
  [MODEL_NAMES.THEME]: () => require('./theme').Theme,
  [MODEL_NAMES.SETTING]: () => require('./setting').Setting,
} as const;

// Type helpers
export type ModelName = keyof typeof MODELS;
export type CollectionName = typeof COLLECTION_NAMES[keyof typeof COLLECTION_NAMES];

// Database initialization helper
export async function initializeModels() {
  try {
    // Import all models to ensure they're registered with Mongoose
    await Promise.all([
      import('./user'),
      import('./post'),
      import('./page'),
      import('./media'),
      import('./taxonomy'),
      import('./plugin'),
      import('./theme'),
      import('./setting'),
    ]);
    
    console.log('All database models initialized successfully');
  } catch (error) {
    console.error('Error initializing database models:', error);
    throw error;
  }
}

// Model validation helper
export function validateModelName(name: string): name is ModelName {
  return name in MODELS;
}

// Get model by name
export function getModel(name: ModelName) {
  if (!validateModelName(name)) {
    throw new Error(`Invalid model name: ${name}`);
  }
  return MODELS[name]();
}

// Database health check
export async function checkModelHealth() {
  const health = {
    modelsRegistered: Object.keys(MODELS).length,
    collections: Object.values(COLLECTION_NAMES),
    timestamp: new Date(),
  };
  
  return health;
}