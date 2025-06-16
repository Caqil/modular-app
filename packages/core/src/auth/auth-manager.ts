// ===================================================================
// AUTH MANAGER - MAIN AUTHENTICATION ORCHESTRATION SYSTEM
// ===================================================================

import crypto from 'crypto';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { ConfigManager } from '../config/config-manager';
import { CacheManager } from '../cache/cache-manager';
import { Validator } from '../utils/validator';
import { Sanitizer } from '../utils/sanitizer';
import { User, type IUser } from '../database/models';
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
  private jwtHandler: JWTHandler;
  private passwordHandler: PasswordHandler;
  private permissionManager: PermissionManager;
  private initialized = false;
  private managerConfig: AuthManagerConfig;
  private middleware: AuthMiddleware[] = [];
  private activeSessions = new Map<string, AuthSession>();
  private oauthStates = new Map<string, OAuthState>();
  private passwordResets = new Map<string, PasswordResetRequest>();
  private emailVerifications = new Map<string, EmailVerificationRequest>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private readonly defaultConfig: AuthManagerConfig = {
    jwt: {
      secret: 'your-super-secret-jwt-key-change-this-in-production',
      expiresIn: '7d',
      refreshExpiresIn: '30d',
      algorithm: 'HS256',
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
  };

  private constructor() {
    this.managerConfig = this.defaultConfig;
  }

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
      const authConfig = await this.config.get<AuthManagerConfig>('auth');
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

      // Register default middleware
      await this.registerDefaultMiddleware();

      // Register event handlers
      await this.registerEventHandlers();

      this.initialized = true;
      this.logger.info('Authentication manager initialized successfully', {
        jwtEnabled: true,
        sessionManagement: this.managerConfig.enableSessionManagement,
        twoFactorAuth: this.managerConfig.enableTwoFactorAuth,
        oauth: this.managerConfig.enableOAuth,
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

      // Apply before auth middleware
      const processedCredentials = await this.applyBeforeAuthMiddleware(credentials);

      // Validate credentials
      const validation = this.validateCredentials(processedCredentials);
      if (!validation.valid) {
        return this.createAuthError(AuthErrorCode.INVALID_CREDENTIALS, validation.error);
      }

      // Find user
      const user = await this.findUserByCredentials(processedCredentials);
      if (!user) {
        await this.recordFailedAttempt(processedCredentials);
        return this.createAuthError(AuthErrorCode.USER_NOT_FOUND, 'Invalid credentials');
      }

      // Check account status
      const statusCheck = this.checkAccountStatus(user);
      if (!statusCheck.valid) {
        return this.createAuthError(statusCheck.errorCode!, statusCheck.message!);
      }

      // Check account lockout
      if (this.managerConfig.enableAccountLockout && this.passwordHandler.shouldLockAccount(user.id.toString())) {
        await this.lockAccount(user);
        return this.createAuthError(AuthErrorCode.ACCOUNT_LOCKED, 'Account locked due to multiple failed attempts');
      }

      // Verify password
      const isValidPassword = await this.passwordHandler.verifyPassword(
        processedCredentials.password,
        user.password
      );

      if (!isValidPassword) {
        this.passwordHandler.recordFailedAttempt(
          user.id.toString(),
          processedCredentials.ipAddress,
          processedCredentials.userAgent
        );
        await this.recordFailedAttempt(processedCredentials, user);
        return this.createAuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid credentials');
      }

      // Check password expiry
      if (this.passwordHandler.isPasswordExpired(user)) {
        return this.createAuthError(AuthErrorCode.PASSWORD_EXPIRED, 'Password has expired');
      }

      // Check two-factor authentication
      if (this.managerConfig.enableTwoFactorAuth && user.twoFactorEnabled && !processedCredentials.twoFactorCode) {
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
      if (processedCredentials.twoFactorCode) {
        const twoFactorValid = await this.verifyTwoFactorCode(user, processedCredentials.twoFactorCode);
        if (!twoFactorValid) {
          return this.createAuthError(AuthErrorCode.INVALID_TWO_FACTOR, 'Invalid two-factor code');
        }
      }

      // Generate tokens
      const tokens = await this.jwtHandler.generateTokens(user);

      // Create session
      let session: AuthSession | undefined;
      if (this.managerConfig.enableSessionManagement) {
        session = await this.createSession(user, tokens, processedCredentials);
      }

      // Update user login stats
      await this.updateUserLoginStats(user, processedCredentials);

      // Clear failed attempts
      this.passwordHandler.clearFailedAttempts(user.id.toString());

      // Create auth user object
      const authUser = await this.createAuthUser(user);

      const result: AuthResult = {
        success: true,
        user: authUser,
        tokens,
        session,
      };

      // Apply after auth middleware
      const finalResult = await this.applyAfterAuthMiddleware(result);

      // Emit success event
      await this.emitAuthEvent(AuthEventType.LOGIN_SUCCESS, {
        userId: user.id.toString(),
        email: user.email,
        username: user.username,
        ipAddress: processedCredentials.ipAddress,
        userAgent: processedCredentials.userAgent,
        timestamp: new Date(),
      });

      this.logger.info('Authentication successful', {
        userId: user._id,
        email: user.email,
        ipAddress: processedCredentials.ipAddress,
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
          error: refreshResult.error,
        };
      }

      // Get user from token
      const decoded = this.jwtHandler.decodeToken(refreshResult.tokens!.accessToken);
      const user = await User.findById(decoded?.sub);

      if (!user) {
        return this.createAuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found');
      }

      // Update session if exists
      if (this.managerConfig.enableSessionManagement && decoded?.sessionId) {
        await this.updateSessionActivity(decoded.sessionId);
      }

      const authUser = await this.createAuthUser(user);

      const result: AuthResult = {
        success: true,
        user: authUser,
        tokens: refreshResult.tokens,
      };

      // Apply after refresh middleware
      const finalResult = await this.applyAfterRefreshMiddleware(result);

      // Emit refresh event
      await this.emitAuthEvent(AuthEventType.TOKEN_REFRESH, {
        userId: user.id.toString(),
        timestamp: new Date(),
      });

      this.logger.debug('Token refresh successful', { userId: user._id });
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

      // Emit logout event
      await this.emitAuthEvent(AuthEventType.LOGOUT, {
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

      const user = await User.findById(validation.payload!.sub);
      if (!user) {
        return this.createAuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found');
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
  public async register(userData: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResult> {
    try {
      if (!this.managerConfig.enableRegistration) {
        return this.createAuthError(AuthErrorCode.PERMISSION_DENIED, 'Registration is disabled');
      }

      this.logger.debug('User registration attempt', { email: userData.email, username: userData.username });

      // Validate input
      const validation = this.validateRegistrationData(userData);
      if (!validation.valid) {
        return this.createAuthError(AuthErrorCode.INVALID_CREDENTIALS, validation.error);
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { username: userData.username },
        ],
      });

      if (existingUser) {
        return this.createAuthError(AuthErrorCode.USER_NOT_FOUND, 'User already exists');
      }

      // Validate password
      const passwordValidation = this.passwordHandler.validatePassword(userData.password);
      if (!passwordValidation.valid) {
        return this.createAuthError(AuthErrorCode.WEAK_PASSWORD, passwordValidation.errors.join(', '));
      }

      // Hash password
      const hashedPassword = await this.passwordHandler.hashPassword(userData.password);

      // Create user
      const user = new User({
        email: userData.email.toLowerCase(),
        username: userData.username,
        password: hashedPassword.hash,
        role: UserRole.SUBSCRIBER,
        status: this.managerConfig.requireEmailVerification ? UserStatus.PENDING : UserStatus.ACTIVE,
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : userData.username,
        },
        meta: {
          emailVerified: !this.managerConfig.requireEmailVerification,
          loginCount: 0,
          twoFactorEnabled: false,
        },
        passwordChangedAt: new Date(),
      });

      await user.save();

      // Send email verification if required
      if (this.managerConfig.requireEmailVerification) {
        await this.sendEmailVerification(user);
      }

      const authUser = await this.createAuthUser(user);

      this.logger.info('User registered successfully', { userId: user._id, email: user.email });

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
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if user exists
        return true;
      }

      const token = await this.passwordHandler.generateResetToken(user.id.toString());
      
      // Store reset request
      const resetRequest: PasswordResetRequest = {
        userId: user._id,
        token,
        email: user.email,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        used: false,
        createdAt: new Date(),
      };

      this.passwordResets.set(token, resetRequest);

      // Emit event for email sending
      await this.emitAuthEvent(AuthEventType.PASSWORD_RESET_REQUEST, {
        userId: user._id.toString(),
        email: user.email,
        timestamp: new Date(),
        metadata: { token },
      });

      this.logger.info('Password reset requested', { userId: user._id, email: user.email });
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

      const user = await User.findById(resetRequest.userId);
      if (!user) {
        return false;
      }

      await this.passwordHandler.updatePassword(user.id.toString(), newPassword);
      await this.passwordHandler.useResetToken(token);

      // Revoke all user sessions
      await this.logout(undefined, user.id.toString());

      // Emit event
      await this.emitAuthEvent(AuthEventType.PASSWORD_RESET_SUCCESS, {
        userId: user.id.toString(),
        email: user.email,
        timestamp: new Date(),
      });

      this.logger.info('Password reset successful', { userId: user._id });
      return true;

    } catch (error) {
      this.logger.error('Password reset error:', error);
      return false;
    }
  }

  /**
   * Check user permission
   */
  public async hasPermission(userId: string, permission: string, context?: any): Promise<boolean> {
    try {
      const user = await User.findById(userId);
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
   * Get authentication metrics
   */
  public async getMetrics(): Promise<AuthMetrics> {
    try {
      if (!this.managerConfig.metricsEnabled) {
        throw new Error('Metrics are disabled');
      }

      // This would typically be calculated from stored events/logs
      // For now, return basic metrics
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ status: UserStatus.ACTIVE });
      const lockedAccounts = await User.countDocuments({ status: UserStatus.SUSPENDED });

      return {
        totalLogins: 0, // Would be tracked in events
        successfulLogins: 0,
        failedLogins: 0,
        activeUsers,
        activeSessions: this.activeSessions.size,
        lockedAccounts,
        twoFactorUsers: 0, // Would query users with 2FA enabled
        oauthUsers: 0,
        averageSessionDuration: 0,
        loginsByHour: {},
        loginsByDay: {},
        topUserAgents: {},
        topCountries: {},
        securityIncidents: 0,
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
        await User.findOne().limit(1);
      } catch (error) {
        databaseHealthy = false;
        errors.push(`Database: ${error.message}`);
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
        const testUser = { _id: 'test', email: 'test@test.com', username: 'test', role: UserRole.SUBSCRIBER } as IUser;
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
          activeUsers: await User.countDocuments({ status: UserStatus.ACTIVE }),
          activeSessions: this.activeSessions.size,
          errorRate: 0, // Would be calculated from logs
          averageResponseTime: 0, // Would be calculated from metrics
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

      this.initialized = false;
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
  }

  private validateRegistrationData(userData: any): { valid: boolean; error?: string } {
    if (!userData.email || !Validator.isEmail(userData.email)) {
      return { valid: false, error: 'Valid email is required' };
    }

    if (!userData.username || userData.username.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters long' };
    }

    if (!userData.password) {
      return { valid: false, error: 'Password is required' };
    }

    return { valid: true };
  }

  private async findUserByCredentials(credentials: AuthCredentials): Promise<IUser | null> {
    const query: any = {};

    if (credentials.email) {
      query.email = credentials.email.toLowerCase();
    } else if (credentials.username) {
      query.username = credentials.username;
    }

    return User.findOne(query);
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
      role: user.role,
      status: user.status,
      permissions,
      profile: {
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        displayName: user.profile?.displayName || user.username,
        avatar: user.profile?.avatar,
      },
      preferences: {
        language: user.preferences?.language || 'en',
        timezone: user.preferences?.timezone || 'UTC',
        theme: user.preferences?.theme || 'light',
      },
      meta: {
        lastLogin: user.meta?.lastLogin,
        loginCount: user.meta?.loginCount || 0,
        emailVerified: user.meta?.emailVerified || false,
        twoFactorEnabled: user.meta?.twoFactorEnabled || false,
        passwordChangedAt: user.passwordChangedAt,
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
      },
    };

    this.activeSessions.set(sessionId, session);

    // Emit session creation event
    await this.emitAuthEvent(AuthEventType.SESSION_CREATED, {
      userId: user.id.toString(),
      sessionId,
      timestamp: new Date(),
    });

    return session;
  }

  private async updateSessionActivity(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session && this.managerConfig.session.extendOnActivity) {
      session.lastActivity = new Date();
      session.expiresAt = new Date(Date.now() + this.managerConfig.session.timeout * 60 * 1000);
    }
  }

  private async updateUserLoginStats(user: IUser, credentials: AuthCredentials): Promise<void> {
    const updateData: any = {
      'meta.lastLogin': new Date(),
      'meta.loginCount': (user.meta?.loginCount || 0) + 1,
      'meta.lastLoginIP': credentials.ipAddress,
    };

    await User.findByIdAndUpdate(user._id, updateData);
  }

  private async lockAccount(user: IUser): Promise<void> {
    await User.findByIdAndUpdate(user._id, {
      status: UserStatus.SUSPENDED,
      'meta.lockedAt': new Date(),
      'meta.lockReason': 'Multiple failed login attempts',
    });

    await this.emitAuthEvent(AuthEventType.ACCOUNT_LOCKED, {
      userId: user.id.toString(),
      email: user.email,
      timestamp: new Date(),
    });
  }

  private async recordFailedAttempt(credentials: AuthCredentials, user?: IUser): Promise<void> {
    await this.emitAuthEvent(AuthEventType.LOGIN_FAILED, {
      userId: user?.id?.toString(),
      email: credentials.email ?? '',
      username: credentials.username ?? '',
      ipAddress: credentials.ipAddress ?? '',
      userAgent: credentials.userAgent ?? '',
      timestamp: new Date(),
    });
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
    // Generate temporary token for 2FA verification
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store temporarily (would be better in cache/database)
    await this.cache.set(`2fa:${token}`, user.id.toString(), 300); // 5 minutes
    
    return token;
  }

  private async verifyTwoFactorCode(user: IUser, code: string): Promise<boolean> {
    // This would integrate with a TOTP library like speakeasy
    // For now, return true if code is provided
    return !!code && code.length === 6;
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

    await this.emitAuthEvent(AuthEventType.EMAIL_VERIFICATION_SENT, {
      userId: user.id.toString(),
      email: user.email,
      timestamp: new Date(),
      metadata: { token },
    });
  }

  private startSessionCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.managerConfig.sessionCleanupInterval * 60 * 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        this.activeSessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Cleaned up expired sessions', { count: cleaned });
    }
  }

  private async emitAuthEvent(type: AuthEventType, data: AuthEventData): Promise<void> {
    try {
      await this.events.emit(type, data);
    } catch (error) {
      this.logger.error('Failed to emit auth event:', error);
    }
  }

  private async registerDefaultMiddleware(): Promise<void> {
    // Add any default middleware here
  }

  private async registerEventHandlers(): Promise<void> {
    // Register event handlers for auth events
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