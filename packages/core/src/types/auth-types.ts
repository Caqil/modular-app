// ===================================================================
// AUTH TYPES - AUTHENTICATION AND AUTHORIZATION TYPE DEFINITIONS
// ===================================================================
import Joi from 'joi';
import type { Types } from 'mongoose';
import { UserRole, UserStatus } from '../types/user';
import { PasswordRule } from 'src/auth/password-handler';

// ===================================================================
// CORE AUTH CONFIGURATION
// ===================================================================

export interface AuthConfig {
  jwt: JWTConfig;
  bcrypt: BcryptConfig;
  session: SessionConfig;
  password: PasswordConfig;
  twoFactor: TwoFactorConfig;
  oauth: OAuthConfig;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  issuer?: string;
  audience?: string;
}

export interface BcryptConfig {
  rounds: number;
}

export interface SessionConfig {
  timeout: number; // in minutes
  maxConcurrent: number;
  extendOnActivity: boolean;
}
export interface PasswordConfig {
  // Basic length requirements
  minLength: number;
  maxLength?: number;
  
  // Character requirements
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  
  // Security and history
  preventReuse: number;
  expiryDays?: number;
  
  // Failed login attempt controls
  maxAttempts: number;
  lockoutDuration: number; // in minutes
  
  // Password blacklist and custom validation
  blacklist?: string[];
  customRules?: PasswordRule[];
}

export interface TwoFactorConfig {
  enabled: boolean;
  issuer: string;
  algorithm: 'sha1' | 'sha256' | 'sha512';
  digits: number;
  period: number;
  window: number;
}

export interface OAuthConfig {
  google: OAuthProvider;
  github: OAuthProvider;
  facebook: OAuthProvider;
  microsoft: OAuthProvider;
  discord: OAuthProvider;
  twitter: OAuthProvider;
}

export interface OAuthProvider {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  scope?: string[];
  redirectUri?: string;
  authorizeUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
}

// ===================================================================
// AUTHENTICATION INTERFACES
// ===================================================================

export interface AuthCredentials {
  email?: string;
  username?: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
  ipAddress?: string;
  userAgent?: string;
  trustDevice?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  tokens?: AuthTokens;
  session?: AuthSession;
  error?: AuthError;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
  lockoutUntil?: Date;
  attemptsRemaining?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
  scope?: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  permissions: string[];
  profile: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatar?: string;
  };
  preferences: {
    language: string;
    timezone: string;
    theme: 'light' | 'dark' | 'auto';
  };
  meta: {
    lastLogin?: Date;
    loginCount: number;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    passwordChangedAt?: Date;
  };
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  isActive: boolean;
  data?: Record<string, any>;
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export enum AuthErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  USER_SUSPENDED = 'USER_SUSPENDED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  
  // Password errors
  PASSWORD_EXPIRED = 'PASSWORD_EXPIRED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  PASSWORD_REUSED = 'PASSWORD_REUSED',
  
  // Two-factor authentication
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
  INVALID_TWO_FACTOR = 'INVALID_TWO_FACTOR',
  
  // Token errors
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  
  // Session errors
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_INVALID = 'SESSION_INVALID',
  
  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Authorization
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // OAuth errors
  OAUTH_ERROR = 'OAUTH_ERROR',
  OAUTH_STATE_MISMATCH = 'OAUTH_STATE_MISMATCH',
  OAUTH_CANCELED = 'OAUTH_CANCELED',
}

// ===================================================================
// TOKEN INTERFACES
// ===================================================================

export interface TokenPayload {
  sub: string; // User ID
  email: string;
  username: string;
  role: UserRole;
  permissions: string[];
  sessionId: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
  scope?: string[];
}

export interface RefreshTokenPayload {
  sub: string; // User ID
  sessionId: string;
  type: 'refresh';
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: AuthError;
}

export interface TokenRefreshResult {
  success: boolean;
  tokens?: AuthTokens;
  error?: AuthError;
}

// ===================================================================
// PASSWORD MANAGEMENT
// ===================================================================

