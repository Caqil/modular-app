// ===================================================================
// MEMORY CACHE - IN-MEMORY CACHING IMPLEMENTATION
// ===================================================================

import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import {
  CacheAdapter,
  CacheInfo,
  CacheStats,
  CacheError,
  CacheEventType,
  CacheEntry,
  MemoryCacheConfig,
} from './cache-types';

export class MemoryCache implements CacheAdapter {
  public readonly name = 'memory';
  private cache = new Map<string, CacheEntry>();
  private logger = new Logger('MemoryCache');
  private events = EventManager.getInstance();
  private config: MemoryCacheConfig;
  private stats: CacheStats;
  private errors: CacheError[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxSizeBytes: number;
constructor(config: MemoryCacheConfig) {
  const defaults = {
    maxSize: 100, // 100MB default
    ttl: 300, // 5 minutes default
    checkPeriod: 60, // 1 minute cleanup interval
    useClones: false, // Don't clone by default for performance
    maxKeys: 10000, // 10k keys max
  };

  this.config = {
    ...defaults,
    ...config,
  };

  this.maxSizeBytes = this.config.maxSize * 1024 * 1024; // Convert MB to bytes

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

  this.startCleanupInterval();
  this.logger.info('Memory cache initialized', {
    maxSize: `${this.config.maxSize}MB`,
    maxKeys: this.config.maxKeys,
    defaultTTL: this.config.ttl,
  });
}

  /**
   * Get value from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    const start = Date.now();

    try {
      const entry = this.cache.get(key);
      const duration = Date.now() - start;

      if (!entry) {
        this.stats.misses++;
        this.emitEvent(CacheEventType.MISS, key, { duration });
        return null;
      }

      // Check if expired
      if (entry.expiresAt && entry.expiresAt <= new Date()) {
        this.cache.delete(key);
        this.stats.misses++;
        this.emitEvent(CacheEventType.MISS, key, { duration, reason: 'expired' });
        return null;
      }

      // Update access stats
      entry.accessCount++;
      entry.lastAccessed = new Date();

      this.stats.hits++;
      this.updateStats();
      this.emitEvent(CacheEventType.HIT, key, { duration });

      // Return cloned value if configured
      return this.config.useClones ? this.deepClone(entry.value) : entry.value;

    } catch (error) {
      this.stats.errors++;
      this.addError('GET_ERROR', error.message, 'get', key);
      this.logger.error('Memory cache get error:', error, { key });
      throw error;
    }
  }

  /**
   * Set value in cache
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const start = Date.now();

    try {
      // Check if we need to evict entries
      await this.ensureCapacity();

      const now = new Date();
      const effectiveTTL = ttl ?? this.config.ttl;
      const expiresAt = effectiveTTL > 0 ? new Date(now.getTime() + effectiveTTL * 1000) : undefined;

      const entry: CacheEntry<T> = {
        key,
        value: this.config.useClones ? this.deepClone(value) : value,
        ttl: effectiveTTL,
        createdAt: now,
        expiresAt,
        accessCount: 0,
        lastAccessed: now,
      };

      this.cache.set(key, entry);

      const duration = Date.now() - start;
      this.stats.sets++;
      this.updateStats();
      this.emitEvent(CacheEventType.SET, key, { duration, ttl: effectiveTTL });

    } catch (error) {
      this.stats.errors++;
      this.addError('SET_ERROR', error.message, 'set', key);
      this.logger.error('Memory cache set error:', error, { key });
      throw error;
    }
  }

  /**
   * Delete key from cache
   */
  public async delete(key: string): Promise<boolean> {
    const start = Date.now();

    try {
      const existed = this.cache.has(key);
      this.cache.delete(key);

      const duration = Date.now() - start;
      this.stats.deletes++;
      this.updateStats();
      this.emitEvent(CacheEventType.DELETE, key, { duration, existed });

      return existed;

    } catch (error) {
      this.stats.errors++;
      this.addError('DELETE_ERROR', error.message, 'delete', key);
      this.logger.error('Memory cache delete error:', error, { key });
      throw error;
    }
  }

  /**
   * Delete keys matching pattern
   */
  public async deletePattern(pattern: string): Promise<number> {
    try {
      const regex = this.patternToRegex(pattern);
      const keysToDelete: string[] = [];

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.cache.delete(key);
      }

      this.stats.deletes += keysToDelete.length;
      this.updateStats();

      return keysToDelete.length;

    } catch (error) {
      this.stats.errors++;
      this.addError('DELETE_PATTERN_ERROR', error.message, 'deletePattern', pattern);
      this.logger.error('Memory cache delete pattern error:', error, { pattern });
      throw error;
    }
  }

  /**
   * Clear all cache
   */
  public async clear(): Promise<void> {
    try {
      const keyCount = this.cache.size;
      this.cache.clear();

      this.emitEvent(CacheEventType.CLEAR, undefined, { deletedKeys: keyCount });
      this.logger.info('Memory cache cleared', { deletedKeys: keyCount });

    } catch (error) {
      this.stats.errors++;
      this.addError('CLEAR_ERROR', error.message, 'clear');
      this.logger.error('Memory cache clear error:', error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return false;
      }

      // Check if expired
      if (entry.expiresAt && entry.expiresAt <= new Date()) {
        this.cache.delete(key);
        return false;
      }

      return true;

    } catch (error) {
      this.addError('EXISTS_ERROR', error.message, 'exists', key);
      this.logger.error('Memory cache exists error:', error, { key });
      throw error;
    }
  }

