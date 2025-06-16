
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { CacheManager } from '../cache/cache-manager';
import { ConfigManager } from '../config/config-manager';
import { User, type IUser } from '../database/models';
import { UserRole, UserStatus } from '../types/user';
import {
  PermissionRule,
  PermissionCondition,
  RolePermissions,
  PermissionContext,
  PermissionResult,
  AuthEventType,
} from './auth-types';

export interface PermissionManagerConfig {
  cacheEnabled: boolean;
  cacheTTL: number;
  strictMode: boolean; // Deny by default if no explicit permission
  auditEnabled: boolean;
  inheritanceEnabled: boolean;
}

export interface Permission {
  name: string;
  description: string;
  category: string;
  resource?: string;
  actions?: string[];
}

export interface Capability {
  name: string;
  description: string;
  permissions: string[];
  category: string;
  requiresAll?: boolean; // true = all permissions required, false = any permission required
}

export interface ResourcePermission {
  resource: string;
  resourceId?: string;
  permissions: string[];
  conditions?: PermissionCondition[];
  expiresAt?: Date;
  grantedBy?: string;
  grantedAt: Date;
}

/**
 * Permission Manager
 * Handles role-based access control, permissions, and capabilities
 */
export class PermissionManager {
  private static instance: PermissionManager;
  private logger = new Logger('PermissionManager');
  private events = EventManager.getInstance();
  private cache = CacheManager.getInstance();
  private config = ConfigManager.getInstance();
  private initialized = false;
  private permissions = new Map<string, Permission>();
  private capabilities = new Map<string, Capability>();
  private rolePermissions = new Map<UserRole, RolePermissions>();
  private managerConfig: PermissionManagerConfig;

  private readonly defaultConfig: PermissionManagerConfig = {
    cacheEnabled: true,
    cacheTTL: 300, // 5 minutes
    strictMode: true,
    auditEnabled: true,
    inheritanceEnabled: true,
  };

