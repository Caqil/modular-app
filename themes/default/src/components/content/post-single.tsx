"use client";

import React from "react";
import { IPost } from "@modular-app/core/database/models";
import { useThemeSettings } from "../hooks/use-theme-settings";
import ThemeHelpers from "../theme-helpers";
import {
  Calendar,
  Clock,
  User,
  Tag,
  Folder,
  Share2,
  Heart,
  Bookmark,
} from "lucide-react";

interface PostSingleProps {
  post: IPost;
  showMeta?: boolean;
  showActions?: boolean;
}

export default function PostSingle({
  post,
  showMeta = true,
  showActions = true,
}: PostSingleProps) {
  const { settings } = useThemeSettings();

  return (
    <article className="prose prose-lg max-w-none">
      {/* Post Header */}
      <header className="mb-8 not-prose">
        {/* Categories */}
        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.categories.map((category: any) => (
              <a
                key={category._id}
                href={ThemeHelpers.getCategoryUrl(category)}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Folder className="h-3 w-3 mr-1" />
                {category.name}
              </a>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl font-bold leading-tight mb-4">{post.title}</h1>

        {/* Post Meta */}
        {showMeta && (
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
            {/* Author */}
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>
                By{" "}
                <a
                  href={ThemeHelpers.getAuthorUrl(post.author.toString())}
                  className="text-foreground hover:text-primary"
                >
                  {/* This would be populated author name */}
                  Author Name
                </a>
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.publishedAt?.toISOString()}>
                {ThemeHelpers.formatDate(post.publishedAt || post.createdAt)}
              </time>
            </div>

            {/* Reading Time */}
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>
                {ThemeHelpers.formatReadingTime(
                  post.meta?.readingTime ||
                    ThemeHelpers.getReadingTime(post.content),
                )}
              </span>
            </div>

            {/* View Count */}
            {post.meta?.viewCount && (
              <div className="flex items-center space-x-2">
                <span>{post.meta.viewCount} views</span>
              </div>
            )}
          </div>
        )}

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="mb-8">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-auto rounded-lg shadow-sm"
            />
          </div>
        )}

        {/* Post Actions */}
        {showActions && (
          <div className="flex items-center justify-between py-4 border-y border-border mb-8">
            <div className="flex items-center space-x-4">
              <PostActionButton
                icon={Heart}
                label="Like"
                count={post.meta?.likeCount}
              />
              <PostActionButton icon={Bookmark} label="Bookmark" />
              <PostActionButton icon={Share2} label="Share" />
            </div>

            <div className="text-sm text-muted-foreground">
              Last updated: {ThemeHelpers.formatDate(post.updatedAt)}
            </div>
          </div>
        )}
      </header>

      {/* Post Content */}
      <div
        className="prose-content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Post Footer */}
      <footer className="mt-12 not-prose">
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-8">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Tagged with:
            </h4>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag: string) => (
                <a
                  key={tag}
                  href={ThemeHelpers.getTagUrl({ slug: tag, name: tag } as any)}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Share Buttons */}
        <div className="border-t border-border pt-8">
          <ShareButtons post={post} />
        </div>
      </footer>
    </article>
  );
}

// Post Action Button Component
interface PostActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  onClick?: () => void;
}

function PostActionButton({
  icon: Icon,
  label,
  count,
  onClick,
}: PostActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs bg-muted px-2 py-1 rounded-full">{count}</span>
      )}
    </button>
  );
}

// Share Buttons Component
interface ShareButtonsProps {
  post: IPost;
}

function ShareButtons({ post }: ShareButtonsProps) {
  const postUrl = `${window.location.origin}${ThemeHelpers.getPostUrl(post)}`;
  const postTitle = post.title;
  const postExcerpt =
    post.excerpt || ThemeHelpers.getExcerpt(post.content, 120);

  const shareLinks = [
    {
      name: "Twitter",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(postTitle)}&url=${encodeURIComponent(postUrl)}`,
      color: "hover:text-blue-500",
    },
    {
      name: "Facebook",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`,
      color: "hover:text-blue-600",
    },
    {
      name: "LinkedIn",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`,
      color: "hover:text-blue-700",
    },
    {
      name: "Email",
      url: `mailto:?subject=${encodeURIComponent(postTitle)}&body=${encodeURIComponent(`${postExcerpt}\n\n${postUrl}`)}`,
      color: "hover:text-gray-600",
    },
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      alert("Link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-3">
        Share this post:
      </h4>
      <div className="flex items-center space-x-4">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground transition-colors ${link.color}`}
          >
            {link.name}
          </a>
        ))}

        <button
          onClick={copyToClipboard}
          className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Copy Link
        </button>
      </div>
    </div>
  );
}
