
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const stackVariants = cva('flex', {
  variants: {
    direction: {
      vertical: 'flex-col',
      horizontal: 'flex-row',
    },
    spacing: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
      '2xl': 'gap-10',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
  },
  defaultVariants: {
    direction: 'vertical',
    spacing: 'md',
    align: 'stretch',
    justify: 'start',
  },
});

interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, direction, spacing, align, justify, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          stackVariants({ direction, spacing, align, justify }),
          className
        )}
        {...props}
      />
    );
  }
);

Stack.displayName = 'Stack';

// Convenience components
const VStack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ direction = 'vertical', ...props }, ref) => {
    return <Stack ref={ref} direction={direction} {...props} />;
  }
);

const HStack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ direction = 'horizontal', ...props }, ref) => {
    return <Stack ref={ref} direction={direction} {...props} />;
  }
);

VStack.displayName = 'VStack';
HStack.displayName = 'HStack';

export { Stack, VStack, HStack, stackVariants };
