import { Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { BaseRepositoryImpl } from './base-repository';
import type { IUser } from '../database/models/user';
import { LoginCredentials, RegisterData, UserMeta, UserPreferences, UserProfile, UserRole, UserStats, UserStatus } from '../../types/user';
import Validator from '../../utils/validator';
import { Sanitizer } from '../../utils/sanitizer';
import { QueryOptions } from '../../types/database';
import { DateUtils } from '../../utils/date-utils';

export interface UserSearchOptions {
  query?: string;
  role?: UserRole;
  status?: UserStatus;
  dateFrom?: Date;
  dateTo?: Date;
  emailVerified?: boolean;
  hasAvatar?: boolean;
}

export interface UserLoginResult {
  success: boolean;
  user?: UserProfile;
  message?: string;
  requiresTwoFactor?: boolean;
  loginAttempts?: number;
}

export interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export class UserRepository extends BaseRepositoryImpl<IUser> {
  constructor(model: Model<IUser>) {
    super(model);
  }

  /**
   * Create user with password hashing
   */
  async createUser(data: RegisterData): Promise<IUser> {
    try {
      this.logger.debug('Creating user', { username: data.username, email: data.email });

      // Validate input data
      const validation = Validator.validate(Validator.userCreateSchema, data);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors.message}`);
      }

      // Check if user already exists
      const existingUser = await this.findOne({
        $or: [
          { email: data.email.toLowerCase() },
          { username: data.username.toLowerCase() },
        ],
      });

      if (existingUser) {
        if (existingUser.email === data.email.toLowerCase()) {
          throw new Error('Email already exists');
        }
        if (existingUser.username === data.username.toLowerCase()) {
          throw new Error('Username already exists');
        }
      }

      // Hash password
      const hashedPassword = await this.hashPassword(data.password);

      // Prepare user data
      const userData: Partial<IUser> = {
        email: data.email.toLowerCase().trim(),
        username: data.username.toLowerCase().trim(),
        password: hashedPassword,
        firstName: data.firstName ? Sanitizer.sanitizeText(data.firstName) : undefined,
        lastName: data.lastName ? Sanitizer.sanitizeText(data.lastName) : undefined,
        role: UserRole.SUBSCRIBER,
        status: UserStatus.ACTIVE,
        emailVerified: false,
        loginCount: 0,
        preferences: this.getDefaultPreferences(),
        meta: {},
      };

      // Generate display name
      if (userData.firstName || userData.lastName) {
        userData.displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      } else {
        userData.displayName = userData.username;
      }

      const user = await this.create(userData);

      this.logger.info('User created successfully', {
        id: user._id,
        username: user.username,
        email: user.email,
      });

      return user;
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user with validation
   */
  async updateUser(id: string | Types.ObjectId, data: Partial<IUser>): Promise<IUser | null> {
    try {
      this.logger.debug('Updating user', { id: id.toString() });

      // Remove sensitive fields that shouldn't be updated directly
      const updateData = { ...data };
      delete updateData.password;
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // Sanitize text fields
      if (updateData.firstName) {
        updateData.firstName = Sanitizer.sanitizeText(updateData.firstName);
      }
      if (updateData.lastName) {
        updateData.lastName = Sanitizer.sanitizeText(updateData.lastName);
      }
      if (updateData.bio) {
        updateData.bio = Sanitizer.sanitizeText(updateData.bio);
      }
      if (updateData.website) {
        updateData.website = Sanitizer.sanitizeUrl(updateData.website);
      }

      // Update display name if name fields changed
      if (updateData.firstName !== undefined || updateData.lastName !== undefined) {
        const user = await this.findById(id);
        if (user) {
          const firstName = updateData.firstName !== undefined ? updateData.firstName : user.firstName;
          const lastName = updateData.lastName !== undefined ? updateData.lastName : user.lastName;
          
          if (firstName || lastName) {
            updateData.displayName = `${firstName || ''} ${lastName || ''}`.trim();
          } else {
            updateData.displayName = user.username;
          }
        }
      }

      return await this.updateById(id, updateData);
    } catch (error) {
      this.logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string, options: QueryOptions = {}): Promise<IUser | null> {
    try {
      this.logger.debug('Finding user by email', { email });

      const sanitizedEmail = Sanitizer.sanitizeEmail(email);
      if (!sanitizedEmail) {
        return null;
      }

      return await this.findOne({ email: sanitizedEmail }, options);
    } catch (error) {
      this.logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string, options: QueryOptions = {}): Promise<IUser | null> {
    try {
      this.logger.debug('Finding user by username', { username });

      const sanitizedUsername = Sanitizer.sanitizeUsername(username);
      if (!sanitizedUsername) {
        return null;
      }

      return await this.findOne({ username: sanitizedUsername }, options);
    } catch (error) {
      this.logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Authenticate user login
   */
  async authenticateUser(credentials: LoginCredentials): Promise<UserLoginResult> {
    try {
      this.logger.debug('Authenticating user', {
        email: credentials.email,
        username: credentials.username,
      });

      // Find user by email or username
      const user = await this.findOne({
        $or: [
          ...(credentials.email ? [{ email: credentials.email.toLowerCase() }] : []),
          ...(credentials.username ? [{ username: credentials.username.toLowerCase() }] : []),
        ],
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials',
        };
      }

      // Check if user is active
      if (user.status !== UserStatus.ACTIVE) {
        return {
          success: false,
          message: 'Account is not active',
        };
      }

      // Verify password
      const passwordValid = await this.verifyPassword(credentials.password, user.password);
      if (!passwordValid) {
        // Record failed login attempt
        await this.recordLoginAttempt(user._id, false, {
          ipAddress: undefined, // TODO: Get from request
          userAgent: undefined, // TODO: Get from request
        });

        return {
          success: false,
          message: 'Invalid credentials',
        };
      }

      // Check for two-factor authentication
      if (user.meta?.twoFactorEnabled && !credentials.twoFactorCode) {
        return {
          success: false,
          requiresTwoFactor: true,
          message: 'Two-factor authentication required',
        };
      }

      // Verify two-factor code if provided
      if (user.meta?.twoFactorEnabled && credentials.twoFactorCode) {
        const twoFactorValid = await this.verifyTwoFactorCode(user, credentials.twoFactorCode);
        if (!twoFactorValid) {
          return {
            success: false,
            message: 'Invalid two-factor authentication code',
          };
        }
      }

      // Update login info
      await this.updateLoginInfo(user._id);

      // Record successful login attempt
      await this.recordLoginAttempt(user._id, true, {
        ipAddress: undefined, // TODO: Get from request
        userAgent: undefined, // TODO: Get from request
      });

      const userProfile = this.toUserProfile(user);

      this.logger.info('User authenticated successfully', {
        id: user._id,
        username: user.username,
      });

      return {
        success: true,
        user: userProfile,
        message: 'Login successful',
      };
    } catch (error) {
      this.logger.error('Error authenticating user:', error);
      return {
        success: false,
        message: 'Authentication failed',
      };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(id: string | Types.ObjectId, data: PasswordUpdateData): Promise<boolean> {
    try {
      this.logger.debug('Updating user password', { id: id.toString() });

      if (data.newPassword !== data.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const currentPasswordValid = await this.verifyPassword(data.currentPassword, user.password);
      if (!currentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(data.newPassword);

      // Update password
      await this.updateById(id, { password: hashedPassword });

      this.logger.info('User password updated successfully', { id: user._id });

      return true;
    } catch (error) {
      this.logger.error('Error updating user password:', error);
      throw error;
    }
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole, options: QueryOptions = {}): Promise<IUser[]> {
    try {
      return await this.findMany({ role }, {
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error) {
      this.logger.error('Error finding users by role:', error);
      throw error;
    }
  }

  /**
   * Find users by status
   */
  async findByStatus(status: UserStatus, options: QueryOptions = {}): Promise<IUser[]> {
    try {
      return await this.findMany({ status }, {
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error) {
      this.logger.error('Error finding users by status:', error);
      throw error;
    }
  }

  /**
   * Search users
   */
  async searchUsers(searchOptions: UserSearchOptions): Promise<IUser[]> {
    try {
      const { query, role, status, dateFrom, dateTo, emailVerified, hasAvatar } = searchOptions;

      this.logger.debug('Searching users', { query, role, status });

      // Build filter
      const filter: any = {};

      if (role) {
        filter.role = role;
      }

      if (status) {
        filter.status = status;
      }

      if (emailVerified !== undefined) {
        filter.emailVerified = emailVerified;
      }

      if (hasAvatar !== undefined) {
        filter.avatar = hasAvatar ? { $exists: true, $ne: null } : { $in: [null, ''] };
      }

      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) {
          filter.createdAt.$gte = dateFrom;
        }
        if (dateTo) {
          filter.createdAt.$lte = dateTo;
        }
      }

      // Use text search if query provided
      if (query) {
        const searchFields = ['username', 'email', 'firstName', 'lastName', 'displayName'];
        const sanitizedQuery = Sanitizer.sanitizeSearchQuery(query);
        const searchConditions = searchFields.map(field => ({
          [field]: { $regex: sanitizedQuery, $options: 'i' },
        }));
        filter.$or = searchConditions;
      }

      return await this.findMany(filter, {
        sort: { createdAt: -1 },
      });
    } catch (error) {
      this.logger.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<UserStats> {
    try {
      this.logger.debug('Getting user statistics');

      // Basic stats
      const [basicStats] = await this.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$status', UserStatus.ACTIVE] }, 1, 0] },
            },
            inactive: {
              $sum: { $cond: [{ $eq: ['$status', UserStatus.INACTIVE] }, 1, 0] },
            },
            suspended: {
              $sum: { $cond: [{ $eq: ['$status', UserStatus.SUSPENDED] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', UserStatus.PENDING] }, 1, 0] },
            },
          },
        },
      ]);

      // Stats by role
      const roleStats = await this.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]);

      // Stats by month
      const monthStats = await this.aggregate([
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
      ]);

      // Recent stats
      const today = DateUtils.startOfDay(new Date());
      const weekAgo = DateUtils.subtractDays(new Date(), 7);
      const monthAgo = DateUtils.subtractDays(new Date(), 30);

      const [newToday, newThisWeek, newThisMonth] = await Promise.all([
        this.count({ createdAt: { $gte: today } }),
        this.count({ createdAt: { $gte: weekAgo } }),
        this.count({ createdAt: { $gte: monthAgo } }),
      ]);

      const stats: UserStats = {
        total: basicStats?.total || 0,
        active: basicStats?.active || 0,
        inactive: basicStats?.inactive || 0,
        suspended: basicStats?.suspended || 0,
        pending: basicStats?.pending || 0,
        byRole: {} as Record<UserRole, number>,
        byMonth: {},
        newToday,
        newThisWeek,
        newThisMonth,
      };

      // Process role stats
      roleStats.forEach((stat: any) => {
        stats.byRole[stat._id as UserRole] = stat.count;
      });

      // Process month stats
      monthStats.forEach((stat: any) => {
        const key = `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}`;
        stats.byMonth[key] = stat.count;
      });

      return stats;
    } catch (error) {
      this.logger.error('Error getting user statistics:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    id: string | Types.ObjectId,
    preferences: Partial<UserPreferences>
  ): Promise<IUser | null> {
    try {
      this.logger.debug('Updating user preferences', { id: id.toString() });

      const user = await this.findById(id);
      if (!user) {
        return null;
      }

      const updatedPreferences = {
        ...user.preferences,
        ...preferences,
      };

      return await this.updateById(id, { preferences: updatedPreferences });
    } catch (error) {
      this.logger.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user meta data
   */
  async updateMeta(
    id: string | Types.ObjectId,
    meta: Partial<UserMeta>
  ): Promise<IUser | null> {
    try {
      this.logger.debug('Updating user meta', { id: id.toString() });

      const user = await this.findById(id);
      if (!user) {
        return null;
      }

      const updatedMeta = {
        ...user.meta,
        ...meta,
      };

      return await this.updateById(id, { meta: updatedMeta });
    } catch (error) {
      this.logger.error('Error updating user meta:', error);
      throw error;
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(id: string | Types.ObjectId): Promise<boolean> {
    try {
      this.logger.debug('Verifying user email', { id: id.toString() });

      const result = await this.updateById(id, {
        emailVerified: true,
        emailVerificationToken: undefined,
      });

      return !!result;
    } catch (error) {
      this.logger.error('Error verifying user email:', error);
      throw error;
    }
  }

  /**
   * Convert user document to user profile
   */
  toUserProfile(user: IUser): UserProfile {
    return {
      _id: user._id,
      username: user.username,
      displayName: user.displayName || user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      bio: user.bio,
      website: user.website,
      social: user.social,
      role: user.role,
      joinedAt: user.createdAt,
    };
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Update login information
   */
  private async updateLoginInfo(id: Types.ObjectId): Promise<void> {
    await this.updateById(id, {
      lastLogin: new Date(),
      $inc: { loginCount: 1 },
    });
  }

  /**
   * Record login attempt
   */
  private async recordLoginAttempt(
    userId: Types.ObjectId,
    success: boolean,
    metadata: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    try {
      const user = await this.findById(userId);
      if (!user) return;

      const loginHistory = user.meta?.loginHistory || [];
      
      // Add new login attempt
      loginHistory.push({
        timestamp: new Date(),
        ip: metadata.ipAddress || 'unknown',
        userAgent: metadata.userAgent || 'unknown',
        success,
      });

      // Keep only last 10 login attempts
      const recentHistory = loginHistory.slice(-10);

      await this.updateMeta(userId, {
        loginHistory: recentHistory,
        lastLoginIp: metadata.ipAddress,
      });
    } catch (error) {
      this.logger.error('Error recording login attempt:', error);
    }
  }

  /**
   * Verify two-factor authentication code
   */
  private async verifyTwoFactorCode(user: IUser, code: string): Promise<boolean> {
    // TODO: Implement TOTP verification
    // This would involve verifying the provided code against the user's secret
    this.logger.debug('Two-factor verification not yet implemented');
    return true; // Placeholder
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      theme: 'light',
      notifications: {
        email: true,
        push: false,
        sms: false,
        marketing: false,
      },
      privacy: {
        showProfile: true,
        showEmail: false,
        showActivity: true,
        allowMessages: true,
      },
      editor: {
        visualEditor: true,
        syntaxHighlighting: true,
        autoSave: true,
        spellCheck: true,
      },
    };
  }

  /**
   * Bulk update user status
   */
  async bulkUpdateStatus(ids: Types.ObjectId[], status: UserStatus): Promise<number> {
    try {
      this.logger.debug('Bulk updating user status', {
        count: ids.length,
        status,
      });

      return await this.updateMany(
        { _id: { $in: ids } },
        { status }
      );
    } catch (error) {
      this.logger.error('Error bulk updating user status:', error);
      throw error;
    }
  }

  /**
   * Delete user and anonymize data
   */
  async deleteUserSafely(id: string | Types.ObjectId): Promise<boolean> {
    try {
      this.logger.debug('Safely deleting user', { id: id.toString() });

      const user = await this.findById(id);
      if (!user) {
        return false;
      }

      // TODO: Implement data anonymization
      // - Update posts/comments to show "Anonymous User"
      // - Remove personal data while keeping content

      // For now, just delete the user
      return await this.deleteById(id);
    } catch (error) {
      this.logger.error('Error safely deleting user:', error);
      throw error;
    }
  }

  /**
   * Get user activity summary
   */
  async getActivitySummary(id: Types.ObjectId): Promise<{
    loginCount: number;
    lastLogin?: Date;
    postCount: number;
    commentCount: number;
    accountAge: number;
  }> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      // Get post count (requires content repository)
      const postCount = await contentRepository.count({ author: id });
      // Get comment count (requires comment repository)
     const commentCount = await commentRepository.count({ 'author.userId': id });
      // Calculate account age in days
      const accountAge = DateUtils.daysBetween(user.createdAt, new Date()) || 0;

      return {
        loginCount: user.loginCount,
        lastLogin: user.lastLogin,
        postCount,
        commentCount,
        accountAge,
      };
    } catch (error) {
      this.logger.error('Error getting user activity summary:', error);
      throw error;
    }
  }
}