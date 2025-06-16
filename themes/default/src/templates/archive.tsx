"use client";

import React from "react";
import { useThemeSettings } from "../hooks/use-theme-settings";
import { ContentArea, Footer, Header, PostList, Sidebar } from "..";
import { ICategory, IPost, ITag } from "@modular-app/core";
interface ArchiveTemplateProps {
  posts: IPost[];
  archiveType: "category" | "tag" | "date" | "author";
  archiveData?:
    | ICategory
    | ITag
    | { year: number; month?: number }
    | { author: any };
  totalPosts: number;
  currentPage: number;
  totalPages: number;
  title: string;
  description?: string;
}

export default function ArchiveTemplate({
  posts,
  archiveType,
  archiveData,
  totalPosts,
  currentPage,
  totalPages,
  title,
  description,
}: ArchiveTemplateProps) {
  const { settings } = useThemeSettings();
  const sidebarPosition = settings.sidebar_position || "right";
  const showSidebar = sidebarPosition !== "none";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Archive Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">{title}</h1>
          {description && (
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {description}
            </p>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            {totalPosts === 1 ? "1 post found" : `${totalPosts} posts found`}
          </div>
        </header>

        {/* Main Content Area */}
        <div
          className={`grid gap-8 ${showSidebar ? "lg:grid-cols-12" : "lg:grid-cols-1"}`}
        >
          {/* Posts */}
          <div className={showSidebar ? "lg:col-span-8" : "lg:col-span-12"}>
            <ContentArea>
              {posts.length > 0 ? (
                <>
                  <PostList
                    posts={posts}
                    layout={settings.blog_layout || "grid"}
                    showExcerpt={true}
                    showMeta={settings.show_post_meta}
                    showFeaturedImage={settings.show_featured_image}
                    showReadMore={settings.show_read_more}
                  />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-12">
                      <ArchivePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        archiveType={archiveType}
                        archiveData={archiveData}
                      />
                    </div>
                  )}
                </>
              ) : (
                <EmptyArchive archiveType={archiveType} />
              )}
            </ContentArea>
          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div
              className={`lg:col-span-4 ${sidebarPosition === "left" ? "lg:order-first" : ""}`}
            >
              <Sidebar />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Archive Pagination Component
interface ArchivePaginationProps {
  currentPage: number;
  totalPages: number;
  archiveType: string;
  archiveData?: any;
}

function ArchivePagination({
  currentPage,
  totalPages,
  archiveType,
  archiveData,
}: ArchivePaginationProps) {
  const getBasePath = () => {
    switch (archiveType) {
      case "category":
        return `/category/${archiveData?.slug}`;
      case "tag":
        return `/tag/${archiveData?.slug}`;
      case "date":
        if (archiveData?.month) {
          return `/archive/${archiveData.year}/${archiveData.month.toString().padStart(2, "0")}`;
        }
        return `/archive/${archiveData?.year}`;
      case "author":
        return `/author/${archiveData?.author?.id}`;
      default:
        return "/archive";
    }
  };

  const basePath = getBasePath();
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="flex items-center justify-center space-x-2">
      {currentPage > 1 && (
        <a
          href={`${basePath}${currentPage > 2 ? `?page=${currentPage - 1}` : ""}`}
          className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          Previous
        </a>
      )}

      {pages.map((page) => (
        <a
          key={page}
          href={`${basePath}${page > 1 ? `?page=${page}` : ""}`}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            page === currentPage
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          {page}
        </a>
      ))}

      {currentPage < totalPages && (
        <a
          href={`${basePath}?page=${currentPage + 1}`}
          className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          Next
        </a>
      )}
    </nav>
  );
}

// Empty Archive Component
interface EmptyArchiveProps {
  archiveType: string;
}

function EmptyArchive({ archiveType }: EmptyArchiveProps) {
  const getMessage = () => {
    switch (archiveType) {
      case "category":
        return "No posts found in this category.";
      case "tag":
        return "No posts found with this tag.";
      case "date":
        return "No posts found for this date.";
      case "author":
        return "No posts found by this author.";
      default:
        return "No posts found.";
    }
  };

  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📭</div>
      <h3 className="text-xl font-semibold mb-2">Nothing Here Yet</h3>
      <p className="text-muted-foreground mb-6">{getMessage()}</p>
      <a
        href="/"
        className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Back to Home
      </a>
    </div>
  );
}
