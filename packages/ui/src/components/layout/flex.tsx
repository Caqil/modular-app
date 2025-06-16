// ===================================================================
// FLEX COMPONENT - FLEXIBLE BOX LAYOUT
// ===================================================================

'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

// ===================================================================
// FLEX VARIANT STYLES
// ===================================================================

const flexVariants = cva(
  // Base styles
  'flex',
  {
    variants: {
      direction: {
        row: 'flex-row',
        'row-reverse': 'flex-row-reverse',
        col: 'flex-col',
        'col-reverse': 'flex-col-reverse',
      },
      wrap: {
        wrap: 'flex-wrap',
        nowrap: 'flex-nowrap',
        'wrap-reverse': 'flex-wrap-reverse',
      },
      justify: {
        start: 'justify-start',
        end: 'justify-end',
        center: 'justify-center',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      },
      align: {
        start: 'items-start',
        end: 'items-end',
        center: 'items-center',
        baseline: 'items-baseline',
        stretch: 'items-stretch',
      },
      gap: {
        none: 'gap-0',
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
        '2xl': 'gap-12',
        '3xl': 'gap-16',
      },
      grow: {
        true: 'flex-grow',
        false: 'flex-grow-0',
      },
      shrink: {
        true: 'flex-shrink',
        false: 'flex-shrink-0',
      },
      inline: {
        true: 'inline-flex',
        false: 'flex',
      },
    },
    defaultVariants: {
      direction: 'row',
      wrap: 'nowrap',
      justify: 'start',
      align: 'start',
      gap: 'none',
      grow: false,
      shrink: false,
      inline: false,
    },
  }
);

// ===================================================================
// FLEX COMPONENT
// ===================================================================

export interface FlexComponentProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof flexVariants> {
  children?: React.ReactNode;
  asChild?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

const Flex = React.forwardRef<HTMLDivElement, FlexComponentProps>(
  (
    {
      className,
      direction,
      wrap,
      justify,
      align,
      gap,
      grow,
      shrink,
      inline,
      asChild = false,
      as: Component = 'div',
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Component;

    return (
      <Comp
        className={cn(
          flexVariants({
            direction,
            wrap,
            justify,
            align,
            gap,
            grow,
            shrink,
            inline,
          }),
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

Flex.displayName = 'Flex';

// ===================================================================
// FLEX ITEM COMPONENT
// ===================================================================

const flexItemVariants = cva('', {
  variants: {
    grow: {
      0: 'flex-grow-0',
      1: 'flex-grow',
    },
    shrink: {
      0: 'flex-shrink-0',
      1: 'flex-shrink',
    },
    basis: {
      auto: 'flex-auto',
      full: 'flex-1',
      '1/2': 'flex-none w-1/2',
      '1/3': 'flex-none w-1/3',
      '2/3': 'flex-none w-2/3',
      '1/4': 'flex-none w-1/4',
      '3/4': 'flex-none w-3/4',
    },
    order: {
      first: 'order-first',
      last: 'order-last',
      none: 'order-none',
      1: 'order-1',
      2: 'order-2',
      3: 'order-3',
      4: 'order-4',
      5: 'order-5',
    },
  },
  defaultVariants: {
    grow: 0,
    shrink: 1,
    basis: 'auto',
    order: 'none',
  },
});

export interface FlexItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof flexItemVariants> {
  children?: React.ReactNode;
  asChild?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

const FlexItem = React.forwardRef<HTMLDivElement, FlexItemProps>(
  (
    {
      className,
      grow,
      shrink,
      basis,
      order,
      asChild = false,
      as: Component = 'div',
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Component;

    return (
      <Comp
        className={cn(
          flexItemVariants({ grow, shrink, basis, order }),
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

FlexItem.displayName = 'FlexItem';

// ===================================================================
// EXPORTS
// ===================================================================

export { Flex, FlexItem, flexVariants, flexItemVariants };
export type { FlexComponentProps as FlexProps };
