'use client';

import React from 'react';
import { 
  Button,
  Badge,
  Input,
} from '@modular-app/ui';
import { 
  Menu,
  Search,
  Bell,
  Settings,
  Sun,
  Moon,
  Monitor,
  Palette,
  Globe
} from 'lucide-react';
import { ADMIN_CONSTANTS } from '../../lib/constants';
import { UserNav } from './user-nav';

interface AdminHeaderProps {
  onMenuToggle?: () => void;
  isSidebarCollapsed?: boolean;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  notifications?: {
    count: number;
    items: Array<{
      id: string;
      title: string;
      message: string;
      type: 'info' | 'warning' | 'error' | 'success';
      timestamp: Date;
      read: boolean;
    }>;
  };
  currentTheme?: 'light' | 'dark' | 'auto';
  onThemeChange?: (theme: 'light' | 'dark' | 'auto') => void;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  siteName?: string;
  siteUrl?: string;
}

export function AdminHeader({
  onMenuToggle,
  isSidebarCollapsed = false,
  showSearch = true,
  onSearch,
  notifications,
  currentTheme = 'auto',
  onThemeChange,
  user,
  siteName = 'Modular App',
  siteUrl
}: AdminHeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showThemeMenu, setShowThemeMenu] = React.useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Optional: debounced search
    onSearch?.(e.target.value);
  };

  const getThemeIcon = () => {
    switch (currentTheme) {
      case 'light': return <Sun className="h-4 w-4" />;
      case 'dark': return <Moon className="h-4 w-4" />;
      case 'auto': return <Monitor className="h-4 w-4" />;
      default: return <Palette className="h-4 w-4" />;
    }
  };

  const unreadNotifications = notifications?.items.filter(n => !n.read).length || 0;

  return (
    <header 
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ height: ADMIN_CONSTANTS.HEADER_HEIGHT }}
    >
      <div className="flex h-full items-center px-4">
        {/* Left Section - Menu Toggle & Logo */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            {siteUrl ? (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">M</span>
                </div>
                <span className="font-semibold text-lg hidden sm:block">{siteName}</span>
              </a>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">M</span>
                </div>
                <span className="font-semibold text-lg hidden sm:block">{siteName}</span>
              </div>
            )}
            
            {siteUrl && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hidden lg:flex"
              >
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  View Site
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Center Section - Search */}
        {showSearch && (
          <div className="flex-1 mx-6 max-w-md">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Search admin..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 w-full"
                />
              </div>
            </form>
          </div>
        )}

        {/* Right Section - Actions & User */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="gap-2"
            >
              {getThemeIcon()}
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            {showThemeMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowThemeMenu(false)}
                />
                <div className="absolute right-0 top-10 z-20 w-48 bg-white border rounded-md shadow-lg py-1">
                  <button
                    onClick={() => {
                      onThemeChange?.('light');
                      setShowThemeMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </button>
                  <button
                    onClick={() => {
                      onThemeChange?.('dark');
                      setShowThemeMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </button>
                  <button
                    onClick={() => {
                      onThemeChange?.('auto');
                      setShowThemeMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    System
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Badge>
              )}
              <span className="sr-only">
                {unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : 'Notifications'}
              </span>
            </Button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 top-10 z-20 w-80 bg-white border rounded-md shadow-lg max-h-96 overflow-y-auto">
                  <div className="p-4 border-b">
                    <h3 className="font-medium flex items-center justify-between">
                      Notifications
                      {unreadNotifications > 0 && (
                        <Badge variant="secondary">
                          {unreadNotifications} new
                        </Badge>
                      )}
                    </h3>
                  </div>
                  
                  {notifications?.items && notifications.items.length > 0 ? (
                    <div className="divide-y">
                      {notifications.items.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-muted/50 cursor-pointer ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              notification.type === 'error' ? 'bg-red-500' :
                              notification.type === 'warning' ? 'bg-yellow-500' :
                              notification.type === 'success' ? 'bg-green-500' :
                              'bg-blue-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{notification.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {notification.timestamp.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  )}
                  
                  {notifications?.items && notifications.items.length > 10 && (
                    <div className="p-4 border-t text-center">
                      <Button variant="ghost" size="sm">
                        View all notifications
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href={ADMIN_CONSTANTS.ROUTES.SETTINGS}>
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </a>
          </Button>

          {/* User Navigation */}
          {user && <UserNav user={user} />}
        </div>
      </div>
    </header>
  );
}