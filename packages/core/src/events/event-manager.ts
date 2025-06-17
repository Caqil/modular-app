import path from 'path';
import { createClient, RedisClientType } from 'redis';
import { Document, Model, Schema, model } from 'mongoose';
import { EventEmitter } from './event-emitter';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/config-manager';
import fs from 'fs-extra';
import {
  Event,
  EventCallback,
  EventListenerOptions,
  EventPayload,
  EventMetadata,
  EventStats,
  EventHistory,
  EventFilter,
  EventEmitterConfig,
  EventType,
} from './event-types';

export interface EventManagerConfig {
  emitter: EventEmitterConfig;
  persistence: {
    enabled: boolean;
    adapter: 'mongodb' | 'redis' | 'file';
    options: Record<string, any>;
  };
  broadcasting: {
    enabled: boolean;
    channels: string[];
    adapter: 'redis' | 'websocket';
  };
  middleware: {
    enabled: boolean;
    validatePayload: boolean;
    sanitizePayload: boolean;
    logEvents: boolean;
  };
}

// Event Log Schema for MongoDB persistence
interface IEventLog extends Document {
  type: string;
  payload: Record<string, any>;
  metadata: {
    timestamp: Date;
    source: string;
    version: string;
    correlationId?: string;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  processed: boolean;
  processingErrors: string[];
  createdAt: Date;
}

const EventLogSchema = new Schema<IEventLog>({
  type: {
    type: String,
    required: true,
    index: true,
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true,
  },
  metadata: {
    timestamp: { type: Date, required: true, index: true },
    source: { type: String, required: true, index: true },
    version: { type: String, required: true },
    correlationId: { type: String, index: true },
    userId: { type: String, index: true },
    sessionId: { type: String, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  processed: {
    type: Boolean,
    default: false,
    index: true,
  },
  processingErrors: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
});

// TTL index for automatic cleanup (30 days)
EventLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Text index for searching
EventLogSchema.index({
  type: 'text',
  'payload': 'text',
  'metadata.source': 'text',
});

export class EventManager {
  private static instance: EventManager;
  private emitter: EventEmitter;
  private logger = new Logger('EventManager');
  private config: ConfigManager | null = null; // CHANGED: Defer initialization
  private initialized = false;
  private middleware: Array<(event: Event) => Promise<Event | null>> = [];
  
  // Persistence adapters
  private redisClient: RedisClientType | null = null;
  private eventLogModel: Model<IEventLog> | null = null;
  private fileLogPath: string | null = null;
  
  // Broadcasting adapters  
  private broadcastRedisClient: RedisClientType | null = null;
  private webSocketClients: Set<any> = new Set();

  private readonly defaultConfig: EventManagerConfig = {
    emitter: {
      maxListeners: 1000,
      enableHistory: true,
      historySize: 5000,
      enableQueue: true,
      queueSize: 50000,
      defaultTimeout: 10000,
      enableMetrics: true,
    },
    persistence: {
      enabled: false,
      adapter: 'mongodb',
      options: {},
    },
    broadcasting: {
      enabled: false,
      channels: ['events'],
      adapter: 'redis',
    },
    middleware: {
      enabled: true,
      validatePayload: true,
      sanitizePayload: true,
      logEvents: true,
    },
  };

  private constructor() {
    // Use defaultConfig synchronously for constructor, async config loading in initialize()
    const config = this.defaultConfig;
    this.emitter = new EventEmitter(config.emitter);
    this.setupMiddleware(config.middleware);
  }

  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * Initialize event manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Event manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Event Manager...');

      // CHANGED: Initialize ConfigManager here instead of in class declaration
      this.config = ConfigManager.getInstance();

      // Setup core system event listeners
      await this.setupCoreEventListeners();

      // Setup persistence if enabled
      const config = await this.getConfig();
      if (config.persistence.enabled) {
        await this.setupPersistence(config.persistence);
      }

      // Setup broadcasting if enabled
      if (config.broadcasting.enabled) {
        await this.setupBroadcasting(config.broadcasting);
      }

      this.initialized = true;
      this.logger.info('Event Manager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Event Manager:', error);
      throw error;
    }
  }

  /**
   * Get configuration with fallback to default
   */
  private async getConfig(): Promise<EventManagerConfig> {
    if (!this.config) {
      return this.defaultConfig;
    }
    return await this.config.get('events', this.defaultConfig);
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(config: EventManagerConfig['middleware']): void {
    if (!config.enabled) {
      return;
    }

    // Validation middleware
    if (config.validatePayload) {
      this.middleware.push(async (event: Event) => {
        if (!event.type || !event.payload) {
          throw new Error('Invalid event: missing type or payload');
        }
        return event;
      });
    }

    // Sanitization middleware
    if (config.sanitizePayload) {
      this.middleware.push(async (event: Event) => {
        // Add sanitization logic here if needed
        return event;
      });
    }

    // Logging middleware
    if (config.logEvents) {
      this.middleware.push(async (event: Event) => {
        this.logger.debug(`Event emitted: ${event.type}`, {
          payload: event.payload,
          metadata: event.metadata,
        });
        return event;
      });
    }
  }

  /**
   * Setup core system event listeners
   */
  private async setupCoreEventListeners(): Promise<void> {
    this.logger.debug('Setting up core event listeners...');

    // System error listener
    this.on(EventType.SYSTEM_ERROR, async (event) => {
      this.logger.error('System error event:', event.payload);
    }, { priority: 1 });

    // Plugin error listener
    this.on(EventType.PLUGIN_ERROR, async (event) => {
      this.logger.error('Plugin error event:', event.payload);
    }, { priority: 1 });

    // User login listener (for security logging)
    this.on(EventType.USER_LOGIN, async (event) => {
      this.logger.info('User login:', {
        userId: event.payload.userId,
        ipAddress: event.metadata.ipAddress,
        userAgent: event.metadata.userAgent,
      });
    }, { priority: 1 });

    // Content creation listener
    this.on(EventType.CONTENT_CREATED, async (event) => {
      this.logger.info('Content created:', {
        contentId: event.payload.id,
        type: event.payload.type,
        author: event.payload.author,
      });
    }, { priority: 1 });
  }

  /**
   * Setup event persistence
   */
  private async setupPersistence(config: EventManagerConfig['persistence']): Promise<void> {
    this.logger.info(`Setting up event persistence: ${config.adapter}`);

    try {
      switch (config.adapter) {
        case 'mongodb':
          await this.setupMongodbPersistence(config.options);
          break;
        case 'redis':
          await this.setupRedisPersistence(config.options);
          break;
        case 'file':
          await this.setupFilePersistence(config.options);
          break;
        default:
          throw new Error(`Unsupported persistence adapter: ${config.adapter}`);
      }

      this.logger.info(`Event persistence configured successfully: ${config.adapter}`);
    } catch (error) {
      this.logger.error(`Failed to setup event persistence (${config.adapter}):`, error);
      throw error;
    }
  }

  /**
   * Setup MongoDB persistence
   */
  private async setupMongodbPersistence(options: Record<string, any>): Promise<void> {
    try {
      // Create or get the EventLog model
      this.eventLogModel = model<IEventLog>('EventLog', EventLogSchema);
      
      // Ensure indexes are created
      await this.eventLogModel.createIndexes();
      
      this.logger.debug('MongoDB event persistence initialized');
    } catch (error) {
      this.logger.error('Failed to setup MongoDB persistence:', error);
      throw error;
    }
  }

  /**
   * Setup Redis persistence
   */
  private async setupRedisPersistence(options: Record<string, any>): Promise<void> {
    try {
      this.redisClient = createClient({
        url: options.url || process.env.REDIS_URL || 'redis://localhost:6379',
        ...options,
      });

      await this.redisClient.connect();
      
      this.logger.debug('Redis event persistence initialized');
    } catch (error) {
      this.logger.error('Failed to setup Redis persistence:', error);
      throw error;
    }
  }

  /**
   * Setup file persistence
   */
  private async setupFilePersistence(options: Record<string, any>): Promise<void> {
    try {
      this.fileLogPath = options.path || path.join(process.cwd(), 'logs', 'events.log');
      
      // Ensure directory exists
      if (this.fileLogPath) {
        await fs.ensureDir(path.dirname(this.fileLogPath));
      }
      
      this.logger.debug(`File event persistence initialized: ${this.fileLogPath}`);
    } catch (error) {
      this.logger.error('Failed to setup file persistence:', error);
      throw error;
    }
  }

  /**
   * Setup broadcasting
   */
  private async setupBroadcasting(config: EventManagerConfig['broadcasting']): Promise<void> {
    this.logger.info(`Setting up event broadcasting: ${config.adapter}`);

    try {
      switch (config.adapter) {
        case 'redis':
          await this.setupRedisBroadcasting(config.channels);
          break;
        case 'websocket':
          await this.setupWebSocketBroadcasting(config.channels);
          break;
        default:
          throw new Error(`Unsupported broadcasting adapter: ${config.adapter}`);
      }

      this.logger.info(`Event broadcasting configured successfully: ${config.adapter}`);
    } catch (error) {
      this.logger.error(`Failed to setup event broadcasting (${config.adapter}):`, error);
      throw error;
    }
  }

  /**
   * Setup Redis broadcasting
   */
  private async setupRedisBroadcasting(channels: string[]): Promise<void> {
    try {
      this.broadcastRedisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      await this.broadcastRedisClient.connect();
      
      this.logger.debug(`Redis broadcasting initialized for channels: ${channels.join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to setup Redis broadcasting:', error);
      throw error;
    }
  }

  /**
   * Setup WebSocket broadcasting
   */
  private async setupWebSocketBroadcasting(channels: string[]): Promise<void> {
    // WebSocket broadcasting setup would go here
    this.logger.debug(`WebSocket broadcasting initialized for channels: ${channels.join(', ')}`);
  }

  // ===================================================================
  // EVENT OPERATIONS
  // ===================================================================

  /**
   * Emit an event
   */
  public async emit(type: string, payload?: EventPayload, metadata?: Partial<EventMetadata>): Promise<void> {
    const event: Event = {
      type,
      payload: payload || {},
      metadata: {
        timestamp: new Date(),
        source: 'system',
        version: '1.0.0',
        ...metadata,
      },
    };

    // Apply middleware
    let processedEvent: Event | null = event;
    for (const middleware of this.middleware) {
      processedEvent = await middleware(processedEvent);
      if (!processedEvent) {
        return; // Event was filtered out
      }
    }

    // Emit through EventEmitter
    await this.emitter.emit(type, processedEvent);

    // Persist event if enabled
    await this.persistEvent(processedEvent);

    // Broadcast event if enabled
    await this.broadcastEvent(processedEvent);
  }

  /**
   * Listen to an event
   */
  public on(type: string, callback: EventCallback, options?: EventListenerOptions): void {
    this.emitter.on(type, callback, options);
  }

  /**
   * Listen to an event once
   */
  public once(type: string, callback: EventCallback, options?: EventListenerOptions): void {
    this.emitter.once(type, callback, options);
  }

  /**
   * Remove event listener
   * @param type Event type
   * @param listenerId The ID of the listener to remove
   */
  public off(type: string, listenerId: string): void {
    this.emitter.off(type, listenerId);
  }

  /**
   * Remove all listeners for an event type
   */
  public removeAllListeners(type?: string): void {
    this.emitter.removeAllListeners(type);
  }

  /**
   * Get event statistics
   */
  public getStats(): EventStats {
    return this.emitter.getStats();
  }

  /**
   * Get event history
   */
  public getHistory(limit?: number): EventHistory[] {
    return this.emitter.getHistory(limit);
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.emitter.clearHistory();
  }

  // ===================================================================
  // PERSISTENCE OPERATIONS
  // ===================================================================

  /**
   * Persist event
   */
  private async persistEvent(event: Event): Promise<void> {
    if (!this.config) {
      return;
    }

    const config = await this.getConfig();
    if (!config.persistence.enabled) {
      return;
    }

    try {
      switch (config.persistence.adapter) {
        case 'mongodb':
          await this.persistToMongodb(event);
          break;
        case 'redis':
          await this.persistToRedis(event);
          break;
        case 'file':
          await this.persistToFile(event);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to persist event:', error);
    }
  }

  /**
   * Persist to MongoDB
   */
  private async persistToMongodb(event: Event): Promise<void> {
    if (!this.eventLogModel) {
      return;
    }

    try {
      await this.eventLogModel.create({
        type: event.type,
        payload: event.payload,
        metadata: event.metadata,
        processed: false,
        processingErrors: [],
      });
    } catch (error) {
      this.logger.error('Failed to persist event to MongoDB:', error);
    }
  }

  /**
   * Persist to Redis
   */
  private async persistToRedis(event: Event): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    try {
      const key = `events:${event.type}:${Date.now()}`;
      await this.redisClient.set(key, JSON.stringify(event), { EX: 86400 }); // 24 hours TTL
    } catch (error) {
      this.logger.error('Failed to persist event to Redis:', error);
    }
  }

  /**
   * Persist to file
   */
  private async persistToFile(event: Event): Promise<void> {
    if (!this.fileLogPath) {
      return;
    }

    try {
      const logEntry = `${JSON.stringify(event)}\n`;
      await fs.appendFile(this.fileLogPath, logEntry);
    } catch (error) {
      this.logger.error('Failed to persist event to file:', error);
    }
  }

  // ===================================================================
  // BROADCASTING OPERATIONS
  // ===================================================================

  /**
   * Broadcast event
   */
  private async broadcastEvent(event: Event): Promise<void> {
    if (!this.config) {
      return;
    }

    const config = await this.getConfig();
    if (!config.broadcasting.enabled) {
      return;
    }

    try {
      switch (config.broadcasting.adapter) {
        case 'redis':
          await this.broadcastToRedis(event, config.broadcasting.channels);
          break;
        case 'websocket':
          await this.broadcastToWebSocket(event, config.broadcasting.channels);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to broadcast event:', error);
    }
  }

  /**
   * Broadcast to Redis
   */
  private async broadcastToRedis(event: Event, channels: string[]): Promise<void> {
    if (!this.broadcastRedisClient) {
      return;
    }

    try {
      for (const channel of channels) {
        await this.broadcastRedisClient.publish(channel, JSON.stringify(event));
      }
    } catch (error) {
      this.logger.error('Failed to broadcast event to Redis:', error);
    }
  }

  /**
   * Broadcast to WebSocket
   */
  private async broadcastToWebSocket(event: Event, channels: string[]): Promise<void> {
    try {
      const message = JSON.stringify({ channels, event });
      
      for (const client of this.webSocketClients) {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      }
    } catch (error) {
      this.logger.error('Failed to broadcast event to WebSocket:', error);
    }
  }

  // ===================================================================
  // LIFECYCLE MANAGEMENT
  // ===================================================================

  /**
   * Shutdown event manager
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Event Manager...');

    try {
      // Close Redis connections
      if (this.redisClient) {
        await this.redisClient.disconnect();
      }
      
      if (this.broadcastRedisClient) {
        await this.broadcastRedisClient.disconnect();
      }

      // Close WebSocket connections
      for (const client of this.webSocketClients) {
        client.close();
      }
      this.webSocketClients.clear();

      // Clear all listeners
      this.emitter.removeAllListeners();

      this.initialized = false;
      this.logger.info('Event Manager shutdown complete');

    } catch (error) {
      this.logger.error('Error during Event Manager shutdown:', error);
      throw error;
    }
  }

  /**
   * Add WebSocket client for broadcasting
   */
  public addWebSocketClient(client: any): void {
    this.webSocketClients.add(client);
    
    client.on('close', () => {
      this.webSocketClients.delete(client);
    });
  }

  /**
   * Get initialization status
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}