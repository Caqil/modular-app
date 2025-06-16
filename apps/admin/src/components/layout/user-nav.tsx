'use client';

import React, { useState } from 'react';
import { 
  Button,
  Badge,
} from '@modular-app/ui';
import { 
  User,
  Settings,
  LogOut,
  Shield,
  Bell,
  HelpCircle,
  ChevronDown,
  Crown,
  Mail,
  Phone,
  Lock
} from 'lucide-react';
import { ADMIN_CONSTANTS } from '../../lib/constants';

interface UserNavProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean;
    lastLogin?: Date;
  };
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function UserNav({ user, onNavigate, onLogout }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      'super_admin': 'bg-red-100 text-red-800',
      'admin': 'bg-purple-100 text-purple-800',
      'editor': 'bg-blue-100 text-blue-800',
      'author': 'bg-green-100 text-green-800',
      'contributor': 'bg-yellow-100 text-yellow-800',
      'subscriber': 'bg-gray-100 text-gray-800',
    };
    return colors[role as keyof typeof colors] || colors.subscriber;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="h-3 w-3" />;
      case 'admin':
        return <Shield className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const formatRoleName = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatLastLogin = (lastLogin?: Date) => {
    if (!lastLogin) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastLogin.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    
    return lastLogin.toLocaleDateString();
  };

  const handleMenuItemClick = (action: string, path?: string) => {
    setIsOpen(false);
    
    if (action === 'logout') {
      onLogout?.();
    } else if (path) {
      onNavigate?.(path);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="flex items-center gap-2 h-auto py-2 px-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex flex-col items-start min-w-0 hidden md:block">
          <span className="text-sm font-medium truncate max-w-32">
            {user.name}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-32">
            {formatRoleName(user.role)}
          </span>
        </div>

        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-20 w-80 bg-white border rounded-lg shadow-lg overflow-hidden">
            {/* User Info Header */}
            <div className="p-4 bg-muted/25 border-b">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{user.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(user.role)}
                        {formatRoleName(user.role)}
                      </div>
                    </Badge>
                    
                    {/* Verification Status */}
                    <div className="flex items-center gap-1">
                      {user.emailVerified && (
                        <Mail className="h-3 w-3 text-green-600">
                          <title>Email verified</title>
                        </Mail>
                      )}
                      {user.twoFactorEnabled && (
                        <Lock className="h-3 w-3 text-blue-600">
                          <title>2FA enabled</title>
                        </Lock>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Last Login */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Last login: {formatLastLogin(user.lastLogin)}
                </p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <div className="space-y-1">
                {/* Profile */}
                <button
                  onClick={() => handleMenuItemClick('profile', ADMIN_CONSTANTS.ROUTES.PROFILE)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                >
                  <User className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Profile</div>
                    <div className="text-xs text-muted-foreground">
                      Manage your account
                    </div>
                  </div>
                </button>

                {/* Account Settings */}
                <button
                  onClick={() => handleMenuItemClick('settings', '/admin/account/settings')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Account Settings</div>
                    <div className="text-xs text-muted-foreground">
                      Security & preferences
                    </div>
                  </div>
                </button>

                {/* Notifications */}
                <button
                  onClick={() => handleMenuItemClick('notifications', '/admin/account/notifications')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                >
                  <Bell className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Notifications</div>
                    <div className="text-xs text-muted-foreground">
                      Email & push settings
                    </div>
                  </div>
                </button>

                {/* System Settings (Admin only) */}
                {(user.role === 'super_admin' || user.role === 'admin') && (
                  <button
                    onClick={() => handleMenuItemClick('system', ADMIN_CONSTANTS.ROUTES.SETTINGS)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">System Settings</div>
                      <div className="text-xs text-muted-foreground">
                        Site configuration
                      </div>
                    </div>
                  </button>
                )}

                <div className="border-t border-border my-2" />

                {/* Help & Support */}
                <button
                  onClick={() => handleMenuItemClick('help', '/admin/help')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Help & Support</div>
                    <div className="text-xs text-muted-foreground">
                      Documentation & contact
                    </div>
                  </div>
                </button>

                <div className="border-t border-border my-2" />

                {/* Logout */}
                <button
                  onClick={() => handleMenuItemClick('logout')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Sign Out</div>
                    <div className="text-xs text-muted-foreground">
                      Logout from admin panel
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-3 bg-muted/25 border-t">
              <div className="text-xs text-muted-foreground mb-2">Quick Actions</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleMenuItemClick('new-post', '/admin/content/posts/new')}
                >
                  New Post
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleMenuItemClick('new-page', '/admin/content/pages/new')}
                >
                  New Page
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}