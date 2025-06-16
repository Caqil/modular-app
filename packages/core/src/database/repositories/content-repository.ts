import { Types, FilterQuery } from 'mongoose';
import { BaseRepository } from './base-repository';
import { Post, Page, Category, Tag, Comment, type IPost, type IPage, type ICategory, type ITag, type IComment } from '../models';
import { PaginatedResult, QueryOptions } from '../../types/database';
import { ContentStatus, ContentType } from '../../types/content';
import { Sanitizer } from '../../utils/sanitizer';
import { DateUtils } from '../../utils/date-utils';

// ===================================================================
// POST REPOSITORY
// ===================================================================

export interface PostQuery {
  status?: ContentStatus[];
  author?: Types.ObjectId;
  categories?: Types.ObjectId[];
  tags?: string[];
  search?: string;
  featured?: boolean;
  pinned?: boolean;
  sticky?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

export interface PostStats {
  total: number;
  published: number;
  draft: number;
  pending: number;
  trash: number;
  private: number;
  scheduled: number;
  byAuthor: Array<{
    authorId: string;
    count: number;
  }>;
  byCategory: Array<{
    categoryId: string;
    count: number;
  }>;
  recentPosts: Array<{
    id: string;
    title: string;
    author: string;
    createdAt: Date;
  }>;
  popularPosts: Array<{
    id: string;
    title: string;
    viewCount: number;
  }>;
}

export class PostRepository extends BaseRepository<IPost> {
  constructor() {
    super(Post, 'Post');
  }

  /**
   * Search posts with advanced filtering
   */
  async searchPosts(query: PostQuery): Promise<PaginatedResult<IPost>> {
    try {
      const filter = this.buildPostFilter(query);
      
      const options = {
        page: query.page || 1,
        limit: query.limit || 10,
        sort: query.sort || { createdAt: -1 },
      };

      return this.paginate(filter, options);

    } catch (error) {
      this.logger.error('Error searching posts:', error);
      throw error;
    }
  }

  /**
   * Get posts by category
   */
  async getPostsByCategory(categoryId: Types.ObjectId, options: QueryOptions = {}): Promise<IPost[]> {
    try {
      const filter = {
        categories: categoryId,
        status: ContentStatus.PUBLISHED,
      };

      return this.findMany(filter, {
        ...options,
        sort: options.sort || { publishedAt: -1 },
      });

    } catch (error) {
      this.logger.error('Error getting posts by category:', error);
      throw error;
    }
  }

  /**
   * Get posts by tag
   */
  async getPostsByTag(tag: string, options: QueryOptions = {}): Promise<IPost[]> {
    try {
      const filter = {
        tags: tag,
        status: ContentStatus.PUBLISHED,
      };

      return this.findMany(filter, {
        ...options,
        sort: options.sort || { publishedAt: -1 },
      });

    } catch (error) {
      this.logger.error('Error getting posts by tag:', error);
      throw error;
    }
  }

  /**
   * Get posts by author
   */
  async getPostsByAuthor(authorId: Types.ObjectId, options: QueryOptions = {}): Promise<IPost[]> {
    try {
      const filter = {
        author: authorId,
        status: { $ne: ContentStatus.TRASH },
      };

      return this.findMany(filter, {
        ...options,
        sort: options.sort || { createdAt: -1 },
      });

    } catch (error) {
      this.logger.error('Error getting posts by author:', error);
      throw error;
    }
  }

  /**
   * Get featured posts
   */
  async getFeaturedPosts(limit: number = 5): Promise<IPost[]> {
    try {
      return this.findMany(
        {
          'meta.isFeatured': true,
          status: ContentStatus.PUBLISHED,
        },
        {
          limit,
          sort: { publishedAt: -1 },
          populate: 'author categories',
        }
      );

    } catch (error) {
      this.logger.error('Error getting featured posts:', error);
      throw error;
    }
  }

  /**
   * Get popular posts by view count
   */
  async getPopularPosts(limit: number = 10): Promise<IPost[]> {
    try {
      return this.findMany(
        {
          status: ContentStatus.PUBLISHED,
          'meta.viewCount': { $gt: 0 },
        },
        {
          limit,
          sort: { 'meta.viewCount': -1 },
          populate: 'author',
        }
      );

    } catch (error) {
      this.logger.error('Error getting popular posts:', error);
      throw error;
    }
  }

