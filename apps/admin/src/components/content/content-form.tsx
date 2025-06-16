
'use client';

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Eye, Clock, Image, Settings } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Separator,
} from '@modular-app/ui';
import { ContentStatus, ContentType } from '@modular-app/core';
import { RichTextEditor } from './rich-text-editor';

const contentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  slug: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt too long').optional(),
  status: z.nativeEnum(ContentStatus),
  featuredImage: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  meta: z.record(z.any()).optional(),
  publishedAt: z.date().optional(),
});

type ContentFormData = z.infer<typeof contentSchema>;

interface ContentFormProps {
  initialData?: Partial<ContentFormData>;
  contentType: ContentType;
  onSave: (data: ContentFormData) => Promise<void>;
  onPreview?: (data: ContentFormData) => void;
  isLoading?: boolean;
  className?: string;
}

export const ContentForm: React.FC<ContentFormProps> = ({
  initialData,
  contentType,
  onSave,
  onPreview,
  isLoading = false,
  className,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      status: ContentStatus.DRAFT,
      ...initialData,
    },
  });

  const title = watch('title');
  const status = watch('status');

  // Auto-generate slug from title
  const generateSlug = useCallback((title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }, []);

  React.useEffect(() => {
    if (title && !initialData?.slug) {
      setValue('slug', generateSlug(title));
    }
  }, [title, generateSlug, setValue, initialData?.slug]);

  const onSubmit = async (data: ContentFormData) => {
    try {
      await onSave(data);
    } catch (error) {
      console.error('Failed to save content:', error);
    }
  };

  const handlePreview = () => {
    const data = watch();
    onPreview?.(data);
  };

  const getStatusColor = (status: ContentStatus) => {
    const colors = {
      [ContentStatus.PUBLISHED]: 'bg-green-100 text-green-800',
      [ContentStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [ContentStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [ContentStatus.PRIVATE]: 'bg-blue-100 text-blue-800',
      [ContentStatus.TRASH]: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {initialData ? `Edit ${contentType}` : `Create New ${contentType}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder={`Enter ${contentType} title...`}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  {...register('slug')}
                  placeholder="auto-generated-from-title"
                />
                {errors.slug && (
                  <p className="text-sm text-red-600">{errors.slug.message}</p>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <RichTextEditor
                  value={watch('content') || ''}
                  onChange={(value) => setValue('content', value)}
                  placeholder={`Start writing your ${contentType}...`}
                />
                {errors.content && (
                  <p className="text-sm text-red-600">{errors.content.message}</p>
                )}
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  {...register('excerpt')}
                  placeholder="Brief description (optional)"
                  rows={3}
                />
                {errors.excerpt && (
                  <p className="text-sm text-red-600">{errors.excerpt.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Advanced Settings</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {showAdvanced ? 'Hide' : 'Show'}
                </Button>
              </div>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4">
                {/* Categories (for posts) */}
                {contentType === ContentType.POST && (
                  <div className="space-y-2">
                    <Label>Categories</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* TODO: Load categories from API */}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="Enter tags separated by commas"
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                      setValue('tags', tags);
                    }}
                  />
                </div>

                {/* Publish Date */}
                <div className="space-y-2">
                  <Label htmlFor="publishedAt">Publish Date</Label>
                  <Input
                    id="publishedAt"
                    type="datetime-local"
                    {...register('publishedAt', { valueAsDate: true })}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setValue('status', value as ContentStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ContentStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={ContentStatus.PENDING}>Pending Review</SelectItem>
                    <SelectItem value={ContentStatus.PUBLISHED}>Published</SelectItem>
                    <SelectItem value={ContentStatus.PRIVATE}>Private</SelectItem>
                  </SelectContent>
                </Select>
                <Badge className={getStatusColor(status)}>{status}</Badge>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={isLoading || !isDirty}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
                
                {onPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                )}

                {status === ContentStatus.PUBLISHED && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setValue('status', ContentStatus.DRAFT)}
                    className="w-full"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Unpublish
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Featured Image</CardTitle>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" className="w-full">
                <Image className="h-4 w-4 mr-2" />
                Set Featured Image
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
};