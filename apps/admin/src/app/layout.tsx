'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '../components/layout/admin-sidebar';
import { AdminHeader } from '../components/layout/admin-header';
import { MobileNav } from '../components/layout/mobile-nav';
import { ErrorBoundary } from '@modular-app/ui';
import { ADMIN_CONSTANTS } from '../lib/constants';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  role: string;
  permissions: string[];
}

interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalPages: number;
  totalMedia: number;
  activePlugins: number;
  pendingComments: number;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  // State management
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [statistics, setStatistics] = useState<AdminStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalPages: 0,
    totalMedia: 0,
    activePlugins: 0,
    pendingComments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    timestamp: Date;
    read: boolean;
  }>>([]);

  const router = useRouter();
  const pathname = usePathname();

  // Initialize layout data
  useEffect(() => {
    const initializeLayout = async () => {
      try {
        setLoading(true);
        
        // Simulate API calls to fetch user data and statistics
        // In a real app, these would be actual API calls
        await Promise.all([
          fetchCurrentUser(),
          fetchDashboardStatistics(),
          fetchNotifications(),
          loadUserPreferences(),
        ]);
      } catch (error) {
        console.error('Failed to initialize admin layout:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeLayout();
  }, []);

  // Mock API functions (replace with actual API calls)
  const fetchCurrentUser = async (): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setUser({
      id: '1',
      username: 'admin',
      email: 'admin@modularapp.com',
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'Admin User',
      avatar: '/avatars/admin.jpg',
      role: 'super_admin',
      permissions: ['*'], // Super admin has all permissions
    });
  };

  const fetchDashboardStatistics = async (): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setStatistics({
      totalUsers: 1247,
      totalPosts: 89,
      totalPages: 12,
      totalMedia: 156,
      activePlugins: 8,
      pendingComments: 3,
    });
  };

  const fetchNotifications = async (): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setNotifications([
      {
        id: '1',
        title: 'New Comment',
        message: 'A new comment is awaiting moderation',
        type: 'info',
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        read: false,
      },
      {
        id: '2',
        title: 'Plugin Update',
        message: 'Blog Plugin has an available update',
        type: 'warning',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        read: false,
      },
      {
        id: '3',
        title: 'Backup Complete',
        message: 'Daily backup completed successfully',
        type: 'success',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        read: true,
      },
    ]);
  };

  const loadUserPreferences = async (): Promise<void> => {
    // Load theme from localStorage or user preferences
    const savedTheme = localStorage.getItem('admin-theme') as 'light' | 'dark' | 'auto';
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Load sidebar state from localStorage
    const savedSidebarState = localStorage.getItem('admin-sidebar-collapsed');
    if (savedSidebarState) {
      setSidebarCollapsed(JSON.parse(savedSidebarState));
    }
  };

  // Event handlers
  const handleSidebarToggle = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(newState));
  };

  const handleMobileNavToggle = () => {
    setMobileNavOpen(!mobileNavOpen);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileNavOpen(false); // Close mobile nav on navigation
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    localStorage.setItem('admin-theme', newTheme);
    
    // Apply theme to document
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto theme - check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleUserLogout = async () => {
    try {
      // Simulate logout API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear user data and redirect to login
      setUser(null);
      localStorage.removeItem('admin-theme');
      localStorage.removeItem('admin-sidebar-collapsed');
      
      // In a real app, this would redirect to the login page
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNotificationRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  };

  // Apply theme on mount and when theme changes
  useEffect(() => {
    handleThemeChange(theme);
  }, [theme]);

  // Handle system theme changes when in auto mode
  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => handleThemeChange('auto');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    return undefined;
  }, [theme]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar */}
        <div 
          className={`hidden md:flex transition-all duration-200 ${
            sidebarCollapsed ? 'w-16' : 'w-[280px]'
          }`}
        >
          <AdminSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleSidebarToggle}
            currentPath={pathname}
            userPermissions={user.permissions}
            statistics={statistics}
            onNavigate={handleNavigation}
          />
        </div>

        {/* Mobile Navigation */}
        <MobileNav
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          currentPath={pathname}
          userPermissions={user.permissions}
          statistics={statistics}
          onNavigate={handleNavigation}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <AdminHeader
            user={user}
            theme={theme}
            sidebarCollapsed={sidebarCollapsed}
            notifications={{
              count: notifications.length,
              items: notifications,
            }}
            unreadNotifications={unreadNotificationCount}
            onThemeChange={handleThemeChange}
            onMobileNavToggle={handleMobileNavToggle}
            onUserLogout={handleUserLogout}
            onNotificationRead={handleNotificationRead}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}