// ===================================================================
// ADMIN PLUGINS API - PLUGIN MANAGEMENT AND OPERATIONS
// ===================================================================

import { apiClient, type PaginatedResponse, type QueryOptions } from './api';
import type {
  PluginManifest,
  PluginStatus,
  PluginType,
  PluginCapability,
  PluginDependency,
  PluginRoute,
  PluginHook,
  PluginFilter,
  PluginSettings,
  PluginError,
  PluginStats,
  PluginUpdateInfo,
} from '@modular-app/core/types/plugin';

// ===================================================================
// PLUGIN TYPES AND INTERFACES
// ===================================================================

export interface PluginInfo extends PluginManifest {
  id: string;
  status: PluginStatus;
  installedVersion: string;
  availableVersion?: string;
  updateAvailable: boolean;
  installDate: Date;
  lastActivated?: Date;
  lastDeactivated?: Date;
  activationCount: number;
  fileSize: number;
  dependencies: PluginDependency[];
  conflicts: string[];
  errors: PluginError[];
  settings: PluginSettings;
  stats: PluginStats;
}

export interface PluginQueryOptions extends QueryOptions {
  status?: PluginStatus | PluginStatus[];
  type?: PluginType | PluginType[];
  capability?: PluginCapability | PluginCapability[];
  hasUpdates?: boolean;
  hasErrors?: boolean;
  author?: string;
  tag?: string;
}

export interface PluginInstallOptions {
  source: 'file' | 'url' | 'marketplace' | 'github';
  data: File | string;
  overwrite?: boolean;
  activate?: boolean;
  validateDependencies?: boolean;
}

export interface PluginUploadData {
  file: File;
  overwrite?: boolean;
  activate?: boolean;
}

export interface PluginSettingsData {
  pluginId: string;
  settings: Record<string, any>;
  validate?: boolean;
}

export interface PluginDevelopmentInfo {
  scaffold: {
    name: string;
    description: string;
    author: string;
    type: PluginType;
    capabilities: PluginCapability[];
    includeExamples: boolean;
    includeTests: boolean;
  };
  validation: {
    manifest: boolean;
    structure: boolean;
    code: boolean;
    security: boolean;
  };
  build: {
    minify: boolean;
    sourcemaps: boolean;
    target: 'es2020' | 'es2021' | 'es2022';
  };
}

export interface PluginMarketplaceInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  version: string;
  author: {
    name: string;
    url?: string;
    avatar?: string;
  };
  category: string;
  tags: string[];
  rating: number;
  ratingCount: number;
  downloads: number;
  price: number;
  currency: string;
  thumbnail: string;
  screenshots: string[];
  changelog: Array<{
    version: string;
    date: Date;
    changes: string[];
  }>;
  requirements: {
    cmsVersion: string;
    phpVersion?: string;
    nodeVersion?: string;
    dependencies: string[];
  };
  supportUrl?: string;
  documentationUrl?: string;
  demoUrl?: string;
  repositoryUrl?: string;
  lastUpdated: Date;
  verified: boolean;
  featured: boolean;
}

export interface PluginAnalytics {
  pluginId: string;
  period: string;
  usage: {
    activations: number;
    deactivations: number;
    errors: number;
    warnings: number;
  };
  performance: {
    avgLoadTime: number;
    avgMemoryUsage: number;
    avgCpuUsage: number;
  };
  features: Record<string, {
    usage: number;
    performance: number;
    errors: number;
  }>;
  hooks: Record<string, {
    calls: number;
    avgDuration: number;
    errors: number;
  }>;
}

// ===================================================================
// PLUGINS API
// ===================================================================

export class PluginsAPI {
  /**
   * Get all installed plugins
   */
  static async getPlugins(options: PluginQueryOptions = {}): Promise<PaginatedResponse<PluginInfo>> {
    return apiClient.getPaginated<PluginInfo>('/plugins', options);
  }

  /**
   * Get single plugin details
   */
  static async getPlugin(id: string): Promise<PluginInfo> {
    return apiClient.get<PluginInfo>(`/plugins/${id}`);
  }

  /**
   * Get plugin by slug
   */
  static async getPluginBySlug(slug: string): Promise<PluginInfo> {
    return apiClient.get<PluginInfo>(`/plugins/slug/${slug}`);
  }

  /**
   * Install plugin from various sources
   */
  static async installPlugin(options: PluginInstallOptions): Promise<{
    success: boolean;
    plugin: PluginInfo;
    message: string;
    warnings?: string[];
  }> {
    if (options.source === 'file' && options.data instanceof File) {
      return apiClient.upload('/plugins/install', options.data, {
        overwrite: options.overwrite,
        activate: options.activate,
        validateDependencies: options.validateDependencies,
      });
    }

    return apiClient.post('/plugins/install', options);
  }

