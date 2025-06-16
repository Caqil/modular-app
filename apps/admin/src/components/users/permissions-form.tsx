'use client';

import React, { useState, useMemo } from 'react';
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
  Badge,
  FormSection,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@modular-app/ui';
import { 
  Shield, 
  User, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Save,
  RotateCcw
} from 'lucide-react';

// Permission categories and their permissions
interface Permission {
  name: string;
  description: string;
  category: string;
  level: 'basic' | 'advanced' | 'dangerous';
}

const PERMISSIONS: Permission[] = [
  // Content Management
  { name: 'content:read', description: 'View content', category: 'content', level: 'basic' },
  { name: 'content:create', description: 'Create new content', category: 'content', level: 'basic' },
  { name: 'content:update', description: 'Edit any content', category: 'content', level: 'basic' },
  { name: 'content:update:own', description: 'Edit own content only', category: 'content', level: 'basic' },
  { name: 'content:delete', description: 'Delete any content', category: 'content', level: 'advanced' },
  { name: 'content:delete:own', description: 'Delete own content only', category: 'content', level: 'basic' },
  { name: 'content:publish', description: 'Publish content', category: 'content', level: 'basic' },
  { name: 'content:moderate', description: 'Moderate comments', category: 'content', level: 'advanced' },

  // User Management
  { name: 'user:read', description: 'View user profiles', category: 'user', level: 'basic' },
  { name: 'user:create', description: 'Create new users', category: 'user', level: 'advanced' },
  { name: 'user:update', description: 'Edit user profiles', category: 'user', level: 'advanced' },
  { name: 'user:delete', description: 'Delete users', category: 'user', level: 'dangerous' },
  { name: 'user:roles', description: 'Manage user roles', category: 'user', level: 'dangerous' },
  { name: 'user:permissions', description: 'Manage user permissions', category: 'user', level: 'dangerous' },

  // Media Management
  { name: 'media:read', description: 'View media library', category: 'media', level: 'basic' },
  { name: 'media:upload', description: 'Upload files', category: 'media', level: 'basic' },
  { name: 'media:delete', description: 'Delete media files', category: 'media', level: 'advanced' },
  { name: 'media:organize', description: 'Organize media folders', category: 'media', level: 'basic' },

  // Admin Access
  { name: 'admin:access', description: 'Access admin panel', category: 'admin', level: 'advanced' },
  { name: 'admin:settings', description: 'Manage site settings', category: 'admin', level: 'dangerous' },
  { name: 'admin:plugins', description: 'Manage plugins', category: 'admin', level: 'dangerous' },
  { name: 'admin:themes', description: 'Manage themes', category: 'admin', level: 'dangerous' },
  { name: 'admin:system', description: 'System administration', category: 'admin', level: 'dangerous' },

  // Analytics & Reports
  { name: 'analytics:read', description: 'View analytics', category: 'analytics', level: 'basic' },
  { name: 'analytics:export', description: 'Export reports', category: 'analytics', level: 'advanced' },

  // Comments Management
  { name: 'comments:read', description: 'View comments', category: 'comments', level: 'basic' },
  { name: 'comments:moderate', description: 'Moderate comments', category: 'comments', level: 'advanced' },
  { name: 'comments:delete', description: 'Delete comments', category: 'comments', level: 'advanced' },
];

// Validation schema for permissions form
const permissionsSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  customPermissions: z.array(z.string()),
  expiryDate: z.string().optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

type PermissionsData = z.infer<typeof permissionsSchema>;

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  currentPermissions: string[];
}

interface PermissionsFormProps {
  users?: User[];
  selectedUser?: User;
  onSave?: (data: PermissionsData & { userId: string }) => Promise<void>;
  onUserSelect?: (userId: string) => Promise<User>;
  isLoading?: boolean;
}