  /**
   * Get related posts
   */
  async getRelatedPosts(postId: Types.ObjectId, limit: number = 5): Promise<IPost[]> {
    try {
      const post = await this.findById(postId);
      if (!post) return [];

      // Find posts with similar categories or tags
      const filter = {
        _id: { $ne: postId },
        status: ContentStatus.PUBLISHED,
        $or: [
          { categories: { $in: post.categories } },
          { tags: { $in: post.tags } },
        ],
      };

      return this.findMany(filter, {
        limit,
        sort: { publishedAt: -1 },
        populate: 'author',
      });

    } catch (error) {
      this.logger.error('Error getting related posts:', error);
      throw error;
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(postId: Types.ObjectId): Promise<boolean> {
    try {
      const result = await this.model.updateOne(
        { _id: postId },
        { $inc: { 'meta.viewCount': 1 } }
      );

      return result.modifiedCount > 0;

    } catch (error) {
      this.logger.error('Error incrementing view count:', error);
      return false;
    }
  }

  /**
   * Get post statistics
   */
  async getPostStats(): Promise<PostStats> {
    try {
      const [
        statusStats,
        authorStats,
        categoryStats,
        recentPosts,
        popularPosts,
      ] = await Promise.all([
        this.getStatusStats(),
        this.getAuthorStats(),
        this.getCategoryStats(),
        this.getRecentPosts(5),
        this.getPopularPosts(5),
      ]);

      return {
        total: statusStats.reduce((sum, stat) => sum + stat.count, 0),
        published: statusStats.find(s => s._id === ContentStatus.PUBLISHED)?.count || 0,
        draft: statusStats.find(s => s._id === ContentStatus.DRAFT)?.count || 0,
        pending: statusStats.find(s => s._id === ContentStatus.PENDING)?.count || 0,
        trash: statusStats.find(s => s._id === ContentStatus.TRASH)?.count || 0,
        private: statusStats.find(s => s._id === ContentStatus.PRIVATE)?.count || 0,
        scheduled: await this.count({ scheduledAt: { $gt: new Date() } }),
        byAuthor: authorStats.map(stat => ({
          authorId: stat._id.toString(),
          count: stat.count,
        })),
        byCategory: categoryStats.map(stat => ({
          categoryId: stat._id.toString(),
          count: stat.count,
        })),
        recentPosts: recentPosts.map(post => ({
          id: post.id.toString(),
          title: post.title,
          author: (post.author as any)?.username || 'Unknown',
          createdAt: post.createdAt,
        })),
        popularPosts: popularPosts.map(post => ({
          id: post.id.toString(),
          title: post.title,
          viewCount: post.meta.viewCount,
        })),
      };

    } catch (error) {
      this.logger.error('Error getting post stats:', error);
      throw error;
    }
  }

  /**
   * Build post filter from query
   */
  private buildPostFilter(query: PostQuery): FilterQuery<IPost> {
    const filter: FilterQuery<IPost> = {};

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
      filter['meta.isFeatured'] = query.featured;
    }

    if (query.pinned !== undefined) {
      filter['meta.isPinned'] = query.pinned;
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

    return filter;
  }

  /**
   * Get status statistics
   */
  private async getStatusStats(): Promise<Array<{ _id: string; count: number }>> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
  }

  /**
   * Get author statistics
   */
  private async getAuthorStats(): Promise<Array<{ _id: Types.ObjectId; count: number }>> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$author',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }

  /**
   * Get category statistics
   */
  private async getCategoryStats(): Promise<Array<{ _id: Types.ObjectId; count: number }>> {
    return this.model.aggregate([
      { $unwind: '$categories' },
      {
        $group: {
          _id: '$categories',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }

  /**
   * Get recent posts
   */
  private async getRecentPosts(limit: number): Promise<IPost[]> {
    return this.findMany(
      { status: { $ne: ContentStatus.TRASH } },
      {
        limit,
        sort: { createdAt: -1 },
        populate: 'author',
      }
    );
  }
}

// ===================================================================
// PAGE REPOSITORY
// ===================================================================

export interface PageQuery {
  status?: ContentStatus[];
  author?: Types.ObjectId;
  parentId?: Types.ObjectId;
  template?: string;
  search?: string;
  showInMenu?: boolean;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

export interface PageStats {
  total: number;
  published: number;
  draft: number;
  private: number;
  trash: number;
  hierarchical: number;
  templates: Array<{
    template: string;
    count: number;
  }>;
}

export class PageRepository extends BaseRepository<IPage> {
  constructor() {
    super(Page, 'Page');
  }

  /**
   * Search pages with filtering
   */
  async searchPages(query: PageQuery): Promise<PaginatedResult<IPage>> {
    try {
      const filter = this.buildPageFilter(query);
      
      const options = {
        page: query.page || 1,
        limit: query.limit || 10,
        sort: query.sort || { menuOrder: 1, createdAt: -1 },
      };

      return this.paginate(filter, options);

    } catch (error) {
      this.logger.error('Error searching pages:', error);
      throw error;
    }
  }

  /**
   * Get page hierarchy
   */
  async getPageHierarchy(): Promise<IPage[]> {
    try {
      const pages = await this.findMany(
        { status: { $ne: ContentStatus.TRASH } },
        {
          sort: { menuOrder: 1, title: 1 },
          populate: 'author',
        }
      );

      return this.buildHierarchy(pages);

    } catch (error) {
      this.logger.error('Error getting page hierarchy:', error);
      throw error;
    }
  }

  /**
   * Get child pages
   */
  async getChildPages(parentId: Types.ObjectId): Promise<IPage[]> {
    try {
      return this.findMany(
        {
          parentId,
          status: { $ne: ContentStatus.TRASH },
        },
        {
          sort: { menuOrder: 1, title: 1 },
        }
      );

    } catch (error) {
      this.logger.error('Error getting child pages:', error);
      throw error;
    }
  }

  /**
   * Get menu pages
   */
  async getMenuPages(): Promise<IPage[]> {
    try {
      return this.findMany(
        {
          'meta.showInMenu': true,
          status: ContentStatus.PUBLISHED,
        },
        {
          sort: { menuOrder: 1, title: 1 },
        }
      );

    } catch (error) {
      this.logger.error('Error getting menu pages:', error);
      throw error;
    }
  }

  /**
   * Get homepage
   */
  async getHomepage(): Promise<IPage | null> {
    try {
      return this.findOne({
        'meta.isHomepage': true,
        status: ContentStatus.PUBLISHED,
      });

    } catch (error) {
      this.logger.error('Error getting homepage:', error);
      throw error;
    }
  }

  /**
   * Get page statistics
   */
  async getPageStats(): Promise<PageStats> {
    try {
      const [statusStats, templateStats] = await Promise.all([
        this.getStatusStats(),
        this.getTemplateStats(),
      ]);

      const hierarchicalCount = await this.count({ parentId: { $ne: null } });

      return {
        total: statusStats.reduce((sum, stat) => sum + stat.count, 0),
        published: statusStats.find(s => s._id === ContentStatus.PUBLISHED)?.count || 0,
        draft: statusStats.find(s => s._id === ContentStatus.DRAFT)?.count || 0,
        private: statusStats.find(s => s._id === ContentStatus.PRIVATE)?.count || 0,
        trash: statusStats.find(s => s._id === ContentStatus.TRASH)?.count || 0,
        hierarchical: hierarchicalCount,
        templates: templateStats.map(stat => ({
          template: stat._id || 'default',
          count: stat.count,
        })),
      };

    } catch (error) {
      this.logger.error('Error getting page stats:', error);
      throw error;
    }
  }

  /**
   * Build page filter from query
   */
  private buildPageFilter(query: PageQuery): FilterQuery<IPage> {
    const filter: FilterQuery<IPage> = {};

    if (query.status && query.status.length > 0) {
      filter.status = { $in: query.status };
    }

    if (query.author) {
      filter.author = query.author;
    }

    if (query.parentId !== undefined) {
      filter.parentId = query.parentId;
    }

    if (query.template) {
      filter.template = query.template;
    }

    if (query.showInMenu !== undefined) {
      filter['meta.showInMenu'] = query.showInMenu;
    }

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    return filter;
  }

  /**
   * Build page hierarchy
   */
  private buildHierarchy(pages: IPage[]): IPage[] {
    const pageMap = new Map<string, IPage & { children?: IPage[] }>();
    const rootPages: IPage[] = [];

    // Create map and initialize children array
    pages.forEach(page => {
      const pageWithChildren = { ...page.toObject(), children: [] };
      pageMap.set(page.id.toString(), pageWithChildren);
    });

    // Build hierarchy
    pages.forEach(page => {
      const pageWithChildren = pageMap.get(page.id.toString())!;
      
      if (page.parentId) {
        const parent = pageMap.get(page.parentId.toString());
        if (parent) {
          parent.children!.push(pageWithChildren);
        } else {
          rootPages.push(pageWithChildren);
        }
      } else {
        rootPages.push(pageWithChildren);
      }
    });

    return rootPages;
  }

  /**
   * Get status statistics
   */
  private async getStatusStats(): Promise<Array<{ _id: string; count: number }>> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
  }

  /**
   * Get template statistics
   */
  private async getTemplateStats(): Promise<Array<{ _id: string; count: number }>> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$template',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }
}

// ===================================================================
// CATEGORY REPOSITORY
// ===================================================================

export interface CategoryQuery {
  search?: string;
  parentId?: Types.ObjectId;
  featured?: boolean;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

export class CategoryRepository extends BaseRepository<ICategory> {
  constructor() {
    super(Category, 'Category');
  }

  /**
   * Search categories
   */
  async searchCategories(query: CategoryQuery): Promise<PaginatedResult<ICategory>> {
    try {
      const filter = this.buildCategoryFilter(query);
      
      const options = {
        page: query.page || 1,
        limit: query.limit || 20,
        sort: query.sort || { order: 1, name: 1 },
      };

      return this.paginate(filter, options);

    } catch (error) {
      this.logger.error('Error searching categories:', error);
      throw error;
    }
  }

  /**
   * Get category hierarchy
   */
  async getCategoryHierarchy(): Promise<ICategory[]> {
    try {
      const categories = await this.findMany({}, {
        sort: { order: 1, name: 1 },
      });

      return this.buildCategoryHierarchy(categories);

    } catch (error) {
      this.logger.error('Error getting category hierarchy:', error);
      throw error;
    }
  }

  /**
   * Get child categories
   */
  async getChildCategories(parentId: Types.ObjectId): Promise<ICategory[]> {
    try {
      return this.findMany(
        { parentId },
        { sort: { order: 1, name: 1 } }
      );

    } catch (error) {
      this.logger.error('Error getting child categories:', error);
      throw error;
    }
  }

  /**
   * Get top categories by post count
   */
  async getTopCategories(limit: number = 10): Promise<ICategory[]> {
    try {
      return this.findMany(
        { count: { $gt: 0 } },
        {
          limit,
          sort: { count: -1 },
        }
      );

    } catch (error) {
      this.logger.error('Error getting top categories:', error);
      throw error;
    }
  }

  /**
   * Update category post count
   */
  async updateCount(categoryId: Types.ObjectId): Promise<void> {
    try {
      const postCount = await Post.countDocuments({
        categories: categoryId,
        status: ContentStatus.PUBLISHED,
      });

      await this.updateById(categoryId.toString(), { count: postCount });

    } catch (error) {
      this.logger.error('Error updating category count:', error);
      throw error;
    }
  }

  /**
   * Build category filter
   */
  private buildCategoryFilter(query: CategoryQuery): FilterQuery<ICategory> {
    const filter: FilterQuery<ICategory> = {};

    if (query.parentId !== undefined) {
      filter.parentId = query.parentId;
    }

    if (query.featured !== undefined) {
      filter.featured = query.featured;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    return filter;
  }

  /**
   * Build category hierarchy
   */
  private buildCategoryHierarchy(categories: ICategory[]): ICategory[] {
    const categoryMap = new Map<string, ICategory & { children?: ICategory[] }>();
    const rootCategories: ICategory[] = [];

    // Create map and initialize children array
    categories.forEach(category => {
      const categoryWithChildren = { ...category.toObject(), children: [] };
      categoryMap.set(category.id.toString(), categoryWithChildren);
    });

    // Build hierarchy
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id.toString())!;
      
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId.toString());
        if (parent) {
          parent.children!.push(categoryWithChildren);
        } else {
          rootCategories.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    return rootCategories;
  }
}

// ===================================================================
// TAG REPOSITORY
// ===================================================================

export interface TagQuery {
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

export class TagRepository extends BaseRepository<ITag> {
  constructor() {
    super(Tag, 'Tag');
  }

  /**
   * Search tags
   */
  async searchTags(query: TagQuery): Promise<PaginatedResult<ITag>> {
    try {
      const filter = this.buildTagFilter(query);
      
      const options = {
        page: query.page || 1,
        limit: query.limit || 50,
        sort: query.sort || { count: -1, name: 1 },
      };

      return this.paginate(filter, options);

    } catch (error) {
      this.logger.error('Error searching tags:', error);
      throw error;
    }
  }

  /**
   * Get popular tags
   */
  async getPopularTags(limit: number = 20): Promise<ITag[]> {
    try {
      return this.findMany(
        { count: { $gt: 0 } },
        {
          limit,
          sort: { count: -1 },
        }
      );

    } catch (error) {
      this.logger.error('Error getting popular tags:', error);
      throw error;
    }
  }

  /**
   * Find or create tag
   */
  async findOrCreateTag(name: string): Promise<ITag> {
    try {
      const slug = Sanitizer.sanitizeSlug(name);
      
      let tag = await this.findOne({ slug });
      
      if (!tag) {
        tag = await this.create({
          name: name.trim(),
          slug,
          count: 0,
        });
      }

      return tag;

    } catch (error) {
      this.logger.error('Error finding or creating tag:', error);
      throw error;
    }
  }

  /**
   * Update tag post count
   */
  async updateCount(tagName: string): Promise<void> {
    try {
      const postCount = await Post.countDocuments({
        tags: tagName,
        status: ContentStatus.PUBLISHED,
      });

      await this.model.updateOne(
        { name: tagName },
        { count: postCount }
      );

    } catch (error) {
      this.logger.error('Error updating tag count:', error);
      throw error;
    }
  }

  /**
   * Get tag cloud data
   */
  async getTagCloud(limit: number = 50): Promise<Array<{ name: string; count: number; weight: number }>> {
    try {
      const tags = await this.getPopularTags(limit);
      
      if (tags.length === 0) return [];

      const maxCount = Math.max(...tags.map(tag => tag.count));
      const minCount = Math.min(...tags.map(tag => tag.count));
      const range = maxCount - minCount || 1;

      return tags.map(tag => ({
        name: tag.name,
        count: tag.count,
        weight: Math.round(((tag.count - minCount) / range) * 5) + 1, // 1-6 scale
      }));

    } catch (error) {
      this.logger.error('Error getting tag cloud:', error);
      throw error;
    }
  }

  /**
   * Build tag filter
   */
  private buildTagFilter(query: TagQuery): FilterQuery<ITag> {
    const filter: FilterQuery<ITag> = {};

    if (query.featured !== undefined) {
      filter.featured = query.featured;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    return filter;
  }
}

// ===================================================================
// COMMENT REPOSITORY
// ===================================================================

export interface CommentQuery {
  postId?: Types.ObjectId;
  status?: string[];
  author?: string;
  search?: string;
  parentId?: Types.ObjectId;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

export interface CommentStats {
  total: number;
  approved: number;
  pending: number;
  spam: number;
  trash: number;
  byPost: Array<{
    postId: string;
    count: number;
  }>;
  recentComments: Array<{
    id: string;
    author: string;
    content: string;
    postId: string;
    createdAt: Date;
  }>;
}

export class CommentRepository extends BaseRepository<IComment> {
  constructor() {
    super(Comment, 'Comment');
  }

  /**
   * Search comments
   */
  async searchComments(query: CommentQuery): Promise<PaginatedResult<IComment>> {
    try {
      const filter = this.buildCommentFilter(query);
      
      const options = {
        page: query.page || 1,
        limit: query.limit || 20,
        sort: query.sort || { createdAt: -1 },
      };

      return this.paginate(filter, options);

    } catch (error) {
      this.logger.error('Error searching comments:', error);
      throw error;
    }
  }

  /**
   * Get comments by post
   */
  async getCommentsByPost(
    postId: Types.ObjectId,
    status: string = 'approved'
  ): Promise<IComment[]> {
    try {
      const comments = await this.findMany(
        {
          postId,
          status,
        },
        {
          sort: { createdAt: 1 },
        }
      );

      return this.buildCommentTree(comments);

    } catch (error) {
      this.logger.error('Error getting comments by post:', error);
      throw error;
    }
  }

  /**
   * Get comment replies
   */
  async getCommentReplies(parentId: Types.ObjectId): Promise<IComment[]> {
    try {
      return this.findMany(
        { parentId },
        { sort: { createdAt: 1 } }
      );

    } catch (error) {
      this.logger.error('Error getting comment replies:', error);
      throw error;
    }
  }

  /**
   * Moderate comment (approve/reject/spam)
   */
  async moderateComment(commentId: Types.ObjectId, status: string): Promise<IComment | null> {
    try {
      const validStatuses = ['approved', 'pending', 'spam', 'trash'];
      
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid comment status: ${status}`);
      }

      return this.updateById(commentId.toString(), { status });

    } catch (error) {
      this.logger.error('Error moderating comment:', error);
      throw error;
    }
  }

  /**
   * Bulk moderate comments
   */
  async bulkModerate(commentIds: Types.ObjectId[], status: string): Promise<number> {
    try {
      const result = await this.model.updateMany(
        { _id: { $in: commentIds } },
        { status }
      );

      return result.modifiedCount;

    } catch (error) {
      this.logger.error('Error bulk moderating comments:', error);
      throw error;
    }
  }

  /**
   * Get comment statistics
   */
  async getCommentStats(): Promise<CommentStats> {
    try {
      const [statusStats, postStats, recentComments] = await Promise.all([
        this.getStatusStats(),
        this.getPostStats(),
        this.getRecentComments(5),
      ]);

      return {
        total: statusStats.reduce((sum, stat) => sum + stat.count, 0),
        approved: statusStats.find(s => s._id === 'approved')?.count || 0,
        pending: statusStats.find(s => s._id === 'pending')?.count || 0,
        spam: statusStats.find(s => s._id === 'spam')?.count || 0,
        trash: statusStats.find(s => s._id === 'trash')?.count || 0,
        byPost: postStats.map(stat => ({
          postId: stat._id.toString(),
          count: stat.count,
        })),
        recentComments: recentComments.map(comment => ({
          id: comment.id.toString(),
          author: comment.author.name,
          content: comment.content.substring(0, 100),
          postId: comment.postId.toString(),
          createdAt: comment.createdAt,
        })),
      };

    } catch (error) {
      this.logger.error('Error getting comment stats:', error);
      throw error;
    }
  }

  /**
   * Build comment filter
   */
  private buildCommentFilter(query: CommentQuery): FilterQuery<IComment> {
    const filter: FilterQuery<IComment> = {};

    if (query.postId) {
      filter.postId = query.postId;
    }

    if (query.status && query.status.length > 0) {
      filter.status = { $in: query.status };
    }

    if (query.author) {
      filter['author.name'] = { $regex: query.author, $options: 'i' };
    }

    if (query.parentId !== undefined) {
      filter.parentId = query.parentId;
    }

    if (query.search) {
      filter.$or = [
        { content: { $regex: query.search, $options: 'i' } },
        { 'author.name': { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) filter.createdAt.$gte = query.dateFrom;
      if (query.dateTo) filter.createdAt.$lte = query.dateTo;
    }

    return filter;
  }

  /**
   * Build comment tree structure
   */
  private buildCommentTree(comments: IComment[]): IComment[] {
    const commentMap = new Map<string, IComment & { replies?: IComment[] }>();
    const rootComments: IComment[] = [];

    // Create map and initialize replies array
    comments.forEach(comment => {
      const commentWithReplies = { ...comment.toObject(), replies: [] };
      commentMap.set(comment.id.toString(), commentWithReplies);
    });

    // Build tree structure
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id.toString())!;
      
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId.toString());
        if (parent) {
          parent.replies!.push(commentWithReplies);
        } else {
          rootComments.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  }

  /**
   * Get status statistics
   */
  private async getStatusStats(): Promise<Array<{ _id: string; count: number }>> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
  }

  /**
   * Get post statistics
   */
  private async getPostStats(): Promise<Array<{ _id: Types.ObjectId; count: number }>> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$postId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }

  /**
   * Get recent comments
   */
  private async getRecentComments(limit: number): Promise<IComment[]> {
    return this.findMany(
      { status: 'approved' },
      {
        limit,
        sort: { createdAt: -1 },
      }
    );
  }
}


export default {
  PostRepository,
  PageRepository,
  CategoryRepository,
  TagRepository,
  CommentRepository,
};