// ===================================================================
// PAGINATION COMPONENT - PAGE NAVIGATION
// ===================================================================

'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

// ===================================================================
// PAGINATION VARIANT STYLES
// ===================================================================

const paginationVariants = cva('flex items-center justify-center', {
  variants: {
    size: {
      sm: 'gap-1',
      md: 'gap-2',
      lg: 'gap-3',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const paginationItemVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'hover:bg-accent hover:text-accent-foreground',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        sm: 'h-8 w-8 text-xs',
        md: 'h-9 w-9 text-sm',
        lg: 'h-10 w-10',
      },
      active: {
        true: 'bg-primary text-primary-foreground hover:bg-primary/90',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      active: false,
    },
  }
);

// ===================================================================
// PAGINATION ITEM COMPONENT
// ===================================================================

interface PaginationItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof paginationItemVariants> {
  isActive?: boolean;
  page?: number;
}

const PaginationItem = React.forwardRef<HTMLButtonElement, PaginationItemProps>(
  (
    {
      className,
      variant,
      size,
      active,
      isActive,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(
          paginationItemVariants({
            variant,
            size,
            active: isActive || active,
          }),
          className
        )}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PaginationItem.displayName = 'PaginationItem';

// ===================================================================
// PAGINATION ELLIPSIS
// ===================================================================

const PaginationEllipsis: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
}) => (
  <span
    className={cn(
      'flex items-center justify-center',
      size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-10 w-10' : 'h-9 w-9'
    )}
    aria-hidden="true"
  >
    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
  </span>
);

// ===================================================================
// PAGINATION COMPONENT
// ===================================================================

export interface PaginationComponentProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'children'>,
    VariantProps<typeof paginationVariants> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirst?: boolean;
  showLast?: boolean;
  showPrevNext?: boolean;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  labels?: {
    first?: string;
    previous?: string;
    next?: string;
    last?: string;
    page?: string;
    current?: string;
  };
}

const Pagination = React.forwardRef<HTMLElement, PaginationComponentProps>(
  (
    {
      className,
      currentPage,
      totalPages,
      onPageChange,
      showFirst = true,
      showLast = true,
      showPrevNext = true,
      showPageNumbers = true,
      maxPageNumbers = 5,
      disabled = false,
      size,
      variant = 'default',
      labels = {
        first: 'First',
        previous: 'Previous',
        next: 'Next',
        last: 'Last',
        page: 'Page',
        current: 'Current page',
      },
      ...props
    },
    ref
  ) => {
    // Calculate page numbers to display
    const getPageNumbers = React.useMemo(() => {
      if (!showPageNumbers || totalPages <= 1) return [];

      const delta = Math.floor(maxPageNumbers / 2);
      const start = Math.max(1, currentPage - delta);
      const end = Math.min(totalPages, start + maxPageNumbers - 1);
      const adjustedStart = Math.max(1, end - maxPageNumbers + 1);

      const pages: (number | 'ellipsis')[] = [];

      // Add first page if not in range
      if (adjustedStart > 1) {
        pages.push(1);
        if (adjustedStart > 2) {
          pages.push('ellipsis');
        }
      }

      // Add page numbers in range
      for (let i = adjustedStart; i <= end; i++) {
        pages.push(i);
      }

      // Add last page if not in range
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('ellipsis');
        }
        pages.push(totalPages);
      }

      return pages;
    }, [currentPage, totalPages, maxPageNumbers, showPageNumbers]);

    const handlePageChange = (page: number) => {
      if (disabled || page === currentPage || page < 1 || page > totalPages) {
        return;
      }
      onPageChange(page);
    };

    if (totalPages <= 1) {
      return null;
    }

    return (
      <nav
        className={cn(paginationVariants({ size }), className)}
        role="navigation"
        aria-label="Pagination"
        ref={ref}
        {...props}
      >
        <div className="flex items-center gap-1">
          {/* First Page Button */}
          {showFirst && (
            <PaginationItem
              variant={variant}
              size={size}
              onClick={() => handlePageChange(1)}
              disabled={disabled || currentPage === 1}
              aria-label={labels.first}
              title={labels.first}
            >
              <ChevronsLeft className="h-4 w-4" />
            </PaginationItem>
          )}

          {/* Previous Page Button */}
          {showPrevNext && (
            <PaginationItem
              variant={variant}
              size={size}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={disabled || currentPage === 1}
              aria-label={labels.previous}
              title={labels.previous}
            >
              <ChevronLeft className="h-4 w-4" />
            </PaginationItem>
          )}

          {/* Page Numbers */}
          {showPageNumbers && (
            <>
              {getPageNumbers.map((page, index) => {
                if (page === 'ellipsis') {
                  return (
                    <PaginationEllipsis key={`ellipsis-${index}`} size={size} />
                  );
                }

                const isCurrentPage = page === currentPage;

                return (
                  <PaginationItem
                    key={page}
                    variant={variant}
                    size={size}
                    isActive={isCurrentPage}
                    onClick={() => handlePageChange(page)}
                    disabled={disabled}
                    aria-label={
                      isCurrentPage ? labels.current : `${labels.page} ${page}`
                    }
                    aria-current={isCurrentPage ? 'page' : undefined}
                  >
                    {page}
                  </PaginationItem>
                );
              })}
            </>
          )}

          {/* Next Page Button */}
          {showPrevNext && (
            <PaginationItem
              variant={variant}
              size={size}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={disabled || currentPage === totalPages}
              aria-label={labels.next}
              title={labels.next}
            >
              <ChevronRight className="h-4 w-4" />
            </PaginationItem>
          )}

          {/* Last Page Button */}
          {showLast && (
            <PaginationItem
              variant={variant}
              size={size}
              onClick={() => handlePageChange(totalPages)}
              disabled={disabled || currentPage === totalPages}
              aria-label={labels.last}
              title={labels.last}
            >
              <ChevronsRight className="h-4 w-4" />
            </PaginationItem>
          )}
        </div>
      </nav>
    );
  }
);

