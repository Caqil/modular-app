// ===================================================================
// ADMIN AUTH API - AUTHENTICATION AND AUTHORIZATION
// ===================================================================

import { apiClient, type APIClientError } from './api';
import type { 
  UserRole, 
  UserStatus,
  LoginCredentials,
  RegisterData,
  PasswordReset,
  PasswordResetRequest,
  EmailVerification,
  AuthToken,
  UserProfile,
  UserSession
} from '@modular-app/core/types/user';

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  permissions: string[];
  loading: boolean;
  error: string | null;
}

export interface LoginResponse {
  success: boolean;
  token: AuthToken;
  user: UserProfile;
  permissions: string[];
  redirectUrl?: string;
  requiresTwoFactor?: boolean;
  twoFactorMethods?: string[];
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordStrengthCheck {
  score: number;
  isValid: boolean;
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
  };
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  verified: boolean;
}

export interface SessionInfo {
  current: UserSession;
  all: UserSession[];
  activeCount: number;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  trustedDevices: number;
  recentLogins: Array<{
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    location?: string;
    success: boolean;
  }>;
  passwordLastChanged: Date;
  accountLocked: boolean;
  loginAttempts: number;
}

/**
 * Authentication API class
 */
export class AuthAPI {
  /**
   * Login user
   */
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        ...credentials,
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
      });

      // Set auth token in client
      if (response.token) {
        apiClient.setAuthToken(response.token.accessToken, response.token.refreshToken);
      }

      return response;
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local auth state
      apiClient.clearAuth();
    }
  }

  /**
   * Register new user
   */
  static async register(data: RegisterData): Promise<{
    success: boolean;
    message: string;
    requiresVerification: boolean;
    userId?: string;
  }> {
    try {
      return await apiClient.post('/auth/register', data);
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = apiClient.getAuthToken(); // This should get refresh token
      const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', {
        refreshToken,
      });

      // Update client token
      apiClient.setAuthToken(response.accessToken, response.refreshToken);

      return response;
    } catch (error) {
      // Clear auth on refresh failure
      apiClient.clearAuth();
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Verify current authentication status
   */
  static async verifyToken(): Promise<{
    valid: boolean;
    user?: UserProfile;
    permissions?: string[];
    expiresAt?: Date;
  }> {
    try {
      return await apiClient.get('/auth/verify');
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(data: PasswordResetRequest): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      return await apiClient.post('/auth/password/request-reset', data);
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(data: PasswordReset): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      return await apiClient.post('/auth/password/reset', {
        ...data,
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
      });
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      return await apiClient.post('/auth/password/change', data);
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Verify email address
   */
  static async verifyEmail(data: EmailVerification): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      return await apiClient.post('/auth/email/verify', data);
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Resend email verification
   */
  static async resendEmailVerification(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      return await apiClient.post('/auth/email/resend-verification', { email });
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Check password strength
   */
  static async checkPasswordStrength(password: string): Promise<PasswordStrengthCheck> {
    try {
      return await apiClient.post('/auth/password/check-strength', { password });
    } catch (error) {
      // Return basic check if API fails
      return this.basicPasswordCheck(password);
    }
  }

  /**
   * Setup two-factor authentication
   */
  static async setupTwoFactor(): Promise<TwoFactorSetup> {
    try {
      return await apiClient.post('/auth/2fa/setup');
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Verify two-factor setup
   */
  static async verifyTwoFactor(code: string): Promise<{
    success: boolean;
    backupCodes: string[];
  }> {
    try {
      return await apiClient.post('/auth/2fa/verify', { code });
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Disable two-factor authentication
   */
  static async disableTwoFactor(password: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      return await apiClient.post('/auth/2fa/disable', { password });
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Generate new backup codes
   */
  static async generateBackupCodes(): Promise<{
    codes: string[];
  }> {
    try {
      return await apiClient.post('/auth/2fa/backup-codes');
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Get current user sessions
   */
  static async getSessions(): Promise<SessionInfo> {
    try {
      return await apiClient.get('/auth/sessions');
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Revoke a specific session
   */
  static async revokeSession(sessionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      return await apiClient.delete(`/auth/sessions/${sessionId}`);
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Revoke all other sessions
   */
  static async revokeAllOtherSessions(): Promise<{
    success: boolean;
    revokedCount: number;
  }> {
    try {
      return await apiClient.post('/auth/sessions/revoke-others');
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Get user security settings
   */
  static async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      return await apiClient.get('/auth/security');
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Update security settings
   */
  static async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      return await apiClient.patch('/auth/security', settings);
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(permission: string): Promise<boolean> {
    try {
      const response = await apiClient.get(`/auth/permissions/check`, {
        permission,
      });
      return response.hasPermission;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user has specific role
   */
  static async hasRole(role: UserRole): Promise<boolean> {
    try {
      const response = await apiClient.get(`/auth/roles/check`, { role });
      return response.hasRole;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user permissions
   */
  static async getUserPermissions(): Promise<string[]> {
    try {
      const response = await apiClient.get('/auth/permissions');
      return response.permissions || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Initiate OAuth login
   */
  static async initiateOAuth(provider: string, redirectUrl?: string): Promise<{
    authUrl: string;
    state: string;
  }> {
    try {
      return await apiClient.post(`/auth/oauth/${provider}/initiate`, {
        redirectUrl,
      });
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Complete OAuth login
   */
  static async completeOAuth(
    provider: string,
    code: string,
    state: string
  ): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>(`/auth/oauth/${provider}/callback`, {
        code,
        state,
      });

      // Set auth token in client
      if (response.token) {
        apiClient.setAuthToken(response.token.accessToken, response.token.refreshToken);
      }

      return response;
    } catch (error) {
      throw this.handleAuthError(error as APIClientError);
    }
  }

  /**
   * Get client IP address
   */
  private static async getClientIP(): Promise<string | undefined> {
    try {
      // This is a simple approach - in production you might want to use a service
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Handle authentication errors
   */
  private static handleAuthError(error: APIClientError): Error {
    // Map common auth error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'INVALID_CREDENTIALS': 'Invalid email or password. Please try again.',
      'ACCOUNT_LOCKED': 'Your account has been temporarily locked due to too many failed login attempts.',
      'EMAIL_NOT_VERIFIED': 'Please verify your email address before logging in.',
      'TWO_FACTOR_REQUIRED': 'Two-factor authentication code is required.',
      'INVALID_TOKEN': 'Your session has expired. Please log in again.',
      'WEAK_PASSWORD': 'Password does not meet security requirements.',
      'EMAIL_ALREADY_EXISTS': 'An account with this email address already exists.',
      'USERNAME_TAKEN': 'This username is already taken.',
      'INVALID_RESET_TOKEN': 'Password reset link is invalid or has expired.',
      'RATE_LIMITED': 'Too many requests. Please wait before trying again.',
    };

    const message = errorMessages[error.code] || error.message || 'Authentication failed';
    
    const authError = new Error(message);
    authError.name = 'AuthError';
    (authError as any).code = error.code;
    (authError as any).statusCode = error.statusCode;
    (authError as any).details = error.details;
    
    return authError;
  }

  /**
   * Basic password strength check (fallback)
   */
  private static basicPasswordCheck(password: string): PasswordStrengthCheck {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const metRequirements = Object.values(requirements).filter(Boolean).length;
    const score = Math.min(metRequirements, 5);
    const isValid = score >= 4;

    const feedback: string[] = [];
    if (!requirements.minLength) feedback.push('Password must be at least 8 characters long');
    if (!requirements.hasUppercase) feedback.push('Include at least one uppercase letter');
    if (!requirements.hasLowercase) feedback.push('Include at least one lowercase letter');
    if (!requirements.hasNumbers) feedback.push('Include at least one number');
    if (!requirements.hasSpecialChars) feedback.push('Include at least one special character');

    return {
      score,
      isValid,
      feedback,
      requirements,
    };
  }
}

// Auth state management utilities
export const AuthUtils = {
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!apiClient.getAuthToken();
  },

  /**
   * Get stored auth token
   */
  getAuthToken(): string | null {
    return apiClient.getAuthToken();
  },

  /**
   * Clear authentication
   */
  clearAuth(): void {
    apiClient.clearAuth();
  },

  /**
   * Auto-refresh token before expiry
   */
  async autoRefreshToken(expiresAt: Date): Promise<boolean> {
    const now = new Date();
    const expiryTime = new Date(expiresAt);
    const timeUntilExpiry = expiryTime.getTime() - now.getTime();
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry

    if (timeUntilExpiry <= refreshThreshold) {
      try {
        await AuthAPI.refreshToken();
        return true;
      } catch (error) {
        console.error('Auto token refresh failed:', error);
        return false;
      }
    }

    return true;
  },

  /**
   * Format authentication error for display
   */
  formatAuthError(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return 'An unexpected error occurred. Please try again.';
  },
};