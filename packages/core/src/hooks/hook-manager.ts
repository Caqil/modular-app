import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { ActionHooks } from './action-hooks';
import { FilterHooks } from './filter-hooks';
import {
  HookCallback,
  FilterCallback,
  HookStats,
  HookExecution,
  ActionHookDefinition,
  FilterHookDefinition,
  HookManagerConfig,
  HookRegistrationOptions,
  FilterRegistrationOptions,
  CoreHooks,
  CoreFilters,
} from './hook-types';

export class HookManager {
  private static instance: HookManager;
  private actionHooks = new ActionHooks();
  private filterHooks = new FilterHooks();
  private logger = new Logger('HookManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private initialized = false;

  private readonly defaultConfig: HookManagerConfig = {
    enableMetrics: true,
    enableHistory: true,
    historySize: 10000,
    defaultTimeout: 5000,
    maxHooksPerType: 1000,
    enableDebugging: false,
    enableProfiling: false,
  };

  private constructor() {}

  public static getInstance(): HookManager {
    if (!HookManager.instance) {
      HookManager.instance = new HookManager();
    }
    return HookManager.instance;
  }

  /**
   * Initialize hook manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Hook manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Hook Manager...');

      // Register core hook definitions
      await this.registerCoreDefinitions();

      // Setup monitoring if enabled
      const config = this.config.get('hooks', this.defaultConfig);
      if ((await config).enableMetrics) {
        await this.setupMetrics();
      }

      this.initialized = true;
      this.logger.info('Hook Manager initialized successfully');

      // Emit initialization hook
      await this.doAction(CoreHooks.SYSTEM_INIT, {
        component: 'HookManager',
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to initialize Hook Manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown hook manager
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      this.logger.info('Shutting down Hook Manager...');

      // Emit shutdown hook
      await this.doAction(CoreHooks.SYSTEM_SHUTDOWN, {
        component: 'HookManager',
        timestamp: new Date(),
      });

      // Clear all hooks
      this.actionHooks.clear();
      this.filterHooks.clear();

      this.initialized = false;
      this.logger.info('Hook Manager shutdown complete');
    } catch (error) {
      this.logger.error('Error during Hook Manager shutdown:', error);
      throw error;
    }
  }

  /**
   * Add action hook
   */
  public async addAction(
    hookName: string | CoreHooks,
    callback: HookCallback,
    priority: number = 10,
    plugin: string = 'core',
    options?: Omit<HookRegistrationOptions, 'priority'>
  ): Promise<string> {
    const config = await this.config.get('hooks', this.defaultConfig);
    
    return this.actionHooks.addAction(
      hookName as string,
      callback,
      plugin,
      {
        priority,
        timeout: config.defaultTimeout,
        ...options,
      }
    );
  }

  /**
   * Remove action hook
   */
  public removeAction(hookName: string | CoreHooks, hookId: string): boolean {
    return this.actionHooks.removeAction(hookName as string, hookId);
  }

  /**
   * Execute action hooks
   */
  public async doAction(hookName: string | CoreHooks, ...args: any[]): Promise<void> {
    const config = this.config.get('hooks', this.defaultConfig);
    
    if ((await config).enableDebugging) {
      this.logger.debug(`Executing action: ${hookName}`, { args: args.length });
    }

    await this.actionHooks.doAction(hookName as string, ...args);
  }

  /**
   * Add filter hook
   */
  public async addFilter(
    filterName: string | CoreFilters,
    callback: FilterCallback,
    priority: number = 10,
    plugin: string = 'core',
    options?: Omit<FilterRegistrationOptions, 'priority'>
  ): Promise<string> {
    const config = await this.config.get('hooks', this.defaultConfig);
    
    return this.filterHooks.addFilter(
      filterName as string,
      callback,
      plugin,
      {
        priority,
        timeout: config.defaultTimeout,
        ...options,
      }
    );
  }

  /**
   * Remove filter hook
   */
  public removeFilter(filterName: string | CoreFilters, filterId: string): boolean {
    return this.filterHooks.removeFilter(filterName as string, filterId);
  }

  /**
   * Apply filter hooks
   */
  public async applyFilters(
    filterName: string | CoreFilters,
    value: any,
    ...args: any[]
  ): Promise<any> {
    const config = this.config.get('hooks', this.defaultConfig);
    
    if ((await config).enableDebugging) {
      this.logger.debug(`Applying filters: ${filterName}`, { 
        originalType: typeof value,
        args: args.length,
      });
    }

    return this.filterHooks.applyFilters(filterName as string, value, ...args);
  }

  /**
   * Remove all hooks for a plugin
   */
  public removePluginHooks(plugin: string): { actions: number; filters: number } {
    const actionsRemoved = this.actionHooks.removePluginActions(plugin);
    const filtersRemoved = this.filterHooks.removePluginFilters(plugin);

    this.logger.info(`Removed hooks for plugin ${plugin}:`, {
      actions: actionsRemoved,
      filters: filtersRemoved,
    });

    return {
      actions: actionsRemoved,
      filters: filtersRemoved,
    };
  }

  /**
   * Check if action hook exists
   */
  public hasAction(hookName: string | CoreHooks): boolean {
    return this.actionHooks.hasAction(hookName as string);
  }

  /**
   * Check if filter hook exists
   */
  public hasFilter(filterName: string | CoreFilters): boolean {
    return this.filterHooks.hasFilter(filterName as string);
  }

  /**
   * Get action hook count
   */
  public getActionCount(hookName?: string | CoreHooks): number {
    if (hookName) {
      return this.actionHooks.getActionCount(hookName as string);
    }
    return this.actionHooks.getStats().totalHooks || 0;
  }

  /**
   * Get filter hook count
   */
  public getFilterCount(filterName?: string | CoreFilters): number {
    if (filterName) {
      return this.filterHooks.getFilterCount(filterName as string);
    }
    return this.filterHooks.getStats().totalFilters || 0;
  }

  /**
   * Get all registered hook names
   */
  public getAllHookNames(): { actions: string[]; filters: string[] } {
    return {
      actions: this.actionHooks.getActionNames(),
      filters: this.filterHooks.getFilterNames(),
    };
  }

  /**
   * Get hooks for a specific plugin
   */
  public getPluginHooks(plugin: string): { actions: string[]; filters: string[] } {
    return {
      actions: this.actionHooks.getPluginActions(plugin),
      filters: this.filterHooks.getPluginFilters(plugin),
    };
  }

  /**
   * Register action hook definition
   */
  public registerActionDefinition(definition: ActionHookDefinition): void {
    this.actionHooks.registerDefinition(definition);
  }

  /**
   * Register filter hook definition
   */
  public registerFilterDefinition(definition: FilterHookDefinition): void {
    this.filterHooks.registerDefinition(definition);
  }

  /**
   * Get action hook definition
   */
  public getActionDefinition(hookName: string | CoreHooks): ActionHookDefinition | null {
    return this.actionHooks.getDefinition(hookName as string);
  }

  /**
   * Get filter hook definition
   */
  public getFilterDefinition(filterName: string | CoreFilters): FilterHookDefinition | null {
    return this.filterHooks.getDefinition(filterName as string);
  }

  /**
   * Get all hook definitions
   */
  public getAllDefinitions(): {
    actions: ActionHookDefinition[];
    filters: FilterHookDefinition[];
  } {
    return {
      actions: this.actionHooks.getAllDefinitions(),
      filters: this.filterHooks.getAllDefinitions(),
    };
  }

  /**
   * Get combined statistics
   */
  public getStats(): HookStats {
    const actionStats = this.actionHooks.getStats();
    const filterStats = this.filterHooks.getStats();

    return {
      totalHooks: (actionStats.totalHooks || 0),
      totalFilters: (filterStats.totalFilters || 0),
      executionCount: (actionStats.executionCount || 0) + (filterStats.executionCount || 0),
      averageExecutionTime: this.calculateCombinedAverage(actionStats, filterStats),
      errorCount: (actionStats.errorCount || 0) + (filterStats.errorCount || 0),
      hooksByPlugin: { ...actionStats.hooksByPlugin },
      filtersByPlugin: { ...filterStats.filtersByPlugin },
      executionsByHook: { 
        ...actionStats.executionsByHook,
        ...filterStats.executionsByHook,
      },
      slowestHooks: [
        ...(actionStats.slowestHooks || []),
        ...(filterStats.slowestHooks || []),
      ].sort((a, b) => b.averageTime - a.averageTime).slice(0, 10),
    };
  }

  /**
   * Calculate combined average execution time
   */
  private calculateCombinedAverage(
    actionStats: Partial<HookStats>,
    filterStats: Partial<HookStats>
  ): number {
    const actionCount = actionStats.executionCount || 0;
    const filterCount = filterStats.executionCount || 0;
    const totalCount = actionCount + filterCount;

    if (totalCount === 0) return 0;

    const actionAvg = actionStats.averageExecutionTime || 0;
    const filterAvg = filterStats.averageExecutionTime || 0;

    return ((actionAvg * actionCount) + (filterAvg * filterCount)) / totalCount;
  }

  /**
   * Get execution history
   */
  public getExecutionHistory(
    hookName?: string,
    limit?: number
  ): { actions: HookExecution[]; filters: HookExecution[] } {
    return {
      actions: this.actionHooks.getExecutionHistory(hookName, limit),
      filters: this.filterHooks.getExecutionHistory(hookName, limit),
    };
  }

  /**
   * Clear execution history
   */
  public clearHistory(): void {
    this.actionHooks.clearHistory();
    this.filterHooks.clearHistory();
    this.logger.info('Hook execution history cleared');
  }

  /**
   * Test filter chain
   */
  public async testFilter(
    filterName: string | CoreFilters,
    testValue: any,
    ...args: any[]
  ): Promise<any> {
    return this.filterHooks.testFilter(filterName as string, testValue, ...args);
  }

  /**
   * Register core hook definitions
   */
  private async registerCoreDefinitions(): Promise<void> {
    // Register core action hooks
    const coreActionDefinitions: ActionHookDefinition[] = [
      {
        name: CoreHooks.SYSTEM_INIT,
        description: 'Fired when the system initializes',
        parameters: [
          { name: 'context', type: 'object', description: 'Initialization context' },
        ],
        since: '1.0.0',
      },
      {
        name: CoreHooks.CMS_READY,
        description: 'Fired when CMS is fully loaded and ready',
        parameters: [],
        since: '1.0.0',
      },
      {
        name: CoreHooks.PLUGIN_ACTIVATED,
        description: 'Fired when a plugin is activated',
        parameters: [
          { name: 'plugin', type: 'string', description: 'Plugin name' },
        ],
        since: '1.0.0',
      },
      {
        name: CoreHooks.CONTENT_CREATED,
        description: 'Fired when content is created',
        parameters: [
          { name: 'content', type: 'object', description: 'Created content object' },
        ],
        since: '1.0.0',
      },
      {
        name: CoreHooks.USER_LOGIN,
        description: 'Fired when user logs in',
        parameters: [
          { name: 'user', type: 'object', description: 'User object' },
        ],
        since: '1.0.0',
      },
    ];

    // Register core filter hooks
    const coreFilterDefinitions: FilterHookDefinition[] = [
      {
        name: CoreFilters.CONTENT_RENDER,
        description: 'Filter content before rendering',
        parameters: [
          { name: 'content', type: 'string', description: 'Content HTML' },
          { name: 'post', type: 'object', description: 'Post object' },
        ],
        returnType: 'string',
        since: '1.0.0',
      },
      {
        name: CoreFilters.ADMIN_MENU_ITEMS,
        description: 'Filter admin menu items',
        parameters: [
          { name: 'menuItems', type: 'array', description: 'Menu items array' },
        ],
        returnType: 'array',
        since: '1.0.0',
      },
      {
        name: CoreFilters.USER_ROLE_CAPABILITIES,
        description: 'Filter user capabilities',
        parameters: [
          { name: 'capabilities', type: 'array', description: 'User capabilities' },
          { name: 'user', type: 'object', description: 'User object' },
        ],
        returnType: 'array',
        since: '1.0.0',
      },
      {
        name: CoreFilters.MEDIA_ALLOWED_TYPES,
        description: 'Filter allowed upload file types',
        parameters: [
          { name: 'types', type: 'array', description: 'Allowed MIME types' },
        ],
        returnType: 'array',
        since: '1.0.0',
      },
    ];

    // Register all definitions
    for (const definition of coreActionDefinitions) {
      this.registerActionDefinition(definition);
    }

    for (const definition of coreFilterDefinitions) {
      this.registerFilterDefinition(definition);
    }

    this.logger.info('Core hook definitions registered', {
      actions: coreActionDefinitions.length,
      filters: coreFilterDefinitions.length,
    });
  }

  /**
   * Setup metrics collection
   */
  private async setupMetrics(): Promise<void> {
    // Set up periodic metrics collection
    setInterval(() => {
      const stats = this.getStats();
      
      // Log metrics periodically
      this.logger.debug('Hook metrics:', {
        totalHooks: stats.totalHooks,
        totalFilters: stats.totalFilters,
        executionCount: stats.executionCount,
        averageExecutionTime: stats.averageExecutionTime,
        errorCount: stats.errorCount,
      });
    }, 60000); // Every minute

    this.logger.debug('Hook metrics collection enabled');
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get action hooks instance
   */
  public getActionHooks(): ActionHooks {
    return this.actionHooks;
  }

  /**
   * Get filter hooks instance
   */
  public getFilterHooks(): FilterHooks {
    return this.filterHooks;
  }

  /**
   * Create hook namespace for plugin
   */
  public createNamespace(plugin: string): {
    addAction: (hookName: string, callback: HookCallback, priority?: number, options?: Omit<HookRegistrationOptions, 'priority'>) => Promise<string>;
    addFilter: (filterName: string, callback: FilterCallback, priority?: number, options?: Omit<FilterRegistrationOptions, 'priority'>) => Promise<string>;
    removeAction: (hookName: string, hookId: string) => boolean;
    removeFilter: (filterName: string, filterId: string) => boolean;
    doAction: (hookName: string, ...args: any[]) => Promise<void>;
    applyFilters: (filterName: string, value: any, ...args: any[]) => Promise<any>;
    getHooks: () => { actions: string[]; filters: string[] };
    removeAll: () => { actions: number; filters: number };
  } {
    return {
      addAction: (hookName, callback, priority = 10, options = {}) => 
        this.addAction(hookName, callback, priority, plugin, options),
      
      addFilter: (filterName, callback, priority = 10, options = {}) => 
        this.addFilter(filterName, callback, priority, plugin, options),
      
      removeAction: (hookName, hookId) => 
        this.removeAction(hookName, hookId),
      
      removeFilter: (filterName, filterId) => 
        this.removeFilter(filterName, filterId),
      
      doAction: (hookName, ...args) => 
        this.doAction(hookName, ...args),
      
      applyFilters: (filterName, value, ...args) => 
        this.applyFilters(filterName, value, ...args),
      
      getHooks: () => 
        this.getPluginHooks(plugin),
      
      removeAll: () => 
        this.removePluginHooks(plugin),
    };
  }
}