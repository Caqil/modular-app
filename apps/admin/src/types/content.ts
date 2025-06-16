export type {
  BaseContent,
  PostType,
  PageType,
  MediaType,
  CommentType,
  CategoryType,
  TagType,
  ContentStats,
  ContentMeta,
  ContentRevision,
  ContentStatus,
  ContentType,
} from '@modular-app/core';

import { apiClient, type PaginatedResponse, type QueryOptions } from './api';

// Import enums for runtime usage
import { ContentStatus, ContentType } from '@modular-app/core';

// Admin content API
export class ContentAPI {
  static async getPosts(options: QueryOptions = {}): Promise<PaginatedResponse<import('@modular-app/core').PostType>> {
    return apiClient.getPaginated('/content/posts', options);
  }

  static async getPost(id: string): Promise<import('@modular-app/core').PostType> {
    return apiClient.get(`/content/posts/${id}`);
  }

  static async createPost(data: Partial<import('@modular-app/core').PostType>): Promise<import('@modular-app/core').PostType> {
    return apiClient.post('/content/posts', data);
  }

  static async updatePost(id: string, data: Partial<import('@modular-app/core').PostType>): Promise<import('@modular-app/core').PostType> {
    return apiClient.put(`/content/posts/${id}`, data);
  }

  static async deletePost(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/content/posts/${id}`);
  }

  static async getPages(options: QueryOptions = {}): Promise<PaginatedResponse<import('@modular-app/core').PageType>> {
    return apiClient.getPaginated('/content/pages', options);
  }

  static async getPage(id: string): Promise<import('@modular-app/core').PageType> {
    return apiClient.get(`/content/pages/${id}`);
  }

  static async createPage(data: Partial<import('@modular-app/core').PageType>): Promise<import('@modular-app/core').PageType> {
    return apiClient.post('/content/pages', data);
  }

  static async updatePage(id: string, data: Partial<import('@modular-app/core').PageType>): Promise<import('@modular-app/core').PageType> {
    return apiClient.put(`/content/pages/${id}`, data);
  }

  static async deletePage(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/content/pages/${id}`);
  }

  static async getMedia(options: QueryOptions = {}): Promise<PaginatedResponse<import('@modular-app/core').MediaType>> {
    return apiClient.getPaginated('/content/media', options);
  }

  static async uploadMedia(file: File): Promise<import('@modular-app/core').MediaType> {
    return apiClient.upload('/content/media', file);
  }

  static async deleteMedia(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/content/media/${id}`);
  }

  static async getContentStats(): Promise<import('@modular-app/core').ContentStats> {
    return apiClient.get('/content/stats');
  }
}

// Content utilities
export const ContentUtils = {
  getStatusColor(status: ContentStatus): string {
    const colors: Partial<Record<ContentStatus, string>> = {
      [ContentStatus.DRAFT]: '#6b7280',
      [ContentStatus.PUBLISHED]: '#10b981',
      [ContentStatus.TRASH]: '#ef4444',
    };
    return colors[status] || '#6b7280';
  },

  getTypeIcon(type: ContentType): string {
    const icons:Partial<Record<ContentType, string>> = {
      [ContentType.POST]: '📝',
      [ContentType.PAGE]: '📄',
      [ContentType.MEDIA]: '🖼️',
    };
    return icons[type] || '📄';
  },

  formatReadingTime(content: string): string {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  },
};
