'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { cn } from '../../utils/cn';

const confirmationDialogVariants = cva('', {
  variants: {
    variant: {
      default: '',
      destructive: 'text-destructive',
      warning: 'text-yellow-600',
      success: 'text-green-600',
      info: 'text-blue-600',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const iconMap = {
  default: Info,
  destructive: XCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

interface ConfirmationDialogProps
  extends VariantProps<typeof confirmationDialogVariants> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  disabled = false,
  showIcon = true,
  variant = 'default',
  children,
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const iconKey =
    variant &&
    ['default', 'destructive', 'warning', 'success', 'info'].includes(variant)
      ? variant
      : 'default';
  const Icon = iconMap[iconKey as keyof typeof iconMap];

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      onOpenChange?.(false);
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  return (
    <AlertDialog open={open ?? false} onOpenChange={onOpenChange ?? (() => {})}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {showIcon && (
              <Icon
                className={cn(
                  'h-5 w-5',
                  confirmationDialogVariants({ variant })
                )}
              />
            )}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isLoading || loading}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={disabled || isLoading || loading}
            className={cn(
              variant === 'destructive' &&
                'bg-destructive hover:bg-destructive/90'
            )}
          >
            {isLoading || loading ? 'Loading...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
