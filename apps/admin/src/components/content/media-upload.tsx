
'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Check, AlertCircle, Image, FileText } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Progress,
  Badge,
} from '@modular-app/ui';
import { ADMIN_CONSTANTS } from '../../lib/constants';

interface UploadFile extends File {
  id: string;
  preview: string | undefined;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface MediaUploadProps {
  allowedTypes?: string[];
  maxSize?: number;
  maxFiles?: number;
  onUploadComplete?: (files: any[]) => void;
  onCancel?: () => void;
  className?: string;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  allowedTypes = [...ADMIN_CONSTANTS.ALLOWED_IMAGE_TYPES, ...ADMIN_CONSTANTS.ALLOWED_DOCUMENT_TYPES],
  maxSize = ADMIN_CONSTANTS.MAX_FILE_SIZE,
  maxFiles = 10,
  onUploadComplete,
  onCancel,
  className,
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      ...file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));

    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      console.warn(`File ${file.name} rejected:`, errors);
    });
  }, [maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    maxFiles,
  });

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const uploadFiles = async () => {
    setIsUploading(true);
    
    for (const file of files) {
      if (file.status !== 'pending') continue;

      try {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f
        ));

        // Simulate upload progress
        const formData = new FormData();
        formData.append('file', file);

        // TODO: Replace with actual upload API
        await new Promise((resolve) => {
          let progress = 0;
          const interval = setInterval(() => {
            progress += 10;
            setFiles(prev => prev.map(f => 
              f.id === file.id ? { ...f, progress } : f
            ));
            
            if (progress >= 100) {
              clearInterval(interval);
              resolve(true);
            }
          }, 100);
        });

        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'success', progress: 100 } : f
        ));
        
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'error', error: 'Upload failed' } 
            : f
        ));
      }
    }

    setIsUploading(false);
    
    const successFiles = files.filter(f => f.status === 'success');
    if (onUploadComplete && successFiles.length > 0) {
      onUploadComplete(successFiles);
    }
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

  const getStatusColor = (status: UploadFile['status']) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      uploading: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  const canUpload = files.length > 0 && files.some(f => f.status === 'pending') && !isUploading;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upload Media</CardTitle>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={uploadFiles} disabled={!canUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload {files.filter(f => f.status === 'pending').length} Files
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-muted-foreground mb-4">
            or click to select files
          </p>
          <div className="text-sm text-muted-foreground">
            <p>Max file size: {formatFileSize(maxSize)}</p>
            <p>Max files: {maxFiles}</p>
            <p>Allowed types: {allowedTypes.map(type => type.split('/')[1]).join(', ')}</p>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Files to Upload ({files.length})</h3>
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                {/* Preview */}
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} • {file.type}
                  </p>
                  
                  {/* Progress */}
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <Progress value={file.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {file.progress}% uploaded
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {file.status === 'error' && file.error && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {file.error}
                    </p>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(file.status)}>
                    {file.status === 'uploading' && <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />}
                    {file.status === 'success' && <Check className="h-3 w-3 mr-1" />}
                    {file.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {file.status}
                  </Badge>
                  
                  {file.status !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Summary */}
        {files.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <p>
              {files.filter(f => f.status === 'success').length} uploaded, {' '}
              {files.filter(f => f.status === 'pending').length} pending, {' '}
              {files.filter(f => f.status === 'error').length} failed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
