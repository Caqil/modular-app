"use client";

import React from "react";
import { Calendar, User, Edit } from "lucide-react";
import { ThemeHelpers } from "../..";
import { IPage } from "@modular-app/core";

interface PageSingleProps {
  page: IPage;
  showMeta?: boolean;
  showEditLink?: boolean;
}

export default function PageSingle({
  page,
  showMeta = false,
  showEditLink = false,
}: PageSingleProps) {
  return (
    <article className="prose prose-lg max-w-none">
      {/* Page Header */}
      <header className="mb-8 not-prose">
        {/* Title */}
        <h1 className="text-4xl font-bold leading-tight mb-4">{page.title}</h1>

        {/* Page Meta */}
        {showMeta && (
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
            {/* Author */}
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>
                By{" "}
                <a
                  href={ThemeHelpers.getAuthorUrl(page.author.toString())}
                  className="text-foreground hover:text-primary"
                >
                  {/* This would be populated author name */}
                  Author Name
                </a>
              </span>
            </div>

            {/* Last Updated */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>
                Last updated:{" "}
                <time dateTime={page.updatedAt.toISOString()}>
                  {ThemeHelpers.formatDate(page.updatedAt)}
                </time>
              </span>
            </div>

            {/* Edit Link */}
            {showEditLink && (
              <div className="flex items-center space-x-2">
                <Edit className="h-4 w-4" />
                <a
                  href={`/admin/pages/${page._id}/edit`}
                  className="text-primary hover:text-primary/80"
                >
                  Edit Page
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Page Content */}
      <div
        className="prose-content"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />

      {/* Page Footer */}
      <footer className="mt-12 not-prose">
        {/* Last Modified Info */}
        <div className="text-sm text-muted-foreground border-t border-border pt-6">
          <p>
            This page was last modified on{" "}
            <time dateTime={page.updatedAt.toISOString()}>
              {ThemeHelpers.formatDate(page.updatedAt, "PPP")}
            </time>
            .
          </p>
        </div>
      </footer>
    </article>
  );
}
