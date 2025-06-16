"use client";

import React, { useState, useEffect } from "react";
import { ITag } from "@modular-app/core/database/models";
import ThemeHelpers from "../theme-helpers";
import { Tag, Hash } from "lucide-react";

interface TagsProps {
  showCounts?: boolean;
  limit?: number;
  style?: "list" | "cloud";
  minFontSize?: number;
  maxFontSize?: number;
  className?: string;
}

export default function Tags({
  showCounts = true,
  limit = 20,
  style = "cloud",
  minFontSize = 12,
  maxFontSize = 18,
  className = "",
}: TagsProps) {
  const [tags, setTags] = useState<ITag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
  }, [limit]);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (limit) params.append("limit", limit.toString());
      params.append("sort", "-count");

      const response = await fetch(`/api/tags?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch tags");
      }

      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching tags:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <TagsSkeleton style={style} />;
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">Failed to load tags</p>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No tags found</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {style === "cloud" ? (
        <TagCloud
          tags={tags}
          showCounts={showCounts}
          minFontSize={minFontSize}
          maxFontSize={maxFontSize}
        />
      ) : (
        <TagList tags={tags} showCounts={showCounts} />
      )}
    </div>
  );
}

// Tag Cloud Component
interface TagCloudProps {
  tags: ITag[];
  showCounts: boolean;
  minFontSize: number;
  maxFontSize: number;
}

function TagCloud({
  tags,
  showCounts,
  minFontSize,
  maxFontSize,
}: TagCloudProps) {
  // Calculate font sizes based on tag frequency
  const maxCount = Math.max(...tags.map((tag) => tag.count));
  const minCount = Math.min(...tags.map((tag) => tag.count));

  const getFontSize = (count: number) => {
    if (maxCount === minCount) return minFontSize;

    const ratio = (count - minCount) / (maxCount - minCount);
    return minFontSize + (maxFontSize - minFontSize) * ratio;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <a
          key={tag._id.toString()}
          href={ThemeHelpers.getTagUrl(tag)}
          className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          style={{ fontSize: `${getFontSize(tag.count)}px` }}
        >
          <Hash className="h-3 w-3 mr-1" />
          <span>{tag.name}</span>
          {showCounts && (
            <span className="ml-1 text-xs opacity-75">({tag.count})</span>
          )}
        </a>
      ))}
    </div>
  );
}

// Tag List Component
interface TagListProps {
  tags: ITag[];
  showCounts: boolean;
}

function TagList({ tags, showCounts }: TagListProps) {
  return (
    <ul className="space-y-2">
      {tags.map((tag) => (
        <li key={tag._id.toString()}>
          <div className="flex items-center justify-between group">
            <a
              href={ThemeHelpers.getTagUrl(tag)}
              className="flex items-center space-x-2 text-sm hover:text-primary transition-colors flex-1"
            >
              <Tag className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              <span>{tag.name}</span>
            </a>

            {showCounts && tag.count > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {tag.count}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Loading Skeleton
interface TagsSkeletonProps {
  style: string;
}

function TagsSkeleton({ style }: TagsSkeletonProps) {
  if (style === "cloud") {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse h-6 bg-muted rounded-full"
            style={{ width: `${Math.random() * 60 + 40}px` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-16" />
            </div>
            <div className="w-6 h-4 bg-muted rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
