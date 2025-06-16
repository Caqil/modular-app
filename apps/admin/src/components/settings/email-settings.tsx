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
import { Settings, TestTube, Mail, Shield, AlertCircle } from 'lucide-react';

// Email settings validation schema
const emailSettingsSchema = z.object({
  // SMTP Configuration
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.number().min(1).max(65535, 'Invalid port number'),
  smtpUsername: z.string().min(1, 'SMTP username is required'),
  smtpPassword: z.string().min(1, 'SMTP password is required'),
  smtpEncryption: z.enum(['none', 'tls', 'ssl']),
  
  // From Settings
  fromName: z.string().min(1, 'From name is required'),
  fromEmail: z.string().email('Invalid email address'),
  replyToEmail: z.string().email('Invalid reply-to email').optional().or(z.literal('')),
  
  // Email Features
  enableEmailNotifications: z.boolean(),
  enableEmailDigests: z.boolean(),
  enableEmailMarketing: z.boolean(),
  
  // Templates
  emailTemplate: z.enum(['default', 'modern', 'minimal', 'corporate']),
  emailFooter: z.string().max(500, 'Footer must be less than 500 characters').optional(),
  
  // Rate Limiting
  maxEmailsPerHour: z.number().min(1).max(10000),
  enableRateLimiting: z.boolean(),
  
  // Test Settings
  testEmail: z.string().email('Invalid test email address').optional().or(z.literal('')),
});

type EmailSettingsData = z.infer<typeof emailSettingsSchema>;

interface EmailSettingsProps {
  initialData?: Partial<EmailSettingsData>;
  onSave?: (data: EmailSettingsData) => Promise<void>;
  onTest?: (testEmail: string) => Promise<boolean>;
}

export function EmailSettings({ 
  initialData,
  onSave,
  onTest 
}: EmailSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm<EmailSettingsData>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      smtpHost: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      smtpEncryption: 'tls',
      fromName: 'Modular App',
      fromEmail: '',
      replyToEmail: '',
      enableEmailNotifications: true,
      enableEmailDigests: false,
      enableEmailMarketing: false,
      emailTemplate: 'default',
      emailFooter: '',
      maxEmailsPerHour: 100,
      enableRateLimiting: true,
      testEmail: '',
      ...initialData,
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: EmailSettingsData) => {
    setIsLoading(true);
    try {
      await onSave?.(data);
      setTestResult({ success: true, message: 'Email settings saved successfully!' });
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to save settings' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!watchedValues.testEmail) {
      setTestResult({ success: false, message: 'Please enter a test email address' });
      return;
    }

    setIsTesting(true);
    try {
      const success = await onTest?.(watchedValues.testEmail);
      setTestResult({
        success: success ?? false,
        message: success ? 'Test email sent successfully!' : 'Failed to send test email'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test email failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SMTP Configuration
          </CardTitle>
          <CardDescription>
            Configure your SMTP server settings for sending emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host *</Label>
                <Input
                  id="smtpHost"
                  placeholder="smtp.gmail.com"
                  {...register('smtpHost')}
                />
                {errors.smtpHost && (
                  <p className="text-sm text-red-600">{errors.smtpHost.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port *</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  placeholder="587"
                  {...register('smtpPort', { valueAsNumber: true })}
                />
                {errors.smtpPort && (
                  <p className="text-sm text-red-600">{errors.smtpPort.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpUsername">SMTP Username *</Label>
                <Input
                  id="smtpUsername"
                  placeholder="your-email@gmail.com"
                  {...register('smtpUsername')}
                />
                {errors.smtpUsername && (
                  <p className="text-sm text-red-600">{errors.smtpUsername.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">SMTP Password *</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('smtpPassword')}
                />
                {errors.smtpPassword && (
                  <p className="text-sm text-red-600">{errors.smtpPassword.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpEncryption">Encryption</Label>
              <Select
                value={watchedValues.smtpEncryption}
                onValueChange={(value) => setValue('smtpEncryption', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="ssl">SSL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Email Identity */}
      <Card>
        <CardHeader>
          <CardTitle>Email Identity</CardTitle>
          <CardDescription>
            Configure how emails appear to recipients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name *</Label>
                <Input
                  id="fromName"
                  placeholder="Modular App"
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

            <div className="space-y-2">
              <Label htmlFor="replyToEmail">Reply-To Email</Label>
              <Input
                id="replyToEmail"
                type="email"
                placeholder="support@example.com"
                {...register('replyToEmail')}
              />
              {errors.replyToEmail && (
                <p className="text-sm text-red-600">{errors.replyToEmail.message}</p>
              )}
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Email Features */}
      <Card>
        <CardHeader>
          <CardTitle>Email Features</CardTitle>
          <CardDescription>
            Enable or disable email functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send system notifications via email
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableEmailNotifications')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Digests</Label>
                  <p className="text-sm text-muted-foreground">
                    Send daily/weekly digest emails
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableEmailDigests')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Marketing</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow marketing emails to subscribers
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableEmailMarketing')}
                />
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Template & Styling */}
      <Card>
        <CardHeader>
          <CardTitle>Template & Styling</CardTitle>
          <CardDescription>
            Customize email appearance and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-2">
              <Label htmlFor="emailTemplate">Email Template</Label>
              <Select
                value={watchedValues.emailTemplate}
                onValueChange={(value) => setValue('emailTemplate', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailFooter">Email Footer</Label>
              <Textarea
                id="emailFooter"
                placeholder="© 2025 Your Company. All rights reserved."
                rows={3}
                {...register('emailFooter')}
              />
              {errors.emailFooter && (
                <p className="text-sm text-red-600">{errors.emailFooter.message}</p>
              )}
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Rate Limiting
          </CardTitle>
          <CardDescription>
            Prevent email abuse and protect your sending reputation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Rate Limiting</Label>
                <p className="text-sm text-muted-foreground">
                  Limit the number of emails sent per hour
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                {...register('enableRateLimiting')}
              />
            </div>

            {watchedValues.enableRateLimiting && (
              <div className="space-y-2">
                <Label htmlFor="maxEmailsPerHour">Max Emails per Hour</Label>
                <Input
                  id="maxEmailsPerHour"
                  type="number"
                  placeholder="100"
                  {...register('maxEmailsPerHour', { valueAsNumber: true })}
                />
                {errors.maxEmailsPerHour && (
                  <p className="text-sm text-red-600">{errors.maxEmailsPerHour.message}</p>
                )}
              </div>
            )}
          </FormSection>
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Email
          </CardTitle>
          <CardDescription>
            Send a test email to verify your configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="testEmail">Test Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="test@example.com"
                  {...register('testEmail')}
                />
                {errors.testEmail && (
                  <p className="text-sm text-red-600">{errors.testEmail.message}</p>
                )}
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={isTesting || !watchedValues.testEmail}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTesting ? 'Testing...' : 'Send Test'}
                </Button>
              </div>
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-md ${
                testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{testResult.message}</p>
              </div>
            )}
          </FormSection>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading || !isDirty}>
          <Settings className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Email Settings'}
        </Button>
      </div>
    </form>
  );
}