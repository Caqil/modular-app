// ===================================================================
// API MANAGER - MAIN API ORCHESTRATION SYSTEM
// ===================================================================

import express, { Express, Router } from 'express';
import { createServer, Server } from 'http';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { CacheManager } from '../cache/cache-manager';
import { HookManager } from '../hooks/hook-manager';
import { AuthManager } from '../auth/auth-manager';
import { PermissionManager } from '../auth/permission-manager';
import { RouteManager } from './route-manager';
import { MiddlewareManager } from './middleware-manager';
import { CoreHooks } from '../hooks/hook-types';
import { User, Post, Page, Media, type IUser } from '../database/models';
import { ContentStatus, ContentType } from '../types/content';
import { PluginRoute } from '../types/plugin';
import {
  APIConfig,
  APIMetrics,
  APIHealth,
  APIEventType,
  HTTPMethod,
  APIRequest,
  APIResponse,
  ResponseMetadata,
} from './api-types';

export interface APIManagerConfig extends APIConfig {
  enableSwagger: boolean;
  enableGraphQL: boolean;
  enableWebhooks: boolean;
  enableRealtime: boolean;
  enableFileUploads: boolean;
  maxRequestSize: string;
  requestTimeout: number;
  enableGracefulShutdown: boolean;
  shutdownTimeout: number;
}

export interface APIServerInfo {
  name: string;
  version: string;
  description: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  startTime: Date;
  uptime: number;
  endpoints: number;
  requests: number;
  port: number;
  host: string;
}

/**
 * API Manager
 * Central orchestration system for all API operations and HTTP server management
 */
export class APIManager {
  private static instance: APIManager;
  private logger = new Logger('APIManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private cache = CacheManager.getInstance();
  private hooks = HookManager.getInstance();
  private auth = AuthManager.getInstance();
  private permissions = PermissionManager.getInstance();
  private routes = RouteManager.getInstance();
  private middleware = MiddlewareManager.getInstance();
  private initialized = false;
  private app: Express;
  private server: Server | null = null;
  private managerConfig: APIManagerConfig;
  private metrics: APIMetrics;
  private startTime = new Date();

  private readonly defaultConfig: APIManagerConfig = {
    enabled: true,
    version: '1.0.0',
    baseUrl: '/api/v1',
    port: 3000,
    host: '0.0.0.0',
    cors: {
      enabled: true,
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: false,
    },
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    security: {
      helmet: true,
      compression: true,
      bodyParser: {
        json: { limit: '50mb' },
        urlencoded: { limit: '50mb', extended: true },
      },
    },
    documentation: {
      enabled: true,
      path: '/docs',
      title: 'Modular App API',
      description: 'RESTful API for Modular App CMS',
      version: '1.0.0',
    },
    monitoring: {
      enabled: true,
      metricsPath: '/metrics',
      healthPath: '/health',
    },
    enableSwagger: true,
    enableGraphQL: false,
    enableWebhooks: true,
    enableRealtime: false,
    enableFileUploads: true,
    maxRequestSize: '50mb',
    requestTimeout: 30000,
    enableGracefulShutdown: true,
    shutdownTimeout: 10000,
  };

  private constructor() {
    this.managerConfig = this.defaultConfig;
    this.app = express();
    this.metrics = this.initializeMetrics();
  }

  public static getInstance(): APIManager {
    if (!APIManager.instance) {
      APIManager.instance = new APIManager();
    }
    return APIManager.instance;
  }

  /**
   * Initialize API manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('API manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing API manager...');

      // Load configuration
      const config = await this.config.get<APIManagerConfig>('api');
      this.managerConfig = { ...this.defaultConfig, ...config };

      // Initialize sub-managers
      await this.initializeSubManagers();

      // Setup Express application
      await this.setupExpressApp();

      // Register core API endpoints
      await this.registerCoreEndpoints();

      // Register content API endpoints
      await this.registerContentEndpoints();

      // Register user API endpoints
      await this.registerUserEndpoints();

      // Register plugin API endpoints
      await this.registerPluginEndpoints();

      // Setup error handling
      this.setupErrorHandling();

      // Register hooks
      await this.registerHooks();

      this.initialized = true;
      this.logger.info('API manager initialized successfully', {
        baseUrl: this.managerConfig.baseUrl,
        port: this.managerConfig.port,
        endpoints: this.routes.getRoutes().length,
      });

    } catch (error) {
      this.logger.error('Failed to initialize API manager:', error);
      throw error;
    }
  }

  /**
   * Start API server
   */
  public async start(): Promise<void> {
    if (!this.initialized) {
      throw new Error('API manager not initialized');
    }

    if (this.server) {
      this.logger.warn('API server already running');
      return;
    }

    try {
      this.logger.info('Starting API server...', {
        port: this.managerConfig.port,
        host: this.managerConfig.host,
      });

      // Create HTTP server
      this.server = createServer(this.app);

      // Setup server event handlers
      this.setupServerEvents();

      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.managerConfig.port, this.managerConfig.host, () => {
          resolve();
        });

        this.server!.on('error', reject);
      });

