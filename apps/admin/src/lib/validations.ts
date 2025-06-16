export {
  Validator,
} from '@modular-app/core';

// Admin-specific validation schemas and functions
export const AdminValidations = {
  /**
   * User validation schema
   */
  user: {
    email: {
      required: true,
      type: 'email' as const,
      message: 'Valid email address is required',
    },
    username: {
      required: true,
      type: 'string' as const,
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_-]+$/,
      message: 'Username must be 3-50 characters, letters, numbers, underscore, and hyphen only',
    },
    password: {
      required: true,
      type: 'string' as const,
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      message: 'Password must be at least 8 characters with uppercase, lowercase, and number',
    },
    firstName: {
      type: 'string' as const,
      maxLength: 50,
      message: 'First name must be less than 50 characters',
    },
    lastName: {
      type: 'string' as const,
      maxLength: 50,
      message: 'Last name must be less than 50 characters',
    },
    role: {
      required: true,
      type: 'string' as const,
      enum: ['admin', 'editor', 'author', 'contributor', 'subscriber'],
      message: 'Valid role is required',
    },
  },

  /**
   * Post validation schema
   */
  post: {
    title: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      maxLength: 200,
      message: 'Title is required and must be less than 200 characters',
    },
    content: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      message: 'Content is required',
    },
    excerpt: {
      type: 'string' as const,
      maxLength: 500,
      message: 'Excerpt must be less than 500 characters',
    },
    slug: {
      type: 'string' as const,
      pattern: /^[a-z0-9-]+$/,
      message: 'Slug must be lowercase letters, numbers, and hyphens only',
    },
    status: {
      required: true,
      type: 'string' as const,
      enum: ['draft', 'published', 'scheduled', 'archived'],
      message: 'Valid status is required',
    },
  },

  /**
   * Page validation schema
   */
  page: {
    title: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      maxLength: 200,
      message: 'Title is required and must be less than 200 characters',
    },
    content: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      message: 'Content is required',
    },
    slug: {
      type: 'string' as const,
      pattern: /^[a-z0-9-]+$/,
      message: 'Slug must be lowercase letters, numbers, and hyphens only',
    },
  },

  /**
   * Settings validation schema
   */
  settings: {
    siteName: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      maxLength: 100,
      message: 'Site name is required and must be less than 100 characters',
    },
    siteDescription: {
      type: 'string' as const,
      maxLength: 500,
      message: 'Site description must be less than 500 characters',
    },
    adminEmail: {
      required: true,
      type: 'email' as const,
      message: 'Valid admin email is required',
    },
    language: {
      type: 'string' as const,
      enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja'],
      message: 'Valid language code is required',
    },
    timezone: {
      type: 'string' as const,
      message: 'Valid timezone is required',
    },
  },

  /**
   * File upload validation schema
   */
  fileUpload: {
    file: {
      required: true,
      type: 'file' as const,
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      message: 'Valid image file is required (max 10MB)',
    },
  },

  /**
   * Plugin validation schema
   */
  plugin: {
    name: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      maxLength: 100,
      message: 'Plugin name is required',
    },
    version: {
      required: true,
      type: 'string' as const,
      pattern: /^\d+\.\d+\.\d+$/,
      message: 'Valid semantic version is required (e.g., 1.0.0)',
    },
  },

  /**
   * Validate form data against schema
   */
  validate<T>(data: T, schema: Record<string, any>): {
    isValid: boolean;
    errors: Record<string, string>;
    warnings: Record<string, string>;
  } {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = (data as any)[field];

      // Check required
      if (rules.required && (!value || value.toString().trim() === '')) {
        errors[field] = rules.message || `${field} is required`;
        continue;
      }

      // Skip further validation if field is empty and not required
      if (!value && value !== 0) continue;

      // Type validation
      if (rules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field] = rules.message || 'Invalid email format';
        continue;
      }

      if (rules.type === 'file' && value instanceof File) {
        if (rules.maxSize && value.size > rules.maxSize) {
          errors[field] = `File size must be less than ${this.formatFileSize(rules.maxSize)}`;
          continue;
        }
        if (rules.allowedTypes && !rules.allowedTypes.includes(value.type)) {
          errors[field] = `File type must be one of: ${rules.allowedTypes.join(', ')}`;
          continue;
        }
      }

      // Length validation
      if (rules.minLength && value.toString().length < rules.minLength) {
        errors[field] = rules.message || `Minimum ${rules.minLength} characters required`;
        continue;
      }

      if (rules.maxLength && value.toString().length > rules.maxLength) {
        errors[field] = rules.message || `Maximum ${rules.maxLength} characters allowed`;
        continue;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value.toString())) {
        errors[field] = rules.message || 'Invalid format';
        continue;
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors[field] = rules.message || `Value must be one of: ${rules.enum.join(', ')}`;
        continue;
      }

      // Warnings for weak passwords
      if (field === 'password' && rules.type === 'string') {
        if (value.length < 12) {
          warnings[field] = 'Consider using a longer password for better security';
        }
        if (!/(?=.*[!@#$%^&*])/.test(value)) {
          warnings[field] = 'Consider adding special characters for better security';
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Format file size helper
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * Sanitize input data
   */
  sanitizeInput<T>(data: T, schema: Record<string, any>): T {
    const sanitized = { ...data } as any;

    for (const [field, rules] of Object.entries(schema)) {
      const value = sanitized[field];

      if (!value) continue;

      // Sanitize based on type
      switch (rules.type) {
        case 'string':
          sanitized[field] = value.toString().trim();
          break;
        case 'email':
          sanitized[field] = value.toString().toLowerCase().trim();
          break;
        case 'number':
          sanitized[field] = parseFloat(value);
          break;
        case 'boolean':
          sanitized[field] = Boolean(value);
          break;
      }

      // Apply max length truncation
      if (rules.maxLength && sanitized[field] && sanitized[field].length > rules.maxLength) {
        sanitized[field] = sanitized[field].substring(0, rules.maxLength);
      }
    }

    return sanitized;
  },
};