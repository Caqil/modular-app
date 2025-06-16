// ===================================================================
// ADMIN API CLIENT - CORE API UTILITIES AND CLIENT
// ===================================================================

import type { 
  APIResponse_Data, 
  APIError,
  PaginationInfo,
  ResponseMetadata,
  HTTPMethod 
} from '@modular-app/core';

export interface APIClientConfig {
  baseUrl: string;
  version: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

export interface RequestOptions {
  method?: HTTPMethod;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  signal?: AbortSignal;
}

export interface APIClientError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, any>;
  requestId?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: PaginationInfo;
  meta: ResponseMetadata;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filter?: Record<string, any>;
  include?: string[];
  fields?: string[];
}

export class APIClient {
  private config: APIClientConfig;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private baseHeaders: Record<string, string>;

  constructor(config: Partial<APIClientConfig> = {}) {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
      version: 'v1',
      timeout: 30000,
      retries: 3,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...config,
    };

    this.baseHeaders = { ...this.config.headers };
  }

  /**
   * Set authentication token
   */
  public setAuthToken(token: string, refresh?: string): void {
    this.authToken = token;
    this.refreshToken = refresh || null;
    this.baseHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication
   */
  public clearAuth(): void {
    this.authToken = null;
    this.refreshToken = null;
    delete this.baseHeaders['Authorization'];
  }

  /**
   * Get current auth token
   */
  public getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Make HTTP request
   */
  public async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const config = this.buildRequestConfig(options);

    try {
      const response = await this.executeRequest(url, config);
      return await this.handleResponse<T>(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * GET request
   */
  public async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    options: Omit<RequestOptions, 'method' | 'params'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET' as HTTPMethod,
      params,
    });
  }

  /**
   * POST request
   */
  public async post<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST' as HTTPMethod,
      body,
    });
  }

  /**
   * PUT request
   */
  public async put<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT' as HTTPMethod,
      body,
    });
  }

  /**
   * PATCH request
   */
  public async patch<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH' as HTTPMethod,
      body,
    });
  }

  /**
   * DELETE request
   */
  public async delete<T = any>(
    endpoint: string,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE' as HTTPMethod,
    });
  }

  /**
   * Get paginated data
   */
  public async getPaginated<T = any>(
    endpoint: string,
    query: QueryOptions = {}
  ): Promise<PaginatedResponse<T>> {
    const params = this.buildQueryParams(query);
    return this.get<PaginatedResponse<T>>(endpoint, params);
  }

  /**
   * Upload file
   */
  public async upload<T = any>(
    endpoint: string,
    file: File | Blob,
    additionalData?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    const headers = { ...this.baseHeaders };
    delete headers['Content-Type']; // Let browser set multipart boundary

    return this.request<T>(endpoint, {
      method: 'POST' as HTTPMethod,
      body: formData,
      headers,
    });
  }

  /**
   * Download file
   */
  public async download(
    endpoint: string,
    filename?: string
  ): Promise<Blob> {
    const response = await fetch(this.buildUrl(endpoint), {
      headers: this.baseHeaders,
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    if (filename) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    return blob;
  }

  /**
   * Refresh authentication token
   */
  public async refreshAuth(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await this.post<{ accessToken: string; refreshToken?: string }>(
        '/auth/refresh',
        { refreshToken: this.refreshToken }
      );

      this.setAuthToken(response.accessToken, response.refreshToken);
      return true;
    } catch (error) {
      this.clearAuth();
      return false;
    }
  }

  /**
   * Build full URL
   */
  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.config.baseUrl}/${this.config.version}/${cleanEndpoint}`;
  }

  /**
   * Build request configuration
   */
  private buildRequestConfig(options: RequestOptions): RequestInit {
    const { method = 'GET', headers = {}, body, params, timeout } = options;
    
    let finalUrl = '';
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      finalUrl = `?${searchParams.toString()}`;
    }

    const config: RequestInit = {
      method,
      headers: { ...this.baseHeaders, ...headers },
      signal: options.signal,
    };

    if (body) {
      if (body instanceof FormData) {
        config.body = body;
      } else {
        config.body = JSON.stringify(body);
      }
    }

    return config;
  }

  /**
   * Execute HTTP request with retries
   */
  private async executeRequest(url: string, config: RequestInit): Promise<Response> {
    let lastError: Error;
    const retries = config.retries || this.config.retries;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const finalConfig = {
          ...config,
          signal: config.signal || controller.signal,
        };

        const response = await fetch(url, finalConfig);
        clearTimeout(timeoutId);

        // Handle 401 and attempt token refresh
        if (response.status === 401 && this.refreshToken && attempt === 0) {
          const refreshed = await this.refreshAuth();
          if (refreshed) {
            // Retry with new token
            finalConfig.headers = { ...finalConfig.headers, ...this.baseHeaders };
            continue;
          }
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on abort or network errors on last attempt
        if (attempt === retries || error.name === 'AbortError') {
          break;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError!;
  }

  /**
   * Handle response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('Content-Type') || '';
    
    let data: any;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType.includes('text/')) {
      data = await response.text();
    } else {
      data = await response.blob();
    }

    if (!response.ok) {
      throw this.createAPIError(response, data);
    }

    // Return the data directly if it's an APIResponse_Data structure
    if (data && typeof data === 'object' && 'success' in data) {
      return data.data || data;
    }

    return data;
  }

  /**
   * Handle request errors
   */
  private handleError(error: any): APIClientError {
    if (error.name === 'AbortError') {
      return this.createClientError('Request was aborted', 'ABORTED', 0);
    }

    if (error.name === 'TimeoutError') {
      return this.createClientError('Request timed out', 'TIMEOUT', 0);
    }

    if (error instanceof APIClientError) {
      return error;
    }

    return this.createClientError(
      error.message || 'Unknown error occurred',
      'UNKNOWN_ERROR',
      0
    );
  }

  /**
   * Create API error from response
   */
  private createAPIError(response: Response, data: any): APIClientError {
    const error = this.createClientError(
      data?.message || response.statusText || 'API Error',
      data?.code || 'API_ERROR',
      response.status
    );

    if (data?.details) {
      error.details = data.details;
    }

    if (data?.requestId) {
      error.requestId = data.requestId;
    }

    return error;
  }

  /**
   * Create client error
   */
  private createClientError(
    message: string,
    code: string,
    statusCode: number
  ): APIClientError {
    const error = new Error(message) as APIClientError;
    error.name = 'APIClientError';
    error.statusCode = statusCode;
    error.code = code;
    error.timestamp = new Date();
    return error;
  }

  /**
   * Build query parameters from options
   */
  private buildQueryParams(options: QueryOptions): Record<string, any> {
    const params: Record<string, any> = {};

    if (options.page !== undefined) params.page = options.page;
    if (options.limit !== undefined) params.limit = options.limit;
    if (options.sort) params.sort = options.sort;
    if (options.order) params.order = options.order;
    if (options.search) params.search = options.search;
    if (options.include?.length) params.include = options.include.join(',');
    if (options.fields?.length) params.fields = options.fields.join(',');

    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params[`filter[${key}]`] = value;
        }
      });
    }

    return params;
  }
}

// Default API client instance
export const apiClient = new APIClient();

// Export common types
export type { 
  APIResponse_Data, 
  APIError, 
  PaginationInfo,
  ResponseMetadata 
};