import { Types } from 'mongoose';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { HookManager } from '../hooks/hook-manager';
import { CacheManager } from '../cache/cache-manager';
import { Sanitizer } from '../utils/sanitizer';
import { Validator } from '../utils/validator';
import { EventType } from '../events/event-types';
import { CoreHooks, CoreFilters } from '../hooks/hook-types';
import { PaginatedResult, QueryOptions } from '../types/database';
import { type IPost, type IPage, type ICategory, type ITag, type IComment } from '../database/models';
import { ContentStats, ContentStatus, ContentType } from '../types/content';
import { CategoryRepository, CommentRepository, PageRepository, PostRepository, TagRepository } from '../database/repositories/content-repository';

export interface ContentManagerConfig {
  cacheEnabled: boolean;
  cacheTTL: number;
  autoSave: boolean;
  autoSaveInterval: number;
  revisionsEnabled: boolean;
  maxRevisions: number;
  slugAutoGenerate: boolean;
  allowDuplicateSlugs: boolean;
  enableComments: boolean;
  moderateComments: boolean;
}

export interface ContentQuery {
  status?: ContentStatus[];
  type?: ContentType[];
  author?: Types.ObjectId;
  categories?: Types.ObjectId[];
  tags?: string[];
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  featured?: boolean;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}


