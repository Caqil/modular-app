// ===================================================================
// ADMIN SETTINGS API - SYSTEM CONFIGURATION AND SETTINGS
// ===================================================================

import { apiClient } from './api';

// ===================================================================
// SETTINGS TYPES AND INTERFACES
// ===================================================================

export interface SettingDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'json' | 'email' | 'url' | 'color' | 'file';
  defaultValue: any;
  value?: any;
  label: string;
  description: string;
  group: string;
  section: string;
  public: boolean;
  editable: boolean;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: any[];
    custom?: string;
  };
  options?: Array<{
    label: string;
    value: any;
    description?: string;
  }>;
  dependencies?: Array<{
    key: string;
    value: any;
    operator?: 'equals' | 'not_equals' | 'in' | 'not_in';
  }>;
  hint?: string;
  placeholder?: string;
  readonly?: boolean;
  sensitive?: boolean;
}

export interface SettingsGroup {
  name: string;
  label: string;
  description: string;
  icon?: string;
  order: number;
  sections: SettingsSection[];
}

export interface SettingsSection {
  name: string;
  label: string;
  description?: string;
  order: number;
  settings: SettingDefinition[];
}

export interface SystemInfo {
  version: {
    cms: string;
    node: string;
    database: string;
    os: string;
  };
  environment: {
    nodeEnv: string;
    debug: boolean;
    maintenance: boolean;
    timezone: string;
  };
  performance: {
    uptime: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    cpuUsage: number;
    loadAverage: number[];
  };
  database: {
    status: 'connected' | 'disconnected' | 'error';
    host: string;
    name: string;
    size: number;
    collections: number;
    indexes: number;
    responseTime: number;
  };
  storage: {
    total: number;
    used: number;
    available: number;
    uploads: {
      total: number;
      size: number;
    };
    cache: {
      size: number;
      entries: number;
    };
  };
  security: {
    httpsEnabled: boolean;
    rateLimitEnabled: boolean;
    authMethod: string;
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      requireNumbers: boolean;
      requireUppercase: boolean;
    };
  };
  features: {
    pluginsEnabled: boolean;
    cachingEnabled: boolean;
    compressionEnabled: boolean;
    apiEnabled: boolean;
    webhooksEnabled: boolean;
  };
}

export interface BackupInfo {
  id: string;
  type: 'full' | 'database' | 'files' | 'settings';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  size: number;
  filename: string;
  description?: string;
  progress?: number;
  error?: string;
  metadata: {
    version: string;
    pluginCount: number;
    contentCount: number;
    userCount: number;
  };
}

export interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  allowedIPs: string[];
  allowedRoles: string[];
  estimatedDuration?: number;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  showCountdown: boolean;
  customPage?: string;
}

export interface CacheConfig {
  enabled: boolean;
  provider: 'memory' | 'redis' | 'file';
  ttl: number;
  maxSize: number;
  compression: boolean;
  tags: boolean;
  strategies: {
    pages: boolean;
    api: boolean;
    database: boolean;
    media: boolean;
  };
}

export interface SecurityConfig {
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  cors: {
    enabled: boolean;
    origin: string | string[];
    credentials: boolean;
    methods: string[];
  };
  headers: {
    hsts: boolean;
    noSniff: boolean;
    frameOptions: string;
    xssProtection: boolean;
    referrerPolicy: string;
  };
  auth: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    requireEmailVerification: boolean;
    allowRegistration: boolean;
    defaultRole: string;
  };
  uploads: {
    maxSize: number;
    allowedTypes: string[];
    scanForMalware: boolean;
    quarantineSuspicious: boolean;
  };
}

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'postmark';
  from: {
    name: string;
    email: string;
  };
  replyTo?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  apiKey?: string;
  templates: {
    welcome: string;
    passwordReset: string;
    emailVerification: string;
    notification: string;
  };
  testing: {
    enabled: boolean;
    recipient: string;
  };
}

