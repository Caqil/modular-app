import { useState, useEffect } from 'react';
import { useThemeSettings } from './use-theme-settings';

interface CustomizationPreview {
  isActive: boolean;
  changes: Record<string, any>;
  originalSettings: Record<string, any>;
}

interface UseCustomizationReturn {
  preview: CustomizationPreview;
  startPreview: () => void;
  updatePreview: (key: string, value: any) => void;
  applyChanges: () => Promise<void>;
  discardChanges: () => void;
  isPreviewMode: boolean;
}

export function useCustomization(): UseCustomizationReturn {
  const { settings, updateSetting } = useThemeSettings();
  const [preview, setPreview] = useState<CustomizationPreview>({
    isActive: false,
    changes: {},
    originalSettings: {},
  });

  const isPreviewMode = preview.isActive;

  useEffect(() => {
    // Listen for customizer messages from parent frame (if in iframe)
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const { type, data } = event.data;

      switch (type) {
        case 'customizer:start_preview':
          startPreview();
          break;
        case 'customizer:update_preview':
          updatePreview(data.key, data.value);
          break;
        case 'customizer:apply_changes':
          applyChanges();
          break;
        case 'customizer:discard_changes':
          discardChanges();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const startPreview = () => {
    setPreview({
      isActive: true,
      changes: {},
      originalSettings: { ...settings },
    });

    // Add preview mode indicator
    document.body.classList.add('customizer-preview-mode');
    
    // Notify parent frame
    window.parent?.postMessage({
      type: 'customizer:preview_started',
    }, window.location.origin);
  };

  const updatePreview = (key: string, value: any) => {
    if (!preview.isActive) return;

    setPreview(prev => ({
      ...prev,
      changes: { ...prev.changes, [key]: value },
    }));

    // Apply the change temporarily
    applyCSSVariables({ ...settings, [key]: value });
    
    // Store change in session storage for persistence across page refreshes
    const previewData = JSON.parse(sessionStorage.getItem('customizer_preview') || '{}');
    previewData[key] = value;
    sessionStorage.setItem('customizer_preview', JSON.stringify(previewData));

    // Notify parent frame of change
    window.parent?.postMessage({
      type: 'customizer:preview_updated',
      data: { key, value },
    }, window.location.origin);
  };

  const applyChanges = async () => {
    if (!preview.isActive) return;

    try {
      // Apply all changes to actual settings
      for (const [key, value] of Object.entries(preview.changes)) {
        await updateSetting(key, value);
      }

      // Clear preview mode
      setPreview({
        isActive: false,
        changes: {},
        originalSettings: {},
      });

      document.body.classList.remove('customizer-preview-mode');
      sessionStorage.removeItem('customizer_preview');

      // Notify parent frame
      window.parent?.postMessage({
        type: 'customizer:changes_applied',
      }, window.location.origin);

    } catch (error) {
      console.error('Error applying customizer changes:', error);
      
      window.parent?.postMessage({
        type: 'customizer:error',
        data: { message: 'Failed to apply changes' },
      }, window.location.origin);
    }
  };

  const discardChanges = () => {
    if (!preview.isActive) return;

    // Restore original settings
    applyCSSVariables(preview.originalSettings);

    setPreview({
      isActive: false,
      changes: {},
      originalSettings: {},
    });

    document.body.classList.remove('customizer-preview-mode');
    sessionStorage.removeItem('customizer_preview');

    // Notify parent frame
    window.parent?.postMessage({
      type: 'customizer:changes_discarded',
    }, window.location.origin);
  };

  // Load preview data on page load (for when customizer is refreshed)
  useEffect(() => {
    const previewData = sessionStorage.getItem('customizer_preview');
    if (previewData) {
      try {
        const changes = JSON.parse(previewData);
        setPreview({
          isActive: true,
          changes,
          originalSettings: { ...settings },
        });
        
        // Apply preview changes
        applyCSSVariables({ ...settings, ...changes });
        document.body.classList.add('customizer-preview-mode');
        
      } catch (error) {
        console.error('Error loading preview data:', error);
        sessionStorage.removeItem('customizer_preview');
      }
    }
  }, [settings]);

  return {
    preview,
    startPreview,
    updatePreview,
    applyChanges,
    discardChanges,
    isPreviewMode,
  };
}

// Apply CSS custom properties
function applyCSSVariables(settings: Record<string, any>) {
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