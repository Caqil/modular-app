// ===================================================================
// ADMIN USERS API - USER MANAGEMENT AND ADMINISTRATION
// ===================================================================

import { apiClient, type PaginatedResponse, type QueryOptions } from './api';
import type {
  UserProfile,
  UserRole,
  UserStatus,
  UserPreferences,
  UserMeta,
  UserStats,
  UserActivity,
  UserSession,
  UserQuery,
  RegisterData,
} from '../../../packages/core/src/types/user';
import type { Types } from 'mongoose';

// ===================================================================
// USER TYPES AND INTERFACES
// ===================================================================

export interface UserQueryOptions extends QueryOptions {
  role?: UserRole | UserRole[];
  status?: UserStatus | UserStatus[];
  dateFrom?: string;
  dateTo?: string;
  verified?: boolean;
  active?: boolean;
  include?: ('profile' | 'preferences' | 'meta' | 'stats' | 'activity')[];
}

export interface CreateUserData {
  email: string;
  username: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  status?: UserStatus;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
  meta?: Record<string, any>;
  sendWelcomeEmail?: boolean;
  requirePasswordChange?: boolean;
}

export interface UpdateUserData {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
  meta?: Record<string, any>;
  emailVerified?: boolean;
}

export interface UserBulkAction {
  ids: string[];
  action: 'activate' | 'deactivate' | 'suspend' | 'delete' | 'verify' | 'role_change';
  data?: {
    role?: UserRole;
    reason?: string;
    sendNotification?: boolean;
  };
}

export interface UserImportOptions {
  file: File;
  mapping: Record<string, string>;
  options: {
    skipHeader: boolean;
    defaultRole: UserRole;
    sendWelcomeEmail: boolean;
    requirePasswordChange: boolean;
    overwriteExisting: boolean;
  };
}

export interface UserExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  fields: string[];
  filters?: UserQueryOptions;
  includeProfile?: boolean;
  includePreferences?: boolean;
  includeMeta?: boolean;
}

export interface RolePermissions {
  role: UserRole;
  permissions: string[];
  description: string;
  canAssign: UserRole[];
  restrictions?: {
    maxUsers?: number;
    features?: string[];
    limitations?: Record<string, any>;
  };
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventPersonalInfo: boolean;
  historyCount: number;
  maxAge: number; // days
  complexity: 'low' | 'medium' | 'high' | 'very_high';
}

export interface LoginAttempt {
  id: string;
  userId?: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
  reason?: string;
  location?: {
    country: string;
    region: string;
    city: string;
  };
  blocked?: boolean;
}

export interface UserAuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  performedBy: string;
}

// ===================================================================
// USERS API
// ===================================================================

export class UsersAPI {
  /**
   * Get all users with pagination and filters
   */
  static async getUsers(options: UserQueryOptions = {}): Promise<PaginatedResponse<UserProfile>> {
    return apiClient.getPaginated<UserProfile>('/users', options);
  }

