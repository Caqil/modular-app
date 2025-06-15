import { EventEmitter as NodeEventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { DateUtils } from '../utils/date-utils';
import type {
  Event,
  EventListener,
  EventCallback,
  EventListenerOptions,
  EventStats,
  EventHistory,
  EventQueueItem,
  EventPayload,
  EventMetadata,
  EventEmitterConfig,
} from './event-types';

export class EventEmitter {
  private nodeEmitter = new NodeEventEmitter();
  private listeners = new Map<string, EventListener[]>();
  private history: EventHistory[] = [];
  private queue: EventQueueItem[] = [];
  private stats: EventStats = {
    totalEvents: 0,
    totalListeners: 0,
    eventsByType: {},
    listenersByType: {},
    averageProcessingTime: 0,
    errorCount: 0,
  };
  private logger = new Logger('EventEmitter');
  private isProcessingQueue = false;

  private readonly config: EventEmitterConfig = {
    maxListeners: 100,
    enableHistory: true,
    historySize: 1000,
    enableQueue: false,
    queueSize: 10000,
    defaultTimeout: 5000,
    enableMetrics: true,
  };

  constructor(config?: Partial<EventEmitterConfig>) {
    this.config = { ...this.config, ...config };
    this.nodeEmitter.setMaxListeners(this.config.maxListeners);
    
    // Start queue processing if enabled
    if (this.config.enableQueue) {
      this.startQueueProcessing();
    }
  }

  // Fix for the plugin property assignment in event-emitter.ts

/**
 * Add event listener
 */
public on(
  eventType: string,
  callback: EventCallback,
  options: EventListenerOptions = {},
  plugin?: string
): string {
  const listenerId = uuidv4();
  
  // Fix: Conditionally include plugin property only when defined
  const listener: EventListener = {
    id: listenerId,
    callback,
    options: {
      priority: 10,
      timeout: this.config.defaultTimeout,
      ...options,
    },
    addedAt: new Date(),
    // Only include plugin property if it's defined
    ...(plugin !== undefined && { plugin }),
  };

  // Alternative approach - explicitly handle undefined:
  // const listener: EventListener = {
  //   id: listenerId,
  //   callback,
  //   options: {
  //     priority: 10,
  //     timeout: this.config.defaultTimeout,
  //     ...options,
  //   },
  //   plugin: plugin, // This will be undefined if not provided
  //   addedAt: new Date(),
  // };

  // Add to listeners map
  if (!this.listeners.has(eventType)) {
    this.listeners.set(eventType, []);
  }

  const eventListeners = this.listeners.get(eventType)!;
  eventListeners.push(listener);

  // Sort by priority (lower numbers = higher priority)
  eventListeners.sort((a, b) => (a.options.priority || 10) - (b.options.priority || 10));

  // Add to Node.js EventEmitter for compatibility
  this.nodeEmitter.on(eventType, callback);

  // Update stats
  this.stats.totalListeners++;
  this.stats.listenersByType[eventType] = (this.stats.listenersByType[eventType] || 0) + 1;

  this.logger.debug(`Event listener added: ${eventType}`, {
    listenerId,
    plugin,
    priority: listener.options.priority,
  });

  return listenerId;
}

  /**
   * Add one-time event listener
   */
  public once(
    eventType: string,
    callback: EventCallback,
    options: EventListenerOptions = {},
    plugin?: string
  ): string {
    return this.on(eventType, callback, { ...options, once: true }, plugin);
  }

/**
   * Remove event listener
   */
  public off(eventType: string, listenerId: string): boolean {
    const eventListeners = this.listeners.get(eventType);
    if (!eventListeners) return false;

    const index = eventListeners.findIndex(listener => listener.id === listenerId);
    if (index === -1) return false;

    const listener = eventListeners[index];
    if (!listener) return false; // Additional safety check

    eventListeners.splice(index, 1);

    // Remove from Node.js EventEmitter
    this.nodeEmitter.off(eventType, listener.callback);

    // Update stats
    this.stats.totalListeners--;
    this.stats.listenersByType[eventType] = Math.max(
      (this.stats.listenersByType[eventType] || 1) - 1,
      0
    );

    this.logger.debug(`Event listener removed: ${eventType}`, {
      listenerId,
      plugin: listener.plugin,
    });

    return true;
  }

  /**
   * Remove all listeners for event type
   */
  public removeAllListeners(eventType?: string): void {
    if (eventType) {
      const eventListeners = this.listeners.get(eventType);
      if (eventListeners) {
        const count = eventListeners.length;
        this.listeners.delete(eventType);
        this.nodeEmitter.removeAllListeners(eventType);
        
        // Update stats
        this.stats.totalListeners -= count;
        delete this.stats.listenersByType[eventType];
      }
    } else {
      // Remove all listeners
      this.listeners.clear();
      this.nodeEmitter.removeAllListeners();
      
      // Reset stats
      this.stats.totalListeners = 0;
      this.stats.listenersByType = {};
    }

    this.logger.debug(`Event listeners removed: ${eventType || 'all'}`);
  }

  /**
   * Remove all listeners for a plugin
   */
  public removePluginListeners(plugin: string): number {
    let removedCount = 0;

    for (const [eventType, eventListeners] of this.listeners.entries()) {
      const before = eventListeners.length;
      
      // Filter out listeners from the plugin
      const filtered = eventListeners.filter(listener => {
        if (listener.plugin === plugin) {
          this.nodeEmitter.off(eventType, listener.callback);
          return false;
        }
        return true;
      });

      this.listeners.set(eventType, filtered);
      const removed = before - filtered.length;
      removedCount += removed;

      // Update stats
      this.stats.totalListeners -= removed;
      this.stats.listenersByType[eventType] = Math.max(
        (this.stats.listenersByType[eventType] || removed) - removed,
        0
      );
    }

    this.logger.info(`Removed ${removedCount} listeners for plugin: ${plugin}`);
    return removedCount;
  }

  /**
   * Emit event
   */
  public async emit(
    eventType: string,
    payload: EventPayload = {},
    metadata: Partial<EventMetadata> = {}
  ): Promise<void> {
    const startTime = Date.now();

    // Create event object
    const event: Event = {
      type: eventType,
      payload,
      metadata: {
        timestamp: new Date(),
        source: 'core',
        version: '1.0.0',
        correlationId: uuidv4(),
        ...metadata,
      },
    };

    this.logger.debug(`Emitting event: ${eventType}`, {
      correlationId: event.metadata.correlationId,
      payloadKeys: Object.keys(payload),
    });

    // Update stats
    this.stats.totalEvents++;
    this.stats.eventsByType[eventType] = (this.stats.eventsByType[eventType] || 0) + 1;

    // Queue event if queueing is enabled
    if (this.config.enableQueue) {
      this.queueEvent(event);
      return;
    }

    // Process event immediately
    await this.processEvent(event, startTime);
  }

  /**
   * Queue event for later processing
   */
  private queueEvent(event: Event, priority: number = 5): void {
    if (this.queue.length >= this.config.queueSize) {
      this.logger.warn('Event queue is full, dropping oldest event');
      this.queue.shift();
    }

    const queueItem: EventQueueItem = {
      event,
      priority,
      scheduledAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
    };

    this.queue.push(queueItem);
    
    // Sort queue by priority
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Process event
   */
  private async processEvent(event: Event, startTime: number): Promise<void> {
    const eventListeners = this.listeners.get(event.type);
    if (!eventListeners || eventListeners.length === 0) {
      return;
    }

    const historyEntry: EventHistory = {
      event,
      processedAt: new Date(),
      listenerCount: eventListeners.length,
      processingTime: 0,
      errors: [],
    };

    const listenersToRemove: string[] = [];

    // Process each listener
    for (const listener of eventListeners) {
      try {
        // Check condition if provided
        if (listener.options.condition && !listener.options.condition(event)) {
          continue;
        }

        // Execute listener with timeout
        if (listener.options.timeout) {
          await this.executeWithTimeout(listener.callback, event, listener.options.timeout);
        } else {
          await listener.callback(event);
        }

        // Mark for removal if it's a one-time listener
        if (listener.options.once) {
          listenersToRemove.push(listener.id);
        }
      } catch (error) {
        this.stats.errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        historyEntry.errors.push({
          listenerId: listener.id,
          error: errorMsg,
          timestamp: new Date(),
        });

        this.logger.error(`Event listener error for ${event.type}:`, error,);

        // Call custom error handler if provided
        if (listener.options.errorHandler) {
          try {
            listener.options.errorHandler(error as Error, event);
          } catch (handlerError) {
            this.logger.error('Error in event listener error handler:', handlerError);
          }
        }
      }
    }

    // Remove one-time listeners
    for (const listenerId of listenersToRemove) {
      this.off(event.type, listenerId);
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;
    historyEntry.processingTime = processingTime;

    // Update average processing time
    this.updateAverageProcessingTime(processingTime);

    // Add to history if enabled
    if (this.config.enableHistory) {
      this.addToHistory(historyEntry);
    }

    // Emit to Node.js EventEmitter for compatibility
    this.nodeEmitter.emit(event.type, event);

    this.logger.debug(`Event processed: ${event.type}`, {
      processingTime,
      listenerCount: eventListeners.length,
      errors: historyEntry.errors.length,
      correlationId: event.metadata.correlationId,
    });
  }

  /**
   * Execute callback with timeout
   */
  private async executeWithTimeout(
    callback: EventCallback,
    event: Event,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event listener timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve(callback(event))
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;
    
    const processQueue = async () => {
      while (this.queue.length > 0) {
        const item = this.queue.shift()!;
        
        try {
          const startTime = Date.now();
          await this.processEvent(item.event, startTime);
        } catch (error) {
          item.attempts++;
          
          if (item.attempts < item.maxAttempts) {
            // Re-queue with lower priority
            this.queueEvent(item.event, item.priority + 1);
          } else {
            this.logger.error('Max attempts reached for queued event:', error);
          }
        }
      }
      
      // Schedule next processing cycle
      setTimeout(processQueue, 100);
    };

    processQueue();
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(processingTime: number): void {
    const count = this.stats.totalEvents;
    const currentAvg = this.stats.averageProcessingTime;
    this.stats.averageProcessingTime = ((currentAvg * (count - 1)) + processingTime) / count;
  }

  /**
   * Add to history
   */
  private addToHistory(entry: EventHistory): void {
    this.history.push(entry);
    
    // Maintain history size limit
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }
  }

  /**
   * Get event listeners for type
   */
  public getListeners(eventType: string): EventListener[] {
    return this.listeners.get(eventType) || [];
  }

  /**
   * Get all event types
   */
  public getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get listener count for event type
   */
  public getListenerCount(eventType?: string): number {
    if (eventType) {
      return this.listeners.get(eventType)?.length || 0;
    }
    return this.stats.totalListeners;
  }

  /**
   * Get event statistics
   */
  public getStats(): EventStats {
    return { ...this.stats };
  }

  /**
   * Get event history
   */
  public getHistory(limit?: number): EventHistory[] {
    const history = [...this.history];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.history = [];
    this.logger.debug('Event history cleared');
  }

  /**
   * Get queue size
   */
  public getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear event queue
   */
  public clearQueue(): void {
    this.queue = [];
    this.logger.debug('Event queue cleared');
  }

  /**
   * Enable/disable queue processing
   */
  public setQueueEnabled(enabled: boolean): void {
    this.config.enableQueue = enabled;
    
    if (enabled && !this.isProcessingQueue) {
      this.startQueueProcessing();
    }
  }

  /**
   * Get configuration
   */
  public getConfig(): EventEmitterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<EventEmitterConfig>): void {
    Object.assign(this.config, config);
    this.nodeEmitter.setMaxListeners(this.config.maxListeners);
  }

  /**
   * Destroy event emitter
   */
  public destroy(): void {
    this.removeAllListeners();
    this.clearHistory();
    this.clearQueue();
    this.isProcessingQueue = false;
    this.logger.info('Event emitter destroyed');
  }
}
