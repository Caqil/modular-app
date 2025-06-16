import React, { createContext, useContext, ReactNode } from 'react';
import { usePlugins } from '../hooks/use-plugins';

type PluginContextType = ReturnType<typeof usePlugins>;

const PluginContext = createContext<PluginContextType | null>(null);

interface PluginProviderProps {
  children: ReactNode;
}

export const PluginProvider: React.FC<PluginProviderProps> = ({ children }) => {
  const plugins = usePlugins();

  return (
    <PluginContext.Provider value={plugins}>
      {children}
    </PluginContext.Provider>
  );
};

export const usePluginContext = () => {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePluginContext must be used within a PluginProvider');
  }
  return context;
};
