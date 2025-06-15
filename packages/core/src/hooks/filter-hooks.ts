import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { FilterCallback, FilterHookDefinition, FilterRegistrationOptions, HookExecution, HookStats, RegisteredFilter } from './hook-types';

export class FilterHooks {
  private filters = new Map<string, RegisteredFilter[]>();
  private executions: HookExecution[] = [];
  private definitions = new Map<string, FilterHookDefinition>();
  private logger = new Logger('FilterHooks');
  private events = EventManager.getInstance();

  private stats: HookStats = {
    totalHooks: 0,
    totalFilters: 0,
    executionCount: 0,
    averageExecutionTime: 0,
    errorCount: 0,
    hooksByPlugin: {},
    filtersByPlugin: {},
    executionsByHook: {},
    slowestHooks: [],
  };

  /**
   * Add filter hook
   */
  public addFilter(
    filterName: string,
    callback: FilterCallback,
    plugin: string = 'core',
    options: FilterRegistrationOptions = {}
  ): string {
    const filterId = uuidv4();
    
    const filter: RegisteredFilter = {
      id: filterId,
      callback,
      priority: options.priority ?? 10,
      plugin,
      addedAt: new Date(),
      condition: options.condition,
      timeout: options.timeout,
      errorHandler: options.errorHandler,
    };

    // Add to filters map
    if (!this.filters.has(filterName)) {
      this.filters.set(filterName, []);
    }

    const filterList = this.filters.get(filterName)!;
    filterList.push(filter);

    // Sort by priority (lower numbers = higher priority)
    filterList.sort((a, b) => a.priority - b.priority);

    // Update stats
    this.stats.totalFilters++;
    this.stats.filtersByPlugin[plugin] = (this.stats.filtersByPlugin[plugin] || 0) + 1;

    this.logger.debug(`Filter hook added: ${filterName}`, {
      filterId,
      plugin,
      priority: filter.priority,
      totalFilters: filterList.length,
    });

    // Emit filter registration event
    this.events.emit('hook:added', {
      type: 'filter',
      name: filterName,
      hookId: filterId,
      plugin,
      priority: filter.priority,
    });

    return filterId;
  }

  /**
   * Remove filter hook
   */
  public removeFilter(filterName: string, filterId: string): boolean {
    const filterList = this.filters.get(filterName);
    if (!filterList) return false;

    const index = filterList.findIndex(filter => filter.id === filterId);
    if (index === -1) return false;

    const filter = filterList[index];
    filterList.splice(index, 1);

    // Update stats
    this.stats.totalFilters--;
    if (filter) {
      this.stats.filtersByPlugin[filter.plugin] = Math.max(
        (this.stats.filtersByPlugin[filter.plugin] || 1) - 1,
        0
      );
    }

    this.logger.debug(`Filter hook removed: ${filterName}`, {
      filterId,
      plugin: filter ? filter.plugin : undefined,
    });

    // Emit filter removal event
    this.events.emit('hook:removed', {
      type: 'filter',
      name: filterName,
      hookId: filterId,
      plugin: filter ? filter.plugin : undefined,
    });

    return true;
  }

  /**
   * Remove all filters for a plugin
   */
  public removePluginFilters(plugin: string): number {
    let removedCount = 0;

    for (const [filterName, filterList] of this.filters.entries()) {
      const before = filterList.length;
      
      // Filter out filters from the plugin
      const filtered = filterList.filter(filter => {
        if (filter.plugin === plugin) {
          // Emit removal event for each filter
          this.events.emit('hook:removed', {
            type: 'filter',
            name: filterName,
            hookId: filter.id,
            plugin: filter.plugin,
          });
          return false;
        }
        return true;
      });

      this.filters.set(filterName, filtered);
      const removed = before - filtered.length;
      removedCount += removed;

      // Update stats
      this.stats.totalFilters -= removed;
    }

    // Update plugin stats
    if (this.stats.filtersByPlugin[plugin]) {
      delete this.stats.filtersByPlugin[plugin];
    }

    this.logger.info(`Removed ${removedCount} filter hooks for plugin: ${plugin}`);
    return removedCount;
  }