export interface NotificationConfig {
  email: {
    enabled: boolean;
    events: string[];
    recipients: string[];
  };
  webhook: {
    enabled: boolean;
    url: string;
    secret: string;
    events: string[];
    retries: number;
  };
  slack: {
    enabled: boolean;
    webhook: string;
    channel: string;
    events: string[];
  };
  discord: {
    enabled: boolean;
    webhook: string;
    events: string[];
  };
}

export interface ThemeSettings {
  activeTheme: string;
  customization: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
    typography: {
      fontFamily: string;
      fontSize: number;
      lineHeight: number;
      fontWeight: string;
    };
    layout: {
      containerWidth: number;
      sidebar: 'left' | 'right' | 'none';
      headerType: 'fixed' | 'static' | 'sticky';
      footerType: 'simple' | 'detailed' | 'none';
    };
    customCSS: string;
  };
  features: {
    darkMode: boolean;
    responsiveImages: boolean;
    lazyLoading: boolean;
    animations: boolean;
    breadcrumbs: boolean;
    searchBox: boolean;
  };
}

// ===================================================================
// SETTINGS API
// ===================================================================

export class SettingsAPI {
  /**
   * Get all settings groups
   */
  static async getSettingsGroups(): Promise<SettingsGroup[]> {
    return apiClient.get<SettingsGroup[]>('/settings/groups');
  }

  /**
   * Get settings for a specific group
   */
  static async getGroupSettings(group: string): Promise<SettingsGroup> {
    return apiClient.get<SettingsGroup>(`/settings/groups/${group}`);
  }

  /**
   * Get all settings as flat object
   */
  static async getAllSettings(): Promise<Record<string, any>> {
    return apiClient.get<Record<string, any>>('/settings');
  }

  /**
   * Get specific setting value
   */
  static async getSetting(key: string): Promise<any> {
    const response = await apiClient.get(`/settings/${key}`);
    return response.value;
  }

  /**
   * Update single setting
   */
  static async updateSetting(key: string, value: any): Promise<{
    success: boolean;
    value: any;
    message?: string;
  }> {
    return apiClient.put(`/settings/${key}`, { value });
  }

  /**
   * Update multiple settings
   */
  static async updateSettings(settings: Record<string, any>): Promise<{
    success: boolean;
    updated: string[];
    failed: Array<{ key: string; error: string }>;
  }> {
    return apiClient.put('/settings', { settings });
  }

  /**
   * Reset setting to default value
   */
  static async resetSetting(key: string): Promise<{
    success: boolean;
    value: any;
  }> {
    return apiClient.post(`/settings/${key}/reset`);
  }

  /**
   * Reset all settings in a group
   */
  static async resetGroupSettings(group: string): Promise<{
    success: boolean;
    reset: string[];
  }> {
    return apiClient.post(`/settings/groups/${group}/reset`);
  }

  /**
   * Validate settings
   */
  static async validateSettings(settings: Record<string, any>): Promise<{
    valid: boolean;
    errors: Array<{
      key: string;
      error: string;
      suggestion?: string;
    }>;
  }> {
    return apiClient.post('/settings/validate', { settings });
  }

  /**
   * Export settings
   */
  static async exportSettings(options?: {
    groups?: string[];
    format?: 'json' | 'yaml';
    includeDefaults?: boolean;
  }): Promise<Blob> {
    const params = options ? new URLSearchParams(options as any).toString() : '';
    return apiClient.download(`/settings/export?${params}`, 'settings-export.json');
  }

  /**
   * Import settings
   */
  static async importSettings(
    file: File,
    options?: {
      overwrite?: boolean;
      validate?: boolean;
      backup?: boolean;
    }
  ): Promise<{
    success: boolean;
    imported: string[];
    skipped: string[];
    errors: Array<{ key: string; error: string }>;
  }> {
    return apiClient.upload('/settings/import', file, options);
  }
}

// ===================================================================
// SYSTEM INFO API
// ===================================================================

export class SystemAPI {
  /**
   * Get system information
   */
  static async getSystemInfo(): Promise<SystemInfo> {
    return apiClient.get<SystemInfo>('/system/info');
  }