  /**
   * Get single user by ID
   */
  static async getUser(id: string, include?: string[]): Promise<UserProfile> {
    const params = include ? { include: include.join(',') } : {};
    return apiClient.get<UserProfile>(`/users/${id}`, params);
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<UserProfile> {
    return apiClient.get<UserProfile>(`/users/username/${username}`);
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<UserProfile> {
    return apiClient.get<UserProfile>(`/users/email/${encodeURIComponent(email)}`);
  }

  /**
   * Create new user
   */
  static async createUser(data: CreateUserData): Promise<{
    success: boolean;
    user: UserProfile;
    message: string;
    temporaryPassword?: string;
  }> {
    return apiClient.post('/users', data);
  }

  /**
   * Update existing user
   */
  static async updateUser(data: UpdateUserData): Promise<{
    success: boolean;
    user: UserProfile;
    message: string;
  }> {
    const { id, ...updateData } = data;
    return apiClient.put(`/users/${id}`, updateData);
  }

  /**
   * Delete user
   */
  static async deleteUser(id: string, options?: {
    transferContent?: string; // User ID to transfer content to
    deleteContent?: boolean;
    reason?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.delete(`/users/${id}`, { body: options });
  }

  /**
   * Activate user account
   */
  static async activateUser(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/users/${id}/activate`);
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(id: string, reason?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/users/${id}/deactivate`, { reason });
  }

  /**
   * Suspend user account
   */
  static async suspendUser(id: string, options: {
    reason: string;
    duration?: number; // days
    notifyUser?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    suspendedUntil?: Date;
  }> {
    return apiClient.post(`/users/${id}/suspend`, options);
  }

  /**
   * Unsuspend user account
   */
  static async unsuspendUser(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/users/${id}/unsuspend`);
  }

  /**
   * Reset user password
   */
  static async resetUserPassword(id: string, options?: {
    sendEmail?: boolean;
    temporaryPassword?: string;
    requireChange?: boolean;
  }): Promise<{
    success: boolean;
    temporaryPassword?: string;
    message: string;
  }> {
    return apiClient.post(`/users/${id}/reset-password`, options);
  }

  /**
   * Verify user email
   */
  static async verifyUserEmail(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/users/${id}/verify-email`);
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/users/${id}/send-verification`);
  }

  /**
   * Change user role
   */
  static async changeUserRole(id: string, role: UserRole, reason?: string): Promise<{
    success: boolean;
    message: string;
    previousRole: UserRole;
  }> {
    return apiClient.post(`/users/${id}/change-role`, { role, reason });
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<UserStats> {
    return apiClient.get<UserStats>('/users/stats');
  }

  /**
   * Get user activity
   */
  static async getUserActivity(id: string, options?: {
    limit?: number;
    since?: Date;
    type?: string;
  }): Promise<UserActivity[]> {
    return apiClient.get<UserActivity[]>(`/users/${id}/activity`, options);
  }

  /**
   * Get user sessions
   */
  static async getUserSessions(id: string): Promise<UserSession[]> {
    return apiClient.get<UserSession[]>(`/users/${id}/sessions`);
  }

  /**
   * Revoke user session
   */
  static async revokeUserSession(userId: string, sessionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.delete(`/users/${userId}/sessions/${sessionId}`);
  }

  /**
   * Revoke all user sessions
   */
  static async revokeAllUserSessions(id: string): Promise<{
    success: boolean;
    revokedCount: number;
  }> {
    return apiClient.post(`/users/${id}/revoke-sessions`);
  }

  /**
   * Bulk operations on users
   */
  static async bulkAction(action: UserBulkAction): Promise<{
    success: boolean;
    affected: number;
    results: Array<{
      id: string;
      success: boolean;
      message?: string;
      error?: string;
    }>;
  }> {
    return apiClient.post('/users/bulk', action);
  }

  /**
   * Search users
   */
  static async searchUsers(query: string, options?: {
    fields?: string[];
    limit?: number;
    includeInactive?: boolean;
  }): Promise<UserProfile[]> {
    return apiClient.get<UserProfile[]>('/users/search', { q: query, ...options });
  }

  /**
   * Import users from file
   */
  static async importUsers(options: UserImportOptions): Promise<{
    success: boolean;
    imported: number;
    updated: number;
    skipped: number;
    errors: Array<{
      row: number;
      error: string;
      data?: Record<string, any>;
    }>;
  }> {
    return apiClient.upload('/users/import', options.file, {
      mapping: JSON.stringify(options.mapping),
      options: JSON.stringify(options.options),
    });
  }

  /**
   * Export users
   */
  static async exportUsers(options: UserExportOptions): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', options.format);
    params.append('fields', options.fields.join(','));
    
    if (options.includeProfile) params.append('includeProfile', 'true');
    if (options.includePreferences) params.append('includePreferences', 'true');
    if (options.includeMeta) params.append('includeMeta', 'true');
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const filename = `users-export.${options.format}`;
    return apiClient.download(`/users/export?${params.toString()}`, filename);
  }

  /**
   * Get recently active users
   */
  static async getRecentlyActive(limit = 10): Promise<Array<{
    user: UserProfile;
    lastActivity: Date;
    activityType: string;
  }>> {
    return apiClient.get('/users/recently-active', { limit });
  }

  /**
   * Get new user registrations
   */
  static async getNewRegistrations(period = '7d'): Promise<Array<{
    user: UserProfile;
    registrationDate: Date;
    source: string;
    verified: boolean;
  }>> {
    return apiClient.get('/users/new-registrations', { period });
  }
}

// ===================================================================
// ROLES & PERMISSIONS API
// ===================================================================

export class RolesAPI {
  /**
   * Get all available roles
   */
  static async getRoles(): Promise<RolePermissions[]> {
    return apiClient.get<RolePermissions[]>('/roles');
  }

  /**
   * Get role details
   */
  static async getRole(role: UserRole): Promise<RolePermissions> {
    return apiClient.get<RolePermissions>(`/roles/${role}`);
  }

  /**
   * Update role permissions
   */
  static async updateRolePermissions(role: UserRole, permissions: string[]): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.put(`/roles/${role}/permissions`, { permissions });
  }

  /**
   * Get all available permissions
   */
  static async getPermissions(): Promise<Array<{
    name: string;
    description: string;
    category: string;
    dangerous?: boolean;
  }>> {
    return apiClient.get('/permissions');
  }

  /**
   * Check user permissions
   */
  static async checkUserPermissions(userId: string, permissions: string[]): Promise<Record<string, boolean>> {
    return apiClient.post(`/users/${userId}/check-permissions`, { permissions });
  }

  /**
   * Grant permission to user
   */
  static async grantUserPermission(userId: string, permission: string, expiresAt?: Date): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/users/${userId}/grant-permission`, { permission, expiresAt });
  }

  /**
   * Revoke permission from user
   */
  static async revokeUserPermission(userId: string, permission: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.delete(`/users/${userId}/permissions/${permission}`);
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole, options?: QueryOptions): Promise<PaginatedResponse<UserProfile>> {
    return apiClient.getPaginated<UserProfile>(`/roles/${role}/users`, options);
  }
}

// ===================================================================
// SECURITY & AUDIT API
// ===================================================================

export class SecurityAPI {
  /**
   * Get password policy
   */
  static async getPasswordPolicy(): Promise<PasswordPolicy> {
    return apiClient.get<PasswordPolicy>('/security/password-policy');
  }

