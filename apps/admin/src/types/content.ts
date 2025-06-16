// ===================================================================
// ADMIN CONTENT API - CONTENT MANAGEMENT OPERATIONS
// ===================================================================

import { apiClient, type PaginatedResponse, type QueryOptions } from './api';
import type {
  PostType,
  PageType,
  MediaType,
  CommentType,
  CategoryType,
  TagType,
  ContentStatus,
  ContentStats,
  ContentMeta,
  ContentRevision,
} from '@modular-app/core/types/content';

// ===================================================================
// CONTENT TYPES AND INTERFACES
// ===================================================================

export interface ContentQueryOptions extends QueryOptions {
  status?: ContentStatus | ContentStatus[];
  author?: string;
  category?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
  featured?: boolean;
  published?: boolean;
}

export interface CreatePostData {
  title: string;
  content: string;
  excerpt?: string;
  status?: ContentStatus;
  categories?: string[];
  tags?: string[];
  featuredImage?: string;
  meta?: Partial<ContentMeta>;
  customFields?: Record<string, any>;
  publishedAt?: Date;
}

export interface UpdatePostData extends Partial<CreatePostData> {
  id: string;
}

export interface CreatePageData {
  title: string;
  content: string;
  slug?: string;
  status?: ContentStatus;
  parentId?: string;
  template?: string;
  meta?: Partial<ContentMeta>;
  customFields?: Record<string, any>;
  order?: number;
}

export interface UpdatePageData extends Partial<CreatePageData> {
  id: string;
}

export interface MediaUploadData {
  file: File;
  title?: string;
  alt?: string;
  caption?: string;
  description?: string;
  folder?: string;
}

export interface MediaUpdateData {
  id: string;
  title?: string;
  alt?: string;
  caption?: string;
  description?: string;
  folder?: string;
}

export interface CreateCommentData {
  postId: string;
  content: string;
  parentId?: string;
  author?: {
    name: string;
    email: string;
    website?: string;
  };
}

export interface UpdateCommentData {
  id: string;
  content?: string;
  status?: 'pending' | 'approved' | 'spam' | 'trash';
}

export interface CreateCategoryData {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  color?: string;
  image?: string;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: string;
}

export interface CreateTagData {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
}

export interface UpdateTagData extends Partial<CreateTagData> {
  id: string;
}

export interface BulkActionOptions {
  ids: string[];
  action: 'delete' | 'publish' | 'unpublish' | 'trash' | 'restore' | 'approve' | 'spam';
  data?: Record<string, any>;
}

export interface ContentSearchOptions {
  query: string;
  type?: 'post' | 'page' | 'media' | 'comment' | 'all';
  fields?: string[];
  fuzzy?: boolean;
  limit?: number;
}

export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
  robots?: string;
  schema?: Record<string, any>;
}

// ===================================================================
// POSTS API
// ===================================================================

export class PostsAPI {
  /**
   * Get all posts with pagination and filters
   */
  static async getPosts(options: ContentQueryOptions = {}): Promise<PaginatedResponse<PostType>> {
    return apiClient.getPaginated<PostType>('/posts', options);
  }

  /**
   * Get single post by ID
   */
  static async getPost(id: string, include?: string[]): Promise<PostType> {
    const params = include ? { include: include.join(',') } : {};
    return apiClient.get<PostType>(`/posts/${id}`, params);
  }

  /**
   * Get post by slug
   */
  static async getPostBySlug(slug: string): Promise<PostType> {
    return apiClient.get<PostType>(`/posts/slug/${slug}`);
  }

  /**
   * Create new post
   */
  static async createPost(data: CreatePostData): Promise<PostType> {
    return apiClient.post<PostType>('/posts', data);
  }

  /**
   * Update existing post
   */
  static async updatePost(data: UpdatePostData): Promise<PostType> {
    const { id, ...updateData } = data;
    return apiClient.put<PostType>(`/posts/${id}`, updateData);
  }

  /**
   * Delete post
   */
  static async deletePost(id: string, permanent = false): Promise<{ success: boolean }> {
    const params = permanent ? { permanent: 'true' } : {};
    return apiClient.delete(`/posts/${id}`, { params });
  }

