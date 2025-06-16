// ===================================================================
// CACHE MANAGER - MAIN CACHE ORCHESTRATION SYSTEM
// ===================================================================

import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { EventType } from '../events/event-types';
import { RedisCache } from './redis-cache';
import { MemoryCache } from './memory-cache';
import {
  CacheAdapter,
  CacheConfig,
  CacheInfo,
  CacheStats,
  CacheResult,
  CacheSetOptions,
  CacheGetOptions,
  CacheEventType,
  CacheMiddleware,
  CacheNamespace,
  CacheBulkOperation,
  CacheBulkResult,
  CacheHealthCheck,
} from './cache-types';

export interface CacheManagerConfig {
  enabled: boolean;
  defaultTTL: number;
  keyPrefix: string;
  enableMetrics: boolean;
  enableEvents: boolean;
  middleware: CacheMiddleware[];
  namespaces: Record<string, CacheNamespace>;
  fallbackToMemory: boolean;
  compressionThreshold: number; // Compress values larger than this (bytes)
}

/**
 * Cache Manager
 * Central orchestration system for all caching operations
 */
export class CacheManager {
  private static instance: CacheManager;
  private logger = new Logger('CacheManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private adapter: CacheAdapter | null = null;
  private fallbackAdapter: MemoryCache | null = null;
  private initialized = false;
  private middleware: CacheMiddleware[] = [];
  private namespaces = new Map<string, CacheNamespace>();
  private managerConfig: CacheManagerConfig;

  private readonly defaultManagerConfig: CacheManagerConfig = {
    enabled: true,
    defaultTTL: 300, // 5 minutes
    keyPrefix: 'modular-app:',
    enableMetrics: true,
    enableEvents: true,
    middleware: [],
    namespaces: {},
    fallbackToMemory: true,
    compressionThreshold: 1024, // 1KB
  };

  private constructor() {
    this.managerConfig = this.defaultManagerConfig;
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Initialize cache manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Cache manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing cache manager...');

      // Load configuration
      const cacheConfig = await this.config.get<CacheConfig>('cache');
      this.managerConfig = { ...this.defaultManagerConfig, ...cacheConfig };

      if (!this.managerConfig.enabled) {
        this.logger.info('Cache disabled by configuration');
        this.initialized = true;
        return;
      }

      // Initialize primary adapter
      await this.initializePrimaryAdapter(cacheConfig);

      // Initialize fallback adapter if enabled
      if (this.managerConfig.fallbackToMemory) {
        await this.initializeFallbackAdapter();
      }

      // Setup namespaces
      this.setupNamespaces();

      // Register middleware
      this.setupMiddleware();

      // Register event handlers
      await this.registerEventHandlers();

      this.initialized = true;
      this.logger.info('Cache manager initialized successfully', {
        adapter: this.adapter?.name,
        fallback: this.fallbackAdapter ? 'memory' : 'none',
        namespaces: Array.from(this.namespaces.keys()),
      });

      // Emit initialization event
      if (this.managerConfig.enableEvents) {
        await this.events.emit(EventType.CACHE_INIT, {
          adapter: this.adapter?.name,
          fallback: !!this.fallbackAdapter,
        });
      }

    } catch (error) {
      this.logger.error('Failed to initialize cache manager:', error);
      throw error;
    }
  }

  /**
   * Get value from cache
   */
  public async get<T>(key: string, options?: CacheGetOptions): Promise<T | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      // Apply middleware
      const processedKey = await this.applyBeforeGetMiddleware(key);
      
      // Try primary adapter first
      let value: T | null = null;
      if (this.adapter) {
        try {
          value = await this.adapter.get<T>(processedKey);
        } catch (error) {
          this.logger.warn('Primary cache adapter failed, trying fallback:', error);
          
          if (this.fallbackAdapter) {
            value = await this.fallbackAdapter.get<T>(processedKey);
          }
        }
      }

      // Apply after middleware
      value = await this.applyAfterGetMiddleware(processedKey, value);

      // Update access time if requested
      if (options?.updateAccessTime && value !== null) {
        // This would be implemented in the specific adapters
      }

