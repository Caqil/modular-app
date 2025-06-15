import { Model, Types } from 'mongoose';
import { BaseRepositoryImpl } from './base-repository';
import type { IMedia } from '../database/models/media';
import { Sanitizer } from '../../utils/sanitizer';
import { FileHandler } from '../../utils/file-handler';
import { QueryOptions } from '../../types/database';
import { DateUtils } from '../../utils/date-utils';
import type { Express } from 'express';

export interface MediaUploadData {
  file: Express.Multer.File | Buffer;
  originalName: string;
  uploadedBy: Types.ObjectId;
  alt?: string;
  caption?: string;
  description?: string;
}

export interface MediaSearchOptions {
  query?: string;
  mimeType?: string;
  uploadedBy?: Types.ObjectId;
  dateFrom?: Date;
  dateTo?: Date;
  hasAlt?: boolean;
  hasCaption?: boolean;
  minSize?: number;
  maxSize?: number;
}

export interface MediaStats {
  total: number;
  totalSize: number;
  averageSize: number;
  byMimeType: Record<string, { count: number; size: number }>;
  byUploader: Record<string, number>;
  byMonth: Record<string, number>;
  recentUploads: number;
  orphanedFiles: number;
}

export interface MediaUsage {
  mediaId: Types.ObjectId;
  usedIn: Array<{
    type: 'post' | 'page' | 'theme' | 'plugin';
    id: Types.ObjectId;
    title?: string;
    url?: string;
  }>;
  usageCount: number;
}

export class MediaRepository extends BaseRepositoryImpl<IMedia> {
  constructor(model: Model<IMedia>) {
    super(model);
  }

  /**
   * Upload and create media record
   */
  async uploadMedia(data: MediaUploadData): Promise<IMedia> {
    try {
      this.logger.debug('Uploading media', {
        originalName: data.originalName,
        uploadedBy: data.uploadedBy.toString(),
      });

      // Upload file using FileHandler
      const fileInfo = await FileHandler.uploadFile(data.file, data.originalName);

      // Create media record
      const mediaData: Partial<IMedia> = {
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        path: fileInfo.path,
        url: fileInfo.url,
        alt: data.alt ? Sanitizer.sanitizeText(data.alt) : undefined,
        caption: data.caption ? Sanitizer.sanitizeText(data.caption) : undefined,
        description: data.description ? Sanitizer.sanitizeText(data.description) : undefined,
        uploadedBy: data.uploadedBy,
        metadata: fileInfo.metadata || {},
      };

      const media = await this.create(mediaData);

      this.logger.info('Media uploaded successfully', {
        id: media._id,
        filename: media.filename,
        size: media.size,
      });

      return media;
    } catch (error) {
      this.logger.error('Error uploading media:', error);
      throw error;
    }
  }

  /**
   * Update media metadata
   */
  async updateMediaMetadata(
    id: string | Types.ObjectId,
    metadata: {
      alt?: string;
      caption?: string;
      description?: string;
    }
  ): Promise<IMedia | null> {
    try {
      this.logger.debug('Updating media metadata', { id: id.toString() });

      const updateData: any = {};

      if (metadata.alt !== undefined) {
        updateData.alt = metadata.alt ? Sanitizer.sanitizeText(metadata.alt) : undefined;
      }

      if (metadata.caption !== undefined) {
        updateData.caption = metadata.caption ? Sanitizer.sanitizeText(metadata.caption) : undefined;
      }

      if (metadata.description !== undefined) {
        updateData.description = metadata.description ? Sanitizer.sanitizeText(metadata.description) : undefined;
      }

      return await this.updateById(id, updateData);
    } catch (error) {
      this.logger.error('Error updating media metadata:', error);
      throw error;
    }
  }

