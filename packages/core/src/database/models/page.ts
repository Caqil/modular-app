import { Schema, model, Document, Types } from 'mongoose';
import { ContentStatus, ContentType } from '../../types/content';

export interface IPage extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status?: ContentStatus;
  type?: ContentType.PAGE;
  author: Types.ObjectId;
  parentId?: Types.ObjectId;
  template?: string;
  menuOrder: number;
  featuredImage?: string;
  meta: {
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    showInMenu?: boolean;
    isHomepage?: boolean;
    allowComments?: boolean;
    password?: string;
  };
  customFields: Map<string, any>;
  publishedAt?: Date;
  scheduledAt?: Date;
  lastModifiedBy?: Types.ObjectId;
  stats: {
    viewCount: number;
    commentCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PageSchema = new Schema<IPage>({
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
    maxlength: 200,
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
    enum: ['draft', 'published', 'private', 'trash', 'pending'],
    default: 'draft',
  },
  type: {
    type: String,
    enum: ['page'],
    default: 'page',
    immutable: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Page',
    default: null,
  },
  template: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'default',
  },
  menuOrder: {
    type: Number,
    default: 0,
  },
  featuredImage: {
    type: String,
    trim: true,
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
    },
    showInMenu: {
      type: Boolean,
      default: false,
    },
    isHomepage: {
      type: Boolean,
      default: false,
    },
    allowComments: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      trim: true,
      select: false,
    },
  },
  customFields: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map(),
  },
  publishedAt: {
    type: Date,
  },
  scheduledAt: {
    type: Date,
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  stats: {
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
}, {
  timestamps: true,
});

// Indexes
PageSchema.index({ slug: 1 });
PageSchema.index({ status: 1 });
PageSchema.index({ parentId: 1 });
PageSchema.index({ template: 1 });
PageSchema.index({ 'meta.showInMenu': 1 });
PageSchema.index({ 'meta.isHomepage': 1 });
PageSchema.index({ menuOrder: 1 });

export const Page = model<IPage>('Page', PageSchema);