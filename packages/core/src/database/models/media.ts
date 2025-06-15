import { Schema, model, Document, Types } from 'mongoose';
export interface IMedia extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  alt?: string;
  caption?: string;
  description?: string;
  uploadedBy: Types.ObjectId;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    dimensions?: string;
    checksum?: string;
    thumbnails?: Array<{
      size: string;
      url: string;
      width: number;
      height: number;
    }>;
  };
  tags: string[];
  isPublic: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>({
  filename: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
  originalName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
  mimeType: {
    type: String,
    required: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/.test(v);
      },
      message: 'Invalid MIME type format',
    },
  },
  size: {
    type: Number,
    required: true,
    min: 0,
    max: 100 * 1024 * 1024, // 100MB max
  },
  path: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^(https?:\/\/|\/)[^\s]*$/.test(v);
      },
      message: 'Invalid URL format',
    },
  },
  alt: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  caption: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  metadata: {
    width: {
      type: Number,
      min: 0,
    },
    height: {
      type: Number,
      min: 0,
    },
    duration: {
      type: Number,
      min: 0,
    },
    format: {
      type: String,
      trim: true,
    },
    dimensions: {
      type: String,
      trim: true,
    },
    checksum: {
      type: String,
      trim: true,
    },
    thumbnails: [{
      size: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      width: {
        type: Number,
        required: true,
        min: 0,
      },
      height: {
        type: Number,
        required: true,
        min: 0,
      },
    }],
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags: string[]) {
        return tags.length <= 20; // Max 20 tags
      },
      message: 'Too many tags (maximum 20)',
    },
  },
  isPublic: {
    type: Boolean,
    default: true,
    index: true,
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
MediaSchema.index({ uploadedBy: 1, createdAt: -1 });
MediaSchema.index({ mimeType: 1 });
MediaSchema.index({ createdAt: -1 });
MediaSchema.index({ filename: 1 });
MediaSchema.index({ originalName: 1 });
MediaSchema.index({ size: 1 });
MediaSchema.index({ tags: 1 });
MediaSchema.index({ isPublic: 1, createdAt: -1 });

// Text index for search
MediaSchema.index({
  originalName: 'text',
  alt: 'text',
  caption: 'text',
  description: 'text',
  tags: 'text',
});

// Compound indexes for common queries
MediaSchema.index({ uploadedBy: 1, mimeType: 1 });
MediaSchema.index({ mimeType: 1, createdAt: -1 });
MediaSchema.index({ isPublic: 1, mimeType: 1 });

// Virtual properties
MediaSchema.virtual('fileSize').get(function() {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = this.size;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
});

MediaSchema.virtual('category').get(function() {
  const mimeType = this.mimeType.toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || 
      mimeType.includes('text/') || mimeType.includes('application/vnd.')) {
    return 'document';
  }
  return 'other';
});

MediaSchema.virtual('isImage').get(function() {
  return this.mimeType.startsWith('image/');
});

MediaSchema.virtual('isVideo').get(function() {
  return this.mimeType.startsWith('video/');
});

MediaSchema.virtual('isAudio').get(function() {
  return this.mimeType.startsWith('audio/');
});

MediaSchema.virtual('isDocument').get(function() {
  const mimeType = this.mimeType.toLowerCase();
  return mimeType.includes('pdf') || mimeType.includes('document') || 
         mimeType.includes('text/') || mimeType.includes('application/vnd.');
});

// Instance methods
MediaSchema.methods.addTag = function(tag: string) {
  if (!this.tags.includes(tag) && this.tags.length < 20) {
    this.tags.push(tag.toLowerCase().trim());
  }
  return this;
};

MediaSchema.methods.removeTag = function(tag: string) {
  this.tags = this.tags.filter((t: string) => t !== tag.toLowerCase().trim());
  return this;
};

MediaSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  return this.save();
};

// Static methods
MediaSchema.statics.findByMimeType = function(mimeType: string) {
  return this.find({ mimeType: new RegExp(mimeType, 'i') });
};

MediaSchema.statics.findImages = function() {
  return this.find({ mimeType: /^image\//i });
};

MediaSchema.statics.findVideos = function() {
  return this.find({ mimeType: /^video\//i });
};

MediaSchema.statics.findDocuments = function() {
  return this.find({
    mimeType: {
      $in: [
        /pdf/i,
        /document/i,
        /text\//i,
        /application\/vnd\./i,
      ],
    },
  });
};

MediaSchema.statics.findByUploader = function(uploaderId: Types.ObjectId) {
  return this.find({ uploadedBy: uploaderId }).sort({ createdAt: -1 });
};

MediaSchema.statics.getTotalSize = function() {
  return this.aggregate([
    { $group: { _id: null, totalSize: { $sum: '$size' } } },
  ]);
};

MediaSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        totalSize: { $sum: '$size' },
        avgSize: { $avg: '$size' },
        totalDownloads: { $sum: '$downloadCount' },
      },
    },
  ]);
};

MediaSchema.statics.getStatsByType = function() {
  return this.aggregate([
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
  ]);
};

// Pre-save middleware
MediaSchema.pre('save', function(next) {
  // Clean and validate tags
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags
      .map((tag: string) => tag.toLowerCase().trim())
      .filter((tag: string) => tag.length > 0 && tag.length <= 50)
      .slice(0, 20); // Limit to 20 tags
    
    // Remove duplicates
    this.tags = [...new Set(this.tags)];
  }

  // Auto-generate dimensions string for images
  if (this.get('isImage') && this.metadata.width && this.metadata.height) {
    this.metadata.dimensions = `${this.metadata.width}x${this.metadata.height}`;
  }

  next();
});

// Pre-remove middleware
MediaSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // TODO: Delete physical file from storage
    // TODO: Remove references from content
    console.log(`Deleting media file: ${this.filename}`);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Media = model<IMedia>('Media', MediaSchema);