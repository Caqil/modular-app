// ===================================================================
// REDIS CACHE - REDIS-BASED CACHING IMPLEMENTATION
// ===================================================================

import { createClient, RedisClientType } from 'redis';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { EventType } from '../events/event-types';
import {
  CacheAdapter,
  CacheInfo,
  CacheStats,
  CacheError,
  CacheEventType,
  RedisCacheConfig,
} from './cache-types';

export class RedisCache implements CacheAdapter {
  public readonly name = 'redis';
  private client: RedisClientType | null = null;
  private logger = new Logger('RedisCache');
  private events = EventManager.getInstance();
  private config: RedisCacheConfig;
  private connected = false;
  private stats: CacheStats;
  private errors: CacheError[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
constructor(config: RedisCacheConfig) {
  this.config = {
    ...config,
    keyPrefix: config.keyPrefix ?? 'modular-app:',
    retryDelayOnFailover: config.retryDelayOnFailover ?? 100,
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
    connectTimeout: config.connectTimeout ?? 10000,
    lazyConnect: config.lazyConnect ?? true,
  };

  this.stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    errors: 0,
    startTime: new Date(),
    hitRate: 0,
    missRate: 0,
    operationsPerSecond: 0,
    avgResponseTime: 0,
  };
}

  /**
   * Initialize Redis connection
   */
  public async connect(): Promise<void> {
    try {
      this.logger.info('Connecting to Redis...', {
        url: this.config.url.replace(/\/\/[^@]+@/, '//***:***@'),
        db: this.config.db,
      });

      this.client = createClient({
        url: this.config.url,
        password: this.config.password,
        database: this.config.db,
        socket: {
          connectTimeout: this.config.connectTimeout,
        },
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      });

      // Event handlers
      this.client.on('connect', () => {
        this.logger.info('Redis client connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emitEvent(CacheEventType.CONNECT);
      });

      this.client.on('ready', () => {
        this.logger.info('Redis client ready');
      });

      this.client.on('error', (error) => {
        this.logger.error('Redis client error:', error);
        this.connected = false;
        this.addError('CONNECTION_ERROR', error.message, 'connect');
        this.emitEvent(CacheEventType.ERROR, undefined, { error: error.message });
      });

      this.client.on('end', () => {
        this.logger.warn('Redis connection ended');
        this.connected = false;
        this.emitEvent(CacheEventType.DISCONNECT);
        this.attemptReconnect();
      });

      this.client.on('reconnecting', () => {
        this.logger.info('Redis client reconnecting...');
      });

      // Connect to Redis
      await this.client.connect();

      // Set memory policy if specified
      if (this.config.maxMemoryPolicy) {
        try {
          await this.client.configSet('maxmemory-policy', this.config.maxMemoryPolicy);
        } catch (error) {
          this.logger.warn('Failed to set memory policy:', error);
        }
      }

      this.logger.info('Redis cache connected successfully');

    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      this.addError('CONNECTION_FAILED', error.message, 'connect');
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.connected = false;
        this.logger.info('Redis client disconnected');
      } catch (error) {
        this.logger.error('Error disconnecting Redis client:', error);
      }
    }
  }

  /**
   * Get value from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    const fullKey = this.getFullKey(key);

    try {
      this.ensureConnected();

      const value = await this.client!.get(fullKey);
      const duration = Date.now() - start;

      if (value === null) {
        this.stats.misses++;
        this.emitEvent(CacheEventType.MISS, key, { duration });
        return null;
      }

      const parsed = this.deserialize<T>(value);
      this.stats.hits++;
      this.updateStats();
      this.emitEvent(CacheEventType.HIT, key, { duration });

      return parsed;

    } catch (error) {
      this.stats.errors++;
      this.addError('GET_ERROR', error.message, 'get', key);
      this.logger.error('Redis get error:', error, { key });
      throw error;
    }
  }

  /**
   * Set value in cache
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const start = Date.now();
    const fullKey = this.getFullKey(key);

    try {
      this.ensureConnected();

      const serialized = this.serialize(value);
      
      if (ttl && ttl > 0) {
        await this.client!.setEx(fullKey, ttl, serialized);
      } else {
        await this.client!.set(fullKey, serialized);
      }

      const duration = Date.now() - start;
      this.stats.sets++;
      this.updateStats();
      this.emitEvent(CacheEventType.SET, key, { duration, ttl });

    } catch (error) {
      this.stats.errors++;
      this.addError('SET_ERROR', error.message, 'set', key);
      this.logger.error('Redis set error:', error, { key });
      throw error;
    }
  }

  /**
   * Delete key from cache
   */
  public async delete(key: string): Promise<boolean> {
    const start = Date.now();
    const fullKey = this.getFullKey(key);

    try {
      this.ensureConnected();

      const result = await this.client!.del(fullKey);
      const duration = Date.now() - start;
      
      this.stats.deletes++;
      this.updateStats();
      this.emitEvent(CacheEventType.DELETE, key, { duration, deleted: result > 0 });

      return result > 0;

    } catch (error) {
      this.stats.errors++;
      this.addError('DELETE_ERROR', error.message, 'delete', key);
      this.logger.error('Redis delete error:', error, { key });
      throw error;
    }
  }

