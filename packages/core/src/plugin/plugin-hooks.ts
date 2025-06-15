import { EventManager } from '../events/event-manager';
import { Logger } from '../utils/logger';
import type { PluginHook, PluginFilter } from './plugin-types';

export interface HookCallback {
  (...args: any[]): any;
}

export interface FilterCallback {
  (value: any, ...args: any[]): any;
}

export interface RegisteredHook {
  callback: HookCallback;
  priority: number;
  plugin: string;
  once?: boolean;
}

export interface RegisteredFilter {
  callback: FilterCallback;
  priority: number;
  plugin: string;
}

export class PluginHooks {
  private static instance: PluginHooks;
  private hooks = new Map<string, RegisteredHook[]>();
  private filters = new Map<string, RegisteredFilter[]>();
  private logger = new Logger('PluginHooks');
  private events = EventManager.getInstance();

  private constructor() {}

  public static getInstance(): PluginHooks {
    if (!PluginHooks.instance) {
      PluginHooks.instance = new PluginHooks();
    }
    return PluginHooks.instance;
  }

  /**
   * Register an action hook
   */
  public addAction(
    hookName: string,
    callback: HookCallback,
    priority: number = 10,
    plugin: string = 'core',
    once: boolean = false
  ): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    const hooks = this.hooks.get(hookName)!;
    hooks.push({ callback, priority, plugin, once });

    // Sort by priority (lower numbers run first)
    hooks.sort((a, b) => a.priority - b.priority);