  /**
   * Find media by MIME type
   */
  async findByMimeType(mimeType: string, options: QueryOptions = {}): Promise<IMedia[]> {
    try {
      this.logger.debug('Finding media by MIME type', { mimeType });

      const sanitizedMimeType = Sanitizer.sanitizeText(mimeType);

      return await this.findMany(
        { mimeType: sanitizedMimeType },
        {
          sort: { createdAt: -1 },
          ...options,
        }
      );
    } catch (error) {
      this.logger.error('Error finding media by MIME type:', error);
      throw error;
    }
  }

  /**
   * Find images only
   */
  async findImages(options: QueryOptions = {}): Promise<IMedia[]> {
    try {
      return await this.findMany(
        { mimeType: { $regex: '^image/', $options: 'i' } },
        {
          sort: { createdAt: -1 },
          ...options,
        }
      );
    } catch (error) {
      this.logger.error('Error finding images:', error);
      throw error;
    }
  }

  /**
   * Find videos only
   */
  async findVideos(options: QueryOptions = {}): Promise<IMedia[]> {
    try {
      return await this.findMany(
        { mimeType: { $regex: '^video/', $options: 'i' } },
        {
          sort: { createdAt: -1 },
          ...options,
        }
      );
    } catch (error) {
      this.logger.error('Error finding videos:', error);
      throw error;
    }
  }

  /**
   * Find documents only
   */
  async findDocuments(options: QueryOptions = {}): Promise<IMedia[]> {
    try {
      return await this.findMany(
        {
          mimeType: {
            $in: [
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'text/plain',
              'text/csv',
            ],
          },
        },
        {
          sort: { createdAt: -1 },
          ...options,
        }
      );
    } catch (error) {
      this.logger.error('Error finding documents:', error);
      throw error;
    }
  }

  /**
   * Find media by uploader
   */
  async findByUploader(
    uploaderId: Types.ObjectId,
    options: QueryOptions = {}
  ): Promise<IMedia[]> {
    try {
      return await this.findMany(
        { uploadedBy: uploaderId },
        {
          sort: { createdAt: -1 },
          ...options,
        }
      );
    } catch (error) {
      this.logger.error('Error finding media by uploader:', error);
      throw error;
    }
  }

  /**
   * Search media with advanced filters
   */
  async searchMedia(searchOptions: MediaSearchOptions): Promise<IMedia[]> {
    try {
      const {
        query,
        mimeType,
        uploadedBy,
        dateFrom,
        dateTo,
        hasAlt,
        hasCaption,
        minSize,
        maxSize,
      } = searchOptions;

      this.logger.debug('Searching media', { query, mimeType, uploadedBy });

      // Build filter
      const filter: any = {};

      if (mimeType) {
        if (mimeType.includes('/')) {
          filter.mimeType = mimeType;
        } else {
          filter.mimeType = { $regex: `^${mimeType}/`, $options: 'i' };
        }
      }

      if (uploadedBy) {
        filter.uploadedBy = uploadedBy;
      }

      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) {
          filter.createdAt.$gte = dateFrom;
        }
        if (dateTo) {
          filter.createdAt.$lte = dateTo;
        }
      }

      if (hasAlt !== undefined) {
        filter.alt = hasAlt ? { $exists: true, $ne: null, $ne: '' } : { $in: [null, ''] };
      }

      if (hasCaption !== undefined) {
        filter.caption = hasCaption ? { $exists: true, $ne: null, $ne: '' } : { $in: [null, ''] };
      }

      if (minSize !== undefined || maxSize !== undefined) {
        filter.size = {};
        if (minSize !== undefined) {
          filter.size.$gte = minSize;
        }
        if (maxSize !== undefined) {
          filter.size.$lte = maxSize;
        }
      }

      // Use text search if query provided
      if (query) {
        const searchFields = ['originalName', 'alt', 'caption', 'description'];
        const searchConditions = searchFields.map(field => ({
          [field]: { $regex: Sanitizer.sanitizeSearchQuery(query), $options: 'i' },
        }));
        filter.$or = searchConditions;
      }