  /**
   * Upload and install plugin from file
   */
  static async uploadPlugin(
    data: PluginUploadData,
    onProgress?: (progress: number) => void
  ): Promise<{
    success: boolean;
    plugin: PluginInfo;
    message: string;
  }> {
    return apiClient.upload('/plugins/upload', data.file, {
      overwrite: data.overwrite,
      activate: data.activate,
    }, onProgress);
  }

  /**
   * Activate plugin
   */
  static async activatePlugin(id: string): Promise<{
    success: boolean;
    message: string;
    warnings?: string[];
    dependenciesInstalled?: string[];
  }> {
    return apiClient.post(`/plugins/${id}/activate`);
  }

  /**
   * Deactivate plugin
   */
  static async deactivatePlugin(id: string): Promise<{
    success: boolean;
    message: string;
    dependentPlugins?: string[];
  }> {
    return apiClient.post(`/plugins/${id}/deactivate`);
  }

  /**
   * Update plugin
   */
  static async updatePlugin(id: string, options?: {
    backup?: boolean;
    force?: boolean;
  }): Promise<{
    success: boolean;
    plugin: PluginInfo;
    message: string;
    changelog?: string[];
  }> {
    return apiClient.post(`/plugins/${id}/update`, options);
  }

  /**
   * Uninstall plugin
   */
  static async uninstallPlugin(id: string, options?: {
    removeData?: boolean;
    force?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.delete(`/plugins/${id}`, { body: options });
  }

  /**
   * Check for plugin updates
   */
  static async checkUpdates(pluginId?: string): Promise<{
    updates: Array<{
      pluginId: string;
      currentVersion: string;
      availableVersion: string;
      changelog: string[];
      critical: boolean;
    }>;
    total: number;
  }> {
    const params = pluginId ? { pluginId } : {};
    return apiClient.get('/plugins/check-updates', params);
  }

  /**
   * Update all plugins
   */
  static async updateAllPlugins(options?: {
    criticalOnly?: boolean;
    backup?: boolean;
  }): Promise<{
    success: boolean;
    updated: string[];
    failed: Array<{ pluginId: string; error: string }>;
    skipped: string[];
  }> {
    return apiClient.post('/plugins/update-all', options);
  }

  /**
   * Get plugin settings
   */
  static async getPluginSettings(id: string): Promise<PluginSettings> {
    return apiClient.get<PluginSettings>(`/plugins/${id}/settings`);
  }

  /**
   * Update plugin settings
   */
  static async updatePluginSettings(data: PluginSettingsData): Promise<{
    success: boolean;
    settings: PluginSettings;
    message?: string;
  }> {
    const { pluginId, ...settingsData } = data;
    return apiClient.put(`/plugins/${pluginId}/settings`, settingsData);
  }

  /**
   * Reset plugin settings to defaults
   */
  static async resetPluginSettings(id: string): Promise<{
    success: boolean;
    settings: PluginSettings;
  }> {
    return apiClient.post(`/plugins/${id}/settings/reset`);
  }

  /**
   * Get plugin hooks and filters
   */
  static async getPluginHooks(id: string): Promise<{
    hooks: PluginHook[];
    filters: PluginFilter[];
    routes: PluginRoute[];
  }> {
    return apiClient.get(`/plugins/${id}/hooks`);
  }

  /**
   * Get plugin analytics
   */
  static async getPluginAnalytics(id: string, period = '30d'): Promise<PluginAnalytics> {
    return apiClient.get<PluginAnalytics>(`/plugins/${id}/analytics`, { period });
  }

  /**
   * Get plugin logs
   */
  static async getPluginLogs(id: string, options?: {
    level?: 'error' | 'warn' | 'info' | 'debug';
    limit?: number;
    since?: Date;
  }): Promise<Array<{
    timestamp: Date;
    level: string;
    message: string;
    context?: Record<string, any>;
    trace?: string;
  }>> {
    return apiClient.get(`/plugins/${id}/logs`, options);
  }

  /**
   * Clear plugin logs
   */
  static async clearPluginLogs(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/plugins/${id}/logs`);
  }

  /**
   * Run plugin health check
   */
  static async runHealthCheck(id: string): Promise<{
    healthy: boolean;
    issues: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      category: string;
      message: string;
      suggestion?: string;
    }>;
    performance: {
      loadTime: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  }> {
    return apiClient.post(`/plugins/${id}/health-check`);
  }

  /**
   * Get plugin dependencies
   */
  static async getPluginDependencies(id: string): Promise<{
    dependencies: PluginDependency[];
    dependents: string[];
    conflicts: string[];
    missing: string[];
    incompatible: string[];
  }> {
    return apiClient.get(`/plugins/${id}/dependencies`);
  }

  /**
   * Resolve plugin dependencies
   */
  static async resolveDependencies(id: string, install = false): Promise<{
    resolvable: boolean;
    toInstall: string[];
    toUpdate: string[];
    conflicts: string[];
    installed?: string[];
  }> {
    return apiClient.post(`/plugins/${id}/resolve-dependencies`, { install });
  }

  /**
   * Bulk plugin operations
   */
  static async bulkOperation(operation: 'activate' | 'deactivate' | 'update' | 'uninstall', pluginIds: string[]): Promise<{
    success: boolean;
    results: Array<{
      pluginId: string;
      success: boolean;
      message?: string;
      error?: string;
    }>;
  }> {
    return apiClient.post('/plugins/bulk', { operation, pluginIds });
  }

  /**
   * Search installed plugins
   */
  static async searchPlugins(query: string, options?: {
    status?: PluginStatus;
    type?: PluginType;
    capability?: PluginCapability;
  }): Promise<PluginInfo[]> {
    return apiClient.get<PluginInfo[]>('/plugins/search', { q: query, ...options });
  }

  /**
   * Get plugin system info
   */
  static async getSystemInfo(): Promise<{
    totalPlugins: number;
    activePlugins: number;
    hasUpdates: number;
    hasErrors: number;
    systemCompatibility: {
      node: string;
      cms: string;
      compatible: boolean;
    };
    diskSpace: {
      total: number;
      used: number;
      available: number;
    };
    performance: {
      avgLoadTime: number;
      totalMemoryUsage: number;
    };
  }> {
    return apiClient.get('/plugins/system-info');
  }
}

// ===================================================================
// PLUGIN MARKETPLACE API
// ===================================================================

export class PluginMarketplaceAPI {
  /**
   * Browse marketplace plugins
   */
  static async browsePlugins(options: {
    category?: string;
    tag?: string;
    search?: string;
    sort?: 'popular' | 'newest' | 'rating' | 'downloads' | 'price';
    price?: 'free' | 'paid' | 'all';
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<PluginMarketplaceInfo>> {
    return apiClient.getPaginated<PluginMarketplaceInfo>('/marketplace/plugins', options);
  }

  /**
   * Get featured plugins
   */
  static async getFeaturedPlugins(limit = 10): Promise<PluginMarketplaceInfo[]> {
    return apiClient.get<PluginMarketplaceInfo[]>('/marketplace/plugins/featured', { limit });
  }

  /**
   * Get plugin categories
   */
  static async getCategories(): Promise<Array<{
    name: string;
    slug: string;
    description: string;
    count: number;
    icon?: string;
  }>> {
    return apiClient.get('/marketplace/categories');
  }

  /**
   * Get plugin details from marketplace
   */
  static async getMarketplacePlugin(slug: string): Promise<PluginMarketplaceInfo> {
    return apiClient.get<PluginMarketplaceInfo>(`/marketplace/plugins/${slug}`);
  }

  /**
   * Install plugin from marketplace
   */
  static async installFromMarketplace(slug: string, options?: {
    license?: string;
    activate?: boolean;
  }): Promise<{
    success: boolean;
    plugin: PluginInfo;
    message: string;
  }> {
    return apiClient.post(`/marketplace/plugins/${slug}/install`, options);
  }

  /**
   * Get plugin reviews
   */
  static async getPluginReviews(slug: string, options?: {
    rating?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<{
    id: string;
    author: string;
    avatar?: string;
    rating: number;
    title: string;
    content: string;
    date: Date;
    verified: boolean;
    helpful: number;
  }>> {
    return apiClient.getPaginated(`/marketplace/plugins/${slug}/reviews`, options);
  }

  /**
   * Submit plugin review
   */
  static async submitReview(slug: string, review: {
    rating: number;
    title: string;
    content: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/marketplace/plugins/${slug}/reviews`, review);
  }
}