  /**
   * Get TTL for key
   */
  public async ttl(key: string): Promise<number> {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return -2; // Key doesn't exist
      }

      if (!entry.expiresAt) {
        return -1; // Key exists but has no expiration
      }

      const remaining = Math.floor((entry.expiresAt.getTime() - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2; // Expired

    } catch (error) {
      this.addError('TTL_ERROR', error.message, 'ttl', key);
      this.logger.error('Memory cache TTL error:', error, { key });
      throw error;
    }
  }

  /**
   * Set expiration for key
   */
  public async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return false;
      }

      if (ttl > 0) {
        entry.expiresAt = new Date(Date.now() + ttl * 1000);
        entry.ttl = ttl;
      } else {
        entry.expiresAt = undefined;
        entry.ttl = undefined;
      }

      this.emitEvent(CacheEventType.EXPIRE, key, { ttl });
      return true;

    } catch (error) {
      this.addError('EXPIRE_ERROR', error.message, 'expire', key);
      this.logger.error('Memory cache expire error:', error, { key });
      throw error;
    }
  }

  /**
   * Get all keys matching pattern
   */
  public async keys(pattern: string = '*'): Promise<string[]> {
    try {
      if (pattern === '*') {
        return Array.from(this.cache.keys());
      }

      const regex = this.patternToRegex(pattern);
      const matchingKeys: string[] = [];

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          matchingKeys.push(key);
        }
      }

      return matchingKeys;

    } catch (error) {
      this.addError('KEYS_ERROR', error.message, 'keys', pattern);
      this.logger.error('Memory cache keys error:', error, { pattern });
      throw error;
    }
  }

  /**
   * Get cache size (number of keys)
   */
  public async size(): Promise<number> {
    return this.cache.size;
  }

  /**
   * Get cache info
   */
  public async info(): Promise<CacheInfo> {
    try {
      const memoryUsage = this.calculateMemoryUsage();
      
      return {
        name: this.name,
        type: 'memory',
        connected: true,
        size: memoryUsage,
        keys: this.cache.size,
        maxSize: this.maxSizeBytes,
        memoryUsage,
        hitRate: this.stats.hitRate,
        missRate: this.stats.missRate,
        evictions: this.stats.evictions,
        uptime: Date.now() - this.stats.startTime.getTime(),
        lastCleanup: this.getLastCleanupTime(),
        errors: this.errors.slice(-10), // Last 10 errors
      };

    } catch (error) {
      this.logger.error('Memory cache info error:', error);
      return {
        name: this.name,
        type: 'memory',
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
    this.logger.info('Memory cache stats reset');
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.cache.clear();
    this.logger.info('Memory cache shutdown complete');
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.checkPeriod * 1000);
  }

  private cleanup(): void {
    const now = new Date();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.cache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.stats.evictions += evicted;
      this.logger.debug('Memory cache cleanup completed', { evicted });
    }
  }

  private async ensureCapacity(): Promise<void> {
    // Check key count limit
    if (this.cache.size >= this.config.maxKeys) {
      await this.evictLRU();
    }

    // Check memory usage
    const memoryUsage = this.calculateMemoryUsage();
    if (memoryUsage > this.maxSizeBytes) {
      await this.evictLRU();
    }
  }

  private async evictLRU(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Sort by last accessed time (oldest first)
    entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());

    // Evict 10% of entries or at least 1
    const toEvict = Math.max(1, Math.floor(entries.length * 0.1));
    
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.stats.evictions++;
      this.emitEvent(CacheEventType.EVICT, key);
    }

    this.logger.debug('Memory cache LRU eviction completed', { evicted: toEvict });
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      totalSize += this.getEntrySize(entry);
    }

    return totalSize;
  }

  private getEntrySize(entry: CacheEntry): number {
    // Rough estimation of memory usage
    const valueSize = this.getValueSize(entry.value);
    const keySize = entry.key.length * 2; // Assuming UTF-16
    const metadataSize = 200; // Rough estimate for dates, numbers, etc.
    
    return valueSize + keySize + metadataSize;
  }

  private getValueSize(value: any): number {
    try {
      if (value === null || value === undefined) {
        return 0;
      }
      
      if (typeof value === 'string') {
        return value.length * 2; // UTF-16
      }
      
      if (typeof value === 'number' || typeof value === 'boolean') {
        return 8;
      }
      
      // For objects, use JSON string length as approximation
      return JSON.stringify(value).length * 2;
      
    } catch {
      return 100; // Fallback estimate
    }
  }

  private deepClone<T>(obj: T): T {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      // Fallback to original object if cloning fails
      return obj;
    }
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert Redis-style pattern to regex
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\\\*/g, '.*') // Convert * to .*
      .replace(/\\\?/g, '.'); // Convert ? to .
    
    return new RegExp(`^${escaped}$`);
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

  private getLastCleanupTime(): Date | undefined {
    // This would be tracked in a real implementation
    return undefined;
  }
}