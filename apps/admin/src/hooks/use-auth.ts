
import { useState, useEffect, useCallback } from 'react';
import { AuthManager } from '@modular-app/core';
import type { UserProfile, AuthToken } from '@modular-app/core';
import { AuthAPI } from '../types/auth';
import { AdminAuth } from '../lib/auth';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Check initial auth state
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const user = await AuthAPI.me();
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      localStorage.removeItem('auth_token');
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }, []);

  const login = useCallback(async (credentials: Parameters<typeof AuthAPI.login>[0]) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await AuthAPI.login(credentials);
      localStorage.setItem('auth_token', response.token.accessToken);
      
      setState({
        user: response.user,
        token: response.token.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthAPI.logout();
    } catch (error) {
      // Log error but continue with logout
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const response = await AuthAPI.refreshToken();
      localStorage.setItem('auth_token', response.accessToken);
      setState(prev => ({ ...prev, token: response.accessToken }));
      return response;
    } catch (error) {
      await logout();
      throw error;
    }
  }, [logout]);

  // Helper functions using admin utilities
  const canAccessAdmin = useCallback(() => {
    return state.user ? AdminAuth.canAccessAdmin(state.user) : false;
  }, [state.user]);

  const isAdmin = useCallback(() => {
    return state.user ? AdminAuth.isAdmin(state.user) : false;
  }, [state.user]);

  const getUserDisplayName = useCallback(() => {
    return state.user ? AdminAuth.getUserDisplayName(state.user) : '';
  }, [state.user]);

  return {
    ...state,
    login,
    logout,
    refreshToken,
    canAccessAdmin,
    isAdmin,
    getUserDisplayName,
    checkAuthState,
  };
};
