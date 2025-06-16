// ===================================================================
// JWT HANDLER - JSON WEB TOKEN MANAGEMENT
// ===================================================================

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { CacheManager } from '../cache/cache-manager';
import { User, type IUser } from '../database/models';
import { UserRole } from '../types/user';
import {
  AuthConfig,
  AuthTokens,
  TokenPayload,
  RefreshTokenPayload,
  AuthError,
  AuthErrorCode,
  AuthEventType,
} from './auth-types';

export interface JWTHandlerConfig {
  jwt: AuthConfig['jwt'];
  cache?: {
    enabled: boolean;
    ttl: number;
    prefix: string;
  };
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: AuthError;
  expired?: boolean;
}

export interface RefreshResult {
  success: boolean;
  tokens?: AuthTokens;
  error?: AuthError;
}

/**
 * JWT Handler
 * Manages JWT token creation, validation, and refresh operations
 */
export class JWTHandler {
  private logger = new Logger('JWTHandler');
  private events = EventManager.getInstance();
  private cache = CacheManager.getInstance();
  private config: JWTHandlerConfig;
  private blacklistedTokens = new Set<string>();

  constructor(config: JWTHandlerConfig) {
    this.config = {
      cache: {
        enabled: true,
        ttl: 3600, // 1 hour
        prefix: 'jwt:',
        ...config.cache,
      },
      ...config,
    };
  }
  /**
   * Generate access and refresh tokens for user
   */
  public async generateTokens(user: IUser, sessionId?: string): Promise<AuthTokens> {
    try {
      const jwtSessionId = sessionId || crypto.randomBytes(16).toString('hex');
      const now = Math.floor(Date.now() / 1000);

      // Create access token payload
      const accessPayload: TokenPayload = {
        sub: user.id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        permissions: await this.getUserPermissions(user),
        sessionId: jwtSessionId,
        type: 'access',
        iat: now,
        exp: now + this.parseExpiresIn(this.config.jwt.expiresIn),
        ...(this.config.jwt.issuer && { iss: this.config.jwt.issuer }),
        ...(this.config.jwt.audience && { aud: this.config.jwt.audience }),
      };

      // Create refresh token payload
      const refreshPayload: RefreshTokenPayload = {
        sub: user.id.toString(),
        sessionId: jwtSessionId,
        type: 'refresh',
        iat: now,
        exp: now + this.parseExpiresIn(this.config.jwt.refreshExpiresIn),
        ...(this.config.jwt.issuer && { iss: this.config.jwt.issuer }),
        ...(this.config.jwt.audience && { aud: this.config.jwt.audience }),
      };

      // Sign tokens
      const accessToken = jwt.sign(accessPayload, this.config.jwt.secret, {
        algorithm: this.config.jwt.algorithm,
      });

      const refreshToken = jwt.sign(refreshPayload, this.config.jwt.secret, {
        algorithm: this.config.jwt.algorithm,
      });

      const tokens: AuthTokens = {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.parseExpiresIn(this.config.jwt.expiresIn),
        refreshExpiresIn: this.parseExpiresIn(this.config.jwt.refreshExpiresIn),
      };

      // Cache token info
      if (this.config.cache?.enabled) {
        await this.cacheTokenInfo(accessToken, user, jwtSessionId);
      }

      // Emit token creation event
      await this.events.emit(AuthEventType.TOKEN_REFRESH, {
        userId: user.id.toString(),
        sessionId: jwtSessionId,
        timestamp: new Date(),
      });

      this.logger.debug('JWT tokens generated successfully', {
        userId: user.id,
        sessionId: jwtSessionId,
      });

      return tokens;

    } catch (error) {
      this.logger.error('Error generating JWT tokens:', error);
      throw new Error('Failed to generate authentication tokens');
    }
  }

