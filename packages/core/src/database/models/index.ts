// ===================================================================
// DATABASE MODELS INDEX - CLEAN AND SIMPLE
// ===================================================================

// Model exports
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
import { SettingsRepository } from '../repositories/settings-repository';
import { UserRepository } from '../repositories/user-repository';
import { CategoryRepository, PageRepository } from '../repositories/content-repository';
import { UserRole } from '../../types/user';
import { ContentStatus } from '../../types/content';

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

// ===================================================================
// DATABASE INITIALIZATION
// ===================================================================

/**
 * Initialize all database models
 */
export async function initializeModels(): Promise<void> {
  try {
    console.log('Initializing database models...');

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

/**
 * Initialize default data
 */
export async function initializeDefaultData(): Promise<void> {
  try {
    console.log('Initializing default data...');

    // Initialize default settings
    const settingRepo = new SettingsRepository();
    await settingRepo.initializeDefaults();

    // Create default admin user if none exists
    const userRepo = new UserRepository();
    const adminExists = await userRepo.findByRole(UserRole.SUPER_ADMIN);
    
    if (adminExists.length === 0) {
      await userRepo.create({
        email: 'admin@modular-app.com',
        username: 'admin',
        password: 'admin123',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        status: 'active',
        emailVerified: true,
        metadata: {
          source: 'admin',
        },
      });
      
      console.log('Default admin user created');
    }

    // Create default categories
    const categoryRepo = new CategoryRepository();
    const categoriesExist = await categoryRepo.findMany({ parentId: null }); // Fix: use findMany with parentId filter
    
    if (categoriesExist.length === 0) {
      const defaultCategories = [
        { name: 'General', slug: 'general', description: 'General posts and content' },
        { name: 'Technology', slug: 'technology', description: 'Technology-related content' },
        { name: 'Business', slug: 'business', description: 'Business and entrepreneurship' },
      ];

      for (const cat of defaultCategories) {
        await categoryRepo.create(cat);
      }
      
      console.log('Default categories created');
    }

    // Create default homepage
    const pageRepo = new PageRepository();
    const homepage = await pageRepo.getHomepage(); // Fix: use getHomepage() method
    
    if (!homepage) {
      const adminUser = await userRepo.findByRole(UserRole.SUPER_ADMIN);
      if (adminUser.length > 0) {
        await pageRepo.create({
          title: 'Welcome to Modular App',
          slug: 'home',
          status: ContentStatus.PUBLISHED,
          author: adminUser[0]?.id,
          meta: {
            isHomepage: true,
            showInMenu: true,
          },
          publishedAt: new Date(),
        });
        
        console.log('Default homepage created');
      }
    }

    console.log('Default data initialization completed');
  } catch (error) {
    console.error('Error initializing default data:', error);
    throw error;
  }
}

/**
 * Model validation helper
 */
export function validateModelName(name: string): name is ModelName {
  return name in MODELS;
}

/**
 * Get model by name
 */
export function getModel(name: ModelName) {
  if (!validateModelName(name)) {
    throw new Error(`Invalid model name: ${name}`);
  }
  return MODELS[name]();
}

/**
 * Database health check
 */
export async function checkModelHealth() {
  try {
    const health = {
      modelsRegistered: Object.keys(MODELS).length,
      collections: Object.values(COLLECTION_NAMES),
      timestamp: new Date(),
      status: 'healthy' as 'healthy' | 'unhealthy',
      details: {} as Record<string, any>,
    };

    // Test each model
    for (const [name, modelGetter] of Object.entries(MODELS)) {
      try {
        const model = modelGetter();
        const count = await model.countDocuments();
        health.details[name] = {
          status: 'healthy',
          documentCount: count,
          collectionName: model.collection.name,
        };
      } catch (error) {
        health.details[name] = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        health.status = 'unhealthy';
      }
    }

    return health;
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      modelsRegistered: 0,
      collections: [],
      timestamp: new Date(),
      status: 'error' as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Database initialization for new installations
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Starting database initialization...');

    // 1. Initialize models
    await initializeModels();

    // 2. Check database health
    const health = await checkModelHealth();
    if (health.status !== 'healthy') {
      throw new Error('Database health check failed');
    }

    // 3. Initialize default data
    await initializeDefaultData();

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// ===================================================================
// DEFAULT EXPORT
// ===================================================================

export default {
  // Models
  MODEL_NAMES,
  COLLECTION_NAMES,
  MODELS,
  
  // Initialization
  initializeModels,
  initializeDefaultData,
  initializeDatabase,
  
  // Health and monitoring
  checkModelHealth,
  
  // Utilities
  validateModelName,
  getModel,
};