import type { Types } from 'mongoose';

export enum ContentType {
  POST = 'post',
  PAGE = 'page',
  MEDIA = 'media',
  COMMENT = 'comment',
  CATEGORY = 'category',
  TAG = 'tag',
}

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PRIVATE = 'private',
  TRASH = 'trash',
  PENDING = 'pending',
  AUTO_DRAFT = 'auto-draft',
}

export interface BaseContent {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: ContentStatus;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface PostType extends BaseContent {
  type: ContentType.POST;
  categories: Types.ObjectId[];
  tags: string[];
  featuredImage?: string;
  meta: {
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    allowComments?: boolean;
    isPinned?: boolean;
    viewCount?: number;
  };
  customFields: Map<string, any>;
}

export interface PageType extends BaseContent {
  type: ContentType.PAGE;
  parentId?: Types.ObjectId;
  template?: string;
  menuOrder?: number;
  meta: {
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    showInMenu?: boolean;
    isHomepage?: boolean;
  };
  customFields: Map<string, any>;
}

export interface MediaType {
  _id: Types.ObjectId;
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
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentType {
  _id: Types.ObjectId;
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

export interface CategoryType {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  parentId?: Types.ObjectId;
  meta: {
    seoTitle?: string;
    seoDescription?: string;
  };
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagType {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentQuery {
  type?: ContentType | ContentType[];
  status?: ContentStatus | ContentStatus[];
  author?: Types.ObjectId;
  categories?: Types.ObjectId[];
  tags?: string[];
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  page?: number;
  sort?: Record<string, 1 | -1>;
  populate?: string[];
}

export interface ContentStats {
  posts: {
    total: number;
    published: number;
    draft: number;
    pending: number;
  };
  pages: {
    total: number;
    published: number;
    draft: number;
  };
  categories: number;
  tags: number;
  comments: {
    total: number;
    approved: number;
    pending: number;
    spam: number;
  };
  recentActivity: Array<{
    type: 'post' | 'page' | 'comment';
    action: 'created' | 'updated' | 'published';
    title: string;
    author: string;
    timestamp: Date;
  }>;
}

export interface ContentMeta {
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  schema?: Record<string, any>;
}

export interface ContentRevision {
  _id: Types.ObjectId;
  contentId: Types.ObjectId;
  title: string;
  content: string;
  excerpt?: string;
  author: Types.ObjectId;
  createdAt: Date;
  version: number;
}
