import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import type {
  HookCallback,
  RegisteredHook,
  HookExecution,
  HookStats,
  HookRegistrationOptions,
  ActionHookDefinition,
} from './hook-types';

export class ActionHooks {
  private hooks = new Map<string, RegisteredHook[]>();
  private executions: HookExecution[] = [];
  private definitions = new Map<string, ActionHookDefinition>();
  private logger = new Logger('ActionHooks');
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
   * Add action hook
   */
  public addAction(
    hookName: string,
    callback: HookCallback,
    plugin: string = 'core',
    options: HookRegistrationOptions = {}
  ): string {
    const hookId = uuidv4();
    
    const hook: RegisteredHook = {
      id: hookId,
      callback,
      priority: options.priority ?? 10,
      plugin,
      addedAt: new Date(),
      once: options.once,
      condition: options.condition,
      timeout: options.timeout,
      errorHandler: options.errorHandler,
    };

    // Add to hooks map
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    const hookList = this.hooks.get(hookName)!;
    hookList.push(hook);

    // Sort by priority (lower numbers = higher priority)
    hookList.sort((a, b) => a.priority - b.priority);

    // Update stats
    this.stats.totalHooks++;
    this.stats.hooksByPlugin[plugin] = (this.stats.hooksByPlugin[plugin] || 0) + 1;

    this.logger.debug(`Action hook added: ${hookName}`, {
      hookId,
      plugin,
      priority: hook.priority,
      totalHooks: hookList.length,
    });

    // Emit hook registration event
    this.events.emit('hook:added', {
      type: 'action',
      name: hookName,
      hookId,
      plugin,
      priority: hook.priority,
    });

    return hookId;
  }

  /**
   * Remove action hook
   */
  public removeAction(hookName: string, hookId: string): boolean {
    const hookList = this.hooks.get(hookName);
    if (!hookList) return false;

    const index = hookList.findIndex(hook => hook.id === hookId);
    if (index === -1) return false;

    const hook = hookList[index];
    hookList.splice(index, 1);

    // Update stats
    this.stats.totalHooks--;
    if (hook) {
      this.stats.hooksByPlugin[hook.plugin] = Math.max(
        (this.stats.hooksByPlugin[hook.plugin] || 1) - 1,
        0
      );

      this.logger.debug(`Action hook removed: ${hookName}`, {
        hookId,
        plugin: hook.plugin,
      });

      // Emit hook removal event
      this.events.emit('hook:removed', {
        type: 'action',
        name: hookName,
        hookId,
        plugin: hook.plugin,
      });
    }

    return true;
  }

  /**
   * Remove all hooks for a plugin
   */
  public removePluginActions(plugin: string): number {
    let removedCount = 0;

    for (const [hookName, hookList] of this.hooks.entries()) {
      const before = hookList.length;
      
      // Filter out hooks from the plugin
      const filtered = hookList.filter(hook => {
        if (hook.plugin === plugin) {
          // Emit removal event for each hook
          this.events.emit('hook:removed', {
            type: 'action',
            name: hookName,
            hookId: hook.id,
            plugin: hook.plugin,
          });
          return false;
        }
        return true;
      });

      this.hooks.set(hookName, filtered);
      const removed = before - filtered.length;
      removedCount += removed;

      // Update stats
      this.stats.totalHooks -= removed;
    }

    // Update plugin stats
    if (this.stats.hooksByPlugin[plugin]) {
      delete this.stats.hooksByPlugin[plugin];
    }

    this.logger.info(`Removed ${removedCount} action hooks for plugin: ${plugin}`);
    return removedCount;
  }

