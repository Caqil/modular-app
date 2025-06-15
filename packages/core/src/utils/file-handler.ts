import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import mime from 'mime-types';
import sharp from 'sharp';

export interface FileInfo {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  checksum: string;
  metadata?: ImageMetadata | VideoMetadata | DocumentMetadata | undefined;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  channels: number;
  density?: number;
  hasAlpha: boolean;
  isProgressive?: boolean;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate: number;
  frameRate: number;
}

export interface DocumentMetadata {
  pages?: number;
  format: string;
  wordCount?: number;
  title?: string;
  author?: string;
  createdAt?: Date;
}

export interface UploadOptions {
  destination: string;
  maxSize: number;
  allowedTypes: string[];
  generateThumbnails: boolean;
  preserveOriginal: boolean;
  sanitizeFilename: boolean;
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export class FileHandler {
  private static readonly DEFAULT_UPLOAD_OPTIONS: UploadOptions = {
    destination: './public/uploads',
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    generateThumbnails: true,
    preserveOriginal: true,
    sanitizeFilename: true,
  };

  private static readonly THUMBNAIL_SIZES: ThumbnailOptions[] = [
    { width: 150, height: 150, quality: 80, format: 'jpeg', fit: 'cover' },
    { width: 300, height: 300, quality: 80, format: 'jpeg', fit: 'cover' },
    { width: 800, height: 600, quality: 85, format: 'jpeg', fit: 'inside' },
  ];

  /**
   * Upload and process a file
   */
  static async uploadFile(
    file: Express.Multer.File | Buffer,
    originalName: string,
    options: Partial<UploadOptions> = {}
  ): Promise<FileInfo> {
    const config = { ...this.DEFAULT_UPLOAD_OPTIONS, ...options };
    
    // Validate file
    const buffer = Buffer.isBuffer(file) ? file : file.buffer;
    const fileName = Buffer.isBuffer(file) ? originalName : file.originalname;
    const mimeType = mime.lookup(fileName) || 'application/octet-stream';

    await this.validateFile(buffer, mimeType, config);

    // Generate unique filename
    const sanitizedName = config.sanitizeFilename 
      ? this.sanitizeFilename(fileName)
      : fileName;
    const uniqueFilename = await this.generateUniqueFilename(sanitizedName, config.destination);

    // Ensure upload directory exists
    await fs.ensureDir(config.destination);

    // Save file
    const filePath = path.join(config.destination, uniqueFilename);
    await fs.writeFile(filePath, buffer);

    // Generate checksum
    const checksum = this.generateChecksum(buffer);

    // Get file metadata
    const metadata = await this.getFileMetadata(filePath, mimeType);

    // Generate thumbnails for images
    if (config.generateThumbnails && this.isImage(mimeType)) {
      await this.generateThumbnails(filePath, config.destination);
    }

    return {
      filename: uniqueFilename,
      originalName: fileName,
      mimeType,
      size: buffer.length,
      path: filePath,
      url: this.generateFileUrl(uniqueFilename),
      checksum,
      metadata,
    };
  }

  /**
   * Delete file and its thumbnails
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      // Delete main file
      await fs.remove(filePath);

      // Delete thumbnails
      const dir = path.dirname(filePath);
      const filename = path.basename(filePath, path.extname(filePath));
      const thumbnailPattern = new RegExp(`^${filename}-\\d+x\\d+\\.(jpg|jpeg|png|webp)$`);

      const files = await fs.readdir(dir);
      const thumbnailFiles = files.filter(file => thumbnailPattern.test(file));

      for (const thumbnailFile of thumbnailFiles) {
        await fs.remove(path.join(dir, thumbnailFile));
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  /**
   * Get file information
   */
  static async getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);
      const mimeType = mime.lookup(filePath) || 'application/octet-stream';
      const filename = path.basename(filePath);

