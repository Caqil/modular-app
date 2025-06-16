'use client';

import React from 'react';
import { 
  SidebarNav,
  SidebarHeader,
  SidebarFooter,
  Badge,
  Button,
  type SidebarNavItem,
} from '@modular-app/ui';
import { 
  LayoutDashboard,
  Users,
  FileText,
  Images,
  Puzzle,
  Settings,
  BarChart3,
  MessageSquare,
  Tags,
  Folder,
  Shield,
  Mail,
  Globe,
  Database,
  Zap,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ADMIN_CONSTANTS } from '../../lib/constants';

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  currentPath?: string;
  userPermissions?: string[];
  statistics?: {
    totalUsers?: number;
    totalPosts?: number;
    totalPages?: number;
    totalMedia?: number;
    activePlugins?: number;
    pendingComments?: number;
  };
  onNavigate?: (path: string) => void;
}

export function AdminSidebar({
  collapsed = false,
  onToggleCollapse,
  currentPath = '',
  userPermissions = [],
  statistics,
  onNavigate
}: AdminSidebarProps) {
  // Check if user has permission
  const hasPermission = (permission: string): boolean => {
    if (userPermissions.includes('*') || userPermissions.includes('admin:*')) {
      return true;
    }
    return userPermissions.includes(permission);
  };

  // Create navigation items based on permissions
  const createNavItems = (): SidebarNavItem[] => {
    const items: SidebarNavItem[] = [];

    // Dashboard - always visible
    items.push({
      id: 'dashboard',
      label: 'Dashboard',
      href: ADMIN_CONSTANTS.ROUTES.DASHBOARD,
      icon: <LayoutDashboard className="h-4 w-4" />,
    });

    // Content Management
    if (hasPermission(ADMIN_CONSTANTS.PERMISSIONS.MANAGE_CONTENT)) {
      const contentChildren: SidebarNavItem[] = [];
      
      contentChildren.push({
        id: 'posts',
        label: 'Posts',
        href: ADMIN_CONSTANTS.ROUTES.POSTS,
        icon: <FileText className="h-4 w-4" />,
        ...(statistics?.totalPosts !== undefined && { badge: statistics.totalPosts.toString() }),
      });

      contentChildren.push({
        id: 'pages',
        label: 'Pages',
        href: ADMIN_CONSTANTS.ROUTES.PAGES,
        icon: <Folder className="h-4 w-4" />,
        ...(statistics?.totalPages !== undefined && { badge: statistics.totalPages.toString() }),
      });

      if (hasPermission(ADMIN_CONSTANTS.PERMISSIONS.MANAGE_COMMENTS)) {
        contentChildren.push({
          id: 'comments',
          label: 'Comments',
          href: '/admin/comments',
          icon: <MessageSquare className="h-4 w-4" />,
            ...(statistics?.pendingComments !== undefined && { badge: statistics.pendingComments.toString() }),
        });
      }

      contentChildren.push({
        id: 'categories',
        label: 'Categories',
        href: '/admin/categories',
        icon: <Tags className="h-4 w-4" />,
      });

      items.push({
        id: 'content',
        label: 'Content',
        icon: <FileText className="h-4 w-4" />,
        children: contentChildren,
      });
    }

    // Media Library
    if (hasPermission(ADMIN_CONSTANTS.PERMISSIONS.MANAGE_MEDIA)) {
      items.push({
        id: 'media',
        label: 'Media',
        href: ADMIN_CONSTANTS.ROUTES.MEDIA,
        icon: <Images className="h-4 w-4" />,
        ...(statistics?.totalMedia !== undefined && { badge: statistics?.totalMedia?.toString() }),
      });
    }

    // User Management
    if (hasPermission(ADMIN_CONSTANTS.PERMISSIONS.MANAGE_USERS)) {
      const userChildren: SidebarNavItem[] = [];
      
      userChildren.push({
        id: 'all-users',
        label: 'All Users',
        href: ADMIN_CONSTANTS.ROUTES.USERS,
        icon: <Users className="h-4 w-4" />,
        ...(statistics?.totalUsers !== undefined && { badge: statistics?.totalUsers?.toString() }),
      });

      userChildren.push({
        id: 'roles',
        label: 'Roles & Permissions',
        href: '/admin/users/roles',
        icon: <Shield className="h-4 w-4" />,
      });

      items.push({
        id: 'users',
        label: 'Users',
        icon: <Users className="h-4 w-4" />,
        children: userChildren,
      });
    }

    // Plugin Management
    if (hasPermission(ADMIN_CONSTANTS.PERMISSIONS.MANAGE_PLUGINS)) {
      const pluginChildren: SidebarNavItem[] = [];
      
      pluginChildren.push({
        id: 'installed-plugins',
        label: 'Installed Plugins',
        href: ADMIN_CONSTANTS.ROUTES.PLUGINS,
        icon: <Puzzle className="h-4 w-4" />,
        ...(statistics?.activePlugins !== undefined && { badge: statistics?.activePlugins?.toString() }),
      });

      pluginChildren.push({
        id: 'plugin-marketplace',
        label: 'Marketplace',
        href: '/admin/plugins/marketplace',
        icon: <Globe className="h-4 w-4" />,
      });

      items.push({
        id: 'plugins',
        label: 'Plugins',
        icon: <Puzzle className="h-4 w-4" />,
        children: pluginChildren,
      });
    }

    // Analytics
    if (hasPermission(ADMIN_CONSTANTS.PERMISSIONS.VIEW_ANALYTICS)) {
      items.push({
        id: 'analytics',
        label: 'Analytics',
        href: ADMIN_CONSTANTS.ROUTES.ANALYTICS,
        icon: <BarChart3 className="h-4 w-4" />,
      });
    }

    // Settings
    if (hasPermission(ADMIN_CONSTANTS.PERMISSIONS.MANAGE_SETTINGS)) {
      const settingsChildren: SidebarNavItem[] = [];
      
      settingsChildren.push({
        id: 'general-settings',
        label: 'General',
        href: ADMIN_CONSTANTS.ROUTES.SETTINGS,
        icon: <Settings className="h-4 w-4" />,
      });

      settingsChildren.push({
        id: 'email-settings',
        label: 'Email',
        href: '/admin/settings/email',
        icon: <Mail className="h-4 w-4" />,
      });

      settingsChildren.push({
        id: 'performance-settings',
        label: 'Performance',
        href: '/admin/settings/performance',
        icon: <Zap className="h-4 w-4" />,
      });

      settingsChildren.push({
        id: 'security-settings',
        label: 'Security',
        href: '/admin/settings/security',
        icon: <Shield className="h-4 w-4" />,
      });

      settingsChildren.push({
        id: 'database-settings',
        label: 'Database',
        href: '/admin/settings/database',
        icon: <Database className="h-4 w-4" />,
      });

      items.push({
        id: 'settings',
        label: 'Settings',
        icon: <Settings className="h-4 w-4" />,
        children: settingsChildren,
      });
    }

    return items;
  };

  const navItems = createNavItems();

  const handleItemClick = (item: SidebarNavItem) => {
    if (item.href) {
      onNavigate?.(item.href);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r">
      {/* Header */}
      <SidebarHeader
        title={!collapsed ? "Admin Panel" : ""}
        collapsed={collapsed}
        className="flex items-center justify-between"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="ml-auto"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
          <span className="sr-only">
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </span>
        </Button>
      </SidebarHeader>

      {/* Navigation */}
      <div className="flex-1 overflow-auto">
        <SidebarNav
          items={navItems}
          collapsed={collapsed}
          activeItemId={currentPath}
          onItemClick={handleItemClick}
          className="border-none"
        />
      </div>

      {/* Footer */}
      <SidebarFooter className="border-t">
        <div className="space-y-2">
          {/* Help & Documentation */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <a
              href="/admin/help"
              className="flex items-center gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              {!collapsed && <span>Help & Support</span>}
            </a>
          </Button>

          {/* External Links */}
          {!collapsed && (
            <div className="pt-2 border-t space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                asChild
              >
                <a
                  href="https://docs.modularapp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Documentation
                </a>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                asChild
              >
                <a
                  href="https://community.modularapp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Community
                </a>
              </Button>
            </div>
          )}

          {/* Version Info */}
          {!collapsed && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Modular App v2.0.0
              </p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </div>
  );
}