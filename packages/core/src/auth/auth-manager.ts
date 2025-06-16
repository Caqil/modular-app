// ===================================================================
// AUTH MANAGER - MAIN AUTHENTICATION ORCHESTRATION SYSTEM
// ===================================================================

import crypto from 'crypto';
import { Types } from 'mongoose';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { CacheManager } from '../cache/cache-manager';
import { HookManager } from '../hooks/hook-manager';
import { Validator } from '../utils/validator';
import { Sanitizer } from '../utils/sanitizer';
import { DateUtils } from '../utils/date-utils';
import { EventType } from '../events/event-types';
import { CoreHooks, CoreFilters } from '../hooks/hook-types';
import { UserRepository } from '../database/repositories/user-repository';
import { type IUser } from '../database/models';
import { UserRole, UserStatus } from '../types/user';
import { JWTHandler } from './jwt-handler';
import { PasswordHandler } from './password-handler';
import { PermissionManager } from './permission-manager';
import {
  AuthConfig,
  AuthCredentials,
  AuthResult,
  AuthUser,
  AuthSession,
  AuthTokens,
  AuthError,
  AuthErrorCode,
  AuthEventType,
  AuthEventData,
  AuthMiddleware,
  AuthMetrics,
  AuthHealthCheck,
  TwoFactorSetup,
  TwoFactorVerification,
  OAuthProfile,
  OAuthState,
  PasswordResetRequest,
  EmailVerificationRequest,
  AuthAttempt,
  LoginAttempt,
} from './auth-types';

export interface AuthManagerConfig extends AuthConfig {
  enableRegistration: boolean;
  requireEmailVerification: boolean;
  enableAccountLockout: boolean;
  enableSessionManagement: boolean;
  enableTwoFactorAuth: boolean;
  enableOAuth: boolean;
  sessionCleanupInterval: number; // in minutes
  metricsEnabled: boolean;
  maxFailedAttempts: number;
  lockoutDuration: number; // in minutes
  cleanupExpiredData: boolean;
  cleanupInterval: number; // in minutes
}

export interface RegistrationData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  acceptTerms?: boolean;
  inviteCode?: string;
}

export interface AuthStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  loginAttemptsToday: number;
  successfulLoginsToday: number;
  failedLoginsToday: number;
  lockedAccounts: number;
  activeSessions: number;
}

/**
 * Authentication Manager
 * Central orchestration system for all authentication operations
 */
export class AuthManager {
  private static instance: AuthManager;
  private logger = new Logger('AuthManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private cache = CacheManager.getInstance();
  private hooks = HookManager.getInstance();
  private userRepo = new UserRepository();
  private jwtHandler!: JWTHandler;
  private passwordHandler!: PasswordHandler;
  private permissionManager!: PermissionManager;
  private initialized = false;
  private managerConfig!: AuthManagerConfig;
  private middleware: AuthMiddleware[] = [];
  private activeSessions = new Map<string, AuthSession>();
  private oauthStates = new Map<string, OAuthState>();
  private passwordResets = new Map<string, PasswordResetRequest>();
  private emailVerifications = new Map<string, EmailVerificationRequest>();
  private loginAttempts = new Map<string, LoginAttempt>();
  private authAttempts: AuthAttempt[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  private readonly defaultConfig: AuthManagerConfig = {
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      expiresIn: '7d',
      refreshExpiresIn: '30d',
      algorithm: 'HS256',
      issuer: 'modular-app',
      audience: 'modular-app-users',
    },
    bcrypt: {
      rounds: 12,
    },
    session: {
      timeout: 1440, // 24 hours
      maxConcurrent: 5,
      extendOnActivity: true,
    },
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      preventReuse: 5,
      expiryDays: 90,
      maxAttempts: 5,
      lockoutDuration: 15, // minutes
    },
    twoFactor: {
      enabled: false,
      issuer: 'Modular App',
      algorithm: 'sha1',
      digits: 6,
      period: 30,
      window: 1,
    },
    oauth: {
      google: { enabled: false },
      github: { enabled: false },
      facebook: { enabled: false },
      microsoft: { enabled: false },
      discord: { enabled: false },
      twitter: { enabled: false },
    },
    enableRegistration: true,
    requireEmailVerification: true,
    enableAccountLockout: true,
    enableSessionManagement: true,
    enableTwoFactorAuth: false,
    enableOAuth: false,
    sessionCleanupInterval: 60, // 1 hour
    metricsEnabled: true,
    maxFailedAttempts: 5,
    lockoutDuration: 15, // minutes
    cleanupExpiredData: true,
    cleanupInterval: 30, // 30 minutes
  };

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Initialize authentication manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Auth manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing authentication manager...');

      // Load configuration
      const authConfig = await this.config.get<Partial<AuthManagerConfig>>('auth');
      this.managerConfig = { ...this.defaultConfig, ...authConfig };

      // Initialize sub-managers
      this.jwtHandler = new JWTHandler({
        jwt: this.managerConfig.jwt,
        cache: {
          enabled: true,
          ttl: 3600,
          prefix: 'jwt:',
        },
      });

      this.passwordHandler = new PasswordHandler(this.managerConfig);
      this.permissionManager = PermissionManager.getInstance();

      // Initialize permission manager
      await this.permissionManager.initialize();

