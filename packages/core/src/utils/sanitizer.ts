import DOMPurify from 'isomorphic-dompurify';

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripTags?: boolean;
  maxLength?: number;
  preserveNewlines?: boolean;
}

export class Sanitizer {
  private static readonly DEFAULT_ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'a', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
    'img', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
  ];

  private static readonly DEFAULT_ALLOWED_ATTRIBUTES = {
    a: ['href', 'title', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    blockquote: ['cite'],
    '*': ['class', 'id']
  };

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(
    html: string, 
    options: SanitizeOptions = {}
  ): string {
    if (!html || typeof html !== 'string') return '';

    const config = {
      ALLOWED_TAGS: options.allowedTags || this.DEFAULT_ALLOWED_TAGS,
      ALLOWED_ATTR: Object.keys(options.allowedAttributes || this.DEFAULT_ALLOWED_ATTRIBUTES).reduce<string[]>(
        (attrs, tag) => attrs.concat((options.allowedAttributes || this.DEFAULT_ALLOWED_ATTRIBUTES)[tag]), 
        []
      ),
      KEEP_CONTENT: true,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SANITIZE_DOM: true,
    };

    let sanitized = DOMPurify.sanitize(html, config);

    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitize plain text
   */
  static sanitizeText(
    text: string,
    options: SanitizeOptions = {}
  ): string {
    if (!text || typeof text !== 'string') return '';

    let sanitized = text;

    // Remove HTML tags if stripTags is true
    if (options.stripTags !== false) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Decode HTML entities
    sanitized = this.decodeHtmlEntities(sanitized);

    // Normalize whitespace
    if (!options.preserveNewlines) {
      sanitized = sanitized.replace(/\s+/g, ' ').trim();
    } else {
      sanitized = sanitized.replace(/[ \t]+/g, ' ').trim();
    }

    // Limit length
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength).trim();
      // Add ellipsis if truncated
      if (sanitized.length === options.maxLength) {
        sanitized += '...';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return '';
    
    return email
      .toLowerCase()
      .trim()
      .replace(/[^\w@.-]/g, '');
  }

  /**
   * Sanitize URL
   */
  static sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') return '';

    // Remove dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'onload='];
    const lowerUrl = url.toLowerCase();
    
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.includes(protocol)) {
        return '';
      }
    }

    // Ensure URL starts with valid protocol
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
      url = 'http://' + url;
    }

    return url.trim();
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') return '';

    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  /**
   * Sanitize slug
   */
  static sanitizeSlug(slug: string): string {
    if (!slug || typeof slug !== 'string') return '';

    return slug
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Sanitize username
   */
  static sanitizeUsername(username: string): string {
    if (!username || typeof username !== 'string') return '';

    return username
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/[_-]{2,}/g, '_')
      .replace(/^[_-]+|[_-]+$/g, '');
  }

  /**
   * Sanitize phone number
   */
  static sanitizePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') return '';

    return phone.replace(/[^\d+()-\s]/g, '').trim();
  }

  /**
   * Sanitize database input (prevent NoSQL injection)
   */
  static sanitizeDbInput(input: any): any {
    if (typeof input === 'string') {
      // Remove MongoDB operators
      return input.replace(/^\$/, '');
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeDbInput(item));
    }
    
    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const key in input) {
        if (input.hasOwnProperty(key) && !key.startsWith('$')) {
          sanitized[key] = this.sanitizeDbInput(input[key]);
        }
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Escape special characters for regex
   */
  static escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Remove null bytes
   */
  static removeNullBytes(input: string): string {
    return input.replace(/\0/g, '');
  }

  /**
   * Decode HTML entities
   */
  private static decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x2F;': '/',
      '&#x60;': '`',
      '&#x3D;': '='
    };

    return text.replace(/&[#\w]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  }

  /**
   * Sanitize JSON input
   */
  static sanitizeJson(jsonString: string): any {
    try {
      const parsed = JSON.parse(jsonString);
      return this.sanitizeDbInput(parsed);
    } catch (error) {
      return null;
    }
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') return '';

    return query
      .trim()
      .replace(/[<>(){}[\]]/g, '')
      .replace(/\s+/g, ' ')
      .substring(0, 100); // Limit search query length
  }

  /**
   * Sanitize CSS
   */
  static sanitizeCss(css: string): string {
    if (!css || typeof css !== 'string') return '';

    // Remove dangerous CSS properties and values
    const dangerousPatterns = [
      /javascript:/gi,
      /expression\s*\(/gi,
      /@import/gi,
      /behavior\s*:/gi,
      /-moz-binding/gi,
      /url\s*\(\s*["']?\s*javascript:/gi
    ];

    let sanitized = css;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }
}
