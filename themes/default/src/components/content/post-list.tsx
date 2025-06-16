"use client";

import React from "react";
import {
  Calendar,
  Clock,
  User,
  Eye,
  MessageCircle,
  Tag,
  Folder,
} from "lucide-react";
import { IPost } from "@modular-app/core";
import { ThemeHelpers } from "../..";

interface PostListProps {
  posts: IPost[];
  layout?: "list" | "grid" | "grid-3" | "masonry";
  showExcerpt?: boolean;
  showMeta?: boolean;
  showFeaturedImage?: boolean;
  showReadMore?: boolean;
  highlightQuery?: string;
  className?: string;
}

export default function PostList({
  posts,
  layout = "grid",
  showExcerpt = true,
  showMeta = true,
  showFeaturedImage = true,
  showReadMore = true,
  highlightQuery,
  className = "",
}: PostListProps) {
  const getGridClasses = () => {
    switch (layout) {
      case "list":
        return "space-y-8";
      case "grid":
        return "grid grid-cols-1 md:grid-cols-2 gap-8";
      case "grid-3":
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
      case "masonry":
        return "columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6";
      default:
        return "grid grid-cols-1 md:grid-cols-2 gap-8";
    }
  };

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-semibold mb-2">No Posts Found</h3>
        <p className="text-muted-foreground">
          Check back later for new content!
        </p>
      </div>
    );
  }

  return (
    <div className={`${getGridClasses()} ${className}`}>
      {posts.map((post) => (
        <PostCard
          key={post._id.toString()}
          post={post}
          layout={layout}
          showExcerpt={showExcerpt}
          showMeta={showMeta}
          showFeaturedImage={showFeaturedImage}
          showReadMore={showReadMore}
          highlightQuery={highlightQuery}
        />
      ))}
    </div>
  );
}

// Post Card Component
interface PostCardProps {
  post: IPost;
  layout: string;
  showExcerpt: boolean;
  showMeta: boolean;
  showFeaturedImage: boolean;
  showReadMore: boolean;
  highlightQuery?: string;
}

function PostCard({
  post,
  layout,
  showExcerpt,
  showMeta,
  showFeaturedImage,
  showReadMore,
  highlightQuery,
}: PostCardProps) {
  const isListLayout = layout === "list";
  const isMasonry = layout === "masonry";

  const highlightText = (text: string, query?: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>',
    );
  };

  const cardClasses = `
    group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300
    ${isMasonry ? "break-inside-avoid" : ""}
    ${isListLayout ? "md:flex md:space-x-6" : ""}
  `.trim();

  return (
    <article className={cardClasses}>
      {/* Featured Image */}
      {showFeaturedImage && post.featuredImage && (
        <div
          className={`relative overflow-hidden ${isListLayout ? "md:w-1/3 md:flex-shrink-0" : "aspect-video"}`}
        >
          <img
            src={post.featuredImage}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Post Status Badge */}
          {post.meta?.isFeatured && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500 text-yellow-900">
                Featured
              </span>
            </div>
          )}

          {/* Sticky Badge */}
          {post.meta?.isSticky && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white">
                Pinned
              </span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={`p-6 ${isListLayout ? "md:flex-1" : ""}`}>
        {/* Categories */}
        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.categories.slice(0, 2).map((category: any) => (
              <a
                key={category._id}
                href={ThemeHelpers.getCategoryUrl(category)}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Folder className="h-3 w-3 mr-1" />
                {category.name}
              </a>
            ))}
          </div>
        )}

        {/* Title */}
        <h2
          className={`font-bold leading-tight mb-3 group-hover:text-primary transition-colors ${isListLayout ? "text-xl" : "text-lg"}`}
        >
          <a
            href={ThemeHelpers.getPostUrl(post)}
            dangerouslySetInnerHTML={{
              __html: highlightText(post.title, highlightQuery),
            }}
          />
        </h2>

        {/* Meta Information */}
        {showMeta && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-3">
            {/* Author */}
            <div className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>
                <a
                  href={ThemeHelpers.getAuthorUrl(post.author.toString())}
                  className="hover:text-primary"
                >
                  Author Name
                </a>
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <time dateTime={post.publishedAt?.toISOString()}>
                {ThemeHelpers.formatDate(post.publishedAt || post.createdAt)}
              </time>
            </div>

            {/* Reading Time */}
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>
                {ThemeHelpers.formatReadingTime(
                  post.meta?.readingTime ||
                    ThemeHelpers.getReadingTime(post.content),
                )}
              </span>
            </div>

            {/* View Count */}
            {post.meta?.viewCount && (
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>{post.meta.viewCount}</span>
              </div>
            )}

            {/* Comment Count */}
            {post.meta?.commentCount && (
              <div className="flex items-center space-x-1">
                <MessageCircle className="h-3 w-3" />
                <span>{post.meta.commentCount}</span>
              </div>
            )}
          </div>
        )}

        {/* Excerpt */}
        {showExcerpt && (
          <div className="text-muted-foreground mb-4">
            <p
              dangerouslySetInnerHTML={{
                __html: highlightText(
                  post.excerpt || ThemeHelpers.getExcerpt(post.content, 120),
                  highlightQuery,
                ),
              }}
            />
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {post.tags.slice(0, 3).map((tag: string) => (
              <a
                key={tag}
                href={ThemeHelpers.getTagUrl({ slug: tag, name: tag } as any)}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <Tag className="h-2 w-2 mr-1" />
                {tag}
              </a>
            ))}
            {post.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{post.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Read More Button */}
        {showReadMore && (
          <div className="flex items-center justify-between">
            <a
              href={ThemeHelpers.getPostUrl(post)}
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Read More
              <svg
                className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
