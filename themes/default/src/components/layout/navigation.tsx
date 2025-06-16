"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface MenuItem {
  id: string;
  title: string;
  url: string;
  children?: MenuItem[];
  target?: "_blank" | "_self";
  classes?: string;
}

interface NavigationProps {
  mobile?: boolean;
  onItemClick?: () => void;
}

export default function Navigation({
  mobile = false,
  onItemClick,
}: NavigationProps) {
  // This would typically come from a menu API or configuration
  const menuItems: MenuItem[] = [
    { id: "1", title: "Home", url: "/" },
    { id: "2", title: "Blog", url: "/blog" },
    {
      id: "3",
      title: "Categories",
      url: "/categories",
      children: [
        { id: "3-1", title: "Technology", url: "/category/technology" },
        { id: "3-2", title: "Design", url: "/category/design" },
        { id: "3-3", title: "Business", url: "/category/business" },
        { id: "3-4", title: "Lifestyle", url: "/category/lifestyle" },
      ],
    },
    {
      id: "4",
      title: "Pages",
      url: "#",
      children: [
        { id: "4-1", title: "About", url: "/about" },
        { id: "4-2", title: "Services", url: "/services" },
        { id: "4-3", title: "Portfolio", url: "/portfolio" },
        { id: "4-4", title: "Team", url: "/team" },
      ],
    },
    { id: "5", title: "Contact", url: "/contact" },
  ];

  if (mobile) {
    return <MobileNavigation items={menuItems} onItemClick={onItemClick} />;
  }

  return <DesktopNavigation items={menuItems} />;
}

// Desktop Navigation Component
interface DesktopNavigationProps {
  items: MenuItem[];
}

function DesktopNavigation({ items }: DesktopNavigationProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = (itemId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(itemId);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <nav className="flex items-center space-x-8">
      {items.map((item) => (
        <div
          key={item.id}
          className="relative"
          onMouseEnter={() => item.children && handleMouseEnter(item.id)}
          onMouseLeave={handleMouseLeave}
        >
          <NavItem item={item} isActive={activeDropdown === item.id} />

          {item.children && activeDropdown === item.id && (
            <DropdownMenu items={item.children} />
          )}
        </div>
      ))}
    </nav>
  );
}

// Mobile Navigation Component
interface MobileNavigationProps {
  items: MenuItem[];
  onItemClick?: () => void;
}

function MobileNavigation({ items, onItemClick }: MobileNavigationProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <nav className="space-y-2">
      {items.map((item) => (
        <MobileNavItem
          key={item.id}
          item={item}
          isExpanded={expandedItems.has(item.id)}
          onToggle={() => toggleExpanded(item.id)}
          onItemClick={onItemClick}
        />
      ))}
    </nav>
  );
}

// Navigation Item Component
interface NavItemProps {
  item: MenuItem;
  isActive?: boolean;
  mobile?: boolean;
  onItemClick?: () => void;
}

function NavItem({
  item,
  isActive = false,
  mobile = false,
  onItemClick,
}: NavItemProps) {
  const hasChildren = item.children && item.children.length > 0;

  const linkClasses = `
    flex items-center space-x-1 font-medium transition-colors
    ${
      mobile
        ? "text-base py-2 hover:text-primary"
        : "text-sm hover:text-primary"
    }
    ${isActive ? "text-primary" : "text-foreground"}
  `.trim();

  const handleClick = (e: React.MouseEvent) => {
    if (item.url === "#" && hasChildren) {
      e.preventDefault();
    }
    onItemClick?.();
  };

  return (
    <a
      href={item.url}
      target={item.target}
      className={linkClasses}
      onClick={handleClick}
    >
      <span>{item.title}</span>
      {hasChildren && !mobile && (
        <ChevronDown className="h-3 w-3 transition-transform" />
      )}
    </a>
  );
}

// Mobile Navigation Item Component
interface MobileNavItemProps {
  item: MenuItem;
  isExpanded: boolean;
  onToggle: () => void;
  onItemClick?: () => void;
}

function MobileNavItem({
  item,
  isExpanded,
  onToggle,
  onItemClick,
}: MobileNavItemProps) {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <NavItem item={item} mobile onItemClick={onItemClick} />
        {hasChildren && (
          <button
            onClick={onToggle}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Toggle ${item.title} submenu`}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-4 mt-2 space-y-2 border-l border-border pl-4">
          {item.children!.map((child) => (
            <NavItem
              key={child.id}
              item={child}
              mobile
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Dropdown Menu Component
interface DropdownMenuProps {
  items: MenuItem[];
}

function DropdownMenu({ items }: DropdownMenuProps) {
  return (
    <div className="absolute top-full left-0 mt-1 w-56 bg-background border border-border rounded-md shadow-lg z-50">
      <div className="py-2">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target={item.target}
            className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            {item.title}
          </a>
        ))}
      </div>
    </div>
  );
}
