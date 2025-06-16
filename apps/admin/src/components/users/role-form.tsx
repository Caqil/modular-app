'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  FormSection,
} from '@modular-app/ui';
import { 
  Shield, 
  User, 
  Crown, 
  Edit, 
  Eye, 
  Trash2,
  Save,
  X,
  AlertTriangle,
  Users,
  Check
} from 'lucide-react';

// Role validation schema
const roleSchema = z.object({
  name: z.string()
    .min(1, 'Role name is required')
    .max(50, 'Role name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Role name can only contain letters, numbers, hyphens, and underscores'),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  permissions: z.array(z.string()),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')
    .optional(),
  isDefault: z.boolean(),
  canBeDeleted: z.boolean(),
  maxUsers: z.number()
    .min(0, 'Max users cannot be negative')
    .optional(),
  priority: z.number()
    .min(0)
    .max(100, 'Priority must be between 0 and 100'),
});

type RoleData = z.infer<typeof roleSchema>;

// Predefined role templates
const ROLE_TEMPLATES = {
  super_admin: {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: ['*'],
    color: '#dc2626',
    priority: 100,
    canBeDeleted: false,
  },
  admin: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access with most permissions',
    permissions: [
      'admin:*',
      'content:*',
      'user:read',
      'user:update',
      'media:*',
      'analytics:*',
    ],
    color: '#7c2d12',
    priority: 90,
    canBeDeleted: false,
  },
  editor: {
    name: 'editor',
    displayName: 'Editor',
    description: 'Can manage and publish content',
    permissions: [
      'content:*',
      'media:*',
      'user:read',
      'comments:moderate',
    ],
    color: '#1d4ed8',
    priority: 70,
    canBeDeleted: true,
  },
  author: {
    name: 'author',
    displayName: 'Author',
    description: 'Can create and manage own content',
    permissions: [
      'content:create',
      'content:update:own',
      'content:delete:own',
      'content:read',
      'media:upload',
      'media:read',
    ],
    color: '#059669',
    priority: 50,
    canBeDeleted: true,
  },
  contributor: {
    name: 'contributor',
    displayName: 'Contributor',
    description: 'Can create and edit own content (requires approval)',
    permissions: [
      'content:create',
      'content:update:own',
      'content:read',
    ],
    color: '#d97706',
    priority: 30,
    canBeDeleted: true,
  },
  subscriber: {
    name: 'subscriber',
    displayName: 'Subscriber',
    description: 'Basic access to view content',
    permissions: [
      'content:read',
    ],
    color: '#6b7280',
    priority: 10,
    canBeDeleted: true,
  },
};

// Available permissions organized by category
const AVAILABLE_PERMISSIONS = {
  content: [
    { name: 'content:read', description: 'View content' },
    { name: 'content:create', description: 'Create new content' },
    { name: 'content:update', description: 'Edit any content' },
    { name: 'content:update:own', description: 'Edit own content only' },
    { name: 'content:delete', description: 'Delete any content' },
    { name: 'content:delete:own', description: 'Delete own content only' },
    { name: 'content:publish', description: 'Publish content' },
    { name: 'content:moderate', description: 'Moderate content' },
  ],
  user: [
    { name: 'user:read', description: 'View user profiles' },
    { name: 'user:create', description: 'Create new users' },
    { name: 'user:update', description: 'Edit user profiles' },
    { name: 'user:delete', description: 'Delete users' },
    { name: 'user:roles', description: 'Manage user roles' },
  ],
  media: [
    { name: 'media:read', description: 'View media library' },
    { name: 'media:upload', description: 'Upload files' },
    { name: 'media:delete', description: 'Delete media files' },
    { name: 'media:organize', description: 'Organize media folders' },
  ],
  admin: [
    { name: 'admin:access', description: 'Access admin panel' },
    { name: 'admin:settings', description: 'Manage site settings' },
    { name: 'admin:plugins', description: 'Manage plugins' },
    { name: 'admin:themes', description: 'Manage themes' },
    { name: 'admin:system', description: 'System administration' },
  ],
  analytics: [
    { name: 'analytics:read', description: 'View analytics' },
    { name: 'analytics:export', description: 'Export reports' },
  ],
  comments: [
    { name: 'comments:read', description: 'View comments' },
    { name: 'comments:moderate', description: 'Moderate comments' },
    { name: 'comments:delete', description: 'Delete comments' },
  ],
};

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  color?: string;
  isDefault: boolean;
  canBeDeleted: boolean;
  userCount?: number;
  priority: number;
}

