'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button,
  Badge,
  ScrollArea,
} from '@modular-app/ui';
import { 
  X,
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
  ChevronRight,
  ChevronDown,
  Home
} from 'lucide-react';
import { ADMIN_CONSTANTS } from '../../lib/constants';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
  userPermissions?: string[];
  onNavigate?: (path: string) => void;
  statistics?: {
    totalUsers?: number;
    totalPosts?: number;
    totalPages?: number;
    totalMedia?: number;
    activePlugins?: number;
    pendingComments?: number;
  };
  siteName?: string;
  siteUrl?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string | undefined;
  children?: NavItem[];
  permission?: string;
}

export function MobileNav({
  isOpen,
  onClose,
  currentPath = '',
  userPermissions = [],
  onNavigate,
  statistics,
  siteName = 'Modular App',
  siteUrl
}: MobileNavProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Close menu when clicking outside or pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Check if user has permission
  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    if (userPermissions.includes('*') || userPermissions.includes('admin:*')) {
      return true;
    }
    return userPermissions.includes(permission);
  };

  // Create navigation items
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: ADMIN_CONSTANTS.ROUTES.DASHBOARD,
    },
    {
      id: 'content',
      label: 'Content',
      icon: <FileText className="h-5 w-5" />,
      permission: ADMIN_CONSTANTS.PERMISSIONS.MANAGE_CONTENT,
      children: [
        {
          id: 'posts',
          label: 'Posts',
          icon: <FileText className="h-4 w-4" />,
          href: ADMIN_CONSTANTS.ROUTES.POSTS,
          badge: statistics?.totalPosts?.toString(),
        },
        {
          id: 'pages',
          label: 'Pages',
          icon: <Folder className="h-4 w-4" />,
          href: ADMIN_CONSTANTS.ROUTES.PAGES,
          badge: statistics?.totalPages?.toString(),
        },
        {
          id: 'comments',
          label: 'Comments',
          icon: <MessageSquare className="h-4 w-4" />,
          href: '/admin/comments',
          badge: statistics?.pendingComments?.toString(),
          permission: ADMIN_CONSTANTS.PERMISSIONS.MANAGE_COMMENTS,
        },
        {
          id: 'categories',
          label: 'Categories',
          icon: <Tags className="h-4 w-4" />,
          href: '/admin/categories',
        },
      ],
    },
    {
      id: 'media',
      label: 'Media',
      icon: <Images className="h-5 w-5" />,
      href: ADMIN_CONSTANTS.ROUTES.MEDIA,
      badge: statistics?.totalMedia?.toString(),
      permission: ADMIN_CONSTANTS.PERMISSIONS.MANAGE_MEDIA,
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="h-5 w-5" />,
      permission: ADMIN_CONSTANTS.PERMISSIONS.MANAGE_USERS,
      children: [
        {
          id: 'all-users',
          label: 'All Users',
          icon: <Users className="h-4 w-4" />,
          href: ADMIN_CONSTANTS.ROUTES.USERS,
          badge: statistics?.totalUsers?.toString(),
        },
        {
          id: 'roles',
          label: 'Roles & Permissions',
          icon: <Shield className="h-4 w-4" />,
          href: '/admin/users/roles',
        },
      ],
    },
    {
      id: 'plugins',
      label: 'Plugins',
      icon: <Puzzle className="h-5 w-5" />,
      permission: ADMIN_CONSTANTS.PERMISSIONS.MANAGE_PLUGINS,
      children: [
        {
          id: 'installed-plugins',
          label: 'Installed Plugins',
          icon: <Puzzle className="h-4 w-4" />,
          href: ADMIN_CONSTANTS.ROUTES.PLUGINS,
          badge: statistics?.activePlugins?.toString(),
        },
        {
          id: 'plugin-marketplace',
          label: 'Marketplace',
          icon: <Globe className="h-4 w-4" />,
          href: '/admin/plugins/marketplace',
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      href: ADMIN_CONSTANTS.ROUTES.ANALYTICS,
      permission: ADMIN_CONSTANTS.PERMISSIONS.VIEW_ANALYTICS,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      permission: ADMIN_CONSTANTS.PERMISSIONS.MANAGE_SETTINGS,
      children: [
        {
          id: 'general-settings',
          label: 'General',
          icon: <Settings className="h-4 w-4" />,
          href: ADMIN_CONSTANTS.ROUTES.SETTINGS,
        },
        {
          id: 'email-settings',
          label: 'Email',
          icon: <Mail className="h-4 w-4" />,
          href: '/admin/settings/email',
        },
        {
          id: 'performance-settings',
          label: 'Performance',
          icon: <Zap className="h-4 w-4" />,
          href: '/admin/settings/performance',
        },
        {
          id: 'security-settings',
          label: 'Security',
          icon: <Shield className="h-4 w-4" />,
          href: '/admin/settings/security',
        },
        {
          id: 'database-settings',
          label: 'Database',
          icon: <Database className="h-4 w-4" />,
          href: '/admin/settings/database',
        },
      ],
    },
  ];

  const handleItemClick = (item: NavItem) => {
    if (item.children) {
      // Toggle expansion for parent items
      setExpandedItems(prev =>
        prev.includes(item.id)
          ? prev.filter(id => id !== item.id)
          : [...prev, item.id]
      );
    } else if (item.href) {
      // Navigate and close menu
      onNavigate?.(item.href);
      onClose();
    }
  };

  const handleSiteNavigation = () => {
    if (siteUrl) {
      window.open(siteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    if (!hasPermission(item.permission)) {
      return null;
    }

    const isActive = item.href === currentPath;
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <button
          onClick={() => handleItemClick(item)}
          className={`w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors ${
            isActive ? 'bg-primary/10 text-primary border-r-2 border-primary' : ''
          } ${level > 0 ? 'pl-6' : ''}`}
        >
          <div className="flex items-center gap-3">
            {item.icon}
            <span className="font-medium">{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </div>
          
          {hasChildren && (
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="bg-muted/25">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
      />

      {/* Mobile Navigation Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 bg-background border-r shadow-lg md:hidden transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">M</span>
              </div>
              <span className="font-semibold text-lg">{siteName}</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close menu</span>
            </Button>
          </div>

          {/* Site Link */}
          {siteUrl && (
            <div className="p-4 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSiteNavigation}
                className="w-full justify-start"
              >
                <Home className="h-4 w-4 mr-2" />
                View Site
              </Button>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <nav className="p-2">
              {navItems.map(item => renderNavItem(item))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-4 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                onNavigate?.('/admin/help');
                onClose();
              }}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Help & Support
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Modular App v2.0.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}