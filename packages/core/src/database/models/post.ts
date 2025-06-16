import { Schema, model, Document, Types } from 'mongoose';
import { ContentStatus, ContentType } from '../../types/content';
import { SlugGenerator } from '../../utils/slug-generator';

export interface IPost extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: ContentStatus;
  type: ContentType.POST;
  author: Types.ObjectId;
  featuredImage?: string;
  gallery: string[];
  meta: {
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords: string[];
    allowComments: boolean;
    isPinned: boolean;
    isSticky: boolean;
    isFeatured: boolean;
    viewCount: number;
    shareCount: number;
    likeCount: number;
    commentCount: number;
    readingTime: number;
  };
  categories: Types.ObjectId[];
  tags: string[];
  customFields: Map<string, any>;
  publishedAt?: Date;
  scheduledAt?: Date;
  lastModifiedBy?: Types.ObjectId;
  revisions: Array<{
    content: string;
    modifiedBy: Types.ObjectId;
    modifiedAt: Date;
    changeNote?: string;
  }>;
  interactions: {
    likes: Types.ObjectId[];
    bookmarks: Types.ObjectId[];
    shares: Array<{
      platform: string;
      userId?: Types.ObjectId;
      sharedAt: Date;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 200,
    validate: {
      validator: function(v: string) {
        return /^[a-z0-9-]+$/.test(v);
      },
      message: 'Slug can only contain lowercase letters, numbers, and hyphens',
    },
  },
  content: {
    type: String,
    required: true,
  },
  excerpt: {
    type: String,
    maxlength: 500,
    trim: true,
  },
  status: {
    type: String,
    enum: Object.values(ContentStatus),
    default: ContentStatus.DRAFT,
    index: true,
  },
  type: {
    type: String,
    enum: [ContentType.POST],
    default: ContentType.POST,
    immutable: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  featuredImage: {
    type: String,
    trim: true,
  },
  gallery: {
    type: [String],
    default: [],
    validate: {
      validator: function(gallery: string[]) {
        return gallery.length <= 20;
      },
      message: 'Gallery can contain maximum 20 images',
    },
  },
  meta: {
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    seoKeywords: {
      type: [String],
      default: [],
      validate: {
        validator: function(keywords: string[]) {
          return keywords.length <= 10;
        },
        message: 'Maximum 10 SEO keywords allowed',
      },
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSticky: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    readingTime: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category',
    index: true,
  }],
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags: string[]) {
        return tags.length <= 20;
      },
      message: 'Maximum 20 tags allowed',
    },
    index: true,
  },
  customFields: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map(),
  },
  publishedAt: {
    type: Date,
    index: true,
  },
  scheduledAt: {
    type: Date,
    index: true,
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  revisions: {
    type: [{
      content: {
        type: String,
        required: true,
      },
      modifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      modifiedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
      changeNote: {
        type: String,
        trim: true,
        maxlength: 200,
      },
    }],
    default: [],
    validate: {
      validator: function(revisions: any[]) {
        return revisions.length <= 50;
      },
      message: 'Too many revisions (maximum 50)',
    },
  },
  interactions: {
    likes: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    bookmarks: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    shares: {
      type: [{
        platform: {
          type: String,
          required: true,
          enum: ['facebook', 'twitter', 'linkedin', 'reddit', 'email', 'copy', 'other'],
        },
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        sharedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
      }],
      default: [],
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
PostSchema.index({ slug: 1 }, { unique: true });
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ categories: 1, publishedAt: -1 });
PostSchema.index({ tags: 1, publishedAt: -1 });
PostSchema.index({ 'meta.isPinned': 1, publishedAt: -1 });
PostSchema.index({ 'meta.isFeatured': 1, publishedAt: -1 });
PostSchema.index({ scheduledAt: 1, status: 1 });

// Text search index
PostSchema.index({
  title: 'text',
  content: 'text',
  excerpt: 'text',
  tags: 'text',
});

// Virtual properties
PostSchema.virtual('url').get(function() {
  return `/posts/${this.slug}`;
});

PostSchema.virtual('isPublished').get(function() {
  return this.status === ContentStatus.PUBLISHED && 
         (!this.publishedAt || this.publishedAt <= new Date());
});

PostSchema.virtual('isDraft').get(function() {
  return this.status === ContentStatus.DRAFT;
});

PostSchema.virtual('isScheduled').get(function() {
  return this.scheduledAt && this.scheduledAt > new Date();
});

PostSchema.virtual('wordCount').get(function() {
  if (!this.content) return 0;
  const plainText = this.content.replace(/<[^>]*>/g, '');
  return plainText.trim().split(/\s+/).length;
});

PostSchema.virtual('estimatedReadingTime').get(function() {
  const wordsPerMinute = 200;
  const words = this.get('wordCount');
  return Math.ceil(words / wordsPerMinute);
});

// Instance methods
PostSchema.methods.incrementViewCount = function() {
  this.meta.viewCount = (this.meta.viewCount || 0) + 1;
  return this.save();
};

PostSchema.methods.addLike = function(userId: Types.ObjectId) {
  if (!this.interactions.likes.includes(userId)) {
    this.interactions.likes.push(userId);
    this.meta.likeCount = this.interactions.likes.length;
  }
  return this.save();
};

PostSchema.methods.removeLike = function(userId: Types.ObjectId) {
  this.interactions.likes = this.interactions.likes.filter(
    (id: Types.ObjectId) => !id.equals(userId)
  );
  this.meta.likeCount = this.interactions.likes.length;
  return this.save();
};

PostSchema.methods.addBookmark = function(userId: Types.ObjectId) {
  if (!this.interactions.bookmarks.includes(userId)) {
    this.interactions.bookmarks.push(userId);
  }
  return this.save();
};

PostSchema.methods.removeBookmark = function(userId: Types.ObjectId) {
  this.interactions.bookmarks = this.interactions.bookmarks.filter(
    (id: Types.ObjectId) => !id.equals(userId)
  );
  return this.save();
};

PostSchema.methods.addShare = function(platform: string, userId?: Types.ObjectId) {
  this.interactions.shares.push({
    platform,
    userId,
    sharedAt: new Date(),
  });
  this.meta.shareCount = this.interactions.shares.length;
  return this.save();
};

PostSchema.methods.createRevision = function(
  content: string,
  modifiedBy: Types.ObjectId,
  changeNote?: string
) {
  this.revisions.push({
    content: this.content,
    modifiedBy,
    modifiedAt: new Date(),
    changeNote,
  });
  
  if (this.revisions.length > 50) {
    this.revisions = this.revisions.slice(-50);
  }
  
  this.content = content;
  this.lastModifiedBy = modifiedBy;
  
  return this.save();
};

PostSchema.methods.generateExcerpt = function(length = 200) {
  if (this.excerpt) return this.excerpt;
  
  const plainText = this.content.replace(/<[^>]*>/g, '').trim();
  if (plainText.length <= length) return plainText;
  
  const truncated = plainText.substring(0, length);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  return lastSpaceIndex > 0 
    ? truncated.substring(0, lastSpaceIndex) + '...'
    : truncated + '...';
};

PostSchema.methods.addTag = function(tag: string) {
  const cleanTag = tag.toLowerCase().trim();
  if (!this.tags.includes(cleanTag) && this.tags.length < 20) {
    this.tags.push(cleanTag);
  }
  return this;
};

PostSchema.methods.removeTag = function(tag: string) {
  this.tags = this.tags.filter((t: string) => t !== tag.toLowerCase().trim());
  return this;
};

// Static methods
PostSchema.statics.findPublished = function() {
  return this.find({
    status: ContentStatus.PUBLISHED,
    $or: [
      { publishedAt: { $lte: new Date() } },
      { publishedAt: { $exists: false } },
    ],
  }).sort({ publishedAt: -1 });
};

PostSchema.statics.findByCategory = function(categoryId: Types.ObjectId) {
  return this.find({
    categories: categoryId,
    status: ContentStatus.PUBLISHED,
  }).sort({ publishedAt: -1 });
};

PostSchema.statics.findByTag = function(tag: string) {
  return this.find({
    tags: tag.toLowerCase(),
    status: ContentStatus.PUBLISHED,
  }).sort({ publishedAt: -1 });
};

PostSchema.statics.findByAuthor = function(authorId: Types.ObjectId) {
  return this.find({ author: authorId }).sort({ createdAt: -1 });
};

PostSchema.statics.findScheduled = function() {
  return this.find({
    scheduledAt: { $lte: new Date() },
    status: ContentStatus.DRAFT,
  }).sort({ scheduledAt: 1 });
};

PostSchema.statics.findFeatured = function(limit = 5) {
  return this.find({
    'meta.isFeatured': true,
    status: ContentStatus.PUBLISHED,
  })
  .sort({ 'meta.isPinned': -1, publishedAt: -1 })
  .limit(limit);
};

PostSchema.statics.findPopular = function(limit = 10) {
  return this.find({
    status: ContentStatus.PUBLISHED,
  })
  .sort({ 'meta.viewCount': -1, 'meta.likeCount': -1 })
  .limit(limit);
};

PostSchema.statics.searchPosts = function(query: string) {
  return this.find(
    { 
      $text: { $search: query },
      status: ContentStatus.PUBLISHED,
    },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

PostSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
};

// Pre-save middleware
PostSchema.pre('save', async function(next) {
  try {
    // Generate slug if not provided or title changed
    if (!this.slug || this.isModified('title')) {
      const baseSlug = SlugGenerator.forContent(this.title);
      
      let slug = baseSlug;
      let counter = 1;
      
      while (true) {
        const existing = await this.model('Post').findOne({
          slug,
          _id: { $ne: this._id },
        });
        
        if (!existing) break;
        
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      this.slug = slug;
    }

    // Set publishedAt when status changes to published
    if (this.isModified('status') && this.status === ContentStatus.PUBLISHED) {
      if (!this.publishedAt) {
        this.publishedAt = new Date();
      }
    }

    // Clear publishedAt if status is not published
    if (this.isModified('status') && this.status !== ContentStatus.PUBLISHED) {
      this.publishedAt = undefined as any;
    }

    // Generate excerpt if not provided
    if (!this.excerpt && this.content) {
      this.excerpt = (this as any).generateExcerpt();
    }

    // Calculate reading time
    this.meta.readingTime = this.get('estimatedReadingTime');

    // Clean and validate tags
    if (this.tags && this.tags.length > 0) {
      this.tags = this.tags
        .map((tag: string) => tag.toLowerCase().trim())
        .filter((tag: string) => tag.length > 0 && tag.length <= 50)
        .slice(0, 20);
      
      this.tags = [...new Set(this.tags)];
    }

    // Auto-populate SEO fields if not provided
    if (!this.meta.seoTitle) {
      this.meta.seoTitle = this.title.substring(0, 60);
    }
    
    if (!this.meta.seoDescription && this.excerpt) {
      this.meta.seoDescription = this.excerpt.substring(0, 160);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Post-save middleware
PostSchema.post('save', async function(doc) {
  // Handle scheduled posts
  if (doc.scheduledAt && doc.scheduledAt <= new Date() && doc.status === ContentStatus.DRAFT) {
    doc.status = ContentStatus.PUBLISHED;
    doc.publishedAt = new Date();
    doc.scheduledAt = undefined as any;
    await doc.save();
  }
});

// Pre-remove middleware
PostSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    console.log(`Deleting post: ${this.title}`);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Post = model<IPost>('Post', PostSchema);