      return value;

    } catch (error) {
      this.logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  public async set<T>(key: string, value: T, ttl?: number, options?: CacheSetOptions): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      // Apply middleware
      const processed = await this.applyBeforeSetMiddleware(key, value, ttl);
      
      // Set in primary adapter
      if (this.adapter) {
        try {
          await this.adapter.set(processed.key, processed.value, processed.ttl);
        } catch (error) {
          this.logger.warn('Primary cache adapter failed for set operation:', error);
          
          // Try fallback
          if (this.fallbackAdapter) {
            await this.fallbackAdapter.set(processed.key, processed.value, processed.ttl);
          }
        }
      }

      // Apply after middleware
      await this.applyAfterSetMiddleware(processed.key, true);

    } catch (error) {
      this.logger.error('Cache set error:', error );
      await this.applyAfterSetMiddleware(key, false);
    }
  }

  /**
   * Delete key from cache
   */
  public async delete(key: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      // Apply middleware
      const processedKey = await this.applyBeforeDeleteMiddleware(key);
      
      let success = false;

      // Delete from primary adapter
      if (this.adapter) {
        try {
          success = await this.adapter.delete(processedKey);
        } catch (error) {
          this.logger.warn('Primary cache adapter failed for delete operation:', error);
        }
      }

      // Delete from fallback adapter
      if (this.fallbackAdapter) {
        try {
          await this.fallbackAdapter.delete(processedKey);
        } catch (error) {
          // Don't log fallback failures as they're not critical
        }
      }

      // Apply after middleware
      await this.applyAfterDeleteMiddleware(processedKey, success);

      return success;

    } catch (error) {
      this.logger.error('Cache delete error:', error );
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  public async deletePattern(pattern: string): Promise<number> {
    if (!this.isEnabled()) {
      return 0;
    }

    try {
      let deleted = 0;

      // Delete from primary adapter
      if (this.adapter) {
        try {
          deleted = await this.adapter.deletePattern(pattern);
        } catch (error) {
          this.logger.warn('Primary cache adapter failed for deletePattern operation:', error);
        }
      }

      // Delete from fallback adapter
      if (this.fallbackAdapter) {
        try {
          await this.fallbackAdapter.deletePattern(pattern);
        } catch (error) {
          // Don't log fallback failures
        }
      }

      return deleted;

    } catch (error) {
      this.logger.error('Cache deletePattern error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  public async clear(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      // Clear primary adapter
      if (this.adapter) {
        await this.adapter.clear();
      }

      // Clear fallback adapter
      if (this.fallbackAdapter) {
        await this.fallbackAdapter.clear();
      }

      this.logger.info('Cache cleared successfully');

    } catch (error) {
      this.logger.error('Cache clear error:', error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      if (this.adapter) {
        return await this.adapter.exists(key);
      }

      return false;

    } catch (error) {
      this.logger.error('Cache exists error:', error );
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  public async ttl(key: string): Promise<number> {
    if (!this.isEnabled()) {
      return -2;
    }

    try {
      if (this.adapter) {
        return await this.adapter.ttl(key);
      }

      return -2;

    } catch (error) {
      this.logger.error('Cache TTL error:', error );
      return -2;
    }
  }

  /**
   * Set expiration for key
   */
  public async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      if (this.adapter) {
        return await this.adapter.expire(key, ttl);
      }

      return false;

    } catch (error) {
      this.logger.error('Cache expire error:', error );
      return false;
    }
  }

  /**
   * Get keys matching pattern
   */
  public async keys(pattern?: string): Promise<string[]> {
    if (!this.isEnabled()) {
      return [];
    }

    try {
      if (this.adapter) {
        return await this.adapter.keys(pattern);
      }

      return [];

    } catch (error) {
      this.logger.error('Cache keys error:', error );
      return [];
    }
  }

  /**
   * Bulk operations
   */
public async bulk<T>(operations: CacheBulkOperation<T>): Promise<CacheBulkResult<T>> {
  const result: CacheBulkResult<T> = {
    successful: [],
    failed: [],
    stats: {
      total: operations.entries.length,
      successful: 0,
      failed: 0,
    },
  };

  for (const entry of operations.entries) {
    try {
      switch (operations.operation) {
        case 'get':
          const value = await this.get<T>(entry.key);
          result.successful.push({ key: entry.key, value }); // Now compatible with T | null
          break;
        case 'set':
          await this.set(entry.key, entry.value!, entry.ttl);
          result.successful.push({ key: entry.key, value: null });
          break;
        case 'delete':
          await this.delete(entry.key);
          result.successful.push({ key: entry.key, value: null });
          break;
      }
      result.stats.successful++;
    } catch (error: unknown) {
      result.failed.push({
        key: entry.key,
        error: error instanceof Error ? error.message : String(error),
      });
      result.stats.failed++;
    }
  }

  return result;
}

  /**
   * Cache with result wrapper
   */
  public async remember<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<CacheResult<T>> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      
      if (cached !== null) {
        return {
          success: true,
          data: cached,
          metadata: {
            cached: true,
            key,
          },
        };
      }

      // Generate fresh data
      const data = await factory();
      
      // Store in cache
      await this.set(key, data, ttl);

      return {
        success: true,
        data,
        metadata: {
          cached: false,
          key,
          ...(ttl !== undefined ? { ttl } : {}),
        },
      };

    } catch (error) {
      this.logger.error('Cache remember error:', error );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get cache information
   */
  public async getInfo(): Promise<CacheInfo[]> {
    const info: CacheInfo[] = [];

    if (this.adapter) {
      try {
        info.push(await this.adapter.info());
      } catch (error) {
        this.logger.error('Failed to get primary adapter info:', error);
      }
    }

    if (this.fallbackAdapter) {
      try {
        info.push(await this.fallbackAdapter.info());
      } catch (error) {
        this.logger.error('Failed to get fallback adapter info:', error);
      }
    }

    return info;
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<CacheStats[]> {
    const stats: CacheStats[] = [];

    if (this.adapter && 'getStats' in this.adapter) {
      stats.push((this.adapter as any).getStats());
    }

    if (this.fallbackAdapter) {
      stats.push(this.fallbackAdapter.getStats());
    }

    return stats;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<CacheHealthCheck> {
    try {
      const testKey = `health:${Date.now()}`;
      const testValue = 'test';
      const start = Date.now();

      // Test set/get operations
      await this.set(testKey, testValue, 10);
      const retrieved = await this.get(testKey);
      await this.delete(testKey);

      const responseTime = Date.now() - start;
      const healthy = retrieved === testValue;

      return {
        healthy,
        connected: this.adapter !== null,
        responsive: responseTime < 1000,
        errors: [],
        lastCheck: new Date(),
        responseTime,
        details: {
          adapter: this.adapter?.name,
          fallback: !!this.fallbackAdapter,
          responseTime,
        },
      };

    } catch (error) {
      return {
        healthy: false,
        connected: false,
        responsive: false,
        errors: [{
          code: 'HEALTH_CHECK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          operation: 'healthCheck',
        }],
        lastCheck: new Date(),
        responseTime: -1,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Add middleware
   */
  public addMiddleware(middleware: CacheMiddleware): void {
    this.middleware.push(middleware);
    this.logger.debug('Cache middleware added', { name: middleware.name });
  }

  /**
   * Create namespace helper
   */
  public namespace(prefix: string): CacheNamespaceHelper {
    return new CacheNamespaceHelper(this, prefix);
  }

  /**
   * Shutdown cache manager
   */
  public async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down cache manager...');

      if (this.adapter && 'shutdown' in this.adapter) {
        await (this.adapter as any).shutdown();
      }

      if (this.fallbackAdapter) {
        await this.fallbackAdapter.shutdown();
      }

      this.initialized = false;
      this.logger.info('Cache manager shutdown complete');

    } catch (error) {
      this.logger.error('Cache manager shutdown error:', error);
      throw error;
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private isEnabled(): boolean {
    return this.initialized && this.managerConfig.enabled;
  }

  private async initializePrimaryAdapter(config: CacheConfig): Promise<void> {
    switch (config.adapter) {
      case 'redis':
        if (!config.redis) {
          throw new Error('Redis configuration required for redis adapter');
        }
        this.adapter = new RedisCache(config.redis);
        await (this.adapter as RedisCache).connect();
        break;

      case 'memory':
        if (!config.memory) {
          throw new Error('Memory configuration required for memory adapter');
        }
        this.adapter = new MemoryCache(config.memory);
        break;

      default:
        throw new Error(`Unsupported cache adapter: ${config.adapter}`);
    }
  }

  private async initializeFallbackAdapter(): Promise<void> {
    this.fallbackAdapter = new MemoryCache({
      maxSize: 50, // 50MB
      ttl: 300, // 5 minutes
      checkPeriod: 60,
      useClones: false,
      maxKeys: 5000,
    });
  }

  private setupNamespaces(): void {
    for (const [prefix, namespace] of Object.entries(this.managerConfig.namespaces)) {
      this.namespaces.set(prefix, namespace);
    }
  }

  private setupMiddleware(): void {
    for (const middleware of this.managerConfig.middleware) {
      this.addMiddleware(middleware);
    }
  }

  private async registerEventHandlers(): Promise<void> {
    if (!this.managerConfig.enableEvents) {
      return;
    }

    // Register cache event handlers here
    // This would connect to the event system for cache-related events
  }

  // Middleware application methods
  private async applyBeforeGetMiddleware(key: string): Promise<string> {
    let processedKey = key;
    
    for (const middleware of this.middleware) {
      if (middleware.beforeGet) {
        processedKey = await middleware.beforeGet(processedKey);
      }
    }
    
    return processedKey;
  }

  private async applyAfterGetMiddleware<T>(key: string, value: T | null): Promise<T | null> {
    let processedValue = value;
    
    for (const middleware of this.middleware) {
      if (middleware.afterGet) {
        processedValue = await middleware.afterGet(key, processedValue);
      }
    }
    
    return processedValue;
  }

  private async applyBeforeSetMiddleware<T>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<{ key: string; value: T; ttl: number | undefined }> {
    let processed: { key: string; value: T; ttl: number | undefined } = { key, value, ttl };
    
    for (const middleware of this.middleware) {
      if (middleware.beforeSet) {
        const result = await middleware.beforeSet(processed.key, processed.value, processed.ttl);
        processed = {
          key: result.key,
          value: result.value,
          ttl: result.ttl !== undefined ? result.ttl : undefined,
        };
      }
    }
    
    return processed;
  }

  private async applyAfterSetMiddleware(key: string, success: boolean): Promise<void> {
    for (const middleware of this.middleware) {
      if (middleware.afterSet) {
        await middleware.afterSet(key, success);
      }
    }
  }

  private async applyBeforeDeleteMiddleware(key: string): Promise<string> {
    let processedKey = key;
    
    for (const middleware of this.middleware) {
      if (middleware.beforeDelete) {
        processedKey = await middleware.beforeDelete(processedKey);
      }
    }
    
    return processedKey;
  }

  private async applyAfterDeleteMiddleware(key: string, success: boolean): Promise<void> {
    for (const middleware of this.middleware) {
      if (middleware.afterDelete) {
        await middleware.afterDelete(key, success);
      }
    }
  }
}

/**
 * Cache namespace helper
 */
export class CacheNamespaceHelper {
  constructor(
    private cacheManager: CacheManager,
    private prefix: string
  ) {}

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string, options?: CacheGetOptions): Promise<T | null> {
    return this.cacheManager.get<T>(this.getKey(key), options);
  }

  async set<T>(key: string, value: T, ttl?: number, options?: CacheSetOptions): Promise<void> {
    return this.cacheManager.set(this.getKey(key), value, ttl, options);
  }

  async delete(key: string): Promise<boolean> {
    return this.cacheManager.delete(this.getKey(key));
  }

  async exists(key: string): Promise<boolean> {
    return this.cacheManager.exists(this.getKey(key));
  }

  async remember<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<CacheResult<T>> {
    return this.cacheManager.remember(this.getKey(key), factory, ttl);
  }

  async clear(): Promise<void> {
    await this.cacheManager.deletePattern(`${this.prefix}:*`);
  }
}