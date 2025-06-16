import { useState, useEffect } from 'react';
import { ThemeSettings } from '@modular-app/core/types/theme';
import defaultSettings from '../customizer/default';

interface UseThemeSettingsReturn {
  settings: ThemeSettings;
  updateSetting: (key: string, value: any) => void;
  resetSettings: () => void;
  isLoading: boolean;
  error: string | null;
}

export function useThemeSettings(): UseThemeSettingsReturn {
  const [settings, setSettings] = useState<ThemeSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch theme settings from API
      const response = await fetch('/api/themes/default/settings');
      
      if (!response.ok) {
        throw new Error('Failed to load theme settings');
      }

      const data = await response.json();
      
      // Merge with defaults to ensure all settings exist
      const mergedSettings = { ...defaultSettings, ...data };
      setSettings(mergedSettings);
      
      // Apply CSS custom properties for real-time updates
      applyCSSVariables(mergedSettings);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading theme settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      // Optimistic update
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      
      // Apply CSS variables immediately for postMessage transport
      applyCSSVariables(updatedSettings);

      // Save to server
      const response = await fetch('/api/themes/default/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to save setting');
      }

      // Trigger any necessary refreshes based on transport type
      const settingConfig = getSettingConfig(key);
      if (settingConfig?.transport === 'refresh') {
        window.location.reload();
      }

    } catch (err) {
      // Revert optimistic update on error
      setSettings(settings);
      setError(err instanceof Error ? err.message : 'Failed to update setting');
      console.error('Error updating setting:', err);
    }
  };

  const resetSettings = async () => {
    try {
      setSettings(defaultSettings);
      applyCSSVariables(defaultSettings);

      const response = await fetch('/api/themes/default/settings', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to reset settings');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
      console.error('Error resetting settings:', err);
    }
  };

  return {
    settings,
    updateSetting,
    resetSettings,
    isLoading,
    error,
  };
}

// Apply CSS custom properties for real-time updates
function applyCSSVariables(settings: ThemeSettings) {
  const root = document.documentElement;

  // Colors
  if (settings.primary_color) {
    root.style.setProperty('--theme-primary', settings.primary_color);
  }
  if (settings.secondary_color) {
    root.style.setProperty('--theme-secondary', settings.secondary_color);
  }
  if (settings.link_color) {
    root.style.setProperty('--theme-link', settings.link_color);
  }
  if (settings.text_color) {
    root.style.setProperty('--theme-text', settings.text_color);
  }
  if (settings.background_color) {
    root.style.setProperty('--theme-background', settings.background_color);
  }
  if (settings.header_background_color) {
    root.style.setProperty('--theme-header-bg', settings.header_background_color);
  }
  if (settings.footer_background_color) {
    root.style.setProperty('--theme-footer-bg', settings.footer_background_color);
  }
  if (settings.footer_text_color) {
    root.style.setProperty('--theme-footer-text', settings.footer_text_color);
  }

  // Typography
  if (settings.heading_font_family) {
    root.style.setProperty('--theme-font-heading', settings.heading_font_family);
  }
  if (settings.body_font_family) {
    root.style.setProperty('--theme-font-body', settings.body_font_family);
  }
  if (settings.font_size_base) {
    root.style.setProperty('--theme-font-size', `${settings.font_size_base}px`);
  }
  if (settings.line_height_base) {
    root.style.setProperty('--theme-line-height', settings.line_height_base.toString());
  }

  // Layout
  if (settings.container_width) {
    root.style.setProperty('--theme-container-width', `${settings.container_width}px`);
  }
  if (settings.sidebar_width) {
    root.style.setProperty('--theme-sidebar-width', `${settings.sidebar_width}%`);
  }
  if (settings.content_spacing) {
    root.style.setProperty('--theme-spacing', `${settings.content_spacing}rem`);
  }
  if (settings.logo_width) {
    root.style.setProperty('--theme-logo-width', `${settings.logo_width}px`);
  }
}

// Get setting configuration (would come from customizer config)
function getSettingConfig(key: string) {
  // This would normally come from the customizer configuration
  // For now, return basic config
  const refreshSettings = [
    'header_layout',
    'sidebar_position',
    'footer_layout',
    'blog_layout',
    'header_sticky',
    'enable_comments',
    'lazy_load_images',
    'optimize_fonts',
    'minify_css',
  ];

  return {
    transport: refreshSettings.includes(key) ? 'refresh' : 'postMessage',
  };
}