  private constructor() {
    this.managerConfig = this.defaultConfig;
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Initialize permission manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Permission manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing permission manager...');

      // Load configuration
      const config = await this.config.get<PermissionManagerConfig>('permissions');
      this.managerConfig = { ...this.defaultConfig, ...config };

      // Setup default permissions and roles
      await this.setupDefaultPermissions();
      await this.setupDefaultRoles();

      this.initialized = true;
      this.logger.info('Permission manager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize permission manager:', error);
      throw error;
    }
  }

  /**
   * Check if user has permission
   */
  public async hasPermission(
    user: IUser | string,
    permission: string,
    context?: Partial<PermissionContext>
  ): Promise<PermissionResult> {
    try {
      const userId = typeof user === 'string' ? user : user.id.toString();
      const userObj = typeof user === 'string' ? await User.findById(user) : user;

      if (!userObj) {
        return {
          granted: false,
          reason: 'User not found',
        };
      }

      // Check cache first
      if (this.managerConfig.cacheEnabled) {
        const cacheKey = `permission:${userId}:${permission}:${this.hashContext(context)}`;
        const cached = await this.cache.get<PermissionResult>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const result = await this.evaluatePermission(userObj, permission, context);

      // Cache result
      if (this.managerConfig.cacheEnabled) {
        const cacheKey = `permission:${userId}:${permission}:${this.hashContext(context)}`;
        await this.cache.set(cacheKey, result, this.managerConfig.cacheTTL);
      }

      // Audit if enabled
      if (this.managerConfig.auditEnabled) {
        await this.auditPermissionCheck(userObj, permission, result, context);
      }

      return result;

    } catch (error) {
      this.logger.error('Permission check error:', error);
      return {
        granted: false,
        reason: 'Permission check failed',
      };
    }
  }

  /**
   * Check if user has capability
   */
  public async hasCapability(
    user: IUser | string,
    capability: string,
    context?: Partial<PermissionContext>
  ): Promise<PermissionResult> {
    try {
      const cap = this.capabilities.get(capability);
      if (!cap) {
        return {
          granted: false,
          reason: `Capability '${capability}' not found`,
        };
      }

      const userObj = typeof user === 'string' ? await User.findById(user) : user;
      if (!userObj) {
        return {
          granted: false,
          reason: 'User not found',
        };
      }

      // Check all required permissions
      const permissionResults = await Promise.all(
        cap.permissions.map(permission => 
          this.hasPermission(userObj, permission, context)
        )
      );

      const granted = cap.requiresAll 
        ? permissionResults.every(result => result.granted)
        : permissionResults.some(result => result.granted);

      return {
        granted,
        reason: granted 
          ? 'Capability granted' 
          : `Missing required permissions: ${cap.permissions.filter((_, i) => !(permissionResults[i]?.granted)).join(', ')}`,
      };

    } catch (error) {
      this.logger.error('Capability check error:', error);
      return {
        granted: false,
        reason: 'Capability check failed',
      };
    }
  }

  /**
   * Get all permissions for user
   */
  public async getUserPermissions(userId: string): Promise<string[]> {
    try {
      // Check cache first
      if (this.managerConfig.cacheEnabled) {
        const cacheKey = `user_permissions:${userId}`;
        const cached = await this.cache.get<string[]>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const user = await User.findById(userId);
      if (!user) {
        return [];
      }

      const rolePerms = this.rolePermissions.get(user.role as UserRole);
      if (!rolePerms) {
        return [];
      }

      let permissions = [...rolePerms.permissions];

      // Add inherited permissions if enabled
      if (this.managerConfig.inheritanceEnabled && rolePerms.inherits) {
        for (const inheritedRole of rolePerms.inherits) {
          const inheritedPerms = this.rolePermissions.get(inheritedRole);
          if (inheritedPerms) {
            permissions = [...permissions, ...inheritedPerms.permissions];
          }
        }
      }

      // Remove duplicates
      permissions = [...new Set(permissions)];

      // Cache result
      if (this.managerConfig.cacheEnabled) {
        const cacheKey = `user_permissions:${userId}`;
        await this.cache.set(cacheKey, permissions, this.managerConfig.cacheTTL);
      }

      return permissions;

    } catch (error) {
      this.logger.error('Get user permissions error:', error);
      return [];
    }
  }

  /**
   * Grant permission to user
   */
  public async grantPermission(
    userId: string,
    permission: string,
    grantedBy: string,
    context?: Partial<PermissionContext>
  ): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Add to user's custom permissions
      if (!user.customPermissions) {
        user.customPermissions = [];
      }

      const exists = user.customPermissions.some(p => p.permission === permission);
      if (!exists) {
        user.customPermissions.push({
          permission,
          grantedBy,
          grantedAt: new Date(),
          context: context as Record<string, any>,
        });

        await user.save();
      }

      // Clear cache
      await this.clearUserPermissionCache(userId);

      // Emit event
      await this.events.emit(AuthEventType.SECURITY_ALERT, {
        userId,
        action: 'permission_granted',
        permission,
        grantedBy,
        timestamp: new Date(),
      });

      this.logger.info('Permission granted', { userId, permission, grantedBy });

    } catch (error) {
      this.logger.error('Grant permission error:', error);
      throw error;
    }
  }

  /**
   * Revoke permission from user
   */
  public async revokePermission(
    userId: string,
    permission: string,
    revokedBy: string
  ): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.customPermissions) {
        user.customPermissions = user.customPermissions.filter(
          p => p.permission !== permission
        );
        await user.save();
      }

      // Clear cache
      await this.clearUserPermissionCache(userId);

      // Emit event
      await this.events.emit(AuthEventType.SECURITY_ALERT, {
        userId,
        action: 'permission_revoked',
        permission,
        revokedBy,
        timestamp: new Date(),
      });

      this.logger.info('Permission revoked', { userId, permission, revokedBy });

    } catch (error) {
      this.logger.error('Revoke permission error:', error);
      throw error;
    }
  }

  /**
   * Register new permission
   */
  public registerPermission(permission: Permission): void {
    this.permissions.set(permission.name, permission);
    this.logger.debug('Permission registered', { name: permission.name });
  }

  /**
   * Register new capability
   */
  public registerCapability(capability: Capability): void {
    this.capabilities.set(capability.name, capability);
    this.logger.debug('Capability registered', { name: capability.name });
  }

  /**
   * Get all registered permissions
   */
  public getPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get all registered capabilities
   */
  public getCapabilities(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get permissions for role
   */
  public getRolePermissions(role: UserRole): string[] {
    const rolePerms = this.rolePermissions.get(role);
    return rolePerms ? rolePerms.permissions : [];
  }

  /**
   * Clear all permission caches for user
   */
  public async clearUserPermissionCache(userId: string): Promise<void> {
    if (!this.managerConfig.cacheEnabled) {
      return;
    }

    try {
      await this.cache.deletePattern(`permission:${userId}:*`);
      await this.cache.deletePattern(`user_permissions:${userId}`);
      this.logger.debug('User permission cache cleared', { userId });
    } catch (error) {
      this.logger.error('Clear user permission cache error:', error);
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private async evaluatePermission(
    user: IUser,
    permission: string,
    context?: Partial<PermissionContext>
  ): Promise<PermissionResult> {
    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      return {
        granted: false,
        reason: 'User account is not active',
      };
    }

    // Super admin has all permissions
    if (user.role === UserRole.SUPER_ADMIN) {
      return {
        granted: true,
        reason: 'Super admin access',
      };
    }

    // Check wildcard permission
    if (permission === '*') {
      return {
        granted: (user.role as UserRole) === UserRole.SUPER_ADMIN,
        reason: (user.role as UserRole) === UserRole.SUPER_ADMIN ? 'Super admin access' : 'Wildcard permission denied',
      };
    }

    // Get user permissions
    const userPermissions = await this.getUserPermissions(user.id.toString());

    // Check for exact match
    if (userPermissions.includes(permission)) {
      return {
        granted: true,
        reason: 'Direct permission match',
      };
    }

    // Check for wildcard matches
    for (const userPerm of userPermissions) {
      if (userPerm.endsWith('*')) {
        const prefix = userPerm.slice(0, -1);
        if (permission.startsWith(prefix)) {
          return {
            granted: true,
            reason: `Wildcard permission match: ${userPerm}`,
          };
        }
      }
    }

    // Check custom user permissions with conditions
    if (user.customPermissions) {
      for (const customPerm of user.customPermissions) {
        if (customPerm.permission === permission) {
          // Check if permission has expired
          if (customPerm.expiresAt && customPerm.expiresAt < new Date()) {
            continue;
          }

          // Check conditions if any
            if (Array.isArray(customPerm.conditions)) {
          const conditionsMet = this.evaluateConditions(customPerm.conditions, context);
          if (conditionsMet) {
              return {
                granted: true,
                reason: 'Custom permission with conditions met',
              };
            }
          } else {
            return {
              granted: true,
              reason: 'Custom permission granted',
            };
          }
        }
      }
    }

    // Check role-based rules
    const rolePerms = this.rolePermissions.get(user.role as UserRole);
    if (rolePerms && rolePerms.rules) {
      for (const rule of rolePerms.rules) {
        if (this.matchesRule(rule, permission, context)) {
          const conditionsMet = rule.conditions 
            ? this.evaluateConditions(rule.conditions, context)
            : true;

          if (conditionsMet) {
            return {
              granted: rule.effect === 'allow',
              reason: `Role rule: ${rule.effect}`,
              rule,
            };
          }
        }
      }
    }

    // Default behavior based on strict mode
    if (this.managerConfig.strictMode) {
      return {
        granted: false,
        reason: 'No matching permission found (strict mode)',
      };
    } else {
      return {
        granted: true,
        reason: 'Default allow (non-strict mode)',
      };
    }
  }

  private evaluateConditions(
    conditions: PermissionCondition[],
    context?: Partial<PermissionContext>
  ): boolean {
    if (!context) {
      return false;
    }

    return conditions.every(condition => {
      const contextValue = (context as any)[condition.field];
      return this.evaluateCondition(condition, contextValue);
    });
  }

  private evaluateCondition(condition: PermissionCondition, value: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'gt':
        return value > condition.value;
      case 'gte':
        return value >= condition.value;
      case 'lt':
        return value < condition.value;
      case 'lte':
        return value <= condition.value;
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value);
      case 'regex':
        return typeof value === 'string' && new RegExp(condition.value).test(value);
      default:
        return false;
    }
  }

  private matchesRule(
    rule: PermissionRule,
    permission: string,
    context?: Partial<PermissionContext>
  ): boolean {
    // Simple wildcard matching for now
    if (rule.resource === '*' || rule.action === '*') {
      return true;
    }

    const [resource, action] = permission.split(':');
    return rule.resource === resource && rule.action === action;
  }

  private hashContext(context?: Partial<PermissionContext>): string {
    if (!context) {
      return 'none';
    }
    return Buffer.from(JSON.stringify(context)).toString('base64');
  }

  private async auditPermissionCheck(
    user: IUser,
    permission: string,
    result: PermissionResult,
    context?: Partial<PermissionContext>
  ): Promise<void> {
    try {
      await this.events.emit('permission:check', {
        userId: user.id.toString(),
        permission,
        granted: result.granted,
        reason: result.reason,
        context,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Permission audit error:', error);
    }
  }

  private async setupDefaultPermissions(): Promise<void> {
    const permissions: Permission[] = [
      // Content permissions
      { name: 'content:read', description: 'Read content', category: 'content' },
      { name: 'content:create', description: 'Create content', category: 'content' },
      { name: 'content:update', description: 'Update content', category: 'content' },
      { name: 'content:delete', description: 'Delete content', category: 'content' },
      { name: 'content:publish', description: 'Publish content', category: 'content' },

      // User permissions
      { name: 'user:read', description: 'Read user information', category: 'user' },
      { name: 'user:create', description: 'Create users', category: 'user' },
      { name: 'user:update', description: 'Update users', category: 'user' },
      { name: 'user:delete', description: 'Delete users', category: 'user' },

      // Admin permissions
      { name: 'admin:access', description: 'Access admin panel', category: 'admin' },
      { name: 'admin:settings', description: 'Manage settings', category: 'admin' },
      { name: 'admin:plugins', description: 'Manage plugins', category: 'admin' },
      { name: 'admin:themes', description: 'Manage themes', category: 'admin' },

      // Media permissions
      { name: 'media:read', description: 'View media', category: 'media' },
      { name: 'media:upload', description: 'Upload media', category: 'media' },
      { name: 'media:delete', description: 'Delete media', category: 'media' },
    ];

    for (const permission of permissions) {
      this.registerPermission(permission);
    }
  }

  private async setupDefaultRoles(): Promise<void> {
    const roles: RolePermissions[] = [
      {
        role: UserRole.SUPER_ADMIN,
        permissions: ['*'],
        rules: [],
      },
      {
        role: UserRole.ADMIN,
        permissions: [
          'admin:*',
          'content:*',
          'user:read',
          'user:update',
          'media:*',
        ],
        rules: [],
      },
      {
        role: UserRole.EDITOR,
        permissions: [
          'content:*',
          'media:*',
          'user:read',
        ],
        rules: [],
      },
      {
        role: UserRole.AUTHOR,
        permissions: [
          'content:create',
          'content:update:own',
          'content:read',
          'media:upload',
          'media:read',
        ],
        rules: [],
      },
      {
        role: UserRole.CONTRIBUTOR,
        permissions: [
          'content:create',
          'content:update:own',
          'content:read',
        ],
        rules: [],
      },
      {
        role: UserRole.SUBSCRIBER,
        permissions: [
          'content:read',
        ],
        rules: [],
      },
    ];

    for (const role of roles) {
      this.rolePermissions.set(role.role, role);
    }
  }
}