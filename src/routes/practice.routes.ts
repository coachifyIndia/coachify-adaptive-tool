/**
 * PRACTICE SESSION ROUTES
 *
 * Defines all practice-related API endpoints.
 * These routes enable the adaptive learning experience.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - All routes here are PROTECTED (require authentication)
 * - Routes are mounted at /api/v1/practice
 * - Middleware order: validation → authentication → controller
 *
 * API ENDPOINTS:
 * - POST   /practice/start         - Start new practice session
 * - POST   /practice/submit-answer - Submit answer to current question
 * - POST   /practice/end-session   - End current session
 * - GET    /practice/session/:id   - Get session details
 */

import express from 'express';
import {
  startPracticeSession,
  startAdaptiveDrill,
  getDrillStatus,
  submitAnswer,
  endPracticeSession,
  getSessionDetails,
  getPracticeHistory,
  getModules,
  resetModuleDrills,
  getQuestionsExplorer,
} from '../controllers/practice.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  validate,
  validateParams,
  startSessionSchema,
  submitAnswerSchema,
  endSessionSchema,
  sessionParamsSchema,
} from '../validators/practice.validator';

const router = express.Router();

// ============================================================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================================================

/**
 * @route   POST /api/v1/practice/start
 * @desc    Start a new adaptive practice session
 * @access  Private
 *
 * @body {
 *   "session_size": 10,              // Optional, default: 10
 *   "focus_modules": [0, 1, 3],      // Optional, specific modules
 *   "difficulty_preference": "adaptive" // Optional: adaptive, easy, medium, hard
 * }
 *
 * @returns {
 *   "success": true,
 *   "data": {
 *     "session": { "session_id": "SES_...", "total_questions": 10 },
 *     "first_question": { ... },
 *     "progress_info": { ... }
 *   }
 * }
 *
 * FLOW:
 * Request → Authenticate → Validate → Start Session Controller → Response
 */
router.post(
  '/start',
  authenticate,                    // Step 1: Verify user is logged in
  validate(startSessionSchema),    // Step 2: Validate request data
  startPracticeSession             // Step 3: Start session
);

/**
 * @route   POST /api/v1/practice/drill/start
 * @desc    Start logical adaptive drill (1-5)
 * @access  Private
 */
router.post(
  '/drill/start',
  authenticate,
  startAdaptiveDrill
);

/**
 * @route   POST /api/v1/practice/drill/reset
 * @desc    Reset all adaptive drill progress for a module
 * @access  Private
 */
router.post(
  '/drill/reset',
  authenticate,
  resetModuleDrills
);

/**
 * @route   GET /api/v1/practice/drill/status/:moduleId
 * @desc    Get drill completion status and accuracy for a module
 * @access  Private
 */
router.get(
  '/drill/status/:moduleId',
  authenticate,
  getDrillStatus
);

/**
 * @route   POST /api/v1/practice/submit-answer
 * @desc    Submit answer to a question in active session
 * @access  Private
 *
 * @body {
 *   "session_id": "SES_1234567",
 *   "question_id": "507f1f77bcf86cd799439011",
 *   "user_answer": "42" or ["A", "B"] for MCQ,
 *   "time_spent_seconds": 45,
 *   "hints_used": 1
 * }
 *
 * @returns {
 *   "success": true,
 *   "data": {
 *     "is_correct": true,
 *     "points_earned": 8,
 *     "feedback": { "explanation": "...", "solution_steps": [...] },
 *     "performance_update": { "current_mastery": "65.5", ... },
 *     "next_question": { ... } or null if session complete
 *   }
 * }
 *
 * FLOW:
 * Request → Authenticate → Validate → Submit Answer Controller → Update Progress → Response
 */
router.post(
  '/submit-answer',
  authenticate,                     // Step 1: Verify user
  validate(submitAnswerSchema),     // Step 2: Validate answer data
  submitAnswer                      // Step 3: Process answer
);

/**
 * @route   POST /api/v1/practice/end-session
 * @desc    End the current practice session
 * @access  Private
 *
 * @body {
 *   "session_id": "SES_1234567"
 * }
 *
 * @returns {
 *   "success": true,
 *   "data": {
 *     "session_summary": {
 *       "total_questions": 10,
 *       "questions_attempted": 10,
 *       "questions_correct": 8,
 *       "accuracy": 80,
 *       "points_earned": 75,
 *       "duration_minutes": 15
 *     },
 *     "performance_analysis": { ... }
 *   }
 * }
 *
 * FLOW:
 * Request → Authenticate → Validate → End Session Controller → Calculate Summary → Response
 */
router.post(
  '/end-session',
  authenticate,                    // Step 1: Verify user
  validate(endSessionSchema),      // Step 2: Validate session ID
  endPracticeSession               // Step 3: End session
);

/**
 * @route   GET /api/v1/practice/session/:session_id
 * @desc    Get details of a specific practice session
 * @access  Private
 *
 * @params {
 *   "session_id": "SES_1234567"
 * }
 *
 * @returns {
 *   "success": true,
 *   "data": {
 *     "session": { ... full session details ... }
 *   }
 * }
 *
 * USE CASES:
 * - Review completed sessions
 * - Resume interrupted sessions
 * - Analyze performance trends
 *
 * FLOW:
 * Request → Authenticate → Validate Params → Get Session Controller → Response
 */
router.get(
  '/session/:session_id',
  authenticate,                       // Step 1: Verify user
  validateParams(sessionParamsSchema), // Step 2: Validate session ID in params
  getSessionDetails                   // Step 3: Fetch session
);

// ============================================================================
// FUTURE ROUTES (To be implemented)
// ============================================================================

/**
 * @route   GET /api/v1/practice/history
 * @desc    Get user's practice session history
 * @access  Private
 */
router.get('/history', authenticate, getPracticeHistory);

/**
 * @route   GET /api/v1/practice/questions/explore
 * @desc    Browse questions with filters
 * @access  Private
 */
router.get('/questions/explore', authenticate, getQuestionsExplorer);

/**
 * @route   GET /api/v1/practice/modules
 * @desc    Get all available modules and their question counts
 * @access  Private
 */
router.get('/modules', authenticate, getModules);

/**
 * @route   GET /api/v1/practice/recommendations
 * @desc    Get recommended practice areas based on performance
 * @access  Private
 *
 * Returns: Suggested modules, skills, difficulty levels
 */
// router.get('/recommendations', authenticate, getRecommendations);

/**
 * @route   POST /api/v1/practice/quick-practice
 * @desc    Start quick 5-question practice session
 * @access  Private
 *
 * Body: { micro_skill_id: 12 }
 * Returns: Session with 5 questions from specified skill
 */
// router.post('/quick-practice', authenticate, validate(quickPracticeSchema), quickPractice);

// ============================================================================
// EXPORT ROUTER
// ============================================================================

/**
 * Export the router to be mounted in the main Express app.
 *
 * USAGE IN MAIN APP (server.ts):
 * import practiceRoutes from './routes/practice.routes';
 * app.use('/api/v1/practice', practiceRoutes);
 *
 * This makes all routes available at:
 * - /api/v1/practice/start
 * - /api/v1/practice/submit-answer
 * - /api/v1/practice/end-session
 * - /api/v1/practice/session/:session_id
 */
export default router;
