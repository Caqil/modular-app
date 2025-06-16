'use client';

import React, { useState } from 'react';
import { 
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@modular-app/ui';
import { 
  Play,
  Pause,
  Settings,
  Trash2,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Star,
  Calendar,
  User,
  Package,
  Zap,
  Shield,
  RefreshCw,
  FileText,
  BarChart3
} from 'lucide-react';
import type { PluginRecord, PluginStatus, PluginCapability } from '@modular-app/core';
import { AdminPlugins } from '../../lib/plugins';

interface PluginCardProps {
  plugin: PluginRecord & {
    manifest: {
      name: string;
      version: string;
      title: string;
      description: string;
      author: string;
      license?: string;
      homepage?: string;
      capabilities: PluginCapability[];
      tags?: string[];
    };
  };
  onActivate?: (plugin: PluginRecord) => Promise<void>;
  onDeactivate?: (plugin: PluginRecord) => Promise<void>;
  onUninstall?: (plugin: PluginRecord) => Promise<void>;
  onConfigure?: (plugin: PluginRecord) => void;
  onUpdate?: (plugin: PluginRecord) => Promise<void>;
  onViewDetails?: (plugin: PluginRecord) => void;
  hasUpdate?: boolean;
  isLoading?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function PluginCard({
  plugin,
  onActivate,
  onDeactivate,
  onUninstall,
  onConfigure,
  onUpdate,
  onViewDetails,
  hasUpdate = false,
  isLoading = false,
  variant = 'default'
}: PluginCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const statusBadge = AdminPlugins.getStatusBadge(plugin.status);
  const canActivate = AdminPlugins.canActivate(plugin);
  const canDeactivate = plugin.status === 'active';

  const handleAction = async (action: string, handler?: () => Promise<void> | void) => {
    if (!handler) return;
    
    setActionLoading(action);
    try {
      await handler();
    } catch (error) {
      console.error(`Failed to ${action} plugin:`, error);
    } finally {
      setActionLoading(null);
      setShowDropdown(false);
    }
  };

  const getCapabilityIcon = (capability: PluginCapability) => {
    const iconMap: Record<string, React.ReactNode> = {
      'content-management': <FileText className="h-3 w-3" />,
      'admin-interface': <Settings className="h-3 w-3" />,
      'security': <Shield className="h-3 w-3" />,
      'performance': <Zap className="h-3 w-3" />,
      'analytics': <BarChart3 className="h-3 w-3" />,
      'ecommerce': <Package className="h-3 w-3" />,
    };
    return iconMap[capability] || <Package className="h-3 w-3" />;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">{plugin.manifest.title}</h3>
            <p className="text-sm text-muted-foreground">v{plugin.manifest.version}</p>
          </div>
          <Badge className={statusBadge.color}>
            {statusBadge.text}
          </Badge>
          {hasUpdate && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              Update Available
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {canActivate && (
            <Button
              size="sm"
              onClick={() => handleAction('activate', () => onActivate?.(plugin))}
              disabled={isLoading || actionLoading === 'activate'}
            >
              {actionLoading === 'activate' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {canDeactivate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('deactivate', () => onDeactivate?.(plugin))}
              disabled={isLoading || actionLoading === 'deactivate'}
            >
              {actionLoading === 'deactivate' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`transition-shadow hover:shadow-md ${variant === 'detailed' ? 'w-full' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg leading-none">{plugin.manifest.title}</CardTitle>
              <CardDescription className="mt-1">
                by {plugin.manifest.author} • v{plugin.manifest.version}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={statusBadge.color}>
              {statusBadge.text}
            </Badge>
            {hasUpdate && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Update
              </Badge>
            )}
            
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              
              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute right-0 top-8 z-20 w-48 bg-white border rounded-md shadow-lg py-1">
                    <button
                      onClick={() => onViewDetails?.(plugin)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Details
                    </button>
                    
                    {plugin.status === 'active' && (
                      <button
                        onClick={() => onConfigure?.(plugin)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Configure
                      </button>
                    )}
                    
                    {hasUpdate && (
                      <button
                        onClick={() => handleAction('update', () => onUpdate?.(plugin))}
                        disabled={actionLoading === 'update'}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Update Plugin
                      </button>
                    )}
                    
                    <div className="border-t my-1" />
                    
                    <button
                      onClick={() => handleAction('uninstall', () => onUninstall?.(plugin))}
                      disabled={actionLoading === 'uninstall'}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Uninstall
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {plugin.manifest.description}
        </p>
        
        {/* Capabilities */}
        {plugin.manifest.capabilities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Capabilities</h4>
            <div className="flex flex-wrap gap-1">
              {plugin.manifest.capabilities.slice(0, 4).map((capability) => (
                <Badge
                  key={capability}
                  variant="outline"
                  className="text-xs"
                >
                  <div className="flex items-center gap-1">
                    {getCapabilityIcon(capability)}
                    {capability.replace('-', ' ')}
                  </div>
                </Badge>
              ))}
              {plugin.manifest.capabilities.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{plugin.manifest.capabilities.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Tags */}
        {plugin.manifest.tags && plugin.manifest.tags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Tags</h4>
            <div className="flex flex-wrap gap-1">
              {plugin.manifest.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Status Information */}
        {variant === 'detailed' && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Installed:</span>
              <span className="ml-2">{formatDate(plugin.installedAt)}</span>
            </div>
            {plugin.activatedAt && (
              <div>
                <span className="text-muted-foreground">Activated:</span>
                <span className="ml-2">{formatDate(plugin.activatedAt)}</span>
              </div>
            )}
            {plugin.manifest.license && (
              <div>
                <span className="text-muted-foreground">License:</span>
                <span className="ml-2">{plugin.manifest.license}</span>
              </div>
            )}
            {plugin.manifest.homepage && (
              <div>
                <a
                  href={plugin.manifest.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Homepage
                </a>
              </div>
            )}
          </div>
        )}
        
        {/* Error Message */}
        {plugin.errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{plugin.errorMessage}</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          {canActivate && (
            <Button
              size="sm"
              onClick={() => handleAction('activate', () => onActivate?.(plugin))}
              disabled={isLoading || actionLoading === 'activate'}
            >
              {actionLoading === 'activate' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Activate
            </Button>
          )}
          
          {canDeactivate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('deactivate', () => onDeactivate?.(plugin))}
              disabled={isLoading || actionLoading === 'deactivate'}
            >
              {actionLoading === 'deactivate' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Pause className="h-4 w-4 mr-2" />
              )}
              Deactivate
            </Button>
          )}
          
          {plugin.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onConfigure?.(plugin)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          )}
          
          {hasUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('update', () => onUpdate?.(plugin))}
              disabled={actionLoading === 'update'}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              {actionLoading === 'update' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Update
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}