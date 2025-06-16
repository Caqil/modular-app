// ===================================================================
// ROUTE MANAGER - ROUTE REGISTRATION AND MANAGEMENT SYSTEM
// ===================================================================


import express, { Router } from 'express';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { CacheManager } from '../cache/cache-manager';
import { HookManager } from '../hooks/hook-manager';
import { PermissionManager } from '../auth/permission-manager';
import { Validator } from '../utils/validator';
import { Sanitizer } from '../utils/sanitizer';
import { CoreHooks } from '../hooks/hook-types';
import { User, type IUser } from '../database/models';
import { UserRole } from '../types/user';
import { PluginRoute } from '../types/plugin';
import {
  APIRoute,
  APIController,
  RouteHandler,
  MiddlewareFunction,
  HTTPMethod,
  APIRequest,
  APIResponse,
  ValidationConfig,
  RouteDocumentation,
  RouteMetrics,
  APIEventType,
  RouteMatcher,
  RouteGroup,
  RequestContext,
} from './api-types';

export interface RouteManagerConfig {
  enableMetrics: boolean;
  enableDocumentation: boolean;
  enableValidation: boolean;
  enableCaching: boolean;
  defaultCacheTTL: number;
  maxRoutesPerPlugin: number;
  enableRouteGroups: boolean;
  caseSensitive: boolean;
  strictRouting: boolean;
  mergeParams: boolean;
}

export interface RouteRegistrationOptions {
  plugin?: string;
  group?: string;
  middleware?: MiddlewareFunction[];
  permissions?: string[];
  roles?: UserRole[];
  validation?: ValidationConfig;
  cache?: boolean | number;
  documentation?: RouteDocumentation;
  enabled?: boolean;
  priority?: number;
}

/**
 * Route Manager
 * Manages API route registration, matching, and execution
 */