      return {
        filename,
        originalName: filename,
        mimeType,
        size: stats.size,
        path: filePath,
        url: this.generateFileUrl(filename),
        checksum: this.generateChecksum(buffer),
        metadata: await this.getFileMetadata(filePath, mimeType),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Resize image
   */
  static async resizeImage(
    inputPath: string,
    outputPath: string,
    options: ThumbnailOptions
  ): Promise<void> {
    await sharp(inputPath)
      .resize(options.width, options.height, { fit: options.fit })
      .jpeg({ quality: options.quality })
      .toFile(outputPath);
  }

  /**
   * Validate file before upload
   */
  private static async validateFile(
    buffer: Buffer,
    mimeType: string,
    options: UploadOptions
  ): Promise<void> {
    // Check file size
    if (buffer.length > options.maxSize) {
      throw new Error(`File too large. Maximum size is ${options.maxSize} bytes`);
    }

    // Check file type
    if (!options.allowedTypes.includes(mimeType)) {
      throw new Error(`File type not allowed: ${mimeType}`);
    }

    // Additional validation for images
    if (this.isImage(mimeType)) {
      try {
        const metadata = await sharp(buffer).metadata();
        if (!metadata.width || !metadata.height) {
          throw new Error('Invalid image file');
        }
      } catch (error) {
        throw new Error('Invalid or corrupted image file');
      }
    }
  }

  /**
   * Generate unique filename
   */
  private static async generateUniqueFilename(
    originalName: string,
    directory: string
  ): Promise<string> {
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    
    let filename = `${baseName}-${timestamp}-${random}${extension}`;
    let counter = 1;

    while (await fs.pathExists(path.join(directory, filename))) {
      filename = `${baseName}-${timestamp}-${random}-${counter}${extension}`;
      counter++;
    }

    return filename;
  }

  /**
   * Sanitize filename
   */
  private static sanitizeFilename(filename: string): string {
    const extension = path.extname(filename);
    const baseName = path.basename(filename, extension);
    
    const sanitized = baseName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();

    return sanitized + extension.toLowerCase();
  }

  /**
   * Generate file checksum
   */
  private static generateChecksum(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Generate file URL
   */
  private static generateFileUrl(filename: string): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/${filename}`;
  }

  /**
   * Check if file is an image
   */
  private static isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Get file metadata
   */
  private static async getFileMetadata(
    filePath: string,
    mimeType: string
  ): Promise<ImageMetadata | VideoMetadata | DocumentMetadata | undefined> {
    if (this.isImage(mimeType)) {
      try {
        const metadata = await sharp(filePath).metadata();
        return {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || '',
          channels: metadata.channels || 0,
          density: metadata.density,
          hasAlpha: metadata.hasAlpha || false,
          isProgressive: metadata.isProgressive,
        };
      } catch (error) {
        return undefined;
      }
    }

    // Add other metadata extraction for videos, documents, etc.
    return undefined;
  }

  /**
   * Generate thumbnails for images
   */
  private static async generateThumbnails(
    imagePath: string,
    outputDir: string
  ): Promise<void> {
    const filename = path.basename(imagePath, path.extname(imagePath));
    
    for (const size of this.THUMBNAIL_SIZES) {
      const thumbnailName = `${filename}-${size.width}x${size.height}.${size.format}`;
      const thumbnailPath = path.join(outputDir, thumbnailName);
      
      try {
        await this.resizeImage(imagePath, thumbnailPath, size);
      } catch (error) {
        console.error(`Error generating thumbnail ${thumbnailName}:`, error);
      }
    }
  }

  /**
   * Get file MIME type
   */
  static getMimeType(filename: string): string {
    return mime.lookup(filename) || 'application/octet-stream';
  }

  /**
   * Check if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   */
  static async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Copy file
   */
  static async copyFile(source: string, destination: string): Promise<void> {
    await fs.copy(source, destination);
  }

  /**
   * Move file
   */
  static async moveFile(source: string, destination: string): Promise<void> {
    await fs.move(source, destination);
  }
}
