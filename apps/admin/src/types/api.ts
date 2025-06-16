export type {
  APIRequest,
  APIResponse,
  APIError,
  APIConfig,
  APIMetrics,
  APIHealth,
  HTTPMethod,
  ResponseMetadata,
  RateLimitInfo,
} from '@modular-app/core/api/api-types';

// Basic admin-specific API client types
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface APIClientError extends Error {
  status: number;
  code: string;
  details?: any;
}

// Simple API client class
export class apiClient {
  static async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    // Implementation here
    throw new Error('Not implemented');
  }

  static async post<T>(url: string, data?: any): Promise<T> {
    // Implementation here
    throw new Error('Not implemented');
  }

  static async put<T>(url: string, data?: any): Promise<T> {
    // Implementation here
    throw new Error('Not implemented');
  }

  static async delete<T>(url: string, options?: { body?: any }): Promise<T> {
    // Implementation here
    throw new Error('Not implemented');
  }

  static async upload<T>(url: string, file: File, options?: any, onProgress?: (progress: number) => void): Promise<T> {
    // Implementation here
    throw new Error('Not implemented');
  }

  static async download(url: string, filename: string): Promise<Blob> {
    // Implementation here
    throw new Error('Not implemented');
  }

  static async getPaginated<T>(url: string, options?: QueryOptions): Promise<PaginatedResponse<T>> {
    // Implementation here
    throw new Error('Not implemented');
  }
}