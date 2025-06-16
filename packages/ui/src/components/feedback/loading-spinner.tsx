'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const loadingSpinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
    variant: {
      default: 'text-primary',
      muted: 'text-muted-foreground',
      destructive: 'text-destructive',
      success: 'text-green-600',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'default',
  },
});

interface LoadingSpinnerProps
  extends VariantProps<typeof loadingSpinnerVariants> {
  className?: string;
  label?: string;
  showLabel?: boolean;
}

export function LoadingSpinner({
  size,
  variant,
  className,
  label = 'Loading...',
  showLabel = false,
}: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Loader2
        className={cn(loadingSpinnerVariants({ size, variant }), className)}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

// Full page loading overlay
interface LoadingOverlayProps {
  message?: string;
  size?: VariantProps<typeof loadingSpinnerVariants>['size'];
}

export function LoadingOverlay({
  message = 'Loading...',
  size = 'lg',
}: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size={size} />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Inline loading state
interface LoadingStateProps {
  children: React.ReactNode;
  loading: boolean;
  fallback?: React.ReactNode;
  size?: VariantProps<typeof loadingSpinnerVariants>['size'];
}

export function LoadingState({
  children,
  loading,
  fallback,
  size = 'md',
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        {fallback || <LoadingSpinner size={size} showLabel />}
      </div>
    );
  }

  return <>{children}</>;
}