export class RouteManager {
  private static instance: RouteManager;
  private logger = new Logger('RouteManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private cache = CacheManager.getInstance();
  private hooks = HookManager.getInstance();
  private permissions = PermissionManager.getInstance();
  private initialized = false;
  private router = Router();
  private routes = new Map<string, APIRoute>();
  private controllers = new Map<string, APIController>();
  private routeGroups = new Map<string, RouteGroup>();
  private metrics = new Map<string, RouteMetrics>();
  private managerConfig: RouteManagerConfig;

  private readonly defaultConfig: RouteManagerConfig = {
    enableMetrics: true,
    enableDocumentation: true,
    enableValidation: true,
    enableCaching: true,
    defaultCacheTTL: 300, // 5 minutes
    maxRoutesPerPlugin: 100,
    enableRouteGroups: true,
    caseSensitive: false,
    strictRouting: false,
    mergeParams: false,
  };

  private constructor() {
    this.managerConfig = this.defaultConfig;
  }

  public static getInstance(): RouteManager {
    if (!RouteManager.instance) {
      RouteManager.instance = new RouteManager();
    }
    return RouteManager.instance;
  }

  /**
   * Initialize route manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Route manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing route manager...');

      // Load configuration
      const config = await this.config.get<RouteManagerConfig>('routes');
      this.managerConfig = { ...this.defaultConfig, ...config };

      // Configure router
      this.setupRouter();

      // Register core routes
      await this.registerCoreRoutes();

      // Register hooks
      await this.registerHooks();

      this.initialized = true;
      this.logger.info('Route manager initialized successfully', {
        routes: this.routes.size,
        controllers: this.controllers.size,
        groups: this.routeGroups.size,
      });

      // Emit initialization event
      await this.events.emit(APIEventType.SERVER_START, {
        component: 'RouteManager',
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Failed to initialize route manager:', error);
      throw error;
    }
  }

  /**
   * Register a single route
   */
  public async registerRoute(
    path: string,
    method: HTTPMethod,
    handler: RouteHandler,
    options: RouteRegistrationOptions = {}
  ): Promise<string> {
    try {
      const routeId = this.generateRouteId(path, method, options.plugin);

      // Check if route already exists
      if (this.routes.has(routeId)) {
        throw new Error(`Route ${method} ${path} already registered`);
      }

      // Check plugin route limits
      if (options.plugin) {
        const pluginRoutes = Array.from(this.routes.values()).filter(r => r.plugin === options.plugin);
        if (pluginRoutes.length >= this.managerConfig.maxRoutesPerPlugin) {
          throw new Error(`Plugin ${options.plugin} has reached maximum route limit`);
        }
      }

      // Create route object
     const route: APIRoute = {
  id: routeId,
  path: this.normalizePath(path),
  method,
  handler: this.wrapHandler(handler, options),
  middleware: options.middleware || [],
  permissions: options.permissions || [],
  roles: options.roles || [],
  ...(options.validation && { validation: options.validation }),
  ...(options.documentation && { documentation: options.documentation }),
  enabled: options.enabled !== false,
  public: !options.permissions && !options.roles,
  ...(options.plugin && { plugin: options.plugin }),
  priority: options.priority || 0,
  cache: this.resolveCacheConfig(options.cache),
};


      // Apply hooks for route registration
      const processedRoute = await this.hooks.applyFilters('api:route:register', route);
      
      // Store route
      this.routes.set(routeId, processedRoute);

      // Register with Express router
      await this.registerExpressRoute(processedRoute);

      // Initialize metrics
      if (this.managerConfig.enableMetrics) {
        this.initializeRouteMetrics(processedRoute);
      }

      // Emit registration event
      await this.events.emit(APIEventType.ROUTE_REGISTERED, {
        routeId,
        path: processedRoute.path,
        method: processedRoute.method,
        plugin: processedRoute.plugin,
        timestamp: new Date(),
      });

      this.logger.debug('Route registered successfully', {
        routeId,
        path: processedRoute.path,
        method: processedRoute.method,
        plugin: processedRoute.plugin,
      });

      return routeId;

    } catch (error) {
      this.logger.error('Route registration error:', error);
      throw error;
    }
  }
  /**
   * Register multiple routes
   */
  public async registerRoutes(routes: Array<{
    path: string;
    method: HTTPMethod;
    handler: RouteHandler;
    options?: RouteRegistrationOptions;
  }>): Promise<string[]> {
    const routeIds: string[] = [];

    for (const route of routes) {
      try {
        const routeId = await this.registerRoute(
          route.path,
          route.method,
          route.handler,
          route.options
        );
        routeIds.push(routeId);
      } catch (error) {
        this.logger.error('Failed to register route:', error);
        // Continue with other routes
      }
    }

    return routeIds;
  }

  /**
   * Register plugin routes
   */
  public async registerPluginRoutes(pluginName: string, routes: PluginRoute[]): Promise<string[]> {
    const routeIds: string[] = [];

    for (const route of routes) {
      try {
        const routeId = await this.registerRoute(
          route.path,
          route.method as HTTPMethod,
          this.createPluginHandler(route),
          {
            plugin: pluginName,
            middleware: route.middleware ? await this.resolveMiddleware(route.middleware) : [],
            permissions: route.capability ? [route.capability] : [],
          }
        );
        routeIds.push(routeId);
      } catch (error) {
        this.logger.error('Failed to register plugin route:', error);
      }
    }

    this.logger.info('Plugin routes registered', {
      plugin: pluginName,
      routes: routeIds.length,
    });

    return routeIds;
  }

  /**
   * Unregister route
   */
  public async unregisterRoute(routeId: string): Promise<boolean> {
    try {
      const route = this.routes.get(routeId);
      if (!route) {
        return false;
      }

      // Remove from router (this is complex with Express, would need route recreation)
      // For now, just disable the route
      route.enabled = false;
      this.routes.delete(routeId);

      // Remove metrics
      this.metrics.delete(routeId);

      // Emit unregistration event
      await this.events.emit(APIEventType.ROUTE_UNREGISTERED, {
        routeId,
        path: route.path,
        method: route.method,
        plugin: route.plugin,
        timestamp: new Date(),
      });

      this.logger.debug('Route unregistered', { routeId });
      return true;

    } catch (error) {
      this.logger.error('Route unregistration error:', error);
      return false;
    }
  }

  /**
   * Unregister all routes for a plugin
   */
  public async unregisterPluginRoutes(pluginName: string): Promise<number> {
    let unregistered = 0;

    for (const [routeId, route] of this.routes.entries()) {
      if (route.plugin === pluginName) {
        const success = await this.unregisterRoute(routeId);
        if (success) {
          unregistered++;
        }
      }
    }

    this.logger.info('Plugin routes unregistered', {
      plugin: pluginName,
      count: unregistered,
    });

    return unregistered;
  }

  /**
   * Register route controller
   */
  public registerController(controller: APIController): void {
    try {
      this.controllers.set(controller.name, controller);

      this.logger.debug('Controller registered', {
        name: controller.name,
        routes: controller.routes.size,
        plugin: controller.plugin,
      });

    } catch (error) {
      this.logger.error('Controller registration error:', error);
      throw error;
    }
  }

  /**
   * Create route group
   */
  public createGroup(prefix: string, middleware: MiddlewareFunction[] = []): RouteGroupBuilder {
    return new RouteGroupBuilder(this, prefix, middleware);
  }

  /**
   * Get route by ID
   */
  public getRoute(routeId: string): APIRoute | undefined {
    return this.routes.get(routeId);
  }

  /**
   * Get all routes
   */
  public getRoutes(pluginName?: string): APIRoute[] {
    const routes = Array.from(this.routes.values());
    return pluginName ? routes.filter(r => r.plugin === pluginName) : routes;
  }

  /**
   * Get route metrics
   */
  public getRouteMetrics(routeId?: string): RouteMetrics | RouteMetrics[] {
    if (routeId) {
      const metric = this.metrics.get(routeId);
      return metric ? metric : [];
    }
    return Array.from(this.metrics.values());
  }

  /**
   * Get Express router instance
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * Find matching route
   */
  public findRoute(path: string, method: HTTPMethod): APIRoute | undefined {
    for (const route of this.routes.values()) {
      if (route.method === method && this.matchPath(route.path, path)) {
        return route;
      }
    }
    return undefined;
  }

  /**
   * Clear all routes
   */
  public async clearRoutes(): Promise<void> {
    this.routes.clear();
    this.controllers.clear();
    this.routeGroups.clear();
    this.metrics.clear();
    
    // Recreate router
    this.router = Router();
    this.setupRouter();

    this.logger.info('All routes cleared');
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private setupRouter(): void {
    // Configure router options
    const options = {
      caseSensitive: this.managerConfig.caseSensitive,
      strict: this.managerConfig.strictRouting,
      mergeParams: this.managerConfig.mergeParams,
    };

    this.router = Router(options);
  }

  private async registerCoreRoutes(): Promise<void> {
    // Register core API routes like health check, metrics, etc.
    await this.registerRoute('/health', HTTPMethod.GET, this.healthCheckHandler.bind(this), {
      documentation: {
        summary: 'API Health Check',
        description: 'Returns the health status of the API',
        tags: ['system'],
        responses: {
          '200': {
            description: 'API is healthy',
          },
        },
      },
    });

    await this.registerRoute('/metrics', HTTPMethod.GET, this.metricsHandler.bind(this), {
      permissions: ['admin:access'],
      documentation: {
        summary: 'API Metrics',
        description: 'Returns API performance metrics',
        tags: ['system'],
        responses: {
          '200': {
            description: 'API metrics',
          },
        },
      },
    });
  }

  private async registerHooks(): Promise<void> {
    // Register route-related hooks
    await this.hooks.addAction(CoreHooks.API_BEFORE_REQUEST, async (req: APIRequest) => {
      if (this.managerConfig.enableMetrics) {
        req.startTime = Date.now();
      }
    });

    await this.hooks.addAction(CoreHooks.API_AFTER_REQUEST, async (req: APIRequest, res: APIResponse) => {
      if (this.managerConfig.enableMetrics && req.startTime) {
        const duration = Date.now() - req.startTime;
        await this.updateRouteMetrics(req, res, duration);
      }
    });
  }

  private wrapHandler(handler: RouteHandler, options: RouteRegistrationOptions): RouteHandler {
    return async (req: APIRequest, res: APIResponse, next) => {
      try {
        // Set request context
        req.requestId = this.generateRequestId();
        req.startTime = Date.now();
        if (options.plugin !== undefined) {
          req.plugin = options.plugin;
        }

        // Apply validation if configured
        if (this.managerConfig.enableValidation && options.validation) {
          await this.validateRequest(req, options.validation);
        }

        // Check permissions
        if (options.permissions?.length || options.roles?.length) {
          await this.checkPermissions(req, options.permissions, options.roles);
        }

        // Execute handler
        await handler(req, res, next);

      } catch (error) {
        this.logger.error('Route handler error:', error);
        next(error);
      }
    };
  }

  private async registerExpressRoute(route: APIRoute): Promise<void> {
    const expressMethod = route.method.toLowerCase() as keyof Router;
    
    if (typeof this.router[expressMethod] === 'function') {
      (this.router[expressMethod] as any)(route.path, ...(route.middleware || []), route.handler);
    }
  }

  private initializeRouteMetrics(route: APIRoute): void {
    this.metrics.set(route.id, {
      path: route.path,
      method: route.method,
      requests: 0,
      averageTime: 0,
      errors: 0,
      lastAccessed: new Date(),
    });
  }

  private async updateRouteMetrics(req: APIRequest, res: APIResponse, duration: number): Promise<void> {
    const route = this.findRoute(req.path, req.method as HTTPMethod);
    if (!route) return;

    const metrics = this.metrics.get(route.id);
    if (!metrics) return;

    metrics.requests++;
    metrics.averageTime = (metrics.averageTime * (metrics.requests - 1) + duration) / metrics.requests;
    metrics.lastAccessed = new Date();

    if (res.statusCode >= 400) {
      metrics.errors++;
    }
  }

  private createPluginHandler(route: PluginRoute): RouteHandler {
    return async (req: APIRequest, res: APIResponse, next) => {
      // This would dynamically load and execute the plugin's route handler
      // For now, return a placeholder response
      res.json({
        message: `Plugin route: ${route.path}`,
        component: route.component,
      });
    };
  }

  private async resolveMiddleware(middlewareNames: string[]): Promise<MiddlewareFunction[]> {
    // This would resolve middleware by name from the middleware manager
    // For now, return empty array
    return [];
  }

  private resolveCacheConfig(cacheOption?: boolean | number) {
    if (typeof cacheOption === 'boolean') {
      return cacheOption ? {
        enabled: true,
        ttl: this.managerConfig.defaultCacheTTL,
      } : { enabled: false, ttl: 0 };
    }

    if (typeof cacheOption === 'number') {
      return {
        enabled: true,
        ttl: cacheOption,
      };
    }

    return {
      enabled: this.managerConfig.enableCaching,
      ttl: this.managerConfig.defaultCacheTTL,
    };
  }

private async validateRequest(req: APIRequest, validation: ValidationConfig): Promise<void> {
  const errors: string[] = [];

  // Helper function to validate against custom ValidationSchema
  const validateData = (data: any, schema: any, prefix: string): string[] => {
    const fieldErrors: string[] = [];
    
    if (!schema) return fieldErrors;

    for (const [key, rule] of Object.entries(schema)) {
      const value = data?.[key];
      const fieldPath = `${prefix}.${key}`;
      
      // Type assertion to treat rule as ValidationRule
      const validationRule = rule as any;
      
      // Check if field is required
      if (validationRule.required && (value === undefined || value === null || value === '')) {
        fieldErrors.push(`${fieldPath}: Field is required`);
        continue;
      }

      // Skip validation if field is empty and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Basic type checking
      if (validationRule.type === 'string' && typeof value !== 'string') {
        fieldErrors.push(`${fieldPath}: Expected string, got ${typeof value}`);
      } else if (validationRule.type === 'number' && isNaN(Number(value))) {
        fieldErrors.push(`${fieldPath}: Expected number, got ${typeof value}`);
      } else if (validationRule.type === 'email' && typeof value === 'string') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          fieldErrors.push(`${fieldPath}: Invalid email format`);
        }
      } else if (validationRule.type === 'objectid' && typeof value === 'string') {
        if (!/^[a-fA-F0-9]{24}$/.test(value)) {
          fieldErrors.push(`${fieldPath}: Invalid ObjectId format`);
        }
      }

      // Length validation for strings
      if (typeof value === 'string') {
        if (validationRule.minLength && value.length < validationRule.minLength) {
          fieldErrors.push(`${fieldPath}: Minimum length is ${validationRule.minLength}`);
        }
        if (validationRule.maxLength && value.length > validationRule.maxLength) {
          fieldErrors.push(`${fieldPath}: Maximum length is ${validationRule.maxLength}`);
        }
      }

      // Pattern validation
      if (validationRule.pattern && typeof value === 'string') {
        const regex = typeof validationRule.pattern === 'string' 
          ? new RegExp(validationRule.pattern) 
          : validationRule.pattern;
        if (!regex.test(value)) {
          fieldErrors.push(`${fieldPath}: Does not match required pattern`);
        }
      }
    }

    return fieldErrors;
  };

  // Validate each section
  if (validation.params) {
    const paramErrors = validateData(req.params, validation.params, 'params');
    errors.push(...paramErrors);
  }

  if (validation.query) {
    const queryErrors = validateData(req.query, validation.query, 'query');
    errors.push(...queryErrors);
  }

  if (validation.body) {
    const bodyErrors = validateData(req.body, validation.body, 'body');
    errors.push(...bodyErrors);
  }

  if (validation.headers) {
    const headerErrors = validateData(req.headers, validation.headers, 'headers');
    errors.push(...headerErrors);
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
}

  private async checkPermissions(
    req: APIRequest,
    permissions?: string[],
    roles?: UserRole[]
  ): Promise<void> {
    if (!req.user) {
      throw new Error('Authentication required');
    }

    // Check roles
    if (roles?.length && !roles.includes(req.user.role)) {
      throw new Error('Insufficient role permissions');
    }

    // Check permissions
    if (permissions?.length) {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new Error('User not found');
      }

      for (const permission of permissions) {
        const hasPermission = await this.permissions.hasPermission(user, permission);
        if (!hasPermission.granted) {
          throw new Error(`Missing permission: ${permission}`);
        }
      }
    }
  }

