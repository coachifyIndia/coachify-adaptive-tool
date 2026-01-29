/**
 * ADMIN VALIDATION SCHEMAS
 *
 * Joi validation schemas for admin dashboard API endpoints.
 * Follows the same pattern as auth.validator.ts
 */

import Joi from 'joi';
import { AdminRole } from '../../models/admin.model';
import { QuestionType, QuestionStatus } from '../../types';
import { ImportFileType } from '../../models/importBatch.model';

// ============================================================================
// ADMIN AUTHENTICATION SCHEMAS
// ============================================================================

/**
 * Admin Login Validation
 */
export const adminLoginSchema = Joi.object({
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
 * Admin Registration/Creation Validation
 * Used by super admins to create new admin accounts
 */
export const createAdminSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),

  email: Joi.string()
    .email()
    .max(255)
    .lowercase()
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
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base':
        'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)',
      'any.required': 'Password is required',
    }),

  role: Joi.string()
    .valid(...Object.values(AdminRole))
    .default(AdminRole.CONTENT_ADMIN)
    .messages({
      'any.only': `Role must be one of: ${Object.values(AdminRole).join(', ')}`,
    }),
});

/**
 * Admin Refresh Token Validation
 */
export const adminRefreshTokenSchema = Joi.object({
  refresh_token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
});

// ============================================================================
// QUESTION MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Solution Step Schema (reusable)
 */
const solutionStepSchema = Joi.object({
  step: Joi.number().integer().min(1).required().messages({
    'number.base': 'Step must be a number',
    'number.min': 'Step must be at least 1',
    'any.required': 'Step number is required',
  }),
  action: Joi.string().trim().required().messages({
    'string.empty': 'Action is required',
    'any.required': 'Action is required',
  }),
  calculation: Joi.string().trim().allow('').optional().default('').messages({
    'string.base': 'Calculation must be a string',
  }),
  result: Joi.alternatives()
    .try(Joi.string().allow(''), Joi.number())
    .optional()
    .default('')
    .messages({
      'alternatives.types': 'Result must be a string or number',
    }),
});

/**
 * Hint Schema (reusable)
 */
const hintSchema = Joi.object({
  level: Joi.number().integer().min(1).max(3).required().messages({
    'number.base': 'Hint level must be a number',
    'number.min': 'Hint level must be at least 1',
    'number.max': 'Hint level cannot exceed 3',
    'any.required': 'Hint level is required',
  }),
  text: Joi.string().trim().required().messages({
    'string.empty': 'Hint text is required',
    'any.required': 'Hint text is required',
  }),
});

/**
 * Common Error Schema (reusable)
 */
const commonErrorSchema = Joi.object({
  type: Joi.string().trim().required().messages({
    'string.empty': 'Error type is required',
    'any.required': 'Error type is required',
  }),
  frequency: Joi.number().min(0).max(1).required().messages({
    'number.base': 'Frequency must be a number',
    'number.min': 'Frequency must be at least 0',
    'number.max': 'Frequency cannot exceed 1',
    'any.required': 'Frequency is required',
  }),
  description: Joi.string().trim().required().messages({
    'string.empty': 'Description is required',
    'any.required': 'Description is required',
  }),
});

/**
 * Create Question Validation
 */
