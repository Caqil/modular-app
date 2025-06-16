"use client";

import React, { useState, useEffect } from "react";
import { ICategory } from "@modular-app/core";
import { ThemeHelpers } from "../..";
import { ChevronRight, Folder } from "lucide-react";

interface CategoriesProps {
  showCounts?: boolean;
  showHierarchy?: boolean;
  limit?: number;
  className?: string;
}

export default function Categories({
  showCounts = true,
  showHierarchy = true,
  limit,
  className = "",
}: CategoriesProps) {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [limit]);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (limit) params.append("limit", limit.toString());
      params.append("sort", "-count");

      const response = await fetch(`/api/categories?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching categories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <CategoriesSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          Failed to load categories
        </p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No categories found</p>
      </div>
    );
  }

  // Organize categories by hierarchy if needed
  const organizedCategories = showHierarchy
    ? organizeHierarchy(categories)
    : categories;

  return (
    <div className={className}>
      {showHierarchy ? (
        <CategoryTree
          categories={organizedCategories}
          showCounts={showCounts}
        />
      ) : (
        <CategoryList categories={categories} showCounts={showCounts} />
      )}
    </div>
  );
}

// Category List Component (Flat list)
interface CategoryListProps {
  categories: ICategory[];
  showCounts: boolean;
}

function CategoryList({ categories, showCounts }: CategoryListProps) {
  return (
    <ul className="space-y-2">
      {categories.map((category) => (
        <CategoryItem
          key={category._id.toString()}
          category={category}
          showCounts={showCounts}
        />
      ))}
    </ul>
  );
}

// Category Tree Component (Hierarchical)
interface CategoryTreeProps {
  categories: CategoryNode[];
  showCounts: boolean;
  level?: number;
}

interface CategoryNode extends ICategory {
  children?: CategoryNode[];
}

function CategoryTree({
  categories,
  showCounts,
  level = 0,
}: CategoryTreeProps) {
  return (
    <ul className={`space-y-1 ${level > 0 ? "ml-4 mt-2" : ""}`}>
      {categories.map((category) => (
        <li key={category._id.toString()}>
          <CategoryItem
            category={category}
            showCounts={showCounts}
            level={level}
          />
          {category.children && category.children.length > 0 && (
            <CategoryTree
              categories={category.children}
              showCounts={showCounts}
              level={level + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

// Category Item Component
interface CategoryItemProps {
  category: ICategory;
  showCounts: boolean;
  level?: number;
}

function CategoryItem({ category, showCounts, level = 0 }: CategoryItemProps) {
  return (
    <div className="flex items-center justify-between group">
      <a
        href={ThemeHelpers.getCategoryUrl(category)}
        className="flex items-center space-x-2 text-sm hover:text-primary transition-colors flex-1"
      >
        {level > 0 && (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <Folder className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
        <span>{category.name}</span>
      </a>

      {showCounts && category.count > 0 && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {category.count}
        </span>
      )}
    </div>
  );
}

// Organize categories into hierarchy
function organizeHierarchy(categories: ICategory[]): CategoryNode[] {
  const categoryMap = new Map<string, CategoryNode>();
  const rootCategories: CategoryNode[] = [];

  // Create a map of all categories
  categories.forEach((category) => {
    categoryMap.set(category._id.toString(), { ...category, children: [] });
  });

  // Organize into hierarchy
  categories.forEach((category) => {
    const categoryNode = categoryMap.get(category.slug.toString())!;

    if (category.parentId) {
      const parent = categoryMap.get(category.parentId.toString());
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(categoryNode);
      } else {
        // Parent not found, treat as root
        rootCategories.push(categoryNode);
      }
    } else {
      rootCategories.push(categoryNode);
    }
  });

  return rootCategories;
}

// Loading Skeleton
function CategoriesSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-20" />
            </div>
            <div className="w-6 h-4 bg-muted rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