  /**
   * Validate access token
   */
  public async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(token)) {
        return {
          valid: false,
          error: {
            code: AuthErrorCode.TOKEN_REVOKED,
            message: 'Token has been revoked',
            timestamp: new Date(),
          },
        };
      }

      // Check cache first if enabled
      if (this.config.cache?.enabled) {
        const cached = await this.getCachedTokenInfo(token);
        if (cached) {
          return {
            valid: true,
            payload: cached,
          };
        }
      }

      // Verify and decode token
      const decoded = jwt.verify(token, this.config.jwt.secret, {
        algorithms: [this.config.jwt.algorithm],
        ...(this.config.jwt.issuer && { issuer: this.config.jwt.issuer }),
        ...(this.config.jwt.audience && { audience: this.config.jwt.audience }),
      }) as TokenPayload;

      // Validate token type
      if (decoded.type !== 'access') {
        return {
          valid: false,
          error: {
            code: AuthErrorCode.TOKEN_INVALID,
            message: 'Invalid token type',
            timestamp: new Date(),
          },
        };
      }

      // Validate user still exists and is active
      const user = await User.findById(decoded.sub);
      if (!user || user.status !== 'active') {
        return {
          valid: false,
          error: {
            code: AuthErrorCode.USER_NOT_FOUND,
            message: 'User not found or inactive',
            timestamp: new Date(),
          },
        };
      }

      return {
        valid: true,
        payload: decoded,
      };

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          expired: true,
          error: {
            code: AuthErrorCode.TOKEN_EXPIRED,
            message: 'Token has expired',
            timestamp: new Date(),
          },
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: {
            code: AuthErrorCode.TOKEN_INVALID,
            message: 'Invalid token',
            timestamp: new Date(),
          },
        };
      }

      this.logger.error('Token validation error:', error);
      return {
        valid: false,
        error: {
          code: AuthErrorCode.TOKEN_INVALID,
          message: 'Token validation failed',
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshToken(refreshToken: string): Promise<RefreshResult> {
    try {
      // Validate refresh token
      const decoded = jwt.verify(refreshToken, this.config.jwt.secret, {
        algorithms: [this.config.jwt.algorithm],
        ...(this.config.jwt.issuer && { issuer: this.config.jwt.issuer }),
        ...(this.config.jwt.audience && { audience: this.config.jwt.audience }),
      }) as RefreshTokenPayload;

      // Validate token type
      if (decoded.type !== 'refresh') {
        return {
          success: false,
          error: {
            code: AuthErrorCode.TOKEN_INVALID,
            message: 'Invalid refresh token type',
            timestamp: new Date(),
          },
        };
      }

      // Check if refresh token is blacklisted
      if (await this.isTokenBlacklisted(refreshToken)) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.TOKEN_REVOKED,
            message: 'Refresh token has been revoked',
            timestamp: new Date(),
          },
        };
      }

      // Get user
      const user = await User.findById(decoded.sub);
      if (!user || user.status !== 'active') {
        return {
          success: false,
          error: {
            code: AuthErrorCode.USER_NOT_FOUND,
            message: 'User not found or inactive',
            timestamp: new Date(),
          },
        };
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user, decoded.sessionId);

      // Blacklist old refresh token
      await this.blacklistToken(refreshToken);

      this.logger.debug('Tokens refreshed successfully', {
        userId: user._id,
        sessionId: decoded.sessionId,
      });

      return {
        success: true,
        tokens,
      };

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.TOKEN_EXPIRED,
            message: 'Refresh token has expired',
            timestamp: new Date(),
          },
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.TOKEN_INVALID,
            message: 'Invalid refresh token',
            timestamp: new Date(),
          },
        };
      }

      this.logger.error('Token refresh error:', error);
      return {
        success: false,
        error: {
          code: AuthErrorCode.TOKEN_INVALID,
          message: 'Token refresh failed',
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Decode token without verification (for inspection)
   */
  public decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      return decoded;
    } catch (error) {
      this.logger.error('Token decode error:', error);
      return null;
    }
  }

  /**
   * Revoke/blacklist a token
   */
  public async revokeToken(token: string, reason?: string): Promise<void> {
    try {
      await this.blacklistToken(token);

      // Remove from cache
      if (this.config.cache?.enabled) {
        await this.removeCachedTokenInfo(token);
      }

      // Emit revocation event
      const decoded = this.decodeToken(token);
      if (decoded) {
        await this.events.emit(AuthEventType.TOKEN_REVOKE, {
          userId: decoded.sub,
          sessionId: decoded.sessionId,
          reason,
          timestamp: new Date(),
        });
      }

      this.logger.debug('Token revoked', { reason });

    } catch (error) {
      this.logger.error('Token revocation error:', error);
      throw error;
    }
  }

  /**
   * Revoke all tokens for a user
   */
  public async revokeUserTokens(userId: string, sessionId?: string): Promise<void> {
    try {
      // In a production system, you'd want to track all active tokens
      // For now, we'll just add the user to a blacklist pattern
      const pattern = sessionId ? `${userId}:${sessionId}` : `${userId}:*`;
      
      if (this.config.cache?.enabled) {
        const cachePattern = `${this.config.cache.prefix}${pattern}`;
        await this.cache.deletePattern(cachePattern);
      }

      this.logger.debug('User tokens revoked', { userId, sessionId });

    } catch (error) {
      this.logger.error('User token revocation error:', error);
      throw error;
    }
  }

  /**
   * Get token expiration time
   */
  public getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      this.logger.error('Get token expiration error:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  public isTokenExpired(token: string): boolean {
    try {
      const expiration = this.getTokenExpiration(token);
      if (!expiration) {
        return true;
      }
      return expiration < new Date();
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token remaining time in seconds
   */
  public getTokenRemainingTime(token: string): number {
    try {
      const expiration = this.getTokenExpiration(token);
      if (!expiration) {
        return 0;
      }
      const remaining = Math.floor((expiration.getTime() - Date.now()) / 1000);
      return Math.max(0, remaining);
    } catch (error) {
      return 0;
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private async getUserPermissions(user: IUser): Promise<string[]> {
    // This would typically come from a permission manager
    // For now, return basic permissions based on role
    const basePermissions: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'],
      [UserRole.ADMIN]: ['admin.*', 'content.*', 'user.read', 'user.update'],
      [UserRole.EDITOR]: ['content.*', 'media.*'],
      [UserRole.AUTHOR]: ['content.create', 'content.update:own', 'media.upload'],
      [UserRole.CONTRIBUTOR]: ['content.create', 'content.update:own'],
      [UserRole.SUBSCRIBER]: ['content.read'],
    };

    return basePermissions[user.role] || ['content.read'];
  }

  private parseExpiresIn(expiresIn: string): number {
    // Parse time strings like '7d', '24h', '60m', '3600s'
    const timeRegex = /^(\d+)([dhms])$/;
    const match = expiresIn.match(timeRegex);
    
    if (!match) {
      // Assume seconds if no unit
      return parseInt(expiresIn, 10);
    }

    const value = parseInt(match[1] || '0', 10);
    const unit = match[2];

    switch (unit) {
      case 'd': return value * 24 * 60 * 60;
      case 'h': return value * 60 * 60;
      case 'm': return value * 60;
      case 's': return value;
      default: return value;
    }
  }

  private async cacheTokenInfo(token: string, user: IUser, sessionId: string): Promise<void> {
    try {
      const payload: TokenPayload = {
        sub: user.id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        permissions: await this.getUserPermissions(user),
        sessionId,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + this.parseExpiresIn(this.config.jwt.expiresIn),
      };

      const cacheKey = `${this.config.cache?.prefix}${this.getTokenHash(token)}`;
      await this.cache.set(cacheKey, payload, this.config.cache?.ttl);

    } catch (error) {
      this.logger.error('Error caching token info:', error);
    }
  }

  private async getCachedTokenInfo(token: string): Promise<TokenPayload | null> {
    try {
      const cacheKey = `${this.config.cache?.prefix}${this.getTokenHash(token)}`;
      return await this.cache.get<TokenPayload>(cacheKey);
    } catch (error) {
      this.logger.error('Error getting cached token info:', error);
      return null;
    }
  }

  private async removeCachedTokenInfo(token: string): Promise<void> {
    try {
      const cacheKey = `${this.config.cache?.prefix}${this.getTokenHash(token)}`;
      await this.cache.delete(cacheKey);
    } catch (error) {
      this.logger.error('Error removing cached token info:', error);
    }
  }

  private async blacklistToken(token: string): Promise<void> {
    const tokenHash = this.getTokenHash(token);
    this.blacklistedTokens.add(tokenHash);

    // Also store in cache/database for persistence across restarts
    if (this.config.cache?.enabled) {
      const cacheKey = `${this.config.cache.prefix}blacklist:${tokenHash}`;
      const expiration = this.getTokenRemainingTime(token);
      await this.cache.set(cacheKey, true, expiration);
    }
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.getTokenHash(token);
    
    // Check in-memory blacklist
    if (this.blacklistedTokens.has(tokenHash)) {
      return true;
    }

    // Check cache/database
    if (this.config.cache?.enabled) {
      const cacheKey = `${this.config.cache.prefix}blacklist:${tokenHash}`;
      const blacklisted = await this.cache.get<boolean>(cacheKey);
      return !!blacklisted;
    }

    return false;
  }

  private getTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}