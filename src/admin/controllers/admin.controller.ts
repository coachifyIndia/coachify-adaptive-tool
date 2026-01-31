/**
 * ADMIN CONTROLLER
 *
 * Handles HTTP requests for admin dashboard endpoints.
 * Delegates business logic to services.
 */

import { Request, Response } from 'express';
import { questionService, auditService, importService, adminAuthService, curriculumService } from '../services';
import { ImportFileType } from '../../models/importBatch.model';
import { QuestionStatus } from '../../types';
import logger from '../../utils/logger.util';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract admin context from request for audit purposes
 */
function getAdminContext(req: Request) {
  return {
    admin_id: req.admin!.admin_id,
    admin_name: req.admin!.name,
    ip_address: req.ip || req.headers['x-forwarded-for']?.toString(),
    user_agent: req.headers['user-agent'],
  };
}

// ============================================================================
// AUTHENTICATION CONTROLLERS
// ============================================================================

/**
 * Admin Login
 * POST /api/v1/admin/auth/login
 */
export async function adminLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const result = await adminAuthService.login(email, password);

    if (!result) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'INVALID_CREDENTIALS',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error: any) {
    logger.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Admin Refresh Token
 * POST /api/v1/admin/auth/refresh
 */
export async function adminRefreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refresh_token } = req.body;

    const result = await adminAuthService.refreshTokens(refresh_token);

    if (!result) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        error: 'INVALID_REFRESH_TOKEN',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('Admin refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during token refresh',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Get Current Admin Profile
 * GET /api/v1/admin/auth/me
 */
export async function getAdminProfile(req: Request, res: Response): Promise<void> {
  try {
    const admin = req.admin!;

    res.status(200).json({
      success: true,
      data: {
        admin_id: admin.admin_id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        is_active: admin.is_active,
        last_login: admin.last_login,
        created_at: admin.created_at,
      },
    });
  } catch (error: any) {
    logger.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

// ============================================================================
// ADMIN MANAGEMENT CONTROLLERS (Super Admin Only)
// ============================================================================

/**
 * Create New Admin
 * POST /api/v1/admin/admins
 */
export async function createAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role } = req.body;
    const createdByAdminId = req.admin!.admin_id;

    const admin = await adminAuthService.createAdmin(
      { name, email, password, role },
      createdByAdminId
    );

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        admin: {
          admin_id: admin.admin_id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          is_active: admin.is_active,
          created_at: admin.created_at,
        },
      },
    });
  } catch (error: any) {
    logger.error('Create admin error:', error);

    if (error.message.includes('already exists')) {
      res.status(409).json({
        success: false,
        message: error.message,
        error: 'ADMIN_EXISTS',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while creating admin',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * List All Admins
 * GET /api/v1/admin/admins
 */
export async function listAdmins(_req: Request, res: Response): Promise<void> {
  try {
    const admins = await adminAuthService.getAllAdmins();

    res.status(200).json({
      success: true,
      data: {
        admins: admins.map((admin) => ({
          admin_id: admin.admin_id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          is_active: admin.is_active,
          last_login: admin.last_login,
          created_at: admin.created_at,
        })),
      },
    });
  } catch (error: any) {
    logger.error('List admins error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Update Admin
 * PUT /api/v1/admin/admins/:adminId
 */
export async function updateAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { adminId } = req.params;
    const { name, role, is_active } = req.body;

    const admin = await adminAuthService.updateAdmin(adminId, { name, role, is_active });

    if (!admin) {
      res.status(404).json({
        success: false,
        message: 'Admin not found',
        error: 'ADMIN_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      data: {
        admin: {
          admin_id: admin.admin_id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          is_active: admin.is_active,
        },
      },
    });
  } catch (error: any) {
    logger.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Delete Admin
 * DELETE /api/v1/admin/admins/:adminId
 */
export async function deleteAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { adminId } = req.params;
    const { hard_delete } = req.query;

    // Prevent self-deletion
    const currentAdmin = getAdminContext(req);
    if (currentAdmin.admin_id === adminId) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
        error: 'SELF_DELETE_NOT_ALLOWED',
      });
      return;
    }

    const deleted = await adminAuthService.deleteAdmin(adminId, hard_delete === 'true');

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Admin not found',
        error: 'ADMIN_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: hard_delete === 'true' ? 'Admin permanently deleted' : 'Admin deactivated successfully',
    });
  } catch (error: any) {
    logger.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

// ============================================================================
// QUESTION MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * Create Question
 * POST /api/v1/admin/questions
 */
export async function createQuestion(req: Request, res: Response): Promise<void> {
  try {
    const adminContext = getAdminContext(req);
    const question = await questionService.createQuestion(req.body, adminContext);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: question,
    });
  } catch (error: any) {
    logger.error('Create question error:', error);

    if (error.message.includes('already exists')) {
      res.status(409).json({
        success: false,
        message: error.message,
        error: 'QUESTION_EXISTS',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while creating question',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Get Question
 * GET /api/v1/admin/questions/:identifier
 */
export async function getQuestion(req: Request, res: Response): Promise<void> {
  try {
    const { identifier } = req.params;
    const question = await questionService.getQuestion(identifier);

    if (!question) {
      res.status(404).json({
        success: false,
        message: 'Question not found',
        error: 'QUESTION_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { question },
    });
  } catch (error: any) {
    logger.error('Get question error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Update Question
 * PUT /api/v1/admin/questions/:identifier
 */
export async function updateQuestion(req: Request, res: Response): Promise<void> {
  try {
    const { identifier } = req.params;
    const adminContext = getAdminContext(req);

    const question = await questionService.updateQuestion(identifier, req.body, adminContext);

    if (!question) {
      res.status(404).json({
        success: false,
        message: 'Question not found',
        error: 'QUESTION_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: question,
    });
  } catch (error: any) {
    logger.error('Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Update Question Status
 * PATCH /api/v1/admin/questions/:identifier/status
 */
export async function updateQuestionStatus(req: Request, res: Response): Promise<void> {
  try {
    const { identifier } = req.params;
    const { status, reason } = req.body;
    const adminContext = getAdminContext(req);

    const question = await questionService.updateQuestionStatus(
      identifier,
      status as QuestionStatus,
      adminContext,
      reason
    );

    if (!question) {
      res.status(404).json({
        success: false,
        message: 'Question not found',
        error: 'QUESTION_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Question status updated successfully',
      data: question,
    });
  } catch (error: any) {
    logger.error('Update question status error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Delete Question (Archive)
 * DELETE /api/v1/admin/questions/:identifier
 */
export async function deleteQuestion(req: Request, res: Response): Promise<void> {
  try {
    const { identifier } = req.params;
    const { reason } = req.body;
    const adminContext = getAdminContext(req);

    const deleted = await questionService.deleteQuestion(identifier, adminContext, reason);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Question not found',
        error: 'QUESTION_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Question archived successfully',
    });
  } catch (error: any) {
    logger.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Bulk Delete Questions by Module and Micro-skill
 * DELETE /api/v1/admin/questions/bulk
 */
export async function bulkDeleteQuestions(req: Request, res: Response): Promise<void> {
  try {
    const { module_id, micro_skill_id, reason } = req.body;
    const adminContext = getAdminContext(req);

    if (module_id === undefined || micro_skill_id === undefined) {
      res.status(400).json({
        success: false,
        message: 'module_id and micro_skill_id are required',
        error: 'MISSING_PARAMETERS',
      });
      return;
    }

    const result = await questionService.bulkDeleteQuestionsByMicroSkill(
      module_id,
      micro_skill_id,
      adminContext,
      reason
    );

    res.status(200).json({
      success: true,
      message: `${result.deleted_count} questions archived successfully`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Bulk delete questions error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Restore Question
 * POST /api/v1/admin/questions/:identifier/restore
 */
export async function restoreQuestion(req: Request, res: Response): Promise<void> {
  try {
    const { identifier } = req.params;
    const adminContext = getAdminContext(req);

    const question = await questionService.restoreQuestion(identifier, adminContext);

    if (!question) {
      res.status(404).json({
        success: false,
        message: 'Question not found',
        error: 'QUESTION_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Question restored successfully',
      data: question,
    });
  } catch (error: any) {
    logger.error('Restore question error:', error);

    if (error.message.includes('not archived')) {
      res.status(400).json({
        success: false,
        message: error.message,
        error: 'QUESTION_NOT_ARCHIVED',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * List Questions
 * GET /api/v1/admin/questions
 */
export async function listQuestions(req: Request, res: Response): Promise<void> {
  try {
    const result = await questionService.listQuestions(req.query as any);

    res.status(200).json({
      success: true,
      data: result.questions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: result.total_pages,
      },
    });
  } catch (error: any) {
    logger.error('List questions error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Get Question Statistics
 * GET /api/v1/admin/questions/stats
 */
export async function getQuestionStats(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await questionService.getQuestionStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Get question stats error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

// ============================================================================
// AUDIT CONTROLLERS
// ============================================================================

/**
 * Get Question History
 * GET /api/v1/admin/audit/questions/:questionId
 */
export async function getQuestionHistory(req: Request, res: Response): Promise<void> {
  try {
    const { questionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await auditService.getQuestionHistory(questionId, limit);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    logger.error('Get question history error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Get Admin Activity
 * GET /api/v1/admin/audit/admins/:adminId
 */
export async function getAdminActivity(req: Request, res: Response): Promise<void> {
  try {
    const { adminId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const activity = await auditService.getAdminActivity(adminId, limit);

    res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error: any) {
    logger.error('Get admin activity error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Get Recent Activity
 * GET /api/v1/admin/audit/recent
 */
export async function getRecentActivity(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const activity = await auditService.getRecentActivity(limit);

    res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error: any) {
    logger.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Get Activity Summary
 * GET /api/v1/admin/audit/summary
 */
export async function getActivitySummary(req: Request, res: Response): Promise<void> {
  try {
    const startDate = req.query.start_date
      ? new Date(req.query.start_date as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const endDate = req.query.end_date
      ? new Date(req.query.end_date as string)
      : new Date();

    const summary = await auditService.getActivitySummary(startDate, endDate);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    logger.error('Get activity summary error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

// ============================================================================
// IMPORT CONTROLLERS
// ============================================================================

/**
 * Initialize Bulk Import
 * POST /api/v1/admin/import
 */
export async function initializeImport(req: Request, res: Response): Promise<void> {
  try {
    const { file_type, questions } = req.body;
    const adminContext = getAdminContext(req);

    // For JSON imports, questions are provided in the body
    if (file_type === ImportFileType.JSON && questions) {
      // Create batch
      const batch = await importService.initializeBatch(
        'json_import.json',
        ImportFileType.JSON,
        questions.length,
        adminContext
      );

      // Validate questions
      const validation = await importService.validateQuestions(batch.batch_id, questions);

      if (validation.invalid.length > 0) {
        res.status(200).json({
          success: true,
          message: 'Validation completed with errors',
          data: {
            batch_id: batch.batch_id,
            validation: batch.validation_summary,
            errors: validation.invalid,
            warnings: validation.warnings,
          },
        });
        return;
      }

      // Process import (async - start processing)
      importService.processImport(batch.batch_id, validation.valid, adminContext);

      res.status(202).json({
        success: true,
        message: 'Import started',
        data: {
          batch_id: batch.batch_id,
          total_questions: questions.length,
          valid_questions: validation.valid.length,
        },
      });
    } else {
      // For CSV/Excel, file would be handled differently (file upload)
      res.status(400).json({
        success: false,
        message: 'File upload not implemented yet. Use JSON format with questions in body.',
        error: 'NOT_IMPLEMENTED',
      });
    }
  } catch (error: any) {
    logger.error('Initialize import error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Get Import Progress
 * GET /api/v1/admin/import/:batchId/progress
 */
export async function getImportProgress(req: Request, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const progress = await importService.getImportProgress(batchId);

    if (!progress) {
      res.status(404).json({
        success: false,
        message: 'Import batch not found',
        error: 'BATCH_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    logger.error('Get import progress error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Get Import History
 * GET /api/v1/admin/import/history
 */
export async function getImportHistory(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.admin!.admin_id;
    const limit = parseInt(req.query.limit as string) || 20;

    const imports = await importService.getAdminImports(adminId, limit);

    res.status(200).json({
      success: true,
      data: { imports },
    });
  } catch (error: any) {
    logger.error('Get import history error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Cancel Import
 * POST /api/v1/admin/import/:batchId/cancel
 */
export async function cancelImport(req: Request, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const cancelled = await importService.cancelImport(batchId);

    if (!cancelled) {
      res.status(404).json({
        success: false,
        message: 'Import batch not found',
        error: 'BATCH_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Import cancelled successfully',
    });
  } catch (error: any) {
    logger.error('Cancel import error:', error);

    if (error.message.includes('Cannot cancel')) {
      res.status(400).json({
        success: false,
        message: error.message,
        error: 'CANNOT_CANCEL',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Rollback Import
 * POST /api/v1/admin/import/:batchId/rollback
 */
export async function rollbackImport(req: Request, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const adminContext = getAdminContext(req);

    const result = await importService.rollbackImport(batchId, adminContext);

    res.status(200).json({
      success: true,
      message: `Import rolled back. ${result.rolled_back_count} questions deleted.`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Rollback import error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'INTERNAL_ERROR',
    });
  }
}

// ============================================================================
// CURRICULUM DATA
// ============================================================================

/**
 * Get Curriculum Data (Modules & Micro-Skills)
 * GET /api/v1/admin/curriculum
 *
 * Returns all modules and their micro-skills for the question form dropdowns.
 * This endpoint returns the complete curriculum structure regardless of
 * whether questions exist for each skill.
 */
/**
 * Get Curriculum Data (Modules & Micro-Skills)
 * GET /api/v1/admin/curriculum
 *
 * Returns all modules and their micro-skills from the database.
 * Falls back to static data file if database is empty (for seeding).
 */
export async function getCurriculum(_req: Request, res: Response): Promise<void> {
  try {
    // Get modules from database
    const dbModules = await curriculumService.getAllModules();
    const dbModuleIds = new Set(dbModules.map((m) => m.module_id));

    // Get static modules and filter out any that exist in database (DB takes priority)
    const { MODULES_DATA } = await import('../../data/modules.data');
    const staticModulesFiltered = MODULES_DATA.filter((m) => !dbModuleIds.has(m.module_id));

    // Transform static modules to frontend format
    const staticCurriculum = staticModulesFiltered.map((module) => ({
      id: module.module_id,
      name: module.name,
      description: module.description,
      difficulty_level: module.difficulty_level,
      micro_skills: module.micro_skills.map((skill) => ({
        id: skill.micro_skill_id,
        name: skill.name,
        description: skill.description,
        estimated_time_minutes: skill.estimated_time_minutes,
        prerequisites: skill.prerequisites,
      })),
      source: 'static' as const,
    }));

    // Transform database modules to frontend format
    const dbCurriculum = dbModules.map((module) => ({
      id: module.module_id,
      name: module.name,
      description: module.description,
      difficulty_level: module.difficulty_level,
      micro_skills: module.micro_skills
        .filter((skill) => skill.is_active)
        .map((skill) => ({
          id: skill.micro_skill_id,
          name: skill.name,
          description: skill.description,
          estimated_time_minutes: skill.estimated_time_minutes,
          prerequisites: skill.prerequisites,
        })),
      source: 'database' as const,
    }));

    // Merge and sort by module_id
    const curriculum = [...staticCurriculum, ...dbCurriculum].sort((a, b) => a.id - b.id);

    res.status(200).json({
      success: true,
      data: {
        modules: curriculum,
        total_modules: curriculum.length,
        total_micro_skills: curriculum.reduce((sum, m) => sum + m.micro_skills.length, 0),
        source: dbModules.length > 0 ? 'mixed' : 'static',
      },
    });
  } catch (error: unknown) {
    logger.error('Error fetching curriculum:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch curriculum data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create a new module
 * POST /api/v1/admin/curriculum/modules
 */
export async function createModule(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, difficulty_level, estimated_completion_hours } = req.body;
    const adminContext = getAdminContext(req);

    const module = await curriculumService.createModule({
      name,
      description,
      difficulty_level,
      estimated_completion_hours,
      created_by: adminContext.admin_id,
    });

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: {
        module: {
          id: module.module_id,
          name: module.name,
          description: module.description,
          difficulty_level: module.difficulty_level,
          micro_skills: [],
        },
      },
    });
  } catch (error: unknown) {
    logger.error('Error creating module:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create module',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create a new micro-skill in a module
 * POST /api/v1/admin/curriculum/modules/:moduleId/micro-skills
 */
export async function createMicroSkill(req: Request, res: Response): Promise<void> {
  try {
    const moduleId = parseInt(req.params.moduleId, 10);
    const { name, description, estimated_time_minutes, prerequisites } = req.body;
    const adminContext = getAdminContext(req);

    // Check if module exists
    const moduleExists = await curriculumService.moduleExists(moduleId);
    if (!moduleExists) {
      res.status(404).json({
        success: false,
        message: `Module ${moduleId} not found`,
      });
      return;
    }

    const microSkill = await curriculumService.createMicroSkill({
      module_id: moduleId,
      name,
      description,
      estimated_time_minutes,
      prerequisites,
      created_by: adminContext.admin_id,
    });

    res.status(201).json({
      success: true,
      message: 'Micro-skill created successfully',
      data: {
        micro_skill: {
          id: microSkill.micro_skill_id,
          name: microSkill.name,
          description: microSkill.description,
          estimated_time_minutes: microSkill.estimated_time_minutes,
          prerequisites: microSkill.prerequisites,
        },
        module_id: moduleId,
      },
    });
  } catch (error: unknown) {
    logger.error('Error creating micro-skill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create micro-skill',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get next available IDs for module and micro-skill
 * GET /api/v1/admin/curriculum/next-ids
 */
export async function getNextCurriculumIds(_req: Request, res: Response): Promise<void> {
  try {
    const nextModuleId = await curriculumService.getNextModuleId();
    const nextMicroSkillId = await curriculumService.getNextMicroSkillId();

    res.status(200).json({
      success: true,
      data: {
        next_module_id: nextModuleId,
        next_micro_skill_id: nextMicroSkillId,
      },
    });
  } catch (error: unknown) {
    logger.error('Error fetching next curriculum IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch next IDs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Seed curriculum from static file to database
 * POST /api/v1/admin/curriculum/seed
 */
export async function seedCurriculum(req: Request, res: Response): Promise<void> {
  try {
    const adminContext = getAdminContext(req);

    // Check if curriculum already exists in DB
    const existingModules = await curriculumService.getAllModules(true);
    if (existingModules.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Curriculum already exists in database. Delete existing data first if you want to re-seed.',
        data: {
          existing_modules: existingModules.length,
        },
      });
      return;
    }

    // Import static data
    const { MODULES_DATA } = await import('../../data/modules.data');
    const { ModuleModel } = await import('../../models/curriculum.model');

    // Insert all modules
    const modulesToInsert = MODULES_DATA.map((module) => ({
      module_id: module.module_id,
      name: module.name,
      description: module.description,
      difficulty_level: module.difficulty_level,
      estimated_completion_hours: module.estimated_completion_hours,
      micro_skills: module.micro_skills.map((skill) => ({
        micro_skill_id: skill.micro_skill_id,
        name: skill.name,
        description: skill.description,
        estimated_time_minutes: skill.estimated_time_minutes,
        prerequisites: skill.prerequisites,
        is_active: true,
      })),
      is_active: true,
      created_by: adminContext.admin_id,
    }));

    await ModuleModel.insertMany(modulesToInsert);

    const stats = await curriculumService.getStats();

    res.status(201).json({
      success: true,
      message: 'Curriculum seeded successfully',
      data: stats,
    });
  } catch (error: unknown) {
    logger.error('Error seeding curriculum:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed curriculum',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  // Auth
  adminLogin,
  adminRefreshToken,
  getAdminProfile,

  // Admin management
  createAdmin,
  listAdmins,
  updateAdmin,
  deleteAdmin,

  // Questions
  createQuestion,
  getQuestion,
  updateQuestion,
  updateQuestionStatus,
  deleteQuestion,
  bulkDeleteQuestions,
  restoreQuestion,
  listQuestions,
  getQuestionStats,

  // Audit
  getQuestionHistory,
  getAdminActivity,
  getRecentActivity,
  getActivitySummary,

  // Import
  initializeImport,
  getImportProgress,
  getImportHistory,
  cancelImport,
  rollbackImport,

  // Curriculum
  getCurriculum,
  createModule,
  createMicroSkill,
  getNextCurriculumIds,
  seedCurriculum,
};
