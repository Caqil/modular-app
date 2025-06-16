// ===================================================================
// TABS NAV COMPONENT - TABBED NAVIGATION INTERFACE
// ===================================================================

'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import type { TabsNavProps, TabsNavItem } from '../../types';

// ===================================================================
// TABS NAV VARIANT STYLES
// ===================================================================

const tabsNavVariants = cva('w-full', {
  variants: {
    variant: {
      default: 'border-b border-border',
      pills: 'bg-muted p-1 rounded-lg',
      underline: '',
      cards: 'bg-background',
    },
    orientation: {
      horizontal: 'flex',
      vertical: 'flex flex-col w-64',
    },
    size: {
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    orientation: 'horizontal',
    size: 'md',
  },
});

const tabsListVariants = cva('flex items-center', {
  variants: {
    variant: {
      default: 'border-b border-border',
      pills: 'gap-1',
      underline: 'gap-4',
      cards: 'gap-2',
    },
    orientation: {
      horizontal: 'flex-row',
      vertical: 'flex-col',
    },
    centered: {
      true: 'justify-center',
      false: '',
    },
    fullWidth: {
      true: 'w-full',
      false: '',
    },
    scrollable: {
      true: 'overflow-hidden',
      false: 'overflow-x-auto',
    },
  },
  defaultVariants: {
    variant: 'default',
    orientation: 'horizontal',
    centered: false,
    fullWidth: false,
    scrollable: false,
  },
});

const tabItemVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-b-2 border-transparent hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground',
        pills:
          'rounded-md hover:bg-background hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        underline:
          'border-b-2 border-transparent hover:border-muted-foreground/50 data-[state=active]:border-primary data-[state=active]:text-foreground',
        cards:
          'rounded-t-lg border border-border border-b-0 bg-muted hover:bg-background data-[state=active]:bg-background data-[state=active]:shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-6',
      },
      orientation: {
        horizontal: '',
        vertical: 'w-full justify-start',
      },
      fullWidth: {
        true: 'flex-1',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      orientation: 'horizontal',
      fullWidth: false,
    },
  }
);

// ===================================================================
// TAB ITEM COMPONENT
// ===================================================================

interface TabItemComponentProps extends TabsNavItem {
  variant?: 'default' | 'pills' | 'underline' | 'cards';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  fullWidth?: boolean;
  active?: boolean;
  onTabClick?: (id: string) => void;
  onTabClose?: (id: string) => void;
}

const TabItemComponent: React.FC<TabItemComponentProps> = ({
  id,
  label,
  icon,
  badge,
  disabled = false,
  closable = false,
  href,
  variant = 'default',
  size = 'md',
  orientation = 'horizontal',
  fullWidth = false,
  active = false,
  onTabClick,
  onTabClose,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (href) {
      window.location.href = href;
    } else {
      onTabClick?.(id);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTabClose?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e as any);
    }
  };

  return (
    <button
      className={cn(
        tabItemVariants({ variant, size, orientation, fullWidth }),
        'group relative gap-2',
        disabled && 'cursor-not-allowed',
        active && 'text-foreground'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      role="tab"
      aria-selected={active}
      aria-controls={`tabpanel-${id}`}
      tabIndex={active ? 0 : -1}
      data-state={active ? 'active' : 'inactive'}
    >
      {icon && <span className="h-4 w-4 flex-shrink-0">{icon}</span>}

      <span className="truncate">{label}</span>

      {badge && (
        <Badge
          variant="secondary"
          className={cn(
            'text-xs',
            size === 'sm' && 'px-1 text-[10px]',
            size === 'lg' && 'text-sm'
          )}
        >
          {badge}
        </Badge>
      )}

      {closable && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-1 h-4 w-4 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={handleClose}
          tabIndex={-1}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </button>
  );
};

// ===================================================================
// SCROLL CONTROLS
// ===================================================================

interface ScrollControlsProps {
  onScrollLeft: () => void;
  onScrollRight: () => void;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ScrollControls: React.FC<ScrollControlsProps> = ({
  onScrollLeft,
  onScrollRight,
  canScrollLeft,
  canScrollRight,
  size = 'md',
}) => {
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'flex-shrink-0',
          size === 'sm' && 'h-6 w-6',
          size === 'lg' && 'h-8 w-8'
        )}
        onClick={onScrollLeft}
        disabled={!canScrollLeft}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'flex-shrink-0',
          size === 'sm' && 'h-6 w-6',
          size === 'lg' && 'h-8 w-8'
        )}
        onClick={onScrollRight}
        disabled={!canScrollRight}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </>
  );
};

// ===================================================================
// TABS NAV COMPONENT
// ===================================================================

export interface TabsNavComponentProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof tabsNavVariants> {
  items: TabsNavItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  scrollable?: boolean;
  centered?: boolean;
  fullWidth?: boolean;
}

