import { Types, FilterQuery } from 'mongoose';
import { BaseRepository } from './base-repository';
import { Media, type IMedia } from '../models/media';
import { FileHandler, FileInfo } from '../../utils/file-handler';
import { PaginatedResult, QueryOptions } from '../../types/database';
import { Sanitizer } from '../../utils/sanitizer';

export interface MediaQuery {
  category?: 'image' | 'video' | 'audio' | 'document' | 'other';
  mimeType?: string | string[];
  uploadedBy?: Types.ObjectId;
  tags?: string[];
  isPublic?: boolean;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sizeFrom?: number;
  sizeTo?: number;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

export interface MediaStats {
  total: number;
  totalSize: number;
  averageSize: number;
  totalDownloads: number;
  byType: Record<string, { count: number; totalSize: number }>;
  byUploader: Record<string, number>;
  recentUploads: number;
  popularFiles: Array<{
    id: string;
    filename: string;
    downloadCount: number;
  }>;
}

export interface UploadOptions {
  tags?: string[];
  alt?: string;
  caption?: string;
  description?: string;
  isPublic?: boolean;
}

export class MediaRepository extends BaseRepository<IMedia> {
  constructor() {
    super(Media, 'Media');
  }

  /**
   * Upload and create media record
   */
  async uploadFile(
    file: Express.Multer.File | Buffer,
    originalName: string,
    uploadedBy: Types.ObjectId,
    options: UploadOptions = {}
  ): Promise<IMedia> {
    try {
      this.logger.info('Uploading file', {
        originalName,
        uploadedBy,
        size: Buffer.isBuffer(file) ? file.length : file.size,
      });

      // Upload file using FileHandler
      const fileInfo: FileInfo = await FileHandler.uploadFile(file, originalName);

      // Sanitize metadata
      const sanitizedOptions = this.sanitizeUploadOptions(options);

      // Create media record
      const mediaData: Partial<IMedia> = {
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        path: fileInfo.path,
        url: fileInfo.url,
        ...(sanitizedOptions.alt && { alt: sanitizedOptions.alt }),
        ...(sanitizedOptions.caption && { caption: sanitizedOptions.caption }),
        ...(sanitizedOptions.description && { description: sanitizedOptions.description }),
        uploadedBy,
        metadata: {
          checksum: fileInfo.checksum,
          ...fileInfo.metadata,
        },
        tags: sanitizedOptions.tags || [],
        isPublic: sanitizedOptions.isPublic !== false, // Default to true
        downloadCount: 0,
      };

      const media = await this.create(mediaData);

      this.logger.info('Media file uploaded successfully', {
        id: media._id,
        filename: media.filename,
        size: media.size,
      });

      // Emit upload event
      await this.events.emit('media:uploaded', {
        id: media._id,
        filename: media.filename,
        uploadedBy,
        size: media.size,
        mimeType: media.mimeType,
      });

      return media;
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Get media by ID with download count increment
   */
  async getMediaById(
    id: string | Types.ObjectId,
    incrementDownload: boolean = false,
    options: QueryOptions = {}
  ): Promise<IMedia | null> {
    try {
      const media = await this.findById(id, options);
      
      if (media && incrementDownload) {
        // Increment download count asynchronously
        this.incrementDownloadCount(media.id).catch(error => {
          this.logger.error('Error incrementing download count:', error);
        });
      }

      return media;
    } catch (error) {
      this.logger.error('Error getting media by ID:', error);
      throw error;
    }
  }

  /**
   * Get media by filename
   */
  async getMediaByFilename(
    filename: string,
    options: QueryOptions = {}
  ): Promise<IMedia | null> {
    return this.findOne({ filename }, options);
  }

  /**
   * Search media with advanced filters
   */
  async findMediaWithFilters(query: MediaQuery): Promise<PaginatedResult<IMedia>> {
    try {
      const filter: FilterQuery<IMedia> = {};

      // Category filter (based on MIME type)
      if (query.category) {
        switch (query.category) {
          case 'image':
            filter.mimeType = /^image\//i;
            break;
          case 'video':
            filter.mimeType = /^video\//i;
            break;
          case 'audio':
            filter.mimeType = /^audio\//i;
            break;
          case 'document':
            filter.mimeType = {
              $in: [/pdf/i, /document/i, /text\//i, /application\/vnd\./i],
            };
            break;
          case 'other':
            filter.mimeType = {
              $not: /^(image|video|audio)\//i,
              $nin: [/pdf/i, /document/i, /text\//i, /application\/vnd\./i],
            };
            break;
        }
      }

      // MIME type filter
      if (query.mimeType) {
        if (Array.isArray(query.mimeType)) {
          filter.mimeType = { $in: query.mimeType };
        } else {
          filter.mimeType = new RegExp(query.mimeType, 'i');
        }
      }

      // Uploader filter
      if (query.uploadedBy) {
        filter.uploadedBy = query.uploadedBy;
      }

      // Tags filter
      if (query.tags && query.tags.length > 0) {
        filter.tags = { $in: query.tags };
      }

      // Public/private filter
      if (query.isPublic !== undefined) {
        filter.isPublic = query.isPublic;
      }

      // Search filter
      if (query.search) {
        const searchRegex = new RegExp(query.search, 'i');
        filter.$or = [
          { originalName: searchRegex },
          { filename: searchRegex },
          { alt: searchRegex },
          { caption: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
        ];
      }

      // Date range filter
      if (query.dateFrom || query.dateTo) {
        filter.createdAt = {};
        if (query.dateFrom) {
          filter.createdAt.$gte = query.dateFrom;
        }
        if (query.dateTo) {
          filter.createdAt.$lte = query.dateTo;
        }
      }

      // Size range filter
      if (query.sizeFrom || query.sizeTo) {
        filter.size = {};
        if (query.sizeFrom) {
          filter.size.$gte = query.sizeFrom;
        }
        if (query.sizeTo) {
          filter.size.$lte = query.sizeTo;
        }
      }

      const paginationOptions = {
        page: query.page || 1,
        limit: query.limit || 20,
        sort: query.sort || { createdAt: -1 },
      };

      const result = await this.paginate(filter, paginationOptions);

      this.logger.debug('Media search completed', {
        total: result.pagination.total,
        page: result.pagination.page,
        filters: Object.keys(filter),
      });

      return result;
    } catch (error) {
      this.logger.error('Error searching media with filters:', error);
      throw error;
    }
  }

  /**
   * Get media by category
   */
  async getMediaByCategory(
    category: 'image' | 'video' | 'audio' | 'document',
    options: QueryOptions = {}
  ): Promise<IMedia[]> {
    const query: MediaQuery = { category };
    const result = await this.findMediaWithFilters(query);
    return result.data;
  }

  /**
   * Get images only
   */
  async getImages(options: QueryOptions = {}): Promise<IMedia[]> {
    const defaultOptions: QueryOptions = {
      sort: { createdAt: -1 },
      ...options,
    };

    return this.findMany({ mimeType: /^image\//i }, defaultOptions);
  }

  /**
   * Get recent uploads
   */
  async getRecentUploads(
    limit: number = 20,
    uploadedBy?: Types.ObjectId
  ): Promise<IMedia[]> {
    const filter: FilterQuery<IMedia> = {};
    if (uploadedBy) {
      filter.uploadedBy = uploadedBy;
    }

    return this.findMany(filter, {
      sort: { createdAt: -1 },
      limit,
      populate: 'uploadedBy',
    });
  }

  /**
   * Get popular media (most downloaded)
   */
  async getPopularMedia(limit: number = 10): Promise<IMedia[]> {
    return this.findMany(
      { downloadCount: { $gt: 0 } },
      {
        sort: { downloadCount: -1 },
        limit,
        populate: 'uploadedBy',
      }
    );
  }

  /**
   * Get media by uploader
   */
  async getMediaByUploader(
    uploaderId: Types.ObjectId,
    options: QueryOptions = {}
  ): Promise<IMedia[]> {
    const defaultOptions: QueryOptions = {
      sort: { createdAt: -1 },
      ...options,
    };

    return this.findMany({ uploadedBy: uploaderId }, defaultOptions);
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
      tags?: string[];
      isPublic?: boolean;
    }
  ): Promise<IMedia | null> {
    try {
      const sanitizedMetadata = this.sanitizeMetadata(metadata);
      
      const media = await this.updateById(id, sanitizedMetadata);

      if (media) {
        this.logger.info('Media metadata updated', {
          id: media._id,
          filename: media.filename,
        });

        // Emit update event
        await this.events.emit('media:updated', {
          id: media._id,
          filename: media.filename,
          metadata: sanitizedMetadata,
        });
      }

      return media;
    } catch (error) {
      this.logger.error('Error updating media metadata:', error);
      throw error;
    }
  }

  /**
   * Add tag to media
   */
  async addTag(
    id: string | Types.ObjectId,
    tag: string
  ): Promise<IMedia | null> {
    try {
      const sanitizedTag = Sanitizer.sanitizeText(tag).toLowerCase();
      
      const media = await this.findById(id);
      if (!media) {
        throw new Error('Media not found');
      }

      if (!media.tags.includes(sanitizedTag)) {
        return this.updateById(id, {
          $addToSet: { tags: sanitizedTag },
        });
      }

      return media;
    } catch (error) {
      this.logger.error('Error adding tag to media:', error);
      throw error;
    }
  }

  /**
   * Remove tag from media
   */
  async removeTag(
    id: string | Types.ObjectId,
    tag: string
  ): Promise<IMedia | null> {
    try {
      const sanitizedTag = Sanitizer.sanitizeText(tag).toLowerCase();
      
      return this.updateById(id, {
        $pull: { tags: sanitizedTag },
      });
    } catch (error) {
      this.logger.error('Error removing tag from media:', error);
      throw error;
    }
  }

  /**
   * Delete media file and record
   */
  async deleteMedia(id: string | Types.ObjectId): Promise<boolean> {
    try {
      const media = await this.findById(id);
      if (!media) {
        return false;
      }

      // Delete physical file
      await FileHandler.deleteFile(media.path);

      // Delete database record
      const deleted = await this.deleteById(id);

      if (deleted) {
        this.logger.info('Media deleted successfully', {
          id: media._id,
          filename: media.filename,
        });

        // Emit deletion event
        await this.events.emit('media:deleted', {
          id: media._id,
          filename: media.filename,
          originalName: media.originalName,
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
  async bulkDeleteMedia(ids: string[]): Promise<{
    successful: number;
    failed: Array<{ id: string; error: string }>;
  }> {
    const results = {
      successful: 0,
      failed: [] as Array<{ id: string; error: string }>,
    };

    for (const id of ids) {
      try {
        const deleted = await this.deleteMedia(id);
        if (deleted) {
          results.successful++;
        } else {
          results.failed.push({ id, error: 'Media not found' });
        }
      } catch (error) {
        results.failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.info('Bulk media deletion completed', {
      successful: results.successful,
      failed: results.failed.length,
    });

    return results;
  }

  /**
   * Get media statistics
   */
  async getMediaStats(): Promise<MediaStats> {
    try {
      const [
        totalStats,
        typeStats,
        uploaderStats,
        popularFiles,
      ] = await Promise.all([
        this.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              totalSize: { $sum: '$size' },
              averageSize: { $avg: '$size' },
              totalDownloads: { $sum: '$downloadCount' },
            },
          },
        ]),
        this.aggregate([
          {
            $group: {
              _id: {
                $cond: {
                  if: { $regexMatch: { input: '$mimeType', regex: /^image\//i } },
                  then: 'image',
                  else: {
                    $cond: {
                      if: { $regexMatch: { input: '$mimeType', regex: /^video\//i } },
                      then: 'video',
                      else: {
                        $cond: {
                          if: { $regexMatch: { input: '$mimeType', regex: /^audio\//i } },
                          then: 'audio',
                          else: 'document',
                        },
                      },
                    },
                  },
                },
              },
              count: { $sum: 1 },
              totalSize: { $sum: '$size' },
            },
          },
        ]),
        this.aggregate([
          {
            $group: {
              _id: '$uploadedBy',
              count: { $sum: 1 },
            },
          },
        ]),
        this.aggregate([
          { $match: { downloadCount: { $gt: 0 } } },
          { $sort: { downloadCount: -1 } },
          { $limit: 10 },
          {
            $project: {
              id: '$_id',
              filename: 1,
              downloadCount: 1,
            },
          },
        ]),
      ]);

      // Get recent uploads count (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentUploads = await this.count({
        createdAt: { $gte: weekAgo },
      });

      // Process results
      const total = totalStats[0] || {
        total: 0,
        totalSize: 0,
        averageSize: 0,
        totalDownloads: 0,
      };

      const byType = typeStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = {
          count: stat.count,
          totalSize: stat.totalSize,
        };
        return acc;
      }, {});

      const byUploader = uploaderStats.reduce((acc: any, stat: any) => {
        acc[stat._id.toString()] = stat.count;
        return acc;
      }, {});

      return {
        total: total.total,
        totalSize: total.totalSize,
        averageSize: total.averageSize,
        totalDownloads: total.totalDownloads,
        byType,
        byUploader,
        recentUploads,
        popularFiles,
      };
    } catch (error) {
      this.logger.error('Error getting media statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles(): Promise<{
    scanned: number;
    deleted: number;
    errors: string[];
  }> {
    try {
      this.logger.info('Starting orphaned files cleanup...');

      const results = {
        scanned: 0,
        deleted: 0,
        errors: [] as string[],
      };

      // Find all media records
      const allMedia = await this.findMany({}, { select: 'path filename' });
      results.scanned = allMedia.length;

      for (const media of allMedia) {
        try {
          // Check if physical file exists
          const exists = await FileHandler.fileExists(media.path);
          
          if (!exists) {
            // Delete orphaned database record
            await this.deleteById(media.id);
            results.deleted++;
            
            this.logger.debug('Deleted orphaned media record', {
              id: media._id,
              filename: media.filename,
            });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`${media.filename}: ${errorMsg}`);
        }
      }

      this.logger.info('Orphaned files cleanup completed', {
        scanned: results.scanned,
        deleted: results.deleted,
        errors: results.errors.length,
      });

      return results;
    } catch (error) {
      this.logger.error('Error during orphaned files cleanup:', error);
      throw error;
    }
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(id: string | Types.ObjectId): Promise<void> {
    try {
      await this.updateById(id, {
        $inc: { downloadCount: 1 },
      });
    } catch (error) {
      this.logger.error('Error incrementing download count:', error);
    }
  }

  /**
   * Get unique tags
   */
  async getUniqueTags(): Promise<string[]> {
    try {
      const tags = await this.distinct('tags');
      return tags.sort();
    } catch (error) {
      this.logger.error('Error getting unique tags:', error);
      throw error;
    }
  }

  /**
   * Sanitize upload options
   */
  private sanitizeUploadOptions(options: UploadOptions): UploadOptions {
    const sanitized: UploadOptions = { ...options };

    if (sanitized.alt) {
      sanitized.alt = Sanitizer.sanitizeText(sanitized.alt);
    }

    if (sanitized.caption) {
      sanitized.caption = Sanitizer.sanitizeText(sanitized.caption);
    }

    if (sanitized.description) {
      sanitized.description = Sanitizer.sanitizeText(sanitized.description);
    }

    if (sanitized.tags) {
      sanitized.tags = sanitized.tags
        .map(tag => Sanitizer.sanitizeText(tag).toLowerCase())
        .filter(tag => tag.length > 0)
        .slice(0, 20); // Limit to 20 tags
    }

    return sanitized;
  }

  /**
   * Sanitize metadata
   */
  private sanitizeMetadata(metadata: any): any {
    const sanitized: any = { ...metadata };

    if (sanitized.alt) {
      sanitized.alt = Sanitizer.sanitizeText(sanitized.alt);
    }

    if (sanitized.caption) {
      sanitized.caption = Sanitizer.sanitizeText(sanitized.caption);
    }

    if (sanitized.description) {
      sanitized.description = Sanitizer.sanitizeText(sanitized.description);
    }

    if (sanitized.tags) {
      sanitized.tags = sanitized.tags
        .map((tag: string) => Sanitizer.sanitizeText(tag).toLowerCase())
        .filter((tag: string) => tag.length > 0)
        .slice(0, 20);
    }

    return sanitized;
  }

  /**
   * Validate file upload
   */
  async validateUpload(
    file: Express.Multer.File | Buffer,
    originalName: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const size = Buffer.isBuffer(file) ? file.length : file.size;
      const maxSize = 50 * 1024 * 1024; // 50MB

      // Check file size
      if (size > maxSize) {
        return {
          valid: false,
          error: `File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
        };
      }

      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg',
        'audio/mp3', 'audio/wav', 'audio/ogg',
        'application/pdf',
        'text/plain', 'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      const mimeType = FileHandler.getMimeType(originalName);
      if (!allowedTypes.includes(mimeType)) {
        return {
          valid: false,
          error: `File type not allowed: ${mimeType}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }
}