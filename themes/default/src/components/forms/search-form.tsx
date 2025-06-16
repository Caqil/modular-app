"use client";

import React, { useState } from "react";
import { Search, X } from "lucide-react";

interface SearchFormProps {
  initialQuery?: string;
  placeholder?: string;
  showButton?: boolean;
  autoFocus?: boolean;
  onSubmit?: (query: string) => void;
  className?: string;
}

export default function SearchForm({
  initialQuery = "",
  placeholder = "Search...",
  showButton = false,
  autoFocus = false,
  onSubmit,
  className = "",
}: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSubmit) {
        onSubmit(query.trim());
      } else {
        window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
      }
    }
  };

  const handleClear = () => {
    setQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div
        className={`relative flex items-center ${showButton ? "rounded-l-md" : "rounded-md"} border border-border bg-background transition-colors ${isFocused ? "ring-2 ring-primary border-transparent" : ""}`}
      >
        <div className="absolute left-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-10 py-2 bg-transparent focus:outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showButton && (
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-r-md border border-primary hover:bg-primary/90 transition-colors"
        >
          Search
        </button>
      )}
    </form>
  );
}
