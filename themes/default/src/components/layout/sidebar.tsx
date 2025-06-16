"use client";

import React from "react";
import RecentPosts from "../widgets/recent-posts";
import Categories from "../widgets/categories";
import Tags from "../widgets/tags";

export default function Sidebar() {
  return (
    <aside className="space-y-8">
      {/* Search Widget */}
      <SidebarWidget title="Search">
        <SearchWidget />
      </SidebarWidget>

      {/* Recent Posts Widget */}
      <SidebarWidget title="Recent Posts">
        <RecentPosts />
      </SidebarWidget>

      {/* Categories Widget */}
      <SidebarWidget title="Categories">
        <Categories />
      </SidebarWidget>

      {/* Tags Widget */}
      <SidebarWidget title="Popular Tags">
        <Tags />
      </SidebarWidget>

      {/* Archive Widget */}
      <SidebarWidget title="Archives">
        <ArchiveWidget />
      </SidebarWidget>

      {/* Newsletter Widget */}
      <SidebarWidget title="Newsletter">
        <NewsletterWidget />
      </SidebarWidget>
    </aside>
  );
}

// Sidebar Widget Wrapper
interface SidebarWidgetProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function SidebarWidget({
  title,
  children,
  className = "",
}: SidebarWidgetProps) {
  return (
    <div className={`bg-card rounded-lg border border-border p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

// Search Widget
function SearchWidget() {
  return (
    <form className="space-y-3" action="/search" method="GET">
      <div className="relative">
        <input
          type="search"
          name="q"
          placeholder="Search posts..."
          className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Search
      </button>
    </form>
  );
}

// Archive Widget
function ArchiveWidget() {
  // This would typically come from an API
  const archives = [
    { label: "January 2024", url: "/archive/2024/01", count: 8 },
    { label: "December 2023", url: "/archive/2023/12", count: 12 },
    { label: "November 2023", url: "/archive/2023/11", count: 6 },
    { label: "October 2023", url: "/archive/2023/10", count: 9 },
    { label: "September 2023", url: "/archive/2023/09", count: 14 },
  ];

  return (
    <ul className="space-y-2">
      {archives.map((archive) => (
        <li key={archive.url}>
          <a
            href={archive.url}
            className="flex items-center justify-between text-sm hover:text-primary transition-colors"
          >
            <span>{archive.label}</span>
            <span className="text-xs text-muted-foreground">
              ({archive.count})
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// Newsletter Widget
function NewsletterWidget() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Subscribe to our newsletter to get the latest updates and articles
        delivered to your inbox.
      </p>

      <form className="space-y-3">
        <input
          type="email"
          placeholder="Your email address"
          className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          required
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Subscribe
        </button>
      </form>

      <p className="text-xs text-muted-foreground">
        We respect your privacy. Unsubscribe at any time.
      </p>
    </div>
  );
}
