import { z } from 'zod';
import { UserRole, UserStatus } from '../types/user';
import { ContentStatus, ContentType } from '../types/content';

// Base validation schemas - exported individually
export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');
export const slugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format');
export const emailSchema = z.string().email('Invalid email format');
export const urlSchema = z.string().url('Invalid URL format');
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// User validation schemas
export const userRoleSchema = z.nativeEnum(UserRole);
export const userStatusSchema = z.nativeEnum(UserStatus);

export const userCreateSchema = z.object({
  email: emailSchema,
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid username format'),
  password: passwordSchema,
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  role: userRoleSchema.default(UserRole.SUBSCRIBER),
  bio: z.string().max(500).optional(),
  website: urlSchema.optional(),
});

export const userUpdateSchema = userCreateSchema.partial().omit({ password: true });

export const loginSchema = z.object({
  email: emailSchema.optional(),
  username: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  twoFactorCode: z.string().length(6).optional(),
}).refine(data => data.email || data.username, {
  message: 'Either email or username is required',
  path: ['email'],
});

// Content validation schemas
export const contentStatusSchema = z.nativeEnum(ContentStatus);
export const contentTypeSchema = z.nativeEnum(ContentType);

export const postCreateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: slugSchema.optional(),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  status: contentStatusSchema.default(ContentStatus.DRAFT),
  categories: z.array(objectIdSchema).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  featuredImage: z.string().optional(),
  meta: z.object({
    seoTitle: z.string().max(60).optional(),
    seoDescription: z.string().max(160).optional(),
    seoKeywords: z.array(z.string()).optional(),
    allowComments: z.boolean().optional(),
    isPinned: z.boolean().optional(),
  }).optional(),
  customFields: z.record(z.any()).optional(),
});

export const postUpdateSchema = postCreateSchema.partial();

export const pageCreateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: slugSchema.optional(),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  status: contentStatusSchema.default(ContentStatus.DRAFT),
  parentId: objectIdSchema.optional(),
  template: z.string().optional(),
  menuOrder: z.number().int().min(0).optional(),
  meta: z.object({
    seoTitle: z.string().max(60).optional(),
    seoDescription: z.string().max(160).optional(),
    seoKeywords: z.array(z.string()).optional(),
    showInMenu: z.boolean().optional(),
    isHomepage: z.boolean().optional(),
  }).optional(),
  customFields: z.record(z.any()).optional(),
});

export const pageUpdateSchema = pageCreateSchema.partial();

// Media validation schemas
export const mediaUploadSchema = z.object({
  originalName: z.string().min(1),
  mimeType: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/),
  size: z.number().positive().max(50 * 1024 * 1024), // 50MB max
  alt: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
});

// Plugin validation schemas
export const pluginManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  author: z.string().min(1),
  license: z.string().min(1),
  main: z.string().min(1),
  requirements: z.object({
    cmsVersion: z.string(),
    nodeVersion: z.string(),
  }),
  capabilities: z.array(z.string()),
});

// Query validation schemas
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sort: z.record(z.union([z.literal(1), z.literal(-1)])).optional(),
});

export const searchSchema = z.object({
  query: z.string().min(1).max(100),
  fields: z.array(z.string()).optional(),
  caseSensitive: z.boolean().optional(),
  wholeWord: z.boolean().optional(),
  regex: z.boolean().optional(),
});

// Validation helper functions - exported individually
export function validateObjectId(id: string): boolean {
  return objectIdSchema.safeParse(id).success;
}

export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validateUrl(url: string): boolean {
  return urlSchema.safeParse(url).success;
}

export function validateSlug(slug: string): boolean {
  return slugSchema.safeParse(slug).success;
}

export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}
export function validateObject(data: any, schema: z.ZodSchema): string[] {
  const result = validate(schema, data);
  if (result.success) {
    return [];
  }
  return result.errors.errors.map(err => `${err.path.join('.')}: ${err.message}`);
}
// Generic validation function
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

// Custom validation rules object
export const customValidators = {
  isStrongPassword: (password: string): boolean => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  },

  isValidHexColor: (color: string): boolean => {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
  },

  isValidPhoneNumber: (phone: string): boolean => {
    const phoneRegex = /^[\+]?[(]?[\+]?\d{1,4}[)]?[-\s\.]?\d{1,4}[-\s\.]?\d{1,4}[-\s\.]?\d{1,9}$/;
    return phoneRegex.test(phone);
  },

  isValidCreditCard: (cardNumber: string): boolean => {
    // Luhn algorithm
    const cleanNumber = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber[i] || '0');
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  },
};

// Create a Validator object that contains all the schemas and functions
export const Validator = {
  // Schemas
  objectIdSchema,
  slugSchema,
  emailSchema,
  urlSchema,
  passwordSchema,
  userRoleSchema,
  userStatusSchema,
  userCreateSchema,
  userUpdateSchema,
  loginSchema,
  contentStatusSchema,
  contentTypeSchema,
  postCreateSchema,
  postUpdateSchema,
  pageCreateSchema,
  pageUpdateSchema,
  mediaUploadSchema,
  pluginManifestSchema,
  paginationSchema,
  searchSchema,
  
  // Functions
  validateObjectId,
  validateEmail,
  validateUrl,
  validateSlug,
  validatePassword,
  validateObject,
  validate,
  customValidators,
};

// Default export
export default Validator;