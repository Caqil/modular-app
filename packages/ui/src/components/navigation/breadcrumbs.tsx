// ===================================================================
// BREADCRUMBS COMPONENT - NAVIGATION BREADCRUMB TRAIL
// ===================================================================

'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

// ===================================================================
// BREADCRUMB VARIANT STYLES
// ===================================================================

const breadcrumbsVariants = cva('flex items-center', {
  variants: {
    variant: {
      default: 'text-sm text-muted-foreground',
      simple: 'text-sm',
      compact: 'text-xs text-muted-foreground',
    },
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

const breadcrumbItemVariants = cva(
  'flex items-center gap-1 transition-colors',
  {
    variants: {
      current: {
        true: 'text-foreground font-medium',
        false: 'text-muted-foreground hover:text-foreground',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: 'cursor-pointer',
      },
    },
    defaultVariants: {
      current: false,
      disabled: false,
    },
  }
);

const breadcrumbLinkVariants = cva(
  'inline-flex items-center gap-1 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm',
  {
    variants: {
      variant: {
        default: 'hover:underline',
        simple: '',
        compact: 'hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// ===================================================================
// BREADCRUMB SEPARATOR
// ===================================================================

interface BreadcrumbSeparatorProps {
  separator?: React.ReactNode;
  variant?: 'default' | 'simple' | 'compact';
}

const BreadcrumbSeparator: React.FC<BreadcrumbSeparatorProps> = ({
  separator,
  variant = 'default',
}) => {
  if (separator) {
    return <span className="mx-2">{separator}</span>;
  }

  return (
    <ChevronRight
      className={cn(
        'mx-2 text-muted-foreground',
        variant === 'compact' ? 'h-3 w-3' : 'h-4 w-4'
      )}
    />
  );
};

// ===================================================================
// BREADCRUMB ITEM COMPONENT
// ===================================================================

interface BreadcrumbItemComponentProps extends BreadcrumbItem {
  variant?: 'default' | 'simple' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const BreadcrumbItemComponent: React.FC<BreadcrumbItemComponentProps> = ({
  label,
  href,
  icon,
  current = false,
  disabled = false,
  variant = 'default',
  size = 'md',
  onClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled || current) {
      e.preventDefault();
      return;
    }
    onClick?.();
  };

  const content = (
    <>
      {icon && (
        <span
          className={cn(
            'flex-shrink-0',
            size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
          )}
        >
          {icon}
        </span>
      )}
      <span className="truncate">{label}</span>
    </>
  );

  if (href && !current && !disabled) {
    return (
      <a
        href={href}
        className={cn(
          breadcrumbLinkVariants({ variant }),
          breadcrumbItemVariants({ current, disabled })
        )}
        onClick={handleClick}
        aria-current={current ? 'page' : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <span
      className={cn(breadcrumbItemVariants({ current, disabled }))}
      aria-current={current ? 'page' : undefined}
      onClick={handleClick}
    >
      {content}
    </span>
  );
};

// ===================================================================
// BREADCRUMBS COMPONENT
// ===================================================================

export interface BreadcrumbsComponentProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'children'>,
    VariantProps<typeof breadcrumbsVariants> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  showRoot?: boolean;
  rootLabel?: string;
  rootHref?: string;
  onItemClick?: (item: BreadcrumbItem, index: number) => void;
}

const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsComponentProps>(
  (
    {
      className,
      items,
      separator,
      maxItems = 5,
      showRoot = true,
      rootLabel = 'Home',
      rootHref = '/',
      variant,
      size,
      onItemClick,
      ...props
    },
    ref
  ) => {
    // Add root item if showRoot is true and items don't start with root
    const allItems = React.useMemo(() => {
      if (!showRoot || (items.length > 0 && items[0].href === rootHref)) {
        return items;
      }

      return [
        {
          label: rootLabel,
          href: rootHref,
          icon: <Home className="h-4 w-4" />,
        },
        ...items,
      ];
    }, [items, showRoot, rootLabel, rootHref]);

    // Handle item truncation if maxItems is exceeded
    const displayItems = React.useMemo(() => {
      if (allItems.length <= maxItems) {
        return allItems;
      }

      const firstItem = allItems[0];
      const lastItems = allItems.slice(-2); // Always show last 2 items
      const ellipsisItem: BreadcrumbItem = {
        label: '...',
        disabled: true,
      };

      return [firstItem, ellipsisItem, ...lastItems];
    }, [allItems, maxItems]);

    const handleItemClick = (item: BreadcrumbItem, index: number) => {
      if (item.disabled) return;
      onItemClick?.(item, index);
    };

    return (
      <nav
        className={cn(breadcrumbsVariants({ variant, size }), className)}
        aria-label="Breadcrumb"
        ref={ref}
        {...props}
      >
        <ol className="flex items-center space-x-0">
          {displayItems.map((item, index) => {
            const isLast = index === displayItems.length - 1;
            const isEllipsis = item.label === '...';

            return (
              <li key={`${item.label}-${index}`} className="flex items-center">
                {isEllipsis ? (
                  <span className="flex items-center px-2">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </span>
                ) : (
                  <BreadcrumbItemComponent
                    {...item}
                    current={isLast}
                    variant={variant}
                    size={size}
                    onClick={() => handleItemClick(item, index)}
                  />
                )}

                {!isLast && (
                  <BreadcrumbSeparator
                    separator={separator}
                    variant={variant}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
);

Breadcrumbs.displayName = 'Breadcrumbs';

// ===================================================================
// BREADCRUMB HOOKS
// ===================================================================

export const useBreadcrumbs = (items: BreadcrumbItem[]) => {
  const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbItem[]>(items);

  const addBreadcrumb = React.useCallback((item: BreadcrumbItem) => {
    setBreadcrumbs((prev) => [...prev, item]);
  }, []);

  const removeBreadcrumb = React.useCallback((index: number) => {
    setBreadcrumbs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateBreadcrumb = React.useCallback(
    (index: number, item: Partial<BreadcrumbItem>) => {
      setBreadcrumbs((prev) =>
        prev.map((breadcrumb, i) =>
          i === index ? { ...breadcrumb, ...item } : breadcrumb
        )
      );
    },
    []
  );

  const resetBreadcrumbs = React.useCallback((newItems: BreadcrumbItem[]) => {
    setBreadcrumbs(newItems);
  }, []);

  return {
    breadcrumbs,
    addBreadcrumb,
    removeBreadcrumb,
    updateBreadcrumb,
    resetBreadcrumbs,
  };
};

// ===================================================================
// STRUCTURED DATA BREADCRUMBS
// ===================================================================

export const BreadcrumbJsonLd: React.FC<{ items: BreadcrumbItem[] }> = ({
  items,
}) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
      .filter((item) => item.href && !item.disabled)
      .map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: item.href,
      })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

// ===================================================================
// EXPORTS
// ===================================================================

export {
  Breadcrumbs,
  BreadcrumbSeparator,
  BreadcrumbJsonLd,
  breadcrumbsVariants,
  breadcrumbItemVariants,
  breadcrumbLinkVariants,
};
export type { BreadcrumbsComponentProps as BreadcrumbsProps };