      return await this.findMany(filter, {
        sort: { createdAt: -1 },
      });
    } catch (error) {
      this.logger.error('Error searching media:', error);
      throw error;
    }
  }

  /**
   * Get media statistics
   */
  async getStats(): Promise<MediaStats> {
    try {
      this.logger.debug('Getting media statistics');

      // Basic stats
      const [basicStats] = await this.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalSize: { $sum: '$size' },
            averageSize: { $avg: '$size' },
          },
        },
      ]);

      // Stats by MIME type
      const mimeTypeStats = await this.aggregate([
        {
          $group: {
            _id: '$mimeType',
            count: { $sum: 1 },
            size: { $sum: '$size' },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Stats by uploader
      const uploaderStats = await this.aggregate([
        {
          $group: {
            _id: '$uploadedBy',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Stats by month
      const monthStats = await this.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]);

      // Recent uploads (last 7 days)
      const sevenDaysAgo = DateUtils.subtractDays(new Date(), 7);
      const recentUploads = await this.count({
        createdAt: { $gte: sevenDaysAgo },
      });

      // TODO: Implement orphaned files detection
      // This would require checking which media files are not referenced in any content
      const orphanedFiles = 0;

      const stats: MediaStats = {
        total: basicStats?.total || 0,
        totalSize: basicStats?.totalSize || 0,
        averageSize: basicStats?.averageSize || 0,
        byMimeType: {},
        byUploader: {},
        byMonth: {},
        recentUploads,
        orphanedFiles,
      };

      // Process MIME type stats
      mimeTypeStats.forEach((stat: any) => {
        stats.byMimeType[stat._id] = {
          count: stat.count,
          size: stat.size,
        };
      });

      // Process uploader stats
      uploaderStats.forEach((stat: any) => {
        stats.byUploader[stat._id.toString()] = stat.count;
      });

      // Process month stats
      monthStats.forEach((stat: any) => {
        const key = `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}`;
        stats.byMonth[key] = stat.count;
      });

      return stats;
    } catch (error) {
      this.logger.error('Error getting media statistics:', error);
      throw error;
    }
  }

  /**
   * Delete media and associated file
   */
  async deleteMedia(id: string | Types.ObjectId): Promise<boolean> {
    try {
      this.logger.debug('Deleting media', { id: id.toString() });

      // Find media to get file path
      const media = await this.findById(id);
      if (!media) {
        this.logger.warn('Media not found for deletion', { id: id.toString() });
        return false;
      }

      // Delete file from filesystem
      try {
        await FileHandler.deleteFile(media.path);
        this.logger.debug('Media file deleted from filesystem', { path: media.path });
      } catch (error) {
        this.logger.warn('Error deleting media file from filesystem:', error);
        // Continue with database deletion even if file deletion fails
      }

      // Delete from database
      const deleted = await this.deleteById(id);

      if (deleted) {
        this.logger.info('Media deleted successfully', {
          id: media._id,
          filename: media.filename,
        });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Error deleting media:', error);
      throw error;
    }
  }

  /**
   * Bulk delete media
   */
  async bulkDeleteMedia(ids: Types.ObjectId[]): Promise<number> {
    try {
      this.logger.debug('Bulk deleting media', { count: ids.length });

      let deletedCount = 0;

      // Delete each media file individually to handle file cleanup
      for (const id of ids) {
        try {
          const deleted = await this.deleteMedia(id);
          if (deleted) {
            deletedCount++;
          }
        } catch (error) {
          this.logger.error(`Error deleting media ${id}:`, error);
          // Continue with other deletions
        }
      }

      this.logger.info('Bulk media deletion complete', {
        requested: ids.length,
        deleted: deletedCount,
      });

      return deletedCount;
    } catch (error) {
      this.logger.error('Error bulk deleting media:', error);
      throw error;
    }
  }

  /**
   * Find unused media (not referenced in any content)
   */
  async findUnusedMedia(limit?: number): Promise<IMedia[]> {
    try {
      this.logger.debug('Finding unused media');

      // This is a simplified version. In a real implementation,
      // you would need to check references in posts, pages, themes, etc.
      const pipeline: any[] = [
        {
          $lookup: {
            from: 'posts',
            let: { mediaUrl: '$url' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $regexMatch: { input: '$content', regex: { $toString: '$$mediaUrl' } } },
                      { $eq: ['$featuredImage', '$$mediaUrl'] },
                    ],
                  },
                },
              },
            ],
            as: 'usedInPosts',
          },
        },
        {
          $match: {
            usedInPosts: { $size: 0 },
          },
        },
        {
          $sort: { createdAt: 1 },
        },
      ];

      if (limit) {
        pipeline.push({ $limit: limit });
      }

      return await this.aggregate(pipeline);
    } catch (error) {
      this.logger.error('Error finding unused media:', error);
      throw error;
    }
  }

  /**
   * Get media usage information
   */
  async getMediaUsage(id: Types.ObjectId): Promise<MediaUsage> {
    try {
      this.logger.debug('Getting media usage', { id: id.toString() });

      const media = await this.findById(id);
      if (!media) {
        throw new Error('Media not found');
      }

      // Find usage in posts
      const usedInPosts = await this.model.db.collection('posts').find({
        $or: [
          { content: { $regex: media.url, $options: 'i' } },
          { featuredImage: media.url },
        ],
      }).toArray();

      const usedIn = usedInPosts.map((post: any) => ({
        type: 'post' as const,
        id: post._id,
        title: post.title,
        url: `/posts/${post.slug}`,
      }));

      // TODO: Add checks for pages, themes, plugins, etc.

      return {
        mediaId: id,
        usedIn,
        usageCount: usedIn.length,
      };
    } catch (error) {
      this.logger.error('Error getting media usage:', error);
      throw error;
    }
  }

  /**
   * Optimize media storage (cleanup orphaned files)
   */
  async optimizeStorage(): Promise<{ cleanedFiles: number; freedSpace: number }> {
    try {
      this.logger.info('Starting media storage optimization');

      const unusedMedia = await this.findUnusedMedia();
      let cleanedFiles = 0;
      let freedSpace = 0;

      for (const media of unusedMedia) {
        try {
          // Check if file is older than 30 days
          const thirtyDaysAgo = DateUtils.subtractDays(new Date(), 30);
          if (media.createdAt < thirtyDaysAgo!) {
            freedSpace += media.size;
            await this.deleteMedia(media._id);
            cleanedFiles++;
          }
        } catch (error) {
          this.logger.error(`Error cleaning media ${media._id}:`, error);
        }
      }

      this.logger.info('Media storage optimization complete', {
        cleanedFiles,
        freedSpace,
      });

      return { cleanedFiles, freedSpace };
    } catch (error) {
      this.logger.error('Error optimizing media storage:', error);
      throw error;
    }
  }

  /**
   * Get media file info
   */
  async getFileInfo(id: Types.ObjectId): Promise<any> {
    try {
      const media = await this.findById(id);
      if (!media) {
        return null;
      }

      const fileInfo = await FileHandler.getFileInfo(media.path);
      return {
        ...media.toObject(),
        fileExists: !!fileInfo,
        fileInfo,
      };
    } catch (error) {
      this.logger.error('Error getting file info:', error);
      throw error;
    }
  }

  /**
   * Regenerate thumbnails for images
   */
  async regenerateThumbnails(id: Types.ObjectId): Promise<boolean> {
    try {
      const media = await this.findById(id);
      if (!media || !media.mimeType.startsWith('image/')) {
        return false;
      }

      // TODO: Implement thumbnail regeneration
      // This would involve using FileHandler to regenerate thumbnails
      this.logger.info('Thumbnail regeneration not yet implemented');

      return true;
    } catch (error) {
      this.logger.error('Error regenerating thumbnails:', error);
      throw error;
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  /**
   * Get media type category
   */
  getMediaCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('text/') ||
      mimeType.includes('application/vnd.')
    ) {
      return 'document';
    }
    return 'other';
  }
}