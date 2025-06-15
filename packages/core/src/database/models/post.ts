import { Schema, model, Document, Types } from 'mongoose';

export interface IPost extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: 'draft' | 'published' | 'private' | 'trash';
  type: 'post' | 'page';
  author: Types.ObjectId;
  featuredImage?: string;
  meta: {
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
  };
  categories: Types.ObjectId[];
  tags: string[];
  customFields: Map<string, any>;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  excerpt: {
    type: String,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'private', 'trash'],
    default: 'draft',
  },
  type: {
    type: String,
    enum: ['post', 'page'],
    default: 'post',
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  featuredImage: {
    type: String,
  },
  meta: {
    seoTitle: String,
    seoDescription: String,
    seoKeywords: [String],
  },
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category',
  }],
  tags: [String],
  customFields: {
    type: Map,
    of: Schema.Types.Mixed,
  },
  publishedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
PostSchema.index({ slug: 1 });
PostSchema.index({ status: 1 });
PostSchema.index({ type: 1 });
PostSchema.index({ author: 1 });
PostSchema.index({ publishedAt: -1 });
PostSchema.index({ 'meta.seoKeywords': 1 });

// Pre-save middleware to set publishedAt
PostSchema.pre('save', function(next) {
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export const Post = model<IPost>('Post', PostSchema);
