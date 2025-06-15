import { Schema, model, Document, Types } from 'mongoose';

// ===================
// CATEGORY MODEL
// ===================

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  parentId?: Types.ObjectId;
  count: number;
  featured: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  count: {
    type: Number,
    default: 0,
    min: 0,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
CategorySchema.index({ slug: 1 });
CategorySchema.index({ parentId: 1 });
CategorySchema.index({ featured: 1 });
CategorySchema.index({ count: -1 });

// ===================
// TAG MODEL
// ===================

export interface ITag extends Document {
  name: string;
  slug: string;
  description?: string;
  count: number;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 50,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  count: {
    type: Number,
    default: 0,
    min: 0,
  },
  featured: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
TagSchema.index({ slug: 1 });
TagSchema.index({ count: -1 });
TagSchema.index({ featured: 1 });

// ===================
// COMMENT MODEL
// ===================

export interface IComment extends Document {
  postId: Types.ObjectId;
  author: {
    name: string;
    email: string;
    website?: string;
    userId?: Types.ObjectId;
  };
  content: string;
  status: 'approved' | 'pending' | 'spam' | 'trash';
  parentId?: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  author: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
    },
    website: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  status: {
    type: String,
    enum: ['approved', 'pending', 'spam', 'trash'],
    default: 'pending',
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: 500,
  },
}, {
  timestamps: true,
});

// Indexes
CommentSchema.index({ postId: 1 });
CommentSchema.index({ status: 1 });
CommentSchema.index({ parentId: 1 });
CommentSchema.index({ 'author.email': 1 });

export const Category = model<ICategory>('Category', CategorySchema);
export const Tag = model<ITag>('Tag', TagSchema);
export const Comment = model<IComment>('Comment', CommentSchema);