      // Setup session cleanup
      if (this.managerConfig.enableSessionManagement) {
        this.startSessionCleanup();
      }

      // Setup data cleanup
      if (this.managerConfig.cleanupExpiredData) {
        this.startDataCleanup();
      }

      // Register default middleware
      await this.registerDefaultMiddleware();

      // Register event handlers
      await this.registerEventHandlers();

      // Register hooks
      await this.registerHooks();

      this.initialized = true;
      this.logger.info('Authentication manager initialized successfully', {
        jwtEnabled: true,
        sessionManagement: this.managerConfig.enableSessionManagement,
        twoFactorAuth: this.managerConfig.enableTwoFactorAuth,
        oauth: this.managerConfig.enableOAuth,
        registration: this.managerConfig.enableRegistration,
      });

      // Emit initialization event
      await this.events.emit(EventType.SYSTEM_READY, {
        timestamp: new Date(),
        component: 'AuthManager',
        config: {
          enableRegistration: this.managerConfig.enableRegistration,
          enableTwoFactorAuth: this.managerConfig.enableTwoFactorAuth,
          enableOAuth: this.managerConfig.enableOAuth,
        },
      });

    } catch (error) {
      this.logger.error('Failed to initialize authentication manager:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with credentials
   */
  public async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      this.logger.debug('Authentication attempt', {
        email: credentials.email,
        username: credentials.username,
        ipAddress: credentials.ipAddress,
      });

      // Apply before auth hooks
      await this.hooks.doAction(CoreHooks.USER_BEFORE_LOGIN, {
        credentials,
        ipAddress: credentials.ipAddress,
        userAgent: credentials.userAgent,
      });

      const processedCredentials = credentials;

      // Apply before auth middleware
      const finalCredentials = await this.applyBeforeAuthMiddleware(processedCredentials);

      // Validate credentials
      const validation = this.validateCredentials(finalCredentials);
      if (!validation.valid) {
        await this.recordFailedAttempt(finalCredentials);
        return this.createAuthError(AuthErrorCode.INVALID_CREDENTIALS, validation.error!);
      }

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(finalCredentials);
      if (!rateLimitCheck.allowed) {
        return this.createAuthError(AuthErrorCode.RATE_LIMITED, 'Too many login attempts');
      }

      // Find user
      const user = await this.findUserByCredentials(finalCredentials);
      if (!user) {
        await this.recordFailedAttempt(finalCredentials);
        return this.createAuthError(AuthErrorCode.USER_NOT_FOUND, 'Invalid credentials');
      }

      // Check account status
      const statusCheck = this.checkAccountStatus(user);
      if (!statusCheck.valid) {
        await this.recordFailedAttempt(finalCredentials, user);
        return this.createAuthError(statusCheck.errorCode!, statusCheck.message!);
      }

      // Check account lockout
      if (this.managerConfig.enableAccountLockout && await this.isAccountLocked(user)) {
        return this.createAuthError(AuthErrorCode.ACCOUNT_LOCKED, 'Account locked due to multiple failed attempts');
      }

      // Verify password
      const isValidPassword = await this.passwordHandler.verifyPassword(
        finalCredentials.password,
        user.password
      );

      if (!isValidPassword) {
        await this.recordFailedAttempt(finalCredentials, user);
        await this.incrementFailedAttempts(user);
        return this.createAuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid credentials');
      }

      // Check password expiry
      if (await this.passwordHandler.isPasswordExpired(user)) {
        return this.createAuthError(AuthErrorCode.PASSWORD_EXPIRED, 'Password has expired');
      }

      // Check two-factor authentication
      if (this.managerConfig.enableTwoFactorAuth && user.twoFactorEnabled && !finalCredentials.twoFactorCode) {
        const twoFactorToken = await this.generateTwoFactorToken(user);
        return {
          success: false,
          requiresTwoFactor: true,
          twoFactorToken,
          error: {
            code: AuthErrorCode.TWO_FACTOR_REQUIRED,
            message: 'Two-factor authentication required',
            timestamp: new Date(),
          },
        };
      }

      // Verify two-factor code if provided
      if (finalCredentials.twoFactorCode) {
        const twoFactorValid = await this.verifyTwoFactorCode(user, finalCredentials.twoFactorCode);
        if (!twoFactorValid) {
          await this.recordFailedAttempt(finalCredentials, user);
          return this.createAuthError(AuthErrorCode.INVALID_TWO_FACTOR, 'Invalid two-factor code');
        }
      }

      // Generate tokens
      const tokens = await this.jwtHandler.generateTokens(user);

      // Create session
      let session: AuthSession | undefined;
      if (this.managerConfig.enableSessionManagement) {
        session = await this.createSession(user, tokens, finalCredentials);
      }

      // Update user login stats
      await this.updateUserLoginStats(user, finalCredentials);

      // Clear failed attempts
      await this.clearFailedAttempts(user);

      // Create auth user object
      const authUser = await this.createAuthUser(user);

      const result: AuthResult = {
        success: true,
        user: authUser,
        ...(tokens ? { tokens } : {}),
        ...(session ? { session } : {}),
      };

      // Apply after auth middleware
      const finalResult = await this.applyAfterAuthMiddleware(result);

      // Apply after auth hooks
      await this.hooks.doAction(CoreHooks.USER_LOGIN, {
        user: authUser,
        session,
        credentials: finalCredentials,
      });

      // Record successful attempt
      await this.recordSuccessfulAttempt(finalCredentials, user);

      // Emit success event
      await this.events.emit(EventType.USER_LOGIN, {
        userId: user.id.toString(),
        email: user.email,
        username: user.username,
        ipAddress: finalCredentials.ipAddress,
        userAgent: finalCredentials.userAgent,
        timestamp: new Date(),
      });

      this.logger.info('Authentication successful', {
        userId: user.id,
        email: user.email,
        ipAddress: finalCredentials.ipAddress,
      });

      return finalResult;

    } catch (error) {
      this.logger.error('Authentication error:', error);
      return this.createAuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Authentication failed');
    }
  }

  /**
   * Refresh authentication tokens
   */
  public async refreshTokens(refreshToken: string): Promise<AuthResult> {
    try {
      this.logger.debug('Token refresh attempt');

      // Apply before refresh middleware
      const processedToken = await this.applyBeforeRefreshMiddleware(refreshToken);

      // Refresh tokens using JWT handler
      const refreshResult = await this.jwtHandler.refreshToken(processedToken);

      if (!refreshResult.success) {
        return {
          success: false,
          error: refreshResult.error !== undefined
            ? refreshResult.error
            : {
                code: AuthErrorCode.TOKEN_INVALID,
                message: 'Token refresh failed',
                timestamp: new Date()
              },
        };
      }

      // Get user from token
      const decoded = this.jwtHandler.decodeToken(refreshResult.tokens!.accessToken);
      const user = await this.userRepo.findById(decoded?.sub!);

      if (!user) {
        return this.createAuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found');
      }

      // Check account status
      const statusCheck = this.checkAccountStatus(user);
      if (!statusCheck.valid) {
        return this.createAuthError(statusCheck.errorCode!, statusCheck.message!);
      }
 // Generate tokens
      const tokens = await this.jwtHandler.generateTokens(user);

      // Create session
      let session: AuthSession | undefined;
      // Update session if exists
      if (this.managerConfig.enableSessionManagement && decoded?.sessionId) {
        await this.updateSessionActivity(decoded.sessionId);
      }

      const authUser = await this.createAuthUser(user);

      const result: AuthResult = {
        success: true,
        user: authUser,
        ...(tokens ? { tokens } : {}),
        ...(session ? { session } : {}),
      };
      // Apply after refresh middleware
      const finalResult = await this.applyAfterRefreshMiddleware(result);

      // Emit refresh event
      await this.events.emit(EventType.USER_LOGIN, {
        userId: user.id.toString(),
        timestamp: new Date(),
        metadata: { action: 'token_refresh' },
      });

      this.logger.debug('Token refresh successful', { userId: user.id });
      return finalResult;

    } catch (error) {
      this.logger.error('Token refresh error:', error);
      return this.createAuthError(AuthErrorCode.TOKEN_INVALID, 'Token refresh failed');
    }
  }

  /**
   * Logout user
   */
  public async logout(sessionId?: string, userId?: string): Promise<void> {
    try {
      this.logger.debug('Logout attempt', { sessionId, userId });

      let session: AuthSession | undefined;

      if (sessionId) {
        session = this.activeSessions.get(sessionId);
        if (session) {
          // Apply before logout middleware
          await this.applyBeforeLogoutMiddleware(session);

          // Remove session
          this.activeSessions.delete(sessionId);

          // Revoke tokens
          await this.jwtHandler.revokeUserTokens(session.userId, sessionId);
        }
      }

      if (userId) {
        // Revoke all tokens for user
        await this.jwtHandler.revokeUserTokens(userId);

        // Remove all sessions for user
        for (const [id, sess] of this.activeSessions.entries()) {
          if (sess.userId === userId) {
            await this.applyBeforeLogoutMiddleware(sess);
            this.activeSessions.delete(id);
          }
        }
      }

      // Apply after logout middleware
      if (session) {
        await this.applyAfterLogoutMiddleware(session);
      }

      // Apply logout hooks
      await this.hooks.doAction(CoreHooks.USER_LOGOUT, {
        userId,
        sessionId,
        timestamp: new Date(),
      });

      // Emit logout event
      await this.events.emit(EventType.USER_LOGOUT, {
        userId,
        sessionId,
        timestamp: new Date(),
      });

      this.logger.info('Logout successful', { sessionId, userId });

    } catch (error) {
      this.logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Validate access token
   */
  public async validateToken(token: string): Promise<AuthResult> {
    try {
      const validation = await this.jwtHandler.validateToken(token);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const user = await this.userRepo.findById(validation.payload!.sub);
      if (!user) {
        return this.createAuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found');
      }

      // Check account status
      const statusCheck = this.checkAccountStatus(user);
      if (!statusCheck.valid) {
        return this.createAuthError(statusCheck.errorCode!, statusCheck.message!);
      }

      const authUser = await this.createAuthUser(user);

      return {
        success: true,
        user: authUser,
      };

    } catch (error) {
      this.logger.error('Token validation error:', error);
      return this.createAuthError(AuthErrorCode.TOKEN_INVALID, 'Token validation failed');
    }
  }

  /**
   * Register new user
   */
  public async register(userData: RegistrationData): Promise<AuthResult> {
    try {
      if (!this.managerConfig.enableRegistration) {
        return this.createAuthError(AuthErrorCode.PERMISSION_DENIED, 'Registration is disabled');
      }

      this.logger.debug('User registration attempt', { 
        email: userData.email, 
        username: userData.username 
      });

      // Apply before registration hooks
      await this.hooks.doAction(CoreHooks.USER_BEFORE_REGISTER, {
        userData: processedData,
      });

      const finalUserData = processedData;

      // Validate input
      const validation = this.validateRegistrationData(finalUserData);
      if (!validation.valid) {
        return this.createAuthError(AuthErrorCode.INVALID_CREDENTIALS, validation.error!);
      }

      // Check if user already exists
      const existingUser = await this.userRepo.findOne({
        $or: [
          { email: finalUserData.email.toLowerCase() },
          { username: finalUserData.username },
        ],
      });

      if (existingUser) {
        return this.createAuthError(AuthErrorCode.USER_NOT_FOUND, 'User already exists');
      }

      // Validate password
      const passwordValidation = await this.passwordHandler.validatePassword(finalUserData.password);
      if (!passwordValidation.valid) {
        return this.createAuthError(AuthErrorCode.WEAK_PASSWORD, passwordValidation.errors.join(', '));
      }

      // Create user
      const user = await this.userRepo.create({
        email: finalUserData.email.toLowerCase(),
        username: finalUserData.username,
        password: finalUserData.password, // Will be hashed in repository
        firstName: finalUserData.firstName,
        lastName: finalUserData.lastName,
        role: UserRole.SUBSCRIBER,
        status: this.managerConfig.requireEmailVerification ? UserStatus.PENDING : UserStatus.ACTIVE,
        emailVerified: !this.managerConfig.requireEmailVerification,
        profile: {
          firstName: processedData.firstName,
          lastName: processedData.lastName,
          displayName: processedData.firstName ? 
            `${processedData.firstName} ${processedData.lastName || ''}`.trim() : 
            processedData.username,
        },
        preferences: {
          language: 'en',
          timezone: 'UTC',
          theme: 'auto',
        },
        stats: {
          loginCount: 0,
          postCount: 0,
          commentCount: 0,
        },
        security: {
          failedLoginAttempts: 0,
          passwordChangedAt: new Date(),
        },
        metadata: {
          source: 'registration',
        },
      });

      // Send email verification if required
      if (this.managerConfig.requireEmailVerification) {
        await this.sendEmailVerification(user);
      }

      const authUser = await this.createAuthUser(user);

      // Apply after registration hooks
      await this.hooks.doAction(CoreHooks.USER_REGISTERED, {
        user: authUser,
        originalData: finalUserData,
      });

      // Emit registration event
      await this.events.emit(EventType.USER_REGISTERED, {
        userId: user.id.toString(),
        email: user.email,
        username: user.username,
        timestamp: new Date(),
      });

      this.logger.info('User registered successfully', { 
        userId: user.id, 
        email: user.email 
      });

      return {
        success: true,
        user: authUser,
      };

    } catch (error) {
      this.logger.error('Registration error:', error);
      return this.createAuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Registration failed');
    }
  }

  /**
   * Request password reset
   */
  public async requestPasswordReset(email: string): Promise<boolean> {
    try {
      const sanitizedEmail = Sanitizer.sanitizeEmail(email);
      const user = await this.userRepo.findByEmail(sanitizedEmail);
      
      if (!user) {
        // Don't reveal if user exists
        this.logger.warn('Password reset requested for non-existent email', { email: sanitizedEmail });
        return true;
      }

      const token = await this.passwordHandler.generateResetToken(user.id.toString());
      
      // Store reset request
      const resetRequest: PasswordResetRequest = {
        userId: user.id,
        token,
        email: user.email,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        used: false,
        createdAt: new Date(),
      };

      this.passwordResets.set(token, resetRequest);

      // Cache reset request
      await this.cache.set(`pwd_reset:${token}`, resetRequest, 3600); // 1 hour

      // Apply password reset hooks
      await this.hooks.doAction(CoreHooks.USER_BEFORE_UPDATE, {
        user: await this.createAuthUser(user),
        token,
        action: 'password_reset_request',
      });

      // Emit event for email sending
      await this.events.emit(EventType.USER_PASSWORD_RESET, {
        userId: user.id.toString(),
        email: user.email,
        token,
        timestamp: new Date(),
        action: 'password_reset_requested',
      });

      this.logger.info('Password reset requested', { 
        userId: user.id, 
        email: user.email 
      });
      return true;

    } catch (error) {
      this.logger.error('Password reset request error:', error);
      return false;
    }
  }

  /**
   * Reset password with token
   */
  public async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const resetRequest = await this.passwordHandler.verifyResetToken(token);
      if (!resetRequest) {
        return false;
      }

      const user = await this.userRepo.findById(resetRequest.userId);
      if (!user) {
        return false;
      }

      // Validate new password
      const passwordValidation = await this.passwordHandler.validatePassword(newPassword, user);
      if (!passwordValidation.valid) {
        this.logger.warn('Password reset failed - weak password', { 
          userId: user.id,
          errors: passwordValidation.errors 
        });
        return false;
      }

      await this.passwordHandler.updatePassword(user.id.toString(), newPassword);
      await this.passwordHandler.useResetToken(token);

      // Clear cache
      await this.cache.delete(`pwd_reset:${token}`);

      // Revoke all user sessions
      await this.logout(undefined, user.id.toString());

      // Apply password reset hooks
      await this.hooks.doAction(CoreHooks.USER_UPDATED, {
        user: await this.createAuthUser(user),
        action: 'password_reset_completed',
      });

      // Emit event
      await this.events.emit(EventType.USER_PASSWORD_CHANGED, {
        userId: user.id.toString(),
        email: user.email,
        timestamp: new Date(),
        action: 'password_reset_completed',
      });

      this.logger.info('Password reset successful', { userId: user.id });
      return true;

    } catch (error) {
      this.logger.error('Password reset error:', error);
      return false;
    }
  }

  /**
   * Verify email address
   */
  public async verifyEmail(token: string): Promise<boolean> {
    try {
      const verification = this.emailVerifications.get(token);
      if (!verification || verification.used || verification.expiresAt < new Date()) {
        return false;
      }

      const user = await this.userRepo.findById(verification.userId);
      if (!user) {
        return false;
      }

      // Update user
      await this.userRepo.updateOne(user.id, {
        emailVerified: true,
        status: UserStatus.ACTIVE,
      });

      // Mark verification as used
      verification.used = true;
      this.emailVerifications.set(token, verification);

      // Apply email verification hooks
      await this.hooks.doAction(CoreHooks.USER_UPDATED, {
        user: await this.createAuthUser(user),
        action: 'email_verified',
      });

      // Emit event
      await this.events.emit(EventType.USER_UPDATED, {
        userId: user.id.toString(),
        email: user.email,
        timestamp: new Date(),
        action: 'email_verified',
      });

      this.logger.info('Email verified successfully', { 
        userId: user.id, 
        email: user.email 
      });
      return true;

    } catch (error) {
      this.logger.error('Email verification error:', error);
      return false;
    }
  }

  /**
   * Check user permission
   */
  public async hasPermission(userId: string, permission: string, context?: any): Promise<boolean> {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return false;
      }

      const result = await this.permissionManager.hasPermission(user, permission, context);
      return result.granted;

    } catch (error) {
      this.logger.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Get authentication statistics
   */
  public async getStats(): Promise<AuthStats> {
    try {
      const totalUsers = await this.userRepo.count({});
      const activeUsers = await this.userRepo.count({ status: UserStatus.ACTIVE });
      const lockedAccounts = await this.userRepo.count({ status: UserStatus.SUSPENDED });

      const today = DateUtils.startOfDay(new Date());
      const newUsersToday = await this.userRepo.count({
        createdAt: { $gte: today },
      });

      // Count today's login attempts
      const todayAttempts = today
        ? this.authAttempts.filter(attempt => attempt.timestamp >= today)
        : [];
      const loginAttemptsToday = todayAttempts.length;
      const successfulLoginsToday = todayAttempts.filter(a => a.success).length;
      const failedLoginsToday = todayAttempts.filter(a => !a.success).length;

      return {
        totalUsers,
        activeUsers,
        newUsersToday,
        loginAttemptsToday,
        successfulLoginsToday,
        failedLoginsToday,
        lockedAccounts,
        activeSessions: this.activeSessions.size,
      };

    } catch (error) {
      this.logger.error('Get stats error:', error);
      throw error;
    }
  }

  /**
   * Get authentication metrics
   */
  public async getMetrics(): Promise<AuthMetrics> {
    try {
      if (!this.managerConfig.metricsEnabled) {
        throw new Error('Metrics are disabled');
      }

      const stats = await this.getStats();
      
      // Calculate additional metrics from auth attempts
      const totalLogins = this.authAttempts.length;
      const successfulLogins = this.authAttempts.filter(a => a.success).length;
      const failedLogins = this.authAttempts.filter(a => !a.success).length;

      // Group by hour for the last 24 hours
      const now = new Date();
      const loginsByHour: Record<string, number> = {};
      for (let i = 0; i < 24; i++) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000).getHours();
        loginsByHour[hour.toString()] = 0;
      }

      this.authAttempts
        .filter(a => a.timestamp > new Date(now.getTime() - 24 * 60 * 60 * 1000))
        .forEach(attempt => {
          const hour = attempt.timestamp.getHours().toString();
          loginsByHour[hour] = (loginsByHour[hour] || 0) + 1;
        });

      return {
        totalLogins,
        successfulLogins,
        failedLogins,
        activeUsers: stats.activeUsers,
        activeSessions: stats.activeSessions,
        lockedAccounts: stats.lockedAccounts,
        twoFactorUsers: 0, // TODO: Count users with 2FA enabled
        oauthUsers: 0, // TODO: Count OAuth users
        averageSessionDuration: 0, // TODO: Calculate from session data
        loginsByHour,
        loginsByDay: {}, // TODO: Implement daily stats
        topUserAgents: {}, // TODO: Analyze user agents
        topCountries: {}, // TODO: Analyze IP geolocation
        securityIncidents: 0, // TODO: Count security incidents
        lastUpdate: new Date(),
      };

    } catch (error) {
      this.logger.error('Get metrics error:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<AuthHealthCheck> {
    try {
      const errors: string[] = [];
      
      // Check database connectivity
      let databaseHealthy = true;
      try {
        await this.userRepo.findOne({});
      } catch (error) {
        databaseHealthy = false;
        errors.push(`Database: ${error}`);
      }

      // Check cache connectivity
      let cacheHealthy = true;
      try {
        await this.cache.set('health:test', 'test', 10);
        await this.cache.get('health:test');
      } catch (error) {
        cacheHealthy = false;
        errors.push(`Cache: ${error.message}`);
      }

      // Test token generation
      let tokensHealthy = true;
      try {
        const testUser = {
          _id: new Types.ObjectId(),
          email: 'test@test.com',
          username: 'test',
          role: UserRole.SUBSCRIBER,
        } as IUser;
        await this.jwtHandler.generateTokens(testUser);
      } catch (error) {
        tokensHealthy = false;
        errors.push(`Tokens: ${error.message}`);
      }

      const healthy = databaseHealthy && cacheHealthy && tokensHealthy;

      return {
        healthy,
        services: {
          database: databaseHealthy,
          cache: cacheHealthy,
          tokens: tokensHealthy,
          sessions: this.managerConfig.enableSessionManagement,
          twoFactor: this.managerConfig.enableTwoFactorAuth,
        },
        metrics: {
          activeUsers: await this.userRepo.count({ status: UserStatus.ACTIVE }),
          activeSessions: this.activeSessions.size,
          errorRate: 0, // TODO: Calculate from logs
          averageResponseTime: 0, // TODO: Calculate from metrics
        },
        lastCheck: new Date(),
        errors,
      };

    } catch (error) {
      this.logger.error('Health check error:', error);
      return {
        healthy: false,
        services: {
          database: false,
          cache: false,
          tokens: false,
          sessions: false,
          twoFactor: false,
        },
        metrics: {
          activeUsers: 0,
          activeSessions: 0,
          errorRate: 1,
          averageResponseTime: -1,
        },
        lastCheck: new Date(),
        errors: [error.message],
      };
    }
  }

  /**
   * Add authentication middleware
   */
  public addMiddleware(middleware: AuthMiddleware): void {
    this.middleware.push(middleware);
    this.logger.debug('Auth middleware added', { name: middleware.name });
  }

  /**
   * Shutdown authentication manager
   */
  public async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down authentication manager...');

      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // Clear all sessions
      this.activeSessions.clear();
      this.oauthStates.clear();
      this.passwordResets.clear();
      this.emailVerifications.clear();
      this.loginAttempts.clear();
      this.authAttempts.length = 0;

      this.initialized = false;

      await this.events.emit(EventType.SYSTEM_SHUTDOWN, {
        timestamp: new Date(),
        component: 'AuthManager',
      });

      this.logger.info('Authentication manager shutdown complete');

    } catch (error) {
      this.logger.error('Auth manager shutdown error:', error);
      throw error;
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private validateCredentials(credentials: AuthCredentials): { valid: boolean; error?: string } {
    try {
      // Use an appropriate schema for AuthCredentials validation
      const validation = Validator.validate(Validator.loginSchema, credentials);
      if (!validation.success) {
        return { valid: false, error: validation.errors.message };
      }

      if (!credentials.email && !credentials.username) {
        return { valid: false, error: 'Email or username is required' };
      }

      if (!credentials.password) {
        return { valid: false, error: 'Password is required' };
      }

      if (credentials.email && !Validator.isEmail(credentials.email)) {
        return { valid: false, error: 'Invalid email format' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Validation failed' };
    }
  }

  private validateRegistrationData(userData: RegistrationData): { valid: boolean; error?: string } {
    try {
      const validation = Validator.validate(Validator.userCreateSchema, userData);
      if (!validation.success) {
        return { valid: false, error: validation.errors.message };
      }

      if (!userData.email || !Sanitizer.isEmail(userData.email)) {
        return { valid: false, error: 'Valid email is required' };
      }

      if (!userData.username || userData.username.length < 3) {
        return { valid: false, error: 'Username must be at least 3 characters long' };
      }

      if (!userData.password) {
        return { valid: false, error: 'Password is required' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Validation failed' };
    }
  }

  private async findUserByCredentials(credentials: AuthCredentials): Promise<IUser | null> {
    try {
      if (credentials.email) {
        return await this.userRepo.findByEmail(credentials.email);
      } else if (credentials.username) {
        return await this.userRepo.findByUsername(credentials.username);
      }
      return null;
    } catch (error) {
      this.logger.error('Error finding user by credentials:', error);
      return null;
    }
  }

  private checkAccountStatus(user: IUser): { valid: boolean; errorCode?: AuthErrorCode; message?: string } {
    switch (user.status) {
      case UserStatus.ACTIVE:
        return { valid: true };
      case UserStatus.INACTIVE:
        return { valid: false, errorCode: AuthErrorCode.USER_INACTIVE, message: 'Account is inactive' };
      case UserStatus.SUSPENDED:
        return { valid: false, errorCode: AuthErrorCode.USER_SUSPENDED, message: 'Account is suspended' };
      case UserStatus.PENDING:
        return { valid: false, errorCode: AuthErrorCode.EMAIL_NOT_VERIFIED, message: 'Email verification required' };
      default:
        return { valid: false, errorCode: AuthErrorCode.USER_NOT_FOUND, message: 'Invalid account status' };
    }
  }

  private async createAuthUser(user: IUser): Promise<AuthUser> {
    const permissions = await this.permissionManager.getUserPermissions(user.id.toString());

    return {
      id: user.id.toString(),
      email: user.email,
      username: user.username,
      rolel: user.role,
      status: user.status,
      permissions,
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
      },
      preferences: {
        language: user.preferences?.language || 'en',
        timezone: user.preferences?.timezone || 'UTC',
        theme: user.preferences?.theme || 'auto',
      },
      meta: {
        lastLogin: user.lastLogin,
        loginCount: user.stats?.loginCount || 0,
        emailVerified: user.emailVerified || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
        passwordChangedAt: user.security?.passwordChangedAt,
      },
    };
  }

  private async createSession(
    user: IUser,
    tokens: AuthTokens,
    credentials: AuthCredentials
  ): Promise<AuthSession> {
    const sessionId = crypto.randomUUID();
    
    const session: AuthSession = {
      id: sessionId,
      userId: user.id.toString(),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      ipAddress: credentials.ipAddress,
      userAgent: credentials.userAgent,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.managerConfig.session.timeout * 60 * 1000),
      lastActivity: new Date(),
      isActive: true,
      data: {
        rememberMe: credentials.rememberMe,
        trustDevice: credentials.trustDevice,
      },
    };

    this.activeSessions.set(sessionId, session);

    // Cache session
    await this.cache.set(`session:${sessionId}`, session, this.managerConfig.session.timeout * 60);

    // Emit session creation event
    await this.events.emit(EventType.USER_LOGIN, {
      userId: user.id.toString(),
      sessionId,
      timestamp: new Date(),
      action: 'session_created',
    });

    return session;
  }

  private async updateSessionActivity(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session && this.managerConfig.session.extendOnActivity) {
      session.lastActivity = new Date();
      session.expiresAt = new Date(Date.now() + this.managerConfig.session.timeout * 60 * 1000);
      
      // Update cache
      await this.cache.set(`session:${sessionId}`, session, this.managerConfig.session.timeout * 60);
    }
  }

  private async updateUserLoginStats(user: IUser, credentials: AuthCredentials): Promise<void> {
    const updateData: Partial<IUser> = {
      lastLogin: new Date(),
      'stats.loginCount': (user.stats?.loginCount || 0) + 1,
    };

    await this.userRepo.update(user.id, updateData);
  }

  private async isAccountLocked(user: IUser): Promise<boolean> {
    const lockoutEnd = user.security?.lockedUntil;
    if (!lockoutEnd) return false;
    
    return lockoutEnd > new Date();
  }

  private async incrementFailedAttempts(user: IUser): Promise<void> {
    const attempts = (user.security?.failedLoginAttempts || 0) + 1;
    const updateData: Partial<IUser> = {
      'security.failedLoginAttempts': attempts,
    };

    // Lock account if max attempts reached
    if (attempts >= this.managerConfig.maxFailedAttempts) {
      updateData['security.lockedUntil'] = new Date(
        Date.now() + this.managerConfig.lockoutDuration * 60 * 1000
      );
      updateData.status = UserStatus.SUSPENDED;
    }

    await this.userRepo.update(user.id, updateData);
  }

  private async clearFailedAttempts(user: IUser): Promise<void> {
    await this.userRepo.update(user.id, {
      'security.failedLoginAttempts': 0,
      'security.lockedUntil': undefined,
    });
  }

  private async checkRateLimit(credentials: AuthCredentials): Promise<{ allowed: boolean; remaining?: number }> {
    const identifier = credentials.email || credentials.ipAddress || 'anonymous';
    const cacheKey = `rate_limit:${identifier}`;
    
    try {
      const attempts = await this.cache.get<number>(cacheKey) || 0;
      const maxAttempts = 10; // Allow 10 attempts per hour
      
      if (attempts >= maxAttempts) {
        return { allowed: false, remaining: 0 };
      }

      await this.cache.set(cacheKey, attempts + 1, 3600); // 1 hour
      return { allowed: true, remaining: maxAttempts - attempts - 1 };
    } catch (error) {
      // If cache fails, allow the request
      return { allowed: true };
    }
  }

  private async recordFailedAttempt(credentials: AuthCredentials, user?: IUser): Promise<void> {
    const attempt: AuthAttempt = {
      userId: user?._id,
      email: credentials.email,
      ipAddress: credentials.ipAddress || '',
      userAgent: credentials.userAgent,
      success: false,
      failureReason: AuthErrorCode.INVALID_CREDENTIALS,
      timestamp: new Date(),
    };

    this.authAttempts.push(attempt);

    // Keep only last 1000 attempts in memory
    if (this.authAttempts.length > 1000) {
      this.authAttempts.splice(0, this.authAttempts.length - 1000);
    }

    await this.events.emit(EventType.USER_LOGIN_FAILED, {
      userId: user?._id?.toString(),
      email: credentials.email || '',
      username: credentials.username || '',
      ipAddress: credentials.ipAddress || '',
      userAgent: credentials.userAgent || '',
      timestamp: new Date(),
    });
  }

  private async recordSuccessfulAttempt(credentials: AuthCredentials, user: IUser): Promise<void> {
    const attempt: AuthAttempt = {
      userId: user.id,
      email: credentials.email,
      ipAddress: credentials.ipAddress || '',
      userAgent: credentials.userAgent,
      success: true,
      timestamp: new Date(),
    };

    this.authAttempts.push(attempt);

    // Keep only last 1000 attempts in memory
    if (this.authAttempts.length > 1000) {
      this.authAttempts.splice(0, this.authAttempts.length - 1000);
    }
  }

  private createAuthError(code: AuthErrorCode, message: string, details?: any): AuthResult {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date(),
      },
    };
  }

  private async generateTwoFactorToken(user: IUser): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store temporarily in cache
    await this.cache.set(`2fa:${token}`, user.id.toString(), 300); // 5 minutes
    
    return token;
  }

  private async verifyTwoFactorCode(user: IUser, code: string): Promise<boolean> {
    // This would integrate with a TOTP library like speakeasy
    // For now, return true if code is provided and has correct format
    return !!code && code.length === 6 && /^\d{6}$/.test(code);
  }

  private async sendEmailVerification(user: IUser): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');
    
    const verification: EmailVerificationRequest = {
      userId: user.id,
      token,
      email: user.email,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      used: false,
      createdAt: new Date(),
    };

    this.emailVerifications.set(token, verification);

    // Cache verification
    await this.cache.set(`email_verify:${token}`, verification, 24 * 60 * 60); // 24 hours

    await this.events.emit(EventType.EMAIL_SENT, {
      userId: user.id.toString(),
      email: user.email,
      token,
      timestamp: new Date(),
      type: 'email_verification',
    });
  }

  private startSessionCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.managerConfig.sessionCleanupInterval * 60 * 1000);
  }

  private startDataCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredData();
    }, this.managerConfig.cleanupInterval * 60 * 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        this.activeSessions.delete(sessionId);
        this.cache.delete(`session:${sessionId}`);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Cleaned up expired sessions', { count: cleaned });
    }
  }

  private cleanupExpiredData(): void {
    const now = new Date();
    let cleaned = 0;

    // Cleanup password resets
    for (const [token, request] of this.passwordResets.entries()) {
      if (request.expiresAt < now || request.used) {
        this.passwordResets.delete(token);
        this.cache.delete(`pwd_reset:${token}`);
        cleaned++;
      }
    }

    // Cleanup email verifications
    for (const [token, verification] of this.emailVerifications.entries()) {
      if (verification.expiresAt < now || verification.used) {
        this.emailVerifications.delete(token);
        this.cache.delete(`email_verify:${token}`);
        cleaned++;
      }
    }

    // Cleanup OAuth states
    for (const [state, oauthState] of this.oauthStates.entries()) {
      if (oauthState.expiresAt < now) {
        this.oauthStates.delete(state);
        cleaned++;
      }
    }

    // Cleanup old auth attempts (keep only last 24 hours)
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const initialLength = this.authAttempts.length;
    this.authAttempts = this.authAttempts.filter(attempt => attempt.timestamp > cutoff);
    cleaned += initialLength - this.authAttempts.length;

    if (cleaned > 0) {
      this.logger.debug('Cleaned up expired data', { count: cleaned });
    }
  }

  private async registerDefaultMiddleware(): Promise<void> {
    // Add any default middleware here
    this.logger.debug('Registered default middleware');
  }

  private async registerEventHandlers(): Promise<void> {
    // Register event handlers for auth events
    this.logger.debug('Registered event handlers');
  }

  private async registerHooks(): Promise<void> {
    // Register hooks for plugin system integration
    this.logger.debug('Registered hooks');
  }

  // Middleware application methods
  private async applyBeforeAuthMiddleware(credentials: AuthCredentials): Promise<AuthCredentials> {
    let processed = credentials;
    
    for (const middleware of this.middleware) {
      if (middleware.beforeAuth) {
        processed = await middleware.beforeAuth(processed);
      }
    }
    
    return processed;
  }

  private async applyAfterAuthMiddleware(result: AuthResult): Promise<AuthResult> {
    let processed = result;
    
    for (const middleware of this.middleware) {
      if (middleware.afterAuth) {
        processed = await middleware.afterAuth(processed);
      }
    }
    
    return processed;
  }

  private async applyBeforeRefreshMiddleware(token: string): Promise<string> {
    let processed = token;
    
    for (const middleware of this.middleware) {
      if (middleware.beforeRefresh) {
        processed = await middleware.beforeRefresh(processed);
      }
    }
    
    return processed;
  }

  private async applyAfterRefreshMiddleware(result: AuthResult): Promise<AuthResult> {
    let processed = result;
    
    for (const middleware of this.middleware) {
      if (middleware.afterRefresh) {
        processed = await middleware.afterRefresh(processed);
      }
    }
    
    return processed;
  }

  private async applyBeforeLogoutMiddleware(session: AuthSession): Promise<void> {
    for (const middleware of this.middleware) {
      if (middleware.beforeLogout) {
        await middleware.beforeLogout(session);
      }
    }
  }

  private async applyAfterLogoutMiddleware(session: AuthSession): Promise<void> {
    for (const middleware of this.middleware) {
      if (middleware.afterLogout) {
        await middleware.afterLogout(session);
      }
    }
  }
}