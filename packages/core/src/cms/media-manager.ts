import { Types } from 'mongoose';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { CacheManager } from '../cache/cache-manager';
import { HookManager } from '../hooks/hook-manager';
import { FileHandler, type FileInfo } from '../utils/file-handler';
import { Sanitizer } from '../utils/sanitizer';
import { EventType } from '../events/event-types';
import { CoreHooks, CoreFilters } from '../hooks/hook-types';
import { PaginatedResult } from '../types/database';
import { MediaRepository, type MediaQuery, type MediaStats, type UploadOptions } from '../database/repositories/media-repository';
import { type IMedia } from '../database/models';
import fs from 'fs-extra';

export interface MediaManagerConfig {
  uploadDirectory: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  imageQuality: number;
  generateThumbnails: boolean;
  thumbnailSizes: ThumbnailSize[];
  enableImageOptimization: boolean;
  enableWebP: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
  enableCDN: boolean;
  cdnBaseUrl?: string;
  enableWatermark: boolean;
  watermarkPath?: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

export interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
  crop?: boolean;
  quality?: number;
}

export interface UploadResult {
  media: IMedia;
  file: FileInfo;
  thumbnails?: ThumbnailInfo[];
  optimized?: OptimizationResult;
}

export interface ThumbnailInfo {
  name: string;
  path: string;
  url: string;
  width: number;
  height: number;
  size: number;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
}

export interface MediaProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  watermark?: boolean;
  optimize?: boolean;
}

