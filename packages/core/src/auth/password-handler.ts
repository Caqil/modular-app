// ===================================================================
// PASSWORD HANDLER - PASSWORD HASHING AND VALIDATION
// ===================================================================

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { CacheManager } from '../cache/cache-manager';
import { User, type IUser } from '../database/models';
import {
  AuthConfig,
  AuthError,
  AuthErrorCode,
  AuthEventType,
} from './auth-types';

export interface PasswordPolicy {
  minLength: number;
  maxLength?: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number;
  expiryDays?: number;
  blacklist?: string[];
  customRules?: PasswordRule[];
}

export interface PasswordRule {
  name: string;
  description: string;
  validator: (password: string) => boolean;
  message: string;
}

export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0-100
  strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface PasswordHashResult {
  hash: string;
  salt: string;
  rounds: number;
  algorithm: string;
  createdAt: Date;
}

export interface PasswordResetToken {
  token: string;
  hashedToken: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface PasswordAttempt {
  userId: string;
  success: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Password Handler
 * Manages password hashing, validation, and security policies
 */
export class PasswordHandler {
  private logger = new Logger('PasswordHandler');
  private events = EventManager.getInstance();
  private cache = CacheManager.getInstance();
  private config: AuthConfig['password'];
  private bcryptRounds: number;
  private failedAttempts = new Map<string, PasswordAttempt[]>();
  private resetTokens = new Map<string, PasswordResetToken>();

  private readonly defaultPolicy: PasswordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    preventReuse: 5,
    expiryDays: 90,
    blacklist: [
      'password', 'password123', '123456', 'qwerty', 'abc123',
      'admin', 'root', 'user', 'guest', 'test', 'demo',
    ],
  };

  constructor(config: AuthConfig) {
    this.config = { ...this.defaultPolicy, ...config.password };
    this.bcryptRounds = config.bcrypt.rounds;
  }

  /**
   * Hash password with bcrypt
   */
  public async hashPassword(password: string): Promise<PasswordHashResult> {
    try {
      const salt = await bcrypt.genSalt(this.bcryptRounds);
      const hash = await bcrypt.hash(password, salt);

      const result: PasswordHashResult = {
        hash,
        salt,
        rounds: this.bcryptRounds,
        algorithm: 'bcrypt',
        createdAt: new Date(),
      };

      this.logger.debug('Password hashed successfully');
      return result;

    } catch (error) {
      this.logger.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      
      this.logger.debug('Password verification completed', { isValid });
      return isValid;

    } catch (error) {
      this.logger.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Validate password against policy
   */
  public validatePassword(password: string, user?: IUser): PasswordValidationResult {
    const result: PasswordValidationResult = {
      valid: true,
      score: 0,
      strength: 'very-weak',
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      // Length validation
      if (password.length < this.config.minLength) {
        result.errors.push(`Password must be at least ${this.config.minLength} characters long`);
        result.valid = false;
      }

      if (this.config.maxLength && password.length > this.config.maxLength) {
        result.errors.push(`Password must not exceed ${this.config.maxLength} characters`);
        result.valid = false;
      }

      // Character requirements
      if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
        result.errors.push('Password must contain at least one uppercase letter');
        result.valid = false;
      }

      if (this.config.requireLowercase && !/[a-z]/.test(password)) {
        result.errors.push('Password must contain at least one lowercase letter');
        result.valid = false;
      }

      if (this.config.requireNumbers && !/\d/.test(password)) {
        result.errors.push('Password must contain at least one number');
        result.valid = false;
      }

      if (this.config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        result.errors.push('Password must contain at least one special character');
        result.valid = false;
      }

      // Blacklist check
      const lowerPassword = password.toLowerCase();
      const blacklisted = this.config.blacklist?.some(banned => 
        lowerPassword.includes(banned.toLowerCase())
      );

      if (blacklisted) {
        result.errors.push('Password contains commonly used words or patterns');
        result.valid = false;
      }

      // Common patterns
      if (/^(.)\1+$/.test(password)) {
        result.errors.push('Password cannot be all the same character');
        result.valid = false;
      }

      if (/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
        result.warnings.push('Password contains sequential characters');
      }

      // User-specific checks
      if (user) {
        const userInfo = [
          user.email?.split('@')[0],
          user.username,
          user.profile?.firstName,
          user.profile?.lastName,
          user.profile?.displayName,
        ].filter(Boolean);

        const containsUserInfo = userInfo.some(info => 
          info && lowerPassword.includes(info.toLowerCase())
        );

        if (containsUserInfo) {
          result.errors.push('Password cannot contain personal information');
          result.valid = false;
        }
      }

      // Custom rules
      if (this.config.customRules) {
        for (const rule of this.config.customRules) {
          if (!rule.validator(password)) {
            result.errors.push(rule.message);
            result.valid = false;
          }
        }
      }

      // Calculate strength score
      result.score = this.calculatePasswordScore(password);
      result.strength = this.getPasswordStrength(result.score);

      // Add suggestions
      if (result.score < 60) {
        result.suggestions.push('Consider using a longer password');
        result.suggestions.push('Mix uppercase and lowercase letters');
        result.suggestions.push('Add numbers and special characters');
        result.suggestions.push('Avoid common words and patterns');
      }

      return result;

    } catch (error) {
      this.logger.error('Password validation error:', error);
      result.valid = false;
      result.errors.push('Password validation failed');
      return result;
    }
  }

  /**
   * Check if password was previously used
   */
  public async checkPasswordReuse(userId: string, password: string): Promise<boolean> {
    try {
      if (this.config.preventReuse <= 0) {
        return false; // Reuse checking disabled
      }

      const user = await User.findById(userId);
      if (!user || !user.passwordHistory || user.passwordHistory.length === 0) {
        return false;
      }

      // Check against recent passwords
      const recentPasswords = user.passwordHistory.slice(-this.config.preventReuse);
      
      for (const historicalHash of recentPasswords) {
        const isReused = await this.verifyPassword(password, historicalHash);
        if (isReused) {
          return true;
        }
      }

      return false;

    } catch (error) {
      this.logger.error('Password reuse check error:', error);
      return false;
    }
  }

  /**
   * Update user password
   */
  public async updatePassword(userId: string, newPassword: string, oldPassword?: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify old password if provided
      if (oldPassword) {
        const isValidOldPassword = await this.verifyPassword(oldPassword, user.password);
        if (!isValidOldPassword) {
          throw new Error('Current password is incorrect');
        }
      }

      // Validate new password
      const validation = this.validatePassword(newPassword, user);
      if (!validation.valid) {
        throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
      }

      // Check password reuse
      const isReused = await this.checkPasswordReuse(userId, newPassword);
      if (isReused) {
        throw new Error(`Password cannot be one of your last ${this.config.preventReuse} passwords`);
      }

      // Hash new password
      const hashedResult = await this.hashPassword(newPassword);

      // Update user password
      const updateData: any = {
        password: hashedResult.hash,
        passwordChangedAt: new Date(),
      };

      // Update password history
      if (this.config.preventReuse > 0) {
        const passwordHistory = user.passwordHistory || [];
        passwordHistory.push(user.password); // Add current password to history
        
        // Keep only the specified number of previous passwords
        if (passwordHistory.length > this.config.preventReuse) {
          passwordHistory.splice(0, passwordHistory.length - this.config.preventReuse);
        }
        
        updateData.passwordHistory = passwordHistory;
      }

      await User.findByIdAndUpdate(userId, updateData);

      // Clear failed attempts
      this.clearFailedAttempts(userId);

      // Emit password change event
      await this.events.emit(AuthEventType.PASSWORD_CHANGE, {
        userId,
        timestamp: new Date(),
      });

      this.logger.info('Password updated successfully', { userId });

    } catch (error) {
      this.logger.error('Password update error:', error);
      throw error;
    }
  }

  /**
   * Check if password is expired
   */
  public isPasswordExpired(user: IUser): boolean {
    if (!this.config.expiryDays || !user.passwordChangedAt) {
      return false;
    }

    const expiryDate = new Date(user.passwordChangedAt);
    expiryDate.setDate(expiryDate.getDate() + this.config.expiryDays);
    
    return new Date() > expiryDate;
  }

  /**
   * Get days until password expiry
   */
  public getDaysUntilExpiry(user: IUser): number | null {
    if (!this.config.expiryDays || !user.passwordChangedAt) {
      return null;
    }

    const expiryDate = new Date(user.passwordChangedAt);
    expiryDate.setDate(expiryDate.getDate() + this.config.expiryDays);
    
    const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  }

  /**
   * Generate password reset token
   */
  public async generateResetToken(userId: string): Promise<string> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const resetToken: PasswordResetToken = {
        token,
        hashedToken,
        userId,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        used: false,
        createdAt: new Date(),
      };

      this.resetTokens.set(hashedToken, resetToken);

      // Also cache it
      await this.cache.set(`reset:${hashedToken}`, resetToken, 3600); // 1 hour

      this.logger.info('Password reset token generated', { userId });
      return token;

    } catch (error) {
      this.logger.error('Reset token generation error:', error);
      throw error;
    }
  }

  /**
   * Verify password reset token
   */
  public async verifyResetToken(token: string): Promise<PasswordResetToken | null> {
    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      // Check in-memory store first
      let resetToken = this.resetTokens.get(hashedToken);
      
      // Check cache if not found
      if (!resetToken) {
        resetToken = await this.cache.get<PasswordResetToken>(`reset:${hashedToken}`);
      }

      if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
        return null;
      }

      return resetToken;

    } catch (error) {
      this.logger.error('Reset token verification error:', error);
      return null;
    }
  }

  /**
   * Use password reset token
   */
  public async useResetToken(token: string): Promise<void> {
    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const resetToken = await this.verifyResetToken(token);

      if (!resetToken) {
        throw new Error('Invalid or expired reset token');
      }

      // Mark as used
      resetToken.used = true;
      this.resetTokens.set(hashedToken, resetToken);
      
      // Update cache
      await this.cache.set(`reset:${hashedToken}`, resetToken, 60); // Keep for 1 minute to prevent reuse

      this.logger.info('Password reset token used', { userId: resetToken.userId });

    } catch (error) {
      this.logger.error('Reset token usage error:', error);
      throw error;
    }
  }

  /**
   * Record failed password attempt
   */
  public recordFailedAttempt(userId: string, ipAddress?: string, userAgent?: string): void {
    const attempt: PasswordAttempt = {
      userId,
      success: false,
      timestamp: new Date(),
      ipAddress,
      userAgent,
    };

    const attempts = this.failedAttempts.get(userId) || [];
    attempts.push(attempt);

    // Keep only recent attempts (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAttempts = attempts.filter(a => a.timestamp > oneDayAgo);

    this.failedAttempts.set(userId, recentAttempts);

    this.logger.warn('Failed password attempt recorded', {
      userId,
      attemptCount: recentAttempts.length,
      ipAddress,
    });
  }

  /**
   * Check if account should be locked
   */
  public shouldLockAccount(userId: string): boolean {
    const attempts = this.failedAttempts.get(userId) || [];
    const recentFailures = attempts.filter(a => 
      !a.success && 
      a.timestamp > new Date(Date.now() - this.config.lockoutDuration * 60 * 1000)
    );

    return recentFailures.length >= this.config.maxAttempts;
  }

  /**
   * Clear failed attempts
   */
  public clearFailedAttempts(userId: string): void {
    this.failedAttempts.delete(userId);
  }

  /**
   * Generate secure random password
   */
  public generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charset = lowercase;
    let password = '';

    // Ensure at least one character from each required set
    if (this.config.requireLowercase) {
      password += this.getRandomChar(lowercase);
      charset += lowercase;
    }

    if (this.config.requireUppercase) {
      password += this.getRandomChar(uppercase);
      charset += uppercase;
    }

    if (this.config.requireNumbers) {
      password += this.getRandomChar(numbers);
      charset += numbers;
    }

    if (this.config.requireSpecialChars) {
      password += this.getRandomChar(specials);
      charset += specials;
    }

    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += this.getRandomChar(charset);
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private calculatePasswordScore(password: string): number {
    let score = 0;

    // Length bonus
    score += Math.min(password.length * 4, 25);

    // Character variety
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;

    // Pattern penalties
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/012|123|234|345|456|567|678|789|abc|bcd|cde|def/i.test(password)) score -= 15; // Sequential

    // Length bonuses for longer passwords
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 15;

    // Character set bonuses
    const charSets = [
      /[a-z]/,
      /[A-Z]/,
      /\d/,
      /[^A-Za-z0-9]/
    ].filter(regex => regex.test(password)).length;

    score += charSets * 5;

    return Math.max(0, Math.min(100, score));
  }

  private getPasswordStrength(score: number): PasswordValidationResult['strength'] {
    if (score < 20) return 'very-weak';
    if (score < 40) return 'weak';
    if (score < 60) return 'medium';
    if (score < 80) return 'strong';
    return 'very-strong';
  }

  private getRandomChar(charset: string): string {
    return charset.charAt(Math.floor(Math.random() * charset.length));
  }
}