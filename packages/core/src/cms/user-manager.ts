import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { EventType } from '../events/event-types';
import { HookManager } from '../hooks/hook-manager';
import { CoreHooks, CoreFilters } from '../hooks/hook-types';
import { CacheManager } from '../cache/cache-manager';
import { ConfigManager } from '../config/config-manager';
import { UserRepository} from '../database/repositories/user-repository';
import { User, type IUser } from '../database/models/user';
import { LoginCredentials, PasswordResetRequest, UserPermission, UserRole, UserSession, UserStatus } from '../types/user';
import { PaginatedResult } from '../types/database';
import { Sanitizer } from '../utils/sanitizer';
import { DateUtils } from '../utils/date-utils';

export interface AuthenticationResult {
  success: boolean;
  user?: IUser;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
  errors?: string[];
  requiresTwoFactor?: boolean;
  lockoutTime?: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
}


export interface UserRegistrationData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  metadata?: Record<string, any>;
}

export interface UserUpdateData {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  website?: string;
  bio?: string;
  preferences?: Partial<IUser['preferences']>;
  metadata?: Record<string, any>;
}



export interface RoleDefinition {
  name: UserRole;
  label: string;
  description: string;
  permissions: string[];
  capabilities: string[];
  isDefault: boolean;
  level: number;
}

export interface UserActivityLog {
  userId: Types.ObjectId;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface SecuritySettings {
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  sessionTimeout: number; // in minutes
  maxConcurrentSessions: number;
  requireEmailVerification: boolean;
  twoFactorEnabled: boolean;
}

/**
 * User Manager
 * Handles user authentication, authorization, registration, and user management
 */
export class UserManager {
  private static instance: UserManager;
  private logger: Logger;
  private events: EventManager;
  private hooks: HookManager;
  private cache: CacheManager;
  private config: ConfigManager;
  private userRepo: UserRepository;
  private initialized = false;
  private activeSessions = new Map<string, UserSession>();
  private passwordResetTokens = new Map<string, PasswordResetRequest>();
  private roles: Map<UserRole, RoleDefinition> = new Map();
  private permissions: Map<string, UserPermission> = new Map();

  private readonly defaultSecuritySettings: SecuritySettings = {
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
    sessionTimeout: 1440, // 24 hours
    maxConcurrentSessions: 5,
    requireEmailVerification: false,
    twoFactorEnabled: false,
  };

  private constructor() {
    this.logger = new Logger('UserManager');
    this.events = EventManager.getInstance();
    this.hooks = HookManager.getInstance();
    this.cache = CacheManager.getInstance();
    this.config = ConfigManager.getInstance();
    this.userRepo = new UserRepository();
  }

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

      // Initialize roles and permissions
      await this.initializeRolesAndPermissions();

      // Setup authentication hooks
      await this.setupAuthenticationHooks();

      // Setup session cleanup
      await this.setupSessionCleanup();

      // Create default admin user if none exists
      await this.ensureAdminUser();

      this.initialized = true;
      this.logger.info('User Manager initialized successfully');

