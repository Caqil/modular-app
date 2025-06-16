"use client";

import React from "react";
import { useThemeSettings } from "../hooks/use-theme-settings";
import { IPost } from "@modular-app/core";
import { ContentArea, Footer, Header, PostList, Sidebar } from "..";

interface HomePageProps {
  posts: IPost[];
  featuredPosts?: IPost[];
  totalPosts: number;
  currentPage: number;
  totalPages: number;
}

export default function HomePage({
  posts,
  featuredPosts = [],
  totalPosts,
  currentPage,
  totalPages,
}: HomePageProps) {
  const { settings } = useThemeSettings();
  const sidebarPosition = settings.sidebar_position || "right";
  const showSidebar = sidebarPosition !== "none";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section with Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Featured Post */}
              <div className="lg:col-span-2">
                <FeaturedPostCard post={featuredPosts[0]} size="large" />
              </div>

              {/* Secondary Featured Posts */}
              <div className="space-y-6">
                {featuredPosts.slice(1, 3).map((post) => (
                  <FeaturedPostCard
                    key={post.slug.toString()}
                    post={post}
                    size="small"
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Main Content Area */}
        <div
          className={`grid gap-8 ${showSidebar ? "lg:grid-cols-12" : "lg:grid-cols-1"}`}
        >
          {/* Content */}
          <div className={showSidebar ? "lg:col-span-8" : "lg:col-span-12"}>
            <ContentArea>
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Latest Posts</h1>
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * 10 + 1, totalPosts)} -{" "}
                  {Math.min(currentPage * 10, totalPosts)} of {totalPosts} posts
                </div>
              </div>

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
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    basePath="/"
                  />
                </div>
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

// Featured Post Card Component
interface FeaturedPostCardProps {
  post: IPost;
  size: "large" | "small";
}

function FeaturedPostCard({ post, size }: FeaturedPostCardProps) {
  const isLarge = size === "large";

  return (
    <article
      className={`group relative overflow-hidden rounded-lg bg-card ${isLarge ? "h-96" : "h-48"}`}
    >
      {post.featuredImage && (
        <div className="absolute inset-0">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col justify-end p-6">
        <div className="space-y-2">
          {post.categories?.length > 0 && (
            <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              {post.categories[0].name}
            </span>
          )}

          <h2
            className={`font-bold text-white ${isLarge ? "text-2xl lg:text-3xl" : "text-lg"}`}
          >
            <a href={`/posts/${post.slug}`} className="hover:underline">
              {post.title}
            </a>
          </h2>

          {isLarge && post.excerpt && (
            <p className="text-gray-200 line-clamp-2">{post.excerpt}</p>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-300">
            <time dateTime={post.publishedAt?.toISOString()}>
              {post.publishedAt &&
                new Date(post.publishedAt).toLocaleDateString()}
            </time>
            <span>•</span>
            <span>{post.meta?.readingTime || 5} min read</span>
          </div>
        </div>
      </div>
    </article>
  );
}

// Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
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
