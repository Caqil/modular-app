import { useState, useCallback } from 'react';
import type { PluginRecord } from '@modular-app/core';
import { PluginsAPI } from '../types/plugins';
import { AdminPlugins } from '../lib/plugins';
import { PluginStatus } from '@modular-app/core/types/plugin';

interface PluginState {
  plugins: PluginRecord[];
  isLoading: boolean;
  error: string | null;
}

export const usePlugins = () => {
  const [state, setState] = useState<PluginState>({
    plugins: [],
    isLoading: false,
    error: null,
  });

  const fetchPlugins = useCallback(async (options?: Parameters<typeof PluginsAPI.getPlugins>[0]) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await PluginsAPI.getPlugins(options);
      setState(prev => ({ 
        ...prev, 
        plugins: response.data,
        isLoading: false 
      }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch plugins';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, []);

 const activatePlugin = useCallback(async (id: string) => {
    try {
      await PluginsAPI.activatePlugin(id);
      setState(prev => ({ 
        ...prev, 
        plugins: prev.plugins.map(p => 
          p._id.toString() === id ? { ...p, status: PluginStatus.ACTIVE } : p
        )
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  const deactivatePlugin = useCallback(async (id: string) => {
    try {
      await PluginsAPI.deactivatePlugin(id);
      setState(prev => ({ 
        ...prev, 
        plugins: prev.plugins.map(p => 
          p._id.toString() === id ? { ...p, status: PluginStatus.INACTIVE } : p
        )
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  const installPlugin = useCallback(async (file: File, options?: Parameters<typeof PluginsAPI.installPlugin>[1]) => {
    try {
      const response = await PluginsAPI.installPlugin(file, options);
      setState(prev => ({ 
        ...prev, 
        plugins: [...prev.plugins, response.plugin]
      }));
      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  const uninstallPlugin = useCallback(async (id: string, removeData = false) => {
    try {
      await PluginsAPI.uninstallPlugin(id, removeData);
      setState(prev => ({ 
        ...prev, 
        plugins: prev.plugins.filter(p => p._id.toString() !== id)
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  const updatePluginSettings = useCallback(async (id: string, settings: Record<string, any>) => {
    try {
      const response = await PluginsAPI.updatePluginSettings(id, settings);
      setState(prev => ({ 
        ...prev, 
        plugins: prev.plugins.map(p => 
          p._id.toString() === id ? { ...p, settings: response.settings } : p
        )
      }));
      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  // Helper functions using admin utilities
  const getPluginStatusBadge = useCallback((plugin: PluginRecord) => {
    return AdminPlugins.getStatusBadge(plugin.status);
  }, []);

  const getAvailableActions = useCallback((plugin: PluginRecord) => {
    return AdminPlugins.getAvailableActions(plugin);
  }, []);

  const canActivate = useCallback((plugin: PluginRecord) => {
    return AdminPlugins.canActivate(plugin);
  }, []);

  const canDeactivate = useCallback((plugin: PluginRecord) => {
    return AdminPlugins.canDeactivate(plugin);
  }, []);

  const canUninstall = useCallback((plugin: PluginRecord) => {
    return AdminPlugins.canUninstall(plugin);
  }, []);

  return {
    ...state,
    fetchPlugins,
    activatePlugin,
    deactivatePlugin,
    installPlugin,
    uninstallPlugin,
    updatePluginSettings,
    getPluginStatusBadge,
    getAvailableActions,
    canActivate,
    canDeactivate,
    canUninstall,
  };
};