export {
  AuthManager,
  PermissionManager,
  JWTHandler,
  PasswordHandler,
} from '@modular-app/core';

// Import auth types
export type {
  AuthSession,
  AuthError,
  AuthErrorCode,
  TokenPayload,
  TwoFactorVerification,
} from '@modular-app/core';

// Admin-specific auth utilities
export const AdminAuth = {
  /**
   * Check if user has admin access
   */
  isAdmin(user: import('@modular-app/core').UserProfile): boolean {
    return user.role === 'admin' || user.role === 'super_admin';
  },

  /**
   * Check if user can access admin panel
   */
  canAccessAdmin(user: import('@modular-app/core').UserProfile): boolean {
    const adminRoles = ['admin', 'super_admin', 'editor'];
    return adminRoles.includes(user.role);
  },

  /**
   * Get user display name for admin UI
   */
  getUserDisplayName(user: import('@modular-app/core').UserProfile): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username;
  },

  /**
   * Get role badge color for UI
   */
  getRoleBadgeColor(role: string): string {
    const colors = {
      'super_admin': 'bg-red-100 text-red-800',
      'admin': 'bg-purple-100 text-purple-800',
      'editor': 'bg-blue-100 text-blue-800',
      'author': 'bg-green-100 text-green-800',
      'contributor': 'bg-yellow-100 text-yellow-800',
      'subscriber': 'bg-gray-100 text-gray-800',
    };
    return colors[role as keyof typeof colors] || colors.subscriber;
  },

  /**
   * Format last login time
   */
  formatLastLogin(lastLogin?: Date): string {
    if (!lastLogin) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastLogin.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    
    return lastLogin.toLocaleDateString();
  },
};
