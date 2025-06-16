import { IPost, IPage, ICategory, ITag, IComment, ContentStatus } from '@modular-app/core';
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
   * Generate URL-friendly slug from title
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
    const wordCount = this.stripHtml(content).split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Format reading time for display
   */
  formatReadingTime(minutes: number): string {
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
    const date = new Date(post.publishedAt || post.createdAt);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `/blog/${year}/${month}/${post.slug}`;
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
    return `/categories/${category.slug}`;
  }

  /**
   * Generate tag URL
   */
  getTagUrl(tag: ITag): string {
    return `/tags/${tag.slug}`;
  }

  /**
   * Generate author URL
   */
  getAuthorUrl(authorId: string): string {
    return `/authors/${authorId}`;
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
   * Sanitize class name for CSS
   */
  sanitizeClassName(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/^[0-9]/, 'n$&')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Truncate text to specified word count
   */
  truncateWords(text: string, wordCount: number): string {
    const words = text.split(/\s+/);
    if (words.length <= wordCount) return text;
    return words.slice(0, wordCount).join(' ') + '...';
  }

  /**
   * Generate meta description from content
   */
  getMetaDescription(content: string, fallback: string = ''): string {
    const plainText = this.stripHtml(content);
    if (plainText.length <= 160) return plainText;
    
    const truncated = plainText.substring(0, 160);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    return lastSpaceIndex > 0 
      ? truncated.substring(0, lastSpaceIndex) + '...'
      : fallback;
  }

  /**
   * Format comments count for display
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
   * Generate breadcrumb navigation
   */
  generateBreadcrumbs(currentPage: any): Array<{ title: string; url?: string }> {
    const breadcrumbs = [{ title: 'Home', url: '/' }];
    
    // Add logic based on page type
    if (currentPage.type === 'post') {
      breadcrumbs.push({ title: 'Blog', url: '/blog' });
      if (currentPage.category) {
        breadcrumbs.push({ 
          title: currentPage.category.name, 
          url: this.getCategoryUrl(currentPage.category) 
        });
      }
    } else if (currentPage.type === 'page' && currentPage.parent) {
      // Add parent pages for hierarchical pages
      breadcrumbs.push({ 
        title: currentPage.parent.title, 
        url: this.getPageUrl(currentPage.parent) 
      });
    }
    
    breadcrumbs.push({ title: currentPage.title, url: currentPage.url || undefined });
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
   * Generate optimized image URL
   */
  optimizeImageUrl(
    imageUrl: string, 
    width?: number, 
    height?: number, 
    quality: number = 80
  ): string {
    const url = new URL(imageUrl, window?.location?.origin || 'http://localhost:3000');
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());
    
    return url.toString();
  }
}

export default new ThemeHelpers();