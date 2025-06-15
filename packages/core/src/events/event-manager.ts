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

export class EventManager {
  private static instance: EventManager;
  private emitter: EventEmitter;
  private logger = new Logger('EventManager');
  private config = ConfigManager.getInstance();
  private initialized = false;
  private middleware: Array<(event: Event) => Promise<Event | null>> = [];

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
    const config = this.config.get('events', this.defaultConfig);
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
      const config = this.config.get('events', this.defaultConfig);
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
      
      // Emit error event
      await this.emitter.emit(EventType.SYSTEM_ERROR, {
        error: error instanceof Error ? error.message : 'Unknown error',
        originalEvent: eventType,
        timestamp: new Date(),
      });
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
    // TODO: Implement event persistence based on adapter
    this.logger.info(`Event persistence configured: ${config.adapter}`);
  }

  /**
   * Setup event broadcasting
   */
  private async setupBroadcasting(config: EventManagerConfig['broadcasting']): Promise<void> {
    // TODO: Implement event broadcasting based on adapter
    this.logger.info(`Event broadcasting configured: ${config.adapter}`);
  }

  /**
   * Persist event
   */
  private async persistEvent(event: Event): Promise<void> {
    const config = this.config.get('events', this.defaultConfig);
    if (!config.persistence.enabled) return;

    // TODO: Implement event persistence
  }

  /**
   * Broadcast event
   */
  private async broadcastEvent(event: Event): Promise<void> {
    const config = this.config.get('events', this.defaultConfig);
    if (!config.broadcasting.enabled) return;

    // TODO: Implement event broadcasting
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
}