      // Emit initialization event
      await this.events.emit(EventType.CMS_INITIALIZED, {
        type: 'user_manager_initialized',
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
   * Authenticate user with email/username and password
   */
  public async authenticateUser(
    credentials: LoginCredentials,
    options: {
      ipAddress?: string;
      userAgent?: string;
      rememberMe?: boolean;
    } = {}
  ): Promise<AuthenticationResult> {
    try {
      this.logger.info('Authenticating user', { 
        identifier: credentials.identifier,
        ipAddress: options.ipAddress 
      });

      const result: AuthenticationResult = {
        success: false,
        errors: [],
      };

      // Apply before_login hook
      const hookData = await this.hooks.applyFilters(CoreFilters.USER_ROLE_CAPABILITIES, credentials);

      // Find user by email or username
      const user = await this.userRepo.findByEmailOrUsername(hookData.identifier);
      if (!user) {
        result.errors = ['Invalid credentials'];
        await this.logAuthenticationAttempt(hookData.identifier, false, 'user_not_found', options);
        return result;
      }

      // Check if user is locked out
      const lockoutCheck = await this.checkUserLockout(user);
      if (lockoutCheck.isLockedOut) {
        result.errors = ['Account temporarily locked due to too many failed attempts'];
        result.lockoutTime = lockoutCheck.lockoutTime;
        return result;
      }

      // Verify password
      const passwordValid = await this.verifyPassword(hookData.password, user.password);
      if (!passwordValid) {
        await this.handleFailedLogin(user, options);
        result.errors = ['Invalid credentials'];
        return result;
      }

      // Check user status
      if (user.status !== UserStatus.ACTIVE) {
        result.errors = [`Account is ${user.status}`];
        return result;
      }

      // Check email verification if required
      const securitySettings = await this.getSecuritySettings();
      if (securitySettings.requireEmailVerification && !user.emailVerified) {
        result.errors = ['Email verification required'];
        return result;
      }

      // Check two-factor authentication
      if (user.twoFactorEnabled && securitySettings.twoFactorEnabled) {
        result.requiresTwoFactor = true;
        result.user = user;
        return result;
      }

      // Create session and tokens
      const session = await this.createUserSession(user, options);
      
      // Reset failed login attempts
      await this.resetFailedLoginAttempts(user);

      // Update user login stats
      await this.updateLoginStats(user, options);

      result.success = true;
      result.user = user;
      result.token = session.token;
      result.refreshToken = session.refreshToken;
      result.expiresAt = session.expiresAt;

      // Execute after_login hook
      await this.hooks.doAction(CoreHooks.USER_LOGIN, user, session);

      // Emit login event
      await this.events.emit(EventType.USER_LOGIN, {
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        sessionId: session.id,
        timestamp: new Date(),
      });

      this.logger.info('User authenticated successfully', {
        userId: user._id,
        email: user.email,
        role: user.role,
      });

      return result;

    } catch (error) {
      this.logger.error('Error authenticating user:', error);
      return {
        success: false,
        errors: ['Authentication failed'],
      };
    }
  }

  /**
   * Verify JWT token and get user
   */
  public async verifyToken(token: string): Promise<{
    valid: boolean;
    user?: IUser;
    payload?: TokenPayload;
    error?: string;
  }> {
    try {
      const jwtSecret = await this.config.get('auth.jwt.secret');
      const payload = jwt.verify(token, jwtSecret) as TokenPayload;

      // Check if session is still active
      const session = this.activeSessions.get(payload.sessionId);
      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return { valid: false, error: 'Session expired' };
      }

      // Get user and verify still active
      const user = await this.userRepo.findById(payload.userId);
      if (!user || user.status !== UserStatus.ACTIVE) {
        return { valid: false, error: 'User not found or inactive' };
      }

      // Update session last activity
      session.lastActivity = new Date();

      return {
        valid: true,
        user,
        payload,
      };

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      };
    }
  }

  /**
   * Logout user and invalidate session
   */
  public async logoutUser(
    sessionId: string,
    options: {
      logoutAll?: boolean;
      userId?: string;
    } = {}
  ): Promise<boolean> {
    try {
      this.logger.info('Logging out user', { sessionId, logoutAll: options.logoutAll });

      if (options.logoutAll && options.userId) {
        // Logout from all sessions
        const userSessions = Array.from(this.activeSessions.values())
          .filter(session => session.userId.toString() === options.userId);

        for (const session of userSessions) {
          session.isActive = false;
          this.activeSessions.delete(session.id);
        }

        // Emit logout all event
        await this.events.emit(EventType.USER_LOGOUT, {
          userId: options.userId,
          type: 'logout_all',
          sessionCount: userSessions.length,
          timestamp: new Date(),
        });

        this.logger.info('User logged out from all sessions', {
          userId: options.userId,
          sessionCount: userSessions.length,
        });

        return true;
      } else {
        // Logout from specific session
        const session = this.activeSessions.get(sessionId);
        if (session) {
          session.isActive = false;
          this.activeSessions.delete(sessionId);

          // Emit logout event
          await this.events.emit(EventType.USER_LOGOUT, {
            userId: session.userId.toString(),
            sessionId,
            timestamp: new Date(),
          });

          this.logger.info('User logged out', { sessionId, userId: session.userId });
          return true;
        }
      }

      return false;

    } catch (error) {
      this.logger.error('Error logging out user:', error);
      return false;
    }
  }