  /**
   * Duplicate post
   */
  static async duplicatePost(id: string): Promise<PostType> {
    return apiClient.post<PostType>(`/posts/${id}/duplicate`);
  }

  /**
   * Get post revisions
   */
  static async getPostRevisions(id: string): Promise<ContentRevision[]> {
    return apiClient.get<ContentRevision[]>(`/posts/${id}/revisions`);
  }

  /**
   * Restore post revision
   */
  static async restoreRevision(postId: string, revisionId: string): Promise<PostType> {
    return apiClient.post<PostType>(`/posts/${postId}/revisions/${revisionId}/restore`);
  }

  /**
   * Get post analytics
   */
  static async getPostAnalytics(id: string, period = '30d'): Promise<{
    views: number;
    uniqueViews: number;
    likes: number;
    shares: number;
    comments: number;
    chartData: Array<{ date: string; views: number }>;
  }> {
    return apiClient.get(`/posts/${id}/analytics`, { period });
  }

  /**
   * Bulk actions on posts
   */
  static async bulkAction(options: BulkActionOptions): Promise<{
    success: boolean;
    affected: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    return apiClient.post('/posts/bulk', options);
  }
}

// ===================================================================
// PAGES API
// ===================================================================

export class PagesAPI {
  /**
   * Get all pages with hierarchy
   */
  static async getPages(options: ContentQueryOptions = {}): Promise<PaginatedResponse<PageType>> {
    return apiClient.getPaginated<PageType>('/pages', options);
  }

  /**
   * Get page hierarchy tree
   */
  static async getPageTree(): Promise<PageType[]> {
    return apiClient.get<PageType[]>('/pages/tree');
  }

  /**
   * Get single page
   */
  static async getPage(id: string): Promise<PageType> {
    return apiClient.get<PageType>(`/pages/${id}`);
  }

  /**
   * Get page by slug with full path
   */
  static async getPageBySlug(slug: string): Promise<PageType> {
    return apiClient.get<PageType>(`/pages/slug/${slug}`);
  }

  /**
   * Create new page
   */
  static async createPage(data: CreatePageData): Promise<PageType> {
    return apiClient.post<PageType>('/pages', data);
  }

  /**
   * Update page
   */
  static async updatePage(data: UpdatePageData): Promise<PageType> {
    const { id, ...updateData } = data;
    return apiClient.put<PageType>(`/pages/${id}`, updateData);
  }

  /**
   * Delete page
   */
  static async deletePage(id: string, permanent = false): Promise<{ success: boolean }> {
    const params = permanent ? { permanent: 'true' } : {};
    return apiClient.delete(`/pages/${id}`, { params });
  }

  /**
   * Update page order
   */
  static async updatePageOrder(pages: Array<{ id: string; order: number; parentId?: string }>): Promise<{
    success: boolean;
  }> {
    return apiClient.post('/pages/reorder', { pages });
  }

  /**
   * Get available page templates
   */
  static async getPageTemplates(): Promise<Array<{
    name: string;
    title: string;
    description: string;
    preview?: string;
  }>> {
    return apiClient.get('/pages/templates');
  }
}

// ===================================================================
// MEDIA API
// ===================================================================

export class MediaAPI {
  /**
   * Get media library
   */
  static async getMedia(options: QueryOptions & {
    type?: string;
    folder?: string;
  } = {}): Promise<PaginatedResponse<MediaType>> {
    return apiClient.getPaginated<MediaType>('/media', options);
  }

  /**
   * Get single media item
   */
  static async getMediaItem(id: string): Promise<MediaType> {
    return apiClient.get<MediaType>(`/media/${id}`);
  }

  /**
   * Upload media file
   */
  static async uploadMedia(
    data: MediaUploadData,
    onProgress?: (progress: number) => void
  ): Promise<MediaType> {
    return apiClient.upload<MediaType>('/media/upload', data.file, {
      title: data.title,
      alt: data.alt,
      caption: data.caption,
      description: data.description,
      folder: data.folder,
    }, onProgress);
  }

