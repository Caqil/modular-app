// ===================================================================
// MIDDLEWARE MANAGER - MIDDLEWARE ORCHESTRATION SYSTEM
// ===================================================================

import { Request, Response, NextFunction } from 'express';
import rateLimit, { 
  ValueDeterminingMiddleware, 
  RateLimitRequestHandler 
} from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { CacheManager } from '../cache/cache-manager';
import { AuthManager } from '../auth/auth-manager';
import { PermissionManager } from '../auth/permission-manager';
import { Validator } from '../utils/validator';
import { Sanitizer } from '../utils/sanitizer';
import { User, type IUser } from '../database/models';
import { UserRole } from '../types/user';
import {
  APIMiddleware,
  MiddlewareFunction,
  APIRequest,
  APIResponse,
  MiddlewareCondition,
  RateLimitConfig,
  CORS_Options,
  APIEventType,
  APIError,
  HTTPMethod,
} from './api-types';

export interface MiddlewareManagerConfig {
  enableGlobalMiddleware: boolean;
  enableSecurity: boolean;
  enableCors: boolean;
  enableRateLimit: boolean;
  enableCompression: boolean;
  enableLogging: boolean;
  enableValidation: boolean;
  enableAuthentication: boolean;
  enableAuthorization: boolean;
  enableCaching: boolean;
  maxMiddlewarePerRoute: number;
  middlewareTimeout: number;
}

export interface SecurityConfig {
  helmet: {
    enabled: boolean;
    options?: any;
  };
  compression: {
    enabled: boolean;
    options?: any;
  };
  bodyParser: {
    json: { limit: string };
    urlencoded: { limit: string; extended: boolean };
    raw?: { limit: string };
    text?: { limit: string };
  };
}

export interface MiddlewareExecutionContext {
  requestId: string;
  startTime: number;
  route?: string;
  method: HTTPMethod;
  user?: any;
  plugin?: string;
  metadata: Record<string, any>;
}

/**
 * Middleware Manager
 * Manages middleware registration, execution order, and lifecycle
 */
