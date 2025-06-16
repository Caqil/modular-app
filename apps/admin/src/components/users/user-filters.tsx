'use client';

import React, { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@modular-app/ui';
import { 
  Filter, 
  Search, 
  X, 
  ChevronDown, 
  Calendar,
  User,
  Mail,
  Shield,
  Clock,
  RefreshCw
} from 'lucide-react';

// User filter types
export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  registrationDateFrom?: string;
  registrationDateTo?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;
  loginCountMin?: number;
  loginCountMax?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Filter options
const USER_ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-800' },
  { value: 'admin', label: 'Administrator', color: 'bg-purple-100 text-purple-800' },
  { value: 'editor', label: 'Editor', color: 'bg-blue-100 text-blue-800' },
  { value: 'author', label: 'Author', color: 'bg-green-100 text-green-800' },
  { value: 'contributor', label: 'Contributor', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'subscriber', label: 'Subscriber', color: 'bg-gray-100 text-gray-800' },
];

const USER_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  { value: 'suspended', label: 'Suspended', color: 'bg-red-100 text-red-800' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'banned', label: 'Banned', color: 'bg-red-100 text-red-800' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Registration Date' },
  { value: 'lastLogin', label: 'Last Login' },
  { value: 'username', label: 'Username' },
  { value: 'email', label: 'Email' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'stats.loginCount', label: 'Login Count' },
  { value: 'stats.postCount', label: 'Post Count' },
];

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onReset: () => void;
  totalUsers?: number;
  filteredUsers?: number;
  isLoading?: boolean;
}

export function UserFilters({
  filters,
  onFiltersChange,
  onReset,
  totalUsers = 0,
  filteredUsers = 0,
  isLoading = false
}: UserFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Update filter value
  const updateFilter = (key: keyof UserFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  // Clear specific filter
  const clearFilter = (key: keyof UserFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    const excludeKeys = ['sortBy', 'sortOrder'];
    return Object.entries(filters).filter(
      ([key, value]) => !excludeKeys.includes(key) && value !== undefined && value !== ''
    ).length;
  };

  const activeFilterCount = getActiveFilterCount();

  // Badge type for filter badges
  type FilterBadge = {
    key: string;
    label: string;
    onRemove: () => void;
  };

  // Get active filter badges
  const getActiveFilterBadges = (): FilterBadge[] => {
    const badges: FilterBadge[] = [];

    if (filters.search) {
      badges.push({
        key: 'search',
        label: `Search: "${filters.search}"`,
        onRemove: () => clearFilter('search'),
      });
    }

    if (filters.role) {
      const role = USER_ROLES.find(r => r.value === filters.role);
      badges.push({
        key: 'role',
        label: `Role: ${role?.label || filters.role}`,
        onRemove: () => clearFilter('role'),
      });
    }

    if (filters.status) {
      const status = USER_STATUSES.find(s => s.value === filters.status);
      badges.push({
        key: 'status',
        label: `Status: ${status?.label || filters.status}`,
        onRemove: () => clearFilter('status'),
      });
    }

    if (filters.emailVerified !== undefined) {
      badges.push({
        key: 'emailVerified',
        label: `Email: ${filters.emailVerified ? 'Verified' : 'Unverified'}`,
        onRemove: () => clearFilter('emailVerified'),
      });
    }

    if (filters.twoFactorEnabled !== undefined) {
      badges.push({
        key: 'twoFactorEnabled',
        label: `2FA: ${filters.twoFactorEnabled ? 'Enabled' : 'Disabled'}`,
        onRemove: () => clearFilter('twoFactorEnabled'),
      });
    }

    if (filters.registrationDateFrom || filters.registrationDateTo) {
      const from = filters.registrationDateFrom ? new Date(filters.registrationDateFrom).toLocaleDateString() : 'Start';
      const to = filters.registrationDateTo ? new Date(filters.registrationDateTo).toLocaleDateString() : 'End';
      badges.push({
        key: 'registrationDate',
        label: `Registered: ${from} - ${to}`,
        onRemove: () => {
          clearFilter('registrationDateFrom');
          clearFilter('registrationDateTo');
        },
      });
    }

    if (filters.lastLoginFrom || filters.lastLoginTo) {
      const from = filters.lastLoginFrom ? new Date(filters.lastLoginFrom).toLocaleDateString() : 'Start';
      const to = filters.lastLoginTo ? new Date(filters.lastLoginTo).toLocaleDateString() : 'End';
      badges.push({
        key: 'lastLogin',
        label: `Last Login: ${from} - ${to}`,
        onRemove: () => {
          clearFilter('lastLoginFrom');
          clearFilter('lastLoginTo');
        },
      });
    }

    if (filters.loginCountMin !== undefined || filters.loginCountMax !== undefined) {
      const min = filters.loginCountMin || 0;
      const max = filters.loginCountMax || '∞';
      badges.push({
        key: 'loginCount',
        label: `Logins: ${min} - ${max}`,
        onRemove: () => {
          clearFilter('loginCountMin');
          clearFilter('loginCountMax');
        },
      });
    }

    return badges;
  };

  const filterBadges = getActiveFilterBadges();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            User Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {isLoading ? (
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Loading...
                </div>
              ) : (
                `${filteredUsers} of ${totalUsers} users`
              )}
            </div>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Quick Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or username..."
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select
              value={filters.role || ''}
              onValueChange={(value) => updateFilter('role', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status || ''}
              onValueChange={(value) => updateFilter('status', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {USER_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filter Badges */}
        {filterBadges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filterBadges.map((badge) => (
              <Badge
                key={badge.key}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {badge.label}
                <button
                  onClick={badge.onRemove}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-6 px-2 text-xs"
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Advanced Filters */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-4">
            {/* Account Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Status
                </Label>
                <Select
                  value={filters.emailVerified?.toString() || ''}
                  onValueChange={(value) => 
                    updateFilter('emailVerified', value === '' ? undefined : value === 'true')
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="true">Verified</SelectItem>
                    <SelectItem value="false">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Two-Factor Auth
                </Label>
                <Select
                  value={filters.twoFactorEnabled?.toString() || ''}
                  onValueChange={(value) => 
                    updateFilter('twoFactorEnabled', value === '' ? undefined : value === 'true')
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select
                  value={filters.sortBy || 'createdAt'}
                  onValueChange={(value) => updateFilter('sortBy', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Select
                  value={filters.sortOrder || 'desc'}
                  onValueChange={(value) => updateFilter('sortOrder', value as 'asc' | 'desc')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Ranges */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Registration Date Range
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Input
                        type="date"
                        value={filters.registrationDateFrom || ''}
                        onChange={(e) => updateFilter('registrationDateFrom', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Input
                        type="date"
                        value={filters.registrationDateTo || ''}
                        onChange={(e) => updateFilter('registrationDateTo', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last Login Date Range
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Input
                        type="date"
                        value={filters.lastLoginFrom || ''}
                        onChange={(e) => updateFilter('lastLoginFrom', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Input
                        type="date"
                        value={filters.lastLoginTo || ''}
                        onChange={(e) => updateFilter('lastLoginTo', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Login Count Range */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Login Count Range
                </Label>
                <div className="grid grid-cols-2 gap-2 max-w-md">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Minimum</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={filters.loginCountMin || ''}
                      onChange={(e) => updateFilter('loginCountMin', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Maximum</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Unlimited"
                      value={filters.loginCountMax || ''}
                      onChange={(e) => updateFilter('loginCountMax', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={onReset}
                disabled={activeFilterCount === 0}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>

              <div className="text-sm text-muted-foreground">
                {activeFilterCount > 0 && `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} applied`}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}