export const createQuestionSchema = Joi.object({
  // Question code is auto-generated, but can be provided for imports
  question_code: Joi.string()
    .trim()
    .pattern(/^M\d+_MS\d+_Q\d+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Question code must follow format: M{module}_MS{skill}_Q{number}',
    }),

  module_id: Joi.number()
    .integer()
    .min(0)
    .max(9999) // Dynamic limit - curriculum can grow
    .required()
    .messages({
      'number.base': 'Module ID must be a number',
      'number.min': 'Module ID must be at least 0',
      'number.max': 'Module ID cannot exceed 9999',
      'any.required': 'Module ID is required',
    }),

  micro_skill_id: Joi.number()
    .integer()
    .min(1)
    .max(99999) // Dynamic limit - curriculum can grow
    .required()
    .messages({
      'number.base': 'Micro skill ID must be a number',
      'number.min': 'Micro skill ID must be at least 1',
      'number.max': 'Micro skill ID cannot exceed 99999',
      'any.required': 'Micro skill ID is required',
    }),

  question_data: Joi.object({
    text: Joi.string().trim().required().messages({
      'string.empty': 'Question text is required',
      'any.required': 'Question text is required',
    }),

    type: Joi.string()
      .valid(...Object.values(QuestionType))
      .required()
      .messages({
        'any.only': `Question type must be one of: ${Object.values(QuestionType).join(', ')}`,
        'any.required': 'Question type is required',
      }),

    options: Joi.array()
      .items(Joi.string().trim())
      .when('type', {
        is: QuestionType.MCQ,
        then: Joi.array().min(2).required().messages({
          'array.min': 'MCQ questions must have at least 2 options',
          'any.required': 'Options are required for MCQ questions',
        }),
        otherwise: Joi.array().optional().default([]),
      }),

    correct_answer: Joi.alternatives()
      .try(Joi.string(), Joi.number(), Joi.boolean())
      .required()
      .messages({
        'any.required': 'Correct answer is required',
      }),

    solution_steps: Joi.array()
      .items(solutionStepSchema)
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one solution step is required',
        'any.required': 'Solution steps are required',
      }),

    hints: Joi.array()
      .items(hintSchema)
      .max(3)
      .optional()
      .default([])
      .messages({
        'array.max': 'Maximum 3 hints allowed',
      }),
  }).required(),

  metadata: Joi.object({
    difficulty_level: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .required()
      .messages({
        'number.base': 'Difficulty level must be a number',
        'number.min': 'Difficulty level must be at least 1',
        'number.max': 'Difficulty level cannot exceed 10',
        'any.required': 'Difficulty level is required',
      }),

    expected_time_seconds: Joi.number()
      .integer()
      .min(10)
      .required()
      .messages({
        'number.base': 'Expected time must be a number',
        'number.min': 'Expected time must be at least 10 seconds',
        'any.required': 'Expected time is required',
      }),

    points: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'number.base': 'Points must be a number',
        'number.min': 'Points cannot be negative',
        'any.required': 'Points are required',
      }),

    tags: Joi.array()
      .items(Joi.string().trim())
      .optional()
      .default([]),

    prerequisites: Joi.array()
      .items(Joi.string().trim())
      .optional()
      .default([]),

    common_errors: Joi.array()
      .items(commonErrorSchema)
      .optional()
      .default([]),
  }).required(),

  status: Joi.string()
    .valid(...Object.values(QuestionStatus))
    .optional()
    .default(QuestionStatus.DRAFT)
    .messages({
      'any.only': `Status must be one of: ${Object.values(QuestionStatus).join(', ')}`,
    }),
});

/**
 * Update Question Validation
 * Same as create but all fields are optional
 */
export const updateQuestionSchema = Joi.object({
  module_id: Joi.number().integer().min(0).max(9999).optional(), // Dynamic limit
  micro_skill_id: Joi.number().integer().min(1).max(99999).optional(), // Dynamic limit

  question_data: Joi.object({
    text: Joi.string().trim().optional(),
    type: Joi.string().valid(...Object.values(QuestionType)).optional(),
    options: Joi.array().items(Joi.string().trim()).optional(),
    correct_answer: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).optional(),
    solution_steps: Joi.array().items(solutionStepSchema).min(1).optional(),
    hints: Joi.array().items(hintSchema).max(3).optional(),
  }).optional(),

  metadata: Joi.object({
    difficulty_level: Joi.number().integer().min(1).max(10).optional(),
    expected_time_seconds: Joi.number().integer().min(10).optional(),
    points: Joi.number().integer().min(0).optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    prerequisites: Joi.array().items(Joi.string().trim()).optional(),
    common_errors: Joi.array().items(commonErrorSchema).optional(),
  }).optional(),

  status: Joi.string().valid(...Object.values(QuestionStatus)).optional(),
});

