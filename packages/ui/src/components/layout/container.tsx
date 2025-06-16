// ===================================================================
// CONTAINER COMPONENT - RESPONSIVE LAYOUT CONTAINER
// ===================================================================

'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

// ===================================================================
// CONTAINER VARIANT STYLES
// ===================================================================

const containerVariants = cva(
  // Base styles
  'w-full',
  {
    variants: {
      variant: {
        default: 'mx-auto',
        full: 'w-full',
        tight: 'mx-auto',
        loose: 'mx-auto',
      },
      size: {
        sm: 'max-w-screen-sm',
        md: 'max-w-screen-md',
        lg: 'max-w-screen-lg',
        xl: 'max-w-screen-xl',
        '2xl': 'max-w-screen-2xl',
        full: 'max-w-none',
      },
      paddingX: {
        none: 'px-0',
        sm: 'px-4',
        md: 'px-6',
        lg: 'px-8',
        xl: 'px-12',
      },
      paddingY: {
        none: 'py-0',
        sm: 'py-4',
        md: 'py-6',
        lg: 'py-8',
        xl: 'py-12',
      },
    },
    compoundVariants: [
      {
        variant: 'tight',
        size: ['sm', 'md'],
        className: 'max-w-2xl',
      },
      {
        variant: 'loose',
        size: ['lg', 'xl', '2xl'],
        className: 'max-w-7xl',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'lg',
      paddingX: 'md',
      paddingY: 'none',
    },
  }
);

// ===================================================================
// CONTAINER COMPONENT
// ===================================================================

export interface ContainerComponentProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof containerVariants> {
  children?: React.ReactNode;
  asChild?: boolean;
  as?: keyof JSX.IntrinsicElements;
  centered?: boolean;
  fluid?: boolean;
}

const Container = React.forwardRef<HTMLDivElement, ContainerComponentProps>(
  (
    {
      className,
      variant,
      size,
      paddingX,
      paddingY,
      asChild = false,
      as: Component = 'div',
      centered = false,
      fluid = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Component;

    return (
      <Comp
        className={cn(
          containerVariants({
            variant: fluid ? 'full' : variant,
            size: fluid ? 'full' : size,
            paddingX,
            paddingY,
          }),
          centered && 'flex items-center justify-center',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

Container.displayName = 'Container';

// ===================================================================
// EXPORTS
// ===================================================================

export { Container, containerVariants };
export type { ContainerComponentProps as ContainerProps };
