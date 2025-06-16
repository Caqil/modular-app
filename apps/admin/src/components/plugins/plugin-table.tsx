'use client';

import React, { useState } from 'react';
import {
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@modular-app/ui';
import { 
  MoreHorizontal,
  Play,
  Pause,
  Settings,
  Trash2,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Package,
  RefreshCw,
  Filter,
  Calendar,
  User,
  ExternalLink,
  Shield,
  Crown,
  Zap,
  FileText,
  BarChart3
} from 'lucide-react';
import type { PluginRecord, PluginStatus, PluginCapability } from '@modular-app/core';
import { AdminPlugins } from '../../lib/plugins';

// Extended plugin interface for table display
interface PluginTableItem extends PluginRecord {
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
  hasUpdate?: boolean;
  updateVersion?: string;
}

// Table column configuration
interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

const COLUMNS: Column[] = [
  { key: 'plugin', label: 'Plugin', sortable: true, width: 'w-80' },
  { key: 'status', label: 'Status', sortable: true, width: 'w-32' },
  { key: 'version', label: 'Version', sortable: true, width: 'w-32' },
  { key: 'capabilities', label: 'Capabilities', width: 'w-48' },
  { key: 'author', label: 'Author', sortable: true, width: 'w-32' },
  { key: 'installed', label: 'Installed', sortable: true, width: 'w-32' },
  { key: 'actions', label: 'Actions', width: 'w-32', align: 'center' },
];

// Bulk action options
const BULK_ACTIONS = [
  { value: 'activate', label: 'Activate Plugins', icon: Play, color: 'text-green-600' },
  { value: 'deactivate', label: 'Deactivate Plugins', icon: Pause, color: 'text-gray-600' },
  { value: 'update', label: 'Update Plugins', icon: Download, color: 'text-blue-600' },
  { value: 'uninstall', label: 'Uninstall Plugins', icon: Trash2, color: 'text-red-600' },
];

interface PluginTableProps {
  plugins: PluginTableItem[];
  selectedPlugins: string[];
  onPluginSelect: (pluginId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onActivate: (plugin: PluginTableItem) => Promise<void>;
  onDeactivate: (plugin: PluginTableItem) => Promise<void>;
  onConfigure: (plugin: PluginTableItem) => void;
  onUpdate: (plugin: PluginTableItem) => Promise<void>;
  onUninstall: (plugin: PluginTableItem) => Promise<void>;
  onViewDetails: (plugin: PluginTableItem) => void;
  onBulkAction: (action: string, pluginIds: string[]) => Promise<void>;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
}

export function PluginTable({
  plugins,
  selectedPlugins,
  onPluginSelect,
  onSelectAll,
  onSort,
  onActivate,
  onDeactivate,
  onConfigure,
  onUpdate,
  onUninstall,
  onViewDetails,
  onBulkAction,
  sortColumn,
  sortDirection,
  isLoading = false,
  pagination
}: PluginTableProps) {
  const [bulkAction, setBulkAction] = useState('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Helper functions
  const getStatusBadge = (status: PluginStatus) => {
    return AdminPlugins.getStatusBadge(status);
  };

  const getCapabilityIcon = (capability: PluginCapability) => {
    const iconMap: Record<string, React.ReactNode> = {
      'content-management': <FileText className="h-3 w-3" />,
      'admin-interface': <Settings className="h-3 w-3" />,
      'security': <Shield className="h-3 w-3" />,
      'performance': <Zap className="h-3 w-3" />,
      'analytics': <BarChart3 className="h-3 w-3" />,
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

  const canActivate = (plugin: PluginTableItem) => {
    return AdminPlugins.canActivate(plugin);
  };

  const canDeactivate = (plugin: PluginTableItem) => {
    return plugin.status === 'active';
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (!COLUMNS.find(col => col.key === column)?.sortable) return;
    
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column, newDirection);
  };

  // Handle individual plugin actions
  const handlePluginAction = async (action: string, plugin: PluginTableItem) => {
    setActionLoading(`${action}-${plugin._id}`);
    try {
      switch (action) {
        case 'activate':
          await onActivate(plugin);
          break;
        case 'deactivate':
          await onDeactivate(plugin);
          break;
        case 'update':
          await onUpdate(plugin);
          break;
        case 'uninstall':
          await onUninstall(plugin);
          break;
        case 'configure':
          onConfigure(plugin);
          break;
        case 'view':
          onViewDetails(plugin);
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} plugin:`, error);
    } finally {
      setActionLoading(null);
      setShowDropdown(null);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedPlugins.length === 0) return;
    
    try {
      await onBulkAction(bulkAction, selectedPlugins);
      setBulkAction('');
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const allSelected = plugins.length > 0 && selectedPlugins.length === plugins.length;
  const someSelected = selectedPlugins.length > 0 && selectedPlugins.length < plugins.length;

  return (
    <div className="space-y-4">
      {/* Table Header with Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedPlugins.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedPlugins.length} selected
              </span>
              
              <div className="flex items-center gap-2">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Bulk actions..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BULK_ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        <div className="flex items-center gap-2">
                          <action.icon className={`h-4 w-4 ${action.color}`} />
                          {action.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  size="sm"
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                >
                  Apply
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isLoading && (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-12 p-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="h-4 w-4"
                  />
                </th>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={`p-4 text-left ${column.width || ''} ${
                      column.align === 'center' ? 'text-center' : 
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="flex items-center gap-1 hover:text-foreground font-medium"
                      >
                        {column.label}
                        {sortColumn === column.key && (
                          <span className="text-xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className="font-medium">{column.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plugins.map((plugin) => {
                const statusBadge = getStatusBadge(plugin.status);
                const isSelected = selectedPlugins.includes(plugin._id.toString());
                const isActionLoading = actionLoading?.includes(plugin._id.toString());

                return (
                  <tr
                    key={plugin._id.toString()}
                    className="border-t hover:bg-muted/25 transition-colors"
                  >
                    {/* Checkbox */}
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onPluginSelect(plugin._id.toString())}
                        className="h-4 w-4"
                      />
                    </td>

                    {/* Plugin */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate flex items-center gap-2">
                            {plugin.manifest.title}
                            {plugin.hasUpdate && (
                              <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
                                Update
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {plugin.manifest.description}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {plugin.manifest.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <Badge className={statusBadge.color}>
                        {statusBadge.text}
                      </Badge>
                      {plugin.errorMessage && (
                        <span title={plugin.errorMessage}>
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
                        </span>
                      )}
                    </td>

                    {/* Version */}
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium">v{plugin.manifest.version}</div>
                        {plugin.hasUpdate && plugin.updateVersion && (
                          <div className="text-xs text-orange-600">
                            v{plugin.updateVersion} available
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Capabilities */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {plugin.manifest.capabilities.slice(0, 3).map((capability) => (
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
                        {plugin.manifest.capabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{plugin.manifest.capabilities.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Author */}
                    <td className="p-4">
                      <div className="text-sm">
                        {plugin.manifest.homepage ? (
                          <a
                            href={plugin.manifest.homepage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {plugin.manifest.author}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          plugin.manifest.author
                        )}
                      </div>
                    </td>

                    {/* Installed Date */}
                    <td className="p-4">
                      <div className="text-sm">
                        {formatDate(plugin.installedAt)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDropdown(showDropdown === plugin._id.toString() ? null : plugin._id.toString())}
                          disabled={isActionLoading}
                        >
                          {isActionLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>

                        {showDropdown === plugin._id.toString() && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowDropdown(null)}
                            />
                            <div className="absolute right-0 top-8 z-20 w-48 bg-white border rounded-md shadow-lg py-1">
                              <button
                                onClick={() => handlePluginAction('view', plugin)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </button>

                              {canActivate(plugin) && (
                                <button
                                  onClick={() => handlePluginAction('activate', plugin)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-green-600"
                                >
                                  <Play className="h-4 w-4" />
                                  Activate
                                </button>
                              )}

                              {canDeactivate(plugin) && (
                                <button
                                  onClick={() => handlePluginAction('deactivate', plugin)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-gray-600"
                                >
                                  <Pause className="h-4 w-4" />
                                  Deactivate
                                </button>
                              )}

                              {plugin.status === 'active' && (
                                <button
                                  onClick={() => handlePluginAction('configure', plugin)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                >
                                  <Settings className="h-4 w-4" />
                                  Configure
                                </button>
                              )}

                              {plugin.hasUpdate && (
                                <button
                                  onClick={() => handlePluginAction('update', plugin)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-blue-600"
                                >
                                  <Download className="h-4 w-4" />
                                  Update Plugin
                                </button>
                              )}

                              <div className="border-t my-1" />

                              <button
                                onClick={() => handlePluginAction('uninstall', plugin)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                                Uninstall
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {plugins.length === 0 && !isLoading && (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No plugins installed</h3>
            <p className="text-muted-foreground mb-4">
              Get started by installing your first plugin from the marketplace.
            </p>
            <Button variant="outline">
              Browse Marketplace
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading plugins...</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} plugins
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={pagination.limit.toString()}
              onValueChange={(value) => pagination.onLimitChange(parseInt(value))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              
              <span className="px-3 py-1 text-sm">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}