  /**
   * Update password policy
   */
  static async updatePasswordPolicy(policy: Partial<PasswordPolicy>): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.put('/security/password-policy', policy);
  }

  /**
   * Get login attempts
   */
  static async getLoginAttempts(options?: {
    userId?: string;
    success?: boolean;
    limit?: number;
    since?: Date;
    ipAddress?: string;
  }): Promise<PaginatedResponse<LoginAttempt>> {
    return apiClient.getPaginated<LoginAttempt>('/security/login-attempts', options);
  }

  /**
   * Get failed login attempts
   */
  static async getFailedLogins(options?: {
    groupBy?: 'ip' | 'email' | 'user';
    limit?: number;
    since?: Date;
  }): Promise<Array<{
    key: string;
    attempts: number;
    lastAttempt: Date;
    blocked: boolean;
  }>> {
    return apiClient.get('/security/failed-logins', options);
  }

  /**
   * Block IP address
   */
  static async blockIP(ipAddress: string, reason: string, expiresAt?: Date): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post('/security/block-ip', { ipAddress, reason, expiresAt });
  }

  /**
   * Unblock IP address
   */
  static async unblockIP(ipAddress: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.delete(`/security/blocked-ips/${encodeURIComponent(ipAddress)}`);
  }

  /**
   * Get blocked IPs
   */
  static async getBlockedIPs(): Promise<Array<{
    ipAddress: string;
    reason: string;
    blockedAt: Date;
    expiresAt?: Date;
    attempts: number;
  }>> {
    return apiClient.get('/security/blocked-ips');
  }

  /**
   * Get audit logs
   */
  static async getAuditLogs(options?: {
    userId?: string;
    action?: string;
    resource?: string;
    limit?: number;
    since?: Date;
  }): Promise<PaginatedResponse<UserAuditLog>> {
    return apiClient.getPaginated<UserAuditLog>('/security/audit-logs', options);
  }

  /**
   * Get security metrics
   */
  static async getSecurityMetrics(period = '30d'): Promise<{
    loginAttempts: {
      total: number;
      successful: number;
      failed: number;
      blocked: number;
    };
    activeUsers: number;
    suspendedUsers: number;
    passwordResets: number;
    emailVerifications: number;
    twoFactorEnabled: number;
    riskyActivities: Array<{
      type: string;
      count: number;
      lastOccurrence: Date;
    }>;
    chartData: Array<{
      date: string;
      logins: number;
      failures: number;
      blocks: number;
    }>;
  }> {
    return apiClient.get('/security/metrics', { period });
  }

  /**
   * Run security scan
   */
  static async runSecurityScan(): Promise<{
    score: number;
    issues: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      category: string;
      description: string;
      recommendation: string;
      affected?: number;
    }>;
    recommendations: string[];
    lastScan: Date;
  }> {
    return apiClient.post('/security/scan');
  }

  /**
   * Get security recommendations
   */
  static async getSecurityRecommendations(): Promise<Array<{
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    action: string;
    implemented: boolean;
  }>> {
    return apiClient.get('/security/recommendations');
  }

  /**
   * Mark recommendation as implemented
   */
  static async markRecommendationImplemented(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/security/recommendations/${id}/implemented`);
  }
}

// ===================================================================
// USER UTILITIES
// ===================================================================

export const UserUtils = {
  /**
   * Format user display name
   */
  formatDisplayName(user: UserProfile): string {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.username || user.email;
  },

  /**
   * Get user initials
   */
  getUserInitials(user: UserProfile): string {
    const name = this.formatDisplayName(user);
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  },

  /**
   * Get user avatar URL
   */
  getAvatarUrl(user: UserProfile, size = 40): string {
    if (user.avatar) return user.avatar;
    
    // Generate Gravatar URL as fallback
    const email = user.email.toLowerCase().trim();
    const hash = btoa(email); // Simple hash for demo - use proper MD5 in production
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
  },

  /**
   * Check if user is online
   */
  isUserOnline(user: UserProfile): boolean {
    if (!user.lastSeenAt) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(user.lastSeenAt) > fiveMinutesAgo;
  },

  /**
   * Format user role
   */
  formatRole(role: UserRole): string {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  },

  /**
   * Get role color
   */
  getRoleColor(role: UserRole): string {
    const colors = {
      [UserRole.SUPER_ADMIN]: '#dc2626',
      [UserRole.ADMIN]: '#ea580c',
      [UserRole.EDITOR]: '#7c3aed',
      [UserRole.AUTHOR]: '#0891b2',
      [UserRole.CONTRIBUTOR]: '#059669',
      [UserRole.SUBSCRIBER]: '#6b7280',
    };

    return colors[role] || '#6b7280';
  },

  /**
   * Get status color
   */
  getStatusColor(status: UserStatus): string {
    const colors = {
      [UserStatus.ACTIVE]: '#10b981',
      [UserStatus.INACTIVE]: '#6b7280',
      [UserStatus.SUSPENDED]: '#f59e0b',
      [UserStatus.PENDING]: '#3b82f6',
    };

    return colors[status] || '#6b7280';
  },

  /**
   * Format last seen
   */
  formatLastSeen(lastSeenAt?: Date): string {
    if (!lastSeenAt) return 'Never';

    const now = new Date();
    const lastSeen = new Date(lastSeenAt);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return 'Online';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return lastSeen.toLocaleDateString();
  },

  /**
   * Check if user can be assigned role
   */
  canAssignRole(currentUserRole: UserRole, targetRole: UserRole): boolean {
    const hierarchy = {
      [UserRole.SUPER_ADMIN]: 6,
      [UserRole.ADMIN]: 5,
      [UserRole.EDITOR]: 4,
      [UserRole.AUTHOR]: 3,
      [UserRole.CONTRIBUTOR]: 2,
      [UserRole.SUBSCRIBER]: 1,
    };

    const currentLevel = hierarchy[currentUserRole] || 0;
    const targetLevel = hierarchy[targetRole] || 0;

    return currentLevel > targetLevel;
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate username format
   */
  isValidUsername(username: string): boolean {
    // Username should be 3-30 characters, alphanumeric with underscores/hyphens
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
  },

  /**
   * Generate temporary password
   */
  generateTemporaryPassword(length = 12): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  },

  /**
   * Check password strength
   */
  checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include at least one uppercase letter');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include at least one lowercase letter');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include at least one number');

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('Include at least one special character');

    return { score, feedback };
  },
};