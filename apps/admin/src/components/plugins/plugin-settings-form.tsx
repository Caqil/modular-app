'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
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
  FormSection,
  Badge,
} from '@modular-app/ui';
import { 
  Save,
  RotateCcw,
  AlertTriangle,
  Info,
  CheckCircle,
  Settings,
  Palette,
  Calendar,
  Link,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import type { PluginSettingsSchema } from '@modular-app/core';

interface PluginSettingsFormProps {
  pluginName: string;
  pluginTitle: string;
  pluginDescription?: string;
  settingsSchema: PluginSettingsSchema;
  currentSettings?: Record<string, any>;
  onSave?: (settings: Record<string, any>) => Promise<void>;
  onReset?: () => Promise<void>;
  isLoading?: boolean;
}

interface SettingField {
  key: string;
  config: PluginSettingsSchema[string];
  group?: string;
}

export function PluginSettingsForm({
  pluginName,
  pluginTitle,
  pluginDescription,
  settingsSchema,
  currentSettings = {},
  onSave,
  onReset,
  isLoading = false
}: PluginSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty }
  } = useForm({
    defaultValues: useMemo(() => {
      const defaults: Record<string, any> = {};
      Object.entries(settingsSchema).forEach(([key, config]) => {
        defaults[key] = currentSettings[key] ?? config.default;
      });
      return defaults;
    }, [settingsSchema, currentSettings]),
  });

  const watchedValues = watch();

  // Group settings by group property
  const groupedSettings = useMemo(() => {
    const groups: Record<string, SettingField[]> = {};
    
    Object.entries(settingsSchema).forEach(([key, config]) => {
      const group = config.group || 'general';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push({ key, config, group });
    });

    return groups;
  }, [settingsSchema]);

  // Check if a field should be visible based on conditional logic
  const isFieldVisible = (config: PluginSettingsSchema[string]): boolean => {
    if (!config.conditional) return true;
    
    const { field, value, operator = '=' } = config.conditional;
    const fieldValue = watchedValues[field];
    
    switch (operator) {
      case '=':
        return fieldValue === value;
      case '!=':
        return fieldValue !== value;
      case '>':
        return fieldValue > value;
      case '<':
        return fieldValue < value;
      case '>=':
        return fieldValue >= value;
      case '<=':
        return fieldValue <= value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return true;
    }
  };

  const validateField = (key: string, value: any, config: PluginSettingsSchema[string]): string | undefined => {
    // Required validation
    if (config.required && (!value || value.toString().trim() === '')) {
      return `${config.label} is required`;
    }
    
    // Skip further validation if field is empty and not required
    if (!value && !config.required) return undefined;
    
    // Type-specific validation
    if (config.validation) {
      const { min, max, pattern } = config.validation;
      
      if (config.type === 'string' || config.type === 'textarea' || config.type === 'email' || config.type === 'url') {
        const strValue = value.toString();
        if (min && strValue.length < min) {
          return `${config.label} must be at least ${min} characters`;
        }
        if (max && strValue.length > max) {
          return `${config.label} must be no more than ${max} characters`;
        }
        if (pattern && !new RegExp(pattern).test(strValue)) {
          return `${config.label} format is invalid`;
        }
      }
      
      if (config.type === 'number') {
        const numValue = Number(value);
        if (min && numValue < min) {
          return `${config.label} must be at least ${min}`;
        }
        if (max && numValue > max) {
          return `${config.label} must be no more than ${max}`;
        }
      }
      
      if (config.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address';
      }
      
      if (config.type === 'url' && !/^https?:\/\/.+/.test(value)) {
        return 'Please enter a valid URL';
      }
    }
    
    return undefined;
  };

  const onSubmit = async (data: Record<string, any>) => {
    // Validate all fields
    const validationErrors: Record<string, string> = {};
    Object.entries(settingsSchema).forEach(([key, config]) => {
      if (isFieldVisible(config)) {
        const error = validateField(key, data[key], config);
        if (error) {
          validationErrors[key] = error;
        }
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setSaveResult({
        success: false,
        message: 'Please fix the validation errors before saving'
      });
      return;
    }

    setIsSaving(true);
    setSaveResult(null);
    
    try {
      await onSave?.(data);
      setSaveResult({
        success: true,
        message: 'Settings saved successfully!'
      });
    } catch (error) {
      setSaveResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save settings'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await onReset?.();
      reset();
      setSaveResult({
        success: true,
        message: 'Settings reset to defaults'
      });
    } catch (error) {
      setSaveResult({
        success: false,
        message: 'Failed to reset settings'
      });
    }
  };

  const renderField = (field: SettingField) => {
    const { key, config } = field;
    const error = validateField(key, watchedValues[key], config);
    
    if (!isFieldVisible(config)) {
      return null;
    }

    const registerOptions = config.required !== undefined ? { required: config.required } : undefined;
    const commonProps = {
      id: key,
      ...register(key, registerOptions),
    };

    switch (config.type) {
      case 'string':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {config.label}
              {config.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input {...commonProps} type="text" />
            {config.description && (
              <p className="text-sm text-muted-foreground">{config.description}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {config.label}
              {config.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea {...commonProps} rows={4} />
            {config.description && (
              <p className="text-sm text-muted-foreground">{config.description}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'number':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {config.label}
              {config.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input 
              {...commonProps} 
              type="number" 
              min={config.validation?.min}
              max={config.validation?.max}
            />
            {config.description && (
              <p className="text-sm text-muted-foreground">{config.description}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'boolean':
        return (
          <div key={key} className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <Label htmlFor={key} className="font-medium">
                {config.label}
              </Label>
              {config.description && (
                <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
              )}
            </div>
            <input
              {...commonProps}
              type="checkbox"
              className="h-4 w-4"
            />
          </div>
        );

      case 'select':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {config.label}
              {config.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={watchedValues[key]?.toString() || ''}
              onValueChange={(value) => setValue(key, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent>
                {config.choices && Object.entries(config.choices).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {config.description && (
              <p className="text-sm text-muted-foreground">{config.description}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'email':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {config.label}
              {config.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input {...commonProps} type="email" />
            {config.description && (
              <p className="text-sm text-muted-foreground">{config.description}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'url':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {config.label}
              {config.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input {...commonProps} type="url" className="pl-10" />
            </div>
            {config.description && (
              <p className="text-sm text-muted-foreground">{config.description}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'color':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {config.label}
              {config.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input {...commonProps} type="color" className="pl-10 w-24" />
              </div>
              <Input 
                {...register(key)}
                type="text" 
                placeholder="#000000"
                className="flex-1"
              />
            </div>
            {config.description && (
              <p className="text-sm text-muted-foreground">{config.description}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {config.label}
              {config.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input {...commonProps} type="date" className="pl-10" />
            </div>
            {config.description && (
              <p className="text-sm text-muted-foreground">{config.description}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'file':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {config.label}
              {config.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="relative">
              <Upload className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input {...commonProps} type="file" className="pl-10" />
            </div>
            {config.description && (
              <p className="text-sm text-muted-foreground">{config.description}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );

      default:
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {config.label}
              {config.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input {...commonProps} type="text" />
            {config.description && (
              <p className="text-sm text-muted-foreground">{config.description}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );
    }
  };

  const formatGroupName = (groupName: string) => {
    return groupName
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {pluginTitle} Settings
          </CardTitle>
          {pluginDescription && (
            <CardDescription>{pluginDescription}</CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Save Result */}
      {saveResult && (
        <div className={`p-4 border rounded-md ${
          saveResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {saveResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span className={`font-medium ${
              saveResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {saveResult.message}
            </span>
          </div>
        </div>
      )}

      {/* Settings Groups */}
      {Object.entries(groupedSettings).map(([groupName, fields]) => (
        <Card key={groupName}>
          <CardHeader>
            <CardTitle className="text-lg">
              {formatGroupName(groupName)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormSection>
              <div className="space-y-6">
                {fields.map(renderField)}
              </div>
            </FormSection>
          </CardContent>
        </Card>
      ))}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isLoading || isSaving}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>

        <Button
          type="submit"
          disabled={isLoading || isSaving || !isDirty}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Help Text */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Plugin Settings Help</p>
            <p>
              Changes to these settings will affect how the <strong>{pluginTitle}</strong> plugin behaves. 
              Make sure to save your changes before leaving this page.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}