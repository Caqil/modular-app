
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Database,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Badge,
  Button,
} from '@modular-app/ui';
import { queryKeys } from '../../providers/query-provider';

interface SystemMetrics {
  database: {
    status: 'connected' | 'disconnected' | 'slow';
    latency: number;
    connections: number;
    maxConnections: number;
  };
  server: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    load: number[];
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      cores: number;
    };
  };
  cache: {
    status: 'connected' | 'disconnected' | 'slow';
    hitRate: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  external: {
    api: 'healthy' | 'slow' | 'down';
    cdn: 'healthy' | 'slow' | 'down';
    email: 'healthy' | 'slow' | 'down';
  };
}

interface HealthIndicatorProps {
  status: 'healthy' | 'warning' | 'critical' | 'connected' | 'disconnected' | 'slow' | 'down';
  label: string;
  value?: string | number;
  description?: string;
}

const HealthIndicator: React.FC<HealthIndicatorProps> = ({
  status,
  label,
  value,
  description,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
      case 'slow':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
      case 'disconnected':
      case 'down':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'warning':
      case 'slow':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
      case 'disconnected':
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <p className="font-medium text-sm">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-sm font-medium">{value}</span>
        )}
        <Badge className={getStatusColor()}>
          {status}
        </Badge>
      </div>
    </div>
  );
};

interface SystemHealthProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({
  autoRefresh = true,
  refreshInterval = 30000,
  className,
}) => {
  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: queryKeys.dashboard.systemHealth(),
    queryFn: async (): Promise<SystemMetrics> => {
      // TODO: Replace with actual API call
      return {
        database: {
          status: 'connected',
          latency: 45,
          connections: 12,
          maxConnections: 100,
        },
        server: {
          status: 'healthy',
          uptime: 1234567, // seconds
          load: [0.8, 1.2, 0.6],
          memory: {
            used: 4.2 * 1024 * 1024 * 1024, // 4.2GB
            total: 8 * 1024 * 1024 * 1024, // 8GB
            percentage: 52.5,
          },
          disk: {
            used: 45 * 1024 * 1024 * 1024, // 45GB
            total: 100 * 1024 * 1024 * 1024, // 100GB
            percentage: 45,
          },
          cpu: {
            usage: 23.5,
            cores: 4,
          },
        },
        cache: {
          status: 'connected',
          hitRate: 94.2,
          memory: {
            used: 256 * 1024 * 1024, // 256MB
            total: 512 * 1024 * 1024, // 512MB
            percentage: 50,
          },
        },
        external: {
          api: 'healthy',
          cdn: 'healthy',
          email: 'slow',
        },
      };
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes: number) => {
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
      <Card className={className}>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-muted rounded-full" />
                  <div className="h-4 bg-muted rounded w-20" />
                </div>
                <div className="h-6 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Failed to load system metrics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>System Health</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Database */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </h4>
          <HealthIndicator
            status={metrics.database.status}
            label="Connection"
            value={`${metrics.database.latency}ms`}
            description={`${metrics.database.connections}/${metrics.database.maxConnections} connections`}
          />
        </div>

        {/* Server Resources */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Server className="h-4 w-4" />
            Server Resources
          </h4>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  CPU Usage
                </span>
                <span>{metrics.server.cpu.usage}%</span>
              </div>
              <Progress value={metrics.server.cpu.usage} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <MemoryStick className="h-4 w-4" />
                  Memory
                </span>
                <span>
                  {formatBytes(metrics.server.memory.used)} / {formatBytes(metrics.server.memory.total)}
                </span>
              </div>
              <Progress value={metrics.server.memory.percentage} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Disk Usage
                </span>
                <span>
                  {formatBytes(metrics.server.disk.used)} / {formatBytes(metrics.server.disk.total)}
                </span>
              </div>
              <Progress value={metrics.server.disk.percentage} />
            </div>

            <div className="text-sm text-muted-foreground">
              Uptime: {formatUptime(metrics.server.uptime)}
            </div>
          </div>
        </div>

        {/* Cache */}
        <div className="space-y-2">
          <h4 className="font-medium">Cache</h4>
          <HealthIndicator
            status={metrics.cache.status}
            label="Redis Cache"
            value={`${metrics.cache.hitRate}% hit rate`}
            description={`${formatBytes(metrics.cache.memory.used)} / ${formatBytes(metrics.cache.memory.total)}`}
          />
        </div>

        {/* External Services */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            External Services
          </h4>
          <div className="space-y-2">
            <HealthIndicator
              status={metrics.external.api}
              label="External APIs"
            />
            <HealthIndicator
              status={metrics.external.cdn}
              label="CDN Services"
            />
            <HealthIndicator
              status={metrics.external.email}
              label="Email Service"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