export class MiddlewareManager {
  private static instance: MiddlewareManager;
  private logger = new Logger('MiddlewareManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private cache = CacheManager.getInstance();
  private auth = AuthManager.getInstance();
  private permissions = PermissionManager.getInstance();
  private initialized = false;
  private middleware = new Map<string, APIMiddleware>();
  private globalMiddleware: APIMiddleware[] = [];
  private managerConfig: MiddlewareManagerConfig;

  private readonly defaultConfig: MiddlewareManagerConfig = {
    enableGlobalMiddleware: true,
    enableSecurity: true,
    enableCors: true,
    enableRateLimit: true,
    enableCompression: true,
    enableLogging: true,
    enableValidation: true,
    enableAuthentication: true,
    enableAuthorization: true,
    enableCaching: true,
    maxMiddlewarePerRoute: 50,
    middlewareTimeout: 30000, // 30 seconds
  };

  private constructor() {
    this.managerConfig = this.defaultConfig;
  }

  public static getInstance(): MiddlewareManager {
    if (!MiddlewareManager.instance) {
      MiddlewareManager.instance = new MiddlewareManager();
    }
    return MiddlewareManager.instance;
  }

  /**
   * Initialize middleware manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Middleware manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing middleware manager...');

      // Load configuration
      const config = await this.config.get<MiddlewareManagerConfig>('middleware');
      this.managerConfig = { ...this.defaultConfig, ...config };

      // Register core middleware
      await this.registerCoreMiddleware();

      // Setup global middleware chain
      if (this.managerConfig.enableGlobalMiddleware) {
        await this.setupGlobalMiddleware();
      }

      this.initialized = true;
      this.logger.info('Middleware manager initialized successfully', {
        middleware: this.middleware.size,
        global: this.globalMiddleware.length,
      });

    } catch (error) {
      this.logger.error('Failed to initialize middleware manager:', error);
      throw error;
    }
  }

  /**
   * Register middleware
   */
  public registerMiddleware(middleware: APIMiddleware): void {
    try {
      // Validate middleware
      this.validateMiddleware(middleware);

      // Store middleware
      this.middleware.set(middleware.name, middleware);

      // Add to global middleware if specified
      if (middleware.global) {
        this.addToGlobalMiddleware(middleware);
      }

      // Emit registration event
      this.events.emit(APIEventType.MIDDLEWARE_REGISTERED, {
        name: middleware.name,
        global: middleware.global,
        plugin: middleware.plugin,
        timestamp: new Date(),
      });

      this.logger.debug('Middleware registered', {
        name: middleware.name,
        global: middleware.global,
        plugin: middleware.plugin,
      });

    } catch (error) {
      this.logger.error('Middleware registration error:', error);
      throw error;
    }
  }

  /**
   * Unregister middleware
   */
  public unregisterMiddleware(name: string): boolean {
    try {
      const middleware = this.middleware.get(name);
      if (!middleware) {
        return false;
      }

      // Remove from global middleware
      if (middleware.global) {
        this.removeFromGlobalMiddleware(name);
      }

      // Remove from store
      this.middleware.delete(name);

      // Emit unregistration event
      this.events.emit(APIEventType.MIDDLEWARE_UNREGISTERED, {
        name,
        timestamp: new Date(),
      });

      this.logger.debug('Middleware unregistered', { name });
      return true;

    } catch (error) {
      this.logger.error('Middleware unregistration error:', error);
      return false;
    }
  }

  /**
   * Get middleware by name
   */
  public getMiddleware(name: string): APIMiddleware | undefined {
    return this.middleware.get(name);
  }

  /**
   * Get all middleware
   */
  public getAllMiddleware(): APIMiddleware[] {
    return Array.from(this.middleware.values());
  }

  /**
   * Get global middleware chain
   */
  public getGlobalMiddleware(): MiddlewareFunction[] {
    return this.globalMiddleware
      .filter(m => m.enabled)
      .sort((a, b) => b.priority - a.priority)
      .map(m => this.wrapMiddleware(m));
  }

  /**
   * Get middleware for specific route
   */
  public getRouteMiddleware(
    path: string,
    method: HTTPMethod,
    middlewareNames: string[] = []
  ): MiddlewareFunction[] {
    const routeMiddleware: MiddlewareFunction[] = [];

    // Add specified middleware
    for (const name of middlewareNames) {
      const middleware = this.middleware.get(name);
      if (middleware && this.shouldApplyMiddleware(middleware, path, method)) {
        routeMiddleware.push(this.wrapMiddleware(middleware));
      }
    }

    return routeMiddleware;
  }

  /**
   * Create authentication middleware
   */
  public createAuthMiddleware(required: boolean = true): MiddlewareFunction {
    return async (req: APIRequest, res: APIResponse, next: NextFunction) => {
      try {
        const token = this.extractAuthToken(req);
        
        if (!token) {
          if (required) {
            return this.unauthorizedResponse(res, 'Authentication token required');
          }
          return next();
        }

        // Validate token
        const authResult = await this.auth.validateToken(token);
        
        if (!authResult.success) {
          return this.unauthorizedResponse(res, 'Invalid authentication token');
        }

        // Set user in request
        req.user = {
          id: authResult.user!.id,
          email: authResult.user!.email,
          username: authResult.user!.username,
          role: authResult.user!.role,
          permissions: authResult.user!.permissions,
        };

        next();

      } catch (error) {
        this.logger.error('Authentication middleware error:', error);
        return this.unauthorizedResponse(res, 'Authentication failed');
      }
    };
  }

  /**
   * Create authorization middleware
   */
  public createAuthorizationMiddleware(
    permissions: string[] = [],
    roles: UserRole[] = []
  ): MiddlewareFunction {
    return async (req: APIRequest, res: APIResponse, next: NextFunction) => {
      try {
        if (!req.user) {
          return this.forbiddenResponse(res, 'Authentication required');
        }

        // Check roles
        if (roles.length > 0 && !roles.includes(req.user.role)) {
          return this.forbiddenResponse(res, 'Insufficient role permissions');
        }

        // Check permissions
        if (permissions.length > 0) {
          const user = await User.findById(req.user.id);
          if (!user) {
            return this.forbiddenResponse(res, 'User not found');
          }

          for (const permission of permissions) {
            const hasPermission = await this.permissions.hasPermission(user, permission);
            if (!hasPermission.granted) {
              return this.forbiddenResponse(res, `Missing permission: ${permission}`);
            }
          }
        }

        req.permissions = permissions;
        next();

      } catch (error) {
        this.logger.error('Authorization middleware error:', error);
        return this.forbiddenResponse(res, 'Authorization failed');
      }
    };
  }

  /**
   * Create rate limiting middleware
   */
  public createRateLimitMiddleware(config: RateLimitConfig): MiddlewareFunction {
    const limiter = rateLimit({
      windowMs: config.windowMs,
      max: config.maxRequests,
      skipSuccessfulRequests: config.skipSuccessfulRequests,
      skipFailedRequests: config.skipFailedRequests,
      keyGenerator: config.keyGenerator || ((req: APIRequest) => req.ip),
      handler: (req: APIRequest, res: APIResponse) => {
        // Emit rate limit event
        this.events.emit(APIEventType.RATE_LIMIT_EXCEEDED, {
          ip: req.ip,
          path: req.path,
          method: req.method,
          timestamp: new Date(),
        });

        if (config.onLimitReached) {
          config.onLimitReached(req, res);
        } else {
          res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
              retryAfter: Math.ceil(config.windowMs / 1000),
            },
          });
        }
      },
    });

    return limiter as MiddlewareFunction;
  }

  /**
   * Create validation middleware
   */
  public createValidationMiddleware(schema: any): MiddlewareFunction {
    return async (req: APIRequest, res: APIResponse, next: NextFunction) => {
      try {
        // Validate request data
        const validationResult = Validator.validate(req.body, schema);

        if (!validationResult.success) {
          // Emit validation failed event
          await this.events.emit(APIEventType.VALIDATION_FAILED, {
            path: req.path,
            method: req.method,
            errors: validationResult.errors,
            timestamp: new Date(),
          });

          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Request validation failed',
              details: { errors: validationResult.errors },
            },
          });
          return;
        }

        // Sanitize validated data
        req.body = Sanitizer.sanitizeJson(req.body);
        next();

      } catch (error) {
        this.logger.error('Validation middleware error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation processing failed',
          },
        });
        return;
      }
    };
  }

  /**
   * Create caching middleware
   */
  public createCacheMiddleware(ttl: number = 300, keyGenerator?: (req: APIRequest) => string): MiddlewareFunction {
    return async (req: APIRequest, res: APIResponse, next: NextFunction) => {
      try {
        // Only cache GET requests
        if (req.method !== 'GET') {
          return next();
        }

        // Generate cache key
        const cacheKey = keyGenerator ? keyGenerator(req) : `api:${req.path}:${JSON.stringify(req.query)}`;

        // Try to get from cache
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          // Emit cache hit event
          await this.events.emit(APIEventType.CACHE_HIT, {
            key: cacheKey,
            path: req.path,
            timestamp: new Date(),
          });

          return res.json({
            ...cached,
            meta: {
              ...cached.meta,
              cached: true,
              cacheKey,
            },
          });
        }

        // Emit cache miss event
        await this.events.emit(APIEventType.CACHE_MISS, {
          key: cacheKey,
          path: req.path,
          timestamp: new Date(),
        });

        // Override res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
          // Cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.cache.set(cacheKey, body, ttl).catch(error => {
              this.logger.error('Cache set error:', error);
            });
          }
          return originalJson(body);
        };MiddlewareManager.bind(this);

        next();

      } catch (error) {
        this.logger.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Create logging middleware
   */
  public createLoggingMiddleware(): MiddlewareFunction {
    return (req: APIRequest, res: APIResponse, next: NextFunction) => {
      const startTime = Date.now();
      req.requestId = req.requestId || this.generateRequestId();

      // Log request
      this.logger.info('API Request', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user?.id,
      });

      // Override res.end to log response
      const originalEnd = res.end.bind(res);
      res.end = (...args: any[]) => {
        const duration = Date.now() - startTime;
        
        // Log response
        this.logger.info('API Response', {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          user: req.user?.id,
        });

        // Emit request end event
        this.events.emit(APIEventType.REQUEST_END, {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          userId: req.user?.id,
          timestamp: new Date(),
        });

        return originalEnd(...args);
      };MiddlewareManager.bind(this);

      next();
    };
  }

  /**
   * Create error handling middleware
   */
  // Use the correct signature for error-handling middleware, not MiddlewareFunction
  public createErrorMiddleware(): (error: any, req: APIRequest, res: APIResponse, next: NextFunction) => void {
    return (error: any, req: APIRequest, res: APIResponse, next: NextFunction) => {
      this.logger.error('API Error:', {
        error,
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        user: req.user?.id,
      });

      // Emit error event
      this.events.emit(APIEventType.REQUEST_ERROR, {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        timestamp: new Date(),
      });

      // Determine status code
      let statusCode = 500;
      let code = 'INTERNAL_SERVER_ERROR';
      let message = 'An unexpected error occurred';

      if (error.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = error.message;
      } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        code = 'UNAUTHORIZED';
        message = 'Authentication required';
      } else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        code = 'FORBIDDEN';
        message = 'Access denied';
      } else if (error.statusCode) {
        statusCode = error.statusCode;
        code = error.code || 'API_ERROR';
        message = error.message;
      }

      const apiError: APIError = {
        code,
        message,
        statusCode,
        timestamp: new Date(),
        requestId: req.requestId ?? '',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      };

      res.status(statusCode).json({
        success: false,
        error: apiError,
      });
    };
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private async registerCoreMiddleware(): Promise<void> {
    // Security middleware
    if (this.managerConfig.enableSecurity) {
      this.registerMiddleware({
        name: 'helmet',
        handler: helmet(),
        priority: 1000,
        global: true,
        enabled: true,
      });

      this.registerMiddleware({
        name: 'compression',
        handler: compression(),
        priority: 900,
        global: true,
        enabled: true,
      });
    }

    // CORS middleware
    if (this.managerConfig.enableCors) {
      const corsConfig = await this.config.get<CORS_Options>('cors');
      this.registerMiddleware({
        name: 'cors',
        handler: cors(corsConfig),
        priority: 800,
        global: true,
        enabled: true,
      });
    }

    // Logging middleware
    if (this.managerConfig.enableLogging) {
      this.registerMiddleware({
        name: 'logging',
        handler: this.createLoggingMiddleware(),
        priority: 700,
        global: true,
        enabled: true,
      });
    }

    // Error handling middleware (should be last)
    // Do NOT register error-handling middleware as a normal middleware.
    // It should be added separately in your Express app after all other middleware.
  }

  private async setupGlobalMiddleware(): Promise<void> {
    // Sort global middleware by priority
    this.globalMiddleware.sort((a, b) => b.priority - a.priority);
  }

  private validateMiddleware(middleware: APIMiddleware): void {
    if (!middleware.name) {
      throw new Error('Middleware name is required');
    }

    if (!middleware.handler) {
      throw new Error('Middleware handler is required');
    }

    if (this.middleware.has(middleware.name)) {
      throw new Error(`Middleware '${middleware.name}' already registered`);
    }
  }

  private addToGlobalMiddleware(middleware: APIMiddleware): void {
    this.globalMiddleware.push(middleware);
    this.globalMiddleware.sort((a, b) => b.priority - a.priority);
  }

  private removeFromGlobalMiddleware(name: string): void {
    this.globalMiddleware = this.globalMiddleware.filter(m => m.name !== name);
  }

  private wrapMiddleware(middleware: APIMiddleware): MiddlewareFunction {
    return async (req: APIRequest, res: APIResponse, next: NextFunction) => {
      try {
        // Check if middleware should be applied
        if (!this.shouldApplyMiddleware(middleware, req.path, req.method as HTTPMethod)) {
          return next();
        }

        // Set timeout
        const timeout = setTimeout(() => {
          const error = new Error(`Middleware '${middleware.name}' timed out`);
          next(error);
        }, this.managerConfig.middlewareTimeout);

        // Execute middleware
        await middleware.handler(req, res, (error?: any) => {
          clearTimeout(timeout);
          next(error);
        });

      } catch (error) {
        this.logger.error(`Middleware '${middleware.name}' error:`, error);
        next(error);
      }
    };
  }

  private shouldApplyMiddleware(
    middleware: APIMiddleware,
    path: string,
    method: HTTPMethod
  ): boolean {
    if (!middleware.enabled) {
      return false;
    }

    if (!middleware.conditions) {
      return true;
    }

    return middleware.conditions.every(condition => 
      this.evaluateCondition(condition, path, method)
    );
  }

  private evaluateCondition(
    condition: MiddlewareCondition,
    path: string,
    method: HTTPMethod
  ): boolean {
    let value: any;

    switch (condition.type) {
      case 'path':
        value = path;
        break;
      case 'method':
        value = method;
        break;
      default:
        return true;
    }

    return this.compareValues(value, condition.value, condition.operator);
  }

  private compareValues(actual: any, expected: any, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return typeof actual === 'string' && actual.includes(expected);
      case 'regex':
        return new RegExp(expected).test(actual);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        return true;
    }
  }

  private extractAuthToken(req: APIRequest): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check query parameter
    if (req.query.token && typeof req.query.token === 'string') {
      return req.query.token;
    }

    return null;
  }

  private unauthorizedResponse(res: APIResponse, message: string): void {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
        statusCode: 401,
        timestamp: new Date(),
      },
    });
  }

  private forbiddenResponse(res: APIResponse, message: string): void {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message,
        statusCode: 403,
        timestamp: new Date(),
      },
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}