const TabsNav = React.forwardRef<HTMLDivElement, TabsNavComponentProps>(
  (
    {
      className,
      items,
      activeTab,
      variant = 'default',
      size = 'md',
      orientation = 'horizontal',
      scrollable = false,
      centered = false,
      fullWidth = false,
      onTabChange,
      onTabClose,
      ...props
    },
    ref
  ) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = React.useState(false);
    const [canScrollRight, setCanScrollRight] = React.useState(false);

    // Handle keyboard navigation
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        if (!activeTab || items.length === 0) return;

        const currentIndex = items.findIndex((item) => item.id === activeTab);
        let nextIndex = currentIndex;

        switch (e.key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault();
            nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            break;
          case 'ArrowRight':
          case 'ArrowDown':
            e.preventDefault();
            nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            break;
          case 'Home':
            e.preventDefault();
            nextIndex = 0;
            break;
          case 'End':
            e.preventDefault();
            nextIndex = items.length - 1;
            break;
          default:
            return;
        }

        const nextTab = items[nextIndex];
        if (nextTab && !nextTab.disabled) {
          onTabChange?.(nextTab.id);
        }
      },
      [activeTab, items, onTabChange]
    );

    // Check scroll position
    const checkScrollPosition = React.useCallback(() => {
      if (!scrollRef.current || !scrollable) return;

      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }, [scrollable]);

    // Scroll functions
    const scrollLeft = React.useCallback(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }, []);

    const scrollRight = React.useCallback(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }, []);

    React.useEffect(() => {
      checkScrollPosition();
      const scrollElement = scrollRef.current;

      if (scrollElement) {
        scrollElement.addEventListener('scroll', checkScrollPosition);
        window.addEventListener('resize', checkScrollPosition);

        return () => {
          scrollElement.removeEventListener('scroll', checkScrollPosition);
          window.removeEventListener('resize', checkScrollPosition);
        };
      }
    }, [checkScrollPosition]);

    const tabsList = (
      <div
        ref={scrollRef}
        className={cn(
          tabsListVariants({
            variant,
            orientation,
            centered,
            fullWidth,
            scrollable,
          }),
          scrollable && 'scrollbar-hide'
        )}
        role="tablist"
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
      >
        {items.map((item) => (
          <TabItemComponent
            key={item.id}
            {...item}
            variant={variant}
            size={size}
            orientation={orientation}
            fullWidth={fullWidth}
            active={item.id === activeTab}
            onTabClick={onTabChange}
            onTabClose={onTabClose}
          />
        ))}
      </div>
    );

    return (
      <div
        className={cn(
          tabsNavVariants({ variant, orientation, size }),
          className
        )}
        ref={ref}
        {...props}
      >
        {scrollable && orientation === 'horizontal' ? (
          <div className="flex w-full items-center gap-1">
            <ScrollControls
              onScrollLeft={scrollLeft}
              onScrollRight={scrollRight}
              canScrollLeft={canScrollLeft}
              canScrollRight={canScrollRight}
              size={size}
            />
            <div className="flex-1 overflow-hidden">{tabsList}</div>
          </div>
        ) : (
          tabsList
        )}
      </div>
    );
  }
);

TabsNav.displayName = 'TabsNav';

// ===================================================================
// TAB CONTENT COMPONENT
// ===================================================================

interface TabContentProps {
  value: string;
  activeTab?: string;
  children?: React.ReactNode;
  className?: string;
}

const TabContent: React.FC<TabContentProps> = ({
  value,
  activeTab,
  children,
  className,
}) => {
  if (value !== activeTab) return null;

  return (
    <div
      className={cn('mt-4', className)}
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

// ===================================================================
// TABS CONTAINER
// ===================================================================

interface TabsContainerProps {
  children?: React.ReactNode;
  className?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const TabsContainer: React.FC<TabsContainerProps> = ({
  children,
  className,
  defaultValue,
  value: controlledValue,
  onValueChange,
}) => {
  const [uncontrolledValue, setUncontrolledValue] =
    React.useState(defaultValue);
  const value = controlledValue ?? uncontrolledValue;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (controlledValue === undefined) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [controlledValue, onValueChange]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === TabsNav) {
            return React.cloneElement(child, {
              activeTab: value,
              onTabChange: handleValueChange,
            });
          }
          if (child.type === TabContent) {
            return React.cloneElement(child, {
              activeTab: value,
            });
          }
        }
        return child;
      })}
    </div>
  );
};

// ===================================================================
// TABS HOOKS
// ===================================================================

export const useTabsNav = (
  initialItems: TabsNavItem[],
  defaultActiveTab?: string
) => {
  const [items, setItems] = React.useState<TabsNavItem[]>(initialItems);
  const [activeTab, setActiveTab] = React.useState<string | undefined>(
    defaultActiveTab ||
      (initialItems.length > 0 ? initialItems[0].id : undefined)
  );

  const addTab = React.useCallback((item: TabsNavItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const removeTab = React.useCallback(
    (tabId: string) => {
      setItems((prev) => prev.filter((item) => item.id !== tabId));
      setActiveTab((prev) => {
        if (prev === tabId) {
          const remainingItems = items.filter((item) => item.id !== tabId);
          return remainingItems.length > 0 ? remainingItems[0].id : undefined;
        }
        return prev;
      });
    },
    [items]
  );

  const updateTab = React.useCallback(
    (tabId: string, updates: Partial<TabsNavItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === tabId ? { ...item, ...updates } : item))
      );
    },
    []
  );

  const moveTab = React.useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return newItems;
    });
  }, []);

  return {
    items,
    activeTab,
    setActiveTab,
    setItems,
    addTab,
    removeTab,
    updateTab,
    moveTab,
  };
};

// ===================================================================
// EXPORTS
// ===================================================================

export {
  TabsNav,
  TabContent,
  TabsContainer,
  tabsNavVariants,
  tabsListVariants,
  tabItemVariants,
};
export type { TabsNavComponentProps as TabsNavProps };
