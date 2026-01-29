/**
 * ADMIN AUDIT SERVICE
 *
 * Handles audit trail queries and reporting.
 * Provides methods to view question history and admin activity.
 */

import { QuestionAuditModel, AuditAction } from '../../models/questionAudit.model';
import logger from '../../utils/logger.util';

// ============================================================================
// TYPES
// ============================================================================

export interface AuditQueryParams {
  admin_id?: string;
  action?: AuditAction;
  start_date?: Date;
  end_date?: Date;
  limit: number;
}

export interface AuditSummary {
  total_actions: number;
  by_action: Record<string, number>;
  by_admin: Array<{ admin_id: string; admin_name: string; count: number }>;
  recent_activity: any[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AuditService {
  /**
   * Get change history for a specific question
   */
  async getQuestionHistory(questionId: string, limit: number = 50): Promise<any[]> {
    try {
      const history = await QuestionAuditModel.find({ question_id: questionId })
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      return history;
    } catch (error: any) {
      logger.error('Error getting question history:', error);
      throw error;
    }
  }

  /**
   * Get activity by a specific admin
   */
  async getAdminActivity(adminId: string, limit: number = 100): Promise<any[]> {
    try {
      const activity = await QuestionAuditModel.find({ admin_id: adminId })
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      return activity;
    } catch (error: any) {
      logger.error('Error getting admin activity:', error);
      throw error;
    }
  }

  /**
   * Get recent activity across all admins
   */
  async getRecentActivity(limit: number = 50): Promise<any[]> {
    try {
      const activity = await QuestionAuditModel.find()
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      return activity;
    } catch (error: any) {
      logger.error('Error getting recent activity:', error);
      throw error;
    }
  }

  /**
   * Search audit logs with filters
   */
  async searchAuditLogs(params: AuditQueryParams): Promise<any[]> {
    try {
      const filter: any = {};

      if (params.admin_id) {
        filter.admin_id = params.admin_id;
      }

      if (params.action) {
        filter.action = params.action;
      }

      if (params.start_date || params.end_date) {
        filter.created_at = {};
        if (params.start_date) {
          filter.created_at['$gte'] = params.start_date;
        }
        if (params.end_date) {
          filter.created_at['$lte'] = params.end_date;
        }
      }

      const logs = await QuestionAuditModel.find(filter)
        .sort({ created_at: -1 })
        .limit(params.limit)
        .lean();

      return logs;
    } catch (error: any) {
      logger.error('Error searching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get activity summary for a date range
   */
  async getActivitySummary(startDate: Date, endDate: Date): Promise<AuditSummary> {
    try {
      // Get counts by action type
      const byAction = await QuestionAuditModel.aggregate([
        {
          $match: {
            created_at: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
          },
        },
      ]);

      // Get counts by admin
      const byAdmin = await QuestionAuditModel.aggregate([
        {
          $match: {
            created_at: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { admin_id: '$admin_id', admin_name: '$admin_name' },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      // Get total count
      const totalActions = await QuestionAuditModel.countDocuments({
        created_at: { $gte: startDate, $lte: endDate },
      });

      // Get recent activity
      const recentActivity = await QuestionAuditModel.find({
        created_at: { $gte: startDate, $lte: endDate },
      })
        .sort({ created_at: -1 })
        .limit(20)
        .lean();

      return {
        total_actions: totalActions,
        by_action: Object.fromEntries(byAction.map((a) => [a._id, a.count])),
        by_admin: byAdmin.map((a) => ({
          admin_id: a._id.admin_id,
          admin_name: a._id.admin_name,
          count: a.count,
        })),
        recent_activity: recentActivity,
      };
    } catch (error: any) {
      logger.error('Error getting activity summary:', error);
      throw error;
    }
  }

  /**
   * Get activity for questions modified by a specific batch import
   */
  async getBatchImportActivity(batchId: string): Promise<any[]> {
    try {
      const activity = await QuestionAuditModel.find({
        'metadata.batch_id': batchId,
      })
        .sort({ created_at: -1 })
        .lean();

      return activity;
    } catch (error: any) {
      logger.error('Error getting batch import activity:', error);
      throw error;
    }
  }

  /**
   * Get daily activity counts for the last N days
   */
  async getDailyActivityCounts(days: number = 30): Promise<Array<{
    date: string;
    count: number;
    by_action: Record<string, number>;
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const dailyCounts = await QuestionAuditModel.aggregate([
        {
          $match: {
            created_at: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
              action: '$action',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.date',
            total: { $sum: '$count' },
            actions: {
              $push: { action: '$_id.action', count: '$count' },
            },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      return dailyCounts.map((day) => ({
        date: day._id,
        count: day.total,
        by_action: Object.fromEntries(day.actions.map((a: any) => [a.action, a.count])),
      }));
    } catch (error: any) {
      logger.error('Error getting daily activity counts:', error);
      throw error;
    }
  }

  /**
   * Get questions that were modified most frequently
   */
  async getMostModifiedQuestions(limit: number = 10): Promise<Array<{
    question_id: string;
    question_code: string;
    modification_count: number;
  }>> {
    try {
      const result = await QuestionAuditModel.aggregate([
        {
          $match: {
            action: { $in: [AuditAction.UPDATED, AuditAction.STATUS_CHANGED] },
          },
        },
        {
          $group: {
            _id: { question_id: '$question_id', question_code: '$question_code' },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      return result.map((r) => ({
        question_id: r._id.question_id,
        question_code: r._id.question_code,
        modification_count: r.count,
      }));
    } catch (error: any) {
      logger.error('Error getting most modified questions:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();
