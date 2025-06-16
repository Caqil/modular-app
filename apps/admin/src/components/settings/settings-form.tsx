'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  FormSection,
} from '@modular-app/ui';
import { Settings, Globe, Database, Mail, Image, Save, RefreshCw } from 'lucide-react';

// General settings validation schema
const settingsSchema = z.object({
  // Site Information
  siteName: z.string().min(1, 'Site name is required').max(100),
  siteDescription: z.string().max(500, 'Description must be less than 500 characters').optional(),
  siteUrl: z.string().url('Invalid URL format'),
  adminEmail: z.string().email('Invalid email address'),
  
  // Localization
  language: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja']),
  timezone: z.string().min(1, 'Timezone is required'),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY']),
  timeFormat: z.enum(['12', '24']),
  
  // Content Settings
  defaultPostStatus: z.enum(['draft', 'published', 'scheduled']),
  postsPerPage: z.number().min(1).max(100),
  enableComments: z.boolean(),
  enableCommentsModeration: z.boolean(),
  enablePingbacks: z.boolean(),
  
  // Media Settings
  enableImageOptimization: z.boolean(),
  maxUploadSize: z.number().min(1).max(100), // MB
  allowedFileTypes: z.array(z.string()),
  thumbnailWidth: z.number().min(50).max(1000),
  thumbnailHeight: z.number().min(50).max(1000),
  
  // SEO Settings
  enableSEO: z.boolean(),
  defaultMetaTitle: z.string().max(60).optional(),
  defaultMetaDescription: z.string().max(160).optional(),
  enableSitemaps: z.boolean(),
  enableRobotsTxt: z.boolean(),
  
  // Performance Settings
  enableCaching: z.boolean(),
  cacheExpiration: z.number().min(300).max(86400), // 5 minutes to 24 hours
  enableCompression: z.boolean(),
  enableMinification: z.boolean(),
  
  // Privacy & Legal
  privacyPolicyUrl: z.string().url().optional().or(z.literal('')),
  termsOfServiceUrl: z.string().url().optional().or(z.literal('')),
  cookieConsentEnabled: z.boolean(),
  dataRetentionDays: z.number().min(30).max(2555), // 30 days to 7 years
  
  // Email Settings
  fromName: z.string().min(1, 'From name is required'),
  fromEmail: z.string().email('Invalid from email'),
  enableEmailNotifications: z.boolean(),
  
  // Registration & Users
  allowRegistration: z.boolean(),
  defaultUserRole: z.enum(['subscriber', 'contributor', 'author', 'editor']),
  requireEmailVerification: z.boolean(),
  enableUserProfiles: z.boolean(),
  
  // Maintenance
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(500).optional(),
  enableMaintenanceBypass: z.boolean(),
});

type SettingsData = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
  initialData?: Partial<SettingsData>;
  onSave?: (data: SettingsData) => Promise<void>;
  onReset?: () => Promise<void>;
  isLoading?: boolean;
}

