// ===================================================================
// ADMIN PLUGINS API - PLUGIN MANAGEMENT AND OPERATIONS
// ===================================================================

import { apiClient, type PaginatedResponse, type QueryOptions } from './api';

// Import ALL types from core - no duplication!
export type {
  Plugin,
  PluginManifest,
  PluginStatus,
  PluginCapability,
  PluginDependency,
  PluginRoute,
  PluginHook,
  PluginFilter,
  PluginSettingsSchema,
  PluginError,
  PluginRecord,
  PluginEvent,
  PluginAdminMenu,
  PluginPermission,
} from '@modular-app/core/types/plugin';

// Import enums for runtime usage
import { PluginStatus, PluginCapability } from '@modular-app/core/types/plugin';
import type { PluginRecord } from '@modular-app/core/types/plugin';

// ===================================================================
// ADMIN API CLASSES - Using Core Types Only
// ===================================================================

export class PluginsAPI {
  /**
   * Get all installed plugins
   */
  static async getPlugins(options: QueryOptions = {}): Promise<PaginatedResponse<PluginRecord>> {
    return apiClient.getPaginated<PluginRecord>('/plugins', options);
  }

  /**
   * Get single plugin details
   */
  static async getPlugin(id: string): Promise<PluginRecord> {
    return apiClient.get<PluginRecord>(`/plugins/${id}`);
  }

  /**
   * Install plugin from file
   */
  static async installPlugin(file: File, options?: {
    overwrite?: boolean;
    activate?: boolean;
  }): Promise<{
    success: boolean;
    plugin: PluginRecord;
    message: string;
  }> {
    return apiClient.upload('/plugins/install', file, options);
  }

  /**
   * Activate plugin
   */
  static async activatePlugin(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/plugins/${id}/activate`);
  }

  /**
   * Deactivate plugin
   */
  static async deactivatePlugin(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/plugins/${id}/deactivate`);
  }

  /**
   * Update plugin
   */
  static async updatePlugin(id: string): Promise<{
    success: boolean;
    plugin: PluginRecord;
    message: string;
  }> {
    return apiClient.post(`/plugins/${id}/update`);
  }

  /**
   * Uninstall plugin
   */
  static async uninstallPlugin(id: string, removeData = false): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.delete(`/plugins/${id}`, { body: { removeData } });
  }

  /**
   * Get plugin settings
   */
  static async getPluginSettings(id: string): Promise<Record<string, any>> {
    return apiClient.get(`/plugins/${id}/settings`);
  }

  /**
   * Update plugin settings
   */
  static async updatePluginSettings(id: string, settings: Record<string, any>): Promise<{
    success: boolean;
    settings: Record<string, any>;
  }> {
    return apiClient.put(`/plugins/${id}/settings`, { settings });
  }

  /**
   * Get plugin hooks and filters
   */
  static async getPluginHooks(id: string): Promise<{
    hooks: import('@modular-app/core/types/plugin').PluginHook[];
    filters: import('@modular-app/core/types/plugin').PluginFilter[];
    routes: import('@modular-app/core/types/plugin').PluginRoute[];
  }> {
    return apiClient.get(`/plugins/${id}/hooks`);
  }

  /**
   * Get plugin logs
   */
  static async getPluginLogs(id: string, options?: {
    level?: string;
    limit?: number;
    since?: Date;
  }): Promise<any[]> {
    return apiClient.get(`/plugins/${id}/logs`, options);
  }

  /**
   * Search plugins
   */
  static async searchPlugins(query: string): Promise<PluginRecord[]> {
    return apiClient.get<PluginRecord[]>('/plugins/search', { q: query });
  }
}

// ===================================================================
// PLUGIN UTILITIES - Using Core Types
// ===================================================================

export const PluginUtils = {
  /**
   * Get plugin status color
   */
  getStatusColor(status: PluginStatus): string {
    const colors = {
      [PluginStatus.ACTIVE]: '#10b981',
      [PluginStatus.INACTIVE]: '#6b7280',
      [PluginStatus.INSTALLED]: '#3b82f6',
      [PluginStatus.ERROR]: '#ef4444',
      [PluginStatus.UPDATING]: '#f59e0b',
      [PluginStatus.UNINSTALLING]: '#dc2626',
    };
    return colors[status] || '#6b7280';
  },

  /**
   * Get plugin status text
   */
  getStatusText(status: PluginStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  },

  /**
   * Format file size
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