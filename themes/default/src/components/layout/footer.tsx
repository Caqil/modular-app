"use client";

import React from "react";
import { useThemeSettings } from "../hooks/use-theme-settings";
import { Heart } from "lucide-react";

export default function Footer() {
  const { settings } = useThemeSettings();
  const footerLayout = settings.footer_layout || "three-columns";
  const showCopyright = settings.show_footer_copyright ?? true;
  const customCopyright = settings.footer_copyright_text;

  const footerStyle = {
    backgroundColor: settings.footer_background_color,
    color: settings.footer_text_color,
  };

  return (
    <footer className="border-t border-border" style={footerStyle}>
      <div className="container mx-auto px-4">
        {/* Widget Areas */}
        {footerLayout !== "none" && (
          <div className="py-12">
            <FooterWidgets layout={footerLayout} />
          </div>
        )}

        {/* Copyright Bar */}
        {showCopyright && (
          <div className="border-t border-border/20 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <CopyrightNotice customText={customCopyright} />
              <FooterLinks />
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}

// Footer Widgets Component
interface FooterWidgetsProps {
  layout: string;
}

function FooterWidgets({ layout }: FooterWidgetsProps) {
  const getGridCols = () => {
    switch (layout) {
      case "one-column":
        return "grid-cols-1";
      case "two-columns":
        return "grid-cols-1 md:grid-cols-2";
      case "three-columns":
        return "grid-cols-1 md:grid-cols-3";
      case "four-columns":
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
      default:
        return "grid-cols-1 md:grid-cols-3";
    }
  };

  return (
    <div className={`grid gap-8 ${getGridCols()}`}>
      <FooterWidget
        title="About"
        content={
          <div className="space-y-4">
            <p className="text-sm leading-relaxed opacity-80">
              Modular App is a modern content management system built with
              cutting-edge web technologies. Create beautiful, fast, and secure
              websites with ease.
            </p>
            <div className="flex space-x-4">
              <SocialLink href="#" platform="twitter" />
              <SocialLink href="#" platform="facebook" />
              <SocialLink href="#" platform="linkedin" />
              <SocialLink href="#" platform="github" />
            </div>
          </div>
        }
      />

      <FooterWidget
        title="Quick Links"
        content={
          <nav className="space-y-2">
            <FooterNavLink href="/">Home</FooterNavLink>
            <FooterNavLink href="/blog">Blog</FooterNavLink>
            <FooterNavLink href="/about">About</FooterNavLink>
            <FooterNavLink href="/contact">Contact</FooterNavLink>
            <FooterNavLink href="/privacy">Privacy Policy</FooterNavLink>
            <FooterNavLink href="/terms">Terms of Service</FooterNavLink>
          </nav>
        }
      />

      {layout !== "two-columns" && (
        <FooterWidget title="Recent Posts" content={<RecentPostsWidget />} />
      )}

      {layout === "four-columns" && (
        <FooterWidget title="Newsletter" content={<NewsletterWidget />} />
      )}
    </div>
  );
}

// Footer Widget Component
interface FooterWidgetProps {
  title: string;
  content: React.ReactNode;
}

function FooterWidget({ title, content }: FooterWidgetProps) {
  return (
    <div>
      <h4 className="text-base font-medium mb-4">{title}</h4>
      {content}
    </div>
  );
}

// Footer Navigation Link
interface FooterNavLinkProps {
  href: string;
  children: React.ReactNode;
}

function FooterNavLink({ href, children }: FooterNavLinkProps) {
  return (
    <a
      href={href}
      className="block text-sm opacity-80 hover:opacity-100 transition-opacity"
    >
      {children}
    </a>
  );
}

// Social Link Component
interface SocialLinkProps {
  href: string;
  platform: string;
}

function SocialLink({ href, platform }: SocialLinkProps) {
  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "twitter":
        return "𝕏";
      case "facebook":
        return "📘";
      case "linkedin":
        return "💼";
      case "github":
        return "📚";
      default:
        return "🔗";
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-8 h-8 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 transition-colors"
      aria-label={`Follow on ${platform}`}
    >
      <span className="text-sm">{getSocialIcon(platform)}</span>
    </a>
  );
}

// Recent Posts Widget
function RecentPostsWidget() {
  // This would typically fetch recent posts from an API
  const recentPosts = [
    {
      title: "Getting Started with Modular App",
      slug: "getting-started",
      date: "2024-01-15",
    },
    {
      title: "Building Custom Themes",
      slug: "building-themes",
      date: "2024-01-10",
    },
    {
      title: "Plugin Development Guide",
      slug: "plugin-development",
      date: "2024-01-05",
    },
  ];

  return (
    <div className="space-y-3">
      {recentPosts.map((post) => (
        <article key={post.slug}>
          <h5 className="text-sm font-medium mb-1">
            <a
              href={`/posts/${post.slug}`}
              className="hover:opacity-80 transition-opacity"
            >
              {post.title}
            </a>
          </h5>
          <time className="text-xs opacity-60">
            {new Date(post.date).toLocaleDateString()}
          </time>
        </article>
      ))}
    </div>
  );
}

// Newsletter Widget
function NewsletterWidget() {
  return (
    <div className="space-y-4">
      <p className="text-sm opacity-80">
        Subscribe to our newsletter for updates and tips.
      </p>
      <form className="space-y-2">
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
        />
        <button
          type="submit"
          className="w-full px-3 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-white/90 transition-colors"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
}

// Copyright Notice
interface CopyrightNoticeProps {
  customText?: string;
}

function CopyrightNotice({ customText }: CopyrightNoticeProps) {
  const currentYear = new Date().getFullYear();

  const defaultText = `© ${currentYear} Modular App. All rights reserved.`;

  return (
    <div className="flex items-center space-x-2 text-sm opacity-80">
      <span>{customText || defaultText}</span>
      <span>•</span>
      <span className="flex items-center space-x-1">
        <span>Made with</span>
        <Heart className="h-3 w-3 text-red-500" />
        <span>by Modular App</span>
      </span>
    </div>
  );
}

// Footer Links
function FooterLinks() {
  return (
    <nav className="flex items-center space-x-6">
      <a
        href="/privacy"
        className="text-sm opacity-80 hover:opacity-100 transition-opacity"
      >
        Privacy
      </a>
      <a
        href="/terms"
        className="text-sm opacity-80 hover:opacity-100 transition-opacity"
      >
        Terms
      </a>
      <a
        href="/contact"
        className="text-sm opacity-80 hover:opacity-100 transition-opacity"
      >
        Contact
      </a>
    </nav>
  );
}
