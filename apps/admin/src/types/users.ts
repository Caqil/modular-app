export type {
  UserProfile,
  UserRole,
  UserStatus,
  UserMeta,
  UserPreferences,
  UserStats,
  UserCapability,
  UserPermission,
} from '@modular-app/core';

import { apiClient, type PaginatedResponse, type QueryOptions } from './api';

// Import enum for runtime usage
import { UserRole, UserStatus } from '@modular-app/core';

// Admin users API
export class UsersAPI {
  static async getUsers(options: QueryOptions = {}): Promise<PaginatedResponse<import('@modular-app/core').UserProfile>> {
    return apiClient.getPaginated('/users', options);
  }

  static async getUser(id: string): Promise<import('@modular-app/core').UserProfile> {
    return apiClient.get(`/users/${id}`);
  }

  static async createUser(data: Partial<import('@modular-app/core').UserProfile>): Promise<import('@modular-app/core').UserProfile> {
    return apiClient.post('/users', data);
  }

  static async updateUser(id: string, data: Partial<import('@modular-app/core').UserProfile>): Promise<import('@modular-app/core').UserProfile> {
    return apiClient.put(`/users/${id}`, data);
  }

  static async deleteUser(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/users/${id}`);
  }

  static async getUserStats(): Promise<import('@modular-app/core').UserStats> {
    return apiClient.get('/users/stats');
  }

  static async searchUsers(query: string): Promise<import('@modular-app/core').UserProfile[]> {
    return apiClient.get('/users/search', { q: query });
  }
}

// User utilities
export const UserUtils = {
  getRoleColor(role: UserRole): string {
    const colors: Partial<Record<UserRole, string>> = {
      [UserRole.ADMIN]: '#dc2626',
      [UserRole.EDITOR]: '#7c3aed', 
      [UserRole.AUTHOR]: '#2563eb',
      [UserRole.CONTRIBUTOR]: '#059669',
      [UserRole.SUBSCRIBER]: '#6b7280',
    };
    return colors[role] || '#6b7280';
  },

  getStatusColor(status: UserStatus): string {
    const colors: Partial<Record<UserStatus, string>> = {
      [UserStatus.ACTIVE]: '#10b981',
      [UserStatus.INACTIVE]: '#6b7280',
      [UserStatus.SUSPENDED]: '#ef4444',
      [UserStatus.PENDING]: '#f59e0b',
    };
    return colors[status] || '#6b7280';
  },

  getFullName(user: import('@modular-app/core').UserProfile): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username;
  },
};