import { Model, Types } from 'mongoose';
import { BaseRepositoryImpl } from './base-repository';
import type { IPost } from '../database/models/post';
import { ContentStats, ContentStatus, ContentType } from '../../types/content';
import { PaginatedResult, QueryOptions } from '../../types/database';
import { SlugGenerator } from '../../utils/slug-generator';
import { DateUtils } from '../../utils/date-utils';

export interface ContentSearchOptions {
  query: string;
  type?: ContentType;
  status?: ContentStatus;
  author?: Types.ObjectId;
  categories?: Types.ObjectId[];
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ContentAnalytics {
  viewCount: number;
  shareCount: number;
  commentCount: number;
  likeCount: number;
  avgRating?: number;
}

export class ContentRepository extends BaseRepositoryImpl<IPost> {
  constructor(model: Model<IPost>) {
    super(model);
  }

  /**
   * Create content with auto-generated slug
   */
  async createContent(data: Partial<IPost>): Promise<IPost> {
    try {
      this.logger.debug('Creating content', {
        title: data.title,
        type: data.type,
        status: data.status,
      });

      // Generate slug if not provided
      if (!data.slug && data.title) {
        data.slug = await this.generateUniqueSlug(data.title);
      }

      // Set publish date if status is published
      if (data.status === ContentStatus.PUBLISHED && !data.publishedAt) {
        data.publishedAt = new Date();
      }

      // Create SEO-friendly excerpt if not provided
      if (!data.excerpt && data.content) {
        data.excerpt = this.generateExcerpt(data.content);
      }

      // Initialize view count and other metrics
      if (!data.meta) {
        data.meta = {};
      }
      
      if (!data.meta.viewCount) {
        data.meta.viewCount = 0;
      }

      return await this.create(data);
    } catch (error) {
      this.logger.error('Error creating content:', error);
      throw error;
    }
  }

  /**
   * Update content with slug regeneration if title changed
   */
  async updateContent(id: string | Types.ObjectId, data: Partial<IPost>): Promise<IPost | null> {
    try {
      this.logger.debug('Updating content', { id: id.toString() });

      const existingContent = await this.findById(id);
      if (!existingContent) {
        return null;
      }

      // Regenerate slug if title changed
      if (data.title && data.title !== existingContent.title) {
        data.slug = await this.generateUniqueSlug(data.title, id);
      }

      // Update publish date if status changed to published
      if (data.status === ContentStatus.PUBLISHED && existingContent.status !== ContentStatus.PUBLISHED) {
        data.publishedAt = new Date();
      }

      // Clear publish date if status changed from published
      if (data.status !== ContentStatus.PUBLISHED && existingContent.status === ContentStatus.PUBLISHED) {
        data.publishedAt = undefined;
      }

      // Update excerpt if content changed
      if (data.content && data.content !== existingContent.content) {
        data.excerpt = this.generateExcerpt(data.content);
      }

      return await this.updateById(id, data);
    } catch (error) {
      this.logger.error('Error updating content:', error);
      throw error;
    }
  }

  /**
   * Find content by slug
   */
  async findBySlug(slug: string, options: QueryOptions = {}): Promise<IPost | null> {
    try {
      this.logger.debug('Finding content by slug', { slug });

      const sanitizedSlug = SlugGenerator.clean(slug);
      if (!sanitizedSlug) {
        return null;
      }

      return await this.findOne({ slug: sanitizedSlug }, options);
    } catch (error) {
      this.logger.error('Error finding content by slug:', error);
      throw error;
    }
  }

  /**
   * Find published content
   */
  async findPublished(filter: Record<string, any> = {}, options: QueryOptions = {}): Promise<IPost[]> {
    try {
      const publishedFilter = {
        ...filter,
        status: ContentStatus.PUBLISHED,
        publishedAt: { $lte: new Date() },
      };

      return await this.findMany(publishedFilter, {
        sort: { publishedAt: -1 },
        ...options,
      });
    } catch (error) {
      this.logger.error('Error finding published content:', error);
      throw error;
    }
  }

  /**
   * Paginate published content
   */
  async paginatePublished(
    filter: Record<string, any> = {},
    options: Parameters<typeof this.paginate>[1]
  ): Promise<PaginatedResult<IPost>> {
    try {
      const publishedFilter = {
        ...filter,
        status: ContentStatus.PUBLISHED,
        publishedAt: { $lte: new Date() },
      };

      return await this.paginate(publishedFilter, {
        sort: { publishedAt: -1 },
        ...options,
      });
    } catch (error) {
      this.logger.error('Error paginating published content:', error);
      throw error;
    }
  }

