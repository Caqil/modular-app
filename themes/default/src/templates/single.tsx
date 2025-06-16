"use client";

import React from "react";
import { IPost, IComment } from "@modular-app/core/database/models";
import { useThemeSettings } from "../hooks/use-theme-settings";
import Header from "../components/header";
import Footer from "../components/footer";
import Sidebar from "../components/sidebar";
import PostSingle from "../components/post-single";
import CommentForm from "../components/comment-form";
import ContentArea from "../components/content-area";
import ThemeHelpers from "../theme-helpers";

interface SingleTemplateProps {
  post: IPost;
  comments?: IComment[];
  relatedPosts?: IPost[];
  nextPost?: IPost;
  prevPost?: IPost;
}

export default function SingleTemplate({
  post,
  comments = [],
  relatedPosts = [],
  nextPost,
  prevPost,
}: SingleTemplateProps) {
  const { settings } = useThemeSettings();
  const sidebarPosition = settings.sidebar_position || "right";
  const showSidebar = sidebarPosition !== "none";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            {ThemeHelpers.generateBreadcrumbs(post).map(
              (crumb, index, array) => (
                <li key={index} className="flex items-center">
                  {crumb.url ? (
                    <a href={crumb.url} className="hover:text-primary">
                      {crumb.title}
                    </a>
                  ) : (
                    <span className="text-foreground">{crumb.title}</span>
                  )}
                  {index < array.length - 1 && <span className="mx-2">/</span>}
                </li>
              ),
            )}
          </ol>
        </nav>

        {/* Main Content Area */}
        <div
          className={`grid gap-8 ${showSidebar ? "lg:grid-cols-12" : "lg:grid-cols-1"}`}
        >
          {/* Post Content */}
          <div className={showSidebar ? "lg:col-span-8" : "lg:col-span-12"}>
            <article className="mb-12">
              <PostSingle post={post} />
            </article>

            {/* Author Bio */}
            {settings.show_author_bio && post.author && (
              <section className="mb-12">
                <AuthorBio author={post.author} />
              </section>
            )}

            {/* Post Navigation */}
            {settings.show_post_navigation && (nextPost || prevPost) && (
              <nav className="mb-12" aria-label="Post navigation">
                <PostNavigation nextPost={nextPost} prevPost={prevPost} />
              </nav>
            )}

            {/* Related Posts */}
            {settings.show_related_posts && relatedPosts.length > 0 && (
              <section className="mb-12">
                <RelatedPosts
                  posts={relatedPosts.slice(
                    0,
                    settings.related_posts_count || 3,
                  )}
                />
              </section>
            )}

            {/* Comments Section */}
            {settings.enable_comments && (
              <section id="comments">
                <CommentSection post={post} comments={comments} />
              </section>
            )}
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

// Author Bio Component
interface AuthorBioProps {
  author: any; // This would be the populated author object
}

function AuthorBio({ author }: AuthorBioProps) {
  return (
    <div className="border-t border-b border-border py-8">
      <div className="flex items-start space-x-4">
        {author.avatar && (
          <img
            src={author.avatar}
            alt={author.name}
            className="h-16 w-16 rounded-full object-cover"
          />
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">About {author.name}</h3>
          {author.bio && (
            <p className="text-muted-foreground mb-3">{author.bio}</p>
          )}
          <div className="flex space-x-4">
            {author.website && (
              <a
                href={author.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Website
              </a>
            )}
            {author.social?.twitter && (
              <a
                href={`https://twitter.com/${author.social.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Twitter
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Post Navigation Component
interface PostNavigationProps {
  nextPost?: IPost;
  prevPost?: IPost;
}

function PostNavigation({ nextPost, prevPost }: PostNavigationProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-border py-8">
      {prevPost && (
        <div className="group">
          <p className="text-sm text-muted-foreground mb-2">Previous Post</p>
          <a
            href={ThemeHelpers.getPostUrl(prevPost)}
            className="block group-hover:text-primary"
          >
            <h4 className="font-medium line-clamp-2">{prevPost.title}</h4>
          </a>
        </div>
      )}

      {nextPost && (
        <div className="group md:text-right">
          <p className="text-sm text-muted-foreground mb-2">Next Post</p>
          <a
            href={ThemeHelpers.getPostUrl(nextPost)}
            className="block group-hover:text-primary"
          >
            <h4 className="font-medium line-clamp-2">{nextPost.title}</h4>
          </a>
        </div>
      )}
    </div>
  );
}

// Related Posts Component
interface RelatedPostsProps {
  posts: IPost[];
}

function RelatedPosts({ posts }: RelatedPostsProps) {
  return (
    <div className="border-t border-border pt-8">
      <h3 className="text-2xl font-bold mb-6">Related Posts</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <article key={post._id.toString()} className="group">
            {post.featuredImage && (
              <div className="aspect-video mb-3 overflow-hidden rounded-lg">
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            )}
            <h4 className="font-semibold mb-2">
              <a
                href={ThemeHelpers.getPostUrl(post)}
                className="group-hover:text-primary line-clamp-2"
              >
                {post.title}
              </a>
            </h4>
            <p className="text-sm text-muted-foreground">
              {ThemeHelpers.formatDate(post.publishedAt || post.createdAt)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

// Comments Section Component
interface CommentSectionProps {
  post: IPost;
  comments: IComment[];
}

function CommentSection({ post, comments }: CommentSectionProps) {
  return (
    <div className="border-t border-border pt-8">
      <h3 className="text-2xl font-bold mb-6">
        {ThemeHelpers.formatCommentsCount(comments.length)}
      </h3>

      {/* Comments List */}
      {comments.length > 0 && (
        <div className="mb-8 space-y-6">
          {comments.map((comment) => (
            <CommentItem key={comment._id.toString()} comment={comment} />
          ))}
        </div>
      )}

      {/* Comment Form */}
      <CommentForm postId={post._id.toString()} />
    </div>
  );
}

// Comment Item Component
interface CommentItemProps {
  comment: IComment;
}

function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className="flex space-x-4">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <span className="text-sm font-medium">
          {comment.author.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <h4 className="font-medium">{comment.author.name}</h4>
          <span className="text-sm text-muted-foreground">
            {ThemeHelpers.formatRelativeDate(comment.createdAt)}
          </span>
        </div>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: comment.content }}
        />
      </div>
    </div>
  );
}
