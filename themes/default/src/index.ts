export { DefaultTheme } from './theme';
export { default as ThemeHelpers } from './theme-helpers';
export { useThemeSettings } from './hooks/use-theme-settings';
export { useCustomization } from './hooks/use-customization';

// Component exports
export { default as Header } from './components/header';
export { default as Footer } from './components/footer';
export { default as Navigation } from './components/navigation';
export { default as Sidebar } from './components/sidebar';
export { default as SearchForm } from './components/search-form';
export { default as CommentForm } from './components/comment-form';
export { default as PostSingle } from './components/post-single';
export { default as PostList } from './components/post-list';
export { default as PageSingle } from './components/page-single';
export { default as ContentArea } from './components/content-area';

// Widget exports
export { default as RecentPosts } from './widgets/recent-posts';
export { default as Categories } from './widgets/categories';
export { default as Tags } from './widgets/tags';

// Template exports
export { default as HomePage } from './templates/home';
export { default as SingleTemplate } from './templates/single';
export { default as PageTemplate } from './templates/page';
export { default as ArchiveTemplate } from './templates/archive';
export { default as SearchTemplate } from './templates/search';
export { default as NotFoundTemplate } from './templates/404';


// Theme configuration
export const themeConfig = {
  name: 'default',
  version: '1.0.0',
  author: 'Modular App Team',
  description: 'A clean, modern theme for Modular App CMS',
  supports: [
    'custom-logo',
    'custom-colors',
    'custom-fonts',
    'menus',
    'widgets',
    'post-thumbnails',
    'responsive',
    'dark-mode',
    'accessibility',
  ],
};
```

## themes/default/src/theme-helpers.ts
```typescript
import { IPost, IPage, ICategory, ITag, IComment } from '@modular-app/core/database/models';
import { ContentStatus } from '@modular-app/core/types/content';
import { format, formatDistanceToNow } from 'date-fns';

export interface ThemeHelpersInterface {
  formatDate(date: Date, formatStr?: string): string;
  formatRelativeDate(date: Date): string;
  getExcerpt(content: string, length?: number): string;
  stripHtml(html: string): string;
  generateSlug(title: string): string;
  getReadingTime(content: string): number;
  formatReadingTime(minutes: number): string;
  isPublished(status: ContentStatus): boolean;
  getPostUrl(post: IPost): string;
  getPageUrl(page: IPage): string;
  getCategoryUrl(category: ICategory): string;
  getTagUrl(tag: ITag): string;
  getAuthorUrl(authorId: string): string;
  getSearchUrl(query: string): string;
  getArchiveUrl(year?: number, month?: number): string;
  sanitizeClassName(input: string): string;
  truncateWords(text: string, wordCount: number): string;
  getMetaDescription(content: string, fallback?: string): string;
  formatCommentsCount(count: number): string;
  isValidEmail(email: string): boolean;
  isValidUrl(url: string): boolean;
  generateBreadcrumbs(currentPage: any): Array<{ title: string; url?: string }>;
  getImageSrcSet(imageUrl: string, sizes: number[]): string;
  optimizeImageUrl(imageUrl: string, width?: number, height?: number, quality?: number): string;
}

class ThemeHelpers implements ThemeHelpersInterface {
  /**
   * Format date with default or custom format
   */
  formatDate(date: Date, formatStr: string = 'MMM dd, yyyy'): string {
    return format(new Date(date), formatStr);
  }

