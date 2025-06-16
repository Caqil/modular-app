'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Label } from '../ui/label';
import { cn } from '../../utils/cn';

const formFieldVariants = cva('space-y-2', {
  variants: {
    variant: {
      default: '',
      inline: 'flex items-center space-y-0 space-x-3',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const formFieldMessageVariants = cva('text-sm flex items-center gap-2', {
  variants: {
    type: {
      error: 'text-destructive',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      info: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    type: 'info',
  },
});

interface FormFieldProps extends VariantProps<typeof formFieldVariants> {
  children: React.ReactNode;
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  warning?: string;
  info?: string;
  required?: boolean;
  className?: string;
  labelProps?: React.ComponentProps<typeof Label>;
}

export function FormField({
  children,
  label,
  description,
  error,
  success,
  warning,
  info,
  required = false,
  variant,
  className,
  labelProps,
}: FormFieldProps) {
  const message = error || success || warning || info;
  const messageType = error
    ? 'error'
    : success
      ? 'success'
      : warning
        ? 'warning'
        : 'info';

  const Icon =
    messageType === 'error'
      ? AlertCircle
      : messageType === 'success'
        ? CheckCircle
        : messageType === 'warning'
          ? AlertCircle
          : Info;

  return (
    <div className={cn(formFieldVariants({ variant }), className)}>
      {label && (
        <Label {...labelProps} className={cn(labelProps?.className)}>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <div className="space-y-2">
        {children}

        {message && (
          <div className={cn(formFieldMessageVariants({ type: messageType }))}>
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Specialized form field components
interface FormFieldInputProps extends FormFieldProps {
  input: React.ReactElement;
}

export function FormFieldInput({ input, ...props }: FormFieldInputProps) {
  return <FormField {...props}>{input}</FormField>;
}

interface FormFieldGroupProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function FormFieldGroup({
  children,
  title,
  description,
  className,
}: FormFieldGroupProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <div className="space-y-1">
          <h3 className="text-lg font-medium">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
