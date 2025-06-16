
'use client';

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  List,
  Search,
  Upload,
  Filter,
  Download,
  Trash2,
  Eye,
  Check,
  X,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
} from 'lucide-react';
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
} from '@modular-app/ui';
import { queryKeys } from '../../providers/query-provider';

interface MediaItem {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
  uploadedBy: {
    _id: string;
    name: string;
  };
  uploadedAt: Date;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
  };
}

interface MediaLibraryProps {
  selectionMode?: boolean;
  allowMultiple?: boolean;
  allowedTypes?: string[];
  onSelect?: (items: MediaItem[]) => void;
  onCancel?: () => void;
  className?: string;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  selectionMode = false,
  allowMultiple = false,
  allowedTypes,
  onSelect,
  onCancel,
  className,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    uploadedBy: 'all',
  });

  const { data: mediaData, isLoading } = useQuery({
    queryKey: queryKeys.media.list(filters),
    queryFn: async () => {
      // TODO: Replace with actual API call
      return {
        data: [] as MediaItem[],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      };
    },
  });

  const handleSelect = useCallback((item: MediaItem) => {
    if (!allowMultiple) {
      setSelectedItems([item._id]);
      if (selectionMode && onSelect) {
        onSelect([item]);
      }
      return;
    }

    setSelectedItems(prev => 
      prev.includes(item._id) 
        ? prev.filter(id => id !== item._id)
        : [...prev, item._id]
    );
  }, [allowMultiple, selectionMode, onSelect]);

  const handleConfirmSelection = () => {
    if (onSelect && mediaData?.data) {
      const selected = mediaData.data.filter(item => selectedItems.includes(item._id));
      onSelect(selected);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Media Library</CardTitle>
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <Button variant="outline" onClick={onCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmSelection}
                  disabled={selectedItems.length === 0}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Select ({selectedItems.length})
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                </Button>
                <Button>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 pt-4">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
          </div>
          <Select
            value={filters.type}
            onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading media...</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mediaData?.data.map((item) => {
              const Icon = getFileIcon(item.mimeType);
              const isSelected = selectedItems.includes(item._id);
              
              return (
                <div
                  key={item._id}
                  className={`relative group border-2 rounded-lg p-2 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1 z-10">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  
                  <div className="aspect-square bg-muted rounded flex items-center justify-center mb-2">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.alt || item.originalName}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Icon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="text-xs">
                    <p className="font-medium truncate" title={item.originalName}>
                      {item.originalName}
                    </p>
                    <p className="text-muted-foreground">
                      {formatFileSize(item.size)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {mediaData?.data.map((item) => {
              const Icon = getFileIcon(item.mimeType);
              const isSelected = selectedItems.includes(item._id);
              
              return (
                <div
                  key={item._id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.alt || item.originalName}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.originalName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(item.size)} • {item.mimeType}
                    </p>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {new Date(item.uploadedAt).toLocaleDateString()}
                  </div>
                  
                  {!selectionMode && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(!mediaData?.data.length) && !isLoading && (
          <div className="p-8 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No media files found.</p>
            {!selectionMode && (
              <Button className="mt-4">
                <Upload className="h-4 w-4 mr-2" />
                Upload your first file
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