  private generateRouteId(path: string, method: HTTPMethod, plugin?: string): string {
    const base = `${method}:${path}`;
    return plugin ? `${plugin}:${base}` : base;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizePath(path: string): string {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Remove trailing slash unless it's root
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    return path;
  }

  private matchPath(routePath: string, requestPath: string): boolean {
    // Simple path matching - in production, you'd use a proper router matcher
    const routeSegments = routePath.split('/');
    const requestSegments = requestPath.split('/');

    if (routeSegments.length !== requestSegments.length) {
      return false;
    }

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const requestSegment = requestSegments[i];

      // Parameter segment (starts with :)
      if (routeSegment && routeSegment.startsWith(':')) {
        continue;
      }

      // Exact match required
      if (routeSegment !== requestSegment) {
        return false;
      }
    }

    return true;
  }

  private async healthCheckHandler(req: APIRequest, res: APIResponse): Promise<void> {
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      version: '1.0.0',
    });
  }

  private async metricsHandler(req: APIRequest, res: APIResponse): Promise<void> {
    const metrics = Array.from(this.metrics.values());
    res.json({
      routes: metrics,
      summary: {
        totalRoutes: this.routes.size,
        totalRequests: metrics.reduce((sum, m) => sum + m.requests, 0),
        totalErrors: metrics.reduce((sum, m) => sum + m.errors, 0),
        averageResponseTime: metrics.reduce((sum, m) => sum + m.averageTime, 0) / metrics.length || 0,
      },
    });
  }
}

