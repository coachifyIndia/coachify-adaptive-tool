/**
 * ADMIN ROUTES
 *
 * Defines all admin dashboard API endpoints.
 * Protected by admin authentication middleware.
 */

import { Router } from 'express';
import adminController from '../controllers/admin.controller';
import {
  authenticateAdmin,
  requireContentAdmin,
  requireSuperAdmin,
  requireReviewer,
} from '../middlewares/admin-auth.middleware';
import { validate } from '../validators/admin.validator';
import {
  adminLoginSchema,
  createAdminSchema,
  adminRefreshTokenSchema,
  createQuestionSchema,
  updateQuestionSchema,
  updateQuestionStatusSchema,
  listQuestionsQuerySchema,
  bulkImportSchema,
} from '../validators/admin.validator';

const router = Router();

// ============================================================================
// AUTH ROUTES (Public - No Authentication Required)
// ============================================================================

/**
 * @route   POST /api/v1/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/auth/login', validate(adminLoginSchema), adminController.adminLogin);

/**
 * @route   POST /api/v1/admin/auth/refresh
 * @desc    Refresh admin tokens
 * @access  Public (requires valid refresh token)
 */
router.post('/auth/refresh', validate(adminRefreshTokenSchema), adminController.adminRefreshToken);

// ============================================================================
// AUTH ROUTES (Protected)
// ============================================================================

/**
 * @route   GET /api/v1/admin/auth/me
 * @desc    Get current admin profile
 * @access  Admin (Any Role)
 */
router.get('/auth/me', authenticateAdmin, adminController.getAdminProfile);

// ============================================================================
// ADMIN MANAGEMENT ROUTES (Super Admin Only)
// ============================================================================

/**
 * @route   POST /api/v1/admin/admins
 * @desc    Create a new admin
 * @access  Super Admin
 */
router.post(
  '/admins',
  authenticateAdmin,
  requireSuperAdmin,
  validate(createAdminSchema),
  adminController.createAdmin
);

/**
 * @route   GET /api/v1/admin/admins
 * @desc    List all admins
 * @access  Super Admin
 */
router.get('/admins', authenticateAdmin, requireSuperAdmin, adminController.listAdmins);

/**
 * @route   PUT /api/v1/admin/admins/:adminId
 * @desc    Update an admin
 * @access  Super Admin
 */
router.put('/admins/:adminId', authenticateAdmin, requireSuperAdmin, adminController.updateAdmin);

/**
 * @route   DELETE /api/v1/admin/admins/:adminId
 * @desc    Delete an admin (soft delete by default, hard delete with ?hard_delete=true)
 * @access  Super Admin
 */
router.delete('/admins/:adminId', authenticateAdmin, requireSuperAdmin, adminController.deleteAdmin);

// ============================================================================
// CURRICULUM DATA ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/admin/curriculum
 * @desc    Get all modules and micro-skills for question form dropdowns
 * @access  Admin (Any Role)
 */
router.get('/curriculum', authenticateAdmin, requireReviewer, adminController.getCurriculum);

/**
 * @route   GET /api/v1/admin/curriculum/next-ids
 * @desc    Get next available module_id and micro_skill_id
 * @access  Content Admin, Super Admin
 */
router.get('/curriculum/next-ids', authenticateAdmin, requireContentAdmin, adminController.getNextCurriculumIds);

/**
 * @route   POST /api/v1/admin/curriculum/seed
 * @desc    Seed curriculum from static file to database (one-time setup)
 * @access  Super Admin
 */
router.post('/curriculum/seed', authenticateAdmin, requireSuperAdmin, adminController.seedCurriculum);

/**
 * @route   POST /api/v1/admin/curriculum/modules
 * @desc    Create a new module
 * @access  Content Admin, Super Admin
 */
router.post('/curriculum/modules', authenticateAdmin, requireContentAdmin, adminController.createModule);

/**
 * @route   POST /api/v1/admin/curriculum/modules/:moduleId/micro-skills
 * @desc    Create a new micro-skill in a module
 * @access  Content Admin, Super Admin
 */
router.post(
  '/curriculum/modules/:moduleId/micro-skills',
  authenticateAdmin,
  requireContentAdmin,
  adminController.createMicroSkill
);

// ============================================================================
// QUESTION MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/admin/questions/stats
 * @desc    Get question statistics
 * @access  Admin (Any Role)
 * @note    Must be before /:identifier to avoid conflict
 */
router.get('/questions/stats', authenticateAdmin, requireReviewer, adminController.getQuestionStats);

/**
 * @route   GET /api/v1/admin/questions
 * @desc    List questions with filters
 * @access  Admin (Any Role)
 */