export interface PasswordResetRequest {
  userId: Types.ObjectId;
  token: string;
  email: string;
  expiresAt: Date;
  used: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface EmailVerificationRequest {
  userId: Types.ObjectId;
  token: string;
  email: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface PasswordValidationResult {
  valid: boolean;
  score: number;
  strength: 'very-weak' | 'weak' | 'moderate' | 'strong' | 'very-strong';
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface PasswordHashResult {
  hash: string;
  salt: string;
  algorithm: string;
  rounds: number;
  timestamp: Date;
}

// ===================================================================
// TWO-FACTOR AUTHENTICATION
// ===================================================================

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  issuer: string;
  accountName: string;
}

export interface TwoFactorVerification {
  code: string;
  backupCode?: string;
  trustDevice?: boolean;
}

export interface TwoFactorBackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
  generatedAt: Date;
}

// ===================================================================
// OAUTH AUTHENTICATION
// ===================================================================

export interface OAuthState {
  state: string;
  provider: string;
  redirectUrl?: string;
  userId?: string;
  expiresAt: Date;
  data?: Record<string, any>;
}

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  profile?: Record<string, any>;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
  scope?: string[];
}

export interface OAuthUserInfo {
  id: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  username?: string;
  verified?: boolean;
}

// ===================================================================
// AUTHENTICATION TRACKING
// ===================================================================

export interface AuthAttempt {
  userId?: Types.ObjectId;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: AuthErrorCode;
  timestamp: Date;
  sessionId?: string;
  provider?: string;
  metadata?: Record<string, any>;
}

export interface LoginAttempt {
  identifier: string; // email or IP
  attempts: number;
  lastAttempt: Date;
  lockedUntil?: Date;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export enum SecurityEventType {
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  MULTIPLE_FAILED_LOGINS = 'MULTIPLE_FAILED_LOGINS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  UNUSUAL_LOCATION = 'UNUSUAL_LOCATION',
  SESSION_HIJACKING = 'SESSION_HIJACKING',
  BRUTE_FORCE_ATTACK = 'BRUTE_FORCE_ATTACK',
}

// ===================================================================
// PERMISSIONS AND AUTHORIZATION
// ===================================================================

export interface PermissionRule {
  permission: string;
  conditions?: PermissionCondition[];
  effect: 'allow' | 'deny';
  priority: number;
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'exists' | 'regex';
  value: any;
}

export interface RolePermissions {
  role: UserRole;
  permissions: string[];
  inherits?: UserRole[];
}

export interface PermissionContext {
  user: string; // User ID
  resource?: string;
  resourceId?: string;
  action?: string;
  environment?: Record<string, any>;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  conditions?: PermissionCondition[];
}

// ===================================================================
// MIDDLEWARE
// ===================================================================

export interface AuthMiddleware {
  name: string;
  priority?: number;
  beforeAuth?: (credentials: AuthCredentials) => Promise<AuthCredentials>;
  afterAuth?: (result: AuthResult) => Promise<AuthResult>;
  beforeRefresh?: (token: string) => Promise<string>;
  afterRefresh?: (result: AuthResult) => Promise<AuthResult>;
  beforeLogout?: (session: AuthSession) => Promise<void>;
  afterLogout?: (session: AuthSession) => Promise<void>;
}

// ===================================================================
// EVENTS
// ===================================================================

export enum AuthEventType {
  // Authentication events
  LOGIN_SUCCESS = 'auth:login_success',
  LOGIN_FAILED = 'auth:login_failed',
  LOGOUT = 'auth:logout',
  
  // Token events
  TOKEN_REFRESH = 'auth:token_refresh',
  TOKEN_REVOKED = 'auth:token_revoked',
  
  // Session events
  SESSION_CREATED = 'auth:session_created',
  SESSION_EXPIRED = 'auth:session_expired',
  SESSION_TERMINATED = 'auth:session_terminated',
  
  // Account events
  ACCOUNT_LOCKED = 'auth:account_locked',
  ACCOUNT_UNLOCKED = 'auth:account_unlocked',
  
  // Password events
  PASSWORD_RESET_REQUEST = 'auth:password_reset_request',
  PASSWORD_RESET_SUCCESS = 'auth:password_reset_success',
  PASSWORD_CHANGED = 'auth:password_changed',
  
  // Email verification
  EMAIL_VERIFICATION_SENT = 'auth:email_verification_sent',
  EMAIL_VERIFIED = 'auth:email_verified',
  
