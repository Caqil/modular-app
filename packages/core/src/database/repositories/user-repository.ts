
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { BaseRepository } from './base-repository';
import { User, type IUser } from '../models/user';
import Validator from '../../utils/validator';
import { Sanitizer } from '../../utils/sanitizer';
import { LoginCredentials, UserProfile, UserQuery, UserRole, UserStats, UserStatus } from '../../types/user';
import { DateUtils } from '../../utils/date-utils';
import { PaginatedResult, QueryOptions } from '../../types/database';
import { FilterQuery, Types } from 'mongoose';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User, 'User');
  }

  /**
   * Create a new user with validation and password hashing
   */
  override async create(data: Partial<IUser>): Promise<IUser> {
    try {
      // Validate user data
      const validation = Validator.validate(Validator.userCreateSchema, data);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors.message}`);
      }

      // Check for existing user with same email or username
      const existingUser = await this.model.findOne({
        $or: [
          { email: data.email },
          { username: data.username },
        ],
      });

      if (existingUser) {
        if (existingUser.email === data.email) {
          throw new Error('User with this email already exists');
        }
        if (existingUser.username === data.username) {
          throw new Error('User with this username already exists');
        }
      }

      // Hash password
      if (data.password) {
        data.password = await this.hashPassword(data.password);
      }

      // Sanitize inputs
      if (data.email) {
        data.email = Sanitizer.sanitizeEmail(data.email);
      }
      if (data.username) {
        data.username = Sanitizer.sanitizeUsername(data.username);
      }
      if (data.firstName) {
        data.firstName = Sanitizer.sanitizeText(data.firstName);
      }
      if (data.lastName) {
        data.lastName = Sanitizer.sanitizeText(data.lastName);
      }
      if (data.website) {
        data.website = Sanitizer.sanitizeUrl(data.website);
      }

      // Set default values
      const userData: Partial<IUser> = {
        ...data,
        role: data.role || 'subscriber',
        status: data.status || 'pending',
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        preferences: {
          theme: 'auto',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            comments: true,
            mentions: true,
          },
          privacy: {
            profileVisibility: 'public',
            showEmail: false,
            allowMessages: true,
          },
        },
        stats: {
          loginCount: 0,
          postCount: 0,
          commentCount: 0,
        },
        security: {
          failedLoginAttempts: 0,
        },
        metadata: {
          source: data.metadata?.source || 'registration',
          ...data.metadata,
        },
      };

      return super.create(userData);
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string, options: QueryOptions = {}): Promise<IUser | null> {
    const sanitizedEmail = Sanitizer.sanitizeEmail(email);
    return this.findOne({ email: sanitizedEmail }, options);
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string, options: QueryOptions = {}): Promise<IUser | null> {
    const sanitizedUsername = Sanitizer.sanitizeUsername(username);
    return this.findOne({ username: sanitizedUsername }, options);
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole, options: QueryOptions = {}): Promise<IUser[]> {
    return this.findMany({ role }, options);
  }

  /**
   * Find users by status
   */
  async findByStatus(status: UserStatus, options: QueryOptions = {}): Promise<IUser[]> {
    return this.findMany({ status }, options);
  }

  /**
   * Find active users
   */
  async findActive(options: QueryOptions = {}): Promise<IUser[]> {
    return this.findMany({ 
      status: 'active',
      deletedAt: { $exists: false },
    }, options);
  }

  /**
   * Advanced user search with filters
   */
  async findWithFilters(query: UserQuery): Promise<PaginatedResult<IUser>> {
    try {
      const filter: FilterQuery<IUser> = {};

      // Role filter
      if (query.role) {
        if (Array.isArray(query.role)) {
          filter.role = { $in: query.role };
        } else {
          filter.role = query.role;
        }
      }

      // Status filter
      if (query.status) {
        if (Array.isArray(query.status)) {
          filter.status = { $in: query.status };
        } else {
          filter.status = query.status;
        }
      }

      // Search filter
      if (query.search) {
        const searchRegex = new RegExp(query.search, 'i');
        filter.$or = [
          { email: searchRegex },
          { username: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { displayName: searchRegex },
        ];
      }

      // Date range filter
      if (query.dateFrom || query.dateTo) {
        filter.createdAt = {};
        if (query.dateFrom) {
          filter.createdAt.$gte = query.dateFrom;
        }
        if (query.dateTo) {
          filter.createdAt.$lte = query.dateTo;
        }
      }

      // Exclude deleted users by default
      filter.deletedAt = { $exists: false };

      // Pagination options
      const paginationOptions = {
        page: query.page || 1,
        limit: query.limit || 20,
        sort: query.sort || { createdAt: -1 },
      };

      return this.paginate(filter, paginationOptions);
    } catch (error) {
      this.logger.error('Error finding users with filters:', error);
      throw error;
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(user: IUser, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      this.logger.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string | Types.ObjectId,
    newPassword: string,
    currentPassword?: string
  ): Promise<IUser | null> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password if provided
      if (currentPassword) {
        const isValidCurrent = await this.verifyPassword(user, currentPassword);
        if (!isValidCurrent) {
          throw new Error('Current password is incorrect');
        }
      }

      // Validate new password
      if (!Validator.validatePassword(newPassword)) {
        throw new Error('Password does not meet requirements');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user
      return this.updateById(userId, {
        password: hashedPassword,
        'security.passwordChangedAt': new Date(),
        'security.failedLoginAttempts': 0,
        'security.lockedUntil': undefined,
      });
    } catch (error) {
      this.logger.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Handle login attempt
   */
  async handleLoginAttempt(
    credentials: LoginCredentials,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; user?: IUser; error?: string }> {
    try {
      // Find user by email or username
      const user = await this.model.findOne({
        $or: [
          { email: credentials.email },
          { username: credentials.username },
        ],
      }).select('+password +security.failedLoginAttempts +security.lockedUntil');

      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.security.lockedUntil && user.security.lockedUntil > new Date()) {
        return { success: false, error: 'Account is temporarily locked' };
      }

      // Check if account is active
      if (user.status !== 'active') {
        return { success: false, error: 'Account is not active' };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(user, credentials.password);
      
      if (!isValidPassword) {
        // Increment failed attempts
        await this.incrementFailedLoginAttempts(user.id);
        return { success: false, error: 'Invalid credentials' };
      }

      // Successful login - update user stats
      await this.updateById(user.id, {
        lastLogin: new Date(),
        'stats.lastLoginAt': new Date(),
        'stats.lastActivityAt': new Date(),
        $inc: { 'stats.loginCount': 1 },
        'security.failedLoginAttempts': 0,
        'security.lockedUntil': undefined,
      });

      this.logger.info('User login successful', {
        userId: user._id,
        email: user.email,
        ipAddress,
      });

      return { success: true, user };
    } catch (error) {
      this.logger.error('Error handling login attempt:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Increment failed login attempts and lock account if necessary
   */
  async incrementFailedLoginAttempts(userId: Types.ObjectId): Promise<void> {
    try {
      const user = await this.model.findById(userId).select('security.failedLoginAttempts');
      if (!user) return;

      const attempts = (user.security.failedLoginAttempts || 0) + 1;
      const maxAttempts = 5;
      const lockDuration = 30 * 60 * 1000; // 30 minutes

      const updateData: any = {
        'security.failedLoginAttempts': attempts,
      };

      // Lock account if max attempts reached
      if (attempts >= maxAttempts) {
        updateData['security.lockedUntil'] = new Date(Date.now() + lockDuration);
      }

      await this.updateById(userId, updateData);

      if (attempts >= maxAttempts) {
        this.logger.warn('User account locked due to failed login attempts', {
          userId,
          attempts,
        });
      }
    } catch (error) {
      this.logger.error('Error incrementing failed login attempts:', error);
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<{ user: IUser; token: string } | null> {
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        return null;
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.updateById(user.id, {
        'security.passwordResetToken': token,
        'security.passwordResetExpires': expires,
      });

      return { user, token };
    } catch (error) {
      this.logger.error('Error generating password reset token:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<IUser | null> {
    try {
      const user = await this.model.findOne({
        'security.passwordResetToken': token,
        'security.passwordResetExpires': { $gt: new Date() },
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Validate new password
      if (!Validator.validatePassword(newPassword)) {
        throw new Error('Password does not meet requirements');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user
      return this.updateById(user.id, {
        password: hashedPassword,
        'security.passwordResetToken': undefined,
        'security.passwordResetExpires': undefined,
        'security.passwordChangedAt': new Date(),
        'security.failedLoginAttempts': 0,
        'security.lockedUntil': undefined,
      });
    } catch (error) {
      this.logger.error('Error resetting password with token:', error);
      throw error;
    }
  }

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(userId: string | Types.ObjectId): Promise<string> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.updateById(userId, {
        'security.emailVerificationToken': token,
        'security.emailVerificationExpires': expires,
      });

      return token;
    } catch (error) {
      this.logger.error('Error generating email verification token:', error);
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmailWithToken(token: string): Promise<IUser | null> {
    try {
      const user = await this.model.findOne({
        'security.emailVerificationToken': token,
        'security.emailVerificationExpires': { $gt: new Date() },
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      // Update user
      return this.updateById(user.id, {
        emailVerified: true,
        status: 'active', // Activate account on email verification
        'security.emailVerificationToken': undefined,
        'security.emailVerificationExpires': undefined,
      });
    } catch (error) {
      this.logger.error('Error verifying email with token:', error);
      throw error;
    }
  }

  /**
   * Update user activity
   */
  async updateActivity(userId: string | Types.ObjectId): Promise<void> {
    try {
      await this.updateById(userId, {
        'stats.lastActivityAt': new Date(),
      });
    } catch (error) {
      this.logger.error('Error updating user activity:', error);
    }
  }

  /**
   * Get user profile (safe for public viewing)
   */
  async getUserProfile(userId: string | Types.ObjectId): Promise<UserProfile | null> {
    try {
      const user = await this.findById(userId, {
        select: 'username displayName firstName lastName avatar bio website role createdAt stats.postCount',
      });

      if (!user) {
        return null;
      }

      return {
        _id: user._id,
        username: user.username,
        displayName: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        bio: user.bio,
        website: user.website,
        role: user.role,
        joinedAt: user.createdAt,
        postCount: user.stats.postCount,
      } as UserProfile;
    } catch (error) {
      this.logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Soft delete user
   */
  async softDelete(userId: string | Types.ObjectId): Promise<IUser | null> {
    try {
      return this.updateById(userId, {
        deletedAt: new Date(),
        status: 'inactive',
      });
    } catch (error) {
      this.logger.error('Error soft deleting user:', error);
      throw error;
    }
  }

  /**
   * Restore soft deleted user
   */
  async restore(userId: string | Types.ObjectId): Promise<IUser | null> {
    try {
      return this.updateById(userId, {
        deletedAt: undefined,
        status: 'active',
      });
    } catch (error) {
      this.logger.error('Error restoring user:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const now = new Date();
      const startOfDay = DateUtils.startOfDay(now);
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        total,
        active,
        inactive,
        suspended,
        pending,
        newToday,
        newThisWeek,
        newThisMonth,
        roleStats,
        monthlyStats,
      ] = await Promise.all([
        this.count({ deletedAt: { $exists: false } }),
        this.count({ status: 'active', deletedAt: { $exists: false } }),
        this.count({ status: 'inactive', deletedAt: { $exists: false } }),
        this.count({ status: 'suspended', deletedAt: { $exists: false } }),
        this.count({ status: 'pending', deletedAt: { $exists: false } }),
        this.count({ 
          createdAt: { $gte: startOfDay },
          deletedAt: { $exists: false },
        }),
        this.count({ 
          createdAt: { $gte: startOfWeek },
          deletedAt: { $exists: false },
        }),
        this.count({ 
          createdAt: { $gte: startOfMonth },
          deletedAt: { $exists: false },
        }),
        this.aggregate([
          { $match: { deletedAt: { $exists: false } } },
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ]),
        this.aggregate([
          { $match: { deletedAt: { $exists: false } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 12 },
        ]),
      ]);

      // Process role stats
      const byRole = roleStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      // Process monthly stats
      const byMonth = monthlyStats.reduce((acc: any, stat: any) => {
        const key = `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}`;
        acc[key] = stat.count;
        return acc;
      }, {});

      return {
        total,
        active,
        inactive,
        suspended,
        pending,
        byRole,
        byMonth,
        newToday,
        newThisWeek,
        newThisMonth,
      };
    } catch (error) {
      this.logger.error('Error getting user statistics:', error);
      throw error;
    }
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Bulk update user roles
   */
  async bulkUpdateRoles(userIds: string[], role: UserRole): Promise<number> {
    try {
      const objectIds = userIds.map(id => this.ensureObjectId(id));
      
      const result = await this.updateMany(
        { _id: { $in: objectIds } },
        { role }
      );

      this.logger.info(`Updated role to ${role} for ${result} users`);

      return result;
    } catch (error) {
      this.logger.error('Error bulk updating user roles:', error);
      throw error;
    }
  }

  /**
   * Bulk update user status
   */
  async bulkUpdateStatus(userIds: string[], status: UserStatus): Promise<number> {
    try {
      const objectIds = userIds.map(id => this.ensureObjectId(id));
      
      const result = await this.updateMany(
        { _id: { $in: objectIds } },
        { status }
      );

      this.logger.info(`Updated status to ${status} for ${result} users`);

      return result;
    } catch (error) {
      this.logger.error('Error bulk updating user status:', error);
      throw error;
    }
  }
}