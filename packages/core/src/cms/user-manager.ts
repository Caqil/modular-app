import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
import { PaginatedResult } from '../types/database';
import { UserRepository } from '../database/repositories/user-repository';
import { type IUser } from '../database/models';
import { UserQuery, UserRole, UserSession, UserStats, UserStatus, type LoginCredentials, type UserProfile } from '../types/user';

export interface UserManagerConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
  enableTwoFactor: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordPolicy: PasswordPolicy;
  enableUserRegistration: boolean;
  requireEmailVerification: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number;
  expiryDays?: number;
}

export interface AuthResult {
  success: boolean;
  user?: IUser;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
}


export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface PasswordResetRequest {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserActivity {
  userId: Types.ObjectId;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface BulkUserOperation {
  action: 'activate' | 'deactivate' | 'delete' | 'change_role' | 'reset_password';
  userIds: string[];
  options?: {
    role?: UserRole;
    sendNotification?: boolean;
    reason?: string;
  };
}

export interface BulkUserResult {
  successful: string[];
  failed: Array<{
    userId: string;
    error: string;
  }>;
  stats: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * User Manager
 * Handles user authentication, authorization, sessions, and user management
 */
export class UserManager {
  private static instance: UserManager;
  private logger = new Logger('UserManager');
  private events = EventManager.getInstance();
  private config = ConfigManager.getInstance();
  private cache = CacheManager.getInstance();
  private hooks = HookManager.getInstance();
  private userRepo = new UserRepository();
  private initialized = false;
  private sessions = new Map<string, UserSession>();
  private passwordResets = new Map<string, PasswordResetRequest>();
  private loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

  private readonly defaultConfig: UserManagerConfig = {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
    jwtExpiresIn: '7d',
    jwtRefreshExpiresIn: '30d',
    bcryptRounds: 12,
    enableTwoFactor: false,
    sessionTimeout: 86400000, // 24 hours
    maxLoginAttempts: 5,
    lockoutDuration: 900000, // 15 minutes
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      preventReuse: 5,
      expiryDays: 90,
    },
    enableUserRegistration: true,
    requireEmailVerification: true,
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour
  };

  private constructor() {}

  public static getInstance(): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }

  /**
   * Initialize user manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('User manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing User Manager...');

      // Register user hooks
      await this.registerHooks();

      // Setup session cleanup
      this.setupSessionCleanup();

      // Setup login attempt cleanup
      this.setupLoginAttemptCleanup();

      this.initialized = true;
      this.logger.info('User Manager initialized successfully');

      await this.events.emit(EventType.SYSTEM_INIT, {
        component: 'UserManager',
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Failed to initialize User Manager:', error);
      throw error;
    }
  }

  // ===================================================================
  // AUTHENTICATION
  // ===================================================================

  /**
   * Login user with credentials
   */
  public async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      this.logger.debug('User login attempt', { 
        identifier: credentials.email || credentials.username,
        ipAddress: credentials.ipAddress,
      });

      // Check login attempts
      const identifier = credentials.email || credentials.username || '';
      if (await this.isLockedOut(identifier)) {
        return {
          success: false,
          error: 'Account temporarily locked due to too many failed login attempts',
        };
      }

      // Apply before_login hook
      await this.hooks.doAction(CoreHooks.USER_BEFORE_LOGIN, credentials);

      // Find user
      const user = await this.findUserByCredentials(credentials);
      if (!user) {
        await this.recordFailedLogin(identifier, credentials.ipAddress);
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Check user status
      if (user.status !== UserStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is not active',
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(credentials.password, user.password);
      if (!isValidPassword) {
        await this.recordFailedLogin(identifier, credentials.ipAddress);
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Check two-factor authentication
      const config = await this.config.get('users', this.defaultConfig);
      if (config.enableTwoFactor && user.twoFactorEnabled) {
        if (!credentials.twoFactorCode) {
          const twoFactorToken = this.generateTwoFactorToken(user.id);
          return {
            success: false,
            requiresTwoFactor: true,
            twoFactorToken,
            error: 'Two-factor authentication required',
          };
        }

        if (!await this.verifyTwoFactorCode(user, credentials.twoFactorCode)) {
          await this.recordFailedLogin(identifier, credentials.ipAddress);
          return {
            success: false,
            error: 'Invalid two-factor code',
          };
        }
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Create session
      const session = await this.createSession(user, tokens, credentials);

      // Update user login info
     await this.userRepo.updateById(user.id.toString(), {
  lastLogin: new Date(),
  stats: {
    ...user.stats,
    lastLoginAt: new Date(),
    loginCount: (user.stats?.loginCount || 0) + 1,
  }
});

      // Clear failed login attempts
      this.loginAttempts.delete(identifier);

      // Clear user cache
      await this.clearUserCache(user.id.toString());

      // Apply after_login hook
      await this.hooks.doAction(CoreHooks.USER_LOGIN, user);

      // Log activity
      await this.logUserActivity(user.id, 'login', undefined, undefined, {
        ipAddress: credentials.ipAddress,
        userAgent: credentials.userAgent,
      });

      this.logger.info('User logged in successfully', {
        userId: user._id,
        username: user.username,
        email: user.email,
      });

      return {
        success: true,
        user,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: session.expiresAt,
      };

    } catch (error) {
      this.logger.error('Error during login:', error);
      return {
        success: false,
        error: 'Login failed due to internal error',
      };
    }
  }

  /**
   * Logout user
   */
  public async logout(token: string): Promise<boolean> {
    try {
      this.logger.debug('User logout', { token: token.substring(0, 10) + '...' });

      // Verify and decode token
      const payload = await this.verifyToken(token);
      if (!payload) {
        return false;
      }

      // Remove session
      const session = this.sessions.get(payload.sessionId);
      if (session) {
        this.sessions.delete(payload.sessionId);
        
        // Apply logout hook
        await this.hooks.doAction(CoreHooks.USER_LOGOUT, {
          userId: session.userId,
          sessionId: payload.sessionId,
        });

        // Log activity
        await this.logUserActivity(session.userId, 'logout');

        this.logger.info('User logged out successfully', {
          userId: session.userId,
          sessionId: payload.sessionId,
        });
      }

      return true;

    } catch (error) {
      this.logger.error('Error during logout:', error);
      return false;
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const payload = await this.verifyRefreshToken(refreshToken);
      if (!payload) {
        return {
          success: false,
          error: 'Invalid refresh token',
        };
      }

      // Get user
      const user = await this.userRepo.findById(payload.userId);
      if (!user || user.status !== UserStatus.ACTIVE) {
        return {
          success: false,
          error: 'User not found or inactive',
        };
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update session
      const session = this.sessions.get(payload.sessionId);
      if (session) {
        session.token = tokens.accessToken;
        session.refreshToken = tokens.refreshToken;
        session.lastUsed = new Date();
      }

      return {
        success: true,
        user,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };

    } catch (error) {
      this.logger.error('Error refreshing token:', error);
      return {
        success: false,
        error: 'Token refresh failed',
      };
    }
  }

  // ===================================================================
  // USER MANAGEMENT
  // ===================================================================

  /**
   * Create new user
   */
  public async createUser(userData: Partial<IUser>): Promise<IUser> {
    try {
      this.logger.debug('Creating new user', { 
        username: userData.username,
        email: userData.email,
      });

      // Validate user data
      const validation = Validator.validate(Validator.userCreateSchema, userData);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors.message}`);
      }

      // Apply before_register hook
      await this.hooks.doAction(CoreHooks.USER_BEFORE_REGISTER, userData);

      // Sanitize user data
      const sanitizedData = await this.sanitizeUserData(userData);

      // Hash password
      if (sanitizedData.password) {
        const config = await this.config.get('users', this.defaultConfig);
        await this.validatePassword(sanitizedData.password, config.passwordPolicy);
        sanitizedData.password = await bcrypt.hash(sanitizedData.password, config.bcryptRounds);
      }

      // Set default values
      if (!sanitizedData.role) {
        sanitizedData.role = UserRole.SUBSCRIBER;
      }

      if (!sanitizedData.status) {
        const config = await this.config.get('users', this.defaultConfig);
        sanitizedData.status = config.requireEmailVerification ? 
          UserStatus.PENDING : UserStatus.ACTIVE;
      }

      // Create user
      const user = await this.userRepo.create(sanitizedData);

      // Send verification email if required
      const config = await this.config.get('users', this.defaultConfig);
      if (config.requireEmailVerification && user.status === UserStatus.PENDING) {
        await this.sendVerificationEmail(user);
      }

      // Clear users cache
      await this.clearUsersCache();

      // Apply after_register hook
      await this.hooks.doAction(CoreHooks.USER_REGISTERED, user);

      this.logger.info('User created successfully', {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      });

      return user;

    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  public async updateUser(
    userId: string,
    updateData: Partial<IUser>,
    updatedBy?: string
  ): Promise<IUser | null> {
    try {
      this.logger.debug('Updating user', { userId, fields: Object.keys(updateData) });

      // Get existing user
      const existingUser = await this.userRepo.findById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Apply before_update hook
      await this.hooks.doAction(CoreHooks.USER_BEFORE_UPDATE, {
        userId,
        existing: existingUser,
        updates: updateData,
        updatedBy,
      });

      // Sanitize update data
      const sanitizedData = await this.sanitizeUserData(updateData);

      // Hash password if provided
      if (sanitizedData.password) {
        const config = await this.config.get('users', this.defaultConfig);
        await this.validatePassword(sanitizedData.password, config.passwordPolicy, existingUser);
        sanitizedData.password = await bcrypt.hash(sanitizedData.password, config.bcryptRounds);
      }

      // Update user
      const updatedUser = await this.userRepo.updateById(userId, sanitizedData);

      if (updatedUser) {
        // Clear cache
        await this.clearUserCache(userId);

        // Apply after_update hook
        await this.hooks.doAction(CoreHooks.USER_UPDATED, updatedUser);

        // Log activity
        await this.logUserActivity(
          updatedUser.id,
          'profile_updated',
          'user',
          userId,
          { updatedBy, fields: Object.keys(updateData) }
        );

        this.logger.info('User updated successfully', {
          userId: updatedUser.id,
          username: updatedUser.username,
        });
      }

      return updatedUser;

    } catch (error) {
      this.logger.error('Error updating user:', error);
      throw error;
    }
  }

 /**
 * Get users with pagination and filtering
 */
public async getUsers(query: UserQuery = {}): Promise<PaginatedResult<IUser>> {
  try {
    const cacheKey = `users:${JSON.stringify(query)}`;
    const config = await this.config.get('users', this.defaultConfig);

    // Check cache first
    if (config.cacheEnabled) {
      const cached = await this.cache.get<PaginatedResult<IUser>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fix: Use findWithFilters instead of searchUsers
    const result = await this.userRepo.findWithFilters(query);

    // Apply filter hook
    const filteredResult = await this.hooks.applyFilters(
      CoreFilters.DATABASE_RESULTS,
      result
    );

    // Cache result
    if (config.cacheEnabled) {
      await this.cache.set(cacheKey, filteredResult, config.cacheTTL);
    }

    return filteredResult;

  } catch (error) {
    this.logger.error('Error getting users:', error);
    throw error;
  }
}

  /**
   * Get user by ID
   */
  public async getUserById(userId: string): Promise<IUser | null> {
    try {
      const cacheKey = `user:${userId}`;
      const config = await this.config.get('users', this.defaultConfig);

      // Check cache first
      if (config.cacheEnabled) {
        const cached = await this.cache.get<IUser>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const user = await this.userRepo.findById(userId);

      // Cache result
      if (user && config.cacheEnabled) {
        await this.cache.set(cacheKey, user, config.cacheTTL);
      }

      return user;

    } catch (error) {
      this.logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  public async deleteUser(userId: string, deletedBy?: string): Promise<boolean> {
    try {
      this.logger.debug('Deleting user', { userId });

      // Get user before deletion
      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Prevent deletion of last admin
      if (user.role === UserRole.ADMIN) {
        const adminCount = await this.userRepo.count({ role: UserRole.ADMIN });
        if (adminCount <= 1) {
          throw new Error('Cannot delete the last admin user');
        }
      }

      // Delete user
      const deleted = await this.userRepo.deleteById(userId);

      if (deleted) {
        // Invalidate all user sessions
        await this.invalidateUserSessions(user.id);

        // Clear cache
        await this.clearUserCache(userId);
        await this.clearUsersCache();

        // Log activity
        await this.logUserActivity(
          user.id,
          'account_deleted',
          'user',
          userId,
          { deletedBy }
        );

        this.logger.info('User deleted successfully', {
          userId: user._id,
          username: user.username,
          deletedBy,
        });
      }

      return deleted;

    } catch (error) {
      this.logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // ===================================================================
  // BULK OPERATIONS
  // ===================================================================

  /**
   * Perform bulk operation on users
   */
  public async bulkUserOperation(operation: BulkUserOperation): Promise<BulkUserResult> {
    try {
      this.logger.info('Performing bulk user operation', {
        action: operation.action,
        count: operation.userIds.length,
      });

      const result: BulkUserResult = {
        successful: [],
        failed: [],
        stats: {
          total: operation.userIds.length,
          successful: 0,
          failed: 0,
        },
      };

      for (const userId of operation.userIds) {
        try {
          await this.performSingleUserOperation(operation, userId);
          result.successful.push(userId);
          result.stats.successful++;
        } catch (error) {
          result.failed.push({
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.stats.failed++;
        }
      }

      // Clear cache after bulk operation
      await this.clearUsersCache();

      this.logger.info('Bulk user operation completed', result.stats);

      return result;

    } catch (error) {
      this.logger.error('Error in bulk user operation:', error);
      throw error;
    }
  }

  // ===================================================================
  // PASSWORD MANAGEMENT
  // ===================================================================

  /**
   * Request password reset
   */
  public async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      this.logger.debug('Password reset requested', { email });

      // Find user by email
      const user = await this.userRepo.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists
        return true;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      // Store reset request
      this.passwordResets.set(resetToken, {
        userId: user.id,
        token: resetToken,
        expiresAt,
        ...(ipAddress !== undefined ? { ipAddress } : {}),
        ...(userAgent !== undefined ? { userAgent } : {}),
      });

      // Send reset email
      await this.sendPasswordResetEmail(user, resetToken);

      this.logger.info('Password reset email sent', {
        userId: user._id,
        email: user.email,
      });

      return true;

    } catch (error) {
      this.logger.error('Error requesting password reset:', error);
      return false;
    }
  }

  /**
   * Reset password with token
   */
  public async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      this.logger.debug('Password reset attempt', { token: token.substring(0, 10) + '...' });

      // Get reset request
      const resetRequest = this.passwordResets.get(token);
      if (!resetRequest || resetRequest.expiresAt < new Date()) {
        throw new Error('Invalid or expired reset token');
      }

      // Get user
      const user = await this.userRepo.findById(resetRequest.userId.toString());
      if (!user) {
        throw new Error('User not found');
      }

      // Validate new password
      const config = await this.config.get('users', this.defaultConfig);
      await this.validatePassword(newPassword, config.passwordPolicy, user);

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, config.bcryptRounds);

      // Update password
      await this.userRepo.updateById(user.id.toString(), {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      });

      // Remove reset request
      this.passwordResets.delete(token);

      // Invalidate all user sessions
      await this.invalidateUserSessions(user.id);

      // Clear cache
      await this.clearUserCache(user.id.toString());

      // Log activity
      await this.logUserActivity(user.id, 'password_reset');

      this.logger.info('Password reset successful', {
        userId: user._id,
        email: user.email,
      });

      return true;

    } catch (error) {
      this.logger.error('Error resetting password:', error);
      return false;
    }
  }

  // ===================================================================
  // USER STATISTICS
  // ===================================================================
/**
 * Get user statistics
 */
public async getUserStats(): Promise<UserStats> {
  try {
    const cacheKey = 'users:stats';
    const config = await this.config.get('users', this.defaultConfig);

    // Check cache first
    if (config.cacheEnabled) {
      const cached = await this.cache.get<UserStats>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fix: Call getUserStats instead of getStats
    const stats = await this.userRepo.getUserStats();

    // Cache stats
    if (config.cacheEnabled) {
      await this.cache.set(cacheKey, stats, 300); // 5 minutes
    }

    return stats;

  } catch (error) {
    this.logger.error('Error getting user stats:', error);
    throw error;
  }
}

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  /**
   * Register user hooks
   */
  private async registerHooks(): Promise<void> {
    // Register user capabilities filter
    await this.hooks.addFilter(CoreFilters.USER_ROLE_CAPABILITIES, (capabilities: string[], user: IUser) => {
      return capabilities;
    });
  }

  /**
   * Find user by login credentials
   */
  private async findUserByCredentials(credentials: LoginCredentials): Promise<IUser | null> {
    if (credentials.email) {
      return this.userRepo.findOne({ email: credentials.email.toLowerCase() });
    }

    if (credentials.username) {
      return this.userRepo.findOne({ username: credentials.username });
    }

    return null;
  }
/**
   * Generate JWT tokens
   */
  private async generateTokens(user: IUser): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const config = await this.config.get('users', this.defaultConfig);
    const sessionId = crypto.randomBytes(16).toString('hex');

    const accessToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        sessionId,
      },
      config.jwtSecret, // Ensure this is a string or Buffer
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions // Explicitly type as SignOptions
    );

    const refreshToken = jwt.sign(
      {
        userId: user._id,
        sessionId,
        type: 'refresh',
      },
      config.jwtSecret,
      { expiresIn: config.jwtRefreshExpiresIn } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }


  /**
   * Create user session
   */
  private async createSession(
    user: IUser,
    tokens: { accessToken: string; refreshToken: string },
    credentials: LoginCredentials
  ): Promise<UserSession> {
    const config = await this.config.get('users', this.defaultConfig);
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    const session: UserSession = {
      id: new Types.ObjectId(sessionId),
      userId: user.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.sessionTimeout),
      lastUsed: new Date(),
      isActive: true,
      ...(credentials.ipAddress ? { ipAddress: credentials.ipAddress } : {}),
      ...(credentials.userAgent ? { userAgent: credentials.userAgent } : {}),
    };

    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<any> {
    try {
      const config = await this.config.get('users', this.defaultConfig);
      return jwt.verify(token, config.jwtSecret);
    } catch {
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  private async verifyRefreshToken(token: string): Promise<any> {
    try {
      const config = await this.config.get('users', this.defaultConfig);
      const payload = jwt.verify(token, config.jwtSecret) as any;
      
      if (payload.type !== 'refresh') {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Validate password against policy
   */
  private async validatePassword(
    password: string,
    policy: PasswordPolicy,
    user?: IUser
  ): Promise<void> {
    if (password.length < policy.minLength) {
      throw new Error(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }

    // Check password history (simplified implementation)
    if (user && policy.preventReuse > 0) {
      const currentHash = await bcrypt.hash(password, 10);
      if (await bcrypt.compare(password, user.password)) {
        throw new Error('Cannot reuse current password');
      }
    }
  }

  /**
   * Sanitize user data
   */
  private async sanitizeUserData(data: Partial<IUser>): Promise<Partial<IUser>> {
    const sanitized: Partial<IUser> = { ...data };

    if (sanitized.email) {
      sanitized.email = Sanitizer.sanitizeEmail(sanitized.email);
    }

    if (sanitized.username) {
      sanitized.username = Sanitizer.sanitizeText(sanitized.username);
    }

    if (sanitized.firstName) {
      sanitized.firstName = Sanitizer.sanitizeText(sanitized.firstName);
    }

    if (sanitized.lastName) {
      sanitized.lastName = Sanitizer.sanitizeText(sanitized.lastName);
    }

    if (sanitized.bio) {
      sanitized.bio = Sanitizer.sanitizeHtml(sanitized.bio);
    }

    if (sanitized.website) {
      sanitized.website = Sanitizer.sanitizeUrl(sanitized.website);
    }

    return sanitized;
  }

  /**
   * Check if user is locked out
   */
  private async isLockedOut(identifier: string): Promise<boolean> {
    const attempt = this.loginAttempts.get(identifier);
    if (!attempt) return false;

    const config = await this.config.get('users', this.defaultConfig);
    const isLocked = attempt.count >= config.maxLoginAttempts;
    const lockExpired = Date.now() - attempt.lastAttempt.getTime() > config.lockoutDuration;

    if (isLocked && lockExpired) {
      this.loginAttempts.delete(identifier);
      return false;
    }

    return isLocked;
  }

  /**
   * Record failed login attempt
   */
  private async recordFailedLogin(identifier: string, ipAddress?: string): Promise<void> {
    const attempt = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: new Date() };
    attempt.count++;
    attempt.lastAttempt = new Date();
    this.loginAttempts.set(identifier, attempt);

    this.logger.warn('Failed login attempt', {
      identifier,
      attempts: attempt.count,
      ipAddress,
    });
  }

  /**
   * Generate two-factor token
   */
  private generateTwoFactorToken(userId: Types.ObjectId): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Verify two-factor code
   */
  private async verifyTwoFactorCode(user: IUser, code: string): Promise<boolean> {
    // Implementation would use TOTP library
    // This is a placeholder
    return code === '123456'; // Simplified for example
  }

  /**
   * Perform single user operation for bulk operations
   */
  private async performSingleUserOperation(
    operation: BulkUserOperation,
    userId: string
  ): Promise<void> {
    switch (operation.action) {
      case 'activate':
        await this.userRepo.updateById(userId, { status: UserStatus.ACTIVE });
        break;

      case 'deactivate':
        await this.userRepo.updateById(userId, { status: UserStatus.INACTIVE });
        break;

      case 'delete':
        await this.deleteUser(userId);
        break;

      case 'change_role':
        if (!operation.options?.role) {
          throw new Error('Role is required for change_role operation');
        }
        await this.userRepo.updateById(userId, { role: operation.options.role });
        break;

      case 'reset_password':
        // Would generate and send password reset email
        const user = await this.userRepo.findById(userId);
        if (user) {
          await this.requestPasswordReset(user.email);
        }
        break;
    }
  }

  /**
   * Invalidate all user sessions
   */
  private async invalidateUserSessions(userId: Types.ObjectId): Promise<void> {
    for (const [sessionId, session] of this.sessions) {
      if (session.userId.equals(userId)) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Log user activity
   */
  private async logUserActivity(
    userId: Types.ObjectId,
    action: string,
    resource?: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Implementation would save to activity log collection
    this.logger.debug('User activity logged', {
      userId,
      action,
      resource,
      resourceId,
      metadata,
    });
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(user: IUser): Promise<void> {
    // Implementation would use email service
    this.logger.info('Verification email sent', {
      userId: user._id,
      email: user.email,
    });
  }

  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(user: IUser, token: string): Promise<void> {
    // Implementation would use email service
    this.logger.info('Password reset email sent', {
      userId: user._id,
      email: user.email,
      token: token.substring(0, 10) + '...',
    });
  }

  /**
   * Setup session cleanup
   */
  private setupSessionCleanup(): void {
    setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of this.sessions) {
        if (session.expiresAt < now) {
          this.sessions.delete(sessionId);
        }
      }
    }, 300000); // Check every 5 minutes
  }

  /**
   * Setup login attempt cleanup
   */
  private setupLoginAttemptCleanup(): void {
    setInterval(async () => {
      const config = await this.config.get('users', this.defaultConfig);
      const cutoff = Date.now() - config.lockoutDuration;

      for (const [identifier, attempt] of this.loginAttempts) {
        if (attempt.lastAttempt.getTime() < cutoff) {
          this.loginAttempts.delete(identifier);
        }
      }
    }, 900000); // Check every 15 minutes
  }

  /**
   * Clear user cache
   */
  private async clearUserCache(userId: string): Promise<void> {
    const config = await this.config.get('users', this.defaultConfig);
    if (!config.cacheEnabled) return;

    await this.cache.delete(`user:${userId}`);
  }

  /**
   * Clear users cache
   */
  private async clearUsersCache(): Promise<void> {
    const config = await this.config.get('users', this.defaultConfig);
    if (!config.cacheEnabled) return;

    await this.cache.deletePattern('users:*');
    await this.cache.delete('users:stats');
  }
}

/**
 * Default user manager instance
 */
export const userManager = UserManager.getInstance();

export default UserManager;