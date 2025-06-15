import { Schema, model, Document, Types } from 'mongoose';
import { ContentStatus, ContentType } from '../../types/content';
import { SlugGenerator } from '../../utils/slug-generator';

export interface IPost extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: ContentStatus;
  type: ContentType;
  author: Types.ObjectId;
  featuredImage?: string;
  gallery?: string[];
  meta: {
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    allowComments?: boolean;
    isPinned?: boolean;
    isSticky?: boolean;
    viewCount?: number;
    shareCount?: number;
    likeCount?: number;
    commentCount?: number;
    readingTime?: number;
    customCss?: string;
    customJs?: string;
  };
  categories: Types.ObjectId[];
  tags: string[];
  customFields: Map<string, any>;
  publishedAt?: Date | undefined;
  scheduledAt?: Date | undefined;
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
    enum: Object.values(ContentType),
    default: ContentType.POST,
    index: true,
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
      validate: {
        validator: function(keywords: string[]) {
          return keywords.length <= 10;
        },
        message: 'Maximum 10 SEO keywords allowed',
      },
    },
    canonicalUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Invalid canonical URL format',
      },
    },
    ogTitle: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    ogDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    ogImage: {
      type: String,
      trim: true,
    },
    twitterTitle: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    twitterDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    twitterImage: {
      type: String,
      trim: true,
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
    },
    customCss: {
      type: String,
      trim: true,
    },
    customJs: {
      type: String,
      trim: true,
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
        return revisions.length <= 50; // Keep max 50 revisions
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
PostSchema.index({ type: 1, status: 1 });
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ categories: 1, publishedAt: -1 });
PostSchema.index({ tags: 1, publishedAt: -1 });
PostSchema.index({ 'meta.isPinned': 1, publishedAt: -1 });
PostSchema.index({ 'meta.isSticky': 1, publishedAt: -1 });
PostSchema.index({ scheduledAt: 1, status: 1 });

// Text index for search
PostSchema.index({
  title: 'text',
  content: 'text',
  excerpt: 'text',
  tags: 'text',
});

// Compound indexes for common queries
PostSchema.index({ status: 1, type: 1, publishedAt: -1 });
PostSchema.index({ author: 1, status: 1, createdAt: -1 });
PostSchema.index({ categories: 1, status: 1, publishedAt: -1 });

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
  // Remove HTML tags and count words
  const plainText = this.content.replace(/<[^>]*>/g, '');
  return plainText.trim().split(/\s+/).length;
});

PostSchema.virtual('estimatedReadingTime').get(function() {
  const wordsPerMinute = 200;
  const words = this.get('wordCount');
  return Math.ceil(words / wordsPerMinute);
});

PostSchema.virtual('isPopular').get(function() {
  return (this.meta.viewCount || 0) > 1000 || (this.meta.likeCount || 0) > 50;
});

PostSchema.virtual('engagementRate').get(function() {
  const views = this.meta.viewCount || 0;
  const likes = this.meta.likeCount || 0;
  const shares = this.meta.shareCount || 0;
  const comments = this.meta.commentCount || 0;
  
  if (views === 0) return 0;
  return ((likes + shares + comments) / views) * 100;
});

// Instance methods
PostSchema.methods.incrementViewCount = function() {
  if (!this.meta.viewCount) this.meta.viewCount = 0;
  this.meta.viewCount += 1;
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
  // Add new revision
  this.revisions.push({
    content: this.content, // Save current content as revision
    modifiedBy,
    modifiedAt: new Date(),
    changeNote,
  });
  
  // Keep only last 50 revisions
  if (this.revisions.length > 50) {
    this.revisions = this.revisions.slice(-50);
  }
  
  // Update content
  this.content = content;
  this.lastModifiedBy = modifiedBy;
  
  return this.save();
};

PostSchema.methods.revertToRevision = function(revisionIndex: number) {
  if (revisionIndex < 0 || revisionIndex >= this.revisions.length) {
    throw new Error('Invalid revision index');
  }
  
  const revision = this.revisions[revisionIndex];
  this.content = revision.content;
  
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
  this.tags = this.tags.filter(t => t !== tag.toLowerCase().trim());
  return this;
};

PostSchema.methods.addToGallery = function(imageUrl: string) {
  if (!this.gallery.includes(imageUrl) && this.gallery.length < 20) {
    this.gallery.push(imageUrl);
  }
  return this;
};

PostSchema.methods.removeFromGallery = function(imageUrl: string) {
  this.gallery = this.gallery.filter(url => url !== imageUrl);
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
    scheduledAt: { $gt: new Date() },
    status: ContentStatus.DRAFT,
  }).sort({ scheduledAt: 1 });
};

PostSchema.statics.findPopular = function(limit = 10) {
  return this.find({
    status: ContentStatus.PUBLISHED,
  })
  .sort({ 'meta.viewCount': -1, 'meta.likeCount': -1 })
  .limit(limit);
};

PostSchema.statics.findTrending = function(days = 7, limit = 10) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  return this.find({
    status: ContentStatus.PUBLISHED,
    publishedAt: { $gte: dateThreshold },
  })
  .sort({ 'meta.viewCount': -1, 'meta.shareCount': -1 })
  .limit(limit);
};

PostSchema.statics.findRelated = function(postId: Types.ObjectId, limit = 5) {
  return this.findById(postId).then(post => {
    if (!post) return [];
    
    return this.find({
      _id: { $ne: postId },
      status: ContentStatus.PUBLISHED,
      $or: [
        { categories: { $in: post.categories } },
        { tags: { $in: post.tags } },
      ],
    })
    .sort({ publishedAt: -1 })
    .limit(limit);
  });
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

PostSchema.statics.getEngagementStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$meta.viewCount' },
        totalLikes: { $sum: '$meta.likeCount' },
        totalShares: { $sum: '$meta.shareCount' },
        totalComments: { $sum: '$meta.commentCount' },
        avgViews: { $avg: '$meta.viewCount' },
        avgLikes: { $avg: '$meta.likeCount' },
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
      
      // Check for uniqueness
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
      this.publishedAt = undefined;
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
      
      // Remove duplicates
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
  // Update category post counts
  if (doc.isModified('categories') || doc.isModified('status')) {
    // TODO: Update category document counts
  }
  
  // Handle scheduled posts
  if (doc.scheduledAt && doc.scheduledAt <= new Date() && doc.status === ContentStatus.DRAFT) {
    doc.status = ContentStatus.PUBLISHED;
    doc.publishedAt = new Date();
    doc.scheduledAt = undefined;
    await doc.save();
  }
});

// Pre-remove middleware
PostSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // TODO: Clean up related data (comments, media references, etc.)
    console.log(`Deleting post: ${this.title}`);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Post = model<IPost>('Post', PostSchema);