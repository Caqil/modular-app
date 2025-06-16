// ===================================================================
// GRID COMPONENT - CSS GRID LAYOUT
// ===================================================================

'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

// ===================================================================
// GRID VARIANT STYLES
// ===================================================================

const gridVariants = cva(
  // Base styles
  'grid',
  {
    variants: {
      cols: {
        none: 'grid-cols-none',
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        5: 'grid-cols-5',
        6: 'grid-cols-6',
        7: 'grid-cols-7',
        8: 'grid-cols-8',
        9: 'grid-cols-9',
        10: 'grid-cols-10',
        11: 'grid-cols-11',
        12: 'grid-cols-12',
      },
      rows: {
        none: 'grid-rows-none',
        1: 'grid-rows-1',
        2: 'grid-rows-2',
        3: 'grid-rows-3',
        4: 'grid-rows-4',
        5: 'grid-rows-5',
        6: 'grid-rows-6',
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
      gapX: {
        none: 'gap-x-0',
        xs: 'gap-x-1',
        sm: 'gap-x-2',
        md: 'gap-x-4',
        lg: 'gap-x-6',
        xl: 'gap-x-8',
        '2xl': 'gap-x-12',
        '3xl': 'gap-x-16',
      },
      gapY: {
        none: 'gap-y-0',
        xs: 'gap-y-1',
        sm: 'gap-y-2',
        md: 'gap-y-4',
        lg: 'gap-y-6',
        xl: 'gap-y-8',
        '2xl': 'gap-y-12',
        '3xl': 'gap-y-16',
      },
      flow: {
        row: 'grid-flow-row',
        col: 'grid-flow-col',
        dense: 'grid-flow-row-dense',
        'row-dense': 'grid-flow-row-dense',
        'col-dense': 'grid-flow-col-dense',
      },
      autoRows: {
        auto: 'auto-rows-auto',
        min: 'auto-rows-min',
        max: 'auto-rows-max',
        fr: 'auto-rows-fr',
      },
      autoCols: {
        auto: 'auto-cols-auto',
        min: 'auto-cols-min',
        max: 'auto-cols-max',
        fr: 'auto-cols-fr',
      },
    },
    defaultVariants: {
      cols: 1,
      rows: 'none',
      gap: 'none',
      flow: 'row',
      autoRows: 'auto',
      autoCols: 'auto',
    },
  }
);

// ===================================================================
// GRID COMPONENT
// ===================================================================

export interface GridComponentProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof gridVariants> {
  children?: React.ReactNode;
  asChild?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

const Grid = React.forwardRef<HTMLDivElement, GridComponentProps>(
  (
    {
      className,
      cols,
      rows,
      gap,
      gapX,
      gapY,
      flow,
      autoRows,
      autoCols,
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
          gridVariants({
            cols,
            rows,
            gap,
            gapX,
            gapY,
            flow,
            autoRows,
            autoCols,
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

Grid.displayName = 'Grid';

// ===================================================================
// GRID ITEM COMPONENT
// ===================================================================

const gridItemVariants = cva('', {
  variants: {
    colSpan: {
      auto: 'col-auto',
      1: 'col-span-1',
      2: 'col-span-2',
      3: 'col-span-3',
      4: 'col-span-4',
      5: 'col-span-5',
      6: 'col-span-6',
      7: 'col-span-7',
      8: 'col-span-8',
      9: 'col-span-9',
      10: 'col-span-10',
      11: 'col-span-11',
      12: 'col-span-12',
      full: 'col-span-full',
    },
    rowSpan: {
      auto: 'row-auto',
      1: 'row-span-1',
      2: 'row-span-2',
      3: 'row-span-3',
      4: 'row-span-4',
      5: 'row-span-5',
      6: 'row-span-6',
      full: 'row-span-full',
    },
    colStart: {
      auto: 'col-start-auto',
      1: 'col-start-1',
      2: 'col-start-2',
      3: 'col-start-3',
      4: 'col-start-4',
      5: 'col-start-5',
      6: 'col-start-6',
      7: 'col-start-7',
      8: 'col-start-8',
      9: 'col-start-9',
      10: 'col-start-10',
      11: 'col-start-11',
      12: 'col-start-12',
      13: 'col-start-13',
    },
    colEnd: {
      auto: 'col-end-auto',
      1: 'col-end-1',
      2: 'col-end-2',
      3: 'col-end-3',
      4: 'col-end-4',
      5: 'col-end-5',
      6: 'col-end-6',
      7: 'col-end-7',
      8: 'col-end-8',
      9: 'col-end-9',
      10: 'col-end-10',
      11: 'col-end-11',
      12: 'col-end-12',
      13: 'col-end-13',
    },
    rowStart: {
      auto: 'row-start-auto',
      1: 'row-start-1',
      2: 'row-start-2',
      3: 'row-start-3',
      4: 'row-start-4',
      5: 'row-start-5',
      6: 'row-start-6',
      7: 'row-start-7',
    },
    rowEnd: {
      auto: 'row-end-auto',
      1: 'row-end-1',
      2: 'row-end-2',
      3: 'row-end-3',
      4: 'row-end-4',
      5: 'row-end-5',
      6: 'row-end-6',
      7: 'row-end-7',
    },
  },
  defaultVariants: {
    colSpan: 'auto',
    rowSpan: 'auto',
    colStart: 'auto',
    colEnd: 'auto',
    rowStart: 'auto',
    rowEnd: 'auto',
  },
});

export interface GridItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof gridItemVariants> {
  children?: React.ReactNode;
  asChild?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  (
    {
      className,
      colSpan,
      rowSpan,
      colStart,
      colEnd,
      rowStart,
      rowEnd,
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
          gridItemVariants({
            colSpan,
            rowSpan,
            colStart,
            colEnd,
            rowStart,
            rowEnd,
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

GridItem.displayName = 'GridItem';

// ===================================================================
// RESPONSIVE GRID PRESETS
// ===================================================================

export const ResponsiveGrid = React.forwardRef<
  HTMLDivElement,
  GridComponentProps
>(({ className, children, ...props }, ref) => {
  return (
    <Grid
      className={cn(
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </Grid>
  );
});

ResponsiveGrid.displayName = 'ResponsiveGrid';

// ===================================================================
// EXPORTS
// ===================================================================

export { Grid, GridItem, ResponsiveGrid, gridVariants, gridItemVariants };
export type { GridComponentProps as GridProps };
