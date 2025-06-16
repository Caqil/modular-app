
'use client';

import React from 'react';
import { useCallback } from 'react';
import { Search, Filter, X, Calendar, User, Tag, Folder } from 'lucide-react';
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
  Separator,
} from '@modular-app/ui';
import { ContentStatus, ContentType } from '@modular-app/core';

interface ContentFiltersProps {
  filters: ContentFilters;
  onFiltersChange: (filters: ContentFilters) => void;
  contentType: ContentType;
  className?: string;
}

interface ContentFilters {
  search?: string;
  status?: ContentStatus[];
  author?: string;
  categories?: string[];
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  featured?: boolean;
  sticky?: boolean;
}

export const ContentFilters: React.FC<ContentFiltersProps> = ({
  filters,
  onFiltersChange,
  contentType,
  className,
}) => {
  const updateFilter = useCallback((key: keyof ContentFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder={`Search ${contentType}...`}
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Separator />

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status?.[0] || 'all'}
            onValueChange={(value) => 
              updateFilter('status', value === 'all' ? undefined : [value as ContentStatus])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={ContentStatus.PUBLISHED}>Published</SelectItem>
              <SelectItem value={ContentStatus.DRAFT}>Draft</SelectItem>
              <SelectItem value={ContentStatus.PENDING}>Pending Review</SelectItem>
              <SelectItem value={ContentStatus.PRIVATE}>Private</SelectItem>
              <SelectItem value={ContentStatus.TRASH}>Trash</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Author Filter */}
        <div className="space-y-2">
          <Label>Author</Label>
          <Select
            value={filters.author || 'all'}
            onValueChange={(value) => updateFilter('author', value === 'all' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All authors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Authors</SelectItem>
              {/* TODO: Load authors from API */}
            </SelectContent>
          </Select>
        </div>

        {/* Categories Filter (for posts only) */}
        {contentType === ContentType.POST && (
          <div className="space-y-2">
            <Label>Categories</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {/* TODO: Load categories from API */}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={filters.dateFrom?.toISOString().split('T')[0] || ''}
              onChange={(e) => updateFilter('dateFrom', e.target.value ? new Date(e.target.value) : undefined)}
            />
            <Input
              type="date"
              value={filters.dateTo?.toISOString().split('T')[0] || ''}
              onChange={(e) => updateFilter('dateTo', e.target.value ? new Date(e.target.value) : undefined)}
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Active Filters</Label>
              <div className="flex flex-wrap gap-1">
                {filters.search && (
                  <Badge variant="secondary" className="text-xs">
                    Search: {filters.search}
                  </Badge>
                )}
                {filters.status?.[0] && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {filters.status[0]}
                  </Badge>
                )}
                {filters.author && (
                  <Badge variant="secondary" className="text-xs">
                    Author: {filters.author}
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
