import slugify from 'slugify';

export interface SlugOptions {
  replacement?: string;
  lower?: boolean;
  strict?: boolean;
  locale?: string;
  trim?: boolean;
  maxLength?: number;
  suffix?: string;
  prefix?: string;
}

export class SlugGenerator {
  private static readonly DEFAULT_OPTIONS: SlugOptions = {
    replacement: '-',
    lower: true,
    strict: true,
    trim: true,
    maxLength: 200,
  };

  /**
   * Generate a URL-friendly slug from text
   */
  static generate(text: string, options: SlugOptions = {}): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const config = { ...this.DEFAULT_OPTIONS, ...options };
    
    // First pass: basic slugify
    const slugifyOptions: {
      replacement: string;
      lower: boolean;
      strict: boolean;
      trim: boolean;
      locale?: string;
    } = {
      replacement: config.replacement!,
      lower: config.lower!,
      strict: config.strict!,
      trim: config.trim!,
    };
    if (config.locale) {
      slugifyOptions.locale = config.locale;
    }
    let slug = slugify(text, slugifyOptions);

    // Add prefix if specified
    if (config.prefix) {
      slug = `${config.prefix}${config.replacement}${slug}`;
    }

    // Add suffix if specified
    if (config.suffix) {
      slug = `${slug}${config.replacement}${config.suffix}`;
    }

    // Limit length
    if (config.maxLength && slug.length > config.maxLength) {
      slug = slug.substring(0, config.maxLength);
      // Remove trailing separator
      slug = slug.replace(new RegExp(`${config.replacement}+$`), '');
    }

    // Ensure slug doesn't start or end with separator
    slug = slug.replace(new RegExp(`^${config.replacement}+|${config.replacement}+$`, 'g'), '');

    return slug || 'untitled';
  }

  /**
   * Generate unique slug by checking against existing slugs
   */
  static async generateUnique(
    text: string,
    checkExists: (slug: string) => Promise<boolean>,
    options: SlugOptions = {}
  ): Promise<string> {
    const baseSlug = this.generate(text, options);
    let slug = baseSlug;
    let counter = 1;

    while (await checkExists(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      
      // Prevent infinite loops
      if (counter > 1000) {
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    return slug;
  }

  /**
   * Generate slug from title for posts/pages
   */
  static forContent(title: string): string {
    return this.generate(title, {
      maxLength: 150,
      strict: true,
    });
  }

  /**
   * Generate slug for categories/tags
   */
  static forTaxonomy(name: string): string {
    return this.generate(name, {
      maxLength: 100,
      strict: true,
    });
  }

  /**
   * Generate slug for usernames
   */
  static forUsername(name: string): string {
    return this.generate(name, {
      maxLength: 30,
      strict: true,
      replacement: '',
    }).replace(/[^a-z0-9]/g, '');
  }

  /**
   * Generate slug for filenames
   */
  static forFilename(filename: string): string {
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    const slug = this.generate(nameWithoutExt, {
      maxLength: 100,
      strict: true,
    });

    return extension ? `${slug}.${extension.toLowerCase()}` : slug;
  }

  /**
   * Generate slug from URL path
   */
  static fromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/').filter(segment => segment.length > 0);
      
      if (segments.length === 0) {
        return 'home';
      }
      
      return segments[segments.length - 1] ?? 'home';
    } catch {
      return this.generate(url);
    }
  }

  /**
   * Validate if string is a valid slug
   */
  static isValid(slug: string): boolean {
    if (!slug || typeof slug !== 'string') {
      return false;
    }

    // Check if slug matches expected pattern
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugPattern.test(slug) && slug.length <= 200;
  }

  /**
   * Clean existing slug
   */
  static clean(slug: string): string {
    if (!slug || typeof slug !== 'string') {
      return '';
    }

    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Generate breadcrumb-style slug from path
   */
  static fromPath(path: string, separator: string = '/'): string[] {
    if (!path || typeof path !== 'string') {
      return [];
    }

    return path
      .split(separator)
      .filter(segment => segment.length > 0)
      .map(segment => this.generate(segment));
  }

  /**
   * Generate slug with timestamp for uniqueness
   */
  static withTimestamp(text: string, options: SlugOptions = {}): string {
    const baseSlug = this.generate(text, options);
    const timestamp = Date.now().toString(36); // Base36 for shorter string
    
    return `${baseSlug}-${timestamp}`;
  }

  /**
   * Generate random slug
   */
  static random(length: number = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Convert camelCase to slug
   */
  static fromCamelCase(camelCase: string): string {
    return camelCase
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }

  /**
   * Convert slug to title case
   */
  static toTitle(slug: string): string {
    if (!slug || typeof slug !== 'string') {
      return '';
    }

    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}