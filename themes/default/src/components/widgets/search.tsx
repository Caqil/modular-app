"use client";

import { IPost } from "@modular-app/core";
import React, { useState } from "react";
import { ContentArea, Footer, Header, PostList, SearchForm, Sidebar, useThemeSettings } from "../..";

interface SearchTemplateProps {
  posts: IPost[];
  query: string;
  totalResults: number;
  currentPage: number;
  totalPages: number;
  searchTime?: number;
  suggestions?: string[];
}

export default function SearchTemplate({
  posts,
  query,
  totalResults,
  currentPage,
  totalPages,
  searchTime = 0,
  suggestions = [],
}: SearchTemplateProps) {
  const { settings } = useThemeSettings();
  const sidebarPosition = settings.sidebar_position || "right";
  const showSidebar = sidebarPosition !== "none";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <header className="mb-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Search Results</h1>

            {/* Search Form */}
            <div className="mb-6">
              <SearchForm initialQuery={query} showButton={true} />
            </div>

            {/* Search Stats */}
            {query && (
              <div className="text-muted-foreground">
                {totalResults === 0 ? (
                  <p>
                    No results found for "<strong>{query}</strong>"
                  </p>
                ) : (
                  <p>
                    Found <strong>{totalResults}</strong> result
                    {totalResults !== 1 ? "s" : ""} for "
                    <strong>{query}</strong>"
                    {searchTime > 0 && ` (${searchTime.toFixed(2)}s)`}
                  </p>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <div
          className={`grid gap-8 ${showSidebar ? "lg:grid-cols-12" : "lg:grid-cols-1"}`}
        >
          {/* Search Results */}
          <div className={showSidebar ? "lg:col-span-8" : "lg:col-span-12"}>
            <ContentArea>
              {posts.length > 0 ? (
                <>
                  <PostList
                    posts={posts}
                    layout="list" // Force list layout for search results
                    showExcerpt={true}
                    showMeta={settings.show_post_meta}
                    showFeaturedImage={settings.show_featured_image}
                    showReadMore={settings.show_read_more}
                    highlightQuery={query}
                  />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-12">
                      <SearchPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        query={query}
                      />
                    </div>
                  )}
                </>
              ) : query ? (
                <NoResults query={query} suggestions={suggestions} />
              ) : (
                <EmptySearch />
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

// Search Pagination Component
interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  query: string;
}

function SearchPagination({
  currentPage,
  totalPages,
  query,
}: SearchPaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const searchParams = new URLSearchParams({ q: query });

  return (
    <nav className="flex items-center justify-center space-x-2">
      {currentPage > 1 && (
        <a
          href={`/search?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: (currentPage - 1).toString() }).toString()}`}
          className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          Previous
        </a>
      )}

      {pages.map((page) => {
        const pageParams = new URLSearchParams({
          ...Object.fromEntries(searchParams),
        });
        if (page > 1) pageParams.set("page", page.toString());

        return (
          <a
            key={page}
            href={`/search?${pageParams.toString()}`}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              page === currentPage
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            {page}
          </a>
        );
      })}

      {currentPage < totalPages && (
        <a
          href={`/search?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: (currentPage + 1).toString() }).toString()}`}
          className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          Next
        </a>
      )}
    </nav>
  );
}

// No Results Component
interface NoResultsProps {
  query: string;
  suggestions: string[];
}

function NoResults({ query, suggestions }: NoResultsProps) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
      <p className="text-muted-foreground mb-6">
        We couldn't find any posts matching "<strong>{query}</strong>".
      </p>

      {/* Search Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">Did you mean:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <a
                key={suggestion}
                href={`/search?q=${encodeURIComponent(suggestion)}`}
                className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {suggestion}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Search Tips */}
      <div className="max-w-md mx-auto text-left bg-muted p-4 rounded-lg">
        <h4 className="font-medium mb-2">Search Tips:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Check your spelling</li>
          <li>• Try different keywords</li>
          <li>• Use more general terms</li>
          <li>• Try searching by category or tag</li>
        </ul>
      </div>

      <div className="mt-6">
        <a
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}

// Empty Search Component
function EmptySearch() {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold mb-2">Start Your Search</h3>
      <p className="text-muted-foreground mb-6">
        Enter keywords above to search through our content.
      </p>

      {/* Popular Searches or Categories could go here */}
      <div className="max-w-md mx-auto">
        <h4 className="font-medium mb-3">Popular Categories:</h4>
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href="/category/technology"
            className="px-3 py-1 bg-muted rounded-full text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Technology
          </a>
          <a
            href="/category/design"
            className="px-3 py-1 bg-muted rounded-full text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Design
          </a>
          <a
            href="/category/business"
            className="px-3 py-1 bg-muted rounded-full text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Business
          </a>
        </div>
      </div>
    </div>
  );
}
