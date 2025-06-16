
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  Image,
  MessageCircle,
  Eye,
  Calendar,
  Clock,
  BarChart3,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@modular-app/ui';
import { queryKeys } from '../../providers/query-provider';

interface StatsData {
  posts: {
    total: number;
    published: number;
    draft: number;
    change: number;
  };
  pages: {
    total: number;
    published: number;
    change: number;
  };
  users: {
    total: number;
    active: number;
    change: number;
  };
  media: {
    total: number;
    size: number;
    change: number;
  };
  comments: {
    total: number;
    pending: number;
    change: number;
  };
  views: {
    today: number;
    thisWeek: number;
    change: number;
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  description,
  trend,
  className,
}) => {
  const getTrendIcon = () => {
    if (change === undefined) return null;
    
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = () => {
    if (change === undefined) return '';
    
    if (change > 0) {
      return 'text-green-600';
    } else if (change < 0) {
      return 'text-red-600';
    }
    return 'text-muted-foreground';
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>
              {change > 0 ? '+' : ''}{change}%{' '}
              <span className="text-muted-foreground">from last month</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface StatsCardsProps {
  className?: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ className }) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async (): Promise<StatsData> => {
      // TODO: Replace with actual API call
      return {
        posts: {
          total: 142,
          published: 89,
          draft: 53,
          change: 12.5,
        },
        pages: {
          total: 28,
          published: 25,
          change: 8.3,
        },
        users: {
          total: 1847,
          active: 342,
          change: -2.1,
        },
        media: {
          total: 736,
          size: 2.4 * 1024 * 1024 * 1024, // 2.4GB in bytes
          change: 15.7,
        },
        comments: {
          total: 892,
          pending: 23,
          change: 5.2,
        },
        views: {
          today: 2847,
          thisWeek: 18394,
          change: 23.1,
        },
      };
    },
  });

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (isLoading) {
    return (
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-20 animate-pulse" />
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded w-24 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Failed to load statistics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 ${className}`}>
      <StatCard
        title="Total Posts"
        value={stats.posts.total}
        change={stats.posts.change}
        icon={<FileText className="h-4 w-4" />}
        description={`${stats.posts.published} published, ${stats.posts.draft} drafts`}
      />
      
      <StatCard
        title="Pages"
        value={stats.pages.total}
        change={stats.pages.change}
        icon={<Calendar className="h-4 w-4" />}
        description={`${stats.pages.published} published`}
      />
      
      <StatCard
        title="Users"
        value={stats.users.total}
        change={stats.users.change}
        icon={<Users className="h-4 w-4" />}
        description={`${stats.users.active} active this month`}
      />
      
      <StatCard
        title="Media Files"
        value={stats.media.total}
        change={stats.media.change}
        icon={<Image className="h-4 w-4" />}
        description={`${formatFileSize(stats.media.size)} total`}
      />
      
      <StatCard
        title="Comments"
        value={stats.comments.total}
        change={stats.comments.change}
        icon={<MessageCircle className="h-4 w-4" />}
        description={`${stats.comments.pending} pending review`}
      />
      
      <StatCard
        title="Views Today"
        value={stats.views.today}
        change={stats.views.change}
        icon={<Eye className="h-4 w-4" />}
        description={`${stats.views.thisWeek.toLocaleString()} this week`}
      />
    </div>
  );
};
