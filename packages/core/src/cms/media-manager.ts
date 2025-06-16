import { Types } from 'mongoose';
import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import mime from 'mime-types';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { EventType } from '../events/event-types';
import { HookManager } from '../hooks/hook-manager';
import { CoreHooks, CoreFilters } from '../hooks/hook-types';
import { CacheManager } from '../cache/cache-manager';
import { ConfigManager } from '../config/config-manager';
import { MediaRepository, MediaQuery, MediaStats, UploadOptions } from '../database/repositories/media-repository';
import { Media, type IMedia } from '../database/models/media';
import { PaginatedResult } from '../types/database';
import { Sanitizer } from '../utils/sanitizer';
import { FileHandler } from '../utils/file-handler';

export interface MediaUploadResult {
  media: IMedia;
  thumbnails?: Record<string, string>;
  metadata: {
    originalSize: number;
    processedSize: number;
    format: string;
    dimensions?: { width: number; height: number };
    duration?: number;
  };
}

export interface MediaProcessingOptions {
  generateThumbnails: boolean;
  thumbnailSizes: number[];
  optimizeImages: boolean;
  quality: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  watermark?: {
    enabled: boolean;
    image?: string;
    text?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
}

export interface MediaLibraryQuery extends MediaQuery {
  folder?: string;
  folderId?: string;
  recent?: boolean;
  popular?: boolean;
}

export interface MediaFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  mediaCount: number;
  totalSize: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaBulkAction {
  action: 'delete' | 'move' | 'copy' | 'optimize' | 'generate_thumbnails';
  ids: string[];
  targetFolder?: string;
  options?: Record<string, any>;
}

export interface MediaBulkResult {
  success: string[];
  failed: Array<{ id: string; error: string }>;
  total: number;
}

export interface StorageProvider {
  name: string;
  upload(file: Buffer, filename: string, options?: any): Promise<{ url: string; path: string }>;
  delete(path: string): Promise<boolean>;
  getUrl(path: string): string;
  exists(path: string): Promise<boolean>;
}

/**
 * Media Manager
 * Handles file uploads, media library, image processing, and storage management
 */
export class MediaManager {
  private static instance: MediaManager;
  private logger: Logger;
  private events: EventManager;
  private hooks: HookManager;
  private cache: CacheManager;
  private config: ConfigManager;
  private mediaRepo: MediaRepository;
  private fileHandler: FileHandler;
  private storageProvider: StorageProvider;
  private initialized = false;

  private readonly defaultProcessingOptions: MediaProcessingOptions = {
    generateThumbnails: true,
    thumbnailSizes: [150, 300, 600, 1200],
    optimizeImages: true,
    quality: 80,
    format: 'auto',
  };

  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  private constructor() {
    this.logger = new Logger('MediaManager');
    this.events = EventManager.getInstance();
    this.hooks = HookManager.getInstance();
    this.cache = CacheManager.getInstance();
    this.config = ConfigManager.getInstance();
    this.mediaRepo = new MediaRepository();
    this.fileHandler = new FileHandler();
    this.storageProvider = this.createStorageProvider();
  }

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

      // Setup upload directories
      await this.setupUploadDirectories();

      // Setup media hooks
      await this.setupMediaHooks();

      // Initialize cache
      await this.initializeCache();

      // Cleanup old temporary files
      await this.cleanupTempFiles();

      this.initialized = true;
      this.logger.info('Media Manager initialized successfully');

      // Emit initialization event
      await this.events.emit(EventType.CMS_INITIALIZED, {
        type: 'media_manager_initialized',
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Failed to initialize Media Manager:', error);
      throw error;
    }
  }

  // ===================================================================
  // FILE UPLOAD & MANAGEMENT
  // ===================================================================