Pagination.displayName = 'Pagination';

// ===================================================================
// PAGINATION INFO COMPONENT
// ===================================================================

interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  className?: string;
}

const PaginationInfo: React.FC<PaginationInfoProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  className,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      Showing {startItem} to {endItem} of {totalItems} results
    </div>
  );
};

// ===================================================================
// PAGINATION WITH INFO COMPONENT
// ===================================================================

interface PaginationWithInfoProps extends PaginationComponentProps {
  totalItems: number;
  itemsPerPage: number;
  showInfo?: boolean;
  infoPosition?: 'top' | 'bottom' | 'left' | 'right';
}

const PaginationWithInfo: React.FC<PaginationWithInfoProps> = ({
  totalItems,
  itemsPerPage,
  showInfo = true,
  infoPosition = 'left',
  className,
  ...paginationProps
}) => {
  if (!showInfo) {
    return <Pagination {...paginationProps} />;
  }

  const info = (
    <PaginationInfo
      currentPage={paginationProps.currentPage}
      totalPages={paginationProps.totalPages}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
    />
  );

  const pagination = <Pagination {...paginationProps} />;

  if (infoPosition === 'top') {
    return (
      <div className={cn('space-y-4', className)}>
        {info}
        {pagination}
      </div>
    );
  }

  if (infoPosition === 'bottom') {
    return (
      <div className={cn('space-y-4', className)}>
        {pagination}
        {info}
      </div>
    );
  }

  if (infoPosition === 'right') {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        {pagination}
        {info}
      </div>
    );
  }

  // Default: left
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {info}
      {pagination}
    </div>
  );
};

// ===================================================================
// PAGINATION HOOKS
// ===================================================================

export interface UsePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  initialPage?: number;
}

export const usePagination = ({
  totalItems,
  itemsPerPage,
  initialPage = 1,
}: UsePaginationProps) => {
  const [currentPage, setCurrentPage] = React.useState(initialPage);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const goToPage = React.useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const nextPage = React.useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const previousPage = React.useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const firstPage = React.useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = React.useCallback(() => {
    goToPage(totalPages);
  }, [goToPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
  };
};

// ===================================================================
// EXPORTS
// ===================================================================

export {
  Pagination,
  PaginationItem,
  PaginationEllipsis,
  PaginationInfo,
  PaginationWithInfo,
  paginationVariants,
  paginationItemVariants,
  usePagination,
};
export type { PaginationComponentProps as PaginationProps };