  /**
   * Execute action hooks
   */
  public async doAction(hookName: string, ...args: any[]): Promise<void> {
    const hookList = this.hooks.get(hookName);
    if (!hookList || hookList.length === 0) {
      return;
    }

    const startTime = Date.now();
    const hooksToRemove: string[] = [];

    this.logger.debug(`Executing action hooks: ${hookName}`, {
      hookCount: hookList.length,
      args: args.length,
    });

    for (const hook of hookList) {
      const hookStartTime = Date.now();
      let success = true;
      let error: string | undefined;

      try {
        // Check condition if provided
        if (hook.condition && !hook.condition(...args)) {
          continue;
        }

        // Execute hook with timeout if specified
        if (hook.timeout) {
          await this.executeWithTimeout(hook.callback, args, hook.timeout);
        } else {
          await hook.callback(...args);
        }

        // Mark for removal if it's a one-time hook
        if (hook.once) {
          hooksToRemove.push(hook.id);
        }
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
        this.stats.errorCount++;

        this.logger.error(`Action hook error for ${hookName}:`, err);

        // Call custom error handler if provided
        if (hook.errorHandler) {
          try {
            hook.errorHandler(err as Error, ...args);
          } catch (handlerError) {
            this.logger.error('Error in action hook error handler:', handlerError);
          }
        }

        // Emit hook error event
        this.events.emit('hook:error', {
          type: 'action',
          name: hookName,
          hookId: hook.id,
          plugin: hook.plugin,
          error: error,
        });
      }

      // Record execution
      const duration = Date.now() - hookStartTime;
      const execution: HookExecution = {
        hookName,
        hookType: 'action',
        executedAt: new Date(),
        duration,
        plugin: hook.plugin,
        success,
        error,
        args: args.length > 0 ? args : undefined,
      };

      this.recordExecution(execution);

      // Emit hook execution event
      this.events.emit('hook:executed', {
        type: 'action',
        name: hookName,
        hookId: hook.id,
        plugin: hook.plugin,
        duration,
        success,
      });
    }

    // Remove one-time hooks
    for (const hookId of hooksToRemove) {
      this.removeAction(hookName, hookId);
    }

    const totalDuration = Date.now() - startTime;
    this.logger.debug(`Action hooks executed: ${hookName}`, {
      duration: totalDuration,
      hookCount: hookList.length,
      errors: hookList.length - hooksToRemove.length,
    });
  }

  /**
   * Execute callback with timeout
   */
  private async executeWithTimeout(
    callback: HookCallback,
    args: any[],
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Action hook timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve(callback(...args))
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
   * Check if hook exists
   */
  public hasAction(hookName: string): boolean {
    const hookList = this.hooks.get(hookName);
    return hookList ? hookList.length > 0 : false;
  }

  /**
   * Get hook count for specific hook name
   */
  public getActionCount(hookName: string): number {
    const hookList = this.hooks.get(hookName);
    return hookList ? hookList.length : 0;
  }

  /**
   * Get all registered hook names
   */
  public getActionNames(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Get hooks for a specific plugin
   */
  public getPluginActions(plugin: string): string[] {
    const hookNames: string[] = [];

    for (const [hookName, hookList] of this.hooks.entries()) {
      if (hookList.some(hook => hook.plugin === plugin)) {
        hookNames.push(hookName);
      }
    }

    return hookNames;
  }

  /**
   * Register hook definition
   */
  public registerDefinition(definition: ActionHookDefinition): void {
    this.definitions.set(definition.name, definition);
    this.logger.debug(`Action hook definition registered: ${definition.name}`);
  }

  /**
   * Get hook definition
   */
  public getDefinition(hookName: string): ActionHookDefinition | null {
    return this.definitions.get(hookName) || null;
  }

  /**
   * Get all hook definitions
   */
  public getAllDefinitions(): ActionHookDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Record hook execution
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

    // Update slowest hooks
    this.updateSlowestHooks(execution);
  }

  /**
   * Update slowest hooks tracking
   */
  private updateSlowestHooks(execution: HookExecution): void {
    let hookStats = this.stats.slowestHooks.find(h => h.name === execution.hookName);
    
    if (!hookStats) {
      hookStats = {
        name: execution.hookName,
        averageTime: execution.duration,
        executions: 1,
      };
      this.stats.slowestHooks.push(hookStats);
    } else {
      const newAverage = ((hookStats.averageTime * hookStats.executions) + execution.duration) / 
                        (hookStats.executions + 1);
      hookStats.averageTime = newAverage;
      hookStats.executions++;
    }

    // Keep only top 10 slowest hooks
    this.stats.slowestHooks.sort((a, b) => b.averageTime - a.averageTime);
    this.stats.slowestHooks = this.stats.slowestHooks.slice(0, 10);
  }

  /**
   * Get execution history
   */
  public getExecutionHistory(hookName?: string, limit?: number): HookExecution[] {
    let history = [...this.executions];

    if (hookName) {
      history = history.filter(exec => exec.hookName === hookName);
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
      totalHooks: this.stats.totalHooks,
      executionCount: this.stats.executionCount,
      averageExecutionTime: this.stats.averageExecutionTime,
      errorCount: this.stats.errorCount,
      hooksByPlugin: { ...this.stats.hooksByPlugin },
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
    this.logger.debug('Action hook execution history cleared');
  }

  /**
   * Clear all hooks
   */
  public clear(): void {
    this.hooks.clear();
    this.clearHistory();
    this.stats.totalHooks = 0;
    this.stats.hooksByPlugin = {};
    this.logger.info('All action hooks cleared');
  }
}