  /**
   * Upload multiple files
   */
  static async uploadMultipleMedia(
    files: File[],
    options?: { folder?: string },
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<MediaType[]> {
    const uploadPromises = files.map((file, index) => {
      return this.uploadMedia(
        { file, folder: options?.folder },
        (progress) => onProgress?.(index, progress)
      );
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Update media metadata
   */
  static async updateMedia(data: MediaUpdateData): Promise<MediaType> {
    const { id, ...updateData } = data;
    return apiClient.put<MediaType>(`/media/${id}`, updateData);
  }

  /**
   * Delete media
   */
  static async deleteMedia(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/media/${id}`);
  }

  /**
   * Get media folders
   */
  static async getFolders(): Promise<Array<{
    name: string;
    path: string;
    itemCount: number;
    size: number;
  }>> {
    return apiClient.get('/media/folders');
  }

  /**
   * Create media folder
   */
  static async createFolder(name: string, parent?: string): Promise<{ success: boolean }> {
    return apiClient.post('/media/folders', { name, parent });
  }

  /**
   * Optimize image
   */
  static async optimizeImage(id: string, options?: {
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
    width?: number;
    height?: number;
  }): Promise<MediaType> {
    return apiClient.post<MediaType>(`/media/${id}/optimize`, options);
  }

  /**
   * Generate thumbnails
   */
  static async generateThumbnails(id: string): Promise<{ success: boolean }> {
    return apiClient.post(`/media/${id}/thumbnails`);
  }
}

// ===================================================================
// COMMENTS API
// ===================================================================

export class CommentsAPI {
  /**
   * Get comments
   */
  static async getComments(options: QueryOptions & {
    postId?: string;
    status?: string;
    author?: string;
  } = {}): Promise<PaginatedResponse<CommentType>> {
    return apiClient.getPaginated<CommentType>('/comments', options);
  }

  /**
   * Get single comment
   */
  static async getComment(id: string): Promise<CommentType> {
    return apiClient.get<CommentType>(`/comments/${id}`);
  }

  /**
   * Create comment
   */
  static async createComment(data: CreateCommentData): Promise<CommentType> {
    return apiClient.post<CommentType>('/comments', data);
  }

  /**
   * Update comment
   */
  static async updateComment(data: UpdateCommentData): Promise<CommentType> {
    const { id, ...updateData } = data;
    return apiClient.put<CommentType>(`/comments/${id}`, updateData);
  }

  /**
   * Delete comment
   */
  static async deleteComment(id: string, permanent = false): Promise<{ success: boolean }> {
    const params = permanent ? { permanent: 'true' } : {};
    return apiClient.delete(`/comments/${id}`, { params });
  }

  /**
   * Approve comment
   */
  static async approveComment(id: string): Promise<CommentType> {
    return apiClient.post<CommentType>(`/comments/${id}/approve`);
  }

  /**
   * Mark as spam
   */
  static async markAsSpam(id: string): Promise<CommentType> {
    return apiClient.post<CommentType>(`/comments/${id}/spam`);
  }

  /**
   * Bulk moderate comments
   */
  static async bulkModerate(options: BulkActionOptions): Promise<{
    success: boolean;
    affected: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    return apiClient.post('/comments/bulk', options);
  }
}

// ===================================================================
// TAXONOMY API (Categories & Tags)
// ===================================================================

export class TaxonomyAPI {
  /**
   * Get categories
   */
  static async getCategories(options: QueryOptions = {}): Promise<PaginatedResponse<CategoryType>> {
    return apiClient.getPaginated<CategoryType>('/categories', options);
  }

  /**
   * Get category tree
   */
  static async getCategoryTree(): Promise<CategoryType[]> {
    return apiClient.get<CategoryType[]>('/categories/tree');
  }

  /**
   * Create category
   */
  static async createCategory(data: CreateCategoryData): Promise<CategoryType> {
    return apiClient.post<CategoryType>('/categories', data);
  }

  /**
   * Update category
   */
  static async updateCategory(data: UpdateCategoryData): Promise<CategoryType> {
    const { id, ...updateData } = data;
    return apiClient.put<CategoryType>(`/categories/${id}`, updateData);
  }

  /**
   * Delete category
   */
  static async deleteCategory(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/categories/${id}`);
  }

  /**
   * Get tags
   */
  static async getTags(options: QueryOptions = {}): Promise<PaginatedResponse<TagType>> {
    return apiClient.getPaginated<TagType>('/tags', options);
  }

  /**
   * Create tag
   */
  static async createTag(data: CreateTagData): Promise<TagType> {
    return apiClient.post<TagType>('/tags', data);
  }

  /**
   * Update tag
   */
  static async updateTag(data: UpdateTagData): Promise<TagType> {
    const { id, ...updateData } = data;
    return apiClient.put<TagType>(`/tags/${id}`, updateData);
  }

  /**
   * Delete tag
   */
  static async deleteTag(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/tags/${id}`);
  }

  /**
   * Search tags
   */
  static async searchTags(query: string, limit = 10): Promise<TagType[]> {
    return apiClient.get<TagType[]>('/tags/search', { q: query, limit });
  }
}

// ===================================================================
// CONTENT UTILITIES
// ===================================================================

export class ContentAPI {
  /**
   * Global content search
   */
  static async search(options: ContentSearchOptions): Promise<{
    posts: PostType[];
    pages: PageType[];
    media: MediaType[];
    total: number;
    took: number;
  }> {
    return apiClient.get('/content/search', options);
  }

  /**
   * Get content statistics
   */
  static async getStats(): Promise<ContentStats> {
    return apiClient.get<ContentStats>('/content/stats');
  }

  /**
   * Get recent activity
   */
  static async getRecentActivity(limit = 20): Promise<Array<{
    id: string;
    type: 'post' | 'page' | 'media' | 'comment';
    action: 'created' | 'updated' | 'deleted' | 'published';
    title: string;
    author: string;
    timestamp: Date;
  }>> {
    return apiClient.get('/content/activity', { limit });
  }

  /**
   * Get trending content
   */
  static async getTrending(period = '7d', limit = 10): Promise<Array<{
    id: string;
    type: 'post' | 'page';
    title: string;
    views: number;
    engagement: number;
  }>> {
    return apiClient.get('/content/trending', { period, limit });
  }

  /**
   * Export content
   */
  static async exportContent(options: {
    type?: 'post' | 'page' | 'all';
    format?: 'json' | 'xml' | 'csv';
    includeMedia?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Blob> {
    return apiClient.download('/content/export', 'content-export.zip');
  }

  /**
   * Import content
   */
  static async importContent(
    file: File,
    options?: {
      type?: 'wordpress' | 'json';
      overwrite?: boolean;
      preserveIds?: boolean;
    }
  ): Promise<{
    success: boolean;
    imported: number;
    skipped: number;
    errors: Array<{ line: number; error: string }>;
  }> {
    return apiClient.upload('/content/import', file, options);
  }

  /**
   * Validate slug
   */
  static async validateSlug(slug: string, type: 'post' | 'page', excludeId?: string): Promise<{
    valid: boolean;
    suggestion?: string;
  }> {
    const params = { slug, type, ...(excludeId && { excludeId }) };
    return apiClient.get('/content/validate-slug', params);
  }

  /**
   * Generate slug from title
   */
  static async generateSlug(title: string, type: 'post' | 'page'): Promise<{
    slug: string;
  }> {
    return apiClient.post('/content/generate-slug', { title, type });
  }

  /**
   * Get SEO analysis
   */
  static async analyzeSEO(content: string, targetKeyword?: string): Promise<{
    score: number;
    issues: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      suggestion?: string;
    }>;
    recommendations: string[];
  }> {
    return apiClient.post('/content/seo-analysis', { content, targetKeyword });
  }

  /**
   * Update SEO data
   */
  static async updateSEO(contentId: string, type: 'post' | 'page', seoData: SEOData): Promise<{
    success: boolean;
  }> {
    return apiClient.put(`/content/${contentId}/seo`, { type, ...seoData });
  }

  /**
   * Get content insights
   */
  static async getInsights(contentId: string, type: 'post' | 'page'): Promise<{
    readability: {
      score: number;
      level: string;
      issues: string[];
    };
    seo: {
      score: number;
      issues: string[];
    };
    performance: {
      loadTime: number;
      size: number;
      optimization: string[];
    };
  }> {
    return apiClient.get(`/content/${contentId}/insights`, { type });
  }
}