// Available languages
const languages = [
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

// Common timezones
const timezones = [
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

// Available file types
const fileTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'audio/mpeg',
];

export function SettingsForm({ 
  initialData,
  onSave,
  onReset,
  isLoading: externalLoading 
}: SettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty }
  } = useForm<SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      // Site defaults
      siteName: 'Modular App',
      siteDescription: 'A modern content management system',
      siteUrl: 'https://example.com',
      adminEmail: 'admin@example.com',
      
      // Localization defaults
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12',
      
      // Content defaults
      defaultPostStatus: 'draft',
      postsPerPage: 10,
      enableComments: true,
      enableCommentsModeration: false,
      enablePingbacks: false,
      
      // Media defaults
      enableImageOptimization: true,
      maxUploadSize: 10,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      thumbnailWidth: 150,
      thumbnailHeight: 150,
      
      // SEO defaults
      enableSEO: true,
      defaultMetaTitle: '',
      defaultMetaDescription: '',
      enableSitemaps: true,
      enableRobotsTxt: true,
      
      // Performance defaults
      enableCaching: true,
      cacheExpiration: 3600,
      enableCompression: true,
      enableMinification: true,
      
      // Privacy defaults
      privacyPolicyUrl: '',
      termsOfServiceUrl: '',
      cookieConsentEnabled: true,
      dataRetentionDays: 365,
      
      // Email defaults
      fromName: 'Modular App',
      fromEmail: 'noreply@example.com',
      enableEmailNotifications: true,
      
      // Registration defaults
      allowRegistration: false,
      defaultUserRole: 'subscriber',
      requireEmailVerification: true,
      enableUserProfiles: true,
      
      // Maintenance defaults
      maintenanceMode: false,
      maintenanceMessage: 'Site is under maintenance. Please check back later.',
      enableMaintenanceBypass: true,
      
      ...initialData,
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: SettingsData) => {
    setIsLoading(true);
    try {
      await onSave?.(data);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await onReset?.();
      reset();
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  const loading = isLoading || externalLoading;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Site Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Site Information
          </CardTitle>
          <CardDescription>
            Basic information about your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name *</Label>
                <Input
                  id="siteName"
                  placeholder="My Website"
                  {...register('siteName')}
                />
                {errors.siteName && (
                  <p className="text-sm text-red-600">{errors.siteName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  placeholder="A brief description of your website"
                  rows={3}
                  {...register('siteDescription')}
                />
                {errors.siteDescription && (
                  <p className="text-sm text-red-600">{errors.siteDescription.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteUrl">Site URL *</Label>
                  <Input
                    id="siteUrl"
                    placeholder="https://example.com"
                    {...register('siteUrl')}
                  />
                  {errors.siteUrl && (
                    <p className="text-sm text-red-600">{errors.siteUrl.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@example.com"
                    {...register('adminEmail')}
                  />
                  {errors.adminEmail && (
                    <p className="text-sm text-red-600">{errors.adminEmail.message}</p>
                  )}
                </div>
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card>
        <CardHeader>
          <CardTitle>Localization</CardTitle>
          <CardDescription>
            Configure language, timezone, and date/time formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={watchedValues.language}
                  onValueChange={(value) => setValue('language', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
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
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select
                  value={watchedValues.dateFormat}
                  onValueChange={(value) => setValue('dateFormat', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeFormat">Time Format</Label>
                <Select
                  value={watchedValues.timeFormat}
                  onValueChange={(value) => setValue('timeFormat', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 Hour</SelectItem>
                    <SelectItem value="24">24 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Content Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Content Settings
          </CardTitle>
          <CardDescription>
            Configure default content behavior and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultPostStatus">Default Post Status</Label>
                <Select
                  value={watchedValues.defaultPostStatus}
                  onValueChange={(value) => setValue('defaultPostStatus', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postsPerPage">Posts Per Page</Label>
                <Input
                  id="postsPerPage"
                  type="number"
                  {...register('postsPerPage', { valueAsNumber: true })}
                />
                {errors.postsPerPage && (
                  <p className="text-sm text-red-600">{errors.postsPerPage.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Comments</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow visitors to comment on posts
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableComments')}
                />
              </div>

              {watchedValues.enableComments && (
                <div className="pl-4 border-l-2 border-muted space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Comment Moderation</Label>
                      <p className="text-sm text-muted-foreground">
                        Require approval before comments appear
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      {...register('enableCommentsModeration')}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Pingbacks</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow automatic pingbacks and trackbacks
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enablePingbacks')}
                />
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Media Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Media Settings
          </CardTitle>
          <CardDescription>
            Configure file uploads and media handling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Image Optimization</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically optimize uploaded images
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableImageOptimization')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUploadSize">Max Upload Size (MB)</Label>
                <Input
                  id="maxUploadSize"
                  type="number"
                  {...register('maxUploadSize', { valueAsNumber: true })}
                />
                {errors.maxUploadSize && (
                  <p className="text-sm text-red-600">{errors.maxUploadSize.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="thumbnailWidth">Thumbnail Width (px)</Label>
                  <Input
                    id="thumbnailWidth"
                    type="number"
                    {...register('thumbnailWidth', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnailHeight">Thumbnail Height (px)</Label>
                  <Input
                    id="thumbnailHeight"
                    type="number"
                    {...register('thumbnailHeight', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Settings
          </CardTitle>
          <CardDescription>
            Configure email sender information and notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name *</Label>
                <Input
                  id="fromName"
                  placeholder="Your Website"
                  {...register('fromName')}
                />
                {errors.fromName && (
                  <p className="text-sm text-red-600">{errors.fromName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email *</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="noreply@example.com"
                  {...register('fromEmail')}
                />
                {errors.fromEmail && (
                  <p className="text-sm text-red-600">{errors.fromEmail.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications for system events
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                {...register('enableEmailNotifications')}
              />
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* User Registration */}
      <Card>
        <CardHeader>
          <CardTitle>User Registration</CardTitle>
          <CardDescription>
            Configure user registration and account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow User Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to register accounts
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('allowRegistration')}
                />
              </div>

              {watchedValues.allowRegistration && (
                <div className="pl-4 border-l-2 border-muted space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultUserRole">Default User Role</Label>
                    <Select
                      value={watchedValues.defaultUserRole}
                      onValueChange={(value) => setValue('defaultUserRole', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subscriber">Subscriber</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                        <SelectItem value="author">Author</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Email Verification</Label>
                      <p className="text-sm text-muted-foreground">
                        Users must verify their email before accessing the site
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      {...register('requireEmailVerification')}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable User Profiles</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to create and edit their profiles
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableUserProfiles')}
                />
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Mode</CardTitle>
          <CardDescription>
            Configure site maintenance and downtime settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Put the site in maintenance mode
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('maintenanceMode')}
                />
              </div>

              {watchedValues.maintenanceMode && (
                <div className="pl-4 border-l-2 border-muted space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                    <Textarea
                      id="maintenanceMessage"
                      placeholder="Site is under maintenance..."
                      rows={3}
                      {...register('maintenanceMessage')}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Admin Bypass</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow admins to access the site during maintenance
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      {...register('enableMaintenanceBypass')}
                    />
                  </div>
                </div>
              )}
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>

        <Button type="submit" disabled={loading || !isDirty}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}