    this.logger.debug(`Action hook registered: ${hookName}`, {
      plugin,
      priority,
      once,
      totalHooks: hooks.length,
    });
  }

  /**
   * Remove an action hook
   */
  public removeAction(
    hookName: string,
    callback: HookCallback,
    plugin?: string
  ): boolean {
    const hooks = this.hooks.get(hookName);
    if (!hooks) return false;

    const initialLength = hooks.length;
    const filteredHooks = hooks.filter(hook => {
      if (hook.callback === callback) {
        return plugin ? hook.plugin !== plugin : false;
      }
      return true;
    });

    this.hooks.set(hookName, filteredHooks);

    const removed = initialLength > filteredHooks.length;
    if (removed) {
      this.logger.debug(`Action hook removed: ${hookName}`, { plugin });
    }

    return removed;
  }

  /**
   * Execute action hooks
   */
  public async doAction(hookName: string, ...args: any[]): Promise<void> {
    const hooks = this.hooks.get(hookName);
    if (!hooks || hooks.length === 0) return;

    this.logger.debug(`Executing action hooks: ${hookName}`, {
      hookCount: hooks.length,
      args: args.length,
    });

    const hooksToRemove: RegisteredHook[] = [];

    for (const hook of hooks) {
      try {
        await hook.callback(...args);

        // Mark for removal if it's a one-time hook
        if (hook.once) {
          hooksToRemove.push(hook);
        }

        // Emit hook execution event
        await this.events.emit('hook:executed', {
          hookName,
          plugin: hook.plugin,
          priority: hook.priority,
        });
      } catch (error) {
        this.logger.error(`Error executing hook ${hookName} from plugin ${hook.plugin}:`, error);
        
        // Emit hook error event
        await this.events.emit('hook:error', {
          hookName,
          plugin: hook.plugin,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Remove one-time hooks
    if (hooksToRemove.length > 0) {
      const remainingHooks = hooks.filter(hook => !hooksToRemove.includes(hook));
      this.hooks.set(hookName, remainingHooks);
    }
  }

  /**
   * Register a filter hook
   */
  public addFilter(
    filterName: string,
    callback: FilterCallback,
    priority: number = 10,
    plugin: string = 'core'
  ): void {
    if (!this.filters.has(filterName)) {
      this.filters.set(filterName, []);
    }

    const filters = this.filters.get(filterName)!;
    filters.push({ callback, priority, plugin });

    // Sort by priority (lower numbers run first)
    filters.sort((a, b) => a.priority - b.priority);

    this.logger.debug(`Filter hook registered: ${filterName}`, {
      plugin,
      priority,
      totalFilters: filters.length,
    });
  }

  /**
   * Remove a filter hook
   */
  public removeFilter(
    filterName: string,
    callback: FilterCallback,
    plugin?: string
  ): boolean {
    const filters = this.filters.get(filterName);
    if (!filters) return false;

    const initialLength = filters.length;
    const filteredFilters = filters.filter(filter => {
      if (filter.callback === callback) {
        return plugin ? filter.plugin !== plugin : false;
      }
      return true;
    });

    this.filters.set(filterName, filteredFilters);

    const removed = initialLength > filteredFilters.length;
    if (removed) {
      this.logger.debug(`Filter hook removed: ${filterName}`, { plugin });
    }

    return removed;
  }

  /**
   * Apply filter hooks
   */
  public async applyFilters(filterName: string, value: any, ...args: any[]): Promise<any> {
    const filters = this.filters.get(filterName);
    if (!filters || filters.length === 0) return value;

    this.logger.debug(`Applying filter hooks: ${filterName}`, {
      filterCount: filters.length,
      args: args.length,
    });

    let filteredValue = value;

    for (const filter of filters) {
      try {
        const result = await filter.callback(filteredValue, ...args);
        filteredValue = result !== undefined ? result : filteredValue;

        // Emit filter execution event
        await this.events.emit('filter:executed', {
          filterName,
          plugin: filter.plugin,
          priority: filter.priority,
        });
      } catch (error) {
        this.logger.error(`Error applying filter ${filterName} from plugin ${filter.plugin}:`, error);
        
        // Emit filter error event
        await this.events.emit('filter:error', {
          filterName,
          plugin: filter.plugin,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return filteredValue;
  }

  /**
   * Check if hook exists
   */
  public hasAction(hookName: string): boolean {
    const hooks = this.hooks.get(hookName);
    return hooks ? hooks.length > 0 : false;
  }

  /**
   * Check if filter exists
   */
  public hasFilter(filterName: string): boolean {
    const filters = this.filters.get(filterName);
    return filters ? filters.length > 0 : false;
  }

  /**
   * Get all registered hooks for a plugin
   */
  public getPluginHooks(plugin: string): string[] {
    const hookNames: string[] = [];

    for (const [hookName, hooks] of this.hooks.entries()) {
      if (hooks.some(hook => hook.plugin === plugin)) {
        hookNames.push(hookName);
      }
    }

    return hookNames;
  }

  /**
   * Get all registered filters for a plugin
   */
  public getPluginFilters(plugin: string): string[] {
    const filterNames: string[] = [];

    for (const [filterName, filters] of this.filters.entries()) {
      if (filters.some(filter => filter.plugin === plugin)) {
        filterNames.push(filterName);
      }
    }

    return filterNames;
  }

  /**
   * Remove all hooks and filters for a plugin
   */
  public removePluginHooks(plugin: string): void {
    // Remove action hooks
    for (const [hookName, hooks] of this.hooks.entries()) {
      const filteredHooks = hooks.filter(hook => hook.plugin !== plugin);
      this.hooks.set(hookName, filteredHooks);
    }

    // Remove filter hooks
    for (const [filterName, filters] of this.filters.entries()) {
      const filteredFilters = filters.filter(filter => filter.plugin !== plugin);
      this.filters.set(filterName, filteredFilters);
    }

    this.logger.info(`Removed all hooks and filters for plugin: ${plugin}`);
  }

  /**
   * Get hook statistics
   */
  public getStats(): {
    totalHooks: number;
    totalFilters: number;
    hooksByPlugin: Record<string, number>;
    filtersByPlugin: Record<string, number>;
  } {
    const hooksByPlugin: Record<string, number> = {};
    const filtersByPlugin: Record<string, number> = {};

    let totalHooks = 0;
    for (const hooks of this.hooks.values()) {
      totalHooks += hooks.length;
      for (const hook of hooks) {
        hooksByPlugin[hook.plugin] = (hooksByPlugin[hook.plugin] || 0) + 1;
      }
    }

    let totalFilters = 0;
    for (const filters of this.filters.values()) {
      totalFilters += filters.length;
      for (const filter of filters) {
        filtersByPlugin[filter.plugin] = (filtersByPlugin[filter.plugin] || 0) + 1;
      }
    }

    return {
      totalHooks,
      totalFilters,
      hooksByPlugin,
      filtersByPlugin,
    };
  }

  /**
   * Clear all hooks and filters
   */
  public clear(): void {
    this.hooks.clear();
    this.filters.clear();
    this.logger.info('All hooks and filters cleared');
  }

  /**
   * Get available hooks documentation
   */
  public getAvailableHooks(): PluginHook[] {
    return [
      {
        name: 'plugin:before_activate',
        description: 'Fired before a plugin is activated',
        parameters: [
          { name: 'plugin', type: 'string', description: 'Plugin name' },
        ],
        since: '1.0.0',
      },
      {
        name: 'plugin:activated',
        description: 'Fired after a plugin is activated',
        parameters: [
          { name: 'plugin', type: 'string', description: 'Plugin name' },
        ],
        since: '1.0.0',
      },
      {
        name: 'plugin:before_deactivate',
        description: 'Fired before a plugin is deactivated',
        parameters: [
          { name: 'plugin', type: 'string', description: 'Plugin name' },
        ],
        since: '1.0.0',
      },
      {
        name: 'plugin:deactivated',
        description: 'Fired after a plugin is deactivated',
        parameters: [
          { name: 'plugin', type: 'string', description: 'Plugin name' },
        ],
        since: '1.0.0',
      },
      {
        name: 'content:before_create',
        description: 'Fired before content is created',
        parameters: [
          { name: 'content', type: 'object', description: 'Content data' },
          { name: 'type', type: 'string', description: 'Content type' },
        ],
        since: '1.0.0',
      },
      {
        name: 'content:created',
        description: 'Fired after content is created',
        parameters: [
          { name: 'content', type: 'object', description: 'Created content' },
        ],
        since: '1.0.0',
      },
      {
        name: 'user:login',
        description: 'Fired when user logs in',
        parameters: [
          { name: 'user', type: 'object', description: 'User object' },
        ],
        since: '1.0.0',
      },
      {
        name: 'theme:activated',
        description: 'Fired when theme is activated',
        parameters: [
          { name: 'theme', type: 'string', description: 'Theme name' },
        ],
        since: '1.0.0',
      },
    ];
  }

  /**
   * Get available filters documentation
   */
  public getAvailableFilters(): PluginFilter[] {
    return [
      {
        name: 'content:render',
        description: 'Filter content before rendering',
        parameters: [
          { name: 'content', type: 'string', description: 'Content HTML' },
          { name: 'post', type: 'object', description: 'Post object' },
        ],
        returnType: 'string',
        since: '1.0.0',
      },
      {
        name: 'admin:menu',
        description: 'Filter admin menu items',
        parameters: [
          { name: 'menu', type: 'array', description: 'Menu items' },
        ],
        returnType: 'array',
        since: '1.0.0',
      },
      {
        name: 'user:capabilities',
        description: 'Filter user capabilities',
        parameters: [
          { name: 'capabilities', type: 'array', description: 'User capabilities' },
          { name: 'user', type: 'object', description: 'User object' },
        ],
        returnType: 'array',
        since: '1.0.0',
      },
      {
        name: 'upload:allowed_types',
        description: 'Filter allowed upload file types',
        parameters: [
          { name: 'types', type: 'array', description: 'Allowed MIME types' },
        ],
        returnType: 'array',
        since: '1.0.0',
      },
    ];
  }
}