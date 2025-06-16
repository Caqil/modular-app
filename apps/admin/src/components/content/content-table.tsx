
'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  ExternalLink,
  ArrowUpDown,
  Check,
  X,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@modular-app/ui';
import { ContentStatus, ContentType } from '@modular-app/core';
import { ADMIN_CONSTANTS } from '../../lib/constants';

interface ContentItem {
  _id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  excerpt?: string;
  featuredImage?: string;
  categories?: Array<{ _id: string; name: string; slug: string }>;
  tags?: string[];
}

interface ContentTableProps {
  items: ContentItem[];
  contentType: ContentType;
  isLoading?: boolean;
  selectedItems: string[];
  onSelectItems: (ids: string[]) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onBulkAction?: (action: string, ids: string[]) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange?: (page: number) => void;
  className?: string;
}

export const ContentTable: React.FC<ContentTableProps> = ({
  items,
  contentType,
  isLoading = false,
  selectedItems,
  onSelectItems,
  onEdit,
  onDelete,
  onView,
  onDuplicate,
  onBulkAction,
  pagination,
  onPageChange,
  className,
}) => {
  const [sortField, setSortField] = useState<keyof ContentItem>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      onSelectItems([]);
    } else {
      onSelectItems(items.map(item => item._id));
    }
  };

  const handleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      onSelectItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      onSelectItems([...selectedItems, id]);
    }
  };

  const getStatusColor = (status: ContentStatus) => {
    return ADMIN_CONSTANTS.STATUS_COLORS[
      status === ContentStatus.PUBLISHED ? 'success' :
      status === ContentStatus.DRAFT ? 'neutral' :
      status === ContentStatus.PENDING ? 'warning' :
      status === ContentStatus.PRIVATE ? 'info' : 'error'
    ];
  };

  const handleSort = (field: keyof ContentItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Provide default values for undefined
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [items, sortField, sortDirection]);

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading content...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Bulk Actions */}
      {selectedItems.length > 0 && onBulkAction && (
        <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Select onValueChange={(action) => onBulkAction(action, selectedItems)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Bulk actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="publish">Publish</SelectItem>
                <SelectItem value="unpublish">Unpublish</SelectItem>
                <SelectItem value="draft">Move to Draft</SelectItem>
                <SelectItem value="trash">Move to Trash</SelectItem>
                <SelectItem value="delete">Delete Permanently</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectItems([])}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left p-4 w-8">
                <input
                  type="checkbox"
                  checked={selectedItems.length === items.length && items.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-input"
                />
              </th>
              <th className="text-left p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('title')}
                  className="font-semibold"
                >
                  Title
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
              </th>
              <th className="text-left p-4">Author</th>
              <th className="text-left p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('status')}
                  className="font-semibold"
                >
                  Status
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
              </th>
              {contentType === ContentType.POST && (
                <th className="text-left p-4">Categories</th>
              )}
              <th className="text-left p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('updatedAt')}
                  className="font-semibold"
                >
                  Last Modified
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
              </th>
              <th className="text-right p-4 w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item._id} className="border-b hover:bg-muted/30">
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item._id)}
                    onChange={() => handleSelectItem(item._id)}
                    className="rounded border-input"
                  />
                </td>
                <td className="p-4">
                  <div>
                    <button
                      onClick={() => onEdit(item._id)}
                      className="font-medium hover:text-primary text-left"
                    >
                      {item.title}
                    </button>
                    {item.excerpt && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.excerpt}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-4 text-sm">
                  <div>
                    <div className="font-medium">{item.author.name}</div>
                    <div className="text-muted-foreground">{item.author.email}</div>
                  </div>
                </td>
                <td className="p-4">
                  <Badge className={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                </td>
                {contentType === ContentType.POST && (
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {item.categories?.slice(0, 2).map((category) => (
                        <Badge key={category._id} variant="outline" className="text-xs">
                          {category.name}
                        </Badge>
                      ))}
                      {(item.categories?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(item.categories?.length || 0) - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                )}
                <td className="p-4 text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(item._id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item._id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {onDuplicate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDuplicate(item._id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(item._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && onPageChange && (
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && !isLoading && (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">
            No {contentType.toLowerCase()}s found.
          </p>
        </div>
      )}
    </Card>
  );
};