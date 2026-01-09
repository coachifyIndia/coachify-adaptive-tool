/**
 * PRACTICE SESSION VALIDATION SCHEMAS
 *
 * Validates all practice-related requests using Joi.
 * Ensures data integrity and prevents invalid requests.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - Always validate user input before processing
 * - Clear error messages help users fix their requests
 * - Validation catches errors early, before they reach the database
 */

import Joi from 'joi';

/**
 * START SESSION VALIDATION
 *
 * Validates request to start a new practice session.
 *
 * FIELDS:
 * - session_size: Number of questions (1-20)
 * - focus_modules: Array of module IDs to focus on
 * - difficulty_preference: User's difficulty preference
 */
export const startSessionSchema = Joi.object({
  session_size: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .optional()
    .default(10)
    .messages({
      'number.base': 'Session size must be a number',
      'number.min': 'Session size must be at least 1',
      'number.max': 'Session size cannot exceed 20 questions',
    }),

  focus_modules: Joi.array()
    .items(Joi.number().integer().min(0).max(20))
    .optional()
    .default([])
    .messages({
      'array.base': 'Focus modules must be an array',
      'number.min': 'Module ID must be at least 0',
      'number.max': 'Module ID cannot exceed 20',
    }),

  difficulty_preference: Joi.string()
    .valid('adaptive', 'easy', 'medium', 'hard')
    .optional()
    .default('adaptive')
    .messages({
      'any.only': 'Difficulty preference must be one of: adaptive, easy, medium, hard',
    }),
});

/**
 * SUBMIT ANSWER VALIDATION
 *
 * Validates answer submission.
 *
 * FIELDS:
 * - session_id: The session ID
 * - question_id: The question being answered
 * - user_answer: The user's answer (can be string, number, or array for MCQ)
 * - time_spent_seconds: Time user took (must be positive)
 * - hints_used: Number of hints used (0-5)
 */
export const submitAnswerSchema = Joi.object({
  session_id: Joi.string()
    .required()
    .pattern(/^SES_\d+$/)
    .messages({
      'string.empty': 'Session ID is required',
      'string.pattern.base': 'Invalid session ID format. Expected: SES_XXXXXXX',
      'any.required': 'Session ID is required',
    }),

  question_id: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId format
    .messages({
      'string.empty': 'Question ID is required',
      'string.pattern.base': 'Invalid question ID format',
      'any.required': 'Question ID is required',
    }),

  user_answer: Joi.alternatives()
    .try(
      Joi.string().allow(''),
      Joi.number(),
      Joi.array().items(Joi.string(), Joi.number()),
      Joi.boolean()
    )
    .required()
    .messages({
      'any.required': 'Answer is required',
      'alternatives.match': 'Invalid answer format',
    }),

  time_spent_seconds: Joi.number()
    .integer()
    .min(0)
    .max(3600) // Max 1 hour per question
    .optional()
    .default(0)
    .messages({
      'number.base': 'Time spent must be a number',
      'number.min': 'Time spent cannot be negative',
      'number.max': 'Time spent cannot exceed 1 hour',
    }),

  hints_used: Joi.number()
    .integer()
    .min(0)
    .max(5)
    .optional()
    .default(0)
    .messages({
      'number.base': 'Hints used must be a number',
      'number.min': 'Hints used cannot be negative',
      'number.max': 'Maximum 5 hints per question',
    }),
});

/**
 * END SESSION VALIDATION
 *
 * Validates session end request.
 */
export const endSessionSchema = Joi.object({
  session_id: Joi.string()
    .required()
    .pattern(/^SES_\d+$/)
    .messages({
      'string.empty': 'Session ID is required',
      'string.pattern.base': 'Invalid session ID format. Expected: SES_XXXXXXX',
      'any.required': 'Session ID is required',
    }),
});

/**
 * GET SESSION PARAMS VALIDATION
 *
 * Validates session ID in URL params
 */
export const sessionParamsSchema = Joi.object({
  session_id: Joi.string()
    .required()
    .pattern(/^SES_\d+$/)
    .messages({
      'string.empty': 'Session ID is required',
      'string.pattern.base': 'Invalid session ID format. Expected: SES_XXXXXXX',
      'any.required': 'Session ID is required',
    }),
});

/**
 * VALIDATION MIDDLEWARE HELPER FOR PARAMS
 *
 * Validates URL parameters (different from req.body)
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.params, {
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

    req.params = value;
    next();
  };
};

/**
 * RE-EXPORT VALIDATE FUNCTION FROM AUTH VALIDATOR
 *
 * This validates req.body
 */
export { validate } from './auth.validator';
