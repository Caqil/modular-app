// ===================================================================
// API TYPES - API AND ROUTING TYPE DEFINITIONS
// ===================================================================

import type { Request, Response, NextFunction } from 'express';
import type { Types } from 'mongoose';
import { UserRole } from '../types/user';
import { PluginRoute } from '../types/plugin';

export interface APIConfig {
  enabled: boolean;
  version: string;
  baseUrl: string;
  port: number;
  host: string;
  cors: {
    enabled: boolean;
    origin: string | string[] | boolean;
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  security: {
    helmet: boolean;
    compression: boolean;
    bodyParser: {
      json: { limit: string };
      urlencoded: { limit: string; extended: boolean };
    };
  };
  documentation: {
    enabled: boolean;
    path: string;
    title: string;
    description: string;
    version: string;
  };
  monitoring: {
    enabled: boolean;
    metricsPath: string;
    healthPath: string;
  };
}

export interface APIRoute {
  id: string;
  path: string;
  method: HTTPMethod;
  handler: RouteHandler;
  middleware?: MiddlewareFunction[];
  permissions?: string[];
  roles?: UserRole[];
  rateLimit?: RateLimitConfig;
  cache?: CacheConfig;
  validation?: ValidationConfig;
  documentation?: RouteDocumentation;
  enabled: boolean;
  public: boolean;
  deprecated?: boolean;
  version?: string;
  plugin?: string;
  priority: number;
}

export interface APIEndpoint {
  route: string;
  method: HTTPMethod;
  controller: string;
  action: string;
  middleware: string[];
  permissions: string[];
  validation?: ValidationSchema;
  examples?: RequestExample[];
}

export interface APIController {
  name: string;
  path: string;
  middleware: MiddlewareFunction[];
  routes: Map<string, APIRoute>;
  plugin?: string;
}

export interface APIMiddleware {
  name: string;
  handler: MiddlewareFunction;
  priority: number;
  global: boolean;
  enabled: boolean;
  plugin?: string;
  conditions?: MiddlewareCondition[];
}

export interface MiddlewareCondition {
  type: 'path' | 'method' | 'header' | 'query' | 'user' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'regex' | 'in' | 'not_in';
  value: any;
  field?: string;
}

export interface RouteHandler {
  (req: APIRequest, res: APIResponse, next: NextFunction): Promise<void> | void;
}

export interface MiddlewareFunction {
  (req: APIRequest, res: APIResponse, next: NextFunction): Promise<void> | void;
}

export interface APIRequest extends Request {
  user?: APIUser;
  session?: APISession;
  permissions?: string[];
  rateLimitInfo?: RateLimitInfo;
  startTime?: number;
  requestId?: string;
  plugin?: string;
  validated?: {
    params?: Record<string, any>;
    query?: Record<string, any>;
    body?: Record<string, any>;
    headers?: Record<string, any>;
  };
}

export interface APIResponse extends Response {
  success: (data?: any, message?: string) => void;
  error: (error: APIError | string, statusCode?: number) => void;
  paginated: (data: any[], pagination: PaginationInfo) => void;
  cached: (data: any, ttl?: number) => void;
}

export interface APIUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  permissions: string[];
  sessionId?: string;
}

export interface APISession {
  id: string;
  userId: string;
  expiresAt: Date;
  data: Record<string, any>;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
  timestamp: Date;
  requestId?: string;
  stack?: string;
}

export interface APIResponse_Data {
  success: boolean;
  data?: any;
  message?: string;
  error?: APIError;
  pagination?: PaginationInfo;
  meta?: ResponseMetadata;
  links?: ResponseLinks;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: Date;
  version: string;
  duration: number;
  cached?: boolean;
  rateLimit?: RateLimitInfo;
}

export interface ResponseLinks {
  self?: string;
  first?: string;
  last?: string;
  next?: string;
  prev?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  // Updated to ensure string return and handle Express Request type
  keyGenerator: (req: Request | APIRequest) => string;
  // Updated to handle Express Response type
  onLimitReached: (req: APIRequest, res: APIResponse) => void;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  key?: string | ((req: APIRequest) => string);
  vary?: string[];
  tags?: string[];
}

export interface ValidationConfig {
  params?: ValidationSchema;
  query?: ValidationSchema;
  body?: ValidationSchema;
  headers?: ValidationSchema;
  files?: FileValidationSchema;
}

export interface ValidationSchema {
  [key: string]: ValidationRule | ValidationSchema;
}

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'email' | 'url' | 'uuid' | 'objectid';
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  enum?: any[];
  custom?: (value: any) => boolean | string;
  sanitize?: boolean;
  transform?: (value: any) => any;
  description?: string;
  example?: any;
}

export interface FileValidationSchema {
  maxSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFiles?: number;
  required?: boolean;
}

export interface RouteDocumentation {
  summary: string;
  description?: string;
  tags: string[];
  parameters?: ParameterDocumentation[];
  requestBody?: RequestBodyDocumentation;
  responses: Record<string, ResponseDocumentation>;
  examples?: RequestExample[];
  deprecated?: boolean;
  security?: SecurityRequirement[];
}

