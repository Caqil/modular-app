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
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Crown,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';

// User interface
interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role: 'super_admin' | 'admin' | 'editor' | 'author' | 'contributor' | 'subscriber';
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'banned';
  avatar?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  stats: {
    loginCount: number;
    postCount: number;
    commentCount: number;
    lastActivityAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
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
  { key: 'user', label: 'User', sortable: true, width: 'w-80' },
  { key: 'role', label: 'Role', sortable: true, width: 'w-32' },
  { key: 'status', label: 'Status', sortable: true, width: 'w-32' },
  { key: 'verification', label: 'Verification', width: 'w-32', align: 'center' },
  { key: 'activity', label: 'Activity', sortable: true, width: 'w-40' },
  { key: 'stats', label: 'Stats', width: 'w-32', align: 'center' },
  { key: 'created', label: 'Created', sortable: true, width: 'w-32' },
  { key: 'actions', label: 'Actions', width: 'w-24', align: 'center' },
];

// Bulk action options
const BULK_ACTIONS = [
  { value: 'activate', label: 'Activate Users', icon: CheckCircle, color: 'text-green-600' },
  { value: 'deactivate', label: 'Deactivate Users', icon: XCircle, color: 'text-gray-600' },
  { value: 'suspend', label: 'Suspend Users', icon: Ban, color: 'text-red-600' },
  { value: 'verify_email', label: 'Mark Email Verified', icon: Mail, color: 'text-blue-600' },
  { value: 'delete', label: 'Delete Users', icon: Trash2, color: 'text-red-600' },
];

interface UserTableProps {
  users: User[];
  selectedUsers: string[];
  onUserSelect: (userId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onView: (user: User) => void;
  onBulkAction: (action: string, userIds: string[]) => void;
  onExport: () => void;
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

export function UserTable({
  users,
  selectedUsers,
  onUserSelect,
  onSelectAll,
  onSort,
  onEdit,
  onDelete,
  onView,
  onBulkAction,
  onExport,
  sortColumn,
  sortDirection,
  isLoading = false,
  pagination
}: UserTableProps) {
  const [bulkAction, setBulkAction] = useState('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  // Helper functions
  const getRoleBadgeColor = (role: User['role']) => {
    const colors = {
      'super_admin': 'bg-red-100 text-red-800',
      'admin': 'bg-purple-100 text-purple-800',
      'editor': 'bg-blue-100 text-blue-800',
      'author': 'bg-green-100 text-green-800',
      'contributor': 'bg-yellow-100 text-yellow-800',
      'subscriber': 'bg-gray-100 text-gray-800',
    };
    return colors[role] || colors.subscriber;
  };

  const getStatusBadgeColor = (status: User['status']) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'suspended': 'bg-red-100 text-red-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'banned': 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.inactive;
  };

  const getDisplayName = (user: User) => {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.username;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (!COLUMNS.find(col => col.key === column)?.sortable) return;
    
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column, newDirection);
  };

  // Handle bulk actions
  const handleBulkAction = () => {
    if (!bulkAction || selectedUsers.length === 0) return;
    
    onBulkAction(bulkAction, selectedUsers);
    setBulkAction('');
  };

  const allSelected = users.length > 0 && selectedUsers.length === users.length;
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  return (
    <div className="space-y-4">
      {/* Table Header with Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedUsers.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedUsers.length} selected
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
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
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
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-t hover:bg-muted/25 transition-colors"
                >
                  {/* Checkbox */}
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => onUserSelect(user.id)}
                      className="h-4 w-4"
                    />
                  </td>

                  {/* User */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={getDisplayName(user)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {getDisplayName(user)}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="p-4">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      <div className="flex items-center gap-1">
                        {user.role === 'super_admin' && <Crown className="h-3 w-3" />}
                        {user.role.replace('_', ' ')}
                      </div>
                    </Badge>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <Badge className={getStatusBadgeColor(user.status)}>
                      {user.status}
                    </Badge>
                  </td>

                  {/* Verification */}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          user.emailVerified ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={`Email ${user.emailVerified ? 'verified' : 'unverified'}`}
                      />
                      <div
                        className={`w-2 h-2 rounded-full ${
                          user.phoneVerified ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={`Phone ${user.phoneVerified ? 'verified' : 'unverified'}`}
                      />
                      <div
                        className={`w-2 h-2 rounded-full ${
                          user.twoFactorEnabled ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                        title={`2FA ${user.twoFactorEnabled ? 'enabled' : 'disabled'}`}
                      />
                    </div>
                  </td>

                  {/* Activity */}
                  <td className="p-4">
                    <div className="text-sm">
                      {user.lastLogin ? (
                        <div>
                          <div className="font-medium">
                            {formatRelativeTime(user.lastLogin)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            last login
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">Never</div>
                      )}
                    </div>
                  </td>

                  {/* Stats */}
                  <td className="p-4 text-center">
                    <div className="text-sm">
                      <div className="font-medium">{user.stats.loginCount}</div>
                      <div className="text-xs text-muted-foreground">logins</div>
                    </div>
                  </td>

                  {/* Created */}
                  <td className="p-4">
                    <div className="text-sm">
                      {formatDate(user.createdAt)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-center">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDropdown(showDropdown === user.id ? null : user.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>

                      {showDropdown === user.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowDropdown(null)}
                          />
                          <div className="absolute right-0 top-8 z-20 w-48 bg-white border rounded-md shadow-lg py-1">
                            <button
                              onClick={() => {
                                onView(user);
                                setShowDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                onEdit(user);
                                setShowDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit User
                            </button>
                            {user.status === 'active' ? (
                              <button
                                onClick={() => {
                                  onBulkAction('suspend', [user.id]);
                                  setShowDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-yellow-600"
                              >
                                <Ban className="h-4 w-4" />
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  onBulkAction('activate', [user.id]);
                                  setShowDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-green-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Activate
                              </button>
                            )}
                            <div className="border-t my-1" />
                            <button
                              onClick={() => {
                                onDelete(user);
                                setShowDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete User
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {users.length === 0 && !isLoading && (
          <div className="p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No users found</h3>
            <p className="text-muted-foreground mb-4">
              No users match your current filters.
            </p>
            <Button variant="outline" onClick={() => onSelectAll(false)}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} users
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