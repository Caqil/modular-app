// packages/ui/src/components/navigation/pagination.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

const paginationVariants = cva('flex items-center justify-center space-x-1', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const paginationItemVariants = cva('', {
  variants: {
    variant: {
      default: '',
      outline: 'border border-input',
    },
    size: {
      sm: 'h-8 w-8 text-sm',
      md: 'h-9 w-9',
      lg: 'h-10 w-10',
    },
    active: {
      true: '',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
    active: false,
  },
});

interface PaginationProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof paginationVariants> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxVisiblePages?: number;
  disabled?: boolean;
}

const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  (
    {
      className,
      size,
      currentPage,
      totalPages,
      onPageChange,
      showFirstLast = true,
      showPrevNext = true,
      maxVisiblePages = 5,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const getVisiblePages = () => {
      if (totalPages <= maxVisiblePages) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      const half = Math.floor(maxVisiblePages / 2);
      let start = Math.max(currentPage - half, 1);
      let end = Math.min(start + maxVisiblePages - 1, totalPages);

      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(end - maxVisiblePages + 1, 1);
      }

      const pages: number[] = [];
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      return pages;
    };

    const visiblePages = getVisiblePages();
    const showStartEllipsis = visiblePages.length > 0 && (visiblePages[0] ?? 0) > 2;
    const showEndEllipsis =
      visiblePages.length > 0 && (visiblePages[visiblePages.length - 1] ?? 0) < totalPages - 1;

    const handlePageChange = (page: number) => {
      if (
        page >= 1 &&
        page <= totalPages &&
        page !== currentPage &&
        !disabled
      ) {
        onPageChange(page);
      }
    };

    return (
      <nav
        ref={ref}
        className={cn(paginationVariants({ size }), className)}
        aria-label="Pagination"
        {...props}
      >
        {/* First page button */}
        {showFirstLast && currentPage > 1 && (
          <Button
            variant="outline"
            size={size === 'md' ? 'default' : size}
            onClick={() => handlePageChange(1)}
            disabled={disabled}
            className={cn(paginationItemVariants({ size }))}
          >
            1
          </Button>
        )}

        {/* Previous button */}
        {showPrevNext && (
          <Button
            variant="outline"
             size={size === 'md' ? 'default' : size}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={disabled || currentPage <= 1}
            className={cn(paginationItemVariants({ size }))}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
        )}

        {/* Start ellipsis */}
        {showStartEllipsis && (
          <Button
            variant="ghost"
             size={size === 'md' ? 'default' : size}
            disabled
            className={cn(paginationItemVariants({ size }))}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}

        {/* Page numbers */}
        {visiblePages.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? 'default' : 'outline'}
             size={size === 'md' ? 'default' : size}
            onClick={() => handlePageChange(page)}
            disabled={disabled}
            className={cn(
              paginationItemVariants({ size, active: page === currentPage }),
              page === currentPage && 'pointer-events-none'
            )}
          >
            {page}
          </Button>
        ))}

        {/* End ellipsis */}
        {showEndEllipsis && (
          <Button
            variant="ghost"
            size={size === 'md' ? 'default' : size}
            disabled
            className={cn(paginationItemVariants({ size }))}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}

        {/* Next button */}
        {showPrevNext && (
          <Button
            variant="outline"
             size={size === 'md' ? 'default' : size}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={disabled || currentPage >= totalPages}
            className={cn(paginationItemVariants({ size }))}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        )}

        {/* Last page button */}
        {showFirstLast && currentPage < totalPages && (
          <Button
            variant="outline"
             size={size === 'md' ? 'default' : size}
            onClick={() => handlePageChange(totalPages)}
            disabled={disabled}
            className={cn(paginationItemVariants({ size }))}
          >
            {totalPages}
          </Button>
        )}
      </nav>
    );
  }
);

Pagination.displayName = 'Pagination';

// Additional pagination info component
interface PaginationInfoProps extends React.HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
}

const PaginationInfo = React.forwardRef<HTMLDivElement, PaginationInfoProps>(
  (
    { className, currentPage, totalPages, totalItems, itemsPerPage, ...props },
    ref
  ) => {
    const getPageInfo = () => {
      if (totalItems && itemsPerPage) {
        const start = (currentPage - 1) * itemsPerPage + 1;
        const end = Math.min(currentPage * itemsPerPage, totalItems);
        return `Showing ${start}-${end} of ${totalItems} items`;
      }
      return `Page ${currentPage} of ${totalPages}`;
    };

    return (
      <div
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
      >
        {getPageInfo()}
      </div>
    );
  }
);

PaginationInfo.displayName = 'PaginationInfo';

export {
  Pagination,
  PaginationInfo,
  paginationVariants,
  paginationItemVariants,
  type PaginationProps,
};
