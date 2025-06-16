
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Settings,
  Download,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@modular-app/ui';
import { PluginCapability, PluginStatus } from '@modular-app/core/types/plugin';

interface PluginInfo {
  _id: string;
  slug: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: PluginStatus;
  capabilities: PluginCapability[];
  settings?: Record<string, any>;
  lastUpdated: Date;
  size?: number;
  dependencies?: string[];
}

interface PluginStatusProps {
  plugin: PluginInfo;
  onStatusChange?: (plugin: PluginInfo, newStatus: PluginStatus) => void;
  onConfigure?: (plugin: PluginInfo) => void;
  onDelete?: (plugin: PluginInfo) => void;
  showActions?: boolean;
  className?: string;
}

export const PluginStatusCard: React.FC<PluginStatusProps> = ({
  plugin,
  onStatusChange,
  onConfigure,
  onDelete,
  showActions = true,
  className,
}) => {
  const getStatusIcon = (status: PluginStatus) => {
    switch (status) {
      case PluginStatus.ACTIVE:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case PluginStatus.INACTIVE:
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case PluginStatus.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case PluginStatus.UPDATING:
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: PluginStatus) => {
    const colors = {
      [PluginStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [PluginStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
      [PluginStatus.ERROR]: 'bg-red-100 text-red-800',
      [PluginStatus.UPDATING]: 'bg-blue-100 text-blue-800',
      [PluginStatus.INSTALLED]: 'bg-yellow-100 text-yellow-800',
      [PluginStatus.UNINSTALLING]: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleToggleStatus = () => {
    if (!onStatusChange) return;
    
    const newStatus = plugin.status === PluginStatus.ACTIVE 
      ? PluginStatus.INACTIVE 
      : PluginStatus.ACTIVE;
    
    onStatusChange(plugin, newStatus);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getCapabilityDescription = (capability: PluginCapability) => {
    const descriptions = {
      [PluginCapability.CONTENT_MANAGEMENT]: 'Content',
      [PluginCapability.FRONTEND_RENDERING]: 'Frontend',
      [PluginCapability.ADMIN_INTERFACE]: 'Admin',
      [PluginCapability.API_ENDPOINTS]: 'API',
      [PluginCapability.WEBHOOKS]: 'Webhooks',
      [PluginCapability.CUSTOM_FIELDS]: 'Fields',
      [PluginCapability.WIDGETS]: 'Widgets',
      [PluginCapability.SHORTCODES]: 'Shortcodes',
      [PluginCapability.BLOCKS]: 'Blocks',
      [PluginCapability.AUTHENTICATION]: 'Auth',
      [PluginCapability.CACHING]: 'Cache',
      [PluginCapability.SEO]: 'SEO',
      [PluginCapability.ANALYTICS]: 'Analytics',
      [PluginCapability.ECOMMERCE]: 'E-commerce',
      [PluginCapability.FORMS]: 'Forms',
      [PluginCapability.MEDIA]: 'Media',
      [PluginCapability.SOCIAL]: 'Social',
      [PluginCapability.PERFORMANCE]: 'Performance',
      [PluginCapability.SECURITY]: 'Security',
    };
    return descriptions[capability] || capability;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {getStatusIcon(plugin.status)}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{plugin.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                v{plugin.version} by {plugin.author}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(plugin.status)}>
            {plugin.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {plugin.description}
        </p>

        {/* Capabilities */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Capabilities</p>
          <div className="flex flex-wrap gap-1">
            {plugin.capabilities.slice(0, 4).map((capability) => (
              <Badge key={capability} variant="outline" className="text-xs">
                {getCapabilityDescription(capability)}
              </Badge>
            ))}
            {plugin.capabilities.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{plugin.capabilities.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        {/* Plugin Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Size</p>
            <p className="font-medium">{formatFileSize(plugin.size)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {new Date(plugin.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Dependencies */}
        {plugin.dependencies && plugin.dependencies.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Dependencies</p>
            <div className="flex flex-wrap gap-1">
              {plugin.dependencies.map((dep) => (
                <Badge key={dep} variant="outline" className="text-xs">
                  {dep}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              size="sm"
              onClick={handleToggleStatus}
              disabled={plugin.status === PluginStatus.UPDATING}
            >
              {plugin.status === PluginStatus.ACTIVE ? 'Deactivate' : 'Activate'}
            </Button>
            
            {onConfigure && plugin.status === PluginStatus.ACTIVE && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfigure(plugin)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
            )}

            <div className="flex-1" />

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(plugin)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
