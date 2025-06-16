"use client";

import React, { useState, useEffect } from "react";
import { IPost } from "@modular-app/core/database/models";
import ThemeHelpers from "../theme-helpers";
import { Calendar, Clock } from "lucide-react";

interface RecentPostsProps {
  count?: number;
  showThumbnails?: boolean;
  showMeta?: boolean;
  className?: string;
}

export default function RecentPosts({
  count = 5,
  showThumbnails = true,
  showMeta = true,
  className = "",
}: RecentPostsProps) {
  const [posts, setPosts] = useState<IPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentPosts();
  }, [count]);

  const fetchRecentPosts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/posts?limit=${count}&status=published&sort=-publishedAt`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch recent posts");
      }

      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching recent posts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <RecentPostsSkeleton count={count} showThumbnails={showThumbnails} />
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          Failed to load recent posts
        </p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No recent posts found</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {posts.map((post) => (
        <RecentPostItem
          key={post._id.toString()}
          post={post}
          showThumbnail={showThumbnails}
          showMeta={showMeta}
        />
      ))}
    </div>
  );
}

// Recent Post Item Component
interface RecentPostItemProps {
  post: IPost;
  showThumbnail: boolean;
  showMeta: boolean;
}

function RecentPostItem({
  post,
  showThumbnail,
  showMeta,
}: RecentPostItemProps) {
  return (
    <article className="group">
      <div className={`flex space-x-3 ${showThumbnail ? "" : "items-start"}`}>
        {/* Thumbnail */}
        {showThumbnail && post.featuredImage && (
          <div className="flex-shrink-0">
            <a href={ThemeHelpers.getPostUrl(post)}>
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-16 h-16 object-cover rounded-md transition-opacity group-hover:opacity-80"
              />
            </a>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium leading-tight mb-1">
            <a
              href={ThemeHelpers.getPostUrl(post)}
              className="text-foreground hover:text-primary transition-colors line-clamp-2"
            >
              {post.title}
            </a>
          </h4>

          {showMeta && (
            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <time dateTime={post.publishedAt?.toISOString()}>
                  {ThemeHelpers.formatRelativeDate(
                    post.publishedAt || post.createdAt,
                  )}
                </time>
              </div>

              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>
                  {ThemeHelpers.formatReadingTime(
                    post.meta?.readingTime ||
                      ThemeHelpers.getReadingTime(post.content),
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// Loading Skeleton
interface RecentPostsSkeletonProps {
  count: number;
  showThumbnails: boolean;
}

function RecentPostsSkeleton({
  count,
  showThumbnails,
}: RecentPostsSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div
            className={`flex space-x-3 ${showThumbnails ? "" : "items-start"}`}
          >
            {showThumbnails && (
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-muted rounded-md" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