  /**
   * Get health check
   */
  static async getHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      duration: number;
      error?: string;
    }>;
    timestamp: Date;
  }> {
    return apiClient.get('/system/health');
  }

  /**
   * Get system logs
   */
  static async getSystemLogs(options?: {
    level?: 'error' | 'warn' | 'info' | 'debug';
    limit?: number;
    since?: Date;
    source?: string;
  }): Promise<Array<{
    timestamp: Date;
    level: string;
    message: string;
    source: string;
    context?: Record<string, any>;
    trace?: string;
  }>> {
    return apiClient.get('/system/logs', options);
  }

  /**
   * Clear system logs
   */
  static async clearSystemLogs(options?: {
    level?: string;
    olderThan?: Date;
  }): Promise<{
    success: boolean;
    deleted: number;
  }> {
    return apiClient.delete('/system/logs', { body: options });
  }

  /**
   * Get system metrics
   */
  static async getSystemMetrics(period = '1h'): Promise<{
    cpu: Array<{ timestamp: Date; value: number }>;
    memory: Array<{ timestamp: Date; used: number; total: number }>;
    disk: Array<{ timestamp: Date; used: number; total: number }>;
    network: Array<{ timestamp: Date; in: number; out: number }>;
    requests: Array<{ timestamp: Date; count: number; avgTime: number }>;
    errors: Array<{ timestamp: Date; count: number }>;
  }> {
    return apiClient.get('/system/metrics', { period });
  }

  /**
   * Restart system services
   */
  static async restartServices(services?: string[]): Promise<{
    success: boolean;
    restarted: string[];
    failed: Array<{ service: string; error: string }>;
  }> {
    return apiClient.post('/system/restart', { services });
  }

  /**
   * Clear system caches
   */
  static async clearCaches(types?: string[]): Promise<{
    success: boolean;
    cleared: string[];
    errors: Array<{ type: string; error: string }>;
  }> {
    return apiClient.post('/system/clear-cache', { types });
  }

  /**
   * Optimize database
   */
  static async optimizeDatabase(): Promise<{
    success: boolean;
    operations: Array<{
      operation: string;
      duration: number;
      sizeBefore: number;
      sizeAfter: number;
    }>;
    totalSizeSaved: number;
  }> {
    return apiClient.post('/system/optimize-database');
  }

  /**
   * Run system maintenance
   */
  static async runMaintenance(tasks?: string[]): Promise<{
    success: boolean;
    completed: Array<{
      task: string;
      duration: number;
      result: string;
    }>;
    failed: Array<{
      task: string;
      error: string;
    }>;
  }> {
    return apiClient.post('/system/maintenance', { tasks });
  }
}

// ===================================================================
// BACKUP API
// ===================================================================

export class BackupAPI {
  /**
   * Get all backups
   */
  static async getBackups(): Promise<BackupInfo[]> {
    return apiClient.get<BackupInfo[]>('/backups');
  }

  /**
   * Get backup details
   */
  static async getBackup(id: string): Promise<BackupInfo> {
    return apiClient.get<BackupInfo>(`/backups/${id}`);
  }

  /**
   * Create backup
   */
  static async createBackup(options: {
    type: 'full' | 'database' | 'files' | 'settings';
    description?: string;
    compress?: boolean;
    encrypt?: boolean;
  }): Promise<{
    success: boolean;
    backup: BackupInfo;
    message: string;
  }> {
    return apiClient.post('/backups', options);
  }

