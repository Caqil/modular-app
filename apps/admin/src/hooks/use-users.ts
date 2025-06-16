import { useState, useCallback } from 'react';
import type { UserProfile, UserStats } from '@modular-app/core';
import { UsersAPI } from '../types/users';
import { AdminAuth } from '../lib/auth';

interface UsersState {
  users: UserProfile[];
  stats: UserStats | null;
  isLoading: boolean;
  error: string | null;
}

export const useUsers = () => {
  const [state, setState] = useState<UsersState>({
    users: [],
    stats: null,
    isLoading: false,
    error: null,
  });

  const fetchUsers = useCallback(async (options?: Parameters<typeof UsersAPI.getUsers>[0]) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await UsersAPI.getUsers(options);
      setState(prev => ({ 
        ...prev, 
        users: response.data,
        isLoading: false 
      }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      const stats = await UsersAPI.getUserStats();
      setState(prev => ({ ...prev, stats }));
      return stats;
    } catch (error) {
      throw error;
    }
  }, []);

  const createUser = useCallback(async (data: Parameters<typeof UsersAPI.createUser>[0]) => {
    try {
      const user = await UsersAPI.createUser(data);
      setState(prev => ({ 
        ...prev, 
        users: [...prev.users, user] 
      }));
      return user;
    } catch (error) {
      throw error;
    }
  }, []);

  const updateUser = useCallback(async (id: string, data: Parameters<typeof UsersAPI.updateUser>[1]) => {
    try {
      const user = await UsersAPI.updateUser(id, data);
      setState(prev => ({ 
        ...prev, 
        users: prev.users.map(u => u._id === id ? user : u)
      }));
      return user;
    } catch (error) {
      throw error;
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    try {
      await UsersAPI.deleteUser(id);
      setState(prev => ({ 
        ...prev, 
        users: prev.users.filter(u => u._id !== id)
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    try {
      const users = await UsersAPI.searchUsers(query);
      return users;
    } catch (error) {
      throw error;
    }
  }, []);

  // Helper functions using admin utilities
  const getUserDisplayName = useCallback((user: UserProfile) => {
    return AdminAuth.getUserDisplayName(user);
  }, []);

  const getRoleBadgeColor = useCallback((role: string) => {
    return AdminAuth.getRoleBadgeColor(role);
  }, []);

  const formatLastLogin = useCallback((lastLogin?: Date) => {
    return AdminAuth.formatLastLogin(lastLogin);
  }, []);

  return {
    ...state,
    fetchUsers,
    fetchUserStats,
    createUser,
    updateUser,
    deleteUser,
    searchUsers,
    getUserDisplayName,
    getRoleBadgeColor,
    formatLastLogin,
  };
};