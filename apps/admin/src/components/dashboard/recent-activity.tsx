
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  FileText,
  Users,
  Image,
  Settings,
  Trash2,
  Edit,
  Plus,
  Eye,
  MessageCircle,
  Shield,
  Download,
  Upload,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  ScrollArea,
} from '@modular-app/ui';
import { queryKeys } from '../../providers/query-provider';

interface ActivityItem {
  _id: string;
  type: ActivityType;
  action: string;
  description: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  target?: {
    id: string;
    type: string;
    title: string;
  };
  metadata?: Record<string, any>;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

enum ActivityType {
  CONTENT = 'content',
  USER = 'user',
  MEDIA = 'media',
  PLUGIN = 'plugin',
  SETTING = 'setting',
  SECURITY = 'security',
  SYSTEM = 'system',
}

interface RecentActivityProps {
  limit?: number;
  showTypes?: ActivityType[];
  showUserInfo?: boolean;
  autoRefresh?: boolean;
  className?: string;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  limit = 10,
  showTypes,
  showUserInfo = true,
  autoRefresh = true,
  className,
}) => {
  const { data: activities, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.activity({ limit, types: showTypes }),
    queryFn: async () => {
      // TODO: Replace with actual API call
      const mockActivities: ActivityItem[] = [
        {
          _id: '1',
          type: ActivityType.CONTENT,
          action: 'created',
          description: 'Created new post "Getting Started with Modular App"',
          user: {
            _id: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
          },
          target: {
            id: 'post1',
            type: 'post',
            title: 'Getting Started with Modular App',
          },
          timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        },
        {
          _id: '2',
          type: ActivityType.MEDIA,
          action: 'uploaded',
          description: 'Uploaded 3 images to media library',
          user: {
            _id: 'user2',
            name: 'Jane Smith',
            email: 'jane@example.com',
          },
          timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        },
        {
          _id: '3',
          type: ActivityType.USER,
          action: 'login',
          description: 'Logged into admin dashboard',
          user: {
            _id: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
          },
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        },
        {
          _id: '4',
          type: ActivityType.PLUGIN,
          action: 'activated',
          description: 'Activated SEO plugin',
          user: {
            _id: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
          },
          target: {
            id: 'seo-plugin',
            type: 'plugin',
            title: 'SEO Plugin',
          },
          timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        },
        {
          _id: '5',
          type: ActivityType.CONTENT,
          action: 'published',
          description: 'Published post "Welcome to Our Blog"',
          user: {
            _id: 'user2',
            name: 'Jane Smith',
            email: 'jane@example.com',
          },
          target: {
            id: 'post2',
            type: 'post',
            title: 'Welcome to Our Blog',
          },
          timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
        },
      ];
      
      return mockActivities.slice(0, limit);
    },
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
  });

  const getActivityIcon = (type: ActivityType, action: string) => {
    switch (type) {
      case ActivityType.CONTENT:
        switch (action) {
          case 'created':
          case 'published':
            return <Plus className="h-4 w-4" />;
          case 'updated':
          case 'edited':
            return <Edit className="h-4 w-4" />;
          case 'deleted':
            return <Trash2 className="h-4 w-4" />;
          case 'viewed':
            return <Eye className="h-4 w-4" />;
          default:
            return <FileText className="h-4 w-4" />;
        }
      case ActivityType.USER:
        return <Users className="h-4 w-4" />;
      case ActivityType.MEDIA:
        switch (action) {
          case 'uploaded':
            return <Upload className="h-4 w-4" />;
          case 'downloaded':
            return <Download className="h-4 w-4" />;
          default:
            return <Image className="h-4 w-4" />;
        }
      case ActivityType.PLUGIN:
        return <Settings className="h-4 w-4" />;
      case ActivityType.SECURITY:
        return <Shield className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: ActivityType, action: string) => {
    if (action === 'deleted' || action === 'error') {
      return 'text-red-600';
    }
    if (action === 'created' || action === 'published' || action === 'activated') {
      return 'text-green-600';
    }
    if (action === 'updated' || action === 'edited') {
      return 'text-blue-600';
    }
    return 'text-muted-foreground';
  };

  const getTypeColor = (type: ActivityType) => {
    const colors = {
      [ActivityType.CONTENT]: 'bg-blue-100 text-blue-800',
      [ActivityType.USER]: 'bg-green-100 text-green-800',
      [ActivityType.MEDIA]: 'bg-purple-100 text-purple-800',
      [ActivityType.PLUGIN]: 'bg-orange-100 text-orange-800',
      [ActivityType.SETTING]: 'bg-gray-100 text-gray-800',
      [ActivityType.SECURITY]: 'bg-red-100 text-red-800',
      [ActivityType.SYSTEM]: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {activities?.map((activity) => (
              <div key={activity._id} className="flex items-start gap-3">
                {/* Activity Icon */}
                <div className={`p-2 rounded-full bg-muted ${getActivityColor(activity.type, activity.action)}`}>
                  {getActivityIcon(activity.type, activity.action)}
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {activity.description}
                      </p>
                      
                      {showUserInfo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          by {activity.user.name}
                        </p>
                      )}

                      {activity.target && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Target: {activity.target.title}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge variant="outline" className={getTypeColor(activity.type)}>
                        {activity.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(!activities || activities.length === 0) && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