/**
 * Route Group Builder
 * Helper class for building route groups with common prefixes and middleware
 */
export class RouteGroupBuilder {
  private routes: Array<{
    path: string;
    method: HTTPMethod;
    handler: RouteHandler;
    options?: RouteRegistrationOptions;
  }> = [];

  constructor(
    private routeManager: RouteManager,
    private prefix: string,
    private middleware: MiddlewareFunction[] = []
  ) {}

  /**
   * Add route to group
   */
  public route(
    path: string,
    method: HTTPMethod,
    handler: RouteHandler,
    options: RouteRegistrationOptions = {}
  ): RouteGroupBuilder {
    this.routes.push({
      path: this.prefix + path,
      method,
      handler,
      options: {
        ...options,
        middleware: [...this.middleware, ...(options.middleware || [])],
      },
    });

    return this;
  }

  /**
   * Add GET route
   */
  public get(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): RouteGroupBuilder {
    return this.route(path, HTTPMethod.GET, handler, options);
  }

  /**
   * Add POST route
   */
  public post(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): RouteGroupBuilder {
    return this.route(path, HTTPMethod.POST, handler, options);
  }

  /**
   * Add PUT route
   */
  public put(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): RouteGroupBuilder {
    return this.route(path, HTTPMethod.PUT, handler, options);
  }

  /**
   * Add DELETE route
   */
  public delete(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): RouteGroupBuilder {
    return this.route(path, HTTPMethod.DELETE, handler, options);
  }

  /**
   * Register all routes in the group
   */
  public async register(): Promise<string[]> {
    return this.routeManager.registerRoutes(this.routes);
  }
}