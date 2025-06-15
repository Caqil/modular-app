import type { Types } from 'mongoose';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  EDITOR = 'editor',
  AUTHOR = 'author',
  CONTRIBUTOR = 'contributor',
  SUBSCRIBER = 'subscriber',
  CUSTOMER = 'customer',
  MODERATOR = 'moderator',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  BANNED = 'banned',
}

export interface User {
  _id: Types.ObjectId;
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  bio?: string;
  website?: string;
  social?: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    github?: string;
  };
  preferences: UserPreferences;
  meta: UserMeta;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  loginCount: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
  };
  privacy: {
    showProfile: boolean;
    showEmail: boolean;
    showActivity: boolean;
    allowMessages: boolean;
  };
  editor: {
    visualEditor: boolean;
    syntaxHighlighting: boolean;
    autoSave: boolean;
    spellCheck: boolean;
  };
}

export interface UserMeta {
  [key: string]: any;
  lastLoginIp?: string;
  loginHistory?: Array<{
    timestamp: Date;
    ip: string;
    userAgent: string;
    success: boolean;
  }>;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
  subscription?: {
    plan: string;
    status: string;
    expiresAt?: Date;
  };
  billing?: {
    customerId?: string;
    paymentMethod?: string;
  };
}

export interface UserProfile {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  social?: User['social'];
  role: UserRole;
  joinedAt: Date;
  postCount?: number;
  followerCount?: number;
  followingCount?: number;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope?: string[];
  user: UserProfile;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  acceptTerms: boolean;
  newsletter?: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface EmailVerification {
  token: string;
}

export interface UserQuery {
  role?: UserRole | UserRole[];
  status?: UserStatus | UserStatus[];
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  page?: number;
  sort?: Record<string, 1 | -1>;
  include?: ('profile' | 'preferences' | 'meta' | 'stats')[];
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pending: number;
  byRole: Record<UserRole, number>;
  byMonth: Record<string, number>;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
}

export interface UserCapability {
  name: string;
  description: string;
  category: string;
}

export interface UserPermission {
  capability: string;
  resource?: string;
  resourceId?: Types.ObjectId;
  granted: boolean;
  grantedBy?: Types.ObjectId;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface UserActivity {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: Types.ObjectId;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface UserSession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  token: string;
  refreshToken?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsed: Date;
  isActive: boolean;
}