export function PermissionsForm({ 
  users = [],
  selectedUser,
  onSave,
  onUserSelect,
  isLoading 
}: PermissionsFormProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['content']);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty }
  } = useForm<PermissionsData>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: {
      userId: selectedUser?.id || '',
      customPermissions: selectedUser?.currentPermissions || [],
      expiryDate: '',
      notes: '',
    },
  });

  const watchedValues = watch();

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const filtered = PERMISSIONS.filter(permission =>
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      (acc[permission.category] ??= []).push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [searchTerm]);

  // Handle user selection
  const handleUserChange = async (userId: string) => {
    if (onUserSelect) {
      const user = await onUserSelect(userId);
      setValue('userId', userId);
      setValue('customPermissions', user.currentPermissions || []);
      reset({
        userId,
        customPermissions: user.currentPermissions || [],
        expiryDate: '',
        notes: '',
      });
    }
  };

  // Handle permission toggle
  const handlePermissionToggle = (permissionName: string) => {
    const currentPermissions = watchedValues.customPermissions || [];
    const isSelected = currentPermissions.includes(permissionName);
    
    if (isSelected) {
      setValue('customPermissions', currentPermissions.filter(p => p !== permissionName));
    } else {
      setValue('customPermissions', [...currentPermissions, permissionName]);
    }
  };

  // Handle category toggle
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Handle select all in category
  const handleSelectAllInCategory = (category: string) => {
    const categoryPermissions = permissionsByCategory[category]?.map(p => p.name) || [];
    const currentPermissions = watchedValues.customPermissions || [];
    const allSelected = categoryPermissions.every(p => currentPermissions.includes(p));
    
    if (allSelected) {
      // Deselect all in category
      setValue('customPermissions', currentPermissions.filter(p => !categoryPermissions.includes(p)));
    } else {
      // Select all in category
      const newPermissions = [...new Set([...currentPermissions, ...categoryPermissions])];
      setValue('customPermissions', newPermissions);
    }
  };

  const onSubmit = async (data: PermissionsData) => {
    if (!data.userId) return;
    
    try {
      await onSave?.({
        ...data,
        userId: data.userId,
      });
    } catch (error) {
      console.error('Failed to save permissions:', error);
    }
  };

  const getLevelColor = (level: Permission['level']) => {
    switch (level) {
      case 'basic': return 'bg-green-100 text-green-800';
      case 'advanced': return 'bg-yellow-100 text-yellow-800';
      case 'dangerous': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Selection
          </CardTitle>
          <CardDescription>
            Select a user to manage their permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-2">
              <Label htmlFor="userId">Select User *</Label>
              <Select
                value={watchedValues.userId}
                onValueChange={handleUserChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{getDisplayName(user)}</span>
                        <Badge variant="secondary" className="ml-2">
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.userId && (
                <p className="text-sm text-red-600">{errors.userId.message}</p>
              )}
            </div>

            {selectedUser && (
              <div className="p-4 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{getDisplayName(selectedUser)}</h4>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>
            )}
          </FormSection>
        </CardContent>
      </Card>

      {/* Permissions Management */}
      {watchedValues.userId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Custom Permissions
            </CardTitle>
            <CardDescription>
              Grant specific permissions beyond the user's role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Permissions</Label>
              <Input
                id="search"
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Permission Categories */}
            <div className="space-y-3">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => {
                const isExpanded = expandedCategories.includes(category);
                const selectedCount = permissions.filter(p => 
                  watchedValues.customPermissions?.includes(p.name)
                ).length;
                const totalCount = permissions.length;

                return (
                  <div key={category} className="border rounded-md">
                    <Collapsible>
                      <CollapsibleTrigger
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/50"
                        onClick={() => toggleCategory(category)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium capitalize">{category}</span>
                          <Badge variant="outline">
                            {selectedCount}/{totalCount}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAllInCategory(category);
                          }}
                        >
                          {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
                        </Button>
                      </CollapsibleTrigger>
                      
                      {isExpanded && (
                        <CollapsibleContent>
                          <div className="p-4 pt-0 space-y-3">
                            {permissions.map((permission) => {
                              const isSelected = watchedValues.customPermissions?.includes(permission.name);
                              
                              return (
                                <div
                                  key={permission.name}
                                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer"
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
                                      <div className="font-medium text-sm">
                                        {permission.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {permission.description}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={getLevelColor(permission.level)}>
                                      {permission.level}
                                    </Badge>
                                    {permission.level === 'dangerous' && (
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  </div>
                );
              })}
            </div>

            {/* Selected Permissions Summary */}
            {watchedValues.customPermissions && watchedValues.customPermissions.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-md">
                <Label className="text-sm font-medium text-blue-900">
                  Selected Permissions ({watchedValues.customPermissions.length})
                </Label>
                <div className="mt-2 flex flex-wrap gap-1">
                  {watchedValues.customPermissions.slice(0, 10).map((permission) => (
                    <Badge key={permission} variant="secondary" className="text-xs">
                      {permission}
                    </Badge>
                  ))}
                  {watchedValues.customPermissions.length > 10 && (
                    <Badge variant="secondary" className="text-xs">
                      +{watchedValues.customPermissions.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Settings */}
      {watchedValues.userId && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Settings</CardTitle>
            <CardDescription>
              Configure expiry and notes for these permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormSection>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    {...register('expiryDate')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for permanent permissions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Reason for granting these permissions..."
                    {...register('notes')}
                  />
                  {errors.notes && (
                    <p className="text-sm text-red-600">{errors.notes.message}</p>
                  )}
                </div>
              </div>
            </FormSection>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {watchedValues.userId && (
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Changes
          </Button>

          <Button type="submit" disabled={isLoading || !isDirty}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Permissions'}
          </Button>
        </div>
      )}
    </form>
  );
}