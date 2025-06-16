import * as fs from 'fs/promises';
import path from 'path';
import { createClient, RedisClientType } from 'redis';
import { Document, Model, Schema, model } from 'mongoose';
import { EventEmitter } from './event-emitter';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/config-manager';
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
  private config = ConfigManager.getInstance();
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

      // Setup core system event listeners
      await this.setupCoreEventListeners();

      // Setup persistence if enabled
      const config = await this.config.get('events', this.defaultConfig);
      if (config.persistence.enabled) {
        await this.setupPersistence(config.persistence);
      }

      // Setup broadcasting if enabled
      if (config.broadcasting.enabled) {
        await this.setupBroadcasting(config.broadcasting);
      }

      this.initialized = true;
      this.logger.info('Event Manager initialized successfully');

      // Emit initialization event
      await this.emit(EventType.CMS_INITIALIZED, {
        component: 'EventManager',
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to initialize Event Manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown event manager
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      this.logger.info('Shutting down Event Manager...');

      // Emit shutdown event
      await this.emit(EventType.CMS_SHUTDOWN, {
        component: 'EventManager',
        timestamp: new Date(),
      });

      // Process remaining events
      await this.flush();

      // Close Redis connections
      if (this.redisClient) {
        await this.redisClient.quit();
        this.redisClient = null;
      }
      
      if (this.broadcastRedisClient) {
        await this.broadcastRedisClient.quit();
        this.broadcastRedisClient = null;
      }

      // Close WebSocket connections
      this.webSocketClients.clear();

      // Destroy emitter
      this.emitter.destroy();

      this.initialized = false;
      this.logger.info('Event Manager shutdown complete');
    } catch (error) {
      this.logger.error('Error during Event Manager shutdown:', error);
      throw error;
    }
  }

  /**
   * Add event listener
   */
  public on(
    eventType: string | EventType,
    callback: EventCallback,
    options?: EventListenerOptions,
    plugin?: string
  ): string {
    return this.emitter.on(eventType as string, callback, options, plugin);
  }

  /**
   * Add one-time event listener
   */
  public once(
    eventType: string | EventType,
    callback: EventCallback,
    options?: EventListenerOptions,
    plugin?: string
  ): string {
    return this.emitter.once(eventType as string, callback, options, plugin);
  }

  /**
   * Remove event listener
   */
  public off(eventType: string | EventType, listenerId: string): boolean {
    return this.emitter.off(eventType as string, listenerId);
  }

  /**
   * Remove all listeners for event type
   */
  public removeAllListeners(eventType?: string | EventType): void {
    this.emitter.removeAllListeners(eventType as string);
  }

  /**
   * Remove all listeners for a plugin
   */
  public removePluginListeners(plugin: string): number {
    return this.emitter.removePluginListeners(plugin);
  }

  /**
   * Emit event
   */
  public async emit(
    eventType: string | EventType,
    payload: EventPayload = {},
    metadata?: Partial<EventMetadata>
  ): Promise<void> {
    try {
      // Create event object
      let event: Event = {
        type: eventType as string,
        payload,
        metadata: {
          timestamp: new Date(),
          source: 'core',
          version: '1.0.0',
          correlationId: this.generateCorrelationId(),
          ...metadata,
        },
      };

      // Process through middleware
      for (const middleware of this.middleware) {
        const processedEvent = await middleware(event);
        if (!processedEvent) {
          // Event was filtered out by middleware
          return;
        }
        event = processedEvent;
      }

      // Emit through emitter
      await this.emitter.emit(event.type, event.payload, event.metadata);

      // Persist event if enabled
      await this.persistEvent(event);

      // Broadcast event if enabled
      await this.broadcastEvent(event);
    } catch (error) {
      this.logger.error(`Error emitting event ${eventType}:`, error);
      
      // Emit error event (prevent infinite loop by checking event type)
      if (eventType !== EventType.SYSTEM_ERROR) {
        await this.emitter.emit(EventType.SYSTEM_ERROR, {
          error: error instanceof Error ? error.message : 'Unknown error',
          originalEvent: eventType,
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Add middleware
   */
  public addMiddleware(middleware: (event: Event) => Promise<Event | null>): void {
    this.middleware.push(middleware);
    this.logger.debug('Event middleware added');
  }

  /**
   * Remove middleware
   */
  public removeMiddleware(middleware: (event: Event) => Promise<Event | null>): boolean {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      this.logger.debug('Event middleware removed');
      return true;
    }
    return false;
  }

  /**
   * Get event listeners
   */
  public getListeners(eventType: string | EventType): any[] {
    return this.emitter.getListeners(eventType as string);
  }

  /**
   * Get all event types
   */
  public getEventTypes(): string[] {
    return this.emitter.getEventTypes();
  }

  /**
   * Get listener count
   */
  public getListenerCount(eventType?: string | EventType): number {
    return this.emitter.getListenerCount(eventType as string);
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
  public getHistory(filter?: EventFilter, limit?: number): EventHistory[] {
    let history = this.emitter.getHistory(limit);

    if (filter) {
      history = history.filter(entry => {
        if (filter.types && !filter.types.includes(entry.event.type)) {
          return false;
        }
        if (filter.source && entry.event.metadata.source !== filter.source) {
          return false;
        }
        if (filter.dateFrom && entry.processedAt < filter.dateFrom) {
          return false;
        }
        if (filter.dateTo && entry.processedAt > filter.dateTo) {
          return false;
        }
        if (filter.hasErrors !== undefined && (entry.errors.length > 0) !== filter.hasErrors) {
          return false;
        }
        return true;
      });
    }

    return history;
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.emitter.clearHistory();
  }

  /**
   * Wait for event
   */
  public waitFor(
    eventType: string | EventType,
    timeout: number = 5000,
    condition?: (event: Event) => boolean
  ): Promise<Event> {
    return new Promise((resolve, reject) => {
      let listenerId: string;
      const timer = setTimeout(() => {
        this.off(eventType, listenerId);
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeout);

      listenerId = this.once(eventType, (event) => {
        if (!condition || condition(event)) {
          clearTimeout(timer);
          resolve(event);
        }
      });
    });
  }

  /**
   * Flush pending events
   */
  public async flush(): Promise<void> {
    // Wait for queue to empty
    while (this.emitter.getQueueSize() > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(config: EventManagerConfig['middleware']): void {
    if (!config.enabled) return;

    // Validation middleware
    if (config.validatePayload) {
      this.addMiddleware(async (event) => {
        // Basic payload validation
        if (typeof event.payload !== 'object' || event.payload === null) {
          this.logger.warn(`Invalid event payload for ${event.type}`);
          return null;
        }
        return event;
      });
    }

    // Sanitization middleware
    if (config.sanitizePayload) {
      this.addMiddleware(async (event) => {
        // Basic payload sanitization
        try {
          const sanitized = JSON.parse(JSON.stringify(event.payload));
          return { ...event, payload: sanitized };
        } catch {
          this.logger.warn(`Failed to sanitize payload for ${event.type}`);
          return event;
        }
      });
    }

    // Logging middleware
    if (config.logEvents) {
      this.addMiddleware(async (event) => {
        this.logger.debug(`Event: ${event.type}`, {
          correlationId: event.metadata.correlationId,
          source: event.metadata.source,
          payloadKeys: Object.keys(event.payload),
        });
        return event;
      });
    }
  }

  /**
   * Setup core event listeners
   */
  private async setupCoreEventListeners(): Promise<void> {
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
      const redisUrl = options.url || process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redisClient = createClient({
        url: redisUrl,
        ...options,
      });

      this.redisClient.on('error', (error) => {
        this.logger.error('Redis persistence error:', error);
      });

      this.redisClient.on('connect', () => {
        this.logger.debug('Redis persistence connected');
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
      const logDir = options.directory || './logs/events';
      this.fileLogPath = path.join(logDir, 'events.log');
      
      // Ensure log directory exists
      await fs.ensureDir(logDir);
      
      this.logger.debug(`File event persistence initialized: ${this.fileLogPath}`);
    } catch (error) {
      this.logger.error('Failed to setup file persistence:', error);
      throw error;
    }
  }

  /**
   * Setup event broadcasting
   */
  private async setupBroadcasting(config: EventManagerConfig['broadcasting']): Promise<void> {
    this.logger.info(`Setting up event broadcasting: ${config.adapter}`);

    try {
      switch (config.adapter) {
        case 'redis':
          await this.setupRedisBroadcasting(config);
          break;
        case 'websocket':
          await this.setupWebSocketBroadcasting(config);
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
  private async setupRedisBroadcasting(config: EventManagerConfig['broadcasting']): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.broadcastRedisClient = createClient({ url: redisUrl });

      this.broadcastRedisClient.on('error', (error) => {
        this.logger.error('Redis broadcasting error:', error);
      });

      this.broadcastRedisClient.on('connect', () => {
        this.logger.debug('Redis broadcasting connected');
      });

      await this.broadcastRedisClient.connect();
      
      this.logger.debug('Redis event broadcasting initialized');
    } catch (error) {
      this.logger.error('Failed to setup Redis broadcasting:', error);
      throw error;
    }
  }

  /**
   * Setup WebSocket broadcasting
   */
  private async setupWebSocketBroadcasting(config: EventManagerConfig['broadcasting']): Promise<void> {
    try {
      // WebSocket broadcasting setup would be handled by the main app
      // This just initializes the client set for tracking connections
      this.webSocketClients = new Set();
      
      this.logger.debug('WebSocket event broadcasting initialized');
    } catch (error) {
      this.logger.error('Failed to setup WebSocket broadcasting:', error);
      throw error;
    }
  }

  /**
   * Persist event
   */
  private async persistEvent(event: Event): Promise<void> {
    const config = await this.config.get('events', this.defaultConfig);
    if (!config.persistence.enabled) return;

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
      this.logger.error(`Failed to persist event ${event.type}:`, error);
      // Don't throw to avoid breaking event emission
    }
  }

  /**
   * Persist event to MongoDB
   */
  private async persistToMongodb(event: Event): Promise<void> {
    if (!this.eventLogModel) return;

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
   * Persist event to Redis
   */
  private async persistToRedis(event: Event): Promise<void> {
    if (!this.redisClient) return;

    try {
      const eventKey = `event:${event.type}:${event.metadata.correlationId}`;
      const eventData = JSON.stringify({
        ...event,
        persistedAt: new Date(),
      });

      // Store event with TTL (30 days)
      await this.redisClient.setEx(eventKey, 30 * 24 * 60 * 60, eventData);

      // Add to event type list for querying
      await this.redisClient.lPush(`events:${event.type}`, eventKey);
      await this.redisClient.lTrim(`events:${event.type}`, 0, 1000); // Keep last 1000 events
    } catch (error) {
      this.logger.error('Failed to persist event to Redis:', error);
    }
  }

  /**
   * Persist event to file
   */
  private async persistToFile(event: Event): Promise<void> {
    if (!this.fileLogPath) return;

    try {
      const logEntry = {
        ...event,
        persistedAt: new Date(),
      };

      await fs.appendFile(this.fileLogPath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      this.logger.error('Failed to persist event to file:', error);
    }
  }

  /**
   * Broadcast event
   */
  private async broadcastEvent(event: Event): Promise<void> {
    const config = await this.config.get('events', this.defaultConfig);
    if (!config.broadcasting.enabled) return;

    try {
      switch (config.broadcasting.adapter) {
        case 'redis':
          await this.broadcastToRedis(event, config.broadcasting.channels);
          break;
        case 'websocket':
          await this.broadcastToWebSocket(event);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to broadcast event ${event.type}:`, error);
      // Don't throw to avoid breaking event emission
    }
  }

  /**
   * Broadcast event to Redis
   */
  private async broadcastToRedis(event: Event, channels: string[]): Promise<void> {
    if (!this.broadcastRedisClient) return;

    try {
      const broadcastData = JSON.stringify({
        ...event,
        broadcastAt: new Date(),
      });

      // Publish to all configured channels
      for (const channel of channels) {
        await this.broadcastRedisClient.publish(channel, broadcastData);
      }

      // Also publish to event-specific channel
      await this.broadcastRedisClient.publish(`event:${event.type}`, broadcastData);
    } catch (error) {
      this.logger.error('Failed to broadcast event to Redis:', error);
    }
  }

  /**
   * Broadcast event to WebSocket
   */
  private async broadcastToWebSocket(event: Event): Promise<void> {
    if (this.webSocketClients.size === 0) return;

    try {
      const broadcastData = JSON.stringify({
        ...event,
        broadcastAt: new Date(),
      });

      // Send to all connected WebSocket clients
      const deadClients = new Set();
      
      for (const client of this.webSocketClients) {
        try {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(broadcastData);
          } else {
            deadClients.add(client);
          }
        } catch (error) {
          deadClients.add(client);
        }
      }

      // Clean up dead connections
      for (const deadClient of deadClients) {
        this.webSocketClients.delete(deadClient);
      }
    } catch (error) {
      this.logger.error('Failed to broadcast event to WebSocket:', error);
    }
  }

  /**
   * Add WebSocket client for broadcasting
   */
  public addWebSocketClient(client: any): void {
    this.webSocketClients.add(client);
    this.logger.debug('WebSocket client added for event broadcasting');
  }

  /**
   * Remove WebSocket client
   */
  public removeWebSocketClient(client: any): void {
    this.webSocketClients.delete(client);
    this.logger.debug('WebSocket client removed from event broadcasting');
  }

  /**
   * Get persisted events from storage
   */
  public async getPersistedEvents(filter?: {
    type?: string;
    source?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Event[]> {
    const config = await this.config.get('events', this.defaultConfig);
    if (!config.persistence.enabled) return [];

    try {
      switch (config.persistence.adapter) {
        case 'mongodb':
          return await this.getEventsFromMongodb(filter);
        case 'redis':
          return await this.getEventsFromRedis(filter);
        case 'file':
          return await this.getEventsFromFile(filter);
        default:
          return [];
      }
    } catch (error) {
      this.logger.error('Failed to get persisted events:', error);
      return [];
    }
  }

  /**
   * Get events from MongoDB
   */
  private async getEventsFromMongodb(filter: any = {}): Promise<Event[]> {
    if (!this.eventLogModel) return [];

    try {
      const query: any = {};
      
      if (filter.type) query.type = filter.type;
      if (filter.source) query['metadata.source'] = filter.source;
      if (filter.dateFrom || filter.dateTo) {
        query['metadata.timestamp'] = {};
        if (filter.dateFrom) query['metadata.timestamp'].$gte = filter.dateFrom;
        if (filter.dateTo) query['metadata.timestamp'].$lte = filter.dateTo;
      }

      const events = await this.eventLogModel
        .find(query)
        .sort({ 'metadata.timestamp': -1 })
        .limit(filter.limit || 100)
        .skip(filter.offset || 0);

      return events.map(event => ({
        type: event.type,
        payload: event.payload,
        metadata: event.metadata,
      }));
    } catch (error) {
      this.logger.error('Failed to get events from MongoDB:', error);
      return [];
    }
  }

  /**
   * Get events from Redis
   */
  private async getEventsFromRedis(filter: any = {}): Promise<Event[]> {
    if (!this.redisClient) return [];

    try {
      const events: Event[] = [];
      const eventType = filter.type || '*';
      const keys = await this.redisClient.keys(`event:${eventType}:*`);
      
      for (const key of keys.slice(0, filter.limit || 100)) {
        const eventData = await this.redisClient.get(key);
        if (eventData) {
          const event = JSON.parse(eventData);
          
          // Apply filters
          if (filter.source && event.metadata.source !== filter.source) continue;
          if (filter.dateFrom && new Date(event.metadata.timestamp) < filter.dateFrom) continue;
          if (filter.dateTo && new Date(event.metadata.timestamp) > filter.dateTo) continue;
          
          events.push(event);
        }
      }

      return events.sort((a, b) => 
        new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
      );
    } catch (error) {
      this.logger.error('Failed to get events from Redis:', error);
      return [];
    }
  }

  /**
   * Get events from file
   */
  private async getEventsFromFile(filter: any = {}): Promise<Event[]> {
    if (!this.fileLogPath) return [];

    try {
      const content = await fs.readFile(this.fileLogPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      const events: Event[] = [];

      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          
          // Apply filters
          if (filter.type && event.type !== filter.type) continue;
          if (filter.source && event.metadata.source !== filter.source) continue;
          if (filter.dateFrom && new Date(event.metadata.timestamp) < filter.dateFrom) continue;
          if (filter.dateTo && new Date(event.metadata.timestamp) > filter.dateTo) continue;
          
          events.push(event);
        } catch (parseError) {
          // Skip invalid JSON lines
          continue;
        }
      }

      return events
        .sort((a, b) => 
          new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
        )
        .slice(filter.offset || 0, (filter.offset || 0) + (filter.limit || 100));
    } catch (error) {
      this.logger.error('Failed to get events from file:', error);
      return [];
    }
  }

  /**
   * Generate correlation ID for event tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get emitter instance
   */
  public getEmitter(): EventEmitter {
    return this.emitter;
  }

  /**
   * Get event log model (for external usage)
   */
  public getEventLogModel(): Model<IEventLog> | null {
    return this.eventLogModel;
  }
}