  /**
   * Restore from backup
   */
  static async restoreBackup(id: string, options?: {
    type?: 'full' | 'database' | 'files' | 'settings';
    overwrite?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    restored: string[];
  }> {
    return apiClient.post(`/backups/${id}/restore`, options);
  }

  /**
   * Download backup
   */
  static async downloadBackup(id: string): Promise<Blob> {
    const backup = await this.getBackup(id);
    return apiClient.download(`/backups/${id}/download`, backup.filename);
  }

  /**
   * Delete backup
   */
  static async deleteBackup(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.delete(`/backups/${id}`);
  }

  /**
   * Upload backup
   */
  static async uploadBackup(
    file: File,
    description?: string
  ): Promise<{
    success: boolean;
    backup: BackupInfo;
    message: string;
  }> {
    return apiClient.upload('/backups/upload', file, { description });
  }

  /**
   * Schedule backup
   */
  static async scheduleBackup(options: {
    type: 'full' | 'database' | 'files' | 'settings';
    schedule: string; // cron expression
    description?: string;
    retention: number; // days
    compress?: boolean;
    encrypt?: boolean;
  }): Promise<{
    success: boolean;
    scheduleId: string;
    nextRun: Date;
  }> {
    return apiClient.post('/backups/schedule', options);
  }

  /**
   * Get backup schedules
   */
  static async getSchedules(): Promise<Array<{
    id: string;
    type: string;
    schedule: string;
    description: string;
    enabled: boolean;
    lastRun?: Date;
    nextRun: Date;
    retention: number;
  }>> {
    return apiClient.get('/backups/schedules');
  }

  /**
   * Update backup schedule
   */
  static async updateSchedule(id: string, updates: {
    schedule?: string;
    enabled?: boolean;
    retention?: number;
    description?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.put(`/backups/schedules/${id}`, updates);
  }

  /**
   * Delete backup schedule
   */
  static async deleteSchedule(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.delete(`/backups/schedules/${id}`);
  }
}

// ===================================================================
// MAINTENANCE API
// ===================================================================

export class MaintenanceAPI {
  /**
   * Get maintenance status
   */
  static async getMaintenanceStatus(): Promise<MaintenanceConfig> {
    return apiClient.get<MaintenanceConfig>('/maintenance/status');
  }

  /**
   * Enable maintenance mode
   */
  static async enableMaintenance(config: Partial<MaintenanceConfig>): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post('/maintenance/enable', config);
  }

  /**
   * Disable maintenance mode
   */
  static async disableMaintenance(): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post('/maintenance/disable');
  }

  /**
   * Update maintenance config
   */
  static async updateMaintenanceConfig(config: Partial<MaintenanceConfig>): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.put('/maintenance/config', config);
  }

  /**
   * Schedule maintenance window
   */
  static async scheduleMaintenance(config: {
    start: Date;
    end: Date;
    message: string;
    notifyUsers?: boolean;
    notifyAdmins?: boolean;
  }): Promise<{
    success: boolean;
    scheduleId: string;
    message: string;
  }> {
    return apiClient.post('/maintenance/schedule', config);
  }
}

// ===================================================================
// NOTIFICATION API
// ===================================================================

export class NotificationAPI {
  /**
   * Get notification settings
   */
  static async getNotificationSettings(): Promise<NotificationConfig> {
    return apiClient.get<NotificationConfig>('/notifications/settings');
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(config: Partial<NotificationConfig>): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.put('/notifications/settings', config);
  }

  /**
   * Test notification channel
   */
  static async testNotification(channel: 'email' | 'webhook' | 'slack' | 'discord', message?: string): Promise<{
    success: boolean;
    message: string;
    response?: any;
  }> {
    return apiClient.post(`/notifications/test/${channel}`, { message });
  }

  /**
   * Send manual notification
   */
  static async sendNotification(options: {
    channels: string[];
    title: string;
    message: string;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    recipients?: string[];
  }): Promise<{
    success: boolean;
    sent: string[];
    failed: Array<{ channel: string; error: string }>;
  }> {
    return apiClient.post('/notifications/send', options);
  }

  /**
   * Get notification history
   */
  static async getNotificationHistory(options?: {
    channel?: string;
    limit?: number;
    since?: Date;
  }): Promise<Array<{
    id: string;
    channel: string;
    title: string;
    message: string;
    status: 'sent' | 'failed' | 'pending';
    sentAt: Date;
    recipients: string[];
    error?: string;
  }>> {
    return apiClient.get('/notifications/history', options);
  }
}

