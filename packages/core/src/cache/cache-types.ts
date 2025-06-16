// ===================================================================
// CACHE TYPES - TYPE DEFINITIONS FOR CACHING SYSTEM
// ===================================================================

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl?: number;
  createdAt: Date;
  expiresAt?: Date;
  accessCount: number;
  lastAccessed: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CacheAdapter {
  name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  deletePattern(pattern: string): Promise<number>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  size(): Promise<number>;
  info(): Promise<CacheInfo>;
}

export interface CacheConfig {
  enabled: boolean;
  adapter: 'memory' | 'redis' | 'file';
  keyPrefix?: string;
  defaultTTL: number;
  maxSize?: number;
  redis?: RedisCacheConfig;
  memory?: MemoryCacheConfig;
  file?: FileCacheConfig;
}

export interface RedisCacheConfig {
  url: string;
  password?: string;
  db: number;
  keyPrefix: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  connectTimeout: number;
  lazyConnect: boolean;
  maxMemoryPolicy?: 'allkeys-lru' | 'volatile-lru' | 'allkeys-lfu' | 'volatile-lfu';
}

export interface MemoryCacheConfig {
  maxSize: number; // in MB
  ttl: number; // default TTL in seconds
  checkPeriod: number; // cleanup interval in seconds
  useClones: boolean; // clone objects to prevent mutation
  maxKeys: number; // maximum number of keys
}

export interface FileCacheConfig {
  directory: string;
  maxSize: number; // in MB
  ttl: number; // default TTL in seconds
  cleanupInterval: number; // cleanup interval in seconds
  compression: boolean;
  encoding: 'utf8' | 'binary';
}

export interface CacheInfo {
  name: string;
  type: string;
  connected: boolean;
  size: number;
  keys: number;
  maxSize?: number;
  memoryUsage?: number;
  hitRate?: number;
  missRate?: number;
  evictions?: number;
  uptime?: number;
  lastCleanup?: Date;
  errors?: CacheError[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  errors: number;
  startTime: Date;
  lastReset?: Date;
  hitRate: number;
  missRate: number;
  operationsPerSecond: number;
  avgResponseTime: number;
}

export interface CacheError {
  code: string;
  message: string;
  timestamp: Date;
  operation: string;
  key?: string;
  details?: Record<string, any>;
}

export interface CacheOperation {
  type: 'get' | 'set' | 'delete' | 'clear' | 'expire';
  key?: string;
  value?: any;
  ttl?: number;
  timestamp: Date;
  duration: number;
  success: boolean;
  error?: string;
}

export interface CacheNamespace {
  prefix: string;
  ttl?: number;
  tags?: string[];
  description?: string;
}

export interface CacheTagOptions {
  tags: string[];
  cascade?: boolean;
}

export interface CacheSetOptions {
  ttl?: number;
  tags?: string[];
  replace?: boolean;
  metadata?: Record<string, any>;
}

export interface CacheGetOptions {
  updateAccessTime?: boolean;
  returnMetadata?: boolean;
}

export interface CacheQueryOptions {
  pattern?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'key' | 'createdAt' | 'lastAccessed' | 'accessCount';
  sortOrder?: 'asc' | 'desc';
}

export interface CacheResult<T = any> {
  success: boolean;
  data?: T;
  metadata?: {
    cached: boolean;
    key: string;
    ttl?: number;
    createdAt?: Date;
    lastAccessed?: Date;
    accessCount?: number;
    tags?: string[];
  };
  error?: string;
}

export interface CacheBulkOperation<T = any> {
  operation: 'get' | 'set' | 'delete';
  entries: Array<{
    key: string;
    value?: T;
    ttl?: number;
  }>;
}

export interface CacheBulkResult<T = any> {
 successful: { key: string; value: Awaited<T> | null }[];
  failed: Array<{
    key: string;
    error: string;
  }>;
  stats: {
    total: number;
    successful: number;
    failed: number;
  };
}

export enum CacheEventType {
  HIT = 'cache:hit',
  MISS = 'cache:miss',
  SET = 'cache:set',
  DELETE = 'cache:delete',
  CLEAR = 'cache:clear',
  EXPIRE = 'cache:expire',
  EVICT = 'cache:evict',
  ERROR = 'cache:error',
  CONNECT = 'cache:connect',
  DISCONNECT = 'cache:disconnect',
}

export interface CacheEvent {
  type: CacheEventType;
  key?: string;
  adapter: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CacheMiddleware {
  name: string;
  beforeGet?: (key: string) => Promise<string>;
  afterGet?: <T>(key: string, value: T | null) => Promise<T | null>;
  beforeSet?: <T>(key: string, value: T, ttl?: number) => Promise<{ key: string; value: T; ttl?: number }>;
  afterSet?: (key: string, success: boolean) => Promise<void>;
  beforeDelete?: (key: string) => Promise<string>;
  afterDelete?: (key: string, success: boolean) => Promise<void>;
}

export interface CacheMetrics {
  totalOperations: number;
  hitRate: number;
  missRate: number;
  errorRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  keyCount: number;
  lastFlush?: Date;
  uptime: number;
}

export interface CacheHealthCheck {
  healthy: boolean;
  connected: boolean;
  responsive: boolean;
  errors: CacheError[];
  lastCheck: Date;
  responseTime: number;
  details: Record<string, any>;
}