router.get(
  '/questions',
  authenticateAdmin,
  requireReviewer,
  validate(listQuestionsQuerySchema, 'query'),
  adminController.listQuestions
);

/**
 * @route   POST /api/v1/admin/questions
 * @desc    Create a new question
 * @access  Content Admin, Super Admin
 */
router.post(
  '/questions',
  authenticateAdmin,
  requireContentAdmin,
  validate(createQuestionSchema),
  adminController.createQuestion
);

/**
 * @route   GET /api/v1/admin/questions/:identifier
 * @desc    Get a question by ID or code
 * @access  Admin (Any Role)
 */
router.get('/questions/:identifier', authenticateAdmin, requireReviewer, adminController.getQuestion);

/**
 * @route   PUT /api/v1/admin/questions/:identifier
 * @desc    Update a question
 * @access  Content Admin, Super Admin
 */
router.put(
  '/questions/:identifier',
  authenticateAdmin,
  requireContentAdmin,
  validate(updateQuestionSchema),
  adminController.updateQuestion
);

/**
 * @route   PATCH /api/v1/admin/questions/:identifier/status
 * @desc    Update question status
 * @access  Content Admin, Super Admin
 */
router.patch(
  '/questions/:identifier/status',
  authenticateAdmin,
  requireContentAdmin,
  validate(updateQuestionStatusSchema),
  adminController.updateQuestionStatus
);

/**
 * @route   DELETE /api/v1/admin/questions/:identifier
 * @desc    Delete (archive) a question
 * @access  Content Admin, Super Admin
 */
router.delete(
  '/questions/:identifier',
  authenticateAdmin,
  requireContentAdmin,
  adminController.deleteQuestion
);

/**
 * @route   POST /api/v1/admin/questions/:identifier/restore
 * @desc    Restore an archived question
 * @access  Content Admin, Super Admin
 */
router.post(
  '/questions/:identifier/restore',
  authenticateAdmin,
  requireContentAdmin,
  adminController.restoreQuestion
);

// ============================================================================
// AUDIT ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/admin/audit/recent
 * @desc    Get recent activity
 * @access  Admin (Any Role)
 */
router.get('/audit/recent', authenticateAdmin, requireReviewer, adminController.getRecentActivity);

/**
 * @route   GET /api/v1/admin/audit/summary
 * @desc    Get activity summary
 * @access  Super Admin, Content Admin
 */
router.get('/audit/summary', authenticateAdmin, requireContentAdmin, adminController.getActivitySummary);

/**
 * @route   GET /api/v1/admin/audit/questions/:questionId
 * @desc    Get question change history
 * @access  Admin (Any Role)
 */
router.get(
  '/audit/questions/:questionId',
  authenticateAdmin,
  requireReviewer,
  adminController.getQuestionHistory
);

/**
 * @route   GET /api/v1/admin/audit/admins/:adminId
 * @desc    Get admin activity
 * @access  Super Admin
 */
router.get(
  '/audit/admins/:adminId',
  authenticateAdmin,
  requireSuperAdmin,
  adminController.getAdminActivity
);

// ============================================================================
// IMPORT ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/admin/import/history
 * @desc    Get import history
 * @access  Content Admin, Super Admin
 */
router.get('/import/history', authenticateAdmin, requireContentAdmin, adminController.getImportHistory);

/**
 * @route   POST /api/v1/admin/import
 * @desc    Initialize bulk import
 * @access  Content Admin, Super Admin
 */
router.post(
  '/import',
  authenticateAdmin,
  requireContentAdmin,
  validate(bulkImportSchema),
  adminController.initializeImport
);

/**
 * @route   GET /api/v1/admin/import/:batchId/progress
 * @desc    Get import progress
 * @access  Content Admin, Super Admin
 */
router.get(
  '/import/:batchId/progress',
  authenticateAdmin,
  requireContentAdmin,
  adminController.getImportProgress
);

/**
 * @route   POST /api/v1/admin/import/:batchId/cancel
 * @desc    Cancel an import
 * @access  Content Admin, Super Admin
 */
router.post(
  '/import/:batchId/cancel',
  authenticateAdmin,
  requireContentAdmin,
  adminController.cancelImport
);

/**
 * @route   POST /api/v1/admin/import/:batchId/rollback
 * @desc    Rollback an import
 * @access  Super Admin
 */
router.post(
  '/import/:batchId/rollback',
  authenticateAdmin,
  requireSuperAdmin,
  adminController.rollbackImport
);

// ============================================================================
// EXPORT
// ============================================================================

export default router;
