/**
 * ANALYTICS ROUTES
 *
 * All analytics endpoints for confidence scoring and time-based analytics.
 * These endpoints provide insights into student learning patterns and performance.
 *
 * Base Route: /api/v1/analytics
 *
 * ENDPOINTS:
 * - GET /confidence - Overall confidence analytics
 * - GET /confidence/by-skill - Confidence breakdown by micro-skill
 * - GET /time/speed-accuracy - Speed-accuracy correlation
 * - GET /time/time-of-day - Best/worst practice hours
 * - GET /time/fatigue/:session_id - Fatigue detection for session
 * - GET /time/difficulty-analysis - Time allocation by difficulty
 * - GET /time/recommendations - Combined recommendations
 */

import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// MIDDLEWARE: All analytics routes require authentication
// ============================================================================
router.use(authenticate);

// ============================================================================
// CONFIDENCE ANALYTICS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/analytics/confidence
 * @desc    Get overall confidence analytics for user
 * @query   module_id (optional) - Filter by module
 * @query   lookback_sessions (optional, default: 20) - Number of recent sessions
 * @access  Private
 */
router.get('/confidence', analyticsController.getConfidenceAnalytics);

/**
 * @route   GET /api/v1/analytics/confidence/by-skill
 * @desc    Get confidence breakdown by micro-skill
 * @query   module_id (optional) - Filter by module
 * @query   lookback_sessions (optional, default: 20)
 * @access  Private
 */
router.get('/confidence/by-skill', analyticsController.getConfidenceBySkill);

// ============================================================================
// TIME ANALYTICS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/analytics/time/speed-accuracy
 * @desc    Analyze correlation between speed and accuracy
 * @query   module_id (optional) - Filter by module
 * @query   lookback_sessions (optional, default: 20)
 * @access  Private
 */
router.get('/time/speed-accuracy', analyticsController.getSpeedAccuracyAnalysis);

/**
 * @route   GET /api/v1/analytics/time/time-of-day
 * @desc    Analyze best/worst practice hours
 * @query   module_id (optional) - Filter by module
 * @query   lookback_days (optional, default: 30)
 * @access  Private
 */
router.get('/time/time-of-day', analyticsController.getTimeOfDayAnalysis);

/**
 * @route   GET /api/v1/analytics/time/fatigue/:session_id
 * @desc    Detect fatigue in specific session
 * @param   session_id - Session ID to analyze
 * @access  Private
 */
router.get('/time/fatigue/:session_id', analyticsController.getFatigueAnalysis);

/**
 * @route   GET /api/v1/analytics/time/difficulty-analysis
 * @desc    Analyze time allocation across difficulty levels
 * @query   module_id (optional) - Filter by module
 * @query   lookback_sessions (optional, default: 20)
 * @access  Private
 */
router.get('/time/difficulty-analysis', analyticsController.getDifficultyTimeAnalysis);

/**
 * @route   GET /api/v1/analytics/time/recommendations
 * @desc    Get combined time-based recommendations
 * @query   module_id (optional) - Filter by module
 * @access  Private
 */
router.get('/time/recommendations', analyticsController.getTimeRecommendations);

// ============================================================================
// EXPORT
// ============================================================================
export default router;