// ===================================================================
// PLUGIN DEVELOPMENT API
// ===================================================================

export class PluginDevelopmentAPI {
  /**
   * Create new plugin scaffold
   */
  static async createPluginScaffold(info: PluginDevelopmentInfo['scaffold']): Promise<{
    success: boolean;
    path: string;
    files: string[];
  }> {
    return apiClient.post('/plugins/dev/scaffold', info);
  }

  /**
   * Validate plugin structure
   */
  static async validatePlugin(pluginPath: string): Promise<{
    valid: boolean;
    errors: Array<{
      type: 'error' | 'warning';
      file: string;
      line?: number;
      message: string;
    }>;
    suggestions: string[];
  }> {
    return apiClient.post('/plugins/dev/validate', { path: pluginPath });
  }

  /**
   * Build plugin for distribution
   */
  static async buildPlugin(pluginPath: string, options: PluginDevelopmentInfo['build']): Promise<{
    success: boolean;
    outputPath: string;
    size: number;
    warnings?: string[];
  }> {
    return apiClient.post('/plugins/dev/build', { path: pluginPath, ...options });
  }

  /**
   * Test plugin
   */
  static async testPlugin(pluginPath: string, testType?: 'unit' | 'integration' | 'e2e'): Promise<{
    success: boolean;
    results: {
      passed: number;
      failed: number;
      skipped: number;
      coverage?: number;
    };
    failures: Array<{
      test: string;
      error: string;
      file: string;
      line: number;
    }>;
  }> {
    return apiClient.post('/plugins/dev/test', { path: pluginPath, testType });
  }

