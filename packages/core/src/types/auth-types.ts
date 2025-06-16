// ===================================================================
// AUTH TYPES - AUTHENTICATION AND AUTHORIZATION TYPE DEFINITIONS
// ===================================================================

import type { Types } from 'mongoose';
import { UserRole, UserStatus } from '../types/user';

export interface AuthConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
    issuer?: string;
    audience?: string;
  };
  bcrypt: {
    rounds: number;
  };
  session: {
    timeout: number; // in minutes
    maxConcurrent: number;
    extendOnActivity: boolean;
  };
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number;
    expiryDays?: number;
    maxAttempts: number;
    lockoutDuration: number; // in minutes
  };
  twoFactor: {
    enabled: boolean;
    issuer: string;
    algorithm: 'sha1' | 'sha256' | 'sha512';
    digits: number;
    period: number;
    window: number;
  };
  oauth: {
    google: OAuthProvider;
    github: OAuthProvider;
    facebook: OAuthProvider;
    microsoft: OAuthProvider;
    discord: OAuthProvider;
    twitter: OAuthProvider;
  };
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

export interface AuthCredentials {
  email?: string;
  username?: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
  ipAddress?: string;
  userAgent?: string;
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
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  USER_SUSPENDED = 'USER_SUSPENDED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  PASSWORD_EXPIRED = 'PASSWORD_EXPIRED',
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
  INVALID_TWO_FACTOR = 'INVALID_TWO_FACTOR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_INVALID = 'SESSION_INVALID',
  RATE_LIMITED = 'RATE_LIMITED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  PASSWORD_REUSED = 'PASSWORD_REUSED',
  OAUTH_ERROR = 'OAUTH_ERROR',
  OAUTH_STATE_MISMATCH = 'OAUTH_STATE_MISMATCH',
  OAUTH_CANCELED = 'OAUTH_CANCELED',
}

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

export interface AuthAttempt {
  userId?: Types.ObjectId;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: AuthErrorCode;
  timestamp: Date;
  sessionId?: string;
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

export interface AuthMiddleware {
  name: string;
  beforeAuth?: (credentials: AuthCredentials) => Promise<AuthCredentials>;
  afterAuth?: (result: AuthResult) => Promise<AuthResult>;
  beforeRefresh?: (token: string) => Promise<string>;
  afterRefresh?: (result: AuthResult) => Promise<AuthResult>;
  beforeLogout?: (session: AuthSession) => Promise<void>;
  afterLogout?: (session: AuthSession) => Promise<void>;
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

export enum AuthEventType {
  LOGIN_SUCCESS = 'auth:login:success',
  LOGIN_FAILED = 'auth:login:failed',
  LOGOUT = 'auth:logout',
  TOKEN_REFRESH = 'auth:token:refresh',
  TOKEN_REVOKE = 'auth:token:revoke',
  PASSWORD_CHANGE = 'auth:password:change',
  PASSWORD_RESET_REQUEST = 'auth:password:reset:request',
  PASSWORD_RESET_SUCCESS = 'auth:password:reset:success',
  EMAIL_VERIFICATION_SENT = 'auth:email:verification:sent',
  EMAIL_VERIFIED = 'auth:email:verified',
  TWO_FACTOR_ENABLED = 'auth:two-factor:enabled',
  TWO_FACTOR_DISABLED = 'auth:two-factor:disabled',
  TWO_FACTOR_BACKUP_USED = 'auth:two-factor:backup:used',
  ACCOUNT_LOCKED = 'auth:account:locked',
  ACCOUNT_UNLOCKED = 'auth:account:unlocked',
  SESSION_CREATED = 'auth:session:created',
  SESSION_EXPIRED = 'auth:session:expired',
  SESSION_REVOKED = 'auth:session:revoked',
  OAUTH_LINKED = 'auth:oauth:linked',
  OAUTH_UNLINKED = 'auth:oauth:unlinked',
  RATE_LIMITED = 'auth:rate:limited',
  SECURITY_ALERT = 'auth:security:alert',
}

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

export interface AuthAudit {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PermissionRule {
  resource: string;
  action: string;
  effect: 'allow' | 'deny';
  conditions?: PermissionCondition[];
  priority: number;
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'regex';
  value: any;
}

export interface RolePermissions {
  role: UserRole;
  permissions: string[];
  rules: PermissionRule[];
  inherits?: UserRole[];
}

export interface PermissionContext {
  user: AuthUser;
  resource?: string;
  resourceId?: string;
  action: string;
  data?: Record<string, any>;
  timestamp: Date;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  rule?: PermissionRule;
  conditions?: PermissionCondition[];
}

export interface SecurityPolicy {
  name: string;
  description: string;
  rules: SecurityRule[];
  enabled: boolean;
  priority: number;
}

export interface SecurityRule {
  id: string;
  name: string;
  condition: string; // JavaScript expression
  action: SecurityAction;
  parameters?: Record<string, any>;
}

export enum SecurityAction {
  ALLOW = 'allow',
  DENY = 'deny',
  REQUIRE_2FA = 'require_2fa',
  REQUIRE_VERIFICATION = 'require_verification',
  RATE_LIMIT = 'rate_limit',
  LOG = 'log',
  ALERT = 'alert',
  LOCK_ACCOUNT = 'lock_account',
  FORCE_PASSWORD_CHANGE = 'force_password_change',
}

export interface SecurityAlert {
  id: string;
  type: SecurityAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  title: string;
  description: string;
  data: Record<string, any>;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export enum SecurityAlertType {
  BRUTE_FORCE = 'brute_force',
  UNUSUAL_LOGIN = 'unusual_login',
  MULTIPLE_FAILED_LOGINS = 'multiple_failed_logins',
  ACCOUNT_TAKEOVER = 'account_takeover',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_BREACH = 'data_breach',
  MALICIOUS_ACTIVITY = 'malicious_activity',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  SECURITY_POLICY_VIOLATION = 'security_policy_violation',
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