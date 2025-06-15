// apps/web/src/components/layout/admin-sidebar.tsx (FIXED)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Image,
  Users,
  Settings,
  Puzzle,
  Palette,
  BookOpen,
  ShoppingCart,
  BarChart3,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Posts",
    href: "/admin/posts",
    icon: FileText,
    children: [
      { title: "All Posts", href: "/admin/posts" },
      { title: "Add New", href: "/admin/posts/create" },
      { title: "Categories", href: "/admin/posts/categories" },
      { title: "Tags", href: "/admin/posts/tags" },
    ],
  },
  {
    title: "Pages",
    href: "/admin/pages",
    icon: FileText,
    children: [
      { title: "All Pages", href: "/admin/pages" },
      { title: "Add New", href: "/admin/pages/create" },
    ],
  },
  {
    title: "Media",
    href: "/admin/media",
    icon: Image,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Plugins",
    href: "/admin/plugins",
    icon: Puzzle,
    children: [
      { title: "Installed Plugins", href: "/admin/plugins" },
      { title: "Add New", href: "/admin/plugins/add" },
    ],
  },
  {
    title: "Themes",
    href: "/admin/themes",
    icon: Palette,
    children: [
      { title: "Themes", href: "/admin/themes" },
      { title: "Customize", href: "/admin/themes/customize" },
    ],
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    children: [
      { title: "General", href: "/admin/settings" },
      { title: "Reading", href: "/admin/settings/reading" },
      { title: "Discussion", href: "/admin/settings/discussion" },
      { title: "Media", href: "/admin/settings/media" },
    ],
  },
];

// Plugin-specific menu items (would be dynamically loaded)
const pluginMenuItems = [
  {
    title: "Blog",
    href: "/admin/blog",
    icon: BookOpen,
    plugin: "blog",
    children: [
      { title: "All Posts", href: "/admin/blog/posts" },
      { title: "Add New", href: "/admin/blog/posts/create" },
      { title: "Categories", href: "/admin/blog/categories" },
    ],
  },
  {
    title: "E-commerce",
    href: "/admin/ecommerce",
    icon: ShoppingCart,
    plugin: "ecommerce",
    children: [
      { title: "Products", href: "/admin/ecommerce/products" },
      { title: "Orders", href: "/admin/ecommerce/orders" },
      { title: "Settings", href: "/admin/ecommerce/settings" },
    ],
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    plugin: "analytics",
  },
  {
    title: "Contact Forms",
    href: "/admin/contact-forms",
    icon: Mail,
    plugin: "contact-form",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">Modular App</h1>
      </div>

      <nav className="px-4 pb-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100",
                  pathname === item.href
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.title}
              </Link>
              {item.children && (
                <ul className="ml-8 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className={cn(
                          "block px-3 py-1 text-sm rounded-md hover:bg-gray-100",
                          pathname === child.href
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        {child.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}

          {/* Plugin Menu Items */}
          <li className="pt-4">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Plugins
            </div>
          </li>
          {pluginMenuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100",
                  pathname === item.href
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.title}
              </Link>
              {item.children && (
                <ul className="ml-8 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className={cn(
                          "block px-3 py-1 text-sm rounded-md hover:bg-gray-100",
                          pathname === child.href
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        {child.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