  /**
   * Upload file and create media record
   */
  public async uploadFile(
    file: Express.Multer.File | Buffer,
    originalName: string,
    uploadedBy: Types.ObjectId,
    options: UploadOptions & MediaProcessingOptions = {}
  ): Promise<MediaUploadResult> {
    try {
      this.logger.info('Uploading file', { 
        originalName,
        uploadedBy: uploadedBy.toString(),
        size: Buffer.isBuffer(file) ? file.length : file.size 
      });

      // Apply before_upload hook
      const hookData = await this.hooks.applyFilters(CoreFilters.MEDIA_UPLOAD_SIZE_LIMIT, {
        file,
        originalName,
        uploadedBy,
        options,
      });

      // Validate file
      await this.validateFile(file, originalName);

      // Prepare file data
      const fileBuffer = Buffer.isBuffer(file) ? file : file.buffer;
      const fileInfo = await this.analyzeFile(fileBuffer, originalName);

      // Generate unique filename
      const filename = await this.generateUniqueFilename(originalName);
      const filePath = await this.getUploadPath(filename);

      // Process file based on type
      const processedFile = await this.processFile(fileBuffer, fileInfo, {
        ...this.defaultProcessingOptions,
        ...options,
      });

      // Upload to storage
      const storageResult = await this.storageProvider.upload(
        processedFile.buffer,
        filename,
        { contentType: fileInfo.mimeType }
      );

      // Create media record
      const mediaData: Partial<IMedia> = {
        filename,
        originalName: Sanitizer.sanitizeFilename(originalName),
        mimeType: fileInfo.mimeType,
        size: processedFile.buffer.length,
        path: storageResult.path,
        url: storageResult.url,
        alt: options.alt,
        caption: options.caption,
        description: options.description,
        uploadedBy,
        metadata: {
          width: processedFile.width,
          height: processedFile.height,
          format: fileInfo.format,
          dimensions: processedFile.width && processedFile.height 
            ? `${processedFile.width}x${processedFile.height}` 
            : undefined,
          duration: fileInfo.duration,
        },
        tags: options.tags || [],
        isPublic: options.isPublic !== false,
      };

      const media = await this.mediaRepo.create(mediaData);

      // Generate thumbnails for images
      let thumbnails: Record<string, string> = {};
      if (this.isImage(fileInfo.mimeType) && options.generateThumbnails !== false) {
        thumbnails = await this.generateThumbnails(media, processedFile.buffer, options);
      }

      // Clear media cache
      await this.clearMediaCache();

      // Execute after_upload hook
      await this.hooks.doAction(CoreHooks.MEDIA_UPLOADED, media);

      // Emit upload event
      await this.events.emit(EventType.MEDIA_UPLOADED, {
        id: media._id.toString(),
        filename: media.filename,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.size,
        uploadedBy: media.uploadedBy.toString(),
        timestamp: new Date(),
      });

      const result: MediaUploadResult = {
        media,
        thumbnails,
        metadata: {
          originalSize: Buffer.isBuffer(file) ? file.length : file.size,
          processedSize: processedFile.buffer.length,
          format: fileInfo.format,
          dimensions: processedFile.width && processedFile.height 
            ? { width: processedFile.width, height: processedFile.height }
            : undefined,
          duration: fileInfo.duration,
        },
      };

      this.logger.info('File uploaded successfully', {
        id: media._id,
        filename: media.filename,
        size: media.size,
        thumbnails: Object.keys(thumbnails).length,
      });

      return result;

    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Delete media file
   */
  public async deleteMedia(id: string, deletePermanent: boolean = false): Promise<boolean> {
    try {
      this.logger.info('Deleting media', { id, deletePermanent });

      const media = await this.mediaRepo.findById(id);
      if (!media) {
        throw new Error('Media not found');
      }

      // Execute before_delete hook
      await this.hooks.doAction(CoreHooks.MEDIA_BEFORE_DELETE, media);

      // Delete from storage
      if (deletePermanent) {
        await this.storageProvider.delete(media.path);

        // Delete thumbnails
        const thumbnailPaths = await this.getThumbnailPaths(media);
        for (const thumbnailPath of thumbnailPaths) {
          try {
            await this.storageProvider.delete(thumbnailPath);
          } catch (error) {
            this.logger.warn(`Failed to delete thumbnail: ${thumbnailPath}`, error);
          }
        }
      }

      // Delete database record
      const deleted = await this.mediaRepo.deleteById(id);

      if (deleted) {
        // Clear cache
        await this.clearMediaCache();
        await this.cache.delete(`media:${id}`);

        // Execute after_delete hook
        await this.hooks.doAction(CoreHooks.MEDIA_DELETED, media);

        // Emit delete event
        await this.events.emit(EventType.MEDIA_DELETED, {
          id: media.id.toString(),
          filename: media.filename,
          permanent: deletePermanent,
          timestamp: new Date(),
        });

        this.logger.info('Media deleted successfully', { 
          id: media._id,
          filename: media.filename,
          permanent: deletePermanent 
        });
      }

      return deleted;

    } catch (error) {
      this.logger.error('Error deleting media:', error);
      throw error;
    }
  }

  /**
   * Get media by ID
   */
  public async getMedia(id: string, useCache: boolean = true): Promise<IMedia | null> {
    try {
      // Check cache first
      if (useCache) {
        const cached = await this.cache.get(`media:${id}`);
        if (cached) {
          return cached;
        }
      }

      const media = await this.mediaRepo.findById(id, {
        populate: ['uploadedBy'],
      });

      if (media && useCache) {
        await this.cache.set(`media:${id}`, media, 600); // 10 minutes
      }

      return media;

    } catch (error) {
      this.logger.error('Error getting media:', error);
      throw error;
    }
  }

  /**
   * Get media library with pagination and filtering
   */
  public async getMediaLibrary(query: MediaLibraryQuery = {}): Promise<PaginatedResult<IMedia>> {
    try {
      // Build cache key
      const cacheKey = `media_library:${JSON.stringify(query)}`;
      
      // Check cache
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Apply filters
      const filter = await this.hooks.applyFilters(CoreFilters.MEDIA_ALLOWED_TYPES, query);

      const result = await this.mediaRepo.getMediaLibrary(filter);

      // Cache results
      await this.cache.set(cacheKey, result, 300); // 5 minutes

      return result;

    } catch (error) {
      this.logger.error('Error getting media library:', error);
      throw error;
    }
  }

  /**
   * Update media metadata
   */
  public async updateMedia(id: string, data: Partial<IMedia>): Promise<IMedia | null> {
    try {
      this.logger.info('Updating media', { id });

      // Sanitize inputs
      if (data.alt) data.alt = Sanitizer.sanitizeText(data.alt);
      if (data.caption) data.caption = Sanitizer.sanitizeText(data.caption);
      if (data.description) data.description = Sanitizer.sanitizeText(data.description);

      const updatedMedia = await this.mediaRepo.updateById(id, data);

      if (updatedMedia) {
        // Clear cache
        await this.clearMediaCache();
        await this.cache.delete(`media:${id}`);

        // Emit update event
        await this.events.emit(EventType.MEDIA_UPDATED, {
          id: updatedMedia._id.toString(),
          filename: updatedMedia.filename,
          changes: Object.keys(data),
          timestamp: new Date(),
        });

        this.logger.info('Media updated successfully', { 
          id: updatedMedia._id,
          filename: updatedMedia.filename 
        });
      }

      return updatedMedia;

    } catch (error) {
      this.logger.error('Error updating media:', error);
      throw error;
    }
  }

  // ===================================================================
  // IMAGE PROCESSING
  // ===================================================================

  /**
   * Generate thumbnails for image
   */
  public async generateThumbnails(
    media: IMedia,
    imageBuffer: Buffer,
    options: MediaProcessingOptions = {
        generateThumbnails: false,
        thumbnailSizes: [],
        optimizeImages: false,
        quality: 0
    }
  ): Promise<Record<string, string>> {
    try {
      if (!this.isImage(media.mimeType)) {
        return {};
      }

      const thumbnails: Record<string, string> = {};
      const sizes = options.thumbnailSizes || this.defaultProcessingOptions.thumbnailSizes;

      for (const size of sizes) {
        try {
          const thumbnailBuffer = await sharp(imageBuffer)
            .resize(size, size, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: options.quality || 80 })
            .toBuffer();

          const thumbnailFilename = this.getThumbnailFilename(media.filename, size);
          const thumbnailPath = await this.getUploadPath(thumbnailFilename, 'thumbnails');

          const storageResult = await this.storageProvider.upload(
            thumbnailBuffer,
            thumbnailFilename,
            { contentType: 'image/jpeg' }
          );

          thumbnails[`${size}w`] = storageResult.url;

        } catch (error) {
          this.logger.warn(`Failed to generate ${size}px thumbnail for ${media.filename}:`, error);
        }
      }

      this.logger.debug('Thumbnails generated', {
        mediaId: media._id,
        count: Object.keys(thumbnails).length,
      });

      return thumbnails;

    } catch (error) {
      this.logger.error('Error generating thumbnails:', error);
      return {};
    }
  }

  /**
   * Optimize image
   */
  public async optimizeImage(
    imageBuffer: Buffer,
    options: MediaProcessingOptions = {
        generateThumbnails: false,
        thumbnailSizes: [],
        optimizeImages: false,
        quality: 0
    }
  ): Promise<{ buffer: Buffer; width?: number; height?: number }> {
    try {
      const format = options.format || 'auto';
      const quality = options.quality || 80;

      let sharpInstance = sharp(imageBuffer);

      // Get image metadata
      const metadata = await sharpInstance.metadata();

      // Apply format conversion
      if (format === 'webp') {
        sharpInstance = sharpInstance.webp({ quality });
      } else if (format === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({ quality });
      } else if (format === 'png') {
        sharpInstance = sharpInstance.png({ compressionLevel: 9 });
      } else {
        // Auto format - choose based on original format
        if (metadata.format === 'png' && metadata.channels === 4) {
          // Keep PNG for images with transparency
          sharpInstance = sharpInstance.png({ compressionLevel: 9 });
        } else {
          // Convert to JPEG for better compression
          sharpInstance = sharpInstance.jpeg({ quality });
        }
      }

      const optimizedBuffer = await sharpInstance.toBuffer();

      return {
        buffer: optimizedBuffer,
        width: metadata.width,
        height: metadata.height,
      };

    } catch (error) {
      this.logger.error('Error optimizing image:', error);
      // Return original buffer if optimization fails
      return { buffer: imageBuffer };
    }
  }

  // ===================================================================
  // BULK OPERATIONS
  // ===================================================================

  /**
   * Execute bulk media operations
   */
  public async bulkAction(action: MediaBulkAction): Promise<MediaBulkResult> {
    try {
      this.logger.info('Executing bulk media action', { 
        action: action.action,
        count: action.ids.length 
      });

      const result: MediaBulkResult = {
        success: [],
        failed: [],
        total: action.ids.length,
      };

      for (const id of action.ids) {
        try {
          switch (action.action) {
            case 'delete':
              await this.deleteMedia(id, true);
              break;
            case 'optimize':
              await this.optimizeExistingImage(id);
              break;
            case 'generate_thumbnails':
              await this.regenerateThumbnails(id);
              break;
            default:
              throw new Error(`Unsupported bulk action: ${action.action}`);
          }
          result.success.push(id);
        } catch (error) {
          result.failed.push({
            id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.logger.info('Bulk media action completed', {
        action: action.action,
        success: result.success.length,
        failed: result.failed.length,
      });

      return result;

    } catch (error) {
      this.logger.error('Error executing bulk media action:', error);
      throw error;
    }
  }

  /**
   * Get media statistics
   */
  public async getStats(): Promise<MediaStats> {
    try {
      return await this.mediaRepo.getStats();
    } catch (error) {
      this.logger.error('Error getting media stats:', error);
      throw error;
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  /**
   * Setup upload directories
   */
  private async setupUploadDirectories(): Promise<void> {
    try {
      const uploadDir = this.config.getSync('media.uploads.directory', './public/uploads');
      const directories = [
        uploadDir,
        path.join(uploadDir, 'thumbnails'),
        path.join(uploadDir, 'temp'),
      ];

      for (const dir of directories) {
        await fs.ensureDir(dir);
      }

      this.logger.debug('Upload directories setup completed');
    } catch (error) {
      this.logger.error('Error setting up upload directories:', error);
      throw error;
    }
  }

  /**
   * Setup media hooks
   */
  private async setupMediaHooks(): Promise<void> {
    try {
      // Register media filters
      this.hooks.addFilter(CoreFilters.MEDIA_ALLOWED_TYPES, async (types: string[]) => {
        return [...types, ...this.allowedMimeTypes];
      }, { priority: 10 });

      this.hooks.addFilter(CoreFilters.MEDIA_UPLOAD_SIZE_LIMIT, async (data: any) => {
        const maxSize = this.config.getSync('media.uploads.maxFileSize', 50 * 1024 * 1024);
        const fileSize = Buffer.isBuffer(data.file) ? data.file.length : data.file.size;
        
        if (fileSize > maxSize) {
          throw new Error(`File size ${fileSize} exceeds maximum allowed size ${maxSize}`);
        }
        
        return data;
      }, { priority: 5 });

      this.logger.debug('Media hooks setup completed');
    } catch (error) {
      this.logger.error('Error setting up media hooks:', error);
    }
  }

  /**
   * Initialize media cache
   */
  private async initializeCache(): Promise<void> {
    try {
      // Preload frequently accessed media metadata
      this.logger.debug('Media cache initialized');
    } catch (error) {
      this.logger.warn('Error initializing media cache:', error);
    }
  }

  /**
   * Clear media cache
   */
  private async clearMediaCache(): Promise<void> {
    try {
      await this.cache.deletePattern('media:*');
      await this.cache.deletePattern('media_library:*');
    } catch (error) {
      this.logger.warn('Error clearing media cache:', error);
    }
  }

  /**
   * Create storage provider based on configuration
   */
  private createStorageProvider(): StorageProvider {
    const adapter = this.config.getSync('media.storage.adapter', 'local');
    
    switch (adapter) {
      case 'local':
        return new LocalStorageProvider(this.config);
      case 's3':
        // return new S3StorageProvider(this.config);
        throw new Error('S3 storage provider not implemented yet');
      case 'cloudinary':
        // return new CloudinaryStorageProvider(this.config);
        throw new Error('Cloudinary storage provider not implemented yet');
      default:
        return new LocalStorageProvider(this.config);
    }
  }

  /**
   * Validate uploaded file
   */
  private async validateFile(file: Express.Multer.File | Buffer, originalName: string): Promise<void> {
    const maxSize = this.config.getSync('media.uploads.maxFileSize', 50 * 1024 * 1024);
    const fileSize = Buffer.isBuffer(file) ? file.length : file.size;
    
    if (fileSize > maxSize) {
      throw new Error(`File size ${fileSize} exceeds maximum allowed size ${maxSize}`);
    }

    const mimeType = Buffer.isBuffer(file) 
      ? mime.lookup(originalName) || 'application/octet-stream'
      : file.mimetype;

    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }
  }

  /**
   * Analyze file metadata
   */
  private async analyzeFile(buffer: Buffer, originalName: string): Promise<{
    mimeType: string;
    format: string;
    duration?: number;
  }> {
    const mimeType = mime.lookup(originalName) || 'application/octet-stream';
    const format = path.extname(originalName).toLowerCase().slice(1);

    const result = {
      mimeType,
      format,
    };

    // For video/audio files, we would extract duration here
    // This would require additional libraries like ffprobe

    return result;
  }

  /**
   * Process file based on type and options
   */
  private async processFile(
    buffer: Buffer,
    fileInfo: { mimeType: string; format: string },
    options: MediaProcessingOptions
  ): Promise<{ buffer: Buffer; width?: number; height?: number }> {
    if (this.isImage(fileInfo.mimeType) && options.optimizeImages) {
      return await this.optimizeImage(buffer, options);
    }

    return { buffer };
  }

  /**
   * Generate unique filename
   */
  private async generateUniqueFilename(originalName: string): Promise<string> {
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);
    const sanitizedBasename = Sanitizer.sanitizeFilename(basename);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    return `${sanitizedBasename}-${timestamp}-${random}${ext}`;
  }

  /**
   * Get upload path for file
   */
  private async getUploadPath(filename: string, subfolder?: string): Promise<string> {
    const uploadDir = this.config.getSync('media.uploads.directory', './public/uploads');
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const folderPath = subfolder 
      ? path.join(uploadDir, subfolder, String(year), month)
      : path.join(uploadDir, String(year), month);
    
    await fs.ensureDir(folderPath);
    
    return path.join(folderPath, filename);
  }

  /**
   * Check if file is image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/') && mimeType !== 'image/svg+xml';
  }

  /**
   * Get thumbnail filename
   */
  private getThumbnailFilename(originalFilename: string, size: number): string {
    const ext = path.extname(originalFilename);
    const basename = path.basename(originalFilename, ext);
    return `${basename}-${size}w.jpg`;
  }

  /**
   * Get thumbnail paths for media
   */
  private async getThumbnailPaths(media: IMedia): Promise<string[]> {
    // This would return the paths of all generated thumbnails
    // Implementation depends on how thumbnails are stored
    return [];
  }

  /**
   * Optimize existing image
   */
  private async optimizeExistingImage(id: string): Promise<void> {
    // Implementation would re-process existing image with optimization
    this.logger.debug(`Optimizing existing image: ${id}`);
  }

  /**
   * Regenerate thumbnails for existing image
   */
  private async regenerateThumbnails(id: string): Promise<void> {
    // Implementation would regenerate thumbnails for existing image
    this.logger.debug(`Regenerating thumbnails for: ${id}`);
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(): Promise<void> {
    try {
      const tempDir = path.join(
        this.config.getSync('media.uploads.directory', './public/uploads'),
        'temp'
      );

      if (await fs.pathExists(tempDir)) {
        const files = await fs.readdir(tempDir);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.remove(filePath);
          }
        }
      }

      this.logger.debug('Temporary files cleanup completed');
    } catch (error) {
      this.logger.warn('Error cleaning up temporary files:', error);
    }
  }
}

/**
 * Local storage provider implementation
 */
class LocalStorageProvider implements StorageProvider {
  name = 'local';

  constructor(private config: ConfigManager) {}

  async upload(file: Buffer, filename: string, options?: any): Promise<{ url: string; path: string }> {
    const uploadDir = this.config.getSync('media.uploads.directory', './public/uploads');
    const publicPath = this.config.getSync('media.storage.local.publicPath', '/uploads');
    
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const relativePath = path.join(String(year), month, filename);
    const fullPath = path.join(uploadDir, relativePath);
    const url = path.posix.join(publicPath, relativePath);

    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, file);

    return { url, path: relativePath };
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      const uploadDir = this.config.getSync('media.uploads.directory', './public/uploads');
      const fullPath = path.join(uploadDir, filePath);
      
      if (await fs.pathExists(fullPath)) {
        await fs.remove(fullPath);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  getUrl(filePath: string): string {
    const publicPath = this.config.getSync('media.storage.local.publicPath', '/uploads');
    return path.posix.join(publicPath, filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const uploadDir = this.config.getSync('media.uploads.directory', './public/uploads');
      const fullPath = path.join(uploadDir, filePath);
      return await fs.pathExists(fullPath);
    } catch (error) {
      return false;
    }
  }
}

export default MediaManager;