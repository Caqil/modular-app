"use client";

import React, { useState, useEffect } from "react";
import { useThemeSettings } from "../hooks/use-theme-settings";
import Navigation from "./navigation";
import SearchForm from "./search-form";
import { Menu, X, Search } from "lucide-react";

export default function Header() {
  const { settings } = useThemeSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isSticky = settings.header_sticky ?? true;
  const showSearch = settings.show_search_header ?? true;
  const headerLayout = settings.header_layout || "default";

  useEffect(() => {
    if (!isSticky) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isSticky]);

  const headerClasses = `
    w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
    ${isSticky ? "sticky top-0 z-50" : ""}
    ${isScrolled ? "shadow-sm" : ""}
    transition-all duration-200
  `.trim();

  return (
    <header
      className={headerClasses}
      style={{ backgroundColor: settings.header_background_color }}
    >
      <div className="container mx-auto px-4">
        {headerLayout === "centered" ? (
          <CenteredHeaderLayout
            showSearch={showSearch}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
          />
        ) : headerLayout === "minimal" ? (
          <MinimalHeaderLayout />
        ) : (
          <DefaultHeaderLayout
            showSearch={showSearch}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
          />
        )}
      </div>
    </header>
  );
}

// Default Header Layout (Logo left, Menu right)
interface HeaderLayoutProps {
  showSearch: boolean;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
}

function DefaultHeaderLayout({
  showSearch,
  isMenuOpen,
  setIsMenuOpen,
  isSearchOpen,
  setIsSearchOpen,
}: HeaderLayoutProps) {
  return (
    <>
      <div className="flex items-center justify-between h-16">
        {/* Logo */}
        <SiteLogo />

        {/* Desktop Navigation & Actions */}
        <div className="hidden lg:flex items-center space-x-6">
          <Navigation />

          {showSearch && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Toggle search"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-border py-4">
          <Navigation mobile onItemClick={() => setIsMenuOpen(false)} />

          {showSearch && (
            <div className="mt-4 pt-4 border-t border-border">
              <SearchForm placeholder="Search..." />
            </div>
          )}
        </div>
      )}

      {/* Desktop Search Dropdown */}
      {showSearch && isSearchOpen && (
        <div className="hidden lg:block border-t border-border py-4">
          <div className="max-w-md mx-auto">
            <SearchForm
              placeholder="Search..."
              autoFocus
              onSubmit={() => setIsSearchOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

// Centered Header Layout (Logo center, Menu below)
function CenteredHeaderLayout({
  showSearch,
  isMenuOpen,
  setIsMenuOpen,
  isSearchOpen,
  setIsSearchOpen,
}: HeaderLayoutProps) {
  return (
    <>
      <div className="py-4 text-center border-b border-border">
        <SiteLogo centered />
      </div>

      <div className="flex items-center justify-between h-12">
        <div className="flex-1" />

        {/* Desktop Navigation */}
        <div className="hidden lg:block">
          <Navigation />
        </div>

        <div className="flex-1 flex justify-end">
          {showSearch && (
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="hidden lg:block p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle search"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-border py-4">
          <Navigation mobile onItemClick={() => setIsMenuOpen(false)} />

          {showSearch && (
            <div className="mt-4 pt-4 border-t border-border">
              <SearchForm placeholder="Search..." />
            </div>
          )}
        </div>
      )}

      {/* Desktop Search Dropdown */}
      {showSearch && isSearchOpen && (
        <div className="hidden lg:block border-t border-border py-4">
          <div className="max-w-md mx-auto">
            <SearchForm
              placeholder="Search..."
              autoFocus
              onSubmit={() => setIsSearchOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

// Minimal Header Layout (Logo only)
function MinimalHeaderLayout() {
  return (
    <div className="flex items-center justify-center h-16">
      <SiteLogo />
    </div>
  );
}

// Site Logo Component
interface SiteLogoProps {
  centered?: boolean;
}

function SiteLogo({ centered = false }: SiteLogoProps) {
  const { settings } = useThemeSettings();
  const logoUrl = settings.site_logo;
  const logoWidth = settings.logo_width || 200;

  return (
    <div className={`flex items-center ${centered ? "justify-center" : ""}`}>
      <a href="/" className="flex items-center space-x-2">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Site Logo"
            className="h-auto"
            style={{ maxWidth: `${logoWidth}px` }}
          />
        ) : (
          <>
            <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                M
              </span>
            </div>
            <span className="text-xl font-bold">Modular App</span>
          </>
        )}
      </a>
    </div>
  );
}
