export type {
  UserProfile,
  UserRole,
  UserStatus,
  LoginCredentials,
  RegisterData,
  PasswordReset,
  EmailVerification,
  AuthToken,
  AuthSession,
  AuthError,
  TokenPayload,
  TwoFactorVerification,
} from '@modular-app/core';

import { apiClient } from './api';

// Admin auth API
export class AuthAPI {
  static async login(credentials: import('@modular-app/core').LoginCredentials): Promise<{
    success: boolean;
    token: import('@modular-app/core').AuthToken;
    user: import('@modular-app/core').UserProfile;
  }> {
    return apiClient.post('/auth/login', credentials);
  }

  static async logout(): Promise<{ success: boolean }> {
    return apiClient.post('/auth/logout');
  }

  static async me(): Promise<import('@modular-app/core').UserProfile> {
    return apiClient.get('/auth/me');
  }

  static async refreshToken(): Promise<import('@modular-app/core').AuthToken> {
    return apiClient.post('/auth/refresh');
  }

  static async requestPasswordReset(data: import('@modular-app/core').PasswordResetRequest): Promise<{ success: boolean }> {
    return apiClient.post('/auth/password-reset', data);
  }

  static async resetPassword(data: import('@modular-app/core').PasswordReset): Promise<{ success: boolean }> {
    return apiClient.post('/auth/password-reset/confirm', data);
  }
}