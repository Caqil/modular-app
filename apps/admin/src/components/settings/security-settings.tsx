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
  Badge,
  FormSection,
} from '@modular-app/ui';
import { 
  Shield, 
  Lock, 
  Key, 
  AlertTriangle, 
  Eye, 
  FileText, 
  Settings,
  RefreshCw,
  Clock,
  Ban
} from 'lucide-react';

// Security settings validation schema
const securitySettingsSchema = z.object({
  // Authentication & Passwords
  enableTwoFactor: z.boolean(),
  requireStrongPasswords: z.boolean(),
  minPasswordLength: z.number().min(6).max(32),
  passwordExpiryDays: z.number().min(0).max(365),
  maxLoginAttempts: z.number().min(1).max(20),
  lockoutDuration: z.number().min(1).max(1440), // minutes
  
  // Session Management
  sessionTimeout: z.number().min(5).max(1440), // minutes
  maxConcurrentSessions: z.number().min(1).max(20),
  requireSecureCookies: z.boolean(),
  
  // Rate Limiting
  enableRateLimiting: z.boolean(),
  globalRateLimit: z.number().min(10).max(10000), // requests per hour
  apiRateLimit: z.number().min(10).max(5000),
  loginRateLimit: z.number().min(1).max(100),
  
  // File Upload Security
  enableFileScanning: z.boolean(),
  maxFileSize: z.number().min(1).max(100), // MB
  allowedFileTypes: z.array(z.string()),
  scanForMalware: z.boolean(),
  
  // Content Security
  enableCSP: z.boolean(),
  cspDirectives: z.string().optional(),
  enableXSSProtection: z.boolean(),
  enableClickjackingProtection: z.boolean(),
  
  // IP Security
  enableIPWhitelist: z.boolean(),
  whitelistedIPs: z.array(z.string()),
  enableIPBlacklist: z.boolean(),
  blacklistedIPs: z.array(z.string()),
  
  // Monitoring & Logging
  enableSecurityLogging: z.boolean(),
  logRetentionDays: z.number().min(1).max(365),
  enableAlerts: z.boolean(),
  alertEmail: z.string().email().optional().or(z.literal('')),
  
  // SSL/TLS
  enforceHTTPS: z.boolean(),
  enableHSTS: z.boolean(),
  hstsMaxAge: z.number().min(300).max(31536000), // seconds
  
  // API Security
  requireAPIAuthentication: z.boolean(),
  enableAPIVersioning: z.boolean(),
  apiKeyExpiration: z.number().min(1).max(365), // days
});

type SecuritySettingsData = z.infer<typeof securitySettingsSchema>;

interface SecurityThreat {
  id: string;
  type: 'malware' | 'intrusion' | 'bruteforce' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  status: 'active' | 'resolved' | 'investigating';
}

interface SecurityMetrics {
  totalThreats: number;
  blockedAttempts: number;
  failedLogins: number;
  suspiciousActivity: number;
  recentThreats: SecurityThreat[];
}

interface SecuritySettingsProps {
  initialData?: Partial<SecuritySettingsData>;
  metrics?: SecurityMetrics;
  onSave?: (data: SecuritySettingsData) => Promise<void>;
  onGenerateAPIKey?: () => Promise<string>;
  onTestSecurity?: () => Promise<{ passed: number; total: number; issues: string[] }>;
}

