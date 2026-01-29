/**
 * DASHBOARD ROUTES
 *
 * Routes for dashboard data endpoints
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getDashboardSummary,
  getUserStreak,
  getAccuracyByDifficulty,
} from '../controllers/dashboard.controller';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/dashboard/summary
 *
 * Get complete dashboard data (performance, diagnosis, adaptivity, motivation)
 */
router.get('/summary', getDashboardSummary);

/**
 * GET /api/v1/dashboard/streak
 *
 * Get user streak information
 */
router.get('/streak', getUserStreak);

/**
 * GET /api/v1/dashboard/accuracy-by-difficulty
 *
 * Get accuracy breakdown by difficulty level
 * Query params:
 *   - module_id (optional): Filter by specific module
 */
router.get('/accuracy-by-difficulty', getAccuracyByDifficulty);

export default router;
