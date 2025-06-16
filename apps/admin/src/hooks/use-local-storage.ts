import { useState, useEffect, useCallback } from 'react';

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  // Get initial value from localStorage or use provided initial value
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  // Remove item from localStorage
  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      window.localStorage.removeItem(key);
      setValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [value, setValue, removeValue] as const;
};

// Specific hooks for common admin storage needs
export const useAdminPreferences = () => {
  return useLocalStorage('admin_preferences', {
    theme: 'light' as 'light' | 'dark' | 'auto',
    sidebarCollapsed: false,
    pageSize: 20,
    language: 'en',
  });
};

export const useRecentItems = (type: string) => {
  return useLocalStorage(`admin_recent_${type}`, [] as string[]);
};

export const useDraftContent = (contentId?: string) => {
  const key = contentId ? `admin_draft_${contentId}` : 'admin_draft_new';
  return useLocalStorage(key, {
    title: '',
    content: '',
    lastSaved: Date.now(),
  });
};