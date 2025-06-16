// ===================================================================
// STACK COMPONENT - VERTICAL/HORIZONTAL STACKING LAYOUT
// ===================================================================

'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';
import type { StackProps } from '../../types';

// ===================================================================
// STACK VARIANT STYLES
// ===================================================================

const stackVariants = cva(
  // Base styles
  'flex',
  {
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
        '2xl': 'gap-12',
        '3xl': 'gap-16',
      },
      align: {
        start: '',
        center: '',
        end: '',
        stretch: '',
      },
      justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      },
      wrap: {
        true: 'flex-wrap',
        false: 'flex-nowrap',
      },
    },
    compoundVariants: [
      // Vertical alignment variants
      {
        direction: 'vertical',
        align: 'start',
        className: 'items-start',
      },
      {
        direction: 'vertical',
        align: 'center',
        className: 'items-center',
      },
      {
        direction: 'vertical',
        align: 'end',
        className: 'items-end',
      },
      {
        direction: 'vertical',
        align: 'stretch',
        className: 'items-stretch',
      },
      // Horizontal alignment variants
      {
        direction: 'horizontal',
        align: 'start',
        className: 'items-start',
      },
      {
        direction: 'horizontal',
        align: 'center',
        className: 'items-center',
      },
      {
        direction: 'horizontal',
        align: 'end',
        className: 'items-end',
      },
      {
        direction: 'horizontal',
        align: 'stretch',
        className: 'items-stretch',
      },
    ],
    defaultVariants: {
      direction: 'vertical',
      spacing: 'md',
      align: 'stretch',
      justify: 'start',
      wrap: false,
    },
  }
);

// ===================================================================
// STACK COMPONENT
// ===================================================================

export interface StackComponentProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof stackVariants> {
  children?: React.ReactNode;
  asChild?: boolean;
  as?: keyof JSX.IntrinsicElements;
  divider?: React.ReactNode | boolean;
}

const Stack = React.forwardRef<HTMLDivElement, StackComponentProps>(
  (
    {
      className,
      direction,
      spacing,
      align,
      justify,
      wrap,
      divider,
      asChild = false,
      as: Component = 'div',
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Component;

    // Handle divider logic
    const renderChildren = () => {
      if (!divider || !children) {
        return children;
      }

      const childArray = React.Children.toArray(children);
      const dividerElement =
        divider === true ? (
          <div
            className={cn(
              'bg-border',
              direction === 'vertical' ? 'h-px w-full' : 'h-full w-px'
            )}
          />
        ) : (
          divider
        );

      return childArray.reduce<React.ReactNode[]>((acc, child, index) => {
        acc.push(child);
        if (index < childArray.length - 1) {
          acc.push(
            <React.Fragment key={`divider-${index}`}>
              {dividerElement}
            </React.Fragment>
          );
        }
        return acc;
      }, []);
    };

    return (
      <Comp
        className={cn(
          stackVariants({
            direction,
            spacing: divider ? 'none' : spacing,
            align,
            justify,
            wrap,
          }),
          divider && (direction === 'vertical' ? 'space-y-4' : 'space-x-4'),
          className
        )}
        ref={ref}
        {...props}
      >
        {renderChildren()}
      </Comp>
    );
  }
);

Stack.displayName = 'Stack';

// ===================================================================
// STACK PRESETS
// ===================================================================

// Vertical Stack (VStack)
export const VStack = React.forwardRef<
  HTMLDivElement,
  Omit<StackComponentProps, 'direction'>
>(({ children, ...props }, ref) => {
  return (
    <Stack direction="vertical" ref={ref} {...props}>
      {children}
    </Stack>
  );
});

VStack.displayName = 'VStack';

// Horizontal Stack (HStack)
export const HStack = React.forwardRef<
  HTMLDivElement,
  Omit<StackComponentProps, 'direction'>
>(({ children, ...props }, ref) => {
  return (
    <Stack direction="horizontal" ref={ref} {...props}>
      {children}
    </Stack>
  );
});

HStack.displayName = 'HStack';

// Center Stack - centers content both horizontally and vertically
export const CenterStack = React.forwardRef<
  HTMLDivElement,
  Omit<StackComponentProps, 'align' | 'justify'>
>(({ children, ...props }, ref) => {
  return (
    <Stack align="center" justify="center" ref={ref} {...props}>
      {children}
    </Stack>
  );
});

CenterStack.displayName = 'CenterStack';

// Spacer component for use within stacks
export const Spacer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div className={cn('flex-1', className)} ref={ref} {...props} />;
});

Spacer.displayName = 'Spacer';

// ===================================================================
// STACK GROUP - FOR GROUPING RELATED STACKS
// ===================================================================

const stackGroupVariants = cva('space-y-6', {
  variants: {
    spacing: {
      none: 'space-y-0',
      xs: 'space-y-1',
      sm: 'space-y-2',
      md: 'space-y-4',
      lg: 'space-y-6',
      xl: 'space-y-8',
      '2xl': 'space-y-12',
      '3xl': 'space-y-16',
    },
  },
  defaultVariants: {
    spacing: 'lg',
  },
});

export interface StackGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof stackGroupVariants> {
  children?: React.ReactNode;
  asChild?: boolean;
}

const StackGroup = React.forwardRef<HTMLDivElement, StackGroupProps>(
  ({ className, spacing, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';

    return (
      <Comp
        className={cn(stackGroupVariants({ spacing }), className)}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

StackGroup.displayName = 'StackGroup';

// ===================================================================
// EXPORTS
// ===================================================================

export {
  Stack,
  VStack,
  HStack,
  CenterStack,
  Spacer,
  StackGroup,
  stackVariants,
  stackGroupVariants,
};
export type { StackComponentProps as StackProps };
