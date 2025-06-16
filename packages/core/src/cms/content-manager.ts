import { Types } from 'mongoose';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { EventType } from '../events/event-types';
import { HookManager } from '../hooks/hook-manager';
import { CoreHooks, CoreFilters } from '../hooks/hook-types';
import { CacheManager } from '../cache/cache-manager';
import { ConfigManager } from '../config/config-manager';
import { Post, type IPost } from '../database/models/post';
import { Page, type IPage } from '../database/models/page';
import { Category, type ICategory } from '../database/models/taxonomy';
import { Tag, type ITag } from '../database/models/taxonomy';
import { Comment, type IComment } from '../database/models/taxonomy';
import { ContentType, ContentStatus } from '../types/content';
import { PaginatedResult } from '../types/database';
import { Sanitizer } from '../utils/sanitizer';
import { SlugGenerator } from '../utils/slug-generator';

export interface ContentQuery {
  type?: ContentType | ContentType[];
  status?: ContentStatus | ContentStatus[];
  author?: Types.ObjectId | string;
  categories?: Types.ObjectId[] | string[];
  tags?: string[];
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  featured?: boolean;
  sticky?: boolean;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  populate?: string | string[];
}

export interface ContentStats {
  posts: {
    total: number;
    published: number;
    draft: number;
    private: number;
    trending: IPost[];
  };
  pages: {
    total: number;
    published: number;
    draft: number;
  };
  comments: {
    total: number;
    pending: number;
    approved: number;
    spam: number;
  };
  categories: {
    total: number;
    mostUsed: ICategory[];
  };
  tags: {
    total: number;
    trending: ITag[];
  };
}

export interface ContentSearchResult {
  posts: IPost[];
  pages: IPage[];
  total: number;
  took: number;
}

export interface ContentBulkAction {
  action: 'publish' | 'unpublish' | 'delete' | 'trash' | 'restore' | 'update_status';
  ids: string[];
  data?: Record<string, any>;
}

export interface ContentBulkResult {
  success: string[];
  failed: Array<{ id: string; error: string }>;
  total: number;
}

/**
 * Content Manager
 * Manages all content types including posts, pages, comments, categories, and tags
 */
export class ContentManager {
  private static instance: ContentManager;
  private logger: Logger;
  private events: EventManager;
  private hooks: HookManager;
  private cache: CacheManager;
  private config: ConfigManager;
  
  // Repositories
  private postRepo: PostRepository;
  private pageRepo: PageRepository;
  private categoryRepo: CategoryRepository;
  private tagRepo: TagRepository;
  private commentRepo: CommentRepository;
  
  private initialized = false;

  private constructor() {
    this.logger = new Logger('ContentManager');
    this.events = EventManager.getInstance();
    this.hooks = HookManager.getInstance();
    this.cache = CacheManager.getInstance();
    this.config = ConfigManager.getInstance();
    
    // Initialize repositories
    this.postRepo = new PostRepository();
    this.pageRepo = new PageRepository();
    this.categoryRepo = new CategoryRepository();
    this.tagRepo = new TagRepository();
    this.commentRepo = new CommentRepository();
  }

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

      // Setup content hooks
      await this.setupContentHooks();

      // Initialize content cache
      await this.initializeCache();

      this.initialized = true;
      this.logger.info('Content Manager initialized successfully');

      // Emit initialization event
      await this.events.emit(EventType.CMS_INITIALIZED, {
        type: 'content_manager_initialized',
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Failed to initialize Content Manager:', error);
      throw error;
    }
  }

  // ===================================================================
  // POST MANAGEMENT
  // ===================================================================