  /**
   * Apply filter hooks
   */
  public async applyFilters(filterName: string, value: any, ...args: any[]): Promise<any> {
    const filterList = this.filters.get(filterName);
    if (!filterList || filterList.length === 0) {
      return value;
    }

    const startTime = Date.now();
    let filteredValue = value;

    this.logger.debug(`Applying filter hooks: ${filterName}`, {
      filterCount: filterList.length,
      args: args.length,
      originalValue: typeof value,
    });

    for (const filter of filterList) {
      const filterStartTime = Date.now();
      let success = true;
      let error: string | undefined;
      let previousValue = filteredValue;

      try {
        // Check condition if provided
        if (filter.condition && !filter.condition(filteredValue, ...args)) {
          continue;
        }

        // Apply filter with timeout if specified
        let result: any;
        if (filter.timeout) {
          result = await this.executeWithTimeout(filter.callback, [filteredValue, ...args], filter.timeout);
        } else {
          result = await filter.callback(filteredValue, ...args);
        }

        // Update filtered value if result is not undefined
        if (result !== undefined) {
          filteredValue = result;
        }
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
        this.stats.errorCount++;

        this.logger.error(`Filter hook error for ${filterName}:`, err);

        // Call custom error handler if provided
        if (filter.errorHandler) {
          try {
            const handlerResult = filter.errorHandler(err as Error, filteredValue, ...args);
            if (handlerResult !== undefined) {
              filteredValue = handlerResult;
            }
          } catch (handlerError) {
            this.logger.error('Error in filter hook error handler:', handlerError);
          }
        }

        // Emit filter error event
        this.events.emit('hook:error', {
          type: 'filter',
          name: filterName,
          hookId: filter.id,
          plugin: filter.plugin,
          error: error,
        });
      }

      // Record execution
      const duration = Date.now() - filterStartTime;
      const execution: HookExecution = {
        hookName: filterName,
        hookType: 'filter',
        executedAt: new Date(),
        duration,
        plugin: filter.plugin,
        success,
        error,
        args: args.length > 0 ? args : undefined,
        result: success ? filteredValue : undefined,
      };

      this.recordExecution(execution);

      // Emit filter execution event
      this.events.emit('hook:executed', {
        type: 'filter',
        name: filterName,
        hookId: filter.id,
        plugin: filter.plugin,
        duration,
        success,
      });
    }

    const totalDuration = Date.now() - startTime;
    this.logger.debug(`Filter hooks applied: ${filterName}`, {
      duration: totalDuration,
      filterCount: filterList.length,
      originalType: typeof value,
      resultType: typeof filteredValue,
      valueChanged: value !== filteredValue,
    });

    return filteredValue;
  }