  /**
   * Delete keys matching pattern
   */
  public async deletePattern(pattern: string): Promise<number> {
    try {
      this.ensureConnected();

      const fullPattern = this.getFullKey(pattern);
      const keys = await this.client!.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client!.del(keys);
      this.stats.deletes += result;
      this.updateStats();

      return result;

    } catch (error) {
      this.stats.errors++;
      this.addError('DELETE_PATTERN_ERROR', error.message, 'deletePattern', pattern);
      this.logger.error('Redis delete pattern error:', error, { pattern });
      throw error;
    }
  }

  /**
   * Clear all cache
   */
  public async clear(): Promise<void> {
    try {
      this.ensureConnected();

      const pattern = this.getFullKey('*');
      const keys = await this.client!.keys(pattern);
      
      if (keys.length > 0) {
        await this.client!.del(keys);
      }

      this.emitEvent(CacheEventType.CLEAR);
      this.logger.info('Redis cache cleared', { deletedKeys: keys.length });

    } catch (error) {
      this.stats.errors++;
      this.addError('CLEAR_ERROR', error.message, 'clear');
      this.logger.error('Redis clear error:', error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      this.ensureConnected();

      const fullKey = this.getFullKey(key);
      const result = await this.client!.exists(fullKey);
      
      return result === 1;

    } catch (error) {
      this.addError('EXISTS_ERROR', error.message, 'exists', key);
      this.logger.error('Redis exists error:', error, { key });
      throw error;
    }
  }

  /**
   * Get TTL for key
   */
  public async ttl(key: string): Promise<number> {
    try {
      this.ensureConnected();

      const fullKey = this.getFullKey(key);
      return await this.client!.ttl(fullKey);

    } catch (error) {
      this.addError('TTL_ERROR', error.message, 'ttl', key);
      this.logger.error('Redis TTL error:', error, { key });
      throw error;
    }
  }

  /**
   * Set expiration for key
   */
  public async expire(key: string, ttl: number): Promise<boolean> {
    try {
      this.ensureConnected();

      const fullKey = this.getFullKey(key);
      const result = await this.client!.expire(fullKey, ttl);
      
      this.emitEvent(CacheEventType.EXPIRE, key, { ttl });
      return result;

    } catch (error) {
      this.addError('EXPIRE_ERROR', error.message, 'expire', key);
      this.logger.error('Redis expire error:', error, { key });
      throw error;
    }
  }

  /**
   * Get all keys matching pattern
   */
  public async keys(pattern: string = '*'): Promise<string[]> {
    try {
      this.ensureConnected();

      const fullPattern = this.getFullKey(pattern);
      const keys = await this.client!.keys(fullPattern);
      
      // Remove prefix from keys
      return keys.map(key => key.replace(this.config.keyPrefix, ''));

    } catch (error) {
      this.addError('KEYS_ERROR', error.message, 'keys', pattern);
      this.logger.error('Redis keys error:', error, { pattern });
      throw error;
    }
  }

  /**
   * Get cache size (number of keys)
   */
  public async size(): Promise<number> {
    try {
      this.ensureConnected();

      const pattern = this.getFullKey('*');
      const keys = await this.client!.keys(pattern);
      
      return keys.length;

    } catch (error) {
      this.addError('SIZE_ERROR', error.message, 'size');
      this.logger.error('Redis size error:', error);
      throw error;
    }
  }

  /**
   * Get cache info
   */
  public async info(): Promise<CacheInfo> {
    try {
      const redisInfo = this.connected ? await this.client!.info('memory') : '';
      const size = await this.size().catch(() => 0);
      
      // Parse memory info
      const memoryMatch = redisInfo.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      return {
        name: this.name,
        type: 'redis',
        connected: this.connected,
        size: memoryUsage,
        keys: size,
        hitRate: this.stats.hitRate,
        missRate: this.stats.missRate,
        uptime: Date.now() - this.stats.startTime.getTime(),
        errors: this.errors.slice(-10), // Last 10 errors
      };

    } catch (error) {
      this.logger.error('Redis info error:', error);
      return {
        name: this.name,
        type: 'redis',
        connected: false,
        size: 0,
        keys: 0,
        errors: this.errors.slice(-10),
      };
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      errors: 0,
      startTime: new Date(),
      lastReset: new Date(),
      hitRate: 0,
      missRate: 0,
      operationsPerSecond: 0,
      avgResponseTime: 0,
    };

    this.errors = [];
    this.logger.info('Redis cache stats reset');
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private ensureConnected(): void {
    if (!this.connected || !this.client) {
      throw new Error('Redis client not connected');
    }
  }

  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private serialize<T>(value: T): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new Error(`Failed to serialize value: ${error.message}`);
    }
  }

  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`Failed to deserialize value: ${error.message}`);
    }
  }

  private updateStats(): void {
    const total = this.stats.hits + this.stats.misses;
    if (total > 0) {
      this.stats.hitRate = this.stats.hits / total;
      this.stats.missRate = this.stats.misses / total;
    }

    const uptime = (Date.now() - this.stats.startTime.getTime()) / 1000;
    const totalOps = this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes;
    this.stats.operationsPerSecond = totalOps / uptime;
  }

  private addError(code: string, message: string, operation: string, key?: string): void {
    const error: CacheError = {
      code,
      message,
      timestamp: new Date(),
      operation,
      key,
    };

    this.errors.push(error);

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
  }

  private emitEvent(type: CacheEventType, key?: string, metadata?: Record<string, any>): void {
    this.events.emit(type, {
      key,
      adapter: this.name,
      timestamp: new Date(),
      metadata,
    }).catch(error => {
      this.logger.error('Failed to emit cache event:', error);
    });
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    this.logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.logger.error('Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }
}