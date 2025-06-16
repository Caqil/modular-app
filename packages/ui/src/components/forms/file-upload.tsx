'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Upload, X, File, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn, formatFileSize } from '../../utils/cn';

const fileUploadVariants = cva(
  'border-2 border-dashed rounded-lg transition-colors',
  {
    variants: {
      state: {
        default: 'border-border hover:border-primary/50',
        dragOver: 'border-primary bg-primary/5',
        error: 'border-destructive bg-destructive/5',
        success: 'border-green-500 bg-green-50',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'md',
    },
  }
);

interface FileWithProgress extends File {
  id: string;
  progress?: number;
  status?: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface FileUploadProps extends VariantProps<typeof fileUploadVariants> {
  onFileSelect: (files: File[]) => void;
  onFileRemove?: (fileId: string) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  files?: FileWithProgress[];
  showFileList?: boolean;
  uploadProgress?: Record<string, number>;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  accept,
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  disabled = false,
  size,
  className,
  files = [],
  showFileList = true,
  uploadProgress = {},
}: FileUploadProps) {
  const [dragState, setDragState] = React.useState<'default' | 'dragOver'>(
    'default'
  );
  const [error, setError] = React.useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFiles = (
    fileList: FileList
  ): { valid: File[]; errors: string[] } => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      if (file.size > maxSize) {
        errors.push(
          `${file.name} is too large (max ${formatFileSize(maxSize)})`
        );
        return;
      }

      if (files.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      validFiles.push(file);
    });

    return { valid: validFiles, errors };
  };

  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList) return;

    const { valid, errors } = validateFiles(fileList);

    if (errors.length > 0) {
      setError(errors[0] ?? '');
      return;
    }

    setError('');
    onFileSelect(valid);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragState('dragOver');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragState('default');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragState('default');

    if (disabled) return;

    const fileList = e.dataTransfer.files;
    handleFileSelect(fileList);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const getUploadState = () => {
    if (error) return 'error';
    if (dragState === 'dragOver') return 'dragOver';
    return 'default';
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          fileUploadVariants({ state: getUploadState(), size }),
          disabled && 'pointer-events-none opacity-50',
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center space-y-2 text-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {dragState === 'dragOver'
                ? 'Drop files here'
                : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground">
              {accept ? `Supports: ${accept}` : 'Any file type'} • Max{' '}
              {formatFileSize(maxSize)} • Up to {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {showFileList && files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Files ({files.length})</p>
          <div className="space-y-2">
            {files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                progress={uploadProgress[file.id]}
                onRemove={() => onFileRemove?.(file.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FileItem({
  file,
  progress,
  onRemove,
}: {
  file: FileWithProgress;
  progress?: number | undefined;
  onRemove: () => void;
}) {
  const isImage = file.type.startsWith('image/');
  const Icon = isImage ? Image : File;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Icon className="h-8 w-8 flex-shrink-0 text-muted-foreground" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </p>

        {typeof progress === 'number' && progress < 100 && (
          <Progress value={progress} className="mt-1 h-1" />
        )}
      </div>

      <div className="flex items-center gap-2">
        {file.status === 'completed' && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
        {file.status === 'error' && (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
