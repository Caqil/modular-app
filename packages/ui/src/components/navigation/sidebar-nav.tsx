// ===================================================================
// SIDEBAR NAV COMPONENT - COLLAPSIBLE SIDEBAR NAVIGATION
// ===================================================================

'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown, ChevronRight, ExternalLink, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';

// ===================================================================
// SIDEBAR NAV VARIANT STYLES
// ===================================================================

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
      hasChildren: {
        true: 'justify-between',
        false: '',
      },
    },
    defaultVariants: {
      active: false,
      disabled: false,
      hasChildren: false,
    },
  }
);

// ===================================================================
// SIDEBAR NAV ITEM COMPONENT
// ===================================================================

interface SidebarNavItemComponentProps {
  item: SidebarNavItem;
  collapsed?: boolean;
  showIcons?: boolean;
  showBadges?: boolean;
  level?: number;
  onItemClick?: (item: SidebarNavItem) => void;
}

const SidebarNavItemComponent: React.FC<SidebarNavItemComponentProps> = ({
  item,
  collapsed = false,
  showIcons = true,
  showBadges = true,
  level = 0,
  onItemClick,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (item.disabled) return;

    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      onItemClick?.(item);
      if (item.href) {
        if (item.external) {
          window.open(item.href, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = item.href;
        }
      }
    }
  };

  const ItemContent = () => (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showIcons && item.icon && (
          <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>
        )}

        {!collapsed && <span className="truncate">{item.label}</span>}

        {item.external && !collapsed && (
          <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
        )}
      </div>

      {!collapsed && (
        <div className="flex items-center gap-2">
          {showBadges && item.badge && (
            <Badge variant="secondary" className="text-xs">
              {item.badge}
            </Badge>
          )}

          {hasChildren && (
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          )}
        </div>
      )}
    </>
  );

  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              sidebarItemVariants({
                active: item.active,
                disabled: item.disabled,
                hasChildren: true,
              }),
              level > 0 && 'ml-4',
              collapsed && 'justify-center'
            )}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e as any);
              }
            }}
          >
            <ItemContent />
          </div>
        </CollapsibleTrigger>

        {!collapsed && (
          <CollapsibleContent className="space-y-1">
            {item.children?.map((child) => (
              <SidebarNavItemComponent
                key={child.id}
                item={child}
                collapsed={collapsed}
                showIcons={showIcons}
                showBadges={showBadges}
                level={level + 1}
                onItemClick={onItemClick}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  }

  return (
    <div
      className={cn(
        sidebarItemVariants({
          active: item.active,
          disabled: item.disabled,
        }),
        level > 0 && 'ml-4',
        collapsed && 'justify-center'
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      title={collapsed ? item.label : undefined}
    >
      <ItemContent />
    </div>
  );
};

// ===================================================================
// SIDEBAR NAV HEADER
// ===================================================================

interface SidebarNavHeaderProps {
  children?: React.ReactNode;
  collapsed?: boolean;
  collapsible?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

const SidebarNavHeader: React.FC<SidebarNavHeaderProps> = ({
  children,
  collapsed = false,
  collapsible = true,
  onToggleCollapse,
}) => {
  return (
    <div className="flex items-center justify-between border-b p-4">
      {!collapsed && children}

      {collapsible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleCollapse?.(!collapsed)}
          className={cn('h-8 w-8 p-0', collapsed && 'mx-auto')}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
};

// ===================================================================
// SIDEBAR NAV FOOTER
// ===================================================================

interface SidebarNavFooterProps {
  children?: React.ReactNode;
  collapsed?: boolean;
}

const SidebarNavFooter: React.FC<SidebarNavFooterProps> = ({
  children,
  collapsed = false,
}) => {
  if (collapsed) return null;

  return <div className="mt-auto border-t p-4">{children}</div>;
};

// ===================================================================
// SIDEBAR NAV COMPONENT
// ===================================================================

export interface SidebarNavComponentProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'children'>,
    VariantProps<typeof sidebarVariants> {
  items: SidebarNavItem[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  showIcons?: boolean;
  showBadges?: boolean;
  collapsible?: boolean;
  onItemClick?: (item: SidebarNavItem) => void;
  onToggleCollapse?: (collapsed: boolean) => void;
}

const SidebarNav = React.forwardRef<HTMLElement, SidebarNavComponentProps>(
  (
    {
      className,
      items,
      header,
      footer,
      variant,
      collapsed = false,
      showIcons = true,
      showBadges = true,
      collapsible = true,
      onItemClick,
      onToggleCollapse,
      ...props
    },
    ref
  ) => {
    const [internalCollapsed, setInternalCollapsed] = React.useState(collapsed);

    // Use internal state if onToggleCollapse is not provided
    const isCollapsed = onToggleCollapse ? collapsed : internalCollapsed;
    const handleToggleCollapse = onToggleCollapse || setInternalCollapsed;

    return (
      <nav
        className={cn(
          sidebarVariants({ variant, collapsed: isCollapsed }),
          className
        )}
        ref={ref}
        {...props}
      >
        {(header || collapsible) && (
          <SidebarNavHeader
            collapsed={isCollapsed}
            collapsible={collapsible}
            onToggleCollapse={handleToggleCollapse}
          >
            {header}
          </SidebarNavHeader>
        )}

        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {items.map((item) => (
              <SidebarNavItemComponent
                key={item.id}
                item={item}
                collapsed={isCollapsed}
                showIcons={showIcons}
                showBadges={showBadges}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        </ScrollArea>

        {footer && (
          <SidebarNavFooter collapsed={isCollapsed}>{footer}</SidebarNavFooter>
        )}
      </nav>
    );
  }
);

SidebarNav.displayName = 'SidebarNav';

// ===================================================================
// SIDEBAR NAV HOOKS
// ===================================================================

export const useSidebarNav = (initialItems: SidebarNavItem[]) => {
  const [items, setItems] = React.useState<SidebarNavItem[]>(initialItems);
  const [collapsed, setCollapsed] = React.useState(false);

  const updateItemActive = React.useCallback(
    (itemId: string, active: boolean) => {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, active } : { ...item, active: false }
        )
      );
    },
    []
  );

  const updateItem = React.useCallback(
    (itemId: string, updates: Partial<SidebarNavItem>) => {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  const addItem = React.useCallback(
    (item: SidebarNavItem, parentId?: string) => {
      setItems((prevItems) => {
        if (!parentId) {
          return [...prevItems, item];
        }

        return prevItems.map((prevItem) => {
          if (prevItem.id === parentId) {
            return {
              ...prevItem,
              children: [...(prevItem.children || []), item],
            };
          }
          return prevItem;
        });
      });
    },
    []
  );

  const removeItem = React.useCallback((itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  }, []);

  const toggleCollapse = React.useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return {
    items,
    collapsed,
    setItems,
    setCollapsed,
    updateItemActive,
    updateItem,
    addItem,
    removeItem,
    toggleCollapse,
  };
};

// ===================================================================
// EXPORTS
// ===================================================================

export {
  SidebarNav,
  SidebarNavHeader,
  SidebarNavFooter,
  sidebarVariants,
  sidebarItemVariants,
  useSidebarNav,
};
export type { SidebarNavComponentProps as SidebarNavProps };
