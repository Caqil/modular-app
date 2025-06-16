'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod/v4";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  FormSection,
} from '@modular-app/ui';
import { 
  User, 
  Mail, 
  Lock, 
  Shield, 
  Phone, 
  Calendar,
  Globe,
  MapPin,
  Eye,
  EyeOff,
  Save,
  X,
  Upload,
  AlertTriangle,
  Check
} from 'lucide-react';

// User form validation schema
const userFormSchema = z.object({
  // Basic Information
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .optional()
    .or(z.literal('')),
  confirmPassword: z.string().optional(),
  
  // Personal Information
  firstName: z.string().max(50, 'First name must be less than 50 characters').optional(),
  lastName: z.string().max(50, 'Last name must be less than 50 characters').optional(),
  displayName: z.string().max(100, 'Display name must be less than 100 characters').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  
  // Contact Information
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  birthDate: z.string().optional(),
  
  // Account Settings
  role: z.enum(['super_admin', 'admin', 'editor', 'author', 'contributor', 'subscriber']),
  status: z.enum(['active', 'inactive', 'suspended', 'pending', 'banned']),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  twoFactorEnabled: z.boolean(),
  
  // Preferences
  theme: z.enum(['light', 'dark', 'auto']),
  language: z.string(),
  timezone: z.string(),
  
  // Notifications
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  commentNotifications: z.boolean(),
  mentionNotifications: z.boolean(),
  
  // Privacy
  profileVisibility: z.enum(['public', 'private']),
  showEmail: z.boolean(),
  allowMessages: z.boolean(),
  
  // Additional
  avatar: z.string().optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
}).refine((data) => {
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserFormData = z.infer<typeof userFormSchema>;

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role: string;
  status: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  website?: string;
  location?: string;
  birthDate?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  preferences: {
    theme: string;
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      comments: boolean;
      mentions: boolean;
    };
    privacy: {
      profileVisibility: string;
      showEmail: boolean;
      allowMessages: boolean;
    };
  };
  metadata?: {
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface UserFormProps {
  user?: User;
  onSave?: (data: UserFormData) => Promise<void>;
  onCancel?: () => void;
  onAvatarUpload?: (file: File) => Promise<string>;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

// Role options
const ROLE_OPTIONS = [
  { value: 'subscriber', label: 'Subscriber', description: 'Basic access to view content' },
  { value: 'contributor', label: 'Contributor', description: 'Can create and edit own content' },
  { value: 'author', label: 'Author', description: 'Can create, edit and publish own content' },
  { value: 'editor', label: 'Editor', description: 'Can manage and publish all content' },
  { value: 'admin', label: 'Administrator', description: 'Administrative access with most permissions' },
  { value: 'super_admin', label: 'Super Administrator', description: 'Full system access' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  { value: 'suspended', label: 'Suspended', color: 'bg-red-100 text-red-800' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'banned', label: 'Banned', color: 'bg-red-100 text-red-800' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
];

const TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export function UserForm({
  user,
  onSave,
  onCancel,
  onAvatarUpload,
  isLoading = false,
  mode = 'create'
}: UserFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: user?.email || '',
      username: user?.username || '',
      password: '',
      confirmPassword: '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
      website: user?.website || '',
      location: user?.location || '',
      birthDate: user?.birthDate ? user.birthDate.toISOString().split('T')[0] : '',
      role: (user?.role as any) || 'subscriber',
      status: (user?.status as any) || 'active',
      emailVerified: user?.emailVerified || false,
      phoneVerified: user?.phoneVerified || false,
      twoFactorEnabled: user?.twoFactorEnabled || false,
      theme: (user?.preferences?.theme as any) || 'auto',
      language: user?.preferences?.language || 'en',
      timezone: user?.preferences?.timezone || 'UTC',
      emailNotifications: user?.preferences?.notifications?.email || true,
      pushNotifications: user?.preferences?.notifications?.push || false,
      commentNotifications: user?.preferences?.notifications?.comments || true,
      mentionNotifications: user?.preferences?.notifications?.mentions || true,
      profileVisibility: (user?.preferences?.privacy?.profileVisibility as any) || 'public',
      showEmail: user?.preferences?.privacy?.showEmail || false,
      allowMessages: user?.preferences?.privacy?.allowMessages || true,
      avatar: user?.avatar || '',
      notes: user?.metadata?.notes || '',
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: UserFormData) => {
    try {
      await onSave?.(data);
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onAvatarUpload) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('File must be an image');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const avatarUrl = await onAvatarUpload(file);
      setAvatarPreview(avatarUrl);
      setValue('avatar', avatarUrl);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const isRequiredFieldMissing = mode === 'create' && (!watchedValues.password || watchedValues.password.length < 8);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Essential user account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingAvatar}
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAvatarPreview(null);
                        setValue('avatar', '');
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="username"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>
            </div>

            {/* Password fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {mode === 'create' ? '*' : '(Leave blank to keep current)'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'create' ? 'Enter password' : 'Leave blank to keep current'}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  {...register('firstName')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register('lastName')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Public display name"
                {...register('displayName')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                rows={3}
                {...register('bio')}
              />
              {errors.bio && (
                <p className="text-sm text-red-600">{errors.bio.message}</p>
              )}
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>
            Optional contact details and personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  {...register('website')}
                />
                {errors.website && (
                  <p className="text-sm text-red-600">{errors.website.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="City, Country"
                  {...register('location')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Birth Date
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  {...register('birthDate')}
                />
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Settings
          </CardTitle>
          <CardDescription>
            Role, status, and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={watchedValues.role}
                  onValueChange={(value) => setValue('role', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={watchedValues.status}
                  onValueChange={(value) => setValue('status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={status.color}>{status.label}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Verified
                  </Label>
                  <p className="text-xs text-muted-foreground">Email address is verified</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('emailVerified')}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Verified
                  </Label>
                  <p className="text-xs text-muted-foreground">Phone number is verified</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('phoneVerified')}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <Label className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Two-Factor Auth
                  </Label>
                  <p className="text-xs text-muted-foreground">2FA is enabled</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('twoFactorEnabled')}
                />
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>User Preferences</CardTitle>
          <CardDescription>
            Language, timezone, and notification settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={watchedValues.theme}
                  onValueChange={(value) => setValue('theme', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={watchedValues.language}
                  onValueChange={(value) => setValue('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={watchedValues.timezone}
                  onValueChange={(value) => setValue('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Notifications</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    {...register('emailNotifications')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive browser push notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    {...register('pushNotifications')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <Label>Comment Notifications</Label>
                    <p className="text-xs text-muted-foreground">Notify about new comments</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    {...register('commentNotifications')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <Label>Mention Notifications</Label>
                    <p className="text-xs text-muted-foreground">Notify when mentioned</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    {...register('mentionNotifications')}
                  />
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Privacy Settings</Label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profileVisibility">Profile Visibility</Label>
                  <Select
                    value={watchedValues.profileVisibility}
                    onValueChange={(value) => setValue('profileVisibility', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <Label>Show Email Address</Label>
                      <p className="text-xs text-muted-foreground">Display email on profile</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      {...register('showEmail')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <Label>Allow Messages</Label>
                      <p className="text-xs text-muted-foreground">Allow users to send messages</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      {...register('allowMessages')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Notes</CardTitle>
          <CardDescription>
            Internal notes about this user (not visible to the user)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Internal notes about this user..."
              rows={4}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Warnings */}
      {isRequiredFieldMissing && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Password is required for new users and must be at least 8 characters long.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>

        <Button 
          type="submit" 
          disabled={isLoading || !isDirty || isRequiredFieldMissing}
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
        </Button>
      </div>
    </form>
  );
}