  /**
   * Format relative date (e.g., "2 hours ago")
   */
  formatRelativeDate(date: Date): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  }

  /**
   * Generate excerpt from content
   */
  getExcerpt(content: string, length: number = 150): string {
    const plainText = this.stripHtml(content);
    if (plainText.length <= length) return plainText;
    
    const truncated = plainText.substring(0, length);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    return lastSpaceIndex > 0 
      ? truncated.substring(0, lastSpaceIndex) + '...'
      : truncated + '...';
  }

  /**
   * Strip HTML tags from content
   */
  stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Generate URL-friendly slug
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Calculate reading time in minutes
   */
  getReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const plainText = this.stripHtml(content);
    const wordCount = plainText.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Format reading time for display
   */
  formatReadingTime(minutes: number): string {
    if (minutes < 1) return 'Less than 1 min read';
    if (minutes === 1) return '1 min read';
    return `${minutes} min read`;
  }

  /**
   * Check if content is published
   */
  isPublished(status: ContentStatus): boolean {
    return status === ContentStatus.PUBLISHED;
  }

  /**
   * Generate post URL
   */
  getPostUrl(post: IPost): string {
    return `/posts/${post.slug}`;
  }

  /**
   * Generate page URL
   */
  getPageUrl(page: IPage): string {
    return `/${page.slug}`;
  }

  /**
   * Generate category URL
   */
  getCategoryUrl(category: ICategory): string {
    return `/category/${category.slug}`;
  }

  /**
   * Generate tag URL
   */
  getTagUrl(tag: ITag): string {
    return `/tag/${tag.slug}`;
  }

  /**
   * Generate author URL
   */
  getAuthorUrl(authorId: string): string {
    return `/author/${authorId}`;
  }

  /**
   * Generate search URL
   */
  getSearchUrl(query: string): string {
    return `/search?q=${encodeURIComponent(query)}`;
  }

  /**
   * Generate archive URL
   */
  getArchiveUrl(year?: number, month?: number): string {
    if (year && month) {
      return `/archive/${year}/${month.toString().padStart(2, '0')}`;
    }
    if (year) {
      return `/archive/${year}`;
    }
    return '/archive';
  }

  /**
   * Sanitize class name
   */
  sanitizeClassName(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Truncate text by word count
   */
  truncateWords(text: string, wordCount: number): string {
    const words = text.trim().split(/\s+/);
    if (words.length <= wordCount) return text;
    return words.slice(0, wordCount).join(' ') + '...';
  }

  /**
   * Generate meta description
   */
  getMetaDescription(content: string, fallback: string = ''): string {
    const excerpt = this.getExcerpt(content, 160);
    return excerpt || fallback;
  }

  /**
   * Format comments count
   */
  formatCommentsCount(count: number): string {
    if (count === 0) return 'No comments';
    if (count === 1) return '1 comment';
    return `${count} comments`;
  }

  /**
   * Validate email address
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate breadcrumbs
   */
  generateBreadcrumbs(currentPage: any): Array<{ title: string; url?: string }> {
    const breadcrumbs = [
      { title: 'Home', url: '/' }
    ];

    if (currentPage.type === 'post') {
      breadcrumbs.push({ title: 'Blog', url: '/blog' });
      if (currentPage.categories?.[0]) {
        breadcrumbs.push({
          title: currentPage.categories[0].name,
          url: this.getCategoryUrl(currentPage.categories[0])
        });
      }
      breadcrumbs.push({ title: currentPage.title });
    } else if (currentPage.type === 'page') {
      if (currentPage.parentId) {
        // Add parent pages
        breadcrumbs.push({ title: 'Parent Page', url: '/parent' });
      }
      breadcrumbs.push({ title: currentPage.title });
    } else if (currentPage.type === 'category') {
      breadcrumbs.push({ title: 'Categories', url: '/categories' });
      breadcrumbs.push({ title: currentPage.name });
    } else if (currentPage.type === 'tag') {
      breadcrumbs.push({ title: 'Tags', url: '/tags' });
      breadcrumbs.push({ title: currentPage.name });
    }

    return breadcrumbs;
  }

  /**
   * Generate responsive image srcset
   */
  getImageSrcSet(imageUrl: string, sizes: number[]): string {
    return sizes
      .map(size => `${this.optimizeImageUrl(imageUrl, size)} ${size}w`)
      .join(', ');
  }

  /**
   * Optimize image URL with parameters
   */
  optimizeImageUrl(imageUrl: string, width?: number, height?: number, quality: number = 80): string {
    const url = new URL(imageUrl, window.location.origin);
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    if (quality !== 80) url.searchParams.set('q', quality.toString());
    
    return url.toString();
  }
}

export default new ThemeHelpers();