'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { cn } from '../../utils/cn';

const formSectionVariants = cva('', {
  variants: {
    variant: {
      default: '',
      card: 'border rounded-lg',
      outlined: 'border border-dashed rounded-lg p-4',
      filled: 'bg-muted/50 rounded-lg p-4',
    },
    spacing: {
      none: 'space-y-0',
      sm: 'space-y-2',
      md: 'space-y-4',
      lg: 'space-y-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    spacing: 'md',
  },
});

interface FormSectionProps extends VariantProps<typeof formSectionVariants> {
  children: React.ReactNode;
  title?: string;
  description?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  headerActions?: React.ReactNode;
}

export function FormSection({
  children,
  title,
  description,
  collapsible = false,
  defaultOpen = true,
  variant,
  spacing,
  className,
  headerActions,
}: FormSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (variant === 'card') {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {title && <CardTitle>{title}</CardTitle>}
                {description && (
                  <CardDescription>{description}</CardDescription>
                )}
              </div>
              {headerActions}
            </div>
          </CardHeader>
        )}
        <CardContent className={cn(formSectionVariants({ spacing }))}>
          {children}
        </CardContent>
      </Card>
    );
  }

  if (collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
        <div className={cn(formSectionVariants({ variant, spacing }))}>
          {(title || description) && (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto w-full justify-between p-0 font-normal"
              >
                <div className="space-y-1 text-left">
                  {title && <h3 className="text-lg font-medium">{title}</h3>}
                  {description && (
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {headerActions}
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
          )}

          <CollapsibleContent className="space-y-4">
            <div className={cn(formSectionVariants({ spacing }))}>
              {children}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <div className={cn(formSectionVariants({ variant, spacing }), className)}>
      {(title || description || headerActions) && (
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            {title && <h3 className="text-lg font-medium">{title}</h3>}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {headerActions}
        </div>
      )}

      <div className={cn(formSectionVariants({ spacing }))}>{children}</div>
    </div>
  );
}

// Specialized form sections
interface FormSectionStepsProps {
  steps: Array<{
    title: string;
    description?: string;
    content: React.ReactNode;
    completed?: boolean;
  }>;
  currentStep: number;
  className?: string;
}

export function FormSectionSteps({
  steps,
  currentStep,
  className,
}: FormSectionStepsProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {steps.map((step, index) => (
        <div key={index} className="relative">
          {index > 0 && (
            <div className="absolute left-4 top-0 -mt-4 h-4 w-px bg-border" />
          )}

          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium',
                index < currentStep
                  ? 'border-primary bg-primary text-primary-foreground'
                  : index === currentStep
                    ? 'border-primary text-primary'
                    : 'border-muted text-muted-foreground'
              )}
            >
              {index + 1}
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <h3
                  className={cn(
                    'text-sm font-medium',
                    index <= currentStep
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </h3>
                {step.description && (
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>

              {index === currentStep && (
                <div className="space-y-4">{step.content}</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
