
'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  (
    {
      className,
      items,
      separator = <ChevronRight className="h-4 w-4" />,
      maxItems,
      ...props
    },
    ref
  ) => {
    const displayItems =
      maxItems && items.length > maxItems
        ? [
            items[0],
            { label: '...', disabled: true },
            ...items.slice(-maxItems + 2),
          ]
        : items;

    return (
      <nav
        ref={ref}
        className={cn(
          'flex items-center space-x-1 text-sm text-muted-foreground',
          className
        )}
        aria-label="Breadcrumb"
        {...props}
      >
        <ol className="flex items-center space-x-1">
          {displayItems.map((item, index) =>
            item ? (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-muted-foreground">{separator}</span>
                )}
                {!item.disabled && item.href ? (
                  <a
                    href={item.href}
                    className="transition-colors hover:text-foreground"
                    onClick={item.onClick}
                  >
                    {item.label}
                  </a>
                ) : (
                  <span
                    className={
                      index === displayItems.length - 1
                        ? 'font-medium text-foreground'
                        : item.disabled
                        ? 'text-muted-foreground cursor-default'
                        : 'cursor-pointer transition-colors hover:text-foreground'
                    }
                    onClick={!item.disabled ? item.onClick : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            ) : null
          )}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';

export { Breadcrumb, type BreadcrumbItem };