      // Setup graceful shutdown
      if (this.managerConfig.enableGracefulShutdown) {
        this.setupGracefulShutdown();
      }

      // Emit server start event
      await this.events.emit(APIEventType.SERVER_START, {
        port: this.managerConfig.port,
        host: this.managerConfig.host,
        timestamp: new Date(),
      });

      this.logger.info('API server started successfully', {
        port: this.managerConfig.port,
        host: this.managerConfig.host,
        baseUrl: this.managerConfig.baseUrl,
      });

    } catch (error) {
      this.logger.error('Failed to start API server:', error);
      throw error;
    }
  }

  /**
   * Stop API server
   */
  public async stop(): Promise<void> {
    if (!this.server) {
      this.logger.warn('API server not running');
      return;
    }

    try {
      this.logger.info('Stopping API server...');

      // Emit server stop event
      await this.events.emit(APIEventType.SERVER_STOP, {
        timestamp: new Date(),
      });

      // Close server
      await new Promise<void>((resolve, reject) => {
        this.server!.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.server = null;
      this.logger.info('API server stopped successfully');

    } catch (error) {
      this.logger.error('Failed to stop API server:', error);
      throw error;
    }
  }

  /**
   * Register plugin routes
   */
  public async registerPluginRoutes(pluginName: string, routes: PluginRoute[]): Promise<void> {
    try {
      await this.routes.registerPluginRoutes(pluginName, routes);
      
      this.logger.info('Plugin routes registered', {
        plugin: pluginName,
        routes: routes.length,
      });

    } catch (error) {
      this.logger.error('Failed to register plugin routes:', error);
      throw error;
    }
  }

  /**
   * Unregister plugin routes
   */
  public async unregisterPluginRoutes(pluginName: string): Promise<void> {
    try {
      const count = await this.routes.unregisterPluginRoutes(pluginName);
      
      this.logger.info('Plugin routes unregistered', {
        plugin: pluginName,
        count,
      });

    } catch (error) {
      this.logger.error('Failed to unregister plugin routes:', error);
      throw error;
    }
  }

  /**
   * Get API metrics
   */
  public getMetrics(): APIMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime.getTime(),
      lastReset: this.startTime,
    };
  }

  /**
   * Get API health status
   */
  public async getHealth(): Promise<APIHealth> {
    try {
      const health: APIHealth = {
        status: 'healthy',
        version: this.managerConfig.version,
        uptime: Date.now() - this.startTime.getTime(),
        timestamp: new Date(),
        services: {},
        dependencies: {},
      };

      // Check database
      try {
        await User.findOne().limit(1);
        health.services.database = {
          status: 'up',
          lastCheck: new Date(),
        };
      } catch (error) {
        health.services.database = {
          status: 'down',
          error:  error instanceof Error ? error.message : String(error),
          lastCheck: new Date(),
        };
        health.status = 'degraded';
      }

      // Check cache
      try {
        await this.cache.set('health:test', 'test', 10);
        await this.cache.get('health:test');
        health.services.cache = {
          status: 'up',
          lastCheck: new Date(),
        };
      } catch (error) {
        health.services.cache = {
          status: 'down',
          error:  error instanceof Error ? error.message : String(error),
          lastCheck: new Date(),
        };
        health.status = 'degraded';
      }

      // Check authentication
      try {
        const authHealth = await this.auth.healthCheck();
        health.services.authentication = {
          status: authHealth.healthy ? 'up' : 'down',
          lastCheck: new Date(),
        };
      } catch (error) {
        health.services.authentication = {
          status: 'down',
          error: error instanceof Error ?  error instanceof Error ? error.message : String(error) : String(error),
          lastCheck: new Date(),
        };
        health.status = 'degraded';
      }

      return health;

    } catch (error) {
      this.logger.error('Health check error:', error);
      return {
        status: 'unhealthy',
        version: this.managerConfig.version,
        uptime: Date.now() - this.startTime.getTime(),
        timestamp: new Date(),
        services: {},
        dependencies: {},
      };
    }
  }

  /**
   * Get server info
   */
  public getServerInfo(): APIServerInfo {
    return {
      name: 'Modular App API',
      version: this.managerConfig.version,
      description: 'RESTful API for Modular App CMS',
      status: this.server ? 'running' : 'stopped',
      startTime: this.startTime,
      uptime: Date.now() - this.startTime.getTime(),
      endpoints: this.routes.getRoutes().length,
      requests: this.metrics.requests.total,
      port: this.managerConfig.port,
      host: this.managerConfig.host,
    };
  }

  /**
   * Get Express app instance
   */
  public getApp(): Express {
    return this.app;
  }

  /**
   * Shutdown API manager
   */
  public async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down API manager...');

      // Stop server
      if (this.server) {
        await this.stop();
      }

      // Shutdown sub-managers
      await this.routes.clearRoutes();

      this.initialized = false;
      this.logger.info('API manager shutdown complete');

    } catch (error) {
      this.logger.error('API manager shutdown error:', error);
      throw error;
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private async initializeSubManagers(): Promise<void> {
    // Initialize in correct order
    await this.middleware.initialize();
    await this.routes.initialize();
  }

  private async setupExpressApp(): Promise<void> {
    // Set request timeout
    this.app.use((req, res, next) => {
      req.setTimeout(this.managerConfig.requestTimeout);
      next();
    });

    // Body parsing middleware
    this.app.use(express.json(this.managerConfig.security.bodyParser.json));
    this.app.use(express.urlencoded(this.managerConfig.security.bodyParser.urlencoded));

    // Apply global middleware
    const globalMiddleware = this.middleware.getGlobalMiddleware();
    for (const middleware of globalMiddleware) {
      // Ensure middleware conforms to Express.RequestHandler
      this.app.use(middleware as express.RequestHandler);
    }

    // Mount API router
    this.app.use(this.managerConfig.baseUrl, this.routes.getRouter());

    // Setup documentation if enabled
    if (this.managerConfig.documentation.enabled && this.managerConfig.enableSwagger) {
      await this.setupDocumentation();
    }
  }

  private async setupDocumentation(): Promise<void> {
    // This would setup Swagger/OpenAPI documentation
    // For now, just register a simple endpoint
    this.app.get(this.managerConfig.documentation.path, (req, res) => {
      res.json({
        title: this.managerConfig.documentation.title,
        description: this.managerConfig.documentation.description,
        version: this.managerConfig.documentation.version,
        endpoints: this.routes.getRoutes().map(route => ({
          path: route.path,
          method: route.method,
          description: route.documentation?.summary,
        })),
      });
    });
  }

  private async registerCoreEndpoints(): Promise<void> {
    // Health check endpoint
    await this.routes.registerRoute('/health', HTTPMethod.GET, async (req, res) => {
      const health = await this.getHealth();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });

    // Metrics endpoint
    await this.routes.registerRoute('/metrics', HTTPMethod.GET, async (req, res) => {
      const metrics = this.getMetrics();
      res.json(metrics);
    }, {
      permissions: ['admin:access'],
    });

    // Server info endpoint
    await this.routes.registerRoute('/info', HTTPMethod.GET, async (req, res) => {
      const info = this.getServerInfo();
      res.json(info);
    });
  }

  private async registerContentEndpoints(): Promise<void> {
    // Posts endpoints
    const postsGroup = this.routes.createGroup('/posts');

    await postsGroup
      .get('', this.getPostsHandler.bind(this))
      .get('/:id', this.getPostHandler.bind(this))
      .post('', this.createPostHandler.bind(this), {
        permissions: ['content:create'],
        validation: {
          body: {
            title: { type: 'string', required: true, minLength: 1, maxLength: 200 },
            content: { type: 'string', required: true },
            excerpt: { type: 'string', maxLength: 500 },
            status: { type: 'string', enum: Object.values(ContentStatus) },
            categories: { type: 'array' },
            tags: { type: 'array' },
          },
        },
      })
      .put('/:id', this.updatePostHandler.bind(this), {
        permissions: ['content:update'],
      })
      .delete('/:id', this.deletePostHandler.bind(this), {
        permissions: ['content:delete'],
      })
      .register();

    // Pages endpoints
    const pagesGroup = this.routes.createGroup('/pages');

    await pagesGroup
      .get('', this.getPagesHandler.bind(this))
      .get('/:id', this.getPageHandler.bind(this))
      .post('', this.createPageHandler.bind(this), {
        permissions: ['content:create'],
      })
      .put('/:id', this.updatePageHandler.bind(this), {
        permissions: ['content:update'],
      })
      .delete('/:id', this.deletePageHandler.bind(this), {
        permissions: ['content:delete'],
      })
      .register();

    // Media endpoints
    const mediaGroup = this.routes.createGroup('/media');

    await mediaGroup
      .get('', this.getMediaHandler.bind(this))
      .get('/:id', this.getMediaItemHandler.bind(this))
      .post('', this.uploadMediaHandler.bind(this), {
        permissions: ['media:upload'],
      })
      .delete('/:id', this.deleteMediaHandler.bind(this), {
        permissions: ['media:delete'],
      })
      .register();
  }

  private async registerUserEndpoints(): Promise<void> {
    const usersGroup = this.routes.createGroup('/users');

    await usersGroup
      .get('', this.getUsersHandler.bind(this), {
        permissions: ['user:read'],
      })
      .get('/:id', this.getUserHandler.bind(this), {
        permissions: ['user:read'],
      })
      .post('', this.createUserHandler.bind(this), {
        permissions: ['user:create'],
      })
      .put('/:id', this.updateUserHandler.bind(this), {
        permissions: ['user:update'],
      })
      .delete('/:id', this.deleteUserHandler.bind(this), {
        permissions: ['user:delete'],
      })
      .register();
  }

  private async registerPluginEndpoints(): Promise<void> {
    // Authentication endpoints
    const authGroup = this.routes.createGroup('/auth');

    await authGroup
      .post('/login', this.loginHandler.bind(this))
      .post('/register', this.registerHandler.bind(this))
      .post('/logout', this.logoutHandler.bind(this))
      .post('/refresh', this.refreshTokenHandler.bind(this))
      .post('/forgot-password', this.forgotPasswordHandler.bind(this))
      .post('/reset-password', this.resetPasswordHandler.bind(this))
      .register();
  }

  private setupErrorHandling(): void {
    // Global error handler (should be last middleware)
    this.app.use(this.middleware.createErrorMiddleware() as express.ErrorRequestHandler);

    // Handle 404
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
          statusCode: 404,
          timestamp: new Date(),
        },
      });
    });
  }

  private setupServerEvents(): void {
    if (!this.server) return;

    this.server.on('listening', () => {
      this.logger.info('Server listening', {
        port: this.managerConfig.port,
        host: this.managerConfig.host,
      });
    });

    this.server.on('error', (error: any) => {
      this.logger.error('Server error:', error);
      this.events.emit(APIEventType.SERVER_ERROR, {
        error:  error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });
    });

    this.server.on('close', () => {
      this.logger.info('Server closed');
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, starting graceful shutdown...`);

      const shutdownTimer = setTimeout(() => {
        this.logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, this.managerConfig.shutdownTimeout);

      try {
        await this.shutdown();
        clearTimeout(shutdownTimer);
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during graceful shutdown:', error);
        clearTimeout(shutdownTimer);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  private async registerHooks(): Promise<void> {
    // Register API hooks
    await this.hooks.addAction(CoreHooks.API_BEFORE_REQUEST, async (req: APIRequest) => {
      this.metrics.requests.total++;
      
      await this.events.emit(APIEventType.REQUEST_START, {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        timestamp: new Date(),
      });
    });

    await this.hooks.addAction(CoreHooks.API_AFTER_REQUEST, async (req: APIRequest, res: APIResponse) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        this.metrics.requests.successful++;
      } else {
        this.metrics.requests.failed++;
      }
    });
  }

  private initializeMetrics(): APIMetrics {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        rate: 0,
      },
      responses: {
        averageTime: 0,
        p95: 0,
        p99: 0,
      },
      routes: {},
      errors: {},
      rateLimits: {
        triggered: 0,
        blocked: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
      uptime: 0,
      lastReset: new Date(),
    };
  }

  // ===================================================================
  // API ROUTE HANDLERS
  // ===================================================================

  private async getPostsHandler(req: APIRequest, res: APIResponse): Promise<void> {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      
      const query: any = {};
      if (status) query.status = status;
      if (search) query.$text = { $search: search };

      const posts = await Post.find(query)
        .populate('author', 'username email')
        .populate('categories')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await Post.countDocuments(query);

      res.json({
        success: true,
        data: posts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasNext: Number(page) * Number(limit) < total,
          hasPrev: Number(page) > 1,
        },
      });

    } catch (error) {
      this.logger.error('Get posts error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_POSTS_ERROR',
          message: 'Failed to fetch posts',
        },
      });
    }
  }

  private async getPostHandler(req: APIRequest, res: APIResponse): Promise<void> {
    try {
      const post = await Post.findById(req.params.id)
        .populate('author', 'username email')
        .populate('categories');

      if (!post) {
        res.status(404).json({
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: post,
      });

    } catch (error) {
      this.logger.error('Get post error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_POST_ERROR',
          message: 'Failed to fetch post',
        },
      });
    }
  }

  private async createPostHandler(req: APIRequest, res: APIResponse): Promise<void> {
    try {
      const postData = {
        ...req.body,
        author: req.user!.id,
        type: ContentType.POST,
      };

      const post = new Post(postData);
      await post.save();

      res.status(201).json({
        success: true,
        data: post,
        message: 'Post created successfully',
      });

    } catch (error) {
      this.logger.error('Create post error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_POST_ERROR',
          message: 'Failed to create post',
        },
      });
    }
  }

  private async updatePostHandler(req: APIRequest, res: APIResponse): Promise<void> {
    try {
      const post = await Post.findByIdAndUpdate(
        req.params.id,
        { ...req.body, lastModifiedBy: req.user!.id },
        { new: true, runValidators: true }
      );

      if (!post) {
        res.status(404).json({
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: post,
        message: 'Post updated successfully',
      });

    } catch (error) {
      this.logger.error('Update post error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_POST_ERROR',
          message: 'Failed to update post',
        },
      });
    }
  }

  private async deletePostHandler(req: APIRequest, res: APIResponse): Promise<void> {
    try {
      const post = await Post.findByIdAndDelete(req.params.id);

      if (!post) {
        res.status(404).json({
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Post deleted successfully',
      });

    } catch (error) {
      this.logger.error('Delete post error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_POST_ERROR',
          message: 'Failed to delete post',
        },
      });
    }
  }

  // Additional handlers would follow similar patterns...
  private async getPagesHandler(req: APIRequest, res: APIResponse): Promise<void> {
    // Similar to getPostsHandler but for pages
    res.json({ success: true, data: [], message: 'Pages endpoint - to be implemented' });
  }

  private async getPageHandler(req: APIRequest, res: APIResponse): Promise<void> {
    // Similar to getPostHandler but for pages
    res.json({ success: true, data: null, message: 'Page endpoint - to be implemented' });
  }

  private async createPageHandler(req: APIRequest, res: APIResponse): Promise<void> {
    // Similar to createPostHandler but for pages
    res.json({ success: true, data: null, message: 'Create page endpoint - to be implemented' });
  }

  private async updatePageHandler(req: APIRequest, res: APIResponse): Promise<void> {
    // Similar to updatePostHandler but for pages
    res.json({ success: true, data: null, message: 'Update page endpoint - to be implemented' });
  }

  private async deletePageHandler(req: APIRequest, res: APIResponse): Promise<void> {
    // Similar to deletePostHandler but for pages
    res.json({ success: true, message: 'Delete page endpoint - to be implemented' });
  }

  private async getMediaHandler(req: APIRequest, res: APIResponse): Promise<void> {
    res.json({ success: true, data: [], message: 'Media endpoint - to be implemented' });
  }

  private async getMediaItemHandler(req: APIRequest, res: APIResponse): Promise<void> {
    res.json({ success: true, data: null, message: 'Media item endpoint - to be implemented' });
  }

  private async uploadMediaHandler(req: APIRequest, res: APIResponse): Promise<void> {
    res.json({ success: true, data: null, message: 'Upload media endpoint - to be implemented' });
  }

  private async deleteMediaHandler(req: APIRequest, res: APIResponse): Promise<void> {
    res.json({ success: true, message: 'Delete media endpoint - to be implemented' });
  }

  private async getUsersHandler(req: APIRequest, res: APIResponse): Promise<void> {
    res.json({ success: true, data: [], message: 'Users endpoint - to be implemented' });
  }

  private async getUserHandler(req: APIRequest, res: APIResponse): Promise<void> {
    res.json({ success: true, data: null, message: 'User endpoint - to be implemented' });
  }

  private async createUserHandler(req: APIRequest, res: APIResponse): Promise<void> {
    res.json({ success: true, data: null, message: 'Create user endpoint - to be implemented' });
  }

  private async updateUserHandler(req: APIRequest, res: APIResponse): Promise<void> {
    res.json({ success: true, data: null, message: 'Update user endpoint - to be implemented' });
  }

  private async deleteUserHandler(req: APIRequest, res: APIResponse): Promise<void> {
    res.json({ success: true, message: 'Delete user endpoint - to be implemented' });
  }

  private async loginHandler(req: APIRequest, res: APIResponse): Promise<void> {
    try {
      const { email, username, password } = req.body;
      
      const result = await this.auth.authenticate({
        email,
        username,
        password,
        ipAddress: req.ip ?? '',
        userAgent: req.get('User-Agent') ?? '',
      });

      if (!result.success) {
        res.status(401).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        message: 'Login successful',
      });

    } catch (error) {
      this.logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'Login failed',
        },
      });
    }
  }

  private async registerHandler(req: APIRequest, res: APIResponse): Promise<void> {
    try {
      const result = await this.auth.register(req.body);

      if (!result.success) {
         res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      res.status(201).json({
        success: true,
        data: { user: result.user },
        message: 'Registration successful',
      });

    } catch (error) {
      this.logger.error('Register error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTER_ERROR',
          message: 'Registration failed',
        },
      });
    }
  }

  private async logoutHandler(req: APIRequest, res: APIResponse): Promise<void> {
    try {
      // Extract session ID from token or request
      const sessionId = req.headers['x-session-id'] as string;
      await this.auth.logout(sessionId, req.user?.id);

      res.json({
        success: true,
        message: 'Logout successful',
      });

    } catch (error) {
      this.logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Logout failed',
        },
      });
    }
  }

  private async refreshTokenHandler(req: APIRequest, res: APIResponse): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await this.auth.refreshTokens(refreshToken);

      if (!result.success) {
         res.status(401).json({
          success: false,
          error: result.error,
        });
      }

      res.json({
        success: true,
        data: { tokens: result.tokens },
        message: 'Token refreshed successfully',
      });

    } catch (error) {
      this.logger.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_ERROR',
          message: 'Token refresh failed',
        },
      });
    }
  }

  private async forgotPasswordHandler(req: APIRequest, res: APIResponse): Promise<void> {
    try {
      const { email } = req.body;
      const result = await this.auth.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent',
      });

    } catch (error) {
      this.logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FORGOT_PASSWORD_ERROR',
          message: 'Failed to process password reset request',
        },
      });
    }
  }

  private async resetPasswordHandler(req: APIRequest, res: APIResponse): Promise<void> {
    try {
      const { token, password } = req.body;
      const result = await this.auth.resetPassword(token, password);

      if (!result) {
         res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token',
          },
        });
      }

      res.json({
        success: true,
        message: 'Password reset successful',
      });

    } catch (error) {
      this.logger.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RESET_PASSWORD_ERROR',
          message: 'Password reset failed',
        },
      });
    }
  }
}