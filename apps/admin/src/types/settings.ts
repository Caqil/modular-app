export type {
  // Add specific setting types when they exist in core
} from '@modular-app/core';

import { apiClient } from './api';

// Admin settings API
export class SettingsAPI {
  static async getSettings(group?: string): Promise<Record<string, any>> {
    const params = group ? { group } : {};
    return apiClient.get('/settings', params);
  }

  static async getSetting(key: string): Promise<{ key: string; value: any }> {
    return apiClient.get(`/settings/${key}`);
  }

  static async updateSetting(key: string, value: any): Promise<{ success: boolean }> {
    return apiClient.put(`/settings/${key}`, { value });
  }

  static async updateSettings(settings: Record<string, any>): Promise<{ success: boolean }> {
    return apiClient.put('/settings', settings);
  }

  static async deleteSetting(key: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/settings/${key}`);
  }

  static async exportSettings(): Promise<Blob> {
    return apiClient.download('/settings/export', 'settings.json');
  }

  static async importSettings(file: File): Promise<{ success: boolean; imported: number }> {
    return apiClient.upload('/settings/import', file);
  }

  static async resetSettings(group?: string): Promise<{ success: boolean }> {
    return apiClient.post('/settings/reset', { group });
  }
}

// Settings utilities
export const SettingsUtils = {
  groupSettings(settings: Record<string, any>): Record<string, Record<string, any>> {
    const grouped: Record<string, Record<string, any>> = {};
    
    Object.entries(settings).forEach(([key, value]) => {
      const parts = key.split('.');
      const group = parts[0] || 'general';
      const settingKey = parts.slice(1).join('.') || key;
      
      if (!grouped[group]) {
        grouped[group] = {};
      }
      
      grouped[group][settingKey] = value;
    });
    
    return grouped;
  },

  flattenSettings(groupedSettings: Record<string, Record<string, any>>): Record<string, any> {
    const flattened: Record<string, any> = {};
    
    Object.entries(groupedSettings).forEach(([group, settings]) => {
      Object.entries(settings).forEach(([key, value]) => {
        flattened[`${group}.${key}`] = value;
      });
    });
    
    return flattened;
  },

  validateSettingValue(value: any, type: string): boolean {
    switch (type) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && value !== null;
      default: return true;
    }
  },
};