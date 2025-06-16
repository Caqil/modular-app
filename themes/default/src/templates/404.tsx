"use client";

import React from "react";
import { IPost } from "@modular-app/core/database/models";
import { useThemeSettings } from "../hooks/use-theme-settings";
import Header from "../components/header";
import Footer from "../components/footer";
import SearchForm from "../components/search-form";

interface NotFoundTemplateProps {
  suggestedPosts?: IPost[];
  requestedPath?: string;
}

export default function NotFoundTemplate({
  suggestedPosts = [],
  requestedPath,
}: NotFoundTemplateProps) {
  const { settings } = useThemeSettings();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* 404 Hero */}
          <div className="mb-12">
            <div className="text-8xl font-bold text-muted-foreground mb-4">
              404
            </div>
            <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
            <p className="text-xl text-muted-foreground mb-6">
              The page you're looking for doesn't exist or has been moved.
            </p>

            {requestedPath && (
              <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground mb-6">
                Requested:{" "}
                <code className="bg-background px-2 py-1 rounded">
                  {requestedPath}
                </code>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Try Searching</h2>
            <div className="max-w-md mx-auto">
              <SearchForm
                showButton={true}
                placeholder="Search for content..."
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickActionCard
                title="Home"
                description="Go back to homepage"
                href="/"
                icon="🏠"
              />
              <QuickActionCard
                title="Blog"
                description="Browse latest posts"
                href="/blog"
                icon="📝"
              />
              <QuickActionCard
                title="Categories"
                description="Explore by category"
                href="/categories"
                icon="📁"
              />
              <QuickActionCard
                title="Contact"
                description="Get in touch"
                href="/contact"
                icon="📧"
              />
            </div>
          </div>

          {/* Suggested Posts */}
          {suggestedPosts.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-semibold mb-6">You Might Like</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {suggestedPosts.slice(0, 4).map((post) => (
                  <SuggestedPostCard key={post._id.toString()} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* Error Reporting */}
          <div className="border-t border-border pt-8">
            <h3 className="text-lg font-medium mb-3">Still Need Help?</h3>
            <p className="text-muted-foreground mb-4">
              If you believe this is an error, please let us know.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Report Issue
              </a>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Quick Action Card Component
interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
}: QuickActionCardProps) {
  return (
    <a
      href={href}
      className="group p-4 border border-border rounded-lg hover:shadow-md transition-all hover:border-primary/50"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-medium mb-1 group-hover:text-primary">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </a>
  );
}

// Suggested Post Card Component
interface SuggestedPostCardProps {
  post: IPost;
}

function SuggestedPostCard({ post }: SuggestedPostCardProps) {
  return (
    <article className="group text-left border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {post.featuredImage && (
        <div className="aspect-video overflow-hidden">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold mb-2">
          <a
            href={`/posts/${post.slug}`}
            className="group-hover:text-primary line-clamp-2"
          >
            {post.title}
          </a>
        </h3>
        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.excerpt}
          </p>
        )}
      </div>
    </article>
  );
}