/**
 * Question Status Update Validation
 */
export const updateQuestionStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(QuestionStatus))
    .required()
    .messages({
      'any.only': `Status must be one of: ${Object.values(QuestionStatus).join(', ')}`,
      'any.required': 'Status is required',
    }),

  reason: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters',
    }),
});

// ============================================================================
// QUESTION SEARCH/FILTER SCHEMAS
// ============================================================================

/**
 * Question List Query Validation
 */
export const listQuestionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  module_id: Joi.number().integer().min(0).max(9999).optional(), // Dynamic limit
  micro_skill_id: Joi.number().integer().min(1).max(99999).optional(), // Dynamic limit
  status: Joi.string().valid(...Object.values(QuestionStatus)).optional(),
  difficulty_min: Joi.number().integer().min(1).max(10).optional(),
  difficulty_max: Joi.number().integer().min(1).max(10).optional(),
  type: Joi.string().valid(...Object.values(QuestionType)).optional(),
  search: Joi.string().trim().max(200).optional(),
  tags: Joi.alternatives()
    .try(
      Joi.string().trim(),
      Joi.array().items(Joi.string().trim())
    )
    .optional(),
  sort_by: Joi.string()
    .valid('created_at', 'updated_at', 'difficulty_level', 'question_code')
    .default('created_at'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
});

// ============================================================================
// BULK IMPORT SCHEMAS
// ============================================================================

/**
 * Bulk Import Initiation Validation
 */
export const bulkImportSchema = Joi.object({
  file_type: Joi.string()
    .valid(...Object.values(ImportFileType))
    .required()
    .messages({
      'any.only': `File type must be one of: ${Object.values(ImportFileType).join(', ')}`,
      'any.required': 'File type is required',
    }),

  // For JSON import, questions can be passed in body
  questions: Joi.array()
    .items(createQuestionSchema)
    .when('file_type', {
      is: ImportFileType.JSON,
      then: Joi.array().min(1).optional(),
      otherwise: Joi.forbidden(),
    }),
});

/**
 * Import Progress Query Validation
 */
export const importProgressQuerySchema = Joi.object({
  batch_id: Joi.string().trim().required().messages({
    'string.empty': 'Batch ID is required',
    'any.required': 'Batch ID is required',
  }),
});

// ============================================================================
// AUDIT/HISTORY SCHEMAS
// ============================================================================

/**
 * Question History Query Validation
 */
export const questionHistoryQuerySchema = Joi.object({
  question_id: Joi.string().trim().required(),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

/**
 * Admin Activity Query Validation
 */
export const adminActivityQuerySchema = Joi.object({
  admin_id: Joi.string().trim().optional(),
  action: Joi.string().trim().optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  limit: Joi.number().integer().min(1).max(200).default(100),
});

// ============================================================================
// VALIDATION MIDDLEWARE HELPER
// ============================================================================

/**
 * Create validation middleware
 * Same pattern as auth.validator.ts
 *
 * @param schema - Joi validation schema
 * @param source - Where to validate ('body', 'query', 'params')
 */
export const validate = (schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: any, res: any, next: any) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
      });
    }

    // Replace with validated data
    req[source] = value;
    next();
  };
};

// ============================================================================
// EXPORT
// ============================================================================

export default {
  // Auth schemas
  adminLoginSchema,
  createAdminSchema,
  adminRefreshTokenSchema,

  // Question schemas
  createQuestionSchema,
  updateQuestionSchema,
  updateQuestionStatusSchema,
  listQuestionsQuerySchema,

  // Import schemas
  bulkImportSchema,
  importProgressQuerySchema,

  // Audit schemas
  questionHistoryQuerySchema,
  adminActivityQuerySchema,

  // Helper
  validate,
};
