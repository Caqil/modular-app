
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { FileX, Search, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils/cn';

const emptyStateVariants = cva(
  'flex flex-col items-center justify-center text-center space-y-4',
  {
    variants: {
      size: {
        sm: 'py-8',
        md: 'py-12',
        lg: 'py-16',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

interface EmptyStateProps extends VariantProps<typeof emptyStateVariants> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const defaultIcons = {
  noData: FileX,
  noResults: Search,
  create: Plus,
  refresh: RefreshCw,
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size,
  className,
}: EmptyStateProps) {
  const DefaultIcon = defaultIcons.noData;

  return (
    <div className={cn(emptyStateVariants({ size }), className)}>
      <div className="text-muted-foreground">
        {icon || <DefaultIcon className="h-12 w-12" />}
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        )}
      </div>
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}