  /**
   * Create a new post
   */
  public async createPost(data: Partial<IPost>): Promise<IPost> {
    try {
      this.logger.info('Creating new post', { title: data.title });

      // Apply before_create hook
      const hookData = await this.hooks.applyFilters(CoreFilters.CONTENT_RENDER, data, { type: 'post' });

      // Generate slug if not provided
      if (!hookData.slug && hookData.title) {
        hookData.slug = await SlugGenerator.generateUniqueSlug(hookData.title, Post);
      }

      // Sanitize content
      if (hookData.content) {
        hookData.content = Sanitizer.sanitizeHtml(hookData.content);
      }

      // Set default values
      const postData: Partial<IPost> = {
        ...hookData,
        type: ContentType.POST,
        status: hookData.status || ContentStatus.DRAFT,
        meta: {
          allowComments: true,
          isPinned: false,
          isSticky: false,
          isFeatured: false,
          viewCount: 0,
          shareCount: 0,
          likeCount: 0,
          commentCount: 0,
          readingTime: 0,
          seoKeywords: [],
          ...hookData.meta,
        },
        categories: hookData.categories || [],
        tags: hookData.tags || [],
        gallery: hookData.gallery || [],
        customFields: hookData.customFields || new Map(),
        interactions: {
          likes: [],
          bookmarks: [],
          shares: [],
        },
        revisions: [],
      };

      // Create post
      const post = await this.postRepo.create(postData);

      // Update category counts
      if (post.categories?.length) {
        await this.updateCategoryCounts(post.categories);
      }

      // Update tag counts
      if (post.tags?.length) {
        await this.updateTagCounts(post.tags);
      }

      // Clear content cache
      await this.clearContentCache('posts');

      // Execute after_create hook
      await this.hooks.doAction(CoreHooks.CONTENT_CREATED, post);

      // Emit creation event
      await this.events.emit(EventType.CONTENT_CREATED, {
        id: post._id.toString(),
        type: 'post',
        title: post.title,
        author: post.author,
        status: post.status,
        timestamp: new Date(),
      });

      this.logger.info('Post created successfully', { 
        id: post._id, 
        title: post.title,
        status: post.status 
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
  public async updatePost(id: string, data: Partial<IPost>): Promise<IPost | null> {
    try {
      this.logger.info('Updating post', { id });

      const existingPost = await this.postRepo.findById(id);
      if (!existingPost) {
        throw new Error('Post not found');
      }

      // Apply before_update hook
      const hookData = await this.hooks.applyFilters(CoreFilters.CONTENT_RENDER, data, { 
        type: 'post',
        existing: existingPost 
      });

      // Sanitize content if provided
      if (hookData.content) {
        hookData.content = Sanitizer.sanitizeHtml(hookData.content);
      }

      // Update slug if title changed
      if (hookData.title && hookData.title !== existingPost.title) {
        hookData.slug = await SlugGenerator.generateUniqueSlug(hookData.title, Post, id);
      }

      // Update post
      const updatedPost = await this.postRepo.updateById(id, hookData);
      if (!updatedPost) {
        throw new Error('Failed to update post');
      }

      // Update category counts if categories changed
      if (hookData.categories) {
        await this.updateCategoryCounts(hookData.categories);
        if (existingPost.categories?.length) {
          await this.updateCategoryCounts(existingPost.categories);
        }
      }

      // Update tag counts if tags changed
      if (hookData.tags) {
        await this.updateTagCounts(hookData.tags);
        if (existingPost.tags?.length) {
          await this.updateTagCounts(existingPost.tags);
        }
      }

      // Clear cache
      await this.clearContentCache('posts');
      await this.cache.delete(`post:${id}`);

      // Execute after_update hook
      await this.hooks.doAction(CoreHooks.CONTENT_UPDATED, updatedPost);

      // Emit update event
      await this.events.emit(EventType.CONTENT_UPDATED, {
        id: updatedPost._id.toString(),
        type: 'post',
        title: updatedPost.title,
        changes: Object.keys(hookData),
        timestamp: new Date(),
      });

      this.logger.info('Post updated successfully', { 
        id: updatedPost._id, 
        title: updatedPost.title 
      });

      return updatedPost;

    } catch (error) {
      this.logger.error('Error updating post:', error);
      throw error;
    }
  }

  /**
   * Delete post
   */
  public async deletePost(id: string, permanent: boolean = false): Promise<boolean> {
    try {
      this.logger.info('Deleting post', { id, permanent });

      const post = await this.postRepo.findById(id);
      if (!post) {
        throw new Error('Post not found');
      }

      let deleted = false;

      if (permanent) {
        // Permanent deletion
        deleted = await this.postRepo.deleteById(id);
        
        // Update category counts
        if (post.categories?.length) {
          await this.updateCategoryCounts(post.categories, -1);
        }

        // Update tag counts
        if (post.tags?.length) {
          await this.updateTagCounts(post.tags, -1);
        }
      } else {
        // Move to trash
        const trashed = await this.postRepo.updateById(id, { 
          status: ContentStatus.TRASH 
        });
        deleted = !!trashed;
      }

      if (deleted) {
        // Clear cache
        await this.clearContentCache('posts');
        await this.cache.delete(`post:${id}`);

        // Execute hook
        await this.hooks.doAction(CoreHooks.CONTENT_DELETED, post);

        // Emit event
        await this.events.emit(EventType.CONTENT_DELETED, {
          id: post._id.toString(),
          type: 'post',
          title: post.title,
          permanent,
          timestamp: new Date(),
        });

        this.logger.info('Post deleted successfully', { id, permanent });
      }

      return deleted;

    } catch (error) {
      this.logger.error('Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Get post by ID
   */
  public async getPost(id: string, useCache: boolean = true): Promise<IPost | null> {
    try {
      // Check cache first
      if (useCache) {
        const cached = await this.cache.get(`post:${id}`);
        if (cached) {
          return cached;
        }
      }

      const post = await this.postRepo.findById(id, {
        populate: ['author', 'categories'],
      });

      if (post && useCache) {
        await this.cache.set(`post:${id}`, post, 300); // 5 minutes
      }

      return post;

    } catch (error) {
      this.logger.error('Error getting post:', error);
      throw error;
    }
  }

  /**
   * Get posts with pagination and filtering
   */
  public async getPosts(query: ContentQuery = {}): Promise<PaginatedResult<IPost>> {
    try {
      // Build filter
      const filter: any = { type: ContentType.POST };

      if (query.status) {
        filter.status = Array.isArray(query.status) ? { $in: query.status } : query.status;
      }

      if (query.author) {
        filter.author = typeof query.author === 'string' ? new Types.ObjectId(query.author) : query.author;
      }

      if (query.categories?.length) {
        filter.categories = { 
          $in: query.categories.map(cat => 
            typeof cat === 'string' ? new Types.ObjectId(cat) : cat
          )
        };
      }

      if (query.tags?.length) {
        filter.tags = { $in: query.tags };
      }

      if (query.featured !== undefined) {
        filter['meta.isFeatured'] = query.featured;
      }

      if (query.sticky !== undefined) {
        filter['meta.isSticky'] = query.sticky;
      }

      if (query.search) {
        filter.$text = { $search: query.search };
      }

      if (query.dateFrom || query.dateTo) {
        filter.createdAt = {};
        if (query.dateFrom) filter.createdAt.$gte = query.dateFrom;
        if (query.dateTo) filter.createdAt.$lte = query.dateTo;
      }

      // Pagination options
      const options = {
        page: query.page || 1,
        limit: query.limit || 10,
        sort: query.sort || { createdAt: -1 },
        populate: query.populate || ['author', 'categories'],
      };

      return await this.postRepo.paginate(filter, options);

    } catch (error) {
      this.logger.error('Error getting posts:', error);
      throw error;
    }
  }

  /**
   * Publish post
   */
  public async publishPost(id: string): Promise<IPost | null> {
    try {
      const post = await this.updatePost(id, {
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      });

      if (post) {
        await this.events.emit(EventType.CONTENT_PUBLISHED, {
          id: post.id.toString(),
          type: 'post',
          title: post.title,
          timestamp: new Date(),
        });

        await this.hooks.doAction(CoreHooks.CONTENT_PUBLISHED, post);
      }

      return post;

    } catch (error) {
      this.logger.error('Error publishing post:', error);
      throw error;
    }
  }

  // ===================================================================
  // PAGE MANAGEMENT
  // ===================================================================

  /**
   * Create a new page
   */
  public async createPage(data: Partial<IPage>): Promise<IPage> {
    try {
      this.logger.info('Creating new page', { title: data.title });

      // Generate slug if not provided
      if (!data.slug && data.title) {
        data.slug = await SlugGenerator.generateUniqueSlug(data.title, Page);
      }

      // Sanitize content
      if (data.content) {
        data.content = Sanitizer.sanitizeHtml(data.content);
      }

      // Set default values
      const pageData: Partial<IPage> = {
        ...data,
        type: ContentType.PAGE,
        status: data.status || ContentStatus.DRAFT,
        menuOrder: data.menuOrder || 0,
        meta: {
          showInMenu: true,
          isHomepage: false,
          allowComments: false,
          ...data.meta,
        },
        customFields: data.customFields || new Map(),
      };

      const page = await this.pageRepo.create(pageData);

      // Clear cache
      await this.clearContentCache('pages');

      // Execute hook
      await this.hooks.doAction(CoreHooks.CONTENT_CREATED, page);

      // Emit event
      await this.events.emit(EventType.CONTENT_CREATED, {
        id: page._id.toString(),
        type: 'page',
        title: page.title,
        author: page.author,
        status: page.status,
        timestamp: new Date(),
      });

      this.logger.info('Page created successfully', { 
        id: page._id, 
        title: page.title 
      });

      return page;

    } catch (error) {
      this.logger.error('Error creating page:', error);
      throw error;
    }
  }

  /**
   * Get page by ID
   */
  public async getPage(id: string, useCache: boolean = true): Promise<IPage | null> {
    try {
      // Check cache first
      if (useCache) {
        const cached = await this.cache.get(`page:${id}`);
        if (cached) {
          return cached;
        }
      }

      const page = await this.pageRepo.findById(id, {
        populate: ['author', 'parentId'],
      });

      if (page && useCache) {
        await this.cache.set(`page:${id}`, page, 300); // 5 minutes
      }

      return page;

    } catch (error) {
      this.logger.error('Error getting page:', error);
      throw error;
    }
  }

  // ===================================================================
  // SEARCH & STATISTICS
  // ===================================================================

  /**
   * Search content across all types
   */
  public async searchContent(query: string, options: {
    types?: ContentType[];
    limit?: number;
    status?: ContentStatus[];
  } = {}): Promise<ContentSearchResult> {
    const startTime = Date.now();

    try {
      const searchTypes = options.types || [ContentType.POST, ContentType.PAGE];
      const limit = options.limit || 20;
      const status = options.status || [ContentStatus.PUBLISHED];

      const results: ContentSearchResult = {
        posts: [],
        pages: [],
        total: 0,
        took: 0,
      };

      // Search posts
      if (searchTypes.includes(ContentType.POST)) {
        const postResults = await this.getPosts({
          search: query,
          status,
          limit: Math.ceil(limit / searchTypes.length),
        });
        results.posts = postResults.data;
        results.total += postResults.pagination.total;
      }

      // Search pages
      if (searchTypes.includes(ContentType.PAGE)) {
        const pageResults = await this.pageRepo.search({
          query,
          limit: Math.ceil(limit / searchTypes.length),
        }, {
          status: { $in: status },
        });
        results.pages = pageResults;
        results.total += pageResults.length;
      }

      results.took = Date.now() - startTime;

      return results;

    } catch (error) {
      this.logger.error('Error searching content:', error);
      throw error;
    }
  }

  /**
   * Get content statistics
   */
  public async getStats(): Promise<ContentStats> {
    try {
      const [
        postStats,
        pageStats,
        commentStats,
        categoryStats,
        tagStats,
      ] = await Promise.all([
        this.getPostStats(),
        this.getPageStats(),
        this.getCommentStats(),
        this.getCategoryStats(),
        this.getTagStats(),
      ]);

      return {
        posts: postStats,
        pages: pageStats,
        comments: commentStats,
        categories: categoryStats,
        tags: tagStats,
      };

    } catch (error) {
      this.logger.error('Error getting content stats:', error);
      throw error;
    }
  }

  /**
   * Bulk content operations
   */
  public async bulkAction(action: ContentBulkAction): Promise<ContentBulkResult> {
    try {
      this.logger.info('Executing bulk content action', { 
        action: action.action,
        count: action.ids.length 
      });

      const result: ContentBulkResult = {
        success: [],
        failed: [],
        total: action.ids.length,
      };

      for (const id of action.ids) {
        try {
          switch (action.action) {
            case 'publish':
              await this.publishPost(id);
              break;
            case 'unpublish':
              await this.updatePost(id, { status: ContentStatus.DRAFT });
              break;
            case 'delete':
              await this.deletePost(id, false);
              break;
            case 'trash':
              await this.updatePost(id, { status: ContentStatus.TRASH });
              break;
            case 'update_status':
              if (action.data?.status) {
                await this.updatePost(id, { status: action.data.status });
              }
              break;
          }
          result.success.push(id);
        } catch (error) {
          result.failed.push({
            id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.logger.info('Bulk action completed', {
        action: action.action,
        success: result.success.length,
        failed: result.failed.length,
      });

      return result;

    } catch (error) {
      this.logger.error('Error executing bulk action:', error);
      throw error;
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  /**
   * Setup content-related hooks
   */
  private async setupContentHooks(): Promise<void> {
    try {
      // Register content filters
      this.hooks.addFilter(CoreFilters.CONTENT_RENDER, async (content: string, post: IPost) => {
        // Apply content rendering filters
        return content;
      }, { priority: 10 });

      this.logger.debug('Content hooks setup completed');
    } catch (error) {
      this.logger.error('Error setting up content hooks:', error);
    }
  }

  /**
   * Initialize content cache
   */
  private async initializeCache(): Promise<void> {
    try {
      // Preload frequently accessed content
      // Implementation depends on cache strategy
      this.logger.debug('Content cache initialized');
    } catch (error) {
      this.logger.warn('Error initializing content cache:', error);
    }
  }

  /**
   * Clear content cache
   */
  private async clearContentCache(type?: string): Promise<void> {
    try {
      const patterns = type ? [`${type}:*`] : ['posts:*', 'pages:*', 'content:*'];
      
      for (const pattern of patterns) {
        await this.cache.deletePattern(pattern);
      }
    } catch (error) {
      this.logger.warn('Error clearing content cache:', error);
    }
  }

  /**
   * Update category counts
   */
  private async updateCategoryCounts(categoryIds: Types.ObjectId[], increment: number = 1): Promise<void> {
    try {
      for (const categoryId of categoryIds) {
        await this.categoryRepo.updateById(categoryId.toString(), {
          $inc: { count: increment }
        });
      }
    } catch (error) {
      this.logger.warn('Error updating category counts:', error);
    }
  }

  /**
   * Update tag counts
   */
  private async updateTagCounts(tags: string[], increment: number = 1): Promise<void> {
    try {
      for (const tagName of tags) {
        await this.tagRepo.updateOne(
          { name: tagName },
          { $inc: { count: increment } },
          { upsert: true }
        );
      }
    } catch (error) {
      this.logger.warn('Error updating tag counts:', error);
    }
  }

  /**
   * Get post statistics
   */
  private async getPostStats(): Promise<ContentStats['posts']> {
    const [total, published, draft, privateCount, trending] = await Promise.all([
      this.postRepo.count({ type: ContentType.POST }),
      this.postRepo.count({ type: ContentType.POST, status: ContentStatus.PUBLISHED }),
      this.postRepo.count({ type: ContentType.POST, status: ContentStatus.DRAFT }),
      this.postRepo.count({ type: ContentType.POST, status: ContentStatus.PRIVATE }),
      this.postRepo.findMany(
        { type: ContentType.POST, status: ContentStatus.PUBLISHED },
        { 
          sort: { 'meta.viewCount': -1 },
          limit: 5,
          populate: ['author']
        }
      ),
    ]);

    return {
      total,
      published,
      draft,
      private: privateCount,
      trending,
    };
  }

  /**
   * Get page statistics
   */
  private async getPageStats(): Promise<ContentStats['pages']> {
    const [total, published, draft] = await Promise.all([
      this.pageRepo.count({ type: ContentType.PAGE }),
      this.pageRepo.count({ type: ContentType.PAGE, status: ContentStatus.PUBLISHED }),
      this.pageRepo.count({ type: ContentType.PAGE, status: ContentStatus.DRAFT }),
    ]);

    return { total, published, draft };
  }

  /**
   * Get comment statistics
   */
  private async getCommentStats(): Promise<ContentStats['comments']> {
    const [total, pending, approved, spam] = await Promise.all([
      this.commentRepo.count({}),
      this.commentRepo.count({ status: 'pending' }),
      this.commentRepo.count({ status: 'approved' }),
      this.commentRepo.count({ status: 'spam' }),
    ]);

    return { total, pending, approved, spam };
  }

  /**
   * Get category statistics
   */
  private async getCategoryStats(): Promise<ContentStats['categories']> {
    const [total, mostUsed] = await Promise.all([
      this.categoryRepo.count({}),
      this.categoryRepo.findMany({}, { sort: { count: -1 }, limit: 10 }),
    ]);

    return { total, mostUsed };
  }

  /**
   * Get tag statistics
   */
  private async getTagStats(): Promise<ContentStats['tags']> {
    const [total, trending] = await Promise.all([
      this.tagRepo.count({}),
      this.tagRepo.findMany({}, { sort: { count: -1 }, limit: 10 }),
    ]);

    return { total, trending };
  }
}

export default ContentManager;