export interface BulkOperation {
  action: 'publish' | 'unpublish' | 'delete' | 'trash' | 'restore';
  contentType: 'post' | 'page' | 'comment';
  ids: string[];
  options?: Record<string, any>;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Content Manager
 * Manages all content operations including posts, pages, categories, tags, and comments
 */
export class ContentManager {
  private static instance: ContentManager;
  private logger = new Logger('ContentManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private hooks = HookManager.getInstance();
  private cache = CacheManager.getInstance();
  private postRepo = new PostRepository();
  private pageRepo = new PageRepository();
  private categoryRepo = new CategoryRepository();
  private tagRepo = new TagRepository();
  private commentRepo = new CommentRepository();
  private initialized = false;
  private autoSaveTimers = new Map<string, NodeJS.Timeout>();

  private readonly defaultConfig: ContentManagerConfig = {
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour
    autoSave: true,
    autoSaveInterval: 30000, // 30 seconds
    revisionsEnabled: true,
    maxRevisions: 10,
    slugAutoGenerate: true,
    allowDuplicateSlugs: false,
    enableComments: true,
    moderateComments: true,
  };

  private constructor() {}

  public static getInstance(): ContentManager {
    if (!ContentManager.instance) {
      ContentManager.instance = new ContentManager();
    }
    return ContentManager.instance;
  }

  /**
   * Initialize content manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Content manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Content Manager...');

      // Register content hooks
      await this.registerHooks();

      // Setup auto-save cleanup
      process.on('exit', () => this.cleanup());
      process.on('SIGINT', () => this.cleanup());
      process.on('SIGTERM', () => this.cleanup());

      this.initialized = true;
      this.logger.info('Content Manager initialized successfully');

      await this.events.emit(EventType.SYSTEM_INIT, {
        component: 'ContentManager',
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Failed to initialize Content Manager:', error);
      throw error;
    }
  }

  // ===================================================================
  // POST OPERATIONS
  // ===================================================================

  /**
   * Create new post
   */
  public async createPost(postData: Partial<IPost>): Promise<IPost> {
    try {
      this.logger.debug('Creating new post', { title: postData.title });

      // Validate input
      const validation = Validator.validate(Validator.postCreateSchema, postData);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors.message}`);
      }

      // Sanitize content
      const sanitizedData = await this.sanitizePostData(postData);

      // Generate slug if needed
      if (!sanitizedData.slug && this.defaultConfig.slugAutoGenerate) {
        sanitizedData.slug = await this.generateSlug(sanitizedData.title!, 'post');
      }

      // Apply before_create hook
      await this.hooks.doAction(CoreHooks.CONTENT_BEFORE_CREATE, sanitizedData);

      // Create post
      const post = await this.postRepo.create(sanitizedData);

      // Clear cache
      await this.clearContentCache('posts');

      // Apply after_create hook
      await this.hooks.doAction(CoreHooks.CONTENT_CREATED, post);

      this.logger.info('Post created successfully', {
        id: post._id,
        title: post.title,
        status: post.status,
      });

      return post;

    } catch (error) {
      this.logger.error('Error creating post:', error);
      throw error;
    }
  }

  /**
   * Update existing post
   */
  public async updatePost(id: string, updateData: Partial<IPost>): Promise<IPost | null> {
    try {
      this.logger.debug('Updating post', { id, fields: Object.keys(updateData) });

      // Get existing post
      const existingPost = await this.postRepo.findById(id);
      if (!existingPost) {
        throw new Error('Post not found');
      }

      // Sanitize update data
      const sanitizedData = await this.sanitizePostData(updateData);

      // Apply before_update hook
      await this.hooks.doAction(CoreHooks.CONTENT_BEFORE_UPDATE, {
        id,
        existing: existingPost,
        updates: sanitizedData,
      });

      // Update post
      const updatedPost = await this.postRepo.updateById(id, sanitizedData);

      if (updatedPost) {
        // Clear cache
        await this.clearContentCache('posts', id);

        // Apply after_update hook
        await this.hooks.doAction(CoreHooks.CONTENT_UPDATED, updatedPost);

        this.logger.info('Post updated successfully', {
          id: updatedPost._id,
          title: updatedPost.title,
        });
      }

      return updatedPost;

    } catch (error) {
      this.logger.error('Error updating post:', error);
      throw error;
    }
  }

  /**
   * Publish post
   */
  public async publishPost(id: string): Promise<IPost | null> {
    try {
      const post = await this.postRepo.findById(id);
      if (!post) {
        throw new Error('Post not found');
      }

      // Apply before_publish hook
      await this.hooks.doAction(CoreHooks.CONTENT_BEFORE_PUBLISH, post);

      // Update status and publish date
      const updatedPost = await this.postRepo.updateById(id, {
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      });

      if (updatedPost) {
        // Clear cache
        await this.clearContentCache('posts');

        // Apply after_publish hook
        await this.hooks.doAction(CoreHooks.CONTENT_PUBLISHED, updatedPost);

        this.logger.info('Post published successfully', {
          id: updatedPost._id,
          title: updatedPost.title,
        });
      }

      return updatedPost;

    } catch (error) {
      this.logger.error('Error publishing post:', error);
      throw error;
    }
  }

  /**
   * Get posts with pagination and filtering
   */
  public async getPosts(query: ContentQuery = {}): Promise<PaginatedResult<IPost>> {
    try {
      const cacheKey = `posts:${JSON.stringify(query)}`;
      
      // Check cache first
      if (this.defaultConfig.cacheEnabled) {
        const cached = await this.cache.get<PaginatedResult<IPost>>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Build query filter
      const filter = this.buildContentFilter(query);
      
      // Get posts with pagination
      const result = await this.postRepo.paginate(filter, {
        page: query.page || 1,
        limit: query.limit || 10,
        sort: query.sort || { createdAt: -1 },
      });

      // Apply filter hook
      const filteredResult = await this.hooks.applyFilters(
        CoreFilters.DATABASE_RESULTS,
        result
      );

      // Cache result
      if (this.defaultConfig.cacheEnabled) {
        await this.cache.set(cacheKey, filteredResult, this.defaultConfig.cacheTTL);
      }

      return filteredResult;

    } catch (error) {
      this.logger.error('Error getting posts:', error);
      throw error;
    }
  }

  // ===================================================================
  // PAGE OPERATIONS
  // ===================================================================

  /**
   * Create new page
   */
  public async createPage(pageData: Partial<IPage>): Promise<IPage> {
    try {
      this.logger.debug('Creating new page', { title: pageData.title });

      // Validate input
      const validation = Validator.validate(Validator.pageCreateSchema, pageData);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors.message}`);
      }

