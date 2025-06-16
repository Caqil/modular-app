
import { z } from 'zod';

/**
 * Common validation schemas
 */
export const validationSchemas = {
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  url: z.string().url('Please enter a valid URL'),
  phoneNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
};

/**
 * File validation schemas
 */
export const fileValidationSchemas = {
  image: z.object({
    type: z.string().refine(type => type.startsWith('image/'), 'File must be an image'),
    size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
  }),
  document: z.object({
    type: z.string().refine(
      type => ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(type),
      'File must be a PDF or Word document'
    ),
    size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  }),
};

/**
 * Validate field in real-time
 */
export function validateField<T>(schema: z.ZodSchema<T>, value: unknown): {
  isValid: boolean;
  error?: string;
} {
  try {
    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message;
      return message !== undefined
        ? { isValid: false, error: message }
        : { isValid: false };
    }
    return { isValid: false, error: 'Invalid value' };
  }
}

/**
 * Validate form data
 */
export function validateForm<T extends Record<string, unknown>>(
  schema: z.ZodSchema<T>,
  data: T
): {
  isValid: boolean;
  errors: Record<string, string>;
  data?: T;
} {
  try {
    const validatedData = schema.parse(data);
    return { isValid: true, errors: {}, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        if (err.path) {
          errors[err.path.join('.')] = err.message;
        }
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: 'Validation failed' } };
  }
}