  /**
   * Find content by author
   */
  async findByAuthor(
    authorId: Types.ObjectId,
    filter: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<IPost[]> {
    try {
      const authorFilter = {
        ...filter,
        author: authorId,
      };

      return await this.findMany(authorFilter, {
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error) {
      this.logger.error('Error finding content by author:', error);
      throw error;
    }
  }

  /**
   * Find content by categories
   */
  async findByCategories(
    categoryIds: Types.ObjectId[],
    filter: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<IPost[]> {
    try {
      const categoryFilter = {
        ...filter,
        categories: { $in: categoryIds },
      };

      return await this.findMany(categoryFilter, {
        sort: { publishedAt: -1 },
        ...options,
      });
    } catch (error) {
      this.logger.error('Error finding content by categories:', error);
      throw error;
    }
  }

  /**
   * Find content by tags
   */
  async findByTags(
    tags: string[],
    filter: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<IPost[]> {
    try {
      const tagFilter = {
        ...filter,
        tags: { $in: tags },
      };

      return await this.findMany(tagFilter, {
        sort: { publishedAt: -1 },
        ...options,
      });
    } catch (error) {
      this.logger.error('Error finding content by tags:', error);
      throw error;
    }
  }

  /**
   * Search content with full-text search
   */
  async searchContent(options: ContentSearchOptions): Promise<IPost[]> {
    try {
      const { query, type, status, author, categories, tags, dateFrom, dateTo } = options;

      this.logger.debug('Searching content', { query, type, status });

      // Build search filter
      const filter: any = {};

      if (type) {
        filter.type = type;
      }

      if (status) {
        filter.status = status;
      }

      if (author) {
        filter.author = author;
      }

      if (categories && categories.length > 0) {
        filter.categories = { $in: categories };
      }

      if (tags && tags.length > 0) {
        filter.tags = { $in: tags };
      }

      if (dateFrom || dateTo) {
        filter.publishedAt = {};
        if (dateFrom) {
          filter.publishedAt.$gte = dateFrom;
        }
        if (dateTo) {
          filter.publishedAt.$lte = dateTo;
        }
      }

      // Use text search for title and content
      const searchOptions = {
        query,
        fields: ['title', 'content', 'excerpt'],
        caseSensitive: false,
      };

      return await this.search(searchOptions, filter);
    } catch (error) {
      this.logger.error('Error searching content:', error);
      throw error;
    }
  }

  /**
   * Get related content based on categories and tags
   */
  async findRelated(
    contentId: Types.ObjectId,
    limit: number = 5
  ): Promise<IPost[]> {
    try {
      this.logger.debug('Finding related content', { contentId: contentId.toString(), limit });

      const content = await this.findById(contentId);
      if (!content) {
        return [];
      }

      // Build aggregation pipeline for related content
      const pipeline = [
        {
          $match: {
            _id: { $ne: contentId },
            status: ContentStatus.PUBLISHED,
            $or: [
              { categories: { $in: content.categories } },
              { tags: { $in: content.tags } },
            ],
          },
        },
        {
          $addFields: {
            categoryScore: {
              $size: {
                $setIntersection: ['$categories', content.categories],
              },
            },
            tagScore: {
              $size: {
                $setIntersection: ['$tags', content.tags],
              },
            },
          },
        },
        {
          $addFields: {
            totalScore: { $add: ['$categoryScore', '$tagScore'] },
          },
        },
        { $sort: { totalScore: -1, publishedAt: -1 } },
        { $limit: limit },
      ];

      return await this.aggregate(pipeline);
    } catch (error) {
      this.logger.error('Error finding related content:', error);
      throw error;
    }
  }

  /**
   * Get popular content based on view count
   */
  async findPopular(
    limit: number = 10,
    timeframe?: 'day' | 'week' | 'month' | 'year'
  ): Promise<IPost[]> {
    try {
      this.logger.debug('Finding popular content', { limit, timeframe });

      const filter: any = {
        status: ContentStatus.PUBLISHED,
        'meta.viewCount': { $gt: 0 },
      };

      // Add time filter if specified
      if (timeframe) {
        const dateRange = this.getDateRangeForTimeframe(timeframe);
        filter.publishedAt = {
          $gte: dateRange.start,
          $lte: dateRange.end,
        };
      }

      return await this.findMany(filter, {
        sort: { 'meta.viewCount': -1, publishedAt: -1 },
        limit,
      });
    } catch (error) {
      this.logger.error('Error finding popular content:', error);
      throw error;
    }
  }

  /**
   * Get recent content
   */
  async findRecent(limit: number = 10, type?: ContentType): Promise<IPost[]> {
    try {
      const filter: any = {
        status: ContentStatus.PUBLISHED,
      };

      if (type) {
        filter.type = type;
      }

      return await this.findMany(filter, {
        sort: { publishedAt: -1 },
        limit,
      });
    } catch (error) {
      this.logger.error('Error finding recent content:', error);
      throw error;
    }
  }

  /**
   * Get content statistics
   */
  async getStats(): Promise<ContentStats> {
    try {
      this.logger.debug('Getting content statistics');

      const pipeline = [
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: {
              $sum: { $cond: [{ $eq: ['$status', ContentStatus.PUBLISHED] }, 1, 0] },
            },
            draft: {
              $sum: { $cond: [{ $eq: ['$status', ContentStatus.DRAFT] }, 1, 0] },
            },
            private: {
              $sum: { $cond: [{ $eq: ['$status', ContentStatus.PRIVATE] }, 1, 0] },
            },
            trash: {
              $sum: { $cond: [{ $eq: ['$status', ContentStatus.TRASH] }, 1, 0] },
            },
          },
        },
      ];

      const [statsResult] = await this.aggregate(pipeline);

      // Get stats by author
      const authorStats = await this.aggregate([
        { $match: { status: ContentStatus.PUBLISHED } },
        { $group: { _id: '$author', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Get stats by category
      const categoryStats = await this.aggregate([
        { $match: { status: ContentStatus.PUBLISHED } },
        { $unwind: '$categories' },
        { $group: { _id: '$categories', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Get stats by month
      const monthStats = await this.aggregate([
        { $match: { status: ContentStatus.PUBLISHED } },
        {
          $group: {
            _id: {
              year: { $year: '$publishedAt' },
              month: { $month: '$publishedAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]);

      const stats: ContentStats = {
        total: statsResult?.total || 0,
        published: statsResult?.published || 0,
        draft: statsResult?.draft || 0,
        private: statsResult?.private || 0,
        trash: statsResult?.trash || 0,
        byAuthor: {},
        byCategory: {},
        byMonth: {},
      };

      // Process author stats
      authorStats.forEach((stat: any) => {
        stats.byAuthor[stat._id.toString()] = stat.count;
      });

      // Process category stats
      categoryStats.forEach((stat: any) => {
        stats.byCategory[stat._id.toString()] = stat.count;
      });

      // Process month stats
      monthStats.forEach((stat: any) => {
        const key = `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}`;
        stats.byMonth[key] = stat.count;
      });

      return stats;
    } catch (error) {
      this.logger.error('Error getting content statistics:', error);
      throw error;
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: Types.ObjectId): Promise<void> {
    try {
      await this.model.findByIdAndUpdate(
        id,
        { $inc: { 'meta.viewCount': 1 } },
        { new: false }
      ).exec();

      this.logger.debug('View count incremented', { id: id.toString() });
    } catch (error) {
      this.logger.error('Error incrementing view count:', error);
      throw error;
    }
  }

  /**
   * Bulk update content status
   */
  async bulkUpdateStatus(
    ids: Types.ObjectId[],
    status: ContentStatus
  ): Promise<number> {
    try {
      this.logger.debug('Bulk updating content status', {
        count: ids.length,
        status,
      });

      const updateData: any = { status };

      if (status === ContentStatus.PUBLISHED) {
        updateData.publishedAt = new Date();
      } else if (status !== ContentStatus.PUBLISHED) {
        updateData.publishedAt = undefined;
      }

      return await this.updateMany(
        { _id: { $in: ids } },
        updateData
      );
    } catch (error) {
      this.logger.error('Error bulk updating content status:', error);
      throw error;
    }
  }

  /**
   * Archive old content
   */
  async archiveOldContent(days: number = 365): Promise<number> {
    try {
      const cutoffDate = DateUtils.subtractDays(new Date(), days);
      
      this.logger.debug('Archiving old content', {
        cutoffDate: cutoffDate?.toISOString(),
        days,
      });

      if (!cutoffDate) {
        throw new Error('Invalid cutoff date');
      }

      return await this.updateMany(
        {
          status: ContentStatus.PUBLISHED,
          publishedAt: { $lt: cutoffDate },
        },
        { status: ContentStatus.PRIVATE }
      );
    } catch (error) {
      this.logger.error('Error archiving old content:', error);
      throw error;
    }
  }

  /**
   * Generate unique slug for content
   */
  private async generateUniqueSlug(title: string, excludeId?: string | Types.ObjectId): Promise<string> {
    const baseSlug = SlugGenerator.forContent(title);
    
    const checkExists = async (slug: string): Promise<boolean> => {
      const filter: any = { slug };
      if (excludeId) {
        filter._id = { $ne: excludeId };
      }
      return await this.exists(filter);
    };

    return await SlugGenerator.generateUnique(title, checkExists);
  }

  /**
   * Generate excerpt from content
   */
  private generateExcerpt(content: string, length: number = 200): string {
    // Remove HTML tags and get plain text
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    
    if (plainText.length <= length) {
      return plainText;
    }

    // Find the last complete word within the length limit
    const truncated = plainText.substring(0, length);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > 0) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Get date range for timeframe
   */
  private getDateRangeForTimeframe(timeframe: string): { start: Date; end: Date } {
    const now = new Date();
    const end = DateUtils.endOfDay(now)!;
    let start: Date;

    switch (timeframe) {
      case 'day':
        start = DateUtils.startOfDay(now)!;
        break;
      case 'week':
        start = DateUtils.subtractDays(now, 7)!;
        break;
      case 'month':
        start = DateUtils.subtractDays(now, 30)!;
        break;
      case 'year':
        start = DateUtils.subtractDays(now, 365)!;
        break;
      default:
        start = DateUtils.subtractDays(now, 30)!;
    }

    return { start, end };
  }
}