
'use client';

import React from 'react';
import { 
  Plus, 
  FileText, 
  Image, 
  Users, 
  Settings, 
  Download,
  Upload,
  Eye,
  BarChart3,
  Mail,
  Shield,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@modular-app/ui';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  disabled?: boolean;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  maxActions?: number;
  columns?: number;
  className?: string;
}

const defaultActions: QuickAction[] = [
  {
    id: 'new-post',
    title: 'New Post',
    description: 'Create a new blog post',
    icon: <FileText className="h-5 w-5" />,
    href: '/admin/content/posts/new',
  },
  {
    id: 'new-page',
    title: 'New Page',
    description: 'Create a new page',
    icon: <Plus className="h-5 w-5" />,
    href: '/admin/content/pages/new',
  },
  {
    id: 'upload-media',
    title: 'Upload Media',
    description: 'Add images and files',
    icon: <Upload className="h-5 w-5" />,
    href: '/admin/media/upload',
  },
  {
    id: 'view-site',
    title: 'View Site',
    description: 'Visit your website',
    icon: <Eye className="h-5 w-5" />,
    href: '/',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'View site statistics',
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/admin/analytics',
  },
  {
    id: 'users',
    title: 'Manage Users',
    description: 'Add and edit users',
    icon: <Users className="h-5 w-5" />,
    href: '/admin/users',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure your site',
    icon: <Settings className="h-5 w-5" />,
    href: '/admin/settings',
  },
  {
    id: 'backup',
    title: 'Backup',
    description: 'Download site backup',
    icon: <Download className="h-5 w-5" />,
    onClick: () => console.log('Backup initiated'),
  },
];

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions = defaultActions,
  maxActions = 8,
  columns = 2,
  className,
}) => {
  const displayActions = actions.slice(0, maxActions);

  const handleActionClick = (action: QuickAction) => {
    if (action.disabled) return;
    
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      window.location.href = action.href;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className={`grid gap-3`}
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {displayActions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              className="h-auto p-4 flex flex-col items-start gap-2 text-left"
              onClick={() => handleActionClick(action)}
              disabled={action.disabled}
            >
              <div className="flex items-center gap-2 w-full">
                {action.icon}
                <span className="font-medium">{action.title}</span>
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                {action.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