export interface BulkUploadResult {
  successful: UploadResult[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
  stats: {
    total: number;
    successful: number;
    failed: number;
    totalSize: number;
  };
}

/**
 * Media Manager
 * Handles file uploads, image processing, thumbnail generation, and media operations
 */
export class MediaManager {
  private static instance: MediaManager;
  private logger = new Logger('MediaManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private cache = CacheManager.getInstance();
  private hooks = HookManager.getInstance();
  private fileHandler = new FileHandler();
  private mediaRepo = new MediaRepository();
  private initialized = false;

  private readonly defaultConfig: MediaManagerConfig = {
    uploadDirectory: './uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    imageQuality: 85,
    generateThumbnails: true,
    thumbnailSizes: [
      { name: 'thumbnail', width: 150, height: 150, crop: true },
      { name: 'medium', width: 300, height: 300, crop: false },
      { name: 'large', width: 1024, height: 1024, crop: false },
    ],
    enableImageOptimization: true,
    enableWebP: true,
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour
    enableCDN: false,
    enableWatermark: false,
    watermarkPosition: 'bottom-right',
  };

  private constructor() {}

  public static getInstance(): MediaManager {
    if (!MediaManager.instance) {
      MediaManager.instance = new MediaManager();
    }
    return MediaManager.instance;
  }

  /**
   * Initialize media manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Media manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Media Manager...');

      // Load configuration
      const config = await this.config.get('media', this.defaultConfig);

      // Ensure upload directory exists
      await fs.ensureDir(config.uploadDirectory);

      // Create thumbnail directories
      for (const size of config.thumbnailSizes) {
        const thumbDir = path.join(config.uploadDirectory, 'thumbnails', size.name);
        await fs.ensureDir(thumbDir);
      }

      // Register media hooks
      await this.registerHooks();

      this.initialized = true;
      this.logger.info('Media Manager initialized successfully');

      await this.events.emit(EventType.SYSTEM_INIT, {
        component: 'MediaManager',
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Failed to initialize Media Manager:', error);
      throw error;
    }
  }

  // ===================================================================
  // UPLOAD OPERATIONS
  // ===================================================================

  /**
   * Upload single file
   */
  public async uploadFile(
    file: Express.Multer.File | Buffer,
    originalName: string,
    uploadedBy: Types.ObjectId,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      this.logger.debug('Uploading file', { originalName, size: Buffer.isBuffer(file) ? file.length : file.size });

      const config = await this.config.get('media', this.defaultConfig);

      // Validate file
      await this.validateFile(file, originalName, config);

      // Apply before_upload hook
      await this.hooks.doAction(CoreHooks.MEDIA_BEFORE_UPLOAD, {
        file,
        originalName,
        uploadedBy,
        options,
      });

      // Process file upload
      const fileInfo = await this.processFileUpload(file, originalName, config);

      // Create media record
      const mediaData: Partial<IMedia> = {
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        path: fileInfo.path,
        url: fileInfo.url,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        uploadedBy,
        isPublic: options.isPublic ?? true,
        tags: options.tags || [],
        ...(options.alt !== undefined ? { alt: options.alt } : {}),
        ...(options.caption !== undefined ? { caption: options.caption } : {}),
        ...(options.description !== undefined ? { description: options.description } : {}),
      };

      const media = await this.mediaRepo.create(mediaData);

      const result: UploadResult = {
        media,
        file: fileInfo,
      };

      // Generate thumbnails for images
      if (this.isImage(fileInfo.mimeType) && config.generateThumbnails) {
        result.thumbnails = await this.generateThumbnails(fileInfo, config);
      }

      // Optimize image if enabled
      if (this.isImage(fileInfo.mimeType) && config.enableImageOptimization) {
        result.optimized = await this.optimizeImage(fileInfo, config);
      }

      // Clear cache
      await this.clearMediaCache();

      // Apply after_upload hook
      await this.hooks.doAction(CoreHooks.MEDIA_UPLOADED, result);

      this.logger.info('File uploaded successfully', {
        id: media._id,
        filename: media.filename,
        size: media.size,
        type: media.mimeType,
      });

      return result;

    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  public async uploadFiles(
    files: Array<Express.Multer.File | { buffer: Buffer; originalname: string }>,
    uploadedBy: Types.ObjectId,
    options: UploadOptions = {}
  ): Promise<BulkUploadResult> {
    try {
      this.logger.info('Uploading multiple files', { count: files.length });

      const result: BulkUploadResult = {
        successful: [],
        failed: [],
        stats: {
          total: files.length,
          successful: 0,
          failed: 0,
          totalSize: 0,
        },
      };

      for (const file of files) {
        try {
          const fileData = 'buffer' in file ? file.buffer : file;
          const originalName =
            'originalname' in file
              ? file.originalname
              : 'originalName' in file
                ? (file as Express.Multer.File).originalname
                : '';

          const uploadResult = await this.uploadFile(fileData, originalName, uploadedBy, options);
          
          result.successful.push(uploadResult);
          result.stats.successful++;
          result.stats.totalSize += uploadResult.file.size;

        } catch (error) {
          const filename = 'originalname' in file ? file.originalname : 'unknown';
          result.failed.push({
            filename,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.stats.failed++;
        }
      }

      this.logger.info('Bulk upload completed', result.stats);

      return result;

    } catch (error) {
      this.logger.error('Error in bulk upload:', error);
      throw error;
    }
  }

  // ===================================================================
  // MEDIA OPERATIONS
  // ===================================================================
/**
 * Get media files with filtering and pagination
 */
public async getMedia(query: MediaQuery = {}): Promise<PaginatedResult<IMedia>> {
  try {
    const cacheKey = `media:${JSON.stringify(query)}`;
    
    // Check cache first
    const config = await this.config.get('media', this.defaultConfig);
    if (config.cacheEnabled) {
      const cached = await this.cache.get<PaginatedResult<IMedia>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fix: Use findMediaWithFilters instead of searchMedia
    const result = await this.mediaRepo.findMediaWithFilters(query);

    // Apply filter hook
    const filteredResult = await this.hooks.applyFilters(
      CoreFilters.DATABASE_RESULTS,
      result
    );

    // Cache result
    if (config.cacheEnabled) {
      await this.cache.set(cacheKey, filteredResult, config.cacheTTL);
    }

    return filteredResult;

  } catch (error) {
    this.logger.error('Error getting media:', error);
    throw error;
  }
}

  /**
   * Get media by ID
   */
  public async getMediaById(id: string): Promise<IMedia | null> {
    try {
      const cacheKey = `media:${id}`;
      const config = await this.config.get('media', this.defaultConfig);
      
      // Check cache first
      if (config.cacheEnabled) {
        const cached = await this.cache.get<IMedia>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const media = await this.mediaRepo.findById(id);

      // Cache result
      if (media && config.cacheEnabled) {
        await this.cache.set(cacheKey, media, config.cacheTTL);
      }

      return media;

    } catch (error) {
      this.logger.error('Error getting media by ID:', error);
      throw error;
    }
  }

  /**
   * Update media metadata
   */
  public async updateMedia(id: string, updateData: Partial<IMedia>): Promise<IMedia | null> {
    try {
      this.logger.debug('Updating media', { id, fields: Object.keys(updateData) });

      // Sanitize update data
      const sanitizedData = this.sanitizeMediaData(updateData);

      // Update media record
      const media = await this.mediaRepo.updateById(id, sanitizedData);

      if (media) {
        // Clear cache
        await this.clearMediaCache(id);

        this.logger.info('Media updated successfully', {
          id: media._id,
          filename: media.filename,
        });
      }

      return media;

    } catch (error) {
      this.logger.error('Error updating media:', error);
      throw error;
    }
  }

  /**
   * Delete media file
   */
  public async deleteMedia(id: string): Promise<boolean> {
    try {
      this.logger.debug('Deleting media', { id });

      // Get media record
      const media = await this.mediaRepo.findById(id);
      if (!media) {
        throw new Error('Media not found');
      }

      // Apply before_delete hook
      await this.hooks.doAction(CoreHooks.MEDIA_BEFORE_DELETE, media);

      // Delete physical files
      await this.deletePhysicalFiles(media);

      // Delete database record
      const deleted = await this.mediaRepo.deleteById(id);

      if (deleted) {
        // Clear cache
        await this.clearMediaCache(id);

        // Apply after_delete hook
        await this.hooks.doAction(CoreHooks.MEDIA_DELETED, media);

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

  // ===================================================================
  // IMAGE PROCESSING
  // ===================================================================

  /**
   * Process image with options
   */
  public async processImage(
    mediaId: string,
    options: MediaProcessingOptions
  ): Promise<{ url: string; size: number }> {
    try {
      const media = await this.mediaRepo.findById(mediaId);
      if (!media) {
        throw new Error('Media not found');
      }

      if (!this.isImage(media.mimeType)) {
        throw new Error('Media is not an image');
      }

      const config = await this.config.get('media', this.defaultConfig);
      const originalPath = path.resolve(media.path);
      
      // Generate processed filename
      const optionsHash = crypto.createHash('md5').update(JSON.stringify(options)).digest('hex');
      const ext = options.format || path.extname(media.filename).slice(1);
      const processedFilename = `${path.parse(media.filename).name}-${optionsHash}.${ext}`;
      const processedPath = path.join(config.uploadDirectory, 'processed', processedFilename);

      // Ensure processed directory exists
      await fs.ensureDir(path.dirname(processedPath));

      // Check if processed version already exists
      if (await fs.pathExists(processedPath)) {
        const stats = await fs.stat(processedPath);
        return {
          url: this.getFileUrl(processedPath),
          size: stats.size,
        };
      }

      // Process image
      let sharpInstance = sharp(originalPath);

      // Apply resize
      if (options.resize) {
        sharpInstance = sharpInstance.resize(
          options.resize.width,
          options.resize.height,
          { fit: options.resize.fit || 'cover' }
        );
      }

      // Apply format and quality
      if (options.format === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({ quality: options.quality || config.imageQuality });
      } else if (options.format === 'png') {
        sharpInstance = sharpInstance.png({ quality: options.quality || config.imageQuality });
      } else if (options.format === 'webp') {
        sharpInstance = sharpInstance.webp({ quality: options.quality || config.imageQuality });
      }

      // Apply watermark if enabled
      if (options.watermark && config.enableWatermark && config.watermarkPath) {
        sharpInstance = await this.applyWatermark(sharpInstance, config);
      }

      // Save processed image
      await sharpInstance.toFile(processedPath);

      const stats = await fs.stat(processedPath);

      return {
        url: this.getFileUrl(processedPath),
        size: stats.size,
      };

    } catch (error) {
      this.logger.error('Error processing image:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnails for image
   */
  public async generateThumbnails(
    fileInfo: FileInfo,
    config: MediaManagerConfig
  ): Promise<ThumbnailInfo[]> {
    try {
      if (!this.isImage(fileInfo.mimeType)) {
        return [];
      }

      const thumbnails: ThumbnailInfo[] = [];
      const originalPath = path.resolve(fileInfo.path);

      for (const size of config.thumbnailSizes) {
        const thumbFilename = `${path.parse(fileInfo.filename).name}-${size.name}.jpg`;
        const thumbPath = path.join(config.uploadDirectory, 'thumbnails', size.name, thumbFilename);

        await sharp(originalPath)
          .resize(size.width, size.height, {
            fit: size.crop ? 'cover' : 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: size.quality || config.imageQuality })
          .toFile(thumbPath);

        const stats = await fs.stat(thumbPath);

        thumbnails.push({
          name: size.name,
          path: thumbPath,
          url: this.getFileUrl(thumbPath),
          width: size.width,
          height: size.height,
          size: stats.size,
        });
      }

      return thumbnails;

    } catch (error) {
      this.logger.error('Error generating thumbnails:', error);
      return [];
    }
  }

  // ===================================================================
  // STATISTICS
  // ===================================================================
/**
 * Get media statistics
 */
public async getStats(): Promise<MediaStats> {
  try {
    const cacheKey = 'media:stats';
    const config = await this.config.get('media', this.defaultConfig);
    
    // Check cache first
    if (config.cacheEnabled) {
      const cached = await this.cache.get<MediaStats>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const stats = await this.mediaRepo.getMediaStats();

    // Cache stats
    if (config.cacheEnabled) {
      await this.cache.set(cacheKey, stats, 300); // 5 minutes
    }

    return stats;

  } catch (error) {
    this.logger.error('Error getting media stats:', error);
    throw error;
  }
}

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  /**
   * Register media hooks
   */
  private async registerHooks(): Promise<void> {
    // Register allowed file types filter
    await this.hooks.addFilter(CoreFilters.MEDIA_ALLOWED_TYPES, (types: string[]) => {
      return types;
    });

    // Register upload size limit filter
    await this.hooks.addFilter(CoreFilters.MEDIA_UPLOAD_SIZE_LIMIT, (limit: number) => {
      return limit;
    });
  }

  /**
   * Validate file before upload
   */
  private async validateFile(
    file: Express.Multer.File | Buffer,
    originalName: string,
    config: MediaManagerConfig
  ): Promise<void> {
    const fileSize = Buffer.isBuffer(file) ? file.length : file.size;
    const mimeType = Buffer.isBuffer(file) ? 
      FileHandler.getMimeType(originalName) : 
      file.mimetype;

    // Check file size
    const maxSize = await this.hooks.applyFilters(
      CoreFilters.MEDIA_UPLOAD_SIZE_LIMIT,
      config.maxFileSize
    );

    if (fileSize > maxSize) {
      throw new Error(`File size exceeds maximum limit of ${maxSize} bytes`);
    }

    // Check MIME type
    const allowedTypes = await this.hooks.applyFilters(
      CoreFilters.MEDIA_ALLOWED_TYPES,
      config.allowedMimeTypes
    );

    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }

    // Validate filename
    if (!Sanitizer.isValidFilename(originalName)) {
      throw new Error('Invalid filename');
    }
  }

  /**
   * Process file upload
   */
  private async processFileUpload(
    file: Express.Multer.File | Buffer,
    originalName: string,
    config: MediaManagerConfig
  ): Promise<FileInfo> {
    const fileBuffer = Buffer.isBuffer(file) ? file : file.buffer;
    const sanitizedName = Sanitizer.sanitizeFilename(originalName);
    
    // Generate unique filename
    const ext = path.extname(sanitizedName);
    const name = path.parse(sanitizedName).name;
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex').slice(0, 8);
    const filename = `${name}-${timestamp}-${hash}${ext}`;

    // Determine upload path
    const uploadPath = path.join(config.uploadDirectory, filename);

    // Save file
    await fs.writeFile(uploadPath, fileBuffer);

    // Get file stats
    const stats = await fs.stat(uploadPath);

    return {
      filename,
      originalName: sanitizedName,
      path: uploadPath,
      url: this.getFileUrl(uploadPath),
      mimeType: FileHandler.getMimeType(sanitizedName),
      size: stats.size,
      checksum: hash,
    };
  }

  /**
   * Optimize image
   */
  private async optimizeImage(
    fileInfo: FileInfo,
    config: MediaManagerConfig
  ): Promise<OptimizationResult> {
    try {
      const originalPath = path.resolve(fileInfo.path);
      const optimizedPath = path.join(
        path.dirname(originalPath),
        `optimized-${path.basename(originalPath)}`
      );

      const originalSize = fileInfo.size;
      
      await sharp(originalPath)
        .jpeg({ quality: config.imageQuality, progressive: true })
        .toFile(optimizedPath);

      const optimizedStats = await fs.stat(optimizedPath);
      const optimizedSize = optimizedStats.size;

      // Replace original with optimized if smaller
      if (optimizedSize < originalSize) {
        await fs.move(optimizedPath, originalPath, { overwrite: true });
      } else {
        await fs.remove(optimizedPath);
      }

      return {
        originalSize,
        optimizedSize: Math.min(optimizedSize, originalSize),
        compressionRatio: (originalSize - Math.min(optimizedSize, originalSize)) / originalSize,
        format: 'jpeg',
      };

    } catch (error) {
      this.logger.warn('Image optimization failed:', error);
      return {
        originalSize: fileInfo.size,
        optimizedSize: fileInfo.size,
        compressionRatio: 0,
        format: 'original',
      };
    }
  }

  /**
   * Apply watermark to image
   */
  private async applyWatermark(
    sharpInstance: sharp.Sharp,
    config: MediaManagerConfig
  ): Promise<sharp.Sharp> {
    if (!config.watermarkPath || !await fs.pathExists(config.watermarkPath)) {
      return sharpInstance;
    }

    const watermarkPosition = this.getWatermarkPosition(config.watermarkPosition);

    return sharpInstance.composite([{
      input: config.watermarkPath,
      gravity: watermarkPosition,
    }]);
  }

  /**
   * Get watermark position for Sharp
   */
  private getWatermarkPosition(position: string): sharp.Gravity {
    switch (position) {
      case 'top-left': return 'northwest';
      case 'top-right': return 'northeast';
      case 'bottom-left': return 'southwest';
      case 'bottom-right': return 'southeast';
      case 'center': return 'center';
      default: return 'southeast';
    }
  }

  /**
   * Delete physical files
   */
  private async deletePhysicalFiles(media: IMedia): Promise<void> {
    try {
      const config = await this.config.get('media', this.defaultConfig);

      // Delete main file
      if (await fs.pathExists(media.path)) {
        await fs.remove(media.path);
      }

      // Delete thumbnails
      if (this.isImage(media.mimeType)) {
        for (const size of config.thumbnailSizes) {
          const thumbFilename = `${path.parse(media.filename).name}-${size.name}.jpg`;
          const thumbPath = path.join(config.uploadDirectory, 'thumbnails', size.name, thumbFilename);
          
          if (await fs.pathExists(thumbPath)) {
            await fs.remove(thumbPath);
          }
        }
      }

    } catch (error) {
      this.logger.warn('Error deleting physical files:', error);
    }
  }

  /**
   * Get file URL
   */
  private getFileUrl(filePath: string): string {
    const config = this.config.getSync('media', this.defaultConfig);
    const relativePath = path.relative(config.uploadDirectory, filePath);
    
    if (config.enableCDN && config.cdnBaseUrl) {
      return `${config.cdnBaseUrl}/${relativePath}`;
    }

    return `/uploads/${relativePath}`;
  }

  /**
   * Check if file is an image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Sanitize media data
   */
  private sanitizeMediaData(data: Partial<IMedia>): Partial<IMedia> {
    const sanitized: Partial<IMedia> = { ...data };

    if (sanitized.alt) {
      sanitized.alt = Sanitizer.sanitizeText(sanitized.alt);
    }

    if (sanitized.caption) {
      sanitized.caption = Sanitizer.sanitizeText(sanitized.caption);
    }

    if (sanitized.description) {
      sanitized.description = Sanitizer.sanitizeHtml(sanitized.description);
    }

    if (sanitized.tags) {
      sanitized.tags = sanitized.tags
        .map(tag => Sanitizer.sanitizeText(tag))
        .filter(tag => tag.length > 0);
    }

    return sanitized;
  }

  /**
   * Clear media cache
   */
  private async clearMediaCache(id?: string): Promise<void> {
    const config = await this.config.get('media', this.defaultConfig);
    if (!config.cacheEnabled) return;

    if (id) {
      await this.cache.delete(`media:${id}`);
    }

    // Clear search cache
    await this.cache.deletePattern('media:*');
    
    // Clear stats cache
    await this.cache.delete('media:stats');
  }
}

/**
 * Default media manager instance
 */
export const mediaManager = MediaManager.getInstance();

export default MediaManager;