  /**
   * Get plugin development docs
   */
  static async getDevelopmentDocs(): Promise<{
    gettingStarted: string;
    apiReference: Record<string, any>;
    examples: Array<{
      title: string;
      description: string;
      code: string;
      language: string;
    }>;
    hooks: PluginHook[];
    filters: PluginFilter[];
  }> {
    return apiClient.get('/plugins/dev/docs');
  }

  /**
   * Generate plugin documentation
   */
  static async generateDocs(pluginPath: string): Promise<{
    success: boolean;
    documentation: {
      readme: string;
      api: Record<string, any>;
      changelog: string;
    };
  }> {
    return apiClient.post('/plugins/dev/generate-docs', { path: pluginPath });
  }

  /**
   * Get plugin templates
   */
  static async getPluginTemplates(): Promise<Array<{
    name: string;
    description: string;
    type: PluginType;
    capabilities: PluginCapability[];
    preview: string;
    files: string[];
  }>> {
    return apiClient.get('/plugins/dev/templates');
  }

  /**
   * Download plugin template
   */
  static async downloadTemplate(templateName: string): Promise<Blob> {
    return apiClient.download(`/plugins/dev/templates/${templateName}/download`, `${templateName}-template.zip`);
  }
}

// ===================================================================
// PLUGIN UTILITIES
// ===================================================================

export const PluginUtils = {
  /**
   * Format plugin version
   */
  formatVersion(version: string): string {
    // Clean up version string (remove 'v' prefix, etc.)
    return version.replace(/^v/, '');
  },

  /**
   * Compare plugin versions
   */
  compareVersions(version1: string, version2: string): number {
    const v1 = this.formatVersion(version1).split('.').map(Number);
    const v2 = this.formatVersion(version2).split('.').map(Number);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const part1 = v1[i] || 0;
      const part2 = v2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  },

  /**
   * Check if plugin is compatible
   */
  isCompatible(plugin: PluginInfo, cmsVersion: string): boolean {
    if (!plugin.compatibility?.cms) return true;
    
    const required = plugin.compatibility.cms;
    return this.compareVersions(cmsVersion, required) >= 0;
  },

  /**
   * Get plugin status color
   */
  getStatusColor(status: PluginStatus): string {
    const colors = {
      [PluginStatus.ACTIVE]: '#10b981',
      [PluginStatus.INACTIVE]: '#6b7280',
      [PluginStatus.ERROR]: '#ef4444',
      [PluginStatus.INSTALLING]: '#3b82f6',
      [PluginStatus.UPDATING]: '#f59e0b',
      [PluginStatus.BROKEN]: '#dc2626',
    };

    return colors[status] || '#6b7280';
  },

  /**
   * Format plugin file size
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * Get capability description
   */
  getCapabilityDescription(capability: PluginCapability): string {
    const descriptions = {
      [PluginCapability.CONTENT_MANAGEMENT]: 'Manage content types and data',
      [PluginCapability.FRONTEND_RENDERING]: 'Customize frontend display',
      [PluginCapability.ADMIN_INTERFACE]: 'Extend admin functionality',
      [PluginCapability.API_ENDPOINTS]: 'Add custom API endpoints',
      [PluginCapability.WEBHOOKS]: 'Handle webhook events',
      [PluginCapability.CUSTOM_FIELDS]: 'Add custom field types',
      [PluginCapability.WIDGETS]: 'Create widget areas',
      [PluginCapability.SHORTCODES]: 'Add shortcode functionality',
      [PluginCapability.BLOCKS]: 'Extend block editor',
      [PluginCapability.AUTHENTICATION]: 'Manage authentication',
      [PluginCapability.CACHING]: 'Optimize performance',
      [PluginCapability.SEO]: 'Search engine optimization',
      [PluginCapability.ANALYTICS]: 'Track and analyze data',
      [PluginCapability.ECOMMERCE]: 'E-commerce functionality',
      [PluginCapability.FORMS]: 'Form building and processing',
      [PluginCapability.MEDIA]: 'Media management',
      [PluginCapability.SOCIAL]: 'Social media integration',
      [PluginCapability.PERFORMANCE]: 'Performance optimization',
      [PluginCapability.SECURITY]: 'Security enhancements',
    };

    return descriptions[capability] || 'Unknown capability';
  },
};