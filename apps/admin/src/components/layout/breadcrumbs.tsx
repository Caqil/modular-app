'use client';

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@modular-app/ui';
import { ADMIN_CONSTANTS } from '../../lib/constants';

interface BreadcrumbItem {
  label: string;
  href?: string | undefined;
  icon?: React.ReactNode;
  disabled?: boolean;
  current?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  currentPath?: string;
  onNavigate?: (path: string) => void;
  showHome?: boolean;
  maxItems?: number;
  className?: string;
}

// Route mapping for automatic breadcrumb generation
const ROUTE_MAP: Record<string, { label: string; icon?: React.ReactNode }> = {
  '/admin': { label: 'Dashboard', icon: <Home className="h-3 w-3" /> },
  '/admin/users': { label: 'Users' },
  '/admin/users/new': { label: 'New User' },
  '/admin/users/roles': { label: 'Roles & Permissions' },
  '/admin/content': { label: 'Content' },
  '/admin/content/posts': { label: 'Posts' },
  '/admin/content/posts/new': { label: 'New Post' },
  '/admin/content/pages': { label: 'Pages' },
  '/admin/content/pages/new': { label: 'New Page' },
  '/admin/comments': { label: 'Comments' },
  '/admin/categories': { label: 'Categories' },
  '/admin/media': { label: 'Media Library' },
  '/admin/plugins': { label: 'Plugins' },
  '/admin/plugins/marketplace': { label: 'Marketplace' },
  '/admin/analytics': { label: 'Analytics' },
  '/admin/settings': { label: 'Settings' },
  '/admin/settings/email': { label: 'Email Settings' },
  '/admin/settings/performance': { label: 'Performance' },
  '/admin/settings/security': { label: 'Security' },
  '/admin/settings/database': { label: 'Database' },
  '/admin/profile': { label: 'Profile' },
  '/admin/help': { label: 'Help & Support' },
};

export function Breadcrumbs({
  items,
  currentPath = '',
  onNavigate,
  showHome = true,
  maxItems,
  className = ''
}: BreadcrumbsProps) {
  // Generate breadcrumb items from current path if not provided
  const generateBreadcrumbs = (path: string): BreadcrumbItem[] => {
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add home/dashboard
    if (showHome) {
      breadcrumbs.push({
        label: 'Dashboard',
        href: ADMIN_CONSTANTS.ROUTES.DASHBOARD,
        icon: <Home className="h-3 w-3" />,
      });
    }

    // Build path segments
    let currentSegmentPath = '';
    segments.forEach((segment, index) => {
      currentSegmentPath += `/${segment}`;
      
      const routeInfo = ROUTE_MAP[currentSegmentPath];
      if (routeInfo) {
        const isLast = index === segments.length - 1;
        breadcrumbs.push({
          label: routeInfo.label,
          href: isLast ? undefined : currentSegmentPath,
          icon: routeInfo.icon,
          current: isLast,
        });
      } else {
        // Handle dynamic segments (like IDs)
        const isLast = index === segments.length - 1;
        let label = segment;
        
        // Try to make labels more readable
        if (segment.match(/^[a-f0-9]{24}$/)) {
          // MongoDB ObjectId - show as "Edit" or "View"
          label = isLast ? 'Edit' : 'Item';
        } else {
          // Capitalize and replace hyphens/underscores
          label = segment
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        }
        
        breadcrumbs.push({
          label,
          href: isLast ? undefined : currentSegmentPath,
          current: isLast,
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs(currentPath);

  // Truncate items if maxItems is specified
  const displayItems = maxItems && breadcrumbItems.length > maxItems
    ? [
        breadcrumbItems[0],
        { label: '...', disabled: true },
        ...breadcrumbItems.slice(-maxItems + 2)
      ]
    : breadcrumbItems;

  const handleItemClick = (item: BreadcrumbItem) => {
    if (item.href && !item.disabled && onNavigate) {
      onNavigate(item.href);
    }
  };

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumbs for single items
  }

  return (
    <nav
      className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {displayItems.map((item, index) => (
          item ? (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
              
              {item.disabled ? (
                <span className="text-muted-foreground">
                  {item.label}
                </span>
              ) : item.href ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 font-normal text-muted-foreground hover:text-foreground"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center gap-1">
                    {item.icon}
                    {item.label}
                  </div>
                </Button>
              ) : (
                <span
                  className={`flex items-center gap-1 ${
                    item.current
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </span>
              )}
            </li>
          ) : null
        ))}
      </ol>
    </nav>
  );
}

// Helper function to generate breadcrumbs for specific patterns
export const createBreadcrumbs = {
  user: (userId?: string, action?: 'edit' | 'view' | 'new') => [
    { label: 'Dashboard', href: ADMIN_CONSTANTS.ROUTES.DASHBOARD, icon: <Home className="h-3 w-3" /> },
    { label: 'Users', href: ADMIN_CONSTANTS.ROUTES.USERS },
    { 
      label: action === 'new' ? 'New User' : action === 'edit' ? 'Edit User' : 'View User',
      current: true 
    },
  ],
  
  post: (postId?: string, action?: 'edit' | 'view' | 'new') => [
    { label: 'Dashboard', href: ADMIN_CONSTANTS.ROUTES.DASHBOARD, icon: <Home className="h-3 w-3" /> },
    { label: 'Content', href: ADMIN_CONSTANTS.ROUTES.CONTENT },
    { label: 'Posts', href: ADMIN_CONSTANTS.ROUTES.POSTS },
    { 
      label: action === 'new' ? 'New Post' : action === 'edit' ? 'Edit Post' : 'View Post',
      current: true 
    },
  ],
  
  page: (pageId?: string, action?: 'edit' | 'view' | 'new') => [
    { label: 'Dashboard', href: ADMIN_CONSTANTS.ROUTES.DASHBOARD, icon: <Home className="h-3 w-3" /> },
    { label: 'Content', href: ADMIN_CONSTANTS.ROUTES.CONTENT },
    { label: 'Pages', href: ADMIN_CONSTANTS.ROUTES.PAGES },
    { 
      label: action === 'new' ? 'New Page' : action === 'edit' ? 'Edit Page' : 'View Page',
      current: true 
    },
  ],

  plugin: (pluginId?: string, action?: 'settings' | 'view') => [
    { label: 'Dashboard', href: ADMIN_CONSTANTS.ROUTES.DASHBOARD, icon: <Home className="h-3 w-3" /> },
    { label: 'Plugins', href: ADMIN_CONSTANTS.ROUTES.PLUGINS },
    { 
      label: action === 'settings' ? 'Plugin Settings' : 'Plugin Details',
      current: true 
    },
  ],

  settings: (section?: string): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', href: ADMIN_CONSTANTS.ROUTES.DASHBOARD, icon: <Home className="h-3 w-3" /> },
      { label: 'Settings', href: ADMIN_CONSTANTS.ROUTES.SETTINGS },
    ];

    if (section) {
      const sectionLabels: Record<string, string> = {
        email: 'Email Settings',
        performance: 'Performance',
        security: 'Security',
        database: 'Database',
      };
      
      items.push({
        label: sectionLabels[section] || section,
        current: true,
      });
    }

    return items;
  },
};