  /**
   * Execute callback with timeout
   */
  private async executeWithTimeout(
    callback: FilterCallback,
    args: any[],
    timeout: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Filter hook timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve(callback.apply(null, args as [any, ...any[]]))
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Check if filter exists
   */
  public hasFilter(filterName: string): boolean {
    const filterList = this.filters.get(filterName);
    return filterList ? filterList.length > 0 : false;
  }

  /**
   * Get filter count for specific filter name
   */
  public getFilterCount(filterName: string): number {
    const filterList = this.filters.get(filterName);
    return filterList ? filterList.length : 0;
  }

  /**
   * Get all registered filter names
   */
  public getFilterNames(): string[] {
    return Array.from(this.filters.keys());
  }

  /**
   * Get filters for a specific plugin
   */
  public getPluginFilters(plugin: string): string[] {
    const filterNames: string[] = [];

    for (const [filterName, filterList] of this.filters.entries()) {
      if (filterList.some(filter => filter.plugin === plugin)) {
        filterNames.push(filterName);
      }
    }

    return filterNames;
  }

  /**
   * Register filter definition
   */
  public registerDefinition(definition: FilterHookDefinition): void {
    this.definitions.set(definition.name, definition);
    this.logger.debug(`Filter hook definition registered: ${definition.name}`);
  }

  /**
   * Get filter definition
   */
  public getDefinition(filterName: string): FilterHookDefinition | null {
    return this.definitions.get(filterName) || null;
  }

  /**
   * Get all filter definitions
   */
  public getAllDefinitions(): FilterHookDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Record filter execution
   */
  private recordExecution(execution: HookExecution): void {
    this.executions.push(execution);

    // Maintain execution history limit
    if (this.executions.length > 10000) {
      this.executions = this.executions.slice(-5000);
    }

    // Update stats
    this.stats.executionCount++;
    this.stats.executionsByHook[execution.hookName] = 
      (this.stats.executionsByHook[execution.hookName] || 0) + 1;

    // Update average execution time
    const count = this.stats.executionCount;
    const currentAvg = this.stats.averageExecutionTime;
    this.stats.averageExecutionTime = ((currentAvg * (count - 1)) + execution.duration) / count;

    // Update slowest filters
    this.updateSlowestFilters(execution);
  }

  /**
   * Update slowest filters tracking
   */
  private updateSlowestFilters(execution: HookExecution): void {
    let filterStats = this.stats.slowestHooks.find(h => h.name === execution.hookName);
    
    if (!filterStats) {
      filterStats = {
        name: execution.hookName,
        averageTime: execution.duration,
        executions: 1,
      };
      this.stats.slowestHooks.push(filterStats);
    } else {
      const newAverage = ((filterStats.averageTime * filterStats.executions) + execution.duration) / 
                        (filterStats.executions + 1);
      filterStats.averageTime = newAverage;
      filterStats.executions++;
    }

    // Keep only top 10 slowest filters
    this.stats.slowestHooks.sort((a, b) => b.averageTime - a.averageTime);
    this.stats.slowestHooks = this.stats.slowestHooks.slice(0, 10);
  }

  /**
   * Get execution history
   */
  public getExecutionHistory(filterName?: string, limit?: number): HookExecution[] {
    let history = [...this.executions];

    if (filterName) {
      history = history.filter(exec => exec.hookName === filterName);
    }

    if (limit) {
      history = history.slice(-limit);
    }

    return history;
  }

  /**
   * Get statistics
   */
  public getStats(): Partial<HookStats> {
    return {
      totalFilters: this.stats.totalFilters,
      executionCount: this.stats.executionCount,
      averageExecutionTime: this.stats.averageExecutionTime,
      errorCount: this.stats.errorCount,
      filtersByPlugin: { ...this.stats.filtersByPlugin },
      executionsByHook: { ...this.stats.executionsByHook },
      slowestHooks: [...this.stats.slowestHooks],
    };
  }

  /**
   * Clear execution history
   */
  public clearHistory(): void {
    this.executions = [];
    this.stats.executionCount = 0;
    this.stats.averageExecutionTime = 0;
    this.stats.errorCount = 0;
    this.stats.executionsByHook = {};
    this.stats.slowestHooks = [];
    this.logger.debug('Filter hook execution history cleared');
  }

  /**
   * Clear all filters
   */
  public clear(): void {
    this.filters.clear();
    this.clearHistory();
    this.stats.totalFilters = 0;
    this.stats.filtersByPlugin = {};
    this.logger.info('All filter hooks cleared');
  }

  /**
   * Test filter chain
   */
  public async testFilter(filterName: string, testValue: any, ...args: any[]): Promise<{
    originalValue: any;
    finalValue: any;
    filterCount: number;
    totalDuration: number;
    filterResults: Array<{
      plugin: string;
      inputValue: any;
      outputValue: any;
      duration: number;
      success: boolean;
      error?: string;
    }>;
  }> {
    const filterList = this.filters.get(filterName);
    if (!filterList || filterList.length === 0) {
      return {
        originalValue: testValue,
        finalValue: testValue,
        filterCount: 0,
        totalDuration: 0,
        filterResults: [],
      };
    }

    const startTime = Date.now();
    let currentValue = testValue;
    const filterResults: any[] = [];

    for (const filter of filterList) {
      const filterStartTime = Date.now();
      const inputValue = currentValue;
      let outputValue = currentValue;
      let success = true;
      let error: string | undefined;

      try {
        if (filter.condition && !filter.condition(currentValue, ...args)) {
          filterResults.push({
            plugin: filter.plugin,
            inputValue,
            outputValue,
            duration: 0,
            success: true,
            skipped: true,
          });
          continue;
        }

        const result = await filter.callback(currentValue, ...args);
        if (result !== undefined) {
          outputValue = result;
          currentValue = result;
        }
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
      }

      const duration = Date.now() - filterStartTime;
      filterResults.push({
        plugin: filter.plugin,
        inputValue,
        outputValue,
        duration,
        success,
        error,
      });
    }

    const totalDuration = Date.now() - startTime;

    return {
      originalValue: testValue,
      finalValue: currentValue,
      filterCount: filterList.length,
      totalDuration,
      filterResults,
    };
  }
}