  // ===================================================================
  // USER REGISTRATION & MANAGEMENT
  // ===================================================================

  /**
   * Register new user
   */
  public async registerUser(
    data: UserRegistrationData,
    options: {
      requireEmailVerification?: boolean;
      sendWelcomeEmail?: boolean;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<{
    success: boolean;
    user?: IUser;
    errors?: string[];
    emailVerificationRequired?: boolean;
  }> {
    try {
      this.logger.info('Registering new user', { 
        email: data.email,
        username: data.username 
      });

      const result = {
        success: false,
        errors: [] as string[],
      };

      // Apply before_register hook
      const hookData = await this.hooks.applyFilters(CoreFilters.USER_DISPLAY_NAME, data);

      // Validate password strength
      const passwordValidation = await this.validatePassword(hookData.password);
      if (!passwordValidation.valid) {
        result.errors = passwordValidation.errors;
        return result;
      }

      // Prepare user data
      const userData: Partial<IUser> = {
        username: Sanitizer.sanitizeUsername(hookData.username),
        email: Sanitizer.sanitizeEmail(hookData.email),
        password: hookData.password, // Will be hashed in repository
        firstName: hookData.firstName ? Sanitizer.sanitizeText(hookData.firstName) : undefined,
        lastName: hookData.lastName ? Sanitizer.sanitizeText(hookData.lastName) : undefined,
        role: hookData.role || UserRole.SUBSCRIBER,
        status: UserStatus.ACTIVE,
        emailVerified: !options.requireEmailVerification,
        metadata: {
          source: 'registration',
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          ...hookData.metadata,
        },
      };

      // Create user
      const user = await this.userRepo.create(userData);

      // Send email verification if required
      if (options.requireEmailVerification && !user.emailVerified) {
        await this.sendEmailVerification(user);
      }

      // Send welcome email if requested
      if (options.sendWelcomeEmail) {
        await this.sendWelcomeEmail(user);
      }

      // Execute after_register hook
      await this.hooks.doAction(CoreHooks.USER_REGISTERED, user);

      // Emit registration event
      await this.events.emit(EventType.USER_REGISTERED, {
        userId: user.id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        ipAddress: options.ipAddress,
        timestamp: new Date(),
      });

      this.logger.info('User registered successfully', {
        userId: user._id,
        email: user.email,
        role: user.role,
      });

      return {
        success: true,
        user,
        emailVerificationRequired: options.requireEmailVerification && !user.emailVerified,
      };

    } catch (error) {
      this.logger.error('Error registering user:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Registration failed'],
      };
    }
  }

  /**
   * Update user profile
   */
  public async updateUser(
    userId: string,
    data: UserUpdateData,
    options: {
      updatedBy?: string;
      skipValidation?: boolean;
    } = {}
  ): Promise<IUser | null> {
    try {
      this.logger.info('Updating user', { userId });

      const existingUser = await this.userRepo.findById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Apply before_update hook
      const hookData = await this.hooks.applyFilters(CoreFilters.USER_DISPLAY_NAME, data, existingUser);

      // Sanitize inputs
      const updateData: Partial<IUser> = {};

      if (hookData.username) {
        updateData.username = Sanitizer.sanitizeUsername(hookData.username);
      }
      if (hookData.email) {
        updateData.email = Sanitizer.sanitizeEmail(hookData.email);
      }
      if (hookData.firstName) {
        updateData.firstName = Sanitizer.sanitizeText(hookData.firstName);
      }
      if (hookData.lastName) {
        updateData.lastName = Sanitizer.sanitizeText(hookData.lastName);
      }
      if (hookData.bio) {
        updateData.bio = Sanitizer.sanitizeText(hookData.bio);
      }
      if (hookData.website) {
        updateData.website = Sanitizer.sanitizeUrl(hookData.website);
      }
      if (hookData.avatar) {
        updateData.avatar = Sanitizer.sanitizeUrl(hookData.avatar);
      }
      if (hookData.preferences) {
        updateData.preferences = { ...existingUser.preferences, ...hookData.preferences };
      }
      if (hookData.metadata) {
        updateData.metadata = { ...existingUser.metadata, ...hookData.metadata };
      }

      // Update user
      const updatedUser = await this.userRepo.updateById(userId, updateData);
      if (!updatedUser) {
        throw new Error('Failed to update user');
      }

      // Clear user cache
      await this.clearUserCache(userId);

      // Execute after_update hook
      await this.hooks.doAction(CoreHooks.USER_UPDATED, updatedUser, existingUser);

      // Emit update event
      await this.events.emit(EventType.USER_PROFILE_UPDATED, {
        userId: updatedUser._id.toString(),
        changes: Object.keys(updateData),
        updatedBy: options.updatedBy,
        timestamp: new Date(),
      });

      this.logger.info('User updated successfully', {
        userId: updatedUser._id,
        changes: Object.keys(updateData),
      });

      return updatedUser;

    } catch (error) {
      this.logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    errors?: string[];
  }> {
    try {
      this.logger.info('Changing user password', { userId });

      const user = await this.userRepo.findById(userId);
      if (!user) {
        return { success: false, errors: ['User not found'] };
      }

      // Verify current password
      const currentPasswordValid = await this.verifyPassword(currentPassword, user.password);
      if (!currentPasswordValid) {
        return { success: false, errors: ['Current password is incorrect'] };
      }

      // Validate new password
      const passwordValidation = await this.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return { success: false, errors: passwordValidation.errors };
      }

      // Hash and update password
      const hashedPassword = await this.hashPassword(newPassword);
      await this.userRepo.updateById(userId, { 
        password: hashedPassword,
        'security.passwordChangedAt': new Date(),
      });

      // Invalidate all sessions except current one
      await this.invalidateUserSessions(userId, { keepCurrent: true });

      this.logger.info('User password changed successfully', { userId });

      return { success: true };

    } catch (error) {
      this.logger.error('Error changing user password:', error);
      return { success: false, errors: ['Failed to change password'] };
    }
  }

  /**
   * Get user by ID
   */
  public async getUser(id: string, useCache: boolean = true): Promise<IUser | null> {
    try {
      // Check cache first
      if (useCache) {
        const cached = await this.cache.get(`user:${id}`);
        if (cached) {
          return cached;
        }
      }

      const user = await this.userRepo.findById(id);

      if (user && useCache) {
        await this.cache.set(`user:${id}`, user, 600); // 10 minutes
      }

      return user;

    } catch (error) {
      this.logger.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Get users with pagination and filtering
   */
  public async getUsers(query: UserQuery = {}): Promise<PaginatedResult<IUser>> {
    try {
      return await this.userRepo.getUsers(query);
    } catch (error) {
      this.logger.error('Error getting users:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  public async deleteUser(
    userId: string,
    options: {
      deletedBy?: string;
      transferContent?: boolean;
      transferTo?: string;
    } = {}
  ): Promise<boolean> {
    try {
      this.logger.info('Deleting user', { userId, ...options });

      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Cannot delete admin users
      if (user.role === UserRole.ADMIN) {
        throw new Error('Cannot delete admin user');
      }

      // Transfer content if requested
      if (options.transferContent && options.transferTo) {
        await this.transferUserContent(userId, options.transferTo);
      }

      // Invalidate all user sessions
      await this.invalidateUserSessions(userId);

      // Delete user
      const deleted = await this.userRepo.deleteById(userId);

      if (deleted) {
        // Clear cache
        await this.clearUserCache(userId);

        // Emit deletion event
        await this.events.emit(EventType.USER_DELETED, {
          userId,
          email: user.email,
          username: user.username,
          deletedBy: options.deletedBy,
          contentTransferred: options.transferContent,
          timestamp: new Date(),
        });

        this.logger.info('User deleted successfully', { userId });
      }

      return deleted;

    } catch (error) {
      this.logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // ===================================================================
  // ROLES & PERMISSIONS
  // ===================================================================

  /**
   * Check if user has permission
   */
  public async hasPermission(
    user: IUser | string,
    permission: string,
    resource?: string
  ): Promise<boolean> {
    try {
      const userObj = typeof user === 'string' ? await this.getUser(user) : user;
      if (!userObj) return false;

      // Apply permission filters
      const permissions = await this.hooks.applyFilters(
        CoreFilters.USER_ROLE_CAPABILITIES,
        this.getRolePermissions(userObj.role),
        userObj
      );

      return permissions.includes(permission);

    } catch (error) {
      this.logger.error('Error checking user permission:', error);
      return false;
    }
  }

  /**
   * Get user capabilities
   */
  public getUserCapabilities(role: UserRole): string[] {
    const roleDefinition = this.roles.get(role);
    return roleDefinition ? roleDefinition.capabilities : [];
  }

  /**
   * Get role permissions
   */
  public getRolePermissions(role: UserRole): string[] {
    const roleDefinition = this.roles.get(role);
    return roleDefinition ? roleDefinition.permissions : [];
  }

  // ===================================================================
  // STATISTICS & MONITORING
  // ===================================================================

  /**
   * Get user statistics
   */
  public async getUserStats(): Promise<UserStats> {
    try {
      return await this.userRepo.getStats();
    } catch (error) {
      this.logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Get active sessions count
   */
  public getActiveSessionsCount(): number {
    return Array.from(this.activeSessions.values())
      .filter(session => session.isActive && session.expiresAt > new Date()).length;
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  /**
   * Initialize roles and permissions
   */
  private async initializeRolesAndPermissions(): Promise<void> {
    try {
      // Define core roles
      const coreRoles: RoleDefinition[] = [
        {
          name: UserRole.ADMIN,
          label: 'Administrator',
          description: 'Full access to all features',
          permissions: ['*'],
          capabilities: ['manage_users', 'manage_content', 'manage_settings', 'manage_plugins', 'manage_themes'],
          isDefault: false,
          level: 100,
        },
        {
          name: UserRole.EDITOR,
          label: 'Editor',
          description: 'Can create and edit content',
          permissions: ['read_content', 'create_content', 'edit_content', 'delete_content'],
          capabilities: ['edit_posts', 'edit_pages', 'upload_files'],
          isDefault: false,
          level: 50,
        },
        {
          name: UserRole.AUTHOR,
          label: 'Author',
          description: 'Can create and edit own content',
          permissions: ['read_content', 'create_content', 'edit_own_content'],
          capabilities: ['publish_posts', 'upload_files'],
          isDefault: false,
          level: 25,
        },
        {
          name: UserRole.CONTRIBUTOR,
          label: 'Contributor',
          description: 'Can create content for review',
          permissions: ['read_content', 'create_content'],
          capabilities: ['edit_posts'],
          isDefault: false,
          level: 10,
        },
        {
          name: UserRole.SUBSCRIBER,
          label: 'Subscriber',
          description: 'Can read content',
          permissions: ['read_content'],
          capabilities: [],
          isDefault: true,
          level: 0,
        },
      ];

      // Register roles
      for (const role of coreRoles) {
        this.roles.set(role.name, role);
      }

      this.logger.debug('Roles and permissions initialized', {
        roles: this.roles.size,
        permissions: this.permissions.size,
      });

    } catch (error) {
      this.logger.error('Error initializing roles and permissions:', error);
      throw error;
    }
  }

  /**
   * Setup authentication hooks
   */
  private async setupAuthenticationHooks(): Promise<void> {
    try {
      // Setup user authentication filters
      this.hooks.addFilter(CoreFilters.USER_ROLE_CAPABILITIES, async (capabilities: string[], user: IUser) => {
        // Apply dynamic capability filters
        return capabilities;
      });

      this.logger.debug('Authentication hooks setup completed');
    } catch (error) {
      this.logger.error('Error setting up authentication hooks:', error);
    }
  }

  /**
   * Setup session cleanup
   */
  private async setupSessionCleanup(): Promise<void> {
    try {
      // Clean up expired sessions every hour
      setInterval(() => {
        this.cleanupExpiredSessions();
      }, 60 * 60 * 1000);

      this.logger.debug('Session cleanup setup completed');
    } catch (error) {
      this.logger.error('Error setting up session cleanup:', error);
    }
  }

  /**
   * Ensure admin user exists
   */
  private async ensureAdminUser(): Promise<void> {
    try {
      const adminCount = await this.userRepo.count({ role: UserRole.ADMIN });
      
      if (adminCount === 0) {
        this.logger.warn('No admin user found. Creating default admin user.');
        
        const defaultAdmin = {
          username: 'admin',
          email: 'admin@modular-app.com',
          password: 'admin123!', // Should be changed on first login
          firstName: 'Admin',
          lastName: 'User',
          role: UserRole.ADMIN,
        };

        await this.registerUser(defaultAdmin);
        this.logger.warn('Default admin user created. Please change the password immediately.');
      }

    } catch (error) {
      this.logger.error('Error ensuring admin user:', error);
    }
  }

  /**
   * Create user session
   */
  private async createUserSession(
    user: IUser,
    options: {
      ipAddress?: string;
      userAgent?: string;
      rememberMe?: boolean;
    }
  ): Promise<UserSession> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const securitySettings = await this.getSecuritySettings();
    
    const expiresAt = new Date(
      now.getTime() + (securitySettings.sessionTimeout * 60 * 1000)
    );

    // Create JWT token
    const jwtSecret = await this.config.get('auth.jwt.secret');
    const tokenPayload: Partial<TokenPayload> = {
      userId: user.id.toString(),
      email: user.email,
      role: user.role,
      permissions: this.getRolePermissions(user.role),
      sessionId,
    };

    const token = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: `${securitySettings.sessionTimeout}m`,
    });

    // Create refresh token
    const refreshToken = crypto.randomBytes(32).toString('hex');

    const session: UserSession = {
      id: sessionId,
      userId: user.id,
      token,
      refreshToken,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      isActive: true,
      lastActivity: now,
      expiresAt,
      createdAt: now,
    };

    this.activeSessions.set(sessionId, session);

    // Cleanup old sessions if over limit
    await this.cleanupUserSessions(user.id, securitySettings.maxConcurrentSessions);

    return session;
  }

  /**
   * Get security settings
   */
  private async getSecuritySettings(): Promise<SecuritySettings> {
    const settings = await this.config.getMany([
      'security.max_login_attempts',
      'security.lockout_duration',
      'security.session_timeout',
      'auth.password_min_length',
      'auth.require_email_verification',
    ]);

    return {
      ...this.defaultSecuritySettings,
      ...settings,
    };
  }

  /**
   * Validate password strength
   */
  private async validatePassword(password: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const result = { valid: true, errors: [] as string[] };
    const settings = await this.getSecuritySettings();

    if (password.length < settings.passwordMinLength) {
      result.valid = false;
      result.errors.push(`Password must be at least ${settings.passwordMinLength} characters`);
    }

    if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      result.valid = false;
      result.errors.push('Password must contain uppercase letters');
    }

    if (settings.passwordRequireLowercase && !/[a-z]/.test(password)) {
      result.valid = false;
      result.errors.push('Password must contain lowercase letters');
    }

    if (settings.passwordRequireNumbers && !/\d/.test(password)) {
      result.valid = false;
      result.errors.push('Password must contain numbers');
    }

    if (settings.passwordRequireSymbols && !/[^A-Za-z0-9]/.test(password)) {
      result.valid = false;
      result.errors.push('Password must contain symbols');
    }

    return result;
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    const rounds = await this.config.get('auth.bcrypt.rounds', 12);
    return bcrypt.hash(password, rounds);
  }

  /**
   * Verify password
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Clear user cache
   */
  private async clearUserCache(userId: string): Promise<void> {
    try {
      await this.cache.delete(`user:${userId}`);
      await this.cache.deletePattern('users:*');
    } catch (error) {
      this.logger.warn('Error clearing user cache:', error);
    }
  }

  /**
   * Check user lockout status
   */
  private async checkUserLockout(user: IUser): Promise<{
    isLockedOut: boolean;
    lockoutTime?: Date;
  }> {
    const settings = await this.getSecuritySettings();
    
    if (user.security.failedLoginAttempts >= settings.maxLoginAttempts) {
      const lockoutTime = new Date(
        user.security.lastFailedLogin!.getTime() + (settings.lockoutDuration * 60 * 1000)
      );
      
      return {
        isLockedOut: lockoutTime > new Date(),
        lockoutTime,
      };
    }

    return { isLockedOut: false };
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(
    user: IUser,
    options: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.userRepo.updateById(user.id.toString(), {
      $inc: { 'security.failedLoginAttempts': 1 },
      'security.lastFailedLogin': new Date(),
    });

    await this.logAuthenticationAttempt(user.email, false, 'invalid_password', options);
  }

  /**
   * Reset failed login attempts
   */
  private async resetFailedLoginAttempts(user: IUser): Promise<void> {
    await this.userRepo.updateById(user.id.toString(), {
      'security.failedLoginAttempts': 0,
      'security.lastFailedLogin': null,
    });
  }

  /**
   * Update user login statistics
   */
  private async updateLoginStats(
    user: IUser,
    options: { ipAddress?: string }
  ): Promise<void> {
    await this.userRepo.updateById(user.id.toString(), {
      $inc: { 'stats.loginCount': 1 },
      'security.lastLogin': new Date(),
      'security.lastLoginIP': options.ipAddress,
    });
  }

  /**
   * Log authentication attempt
   */
  private async logAuthenticationAttempt(
    identifier: string,
    success: boolean,
    reason: string,
    options: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Implementation would log to database or file
    this.logger.info('Authentication attempt', {
      identifier,
      success,
      reason,
      ipAddress: options.ipAddress,
    });
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now || !session.isActive) {
        this.activeSessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Cleanup user sessions (keep only most recent)
   */
  private async cleanupUserSessions(
    userId: Types.ObjectId,
    maxSessions: number
  ): Promise<void> {
    const userSessions = Array.from(this.activeSessions.values())
      .filter(session => session.userId.equals(userId))
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

    if (userSessions.length > maxSessions) {
      const sessionsToRemove = userSessions.slice(maxSessions);
      for (const session of sessionsToRemove) {
        this.activeSessions.delete(session.id);
      }
    }
  }

  /**
   * Invalidate user sessions
   */
  private async invalidateUserSessions(
    userId: string,
    options: { keepCurrent?: boolean } = {}
  ): Promise<void> {
    const userSessions = Array.from(this.activeSessions.values())
      .filter(session => session.userId.toString() === userId);

    for (const session of userSessions) {
      if (options.keepCurrent) {
        // Keep the most recent session
        continue;
      }
      session.isActive = false;
      this.activeSessions.delete(session.id);
    }
  }

  /**
   * Transfer user content to another user
   */
  private async transferUserContent(fromUserId: string, toUserId: string): Promise<void> {
    // Implementation would transfer posts, pages, comments, etc.
    this.logger.info('Transferring user content', { fromUserId, toUserId });
  }

  /**
   * Send email verification
   */
  private async sendEmailVerification(user: IUser): Promise<void> {
    // Implementation would send verification email
    this.logger.info('Sending email verification', { userId: user._id });
  }

  /**
   * Send welcome email
   */
  private async sendWelcomeEmail(user: IUser): Promise<void> {
    // Implementation would send welcome email
    this.logger.info('Sending welcome email', { userId: user._id });
  }
}

export default UserManager;