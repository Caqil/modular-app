// packages/ui/src/components/navigation/tabs-nav.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

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
      default: '',
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
          'rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        underline:
          'border-b-2 border-transparent hover:border-border data-[state=active]:border-primary',
        cards:
          'border border-border rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 py-2 text-sm',
        lg: 'h-10 px-6 py-2 text-base',
      },
      fullWidth: {
        true: 'flex-1',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      fullWidth: false,
    },
  }
);

interface TabItem {
  id: string;
  label: string;
  content?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  closable?: boolean;
}

interface TabsNavProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabsNavVariants> {
  items: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  fullWidth?: boolean;
  centered?: boolean;
  scrollable?: boolean;
  showContent?: boolean;
}

const TabsNav = React.forwardRef<HTMLDivElement, TabsNavProps>(
  (
    {
      className,
      variant,
      orientation,
      size,
      items,
      activeTab,
      onTabChange,
      onTabClose,
      fullWidth = false,
      centered = false,
      scrollable = false,
      showContent = true,
      ...props
    },
    ref
  ) => {
    const [canScrollLeft, setCanScrollLeft] = React.useState(false);
    const [canScrollRight, setCanScrollRight] = React.useState(false);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const checkScrollButtons = React.useCallback(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    }, []);

    React.useEffect(() => {
      if (scrollable) {
        checkScrollButtons();
        const container = scrollContainerRef.current;
        container?.addEventListener('scroll', checkScrollButtons);
        window.addEventListener('resize', checkScrollButtons);

        return () => {
          container?.removeEventListener('scroll', checkScrollButtons);
          window.removeEventListener('resize', checkScrollButtons);
        };
      }
      return undefined;
    }, [scrollable, checkScrollButtons]);

    const scrollTabs = (direction: 'left' | 'right') => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollAmount = 200;
      const newScrollLeft =
        direction === 'left'
          ? container.scrollLeft - scrollAmount
          : container.scrollLeft + scrollAmount;

      container.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
    };

    const handleTabClick = (tabId: string) => {
      const tab = items.find((item) => item.id === tabId);
      if (tab && !tab.disabled) {
        onTabChange(tabId);
      }
    };

    const handleTabClose = (tabId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      onTabClose?.(tabId);
    };

    const activeTabContent = items.find(
      (item) => item.id === activeTab
    )?.content;

    return (
      <div
        ref={ref}
        className={cn(
          tabsNavVariants({ variant, orientation, size }),
          className
        )}
        {...props}
      >
        <div className="relative">
          {/* Scroll buttons */}
          {scrollable && orientation === 'horizontal' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-0 top-0 z-10 h-full px-1"
                onClick={() => scrollTabs('left')}
                disabled={!canScrollLeft}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 z-10 h-full px-1"
                onClick={() => scrollTabs('right')}
                disabled={!canScrollRight}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Tabs list */}
          <div
            ref={scrollContainerRef}
            className={cn(
              tabsListVariants({
                variant,
                orientation,
                centered,
                fullWidth,
                scrollable,
              }),
              scrollable && orientation === 'horizontal' && 'px-8'
            )}
          >
            {items.map((item) => (
              <button
                key={item.id}
                className={cn(
                  tabItemVariants({
                    variant,
                    size,
                    fullWidth: fullWidth && orientation === 'horizontal',
                  })
                )}
                data-state={item.id === activeTab ? 'active' : 'inactive'}
                disabled={item.disabled}
                onClick={() => handleTabClick(item.id)}
              >
                {item.icon && (
                  <span className="mr-2 flex-shrink-0">{item.icon}</span>
                )}
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {item.badge}
                  </Badge>
                )}
                {item.closable && onTabClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-auto p-0 hover:bg-transparent"
                    onClick={(e) => handleTabClose(item.id, e)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {showContent && activeTabContent && (
          <div className="mt-4">{activeTabContent}</div>
        )}
      </div>
    );
  }
);

TabsNav.displayName = 'TabsNav';

// Separate content component
interface TabContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  activeValue: string;
}

const TabContent = React.forwardRef<HTMLDivElement, TabContentProps>(
  ({ className, value, activeValue, children, ...props }, ref) => {
    if (value !== activeValue) return null;

    return (
      <div
        ref={ref}
        className={cn('mt-4', className)}
        role="tabpanel"
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabContent.displayName = 'TabContent';

// Container component for manual content management
interface TabsContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const TabsContainer = React.forwardRef<HTMLDivElement, TabsContainerProps>(
  (
    { className, defaultValue, value, onValueChange, children, ...props },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      defaultValue || ''
    );
    const currentValue = value ?? internalValue;

    const handleValueChange = (newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <div ref={ref} className={className} {...props}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            if (child.type === TabsNav) {
              return React.cloneElement(child, {
                ...child.props,
                activeTab: currentValue,
                onTabChange: handleValueChange,
              } as React.ComponentProps<typeof TabsNav> & {
                activeTab: string;
                onTabChange: (value: string) => void;
              });
            }
            if (child.type === TabContent) {
              return React.cloneElement(child, {
                ...child.props,
                activeValue: currentValue,
              } as React.ComponentProps<typeof TabContent> & {
                activeValue: string;
              });
            }
          }
          return child;
        })}
      </div>
    );
  }
);

TabsContainer.displayName = 'TabsContainer';

export {
  TabsNav,
  TabContent,
  TabsContainer,
  tabsNavVariants,
  tabsListVariants,
  tabItemVariants,
  type TabItem,
  type TabsNavProps,
};