interface RoleFormProps {
  role?: Role;
  existingRoles?: Role[];
  onSave?: (data: RoleData) => Promise<void>;
  onDelete?: (roleId: string) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export function RoleForm({ 
  role,
  existingRoles = [],
  onSave,
  onDelete,
  onCancel,
  isLoading,
  mode = 'create'
}: RoleFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty }
  } = useForm<RoleData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name || '',
      displayName: role?.displayName || '',
      description: role?.description || '',
      permissions: role?.permissions || [],
      color: role?.color || '#6b7280',
      isDefault: role?.isDefault || false,
      canBeDeleted: role?.canBeDeleted ?? true,
      maxUsers: undefined,
      priority: role?.priority || 10,
    },
  });

  const watchedValues = watch();

  // Apply role template
  const applyTemplate = (templateKey: string) => {
    const template = ROLE_TEMPLATES[templateKey as keyof typeof ROLE_TEMPLATES];
    if (template) {
      setValue('name', template.name);
      setValue('displayName', template.displayName);
      setValue('description', template.description);
      setValue('permissions', template.permissions);
      setValue('color', template.color);
      setValue('priority', template.priority);
      setValue('canBeDeleted', template.canBeDeleted);
    }
  };

  // Handle permission toggle
  const handlePermissionToggle = (permission: string) => {
    const currentPermissions = watchedValues.permissions || [];
    const isSelected = currentPermissions.includes(permission);
    
    if (isSelected) {
      setValue('permissions', currentPermissions.filter(p => p !== permission));
    } else {
      setValue('permissions', [...currentPermissions, permission]);
    }
  };

  // Handle category permission toggle
  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = AVAILABLE_PERMISSIONS[category as keyof typeof AVAILABLE_PERMISSIONS];
    const permissionNames = categoryPermissions.map(p => p.name);
    const currentPermissions = watchedValues.permissions || [];
    
    const allSelected = permissionNames.every(p => currentPermissions.includes(p));
    
    if (allSelected) {
      // Remove all category permissions
      setValue('permissions', currentPermissions.filter(p => !permissionNames.includes(p)));
    } else {
      // Add all category permissions
      const newPermissions = [...new Set([...currentPermissions, ...permissionNames])];
      setValue('permissions', newPermissions);
    }
  };

  const onSubmit = async (data: RoleData) => {
    try {
      await onSave?.(data);
    } catch (error) {
      console.error('Failed to save role:', error);
    }
  };

  const handleDelete = async () => {
    if (role?.id) {
      try {
        await onDelete?.(role.id);
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error('Failed to delete role:', error);
      }
    }
  };

  const isSystemRole = role && !role.canBeDeleted;
  const hasUsers = role && role.userCount && role.userCount > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Role Template Selection (Create mode only) */}
      {mode === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Role Template
            </CardTitle>
            <CardDescription>
              Start with a predefined role template or create from scratch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                <div
                  key={key}
                  className={`p-3 border rounded-md cursor-pointer hover:bg-muted/50 ${
                    selectedTemplate === key ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedTemplate(key);
                    applyTemplate(key);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: template.color }}
                    />
                    <span className="font-medium text-sm">{template.displayName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Role Information
          </CardTitle>
          <CardDescription>
            Configure the basic role details and properties
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  placeholder="role_name"
                  disabled={isSystemRole}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
                {isSystemRole && (
                  <p className="text-xs text-muted-foreground">
                    System roles cannot be renamed
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  placeholder="Role Display Name"
                  {...register('displayName')}
                />
                {errors.displayName && (
                  <p className="text-sm text-red-600">{errors.displayName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this role's purpose..."
                rows={3}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Role Color</Label>
                <Input
                  id="color"
                  type="color"
                  {...register('color')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority (0-100)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="100"
                  {...register('priority', { valueAsNumber: true })}
                />
                {errors.priority && (
                  <p className="text-sm text-red-600">{errors.priority.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUsers">Max Users (Optional)</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  {...register('maxUsers', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Default Role</Label>
                  <p className="text-sm text-muted-foreground">
                    Assign this role to new users by default
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  disabled={isSystemRole}
                  {...register('isDefault')}
                />
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions
          </CardTitle>
          <CardDescription>
            Configure what actions this role can perform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* All Permissions Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
            <div>
              <Label className="font-medium">All Permissions</Label>
              <p className="text-sm text-muted-foreground">
                Grant all system permissions (Super Admin)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={watchedValues.permissions?.includes('*')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setValue('permissions', ['*']);
                  } else {
                    setValue('permissions', []);
                  }
                }}
              />
              {watchedValues.permissions?.includes('*') && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>

          {/* Category Permissions */}
          {!watchedValues.permissions?.includes('*') && (
            <div className="space-y-4">
              {Object.entries(AVAILABLE_PERMISSIONS).map(([category, permissions]) => {
                const selectedInCategory = permissions.filter(p => 
                  watchedValues.permissions?.includes(p.name)
                ).length;
                const totalInCategory = permissions.length;
                const allSelected = selectedInCategory === totalInCategory;

                return (
                  <div key={category} className="border rounded-md">
                    <div className="p-4 bg-muted/25">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium capitalize">{category}</span>
                          <Badge variant="outline">
                            {selectedInCategory}/{totalInCategory}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCategoryToggle(category)}
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-2">
                      {permissions.map((permission) => {
                        const isSelected = watchedValues.permissions?.includes(permission.name);
                        
                        return (
                          <div
                            key={permission.name}
                            className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                            onClick={() => handlePermissionToggle(permission.name)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 border rounded ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600 flex items-center justify-center' 
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && (
                                  <Check className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <div>
                                <span className="font-mono text-sm">{permission.name}</span>
                                <p className="text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Permissions Summary */}
          {watchedValues.permissions && watchedValues.permissions.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-md">
              <Label className="text-sm font-medium text-blue-900">
                Selected Permissions ({watchedValues.permissions.length})
              </Label>
              <div className="mt-2 flex flex-wrap gap-1">
                {watchedValues.permissions.slice(0, 10).map((permission) => (
                  <Badge key={permission} variant="secondary" className="text-xs">
                    {permission}
                  </Badge>
                ))}
                {watchedValues.permissions.length > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    +{watchedValues.permissions.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Users (Edit mode) */}
      {mode === 'edit' && role && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Users
            </CardTitle>
            <CardDescription>
              Users currently assigned to this role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">{role.userCount || 0}</div>
              <div className="text-sm text-muted-foreground">
                users assigned to this role
              </div>
            </div>
            {hasUsers && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Deleting this role will affect {role.userCount} users
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          {mode === 'edit' && role?.canBeDeleted && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Role
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>

          <Button type="submit" disabled={isLoading || !isDirty}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Role' : 'Update Role'}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete Role
              </CardTitle>
              <CardDescription>
                Are you sure you want to delete this role? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasUsers && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                  <p className="text-sm text-red-800">
                    This will affect {role?.userCount} users. They will need to be reassigned to another role.
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete Role'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </form>
  );
}