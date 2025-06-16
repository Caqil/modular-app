import { useState, useCallback } from 'react';
import { SettingsAPI } from '../types/settings';

interface SettingsState {
  settings: Record<string, any>;
  isLoading: boolean;
  error: string | null;
}

export const useSettings = (group?: string) => {
  const [state, setState] = useState<SettingsState>({
    settings: {},
    isLoading: false,
    error: null,
  });

  const fetchSettings = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const settings = await SettingsAPI.getSettings(group);
      setState(prev => ({ 
        ...prev, 
        settings,
        isLoading: false 
      }));
      return settings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch settings';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [group]);

  const updateSetting = useCallback(async (key: string, value: any) => {
    try {
      await SettingsAPI.updateSetting(key, value);
      setState(prev => ({ 
        ...prev, 
        settings: { ...prev.settings, [key]: value }
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  const updateSettings = useCallback(async (settings: Record<string, any>) => {
    try {
      await SettingsAPI.updateSettings(settings);
      setState(prev => ({ 
        ...prev, 
        settings: { ...prev.settings, ...settings }
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  const resetSettings = useCallback(async () => {
    try {
      await SettingsAPI.resetSettings(group);
      await fetchSettings(); // Refresh settings after reset
    } catch (error) {
      throw error;
    }
  }, [group, fetchSettings]);

  const exportSettings = useCallback(async () => {
    try {
      return await SettingsAPI.exportSettings();
    } catch (error) {
      throw error;
    }
  }, []);

  const importSettings = useCallback(async (file: File) => {
    try {
      const response = await SettingsAPI.importSettings(file);
      await fetchSettings(); // Refresh settings after import
      return response;
    } catch (error) {
      throw error;
    }
  }, [fetchSettings]);

  return {
    ...state,
    fetchSettings,
    updateSetting,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
  };
};
