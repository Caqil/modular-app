'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
} from '@modular-app/ui';
import { 
  Upload,
  Download,
  X,
  AlertTriangle,
  CheckCircle,
  FileText,
  Globe,
  Package,
  Loader2,
  Info
} from 'lucide-react';

// Validation schema for plugin installation
const pluginInstallSchema = z.object({
  installMethod: z.enum(['file', 'url']),
  file: z.any().optional(),
  url: z.string().url('Invalid URL format').optional(),
  overwrite: z.boolean(),
  activate: z.boolean(),
}).refine(
  (data) => {
    if (data.installMethod === 'file' && !data.file) {
      return false;
    }
    if (data.installMethod === 'url' && !data.url) {
      return false;
    }
    return true;
  },
  {
    message: "Please select a file or enter a URL",
    path: ["file"],
  }
);

type PluginInstallData = z.infer<typeof pluginInstallSchema>;

interface PluginInstallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall?: (data: PluginInstallData) => Promise<{
    success: boolean;
    plugin?: any;
    message: string;
  }>;
  maxFileSize?: number; // in MB
  allowedFileTypes?: string[];
}

export function PluginInstallDialog({
  isOpen,
  onClose,
  onInstall,
  maxFileSize = 50,
  allowedFileTypes = ['.zip', '.tar.gz', '.tgz']
}: PluginInstallDialogProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installResult, setInstallResult] = useState<{
    success: boolean;
    message: string;
    plugin?: any;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<PluginInstallData>({
    resolver: zodResolver(pluginInstallSchema),
    defaultValues: {
      installMethod: 'file',
      overwrite: false,
      activate: true,
    },
  });

  const watchedValues = watch();

  // Reset form and state when dialog closes
  const handleClose = () => {
    reset();
    setInstallResult(null);
    setInstallProgress(0);
    setIsInstalling(false);
    onClose();
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    // Validate file type
    const isValidType = allowedFileTypes.some(type => 
      file.name.toLowerCase().endsWith(type.toLowerCase())
    );
    
    if (!isValidType) {
      alert(`Invalid file type. Allowed types: ${allowedFileTypes.join(', ')}`);
      return;
    }
    
    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      alert(`File size exceeds ${maxFileSize}MB limit`);
      return;
    }
    
    setValue('file', file);
    setValue('installMethod', 'file');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const onSubmit = async (data: PluginInstallData) => {
    if (!onInstall) return;
    
    setIsInstalling(true);
    setInstallProgress(0);
    setInstallResult(null);
    
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setInstallProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 200);
    
    try {
      const result = await onInstall(data);
      clearInterval(progressInterval);
      setInstallProgress(100);
      setInstallResult(result);
      
      if (result.success) {
        // Auto-close after success
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setInstallResult({
        success: false,
        message: error instanceof Error ? error.message : 'Installation failed'
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      {/* Dialog */}
      <Card className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Install Plugin
            </CardTitle>
            <CardDescription>
              Upload a plugin file or install from URL
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isInstalling}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Installation Progress */}
          {isInstalling && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Installing plugin...</span>
                <span className="text-sm text-muted-foreground">{Math.round(installProgress)}%</span>
              </div>
              <Progress value={installProgress} className="h-2" />
            </div>
          )}
          
          {/* Installation Result */}
          {installResult && (
            <div className={`p-4 border rounded-md ${
              installResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {installResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${
                  installResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {installResult.success ? 'Installation Successful' : 'Installation Failed'}
                </span>
              </div>
              <p className={`mt-1 text-sm ${
                installResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {installResult.message}
              </p>
              
              {installResult.success && installResult.plugin && (
                <div className="mt-3 p-3 bg-white border rounded-md">
                  <h4 className="font-medium">{installResult.plugin.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Version {installResult.plugin.version} by {installResult.plugin.author}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {!isInstalling && !installResult && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Installation Method */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Installation Method</Label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="file"
                      {...register('installMethod')}
                      className="h-4 w-4"
                    />
                    <FileText className="h-4 w-4" />
                    <span>Upload File</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="url"
                      {...register('installMethod')}
                      className="h-4 w-4"
                    />
                    <Globe className="h-4 w-4" />
                    <span>From URL</span>
                  </label>
                </div>
              </div>
              
              {/* File Upload */}
              {watchedValues.installMethod === 'file' && (
                <div className="space-y-3">
                  <Label>Plugin File</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                    
                    {watchedValues.file ? (
                      <div className="space-y-2">
                        <p className="font-medium">{watchedValues.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(watchedValues.file.size)}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setValue('file', undefined)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-lg font-medium">Drop plugin file here</p>
                        <p className="text-muted-foreground">
                          or click to browse files
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Browse Files
                        </Button>
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={allowedFileTypes.join(',')}
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 mb-1">
                      <Info className="h-3 w-3" />
                      <span>Allowed file types: {allowedFileTypes.join(', ')}</span>
                    </div>
                    <div>Maximum file size: {maxFileSize}MB</div>
                  </div>
                  
                  {typeof errors.file?.message === 'string' && (
                    <p className="text-sm text-red-600">{errors.file.message}</p>
                  )}
                </div>
              )}
              
              {/* URL Installation */}
              {watchedValues.installMethod === 'url' && (
                <div className="space-y-3">
                  <Label htmlFor="url">Plugin URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com/plugin.zip"
                    {...register('url')}
                  />
                  {errors.url && (
                    <p className="text-sm text-red-600">{errors.url.message}</p>
                  )}
                  
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      <span>Enter a direct download URL to a plugin archive</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Installation Options */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Installation Options</Label>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('activate')}
                      className="h-4 w-4"
                    />
                    <span>Activate plugin after installation</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('overwrite')}
                      className="h-4 w-4"
                    />
                    <span>Overwrite existing plugin (if exists)</span>
                  </label>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    (watchedValues.installMethod === 'file' && !watchedValues.file) ||
                    (watchedValues.installMethod === 'url' && !watchedValues.url)
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install Plugin
                </Button>
              </div>
            </form>
          )}
          
          {/* Loading State */}
          {isInstalling && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-lg font-medium">Installing plugin...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}