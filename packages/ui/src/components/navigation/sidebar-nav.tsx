// packages/ui/src/components/navigation/sidebar-nav.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';

const sidebarVariants = cva('flex flex-col border-r bg-background', {
  variants: {
    variant: {
      default: 'w-64',
      minimal: 'w-56',
      compact: 'w-48',
    },
    collapsed: {
      true: 'w-16',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    collapsed: false,
  },
});

const sidebarItemVariants = cva(
  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
  {
    variants: {
      active: {
        true: 'bg-accent text-accent-foreground',
        false:
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: 'cursor-pointer',
      },
      level: {
        0: 'pl-3',
        1: 'pl-6',
        2: 'pl-9',
        3: 'pl-12',
      },
    },
    defaultVariants: {
      active: false,
      disabled: false,
      level: 0,
    },
  }
);

interface SidebarNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  active?: boolean;
  disabled?: boolean;
  children?: SidebarNavItem[];
}

interface SidebarNavProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarVariants> {
  items: SidebarNavItem[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showToggle?: boolean;
  onItemClick?: (item: SidebarNavItem) => void;
  activeItemId?: string;
  defaultOpenItems?: string[];
}

const SidebarNav = React.forwardRef<HTMLDivElement, SidebarNavProps>(
  (
    {
      className,
      variant,
      collapsed = false,
      onToggleCollapse,
      showToggle = true,
      items,
      onItemClick,
      activeItemId,
      defaultOpenItems = [],
      ...props
    },
    ref
  ) => {
    const [openItems, setOpenItems] = React.useState<Set<string>>(
      new Set(defaultOpenItems)
    );

    const toggleItem = (itemId: string) => {
      setOpenItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    };

    const handleItemClick = (item: SidebarNavItem) => {
      if (item.disabled) return;

      if (item.children && item.children.length > 0) {
        toggleItem(item.id);
      } else {
        onItemClick?.(item);
      }
    };

    const renderNavItem = (item: SidebarNavItem, level = 0) => {
      const hasChildren = item.children && item.children.length > 0;
      const isOpen = openItems.has(item.id);
      const isActive = item.active || item.id === activeItemId;

      if (hasChildren) {
        return (
          <Collapsible
            key={item.id}
            open={isOpen}
            onOpenChange={() => toggleItem(item.id)}
          >
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  sidebarItemVariants({
                    active: isActive,
                    disabled: item.disabled,
                    level: level as 0 | 1 | 2 | 3,
                  }),
                  'w-full justify-between'
                )}
                disabled={item.disabled}
              >
                <div className="flex items-center gap-3">
                  {item.icon && !collapsed && (
                    <span className="flex-shrink-0">{item.icon}</span>
                  )}
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                {!collapsed && (
                  <span className="flex-shrink-0">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">
              {item.children?.map((child) => renderNavItem(child, level + 1))}
            </CollapsibleContent>
          </Collapsible>
        );
      }

      const ItemComponent = item.href ? 'a' : 'button';

      return (
        <ItemComponent
          key={item.id}
          href={item.href}
          className={cn(
            sidebarItemVariants({
              active: isActive,
              disabled: item.disabled,
              level: level as 0 | 1 | 2 | 3,
            }),
            'w-full justify-start'
          )}
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
        >
          {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
          {!collapsed && (
            <>
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </ItemComponent>
      );
    };

    return (
      <div
        ref={ref}
        className={cn(sidebarVariants({ variant, collapsed }), className)}
        {...props}
      >
        {/* Header with toggle */}
        {showToggle && (
          <div className="flex items-center justify-between border-b p-4">
            {!collapsed && <h2 className="font-semibold">Navigation</h2>}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="ml-auto"
            >
              {collapsed ? (
                <Menu className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Navigation items */}
        <ScrollArea className="flex-1 p-4">
          <nav className="space-y-1">
            {items.map((item) => renderNavItem(item))}
          </nav>
        </ScrollArea>
      </div>
    );
  }
);

SidebarNav.displayName = 'SidebarNav';

// Header and Footer components for sidebar
interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  collapsed?: boolean;
}

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, title, collapsed, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('border-b p-4', className)} {...props}>
        {title && !collapsed && (
          <h2 className="text-lg font-semibold">{title}</h2>
        )}
        {children}
      </div>
    );
  }
);

SidebarHeader.displayName = 'SidebarHeader';

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('mt-auto border-t p-4', className)}
      {...props}
    />
  );
});

SidebarFooter.displayName = 'SidebarFooter';

export {
  SidebarNav,
  SidebarHeader,
  SidebarFooter,
  sidebarVariants,
  sidebarItemVariants,
  type SidebarNavItem,
  type SidebarNavProps,
};