  // Two-factor authentication
  TWO_FACTOR_ENABLED = 'auth:two_factor_enabled',
  TWO_FACTOR_DISABLED = 'auth:two_factor_disabled',
  TWO_FACTOR_VERIFIED = 'auth:two_factor_verified',
  
  // OAuth events
  OAUTH_LINKED = 'auth:oauth_linked',
  OAUTH_UNLINKED = 'auth:oauth_unlinked',
  
  // Security events
  SECURITY_ALERT = 'auth:security_alert',
  SUSPICIOUS_ACTIVITY = 'auth:suspicious_activity',
}

export interface AuthEventData {
  userId?: string;
  email?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  provider?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ===================================================================
// METRICS AND MONITORING
// ===================================================================

export interface AuthMetrics {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  activeUsers: number;
  activeSessions: number;
  lockedAccounts: number;
  twoFactorUsers: number;
  oauthUsers: number;
  averageSessionDuration: number;
  loginsByHour: Record<string, number>;
  loginsByDay: Record<string, number>;
  topUserAgents: Record<string, number>;
  topCountries: Record<string, number>;
  securityIncidents: number;
  lastUpdate: Date;
}

export interface AuthHealthCheck {
  healthy: boolean;
  services: {
    database: boolean;
    cache: boolean;
    tokens: boolean;
    sessions: boolean;
    twoFactor: boolean;
  };
  metrics: {
    activeUsers: number;
    activeSessions: number;
    errorRate: number;
    averageResponseTime: number;
  };
  lastCheck: Date;
  errors: string[];
}

// ===================================================================
// RATE LIMITING
// ===================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessful?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

// ===================================================================
// AUDIT LOGGING
// ===================================================================

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  result: 'success' | 'failure';
  error?: string;
}

export enum AuditAction {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_VERIFY = 'email_verify',
  TWO_FACTOR_SETUP = 'two_factor_setup',
  TWO_FACTOR_DISABLE = 'two_factor_disable',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  ACCOUNT_LOCK = 'account_lock',
  ACCOUNT_UNLOCK = 'account_unlock',
  OAUTH_LINK = 'oauth_link',
  OAUTH_UNLINK = 'oauth_unlink',
}

// ===================================================================
// API RESPONSES
// ===================================================================

export interface AuthApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: AuthErrorCode;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: Date;
    requestId?: string;
    version?: string;
  };
}

export interface LoginResponse extends AuthApiResponse<{
  user: AuthUser;
  tokens: AuthTokens;
  session?: AuthSession;
}> {
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
}

export interface RefreshResponse extends AuthApiResponse<{
  tokens: AuthTokens;
}> {}

export interface RegisterResponse extends AuthApiResponse<{
  user: AuthUser;
  requiresEmailVerification?: boolean;
}> {}

export interface PasswordResetResponse extends AuthApiResponse<{
  message: string;
}> {}

// ===================================================================
// CONFIGURATION VALIDATION
// ===================================================================

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
export const AuthConfigSchema = Joi.object({
  jwt: Joi.object({
    secret: Joi.string().min(32).required(),
    expiresIn: Joi.string().pattern(/^\d+[smhdw]$/).required(),
    refreshExpiresIn: Joi.string().pattern(/^\d+[smhdw]$/).required(),
    algorithm: Joi.string().valid('HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512').required(),
  }).required(),
  bcrypt: Joi.object({
    rounds: Joi.number().min(10).max(15).required(),
  }).required(),
  password: Joi.object({
    minLength: Joi.number().min(8).max(128).required(),
    maxAttempts: Joi.number().min(3).max(10).required(),
    lockoutDuration: Joi.number().min(5).max(60).required(),
  }).required(),
});

// ===================================================================
// TYPE GUARDS
// ===================================================================

export function isAuthResult(obj: any): obj is AuthResult {
  return obj && typeof obj.success === 'boolean';
}

export function isAuthError(obj: any): obj is AuthError {
  return obj && typeof obj.code === 'string' && typeof obj.message === 'string';
}

export function isAuthUser(obj: any): obj is AuthUser {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string';
}

export function isAuthSession(obj: any): obj is AuthSession {
  return obj && typeof obj.id === 'string' && typeof obj.userId === 'string';
}

export function isTokenPayload(obj: any): obj is TokenPayload {
  return obj && typeof obj.sub === 'string' && typeof obj.type === 'string';
}