      // Sanitize content
      const sanitizedData = await this.sanitizePageData(pageData);

      // Generate slug if needed
      if (!sanitizedData.slug && this.defaultConfig.slugAutoGenerate) {
        sanitizedData.slug = await this.generateSlug(sanitizedData.title!, 'page');
      }

      // Apply before_create hook
      await this.hooks.doAction(CoreHooks.CONTENT_BEFORE_CREATE, sanitizedData);

      // Create page
      const page = await this.pageRepo.create(sanitizedData);

      // Clear cache
      await this.clearContentCache('pages');

      // Apply after_create hook
      await this.hooks.doAction(CoreHooks.CONTENT_CREATED, page);

      this.logger.info('Page created successfully', {
        id: page._id,
        title: page.title,
        status: page.status,
      });

      return page;

    } catch (error) {
      this.logger.error('Error creating page:', error);
      throw error;
    }
  }

  /**
   * Get pages with hierarchy
   */
  public async getPages(query: ContentQuery = {}): Promise<PaginatedResult<IPage>> {
    try {
      const cacheKey = `pages:${JSON.stringify(query)}`;
      
      // Check cache first
      if (this.defaultConfig.cacheEnabled) {
        const cached = await this.cache.get<PaginatedResult<IPage>>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Build query filter
      const filter = this.buildContentFilter(query);
      
      // Get pages with pagination
      const result = await this.pageRepo.paginate(filter, {
        page: query.page || 1,
        limit: query.limit || 10,
        sort: query.sort || { menuOrder: 1, createdAt: -1 },
      });

      // Apply filter hook
      const filteredResult = await this.hooks.applyFilters(
        CoreFilters.DATABASE_RESULTS,
        result
      );

      // Cache result
      if (this.defaultConfig.cacheEnabled) {
        await this.cache.set(cacheKey, filteredResult, this.defaultConfig.cacheTTL);
      }

      return filteredResult;

    } catch (error) {
      this.logger.error('Error getting pages:', error);
      throw error;
    }
  }

  // ===================================================================
  // TAXONOMY OPERATIONS
  // ===================================================================

  /**
   * Create category
   */
  public async createCategory(categoryData: Partial<ICategory>): Promise<ICategory> {
    try {
      const sanitizedData: Partial<ICategory> = {
        ...categoryData,
        name: Sanitizer.sanitizeText(categoryData.name || ''),
        slug: categoryData.slug || Sanitizer.sanitizeSlug(categoryData.name || ''),
      };
      if (categoryData.description) {
        sanitizedData.description = Sanitizer.sanitizeHtml(categoryData.description);
      }

      const category = await this.categoryRepo.create(sanitizedData);
      await this.clearContentCache('categories');

      this.logger.info('Category created successfully', {
        id: category._id,
        name: category.name,
      });

      return category;

    } catch (error) {
      this.logger.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Create tag
   */
  public async createTag(tagData: Partial<ITag>): Promise<ITag> {
    try {
      const sanitizedData: Partial<ITag> = {
        ...tagData,
        name: Sanitizer.sanitizeText(tagData.name || ''),
        slug: tagData.slug || Sanitizer.sanitizeSlug(tagData.name || ''),
      };
      if (tagData.description) {
        sanitizedData.description = Sanitizer.sanitizeHtml(tagData.description);
      }

      const tag = await this.tagRepo.create(sanitizedData);
      await this.clearContentCache('tags');

      this.logger.info('Tag created successfully', {
        id: tag._id,
        name: tag.name,
      });

      return tag;

    } catch (error) {
      this.logger.error('Error creating tag:', error);
      throw error;
    }
  }

  // ===================================================================
  // COMMENT OPERATIONS
  // ===================================================================

  /**
   * Create comment
   */
  public async createComment(commentData: Partial<IComment>): Promise<IComment> {
    try {
      const config = await this.config.get('content', this.defaultConfig);

      if (!config.enableComments) {
        throw new Error('Comments are disabled');
      }

      const sanitizedData = {
        ...commentData,
        content: Sanitizer.sanitizeHtml(commentData.content || ''),
        'author.name': Sanitizer.sanitizeText(commentData.author?.name || ''),
        'author.email': Sanitizer.sanitizeEmail(commentData.author?.email || ''),
        'author.website': commentData.author?.website ? 
          Sanitizer.sanitizeUrl(commentData.author.website) : undefined,
        status: config.moderateComments ? 'pending' as 'pending' : 'approved' as 'approved',
      };

      const comment = await this.commentRepo.create(sanitizedData);
      await this.clearContentCache('comments');

      this.logger.info('Comment created successfully', {
        id: comment._id,
        postId: comment.postId,
        status: comment.status,
      });

      return comment;

    } catch (error) {
      this.logger.error('Error creating comment:', error);
      throw error;
    }
  }

  // ===================================================================
  // BULK OPERATIONS
  // ===================================================================

  /**
   * Perform bulk operation on content
   */
  public async bulkOperation(operation: BulkOperation): Promise<BulkOperationResult> {
    try {
      this.logger.info('Performing bulk operation', {
        action: operation.action,
        contentType: operation.contentType,
        count: operation.ids.length,
      });

      const result: BulkOperationResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const id of operation.ids) {
        try {
          await this.performSingleBulkOperation(operation, id);
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Clear relevant cache
      await this.clearContentCache(operation.contentType + 's');

      this.logger.info('Bulk operation completed', result);

      return result;

    } catch (error) {
      this.logger.error('Error in bulk operation:', error);
      throw error;
    }
  }

  // ===================================================================
  // STATISTICS
  // ===================================================================

  
/**
 * Get content statistics
 */
public async getStats(): Promise<ContentStats> {
  try {
    const cacheKey = 'content:stats';
    
    // Check cache first
    if (this.defaultConfig.cacheEnabled) {
      const cached = await this.cache.get<ContentStats>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Call the correct repository methods
    const [postStats, pageStats, categoryCount, tagCount, commentStats] = await Promise.all([
      this.postRepo.getPostStats(),    // Fix: Use getPostStats instead of getStats
      this.pageRepo.getPageStats(),    // Fix: Use getPageStats instead of getStats
      this.categoryRepo.count(),
      this.tagRepo.count(),
      this.commentRepo.getCommentStats(), // Fix: Use getCommentStats instead of getStats
    ]);

    // The repository methods now return the correct structure that matches ContentStats
    const stats: ContentStats = {
      posts: {
        total: postStats.total,
        published: postStats.published,
        draft: postStats.draft,
        pending: postStats.pending,
      },
      pages: {
        total: pageStats.total,
        published: pageStats.published,
        draft: pageStats.draft,
      },
      categories: categoryCount,
      tags: tagCount,
      comments: {
        total: commentStats.total,
        approved: commentStats.approved,
        pending: commentStats.pending,
        spam: commentStats.spam,
      },
      recentActivity: [], // Would be populated from activity log
    };

    // Cache stats
    if (this.defaultConfig.cacheEnabled) {
      await this.cache.set(cacheKey, stats, 300); // 5 minutes
    }

    return stats;

  } catch (error) {
    this.logger.error('Error getting content stats:', error);
    throw error;
  }
}

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  /**
   * Register content hooks
   */
  private async registerHooks(): Promise<void> {
    // Register content render filter
    await this.hooks.addFilter(CoreFilters.CONTENT_RENDER, async (content: string) => {
      // Apply content filters
      return Sanitizer.sanitizeHtml(content);
    });
  }

  /**
   * Sanitize post data
   */
  private async sanitizePostData(data: Partial<IPost>): Promise<Partial<IPost>> {
    const sanitized: Partial<IPost> = { ...data };

    if (sanitized.title) {
      sanitized.title = Sanitizer.sanitizeText(sanitized.title);
    }

    if (sanitized.content) {
      sanitized.content = Sanitizer.sanitizeHtml(sanitized.content);
    }

    if (sanitized.excerpt) {
      sanitized.excerpt = Sanitizer.sanitizeText(sanitized.excerpt);
    }

    if (sanitized.slug) {
      sanitized.slug = Sanitizer.sanitizeSlug(sanitized.slug);
    }

    return sanitized;
  }

  /**
   * Sanitize page data
   */
  private async sanitizePageData(data: Partial<IPage>): Promise<Partial<IPage>> {
    const sanitized: Partial<IPage> = { ...data };

    if (sanitized.title) {
      sanitized.title = Sanitizer.sanitizeText(sanitized.title);
    }

    if (sanitized.content) {
      sanitized.content = Sanitizer.sanitizeHtml(sanitized.content);
    }

    if (sanitized.slug) {
      sanitized.slug = Sanitizer.sanitizeSlug(sanitized.slug);
    }

    return sanitized;
  }

  /**
   * Generate unique slug
   */
  private async generateSlug(title: string, type: 'post' | 'page'): Promise<string> {
    const baseSlug = Sanitizer.sanitizeSlug(title);
    let slug = baseSlug;
    let counter = 1;

    const repo = type === 'post' ? this.postRepo : this.pageRepo;

    while (true) {
      const existing = await repo.findOne({ slug });
      if (!existing) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Build content filter from query
   */
  private buildContentFilter(query: ContentQuery): Record<string, any> {
    const filter: Record<string, any> = {};

    if (query.status && query.status.length > 0) {
      filter.status = { $in: query.status };
    }

    if (query.author) {
      filter.author = query.author;
    }

    if (query.categories && query.categories.length > 0) {
      filter.categories = { $in: query.categories };
    }

    if (query.tags && query.tags.length > 0) {
      filter.tags = { $in: query.tags };
    }

    if (query.featured !== undefined) {
      filter.featured = query.featured;
    }

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) filter.createdAt.$gte = query.dateFrom;
      if (query.dateTo) filter.createdAt.$lte = query.dateTo;
    }

    return filter;
  }

  /**
   * Perform single bulk operation
   */
  private async performSingleBulkOperation(operation: BulkOperation, id: string): Promise<void> {
    const repo = this.getRepositoryByType(operation.contentType);

    switch (operation.action) {
      case 'publish':
        await repo.updateById(id, { 
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date(),
        });
        break;

      case 'unpublish':
        await repo.updateById(id, { 
          status: ContentStatus.DRAFT,
        });
        break;

      case 'delete':
        await repo.deleteById(id);
        break;

      case 'trash':
        await repo.updateById(id, { 
          status: ContentStatus.TRASH,
        });
        break;

      case 'restore':
        await repo.updateById(id, { 
          status: ContentStatus.DRAFT,
        });
        break;
    }
  }

  /**
   * Get repository by content type
   */
  private getRepositoryByType(type: string) {
    switch (type) {
      case 'post': return this.postRepo;
      case 'page': return this.pageRepo;
      case 'comment': return this.commentRepo;
      default: throw new Error(`Unknown content type: ${type}`);
    }
  }

  /**
   * Clear content cache
   */
  private async clearContentCache(type?: string, id?: string): Promise<void> {
    if (!this.defaultConfig.cacheEnabled) return;

    if (id) {
      await this.cache.delete(`${type}:${id}`);
    }

    if (type) {
      const pattern = `${type}:*`;
      await this.cache.deletePattern(pattern);
    }

    // Clear stats cache
    await this.cache.delete('content:stats');
  }

  /**
   * Cleanup auto-save timers
   */
  private cleanup(): void {
    for (const timer of this.autoSaveTimers.values()) {
      clearInterval(timer);
    }
    this.autoSaveTimers.clear();
  }
}

/**
 * Default content manager instance
 */
export const contentManager = ContentManager.getInstance();

export default ContentManager;