// ===================================================================
// SETTINGS UTILITIES
// ===================================================================

export const SettingsUtils = {
  /**
   * Group settings by section
   */
  groupBySection(settings: SettingDefinition[]): Record<string, SettingDefinition[]> {
    return settings.reduce((acc, setting) => {
      if (!acc[setting.section]) {
        acc[setting.section] = [];
      }
      acc[setting.section].push(setting);
      return acc;
    }, {} as Record<string, SettingDefinition[]>);
  },

  /**
   * Validate setting value
   */
  validateSettingValue(setting: SettingDefinition, value: any): { valid: boolean; error?: string } {
    if (setting.required && (value === null || value === undefined || value === '')) {
      return { valid: false, error: `${setting.label} is required` };
    }

    if (value === null || value === undefined) {
      return { valid: true };
    }

    const validation = setting.validation;
    if (!validation) return { valid: true };

    // Type validation
    const expectedType = setting.type;
    const actualType = typeof value;

    if (expectedType === 'number' && actualType !== 'number') {
      return { valid: false, error: `${setting.label} must be a number` };
    }

    if (expectedType === 'boolean' && actualType !== 'boolean') {
      return { valid: false, error: `${setting.label} must be a boolean` };
    }

    if (expectedType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { valid: false, error: `${setting.label} must be a valid email address` };
    }

    if (expectedType === 'url' && !/^https?:\/\/.+/.test(value)) {
      return { valid: false, error: `${setting.label} must be a valid URL` };
    }

    // Range validation
    if (validation.min !== undefined && value < validation.min) {
      return { valid: false, error: `${setting.label} must be at least ${validation.min}` };
    }

    if (validation.max !== undefined && value > validation.max) {
      return { valid: false, error: `${setting.label} must be at most ${validation.max}` };
    }

    // Length validation
    if (validation.minLength !== undefined && value.length < validation.minLength) {
      return { valid: false, error: `${setting.label} must be at least ${validation.minLength} characters` };
    }

    if (validation.maxLength !== undefined && value.length > validation.maxLength) {
      return { valid: false, error: `${setting.label} must be at most ${validation.maxLength} characters` };
    }

    // Pattern validation
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return { valid: false, error: `${setting.label} format is invalid` };
      }
    }

    // Enum validation
    if (validation.enum && !validation.enum.includes(value)) {
      return { valid: false, error: `${setting.label} must be one of: ${validation.enum.join(', ')}` };
    }

    return { valid: true };
  },

  /**
   * Format setting value for display
   */
  formatSettingValue(setting: SettingDefinition, value: any): string {
    if (value === null || value === undefined) return '';

    switch (setting.type) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'array':
        return Array.isArray(value) ? value.join(', ') : '';
      case 'object':
      case 'json':
        return JSON.stringify(value, null, 2);
      case 'number':
        return value.toString();
      default:
        return String(value);
    }
  },

  /**
   * Get setting input type
   */
  getInputType(setting: SettingDefinition): string {
    switch (setting.type) {
      case 'email': return 'email';
      case 'url': return 'url';
      case 'number': return 'number';
      case 'boolean': return 'checkbox';
      case 'color': return 'color';
      case 'file': return 'file';
      default: return 'text';
    }
  },

  /**
   * Check if setting dependencies are met
   */
  checkDependencies(setting: SettingDefinition, allSettings: Record<string, any>): boolean {
    if (!setting.dependencies) return true;

    return setting.dependencies.every(dep => {
      const depValue = allSettings[dep.key];
      const operator = dep.operator || 'equals';

      switch (operator) {
        case 'equals':
          return depValue === dep.value;
        case 'not_equals':
          return depValue !== dep.value;
        case 'in':
          return Array.isArray(dep.value) && dep.value.includes(depValue);
        case 'not_in':
          return Array.isArray(dep.value) && !dep.value.includes(depValue);
        default:
          return true;
      }
    });
  },
};