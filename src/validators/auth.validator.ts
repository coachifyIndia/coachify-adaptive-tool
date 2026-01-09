/**
 * AUTHENTICATION VALIDATION SCHEMAS
 *
 * This file contains validation rules for authentication-related requests.
 * We use Joi library to validate incoming data before processing.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - ALWAYS validate user input - NEVER trust data from clients!
 * - Validation prevents security issues like SQL injection, XSS, etc.
 * - Joi is a powerful validation library that makes this easy
 * - We define "schemas" that describe what valid data looks like
 * - If data doesn't match the schema, we reject it with clear error messages
 *
 * WHY VALIDATE?
 * 1. Security: Prevent malicious data from reaching your database
 * 2. Data Quality: Ensure data is in the correct format
 * 3. User Experience: Give clear error messages about what's wrong
 * 4. Debugging: Catch errors early before they cause database issues
 *
 * HOW JOI WORKS:
 * Joi.object({ field: Joi.type().rule1().rule2() })
 * Example: Joi.string().email().required()
 * - string(): Field must be a string
 * - email(): Must be valid email format
 * - required(): Field is mandatory
 */

import Joi from 'joi';
import { UserSegment, SubscriptionPlan } from '../types';

/**
 * USER REGISTRATION VALIDATION SCHEMA
 *
 * This validates data when a new user signs up.
 * We check: name, email, password, age, segment, and optional target exam.
 *
 * VALIDATION RULES:
 * - Name: 2-100 characters, alphabets and spaces only
 * - Email: Valid email format, max 255 characters
 * - Password: 8-128 characters, must have uppercase, lowercase, number, special char
 * - Age: Number between 5 and 100
 * - Segment: Must be one of our 4 valid segments
 * - Target Exam: Optional, only for competitive_exam segment
 *
 * PASSWORD SECURITY REQUIREMENTS:
 * We enforce strong passwords to protect user accounts:
 * - Minimum 8 characters (longer = more secure)
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 number (0-9)
 * - At least 1 special character (@$!%*?&)
 *
 * Example valid password: "MyPass@123"
 * Example invalid: "password" (no uppercase, number, or special char)
 */
export const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .pattern(/^[a-zA-Z\s]+$/) // Only letters and spaces
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'string.pattern.base': 'Name can only contain letters and spaces',
      'any.required': 'Name is required',
    }),

  email: Joi.string()
    .email()
    .max(255)
    .lowercase() // Convert to lowercase automatically
    .trim()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot exceed 255 characters',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/) // Strong password regex
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
      'any.required': 'Password is required',
    }),

  age: Joi.number()
    .integer()
    .min(5)
    .max(100)
    .required()
    .messages({
      'number.base': 'Age must be a number',
      'number.min': 'Age must be at least 5',
      'number.max': 'Age cannot exceed 100',
      'any.required': 'Age is required',
    }),

  segment: Joi.string()
    .valid(...Object.values(UserSegment)) // Must be one of: competitive_exam, school, kids, professional
    .required()
    .messages({
      'any.only': `Segment must be one of: ${Object.values(UserSegment).join(', ')}`,
      'any.required': 'User segment is required',
    }),

  target_exam: Joi.string()
    .max(100)
    .trim()
    .optional()
    .allow('', null) // Allow empty string or null
    .messages({
      'string.max': 'Target exam name cannot exceed 100 characters',
    }),

  // Optional: Subscription plan (defaults to FREE in the controller)
  subscription_plan: Joi.string()
    .valid(...Object.values(SubscriptionPlan))
    .optional()
    .default(SubscriptionPlan.FREE)
    .messages({
      'any.only': `Subscription plan must be one of: ${Object.values(SubscriptionPlan).join(', ')}`,
    }),
});

/**
 * USER LOGIN VALIDATION SCHEMA
 *
 * This validates data when a user logs in.
 * Much simpler than registration - just email and password.
 *
 * VALIDATION RULES:
 * - Email: Valid email format
 * - Password: Not empty (we don't validate strength here since they already created account)
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
});

/**
 * REFRESH TOKEN VALIDATION SCHEMA
 *
 * Validates refresh token requests.
 * User sends their refresh token to get a new access token.
 */
export const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
});

/**
 * PASSWORD RESET REQUEST SCHEMA
 *
 * Validates when user requests a password reset email.
 * Only requires email address.
 */
export const passwordResetRequestSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
});

/**
 * PASSWORD RESET CONFIRM SCHEMA
 *
 * Validates when user actually resets their password.
 * Requires reset token and new password.
 */
export const passwordResetConfirmSchema = Joi.object({
  reset_token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required',
      'any.required': 'Reset token is required',
    }),

  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
      'any.required': 'New password is required',
    }),

  confirm_password: Joi.string()
    .valid(Joi.ref('new_password')) // Must match new_password
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password',
    }),
});

/**
 * CHANGE PASSWORD SCHEMA
 *
 * Validates when logged-in user wants to change their password.
 * Requires current password and new password.
 */
export const changePasswordSchema = Joi.object({
  current_password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required',
      'any.required': 'Current password is required',
    }),

  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .invalid(Joi.ref('current_password')) // New password must be different from current
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
      'any.invalid': 'New password must be different from current password',
      'any.required': 'New password is required',
    }),

  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your new password',
    }),
});

/**
 * EMAIL VERIFICATION SCHEMA
 *
 * Validates email verification requests.
 * User clicks link in email with verification token.
 */
export const emailVerificationSchema = Joi.object({
  verification_token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Verification token is required',
      'any.required': 'Verification token is required',
    }),
});

/**
 * VALIDATION MIDDLEWARE HELPER
 *
 * This is a reusable function that creates validation middleware.
 * It takes a Joi schema and returns an Express middleware function.
 *
 * HOW IT WORKS:
 * 1. Validates req.body against the provided schema
 * 2. If valid, replaces req.body with validated/sanitized data and calls next()
 * 3. If invalid, returns 400 error with clear error messages
 *
 * BENEFITS:
 * - Automatically sanitizes data (trim, lowercase, etc.)
 * - Returns user-friendly error messages
 * - Prevents invalid data from reaching controllers
 *
 * @param schema - Joi validation schema
 * @returns Express middleware function
 *
 * @example
 * import { validate } from './validators/auth.validator';
 * import { registerSchema } from './validators/auth.validator';
 *
 * router.post('/register', validate(registerSchema), registerController);
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    // Validate req.body against the schema
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove fields not in the schema (security!)
    });

    // If validation failed, return error response
    if (error) {
      // Extract all error messages
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'), // Field name (e.g., "email")
        message: detail.message, // Error message (e.g., "Email is required")
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
      });
    }

    // Replace req.body with validated and sanitized data
    // This ensures all data is clean (trimmed, lowercase where specified, etc.)
    req.body = value;

    // Proceed to next middleware or controller
    next();
  };
};

/**
 * EXPORT ALL VALIDATION SCHEMAS AND HELPER
 *
 * Summary:
 * - registerSchema: Validates user registration
 * - loginSchema: Validates user login
 * - refreshTokenSchema: Validates refresh token requests
 * - passwordResetRequestSchema: Validates password reset requests
 * - passwordResetConfirmSchema: Validates password reset confirmation
 * - changePasswordSchema: Validates password change requests
 * - emailVerificationSchema: Validates email verification
 * - validate(): Helper function to create validation middleware
 */

export default {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  changePasswordSchema,
  emailVerificationSchema,
  validate,
};
