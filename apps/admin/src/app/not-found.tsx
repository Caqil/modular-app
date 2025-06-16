'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from '@modular-app/ui';
import { 
  AlertTriangle,
  Home,
  ArrowLeft,
  Search,
  FileQuestion,
  Settings,
  Users,
  FileText,
  Images,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import { ADMIN_CONSTANTS } from '../lib/constants';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  category: 'content' | 'management' | 'system';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Return to the main admin dashboard',
    icon: <Home className="h-4 w-4" />,
    href: ADMIN_CONSTANTS.ROUTES.DASHBOARD,
    category: 'system',
  },
  {
    id: 'posts',
    label: 'Posts',
    description: 'Manage blog posts and articles',
    icon: <FileText className="h-4 w-4" />,
    href: ADMIN_CONSTANTS.ROUTES.POSTS,
    category: 'content',
  },
  {
    id: 'pages',
    label: 'Pages',
    description: 'Manage static pages and content',
    icon: <FileText className="h-4 w-4" />,
    href: ADMIN_CONSTANTS.ROUTES.PAGES,
    category: 'content',
  },
  {
    id: 'media',
    label: 'Media Library',
    description: 'Upload and manage media files',
    icon: <Images className="h-4 w-4" />,
    href: ADMIN_CONSTANTS.ROUTES.MEDIA,
    category: 'content',
  },
  {
    id: 'users',
    label: 'Users',
    description: 'Manage user accounts and permissions',
    icon: <Users className="h-4 w-4" />,
    href: ADMIN_CONSTANTS.ROUTES.USERS,
    category: 'management',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'View site statistics and reports',
    icon: <BarChart3 className="h-4 w-4" />,
    href: ADMIN_CONSTANTS.ROUTES.ANALYTICS,
    category: 'system',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Configure system preferences',
    icon: <Settings className="h-4 w-4" />,
    href: ADMIN_CONSTANTS.ROUTES.SETTINGS,
    category: 'system',
  },
];

interface CommonIssue {
  id: string;
  title: string;
  description: string;
  solution: string;
  action?: {
    label: string;
    href: string;
  };
}

const COMMON_ISSUES: CommonIssue[] = [
  {
    id: 'moved-page',
    title: 'Page Moved or Renamed',
    description: 'The page you\'re looking for may have been moved to a different location.',
    solution: 'Try using the search function or check the navigation menu for the updated location.',
  },
  {
    id: 'permissions',
    title: 'Insufficient Permissions',
    description: 'You might not have the required permissions to access this page.',
    solution: 'Contact your administrator to request access or check your user role.',
    action: {
      label: 'Contact Support',
      href: '/admin/help',
    },
  },
  {
    id: 'plugin-disabled',
    title: 'Plugin or Feature Disabled',
    description: 'The feature you\'re trying to access may be provided by a disabled plugin.',
    solution: 'Check if the required plugin is installed and activated.',
    action: {
      label: 'Manage Plugins',
      href: ADMIN_CONSTANTS.ROUTES.PLUGINS,
    },
  },
  {
    id: 'temporary-issue',
    title: 'Temporary System Issue',
    description: 'There might be a temporary issue with the system or database.',
    solution: 'Try refreshing the page or wait a few moments before trying again.',
  },
];

export default function AdminNotFound() {
  const router = useRouter();
  const pathname = usePathname();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(ADMIN_CONSTANTS.ROUTES.DASHBOARD);
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const getPathSegments = (path: string): string[] => {
    return path.split('/').filter(Boolean);
  };

  const renderQuickActions = (category: 'content' | 'management' | 'system') => {
    const actions = QUICK_ACTIONS.filter(action => action.category === category);
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            className="h-auto p-4 justify-start text-left"
            onClick={() => handleNavigation(action.href)}
          >
            <div className="flex items-start gap-3 w-full">
              <div className="flex-shrink-0 mt-1">
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {action.description}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-8">
        {/* Main Error Message */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <FileQuestion className="h-8 w-8 text-destructive" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">404 - Page Not Found</h1>
            <p className="text-lg text-muted-foreground">
              The admin page you're looking for doesn't exist or has been moved.
            </p>
            <p className="text-sm text-muted-foreground">
              Current path: <code className="bg-muted px-2 py-1 rounded text-xs">{pathname}</code>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={handleGoBack} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button 
              onClick={() => handleNavigation(ADMIN_CONSTANTS.ROUTES.DASHBOARD)}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Admin Dashboard
            </Button>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Content Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Content
              </CardTitle>
              <CardDescription>
                Manage your site's content and media
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderQuickActions('content')}
            </CardContent>
          </Card>

          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Management
              </CardTitle>
              <CardDescription>
                User accounts and site administration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderQuickActions('management')}
            </CardContent>
          </Card>

          {/* System & Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System
              </CardTitle>
              <CardDescription>
                Analytics, settings, and system tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderQuickActions('system')}
            </CardContent>
          </Card>
        </div>

        {/* Common Issues and Solutions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Common Issues & Solutions
            </CardTitle>
            <CardDescription>
              Why this might have happened and how to resolve it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMMON_ISSUES.map((issue) => (
                <div key={issue.id} className="p-4 border rounded-lg space-y-3">
                  <div>
                    <h4 className="font-medium text-sm">{issue.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {issue.description}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-primary mb-2">Solution:</p>
                    <p className="text-xs text-muted-foreground">
                      {issue.solution}
                    </p>
                  </div>

                  {issue.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8"
                      onClick={() => handleNavigation(issue.action!.href)}
                    >
                      {issue.action.label}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Help and Support */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <HelpCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
              
              <div>
                <h3 className="font-medium">Still Need Help?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  If you continue to experience issues, our support team is here to help.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigation('/admin/help')}
                  className="gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  Help Center
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = 'mailto:support@modularapp.com'}
                  className="gap-2"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>
            Modular App Admin Panel • Error Code: 404 • 
            <span className="ml-1">
              {new Date().toLocaleString()}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// Specialized 404 components for different contexts
export const UnauthorizedPage = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <CardTitle className="text-2xl">Access Denied</CardTitle>
        <CardDescription>
          You don't have permission to access this page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Please contact your administrator if you believe this is an error.
        </p>
        <div className="flex flex-col gap-2">
          <Button 
            onClick={() => window.history.back()}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Button 
            onClick={() => window.location.href = '/admin'}
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const MaintenancePage = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center">
            <Settings className="h-8 w-8 text-warning animate-spin" />
          </div>
        </div>
        <CardTitle className="text-2xl">Under Maintenance</CardTitle>
        <CardDescription>
          The admin panel is temporarily unavailable for maintenance.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground">
          We'll be back online shortly. Thank you for your patience.
        </p>
      </CardContent>
    </Card>
  </div>
);