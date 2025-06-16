export {
  PluginManager,
} from '@modular-app/core';

// Import plugin types
export type {
  Plugin,
  PluginManifest,
  PluginStatus,
  PluginCapability,
  PluginRecord,
} from '@modular-app/core';

// Admin-specific plugin utilities
export const AdminPlugins = {
  /**
   * Get plugin status badge info for UI
   */
  getStatusBadge(status: import('@modular-app/core').PluginStatus): {
    color: string;
    text: string;
    icon?: string;
  } {
    const badges = {
      'active': { 
        color: 'bg-green-100 text-green-800', 
        text: 'Active',
        icon: '✅'
      },
      'inactive': { 
        color: 'bg-gray-100 text-gray-800', 
        text: 'Inactive',
        icon: '⏸️'
      },
      'installed': { 
        color: 'bg-blue-100 text-blue-800', 
        text: 'Installed',
        icon: '📦'
      },
      'error': { 
        color: 'bg-red-100 text-red-800', 
        text: 'Error',
        icon: '❌'
      },
      'updating': { 
        color: 'bg-yellow-100 text-yellow-800', 
        text: 'Updating',
        icon: '🔄'
      },
      'uninstalling': { 
        color: 'bg-orange-100 text-orange-800', 
        text: 'Uninstalling',
        icon: '🗑️'
      },
    };
    
    return badges[status] || badges.inactive;
  },

  /**
   * Format plugin capabilities for display
   */
  formatCapabilities(capabilities: import('@modular-app/core').PluginCapability[]): string {
    return capabilities
      .map(cap => cap.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
      .join(', ');
  },

  /**
   * Get capability icon
   */
  getCapabilityIcon(capability: import('@modular-app/core').PluginCapability): string {
    const icons = {
      'content-management': '📝',
      'frontend-rendering': '🎨',
      'admin-interface': '⚙️',
      'api-endpoints': '🔌',
      'webhooks': '🪝',
      'custom-fields': '📋',
      'widgets': '🧩',
      'shortcodes': '🏷️',
      'blocks': '🧱',
      'authentication': '🔐',
      'caching': '⚡',
      'seo': '🔍',
      'analytics': '📊',
      'ecommerce': '🛒',
      'forms': '📄',
      'media': '🖼️',
      'social': '📱',
      'performance': '🚀',
      'security': '🛡️',
    };
    return icons[capability] || '🔧';
  },

  /**
   * Check if plugin can be activated
   */
  canActivate(plugin: import('@modular-app/core').PluginRecord): boolean {
    return plugin.status === 'installed' || plugin.status === 'inactive';
  },

  /**
   * Check if plugin can be deactivated
   */
  canDeactivate(plugin: import('@modular-app/core').PluginRecord): boolean {
    return plugin.status === 'active';
  },

  /**
   * Check if plugin can be uninstalled
   */
  canUninstall(plugin: import('@modular-app/core').PluginRecord): boolean {
    return plugin.status !== 'active';
  },

  /**
   * Get plugin actions based on status
   */
  getAvailableActions(
    plugin: import('@modular-app/core').PluginRecord
  ): (
    | 'activate'
    | 'deactivate'
    | 'uninstall'
    | 'settings'
    | 'details'
  )[] {
    const actions: (
      | 'activate'
      | 'deactivate'
      | 'uninstall'
      | 'settings'
      | 'details'
    )[] = [];
    
    if (this.canActivate(plugin)) actions.push('activate');
    if (this.canDeactivate(plugin)) actions.push('deactivate');
    if (this.canUninstall(plugin)) actions.push('uninstall');
    if (plugin.status === 'active') actions.push('settings');
    
    actions.push('details');
    
    return actions;
  },
};