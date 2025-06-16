'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@modular-app/ui';
import { Breadcrumbs } from '../components/layout/breadcrumbs';
import { 
  LayoutDashboard,
  Users,
  FileText,
  Images,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  ThumbsUp,
  Download,
  Plus,
  ArrowRight,
  BarChart3,
  PieChart,
  Globe,
  Shield,
  Zap,
} from 'lucide-react';
import { ADMIN_CONSTANTS } from '../lib/constants';

interface DashboardStats {
  posts: {
    total: number;
    published: number;
    draft: number;
    pending: number;
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
    newThisMonth: number;
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
    approved: number;
    change: number;
  };
  analytics: {
    viewsToday: number;
    viewsThisWeek: number;
    viewsThisMonth: number;
    change: number;
    topPosts: Array<{
      id: string;
      title: string;
      views: number;
      change: number;
    }>;
  };
}

interface RecentActivity {
  id: string;
  type: 'post' | 'comment' | 'user' | 'media' | 'plugin';
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
  status?: 'success' | 'warning' | 'error' | 'info';
}

interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    connections: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  plugins: {
    active: number;
    total: number;
    needsUpdate: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Simulate API calls
        await Promise.all([
          fetchStats(),
          fetchRecentActivity(),
          fetchSystemHealth(),
        ]);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const fetchStats = async (): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setStats({
      posts: {
        total: 89,
        published: 76,
        draft: 8,
        pending: 5,
        change: 12.5,
      },
      pages: {
        total: 12,
        published: 10,
        change: 0,
      },
      users: {
        total: 1247,
        active: 892,
        newThisMonth: 34,
        change: 8.3,
      },
      media: {
        total: 156,
        size: 2.1 * 1024 * 1024 * 1024, // 2.1GB in bytes
        change: 15.2,
      },
      comments: {
        total: 423,
        pending: 3,
        approved: 420,
        change: -2.1,
      },
      analytics: {
        viewsToday: 2847,
        viewsThisWeek: 18943,
        viewsThisMonth: 76521,
        change: 23.7,
        topPosts: [
          { id: '1', title: 'Getting Started with Modular App', views: 1247, change: 15.3 },
          { id: '2', title: 'Advanced Plugin Development', views: 892, change: -5.2 },
          { id: '3', title: 'Theme Customization Guide', views: 743, change: 8.7 },
        ],
      },
    });
  };

  const fetchRecentActivity = async (): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setRecentActivity([
      {
        id: '1',
        type: 'post',
        title: 'New post published',
        description: '"Building Custom Plugins" was published by John Doe',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        user: { name: 'John Doe', avatar: '/avatars/john.jpg' },
        status: 'success',
      },
      {
        id: '2',
        type: 'comment',
        title: 'Comment pending review',
        description: 'New comment on "Getting Started Guide" needs moderation',
        timestamp: new Date(Date.now() - 32 * 60 * 1000), // 32 minutes ago
        status: 'warning',
      },
      {
        id: '3',
        type: 'user',
        title: 'New user registered',
        description: 'Sarah Wilson created a new account',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        user: { name: 'Sarah Wilson', avatar: '/avatars/sarah.jpg' },
        status: 'info',
      },
      {
        id: '4',
        type: 'plugin',
        title: 'Plugin activated',
        description: 'SEO Plugin was activated successfully',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'success',
      },
      {
        id: '5',
        type: 'media',
        title: 'Media uploaded',
        description: '5 new images were uploaded to the media library',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        status: 'info',
      },
    ]);
  };

  const fetchSystemHealth = async (): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    setSystemHealth({
      database: {
        status: 'healthy',
        responseTime: 45,
        connections: 12,
      },
      storage: {
        used: 12.4 * 1024 * 1024 * 1024, // 12.4GB
        total: 50 * 1024 * 1024 * 1024, // 50GB
        percentage: 24.8,
      },
      memory: {
        used: 2.1 * 1024 * 1024 * 1024, // 2.1GB
        total: 8 * 1024 * 1024 * 1024, // 8GB
        percentage: 26.25,
      },
      plugins: {
        active: 8,
        total: 12,
        needsUpdate: 2,
      },
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post': return <FileText className="h-4 w-4" />;
      case 'comment': return <MessageSquare className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      case 'media': return <Images className="h-4 w-4" />;
      case 'plugin': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading || !stats || !systemHealth) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          {
            label: 'Dashboard',
            icon: <LayoutDashboard className="h-3 w-3" />,
            current: true,
          },
        ]}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Content
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Posts Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.posts.total}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.posts.change > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(stats.posts.change)}% from last month
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.posts.published} published, {stats.posts.draft} drafts
            </div>
          </CardContent>
        </Card>

        {/* Users Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              {stats.users.change}% from last month
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.users.active} active, {stats.users.newThisMonth} new this month
            </div>
          </CardContent>
        </Card>

        {/* Media Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media Files</CardTitle>
            <Images className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.media.total}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              {stats.media.change}% from last month
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatFileSize(stats.media.size)} total
            </div>
          </CardContent>
        </Card>

        {/* Views Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Views Today</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.analytics.viewsToday.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              {stats.analytics.change}% from yesterday
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.analytics.viewsThisWeek.toLocaleString()} this week
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create New Post
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Add New User
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Images className="h-4 w-4 mr-2" />
              Upload Media
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Manage Plugins
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest updates and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{activity.title}</p>
                      {getStatusIcon(activity.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" size="sm">
              View All Activity
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Health & Top Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Health</CardTitle>
            <CardDescription>Server status and performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Database Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  systemHealth.database.status === 'healthy' ? 'bg-green-500' :
                  systemHealth.database.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium">Database</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {systemHealth.database.responseTime}ms
              </Badge>
            </div>

            {/* Storage Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Storage</span>
                <span className="text-muted-foreground">
                  {formatFileSize(systemHealth.storage.used)} / {formatFileSize(systemHealth.storage.total)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${systemHealth.storage.percentage}%` }}
                />
              </div>
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Memory</span>
                <span className="text-muted-foreground">
                  {formatFileSize(systemHealth.memory.used)} / {formatFileSize(systemHealth.memory.total)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${systemHealth.memory.percentage}%` }}
                />
              </div>
            </div>

            {/* Plugins Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Plugins</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {systemHealth.plugins.active} active
                </Badge>
                {systemHealth.plugins.needsUpdate > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {systemHealth.plugins.needsUpdate} updates
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Content</CardTitle>
            <CardDescription>Most viewed posts this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.analytics.topPosts.map((post, index) => (
                <div key={post.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      <span>{post.views.toLocaleString()} views</span>
                      <span className={`flex items-center gap-1 ${
                        post.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {post.change > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(post.change)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" size="sm">
              View Full Analytics
              <BarChart3 className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}