export function SecuritySettings({ 
  initialData,
  metrics,
  onSave,
  onGenerateAPIKey,
  onTestSecurity 
}: SecuritySettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{ passed: number; total: number; issues: string[] } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm<SecuritySettingsData>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      // Authentication defaults
      enableTwoFactor: false,
      requireStrongPasswords: true,
      minPasswordLength: 8,
      passwordExpiryDays: 90,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      
      // Session defaults
      sessionTimeout: 60,
      maxConcurrentSessions: 3,
      requireSecureCookies: true,
      
      // Rate limiting defaults
      enableRateLimiting: true,
      globalRateLimit: 1000,
      apiRateLimit: 100,
      loginRateLimit: 10,
      
      // File upload defaults
      enableFileScanning: true,
      maxFileSize: 10,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
      scanForMalware: true,
      
      // Content security defaults
      enableCSP: true,
      cspDirectives: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      enableXSSProtection: true,
      enableClickjackingProtection: true,
      
      // IP security defaults
      enableIPWhitelist: false,
      whitelistedIPs: [],
      enableIPBlacklist: false,
      blacklistedIPs: [],
      
      // Monitoring defaults
      enableSecurityLogging: true,
      logRetentionDays: 30,
      enableAlerts: true,
      alertEmail: '',
      
      // SSL defaults
      enforceHTTPS: true,
      enableHSTS: true,
      hstsMaxAge: 31536000,
      
      // API security defaults
      requireAPIAuthentication: true,
      enableAPIVersioning: true,
      apiKeyExpiration: 365,
      
      ...initialData,
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: SecuritySettingsData) => {
    setIsLoading(true);
    try {
      await onSave?.(data);
    } catch (error) {
      console.error('Failed to save security settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityTest = async () => {
    setIsTesting(true);
    try {
      const results = await onTestSecurity?.();
      setTestResults(results || { passed: 0, total: 0, issues: [] });
    } catch (error) {
      console.error('Security test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const getSecurityScore = () => {
    if (!testResults) return 0;
    return Math.round((testResults.passed / testResults.total) * 100);
  };

  const getSeverityColor = (severity: SecurityThreat['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Security Overview */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Overview
            </CardTitle>
            <CardDescription>
              Current security status and threat monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total Threats</Label>
                <div className="text-2xl font-bold text-red-600">{metrics.totalThreats}</div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Blocked Attempts</Label>
                <div className="text-2xl font-bold text-green-600">{metrics.blockedAttempts}</div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Failed Logins</Label>
                <div className="text-2xl font-bold text-yellow-600">{metrics.failedLogins}</div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Suspicious Activity</Label>
                <div className="text-2xl font-bold text-orange-600">{metrics.suspiciousActivity}</div>
              </div>
            </div>

            {metrics.recentThreats.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Recent Security Events</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {metrics.recentThreats.slice(0, 5).map((threat) => (
                    <div key={threat.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{threat.description}</span>
                      </div>
                      <Badge className={getSeverityColor(threat.severity)}>
                        {threat.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSecurityTest}
                disabled={isTesting}
              >
                <Shield className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Testing...' : 'Run Security Test'}
              </Button>
            </div>

            {testResults && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Security Score</Label>
                  <Badge variant={getSecurityScore() >= 80 ? "default" : getSecurityScore() >= 60 ? "secondary" : "destructive"}>
                    {getSecurityScore()}/100
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {testResults.passed} of {testResults.total} security checks passed
                </p>
                {testResults.issues.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm font-medium text-red-600">Issues Found:</Label>
                    <ul className="text-sm text-red-600 list-disc list-inside">
                      {testResults.issues.slice(0, 3).map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Authentication & Password Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Authentication & Password Security
          </CardTitle>
          <CardDescription>
            Configure user authentication and password policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for admin accounts
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableTwoFactor')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Strong Passwords</Label>
                  <p className="text-sm text-muted-foreground">
                    Enforce strong password requirements
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('requireStrongPasswords')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPasswordLength">Min Password Length</Label>
                  <Input
                    id="minPasswordLength"
                    type="number"
                    {...register('minPasswordLength', { valueAsNumber: true })}
                  />
                  {errors.minPasswordLength && (
                    <p className="text-sm text-red-600">{errors.minPasswordLength.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordExpiryDays">Password Expiry (days)</Label>
                  <Input
                    id="passwordExpiryDays"
                    type="number"
                    {...register('passwordExpiryDays', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">0 = never expires</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    {...register('maxLoginAttempts', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                  <Input
                    id="lockoutDuration"
                    type="number"
                    {...register('lockoutDuration', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Management
          </CardTitle>
          <CardDescription>
            Configure user session security and timeouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  {...register('sessionTimeout', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxConcurrentSessions">Max Concurrent Sessions</Label>
                <Input
                  id="maxConcurrentSessions"
                  type="number"
                  {...register('maxConcurrentSessions', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Secure Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  Only send cookies over HTTPS connections
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                {...register('requireSecureCookies')}
              />
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Rate Limiting
          </CardTitle>
          <CardDescription>
            Protect against abuse and DDoS attacks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label>Enable Rate Limiting</Label>
                <p className="text-sm text-muted-foreground">
                  Limit requests per IP address
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                {...register('enableRateLimiting')}
              />
            </div>

            {watchedValues.enableRateLimiting && (
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="globalRateLimit">Global Rate Limit (/hour)</Label>
                    <Input
                      id="globalRateLimit"
                      type="number"
                      {...register('globalRateLimit', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiRateLimit">API Rate Limit (/hour)</Label>
                    <Input
                      id="apiRateLimit"
                      type="number"
                      {...register('apiRateLimit', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginRateLimit">Login Rate Limit (/hour)</Label>
                    <Input
                      id="loginRateLimit"
                      type="number"
                      {...register('loginRateLimit', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>
            )}
          </FormSection>
        </CardContent>
      </Card>

      {/* File Upload Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            File Upload Security
          </CardTitle>
          <CardDescription>
            Secure file uploads and prevent malicious content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable File Scanning</Label>
                  <p className="text-sm text-muted-foreground">
                    Scan uploaded files for security threats
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableFileScanning')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Scan for Malware</Label>
                  <p className="text-sm text-muted-foreground">
                    Use antivirus scanning on uploads
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('scanForMalware')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  {...register('maxFileSize', { valueAsNumber: true })}
                />
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Content Security Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Content Security Policy
          </CardTitle>
          <CardDescription>
            Configure CSP and browser security headers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Content Security Policy</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent XSS and injection attacks
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableCSP')}
                />
              </div>

              {watchedValues.enableCSP && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label htmlFor="cspDirectives">CSP Directives</Label>
                  <Textarea
                    id="cspDirectives"
                    placeholder="default-src 'self'; script-src 'self' 'unsafe-inline';"
                    rows={3}
                    {...register('cspDirectives')}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable XSS Protection</Label>
                  <p className="text-sm text-muted-foreground">
                    Browser XSS filtering protection
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableXSSProtection')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Clickjacking Protection</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent iframe clickjacking attacks
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableClickjackingProtection')}
                />
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* SSL/TLS Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            SSL/TLS Configuration
          </CardTitle>
          <CardDescription>
            Configure HTTPS and transport security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enforce HTTPS</Label>
                  <p className="text-sm text-muted-foreground">
                    Redirect all HTTP traffic to HTTPS
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enforceHTTPS')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable HSTS</Label>
                  <p className="text-sm text-muted-foreground">
                    HTTP Strict Transport Security
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableHSTS')}
                />
              </div>

              {watchedValues.enableHSTS && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label htmlFor="hstsMaxAge">HSTS Max Age (seconds)</Label>
                  <Input
                    id="hstsMaxAge"
                    type="number"
                    {...register('hstsMaxAge', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    31536000 = 1 year (recommended)
                  </p>
                </div>
              )}
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Monitoring & Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Monitoring & Alerts
          </CardTitle>
          <CardDescription>
            Configure security logging and alert notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Security Logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Log all security-related events
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableSecurityLogging')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logRetentionDays">Log Retention (days)</Label>
                <Input
                  id="logRetentionDays"
                  type="number"
                  {...register('logRetentionDays', { valueAsNumber: true })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Security Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Email notifications for security events
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableAlerts')}
                />
              </div>

              {watchedValues.enableAlerts && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label htmlFor="alertEmail">Alert Email Address</Label>
                  <Input
                    id="alertEmail"
                    type="email"
                    placeholder="security@example.com"
                    {...register('alertEmail')}
                  />
                  {errors.alertEmail && (
                    <p className="text-sm text-red-600">{errors.alertEmail.message}</p>
                  )}
                </div>
              )}
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading || !isDirty}>
          <Settings className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Security Settings'}
        </Button>
      </div>
    </form>
  );
}