export interface ParameterDocumentation {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema: ValidationRule;
  example?: any;
}

export interface RequestBodyDocumentation {
  description?: string;
  required?: boolean;
  content: Record<string, ContentDocumentation>;
}

export interface ContentDocumentation {
  schema: ValidationSchema;
  examples?: Record<string, ExampleDocumentation>;
}

export interface ResponseDocumentation {
  description: string;
  content?: Record<string, ContentDocumentation>;
  headers?: Record<string, HeaderDocumentation>;
}

export interface HeaderDocumentation {
  description?: string;
  schema: ValidationRule;
  example?: any;
}

export interface ExampleDocumentation {
  summary?: string;
  description?: string;
  value: any;
}

export interface RequestExample {
  name: string;
  description?: string;
  request: {
    params?: Record<string, any>;
    query?: Record<string, any>;
    body?: any;
    headers?: Record<string, any>;
  };
  response: {
    status: number;
    body: any;
    headers?: Record<string, any>;
  };
}

export interface SecurityRequirement {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuth2Flows;
  openIdConnectUrl?: string;
  in?: 'query' | 'header' | 'cookie';
  name?: string;
}

export interface OAuth2Flows {
  implicit?: OAuth2Flow;
  password?: OAuth2Flow;
  clientCredentials?: OAuth2Flow;
  authorizationCode?: OAuth2Flow;
}

export interface OAuth2Flow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface APIMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
  };
  responses: {
    averageTime: number;
    p95: number;
    p99: number;
  };
  routes: Record<string, RouteMetrics>;
  errors: Record<string, number>;
  rateLimits: {
    triggered: number;
    blocked: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  uptime: number;
  lastReset: Date;
}

export interface RouteMetrics {
  path: string;
  method: HTTPMethod;
  requests: number;
  averageTime: number;
  errors: number;
  lastAccessed: Date;
}

export interface APIHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: Date;
  services: Record<string, ServiceHealth>;
  dependencies: Record<string, DependencyHealth>;
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

export interface DependencyHealth {
  status: 'connected' | 'disconnected' | 'error';
  responseTime?: number;
  lastCheck: Date;
  version?: string;
  error?: string;
}

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export enum APIEventType {
  REQUEST_START = 'api:request:start',
  REQUEST_END = 'api:request:end',
  REQUEST_ERROR = 'api:request:error',
  ROUTE_REGISTERED = 'api:route:registered',
  ROUTE_UNREGISTERED = 'api:route:unregistered',
  MIDDLEWARE_REGISTERED = 'api:middleware:registered',
  MIDDLEWARE_UNREGISTERED = 'api:middleware:unregistered',
  RATE_LIMIT_EXCEEDED = 'api:rate_limit:exceeded',
  VALIDATION_FAILED = 'api:validation:failed',
  AUTHENTICATION_FAILED = 'api:auth:failed',
  AUTHORIZATION_FAILED = 'api:auth:unauthorized',
  CACHE_HIT = 'api:cache:hit',
  CACHE_MISS = 'api:cache:miss',
  SERVER_START = 'api:server:start',
  SERVER_STOP = 'api:server:stop',
  SERVER_ERROR = 'api:server:error',
}

export interface APIEvent {
  type: APIEventType;
  data: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  route?: string;
  method?: HTTPMethod;
  statusCode?: number;
  duration?: number;
  error?: APIError;
}

export interface RouteMatcher {
  match: (path: string, method: HTTPMethod) => boolean;
  params: Record<string, string>;
}

export interface RouteGroup {
  prefix: string;
  middleware: MiddlewareFunction[];
  routes: APIRoute[];
  children?: RouteGroup[];
}

export interface APIVersioning {
  strategy: 'header' | 'query' | 'path';
  header?: string;
  query?: string;
  default: string;
  supported: string[];
}

export interface APITransform {
  request?: (data: any) => any;
  response?: (data: any) => any;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  retries: number;
  timeout: number;
  headers?: Record<string, string>;
}

export interface APIPlugin {
  name: string;
  version: string;
  routes: APIRoute[];
  middleware: APIMiddleware[];
  controllers: APIController[];
  enabled: boolean;
}

export interface RequestContext {
  requestId: string;
  startTime: number;
  user?: APIUser;
  permissions: string[];
  rateLimitInfo?: RateLimitInfo;
  plugin?: string;
  route?: APIRoute;
  metadata: Record<string, any>;
}

export interface ResponseFormatter {
  format: (data: any, context: RequestContext) => APIResponse_Data;
  contentType: string;
}

export interface APISerializer {
  serialize: (data: any, options?: any) => any;
  deserialize: (data: any, options?: any) => any;
  contentType: string;
}

export interface RequestLogger {
  log: (req: APIRequest, res: APIResponse, duration: number) => void;
  error: (req: APIRequest, error: APIError) => void;
}

export interface CORS_Options {
  origin: string | string[] | boolean | ((origin: string | undefined, callback: (err: Error | null, origin?: boolean) => void) => void);
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}