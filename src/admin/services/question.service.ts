/**
 * ADMIN QUESTION SERVICE
 *
 * Handles CRUD operations for questions from the admin dashboard.
 * Creates audit trails for all changes.
 */

import { QuestionModel } from '../../models/question.model';
import { QuestionAuditModel, AuditAction } from '../../models/questionAudit.model';
import { IQuestion, QuestionStatus, QuestionType } from '../../types';
import logger from '../../utils/logger.util';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateQuestionInput {
  question_code?: string;
  module_id: number;
  micro_skill_id: number;
  question_data: {
    text: string;
    type: QuestionType;
    options?: string[];
    correct_answer: string | number;
    solution_steps: Array<{
      step: number;
      action: string;
      calculation: string;
      result: string | number;
    }>;
    hints?: Array<{
      level: number;
      text: string;
    }>;
  };
  metadata: {
    difficulty_level: number;
    expected_time_seconds: number;
    points: number;
    tags?: string[];
    prerequisites?: string[];
    common_errors?: Array<{
      type: string;
      frequency: number;
      description: string;
    }>;
  };
  status?: QuestionStatus;
}

export interface UpdateQuestionInput {
  module_id?: number;
  micro_skill_id?: number;
  question_data?: Partial<CreateQuestionInput['question_data']>;
  metadata?: Partial<CreateQuestionInput['metadata']>;
  status?: QuestionStatus;
}

export interface ListQuestionsParams {
  page: number;
  limit: number;
  module_id?: number;
  micro_skill_id?: number;
  status?: QuestionStatus;
  difficulty_min?: number;
  difficulty_max?: number;
  type?: QuestionType;
  search?: string;
  tags?: string | string[];
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

export interface AdminContext {
  admin_id: string;
  admin_name: string;
  ip_address?: string;
  user_agent?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class QuestionService {
  /**
   * Generate unique question code
   */
  private async generateQuestionCode(moduleId: number, microSkillId: number): Promise<string> {
    // Count existing questions for this module/skill combo
    const count = await QuestionModel.countDocuments({
      module_id: moduleId,
      micro_skill_id: microSkillId,
    });

    const questionNumber = count + 1;
    return `M${moduleId}_MS${microSkillId}_Q${questionNumber}`;
  }

  /**
   * Create a new question
   */
  async createQuestion(
    input: CreateQuestionInput,
    adminContext: AdminContext
  ): Promise<IQuestion> {
    try {
      // Generate question code if not provided
      const questionCode =
        input.question_code ||
        (await this.generateQuestionCode(input.module_id, input.micro_skill_id));

      // Check for duplicate question code
      const existing = await QuestionModel.findOne({ question_code: questionCode });
      if (existing) {
        throw new Error(`Question code ${questionCode} already exists`);
      }

      // Create the question
      const question = new QuestionModel({
        question_code: questionCode,
        module_id: input.module_id,
        micro_skill_id: input.micro_skill_id,
        question_data: {
          text: input.question_data.text,
          type: input.question_data.type,
          options: input.question_data.options || [],
          correct_answer: input.question_data.correct_answer,
          solution_steps: input.question_data.solution_steps,
          hints: input.question_data.hints || [],
        },
        metadata: {
          difficulty_level: input.metadata.difficulty_level,
          expected_time_seconds: input.metadata.expected_time_seconds,
          actual_avg_time: 0,
          points: input.metadata.points,
          tags: input.metadata.tags || [],
          prerequisites: input.metadata.prerequisites || [],
          common_errors: input.metadata.common_errors || [],
        },
        performance: {
          total_attempts: 0,
          success_rate: 0,
          avg_hints_used: 0,
          abandon_rate: 0,
        },
        status: input.status || QuestionStatus.DRAFT,
      });

      await question.save();

      // Create audit entry
      await this.createAuditEntry(
        question._id.toString(),
        questionCode,
        AuditAction.CREATED,
        adminContext,
        [],
        undefined
      );

      logger.info(`Question created: ${questionCode} by admin ${adminContext.admin_id}`);
      return question;
    } catch (error: any) {
      logger.error('Error creating question:', error);
      throw error;
    }
  }

  /**
   * Get question by ID or code
   */
  async getQuestion(identifier: string): Promise<IQuestion | null> {
    try {
      // Try to find by question_code first
      let question = await QuestionModel.findOne({ question_code: identifier });

      // If not found, try by MongoDB _id
      if (!question) {
        question = await QuestionModel.findById(identifier);
      }

      return question;
    } catch (error: any) {
      logger.error('Error getting question:', error);
      throw error;
    }
  }

  /**
   * Update a question
   */
  async updateQuestion(
    identifier: string,
    updates: UpdateQuestionInput,
    adminContext: AdminContext
  ): Promise<IQuestion | null> {
    try {
      // Get the existing question
      const question = await this.getQuestion(identifier);
      if (!question) {
        return null;
      }

      // Track changes for audit
      const changes: Array<{ field: string; old_value: any; new_value: any }> = [];

      // Apply updates and track changes
      if (updates.module_id !== undefined && updates.module_id !== question.module_id) {
        changes.push({
          field: 'module_id',
          old_value: question.module_id,
          new_value: updates.module_id,
        });
        question.module_id = updates.module_id;
      }

      if (updates.micro_skill_id !== undefined && updates.micro_skill_id !== question.micro_skill_id) {
        changes.push({
          field: 'micro_skill_id',
          old_value: question.micro_skill_id,
          new_value: updates.micro_skill_id,
        });
        question.micro_skill_id = updates.micro_skill_id;
      }

      if (updates.status !== undefined && updates.status !== question.status) {
        changes.push({
          field: 'status',
          old_value: question.status,
          new_value: updates.status,
        });
        question.status = updates.status;
      }

      // Handle question_data updates
      if (updates.question_data) {
        const qd = updates.question_data;
        if (qd.text !== undefined && qd.text !== question.question_data.text) {
          changes.push({
            field: 'question_data.text',
            old_value: question.question_data.text,
            new_value: qd.text,
          });
          question.question_data.text = qd.text;
        }
        if (qd.type !== undefined && qd.type !== question.question_data.type) {
          changes.push({
            field: 'question_data.type',
            old_value: question.question_data.type,
            new_value: qd.type,
          });
          question.question_data.type = qd.type;
        }
        if (qd.options !== undefined) {
          changes.push({
            field: 'question_data.options',
            old_value: question.question_data.options,
            new_value: qd.options,
          });
          question.question_data.options = qd.options;
        }
        if (qd.correct_answer !== undefined) {
          changes.push({
            field: 'question_data.correct_answer',
            old_value: question.question_data.correct_answer,
            new_value: qd.correct_answer,
          });
          question.question_data.correct_answer = qd.correct_answer;
        }
        if (qd.solution_steps !== undefined) {
          changes.push({
            field: 'question_data.solution_steps',
            old_value: question.question_data.solution_steps,
            new_value: qd.solution_steps,
          });
          question.question_data.solution_steps = qd.solution_steps;
        }
        if (qd.hints !== undefined) {
          changes.push({
            field: 'question_data.hints',
            old_value: question.question_data.hints,
            new_value: qd.hints,
          });
          question.question_data.hints = qd.hints;
        }
      }

      // Handle metadata updates
      if (updates.metadata) {
        const md = updates.metadata;
        if (md.difficulty_level !== undefined && md.difficulty_level !== question.metadata.difficulty_level) {
          changes.push({
            field: 'metadata.difficulty_level',
            old_value: question.metadata.difficulty_level,
            new_value: md.difficulty_level,
          });
          question.metadata.difficulty_level = md.difficulty_level;
        }
        if (md.expected_time_seconds !== undefined && md.expected_time_seconds !== question.metadata.expected_time_seconds) {
          changes.push({
            field: 'metadata.expected_time_seconds',
            old_value: question.metadata.expected_time_seconds,
            new_value: md.expected_time_seconds,
          });
          question.metadata.expected_time_seconds = md.expected_time_seconds;
        }
        if (md.points !== undefined && md.points !== question.metadata.points) {
          changes.push({
            field: 'metadata.points',
            old_value: question.metadata.points,
            new_value: md.points,
          });
          question.metadata.points = md.points;
        }
        if (md.tags !== undefined) {
          changes.push({
            field: 'metadata.tags',
            old_value: question.metadata.tags,
            new_value: md.tags,
          });
          question.metadata.tags = md.tags;
        }
        if (md.prerequisites !== undefined) {
          changes.push({
            field: 'metadata.prerequisites',
            old_value: question.metadata.prerequisites,
            new_value: md.prerequisites,
          });
          question.metadata.prerequisites = md.prerequisites;
        }
        if (md.common_errors !== undefined) {
          changes.push({
            field: 'metadata.common_errors',
            old_value: question.metadata.common_errors,
            new_value: md.common_errors,
          });
          question.metadata.common_errors = md.common_errors;
        }
      }

      // Only save if there are changes
      if (changes.length > 0) {
        await question.save();

        // Create audit entry
        await this.createAuditEntry(
          question._id.toString(),
          question.question_code,
          AuditAction.UPDATED,
          adminContext,
          changes,
          undefined
        );

        logger.info(`Question updated: ${question.question_code} by admin ${adminContext.admin_id}`);
      }

      return question;
    } catch (error: any) {
      logger.error('Error updating question:', error);
      throw error;
    }
  }

  /**
   * Update question status
   */
  async updateQuestionStatus(
    identifier: string,
    newStatus: QuestionStatus,
    adminContext: AdminContext,
    reason?: string
  ): Promise<IQuestion | null> {
    try {
      const question = await this.getQuestion(identifier);
      if (!question) {
        return null;
      }

      const oldStatus = question.status;
      if (oldStatus === newStatus) {
        return question; // No change needed
      }

      question.status = newStatus;
      await question.save();

      // Create audit entry for status change
      await this.createAuditEntry(
        question._id.toString(),
        question.question_code,
        AuditAction.STATUS_CHANGED,
        adminContext,
        [{ field: 'status', old_value: oldStatus, new_value: newStatus }],
        reason
      );

      logger.info(
        `Question status changed: ${question.question_code} from ${oldStatus} to ${newStatus} by admin ${adminContext.admin_id}`
      );

      return question;
    } catch (error: any) {
      logger.error('Error updating question status:', error);
      throw error;
    }
  }

  /**
   * Soft delete a question (set status to archived)
   */
  async deleteQuestion(
    identifier: string,
    adminContext: AdminContext,
    reason?: string
  ): Promise<boolean> {
    try {
      const question = await this.getQuestion(identifier);
      if (!question) {
        return false;
      }

      const oldStatus = question.status;
      question.status = QuestionStatus.ARCHIVED;
      await question.save();

      // Create audit entry
      await this.createAuditEntry(
        question._id.toString(),
        question.question_code,
        AuditAction.DELETED,
        adminContext,
        [{ field: 'status', old_value: oldStatus, new_value: QuestionStatus.ARCHIVED }],
        reason
      );

      logger.info(`Question deleted (archived): ${question.question_code} by admin ${adminContext.admin_id}`);
      return true;
    } catch (error: any) {
      logger.error('Error deleting question:', error);
      throw error;
    }
  }

  /**
   * Restore an archived question
   */
  async restoreQuestion(
    identifier: string,
    adminContext: AdminContext
  ): Promise<IQuestion | null> {
    try {
      const question = await this.getQuestion(identifier);
      if (!question) {
        return null;
      }

      if (question.status !== QuestionStatus.ARCHIVED) {
        throw new Error('Question is not archived');
      }

      question.status = QuestionStatus.DRAFT;
      await question.save();

      // Create audit entry
      await this.createAuditEntry(
        question._id.toString(),
        question.question_code,
        AuditAction.RESTORED,
        adminContext,
        [{ field: 'status', old_value: QuestionStatus.ARCHIVED, new_value: QuestionStatus.DRAFT }],
        undefined
      );

      logger.info(`Question restored: ${question.question_code} by admin ${adminContext.admin_id}`);
      return question;
    } catch (error: any) {
      logger.error('Error restoring question:', error);
      throw error;
    }
  }

  /**
   * List questions with filters and pagination
   */
  async listQuestions(params: ListQuestionsParams): Promise<{
    questions: any[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    try {
      // Build filter query
      const filter: any = {};

      if (params.module_id !== undefined) {
        filter.module_id = params.module_id;
      }

      if (params.micro_skill_id !== undefined) {
        filter.micro_skill_id = params.micro_skill_id;
      }

      if (params.status) {
        filter.status = params.status;
      }

      if (params.type) {
        filter['question_data.type'] = params.type;
      }

      // Difficulty range filter
      if (params.difficulty_min !== undefined || params.difficulty_max !== undefined) {
        filter['metadata.difficulty_level'] = {};
        if (params.difficulty_min !== undefined) {
          filter['metadata.difficulty_level']['$gte'] = params.difficulty_min;
        }
        if (params.difficulty_max !== undefined) {
          filter['metadata.difficulty_level']['$lte'] = params.difficulty_max;
        }
      }

      // Tags filter
      if (params.tags) {
        const tagsArray = Array.isArray(params.tags) ? params.tags : [params.tags];
        filter['metadata.tags'] = { $in: tagsArray };
      }

      // Text search (basic contains search)
      if (params.search) {
        filter['$or'] = [
          { 'question_data.text': { $regex: params.search, $options: 'i' } },
          { question_code: { $regex: params.search, $options: 'i' } },
        ];
      }

      // Build sort
      const sortField = params.sort_by === 'difficulty_level' ? 'metadata.difficulty_level' : params.sort_by === 'created_at' ? 'createdAt' : params.sort_by === 'updated_at' ? 'updatedAt' : params.sort_by;
      const sortDirection = params.sort_order === 'asc' ? 1 : -1;
      const sort: any = { [sortField]: sortDirection };

      // Execute query with pagination
      const skip = (params.page - 1) * params.limit;

      const [questions, total] = await Promise.all([
        QuestionModel.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(params.limit)
          .lean(),
        QuestionModel.countDocuments(filter),
      ]);

      return {
        questions: questions,
        total,
        page: params.page,
        limit: params.limit,
        total_pages: Math.ceil(total / params.limit),
      };
    } catch (error: any) {
      logger.error('Error listing questions:', error);
      throw error;
    }
  }

  /**
   * Get question statistics
   */
  async getQuestionStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_module: Record<number, number>;
    by_difficulty: Record<number, number>;
    by_type: Record<string, number>;
  }> {
    try {
      const [total, byStatus, byModule, byDifficulty, byType] = await Promise.all([
        QuestionModel.countDocuments(),
        QuestionModel.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        QuestionModel.aggregate([
          { $group: { _id: '$module_id', count: { $sum: 1 } } },
        ]),
        QuestionModel.aggregate([
          { $group: { _id: '$metadata.difficulty_level', count: { $sum: 1 } } },
        ]),
        QuestionModel.aggregate([
          { $group: { _id: '$question_data.type', count: { $sum: 1 } } },
        ]),
      ]);

      return {
        total,
        by_status: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
        by_module: Object.fromEntries(byModule.map((m) => [m._id, m.count])),
        by_difficulty: Object.fromEntries(byDifficulty.map((d) => [d._id, d.count])),
        by_type: Object.fromEntries(byType.map((t) => [t._id, t.count])),
      };
    } catch (error: any) {
      logger.error('Error getting question stats:', error);
      throw error;
    }
  }

  /**
   * Create audit entry helper
   */
  private async createAuditEntry(
    questionId: string,
    questionCode: string,
    action: AuditAction,
    adminContext: AdminContext,
    changes: Array<{ field: string; old_value: any; new_value: any }>,
    reason?: string,
    batchId?: string
  ): Promise<void> {
    try {
      await QuestionAuditModel.create({
        question_id: questionId,
        question_code: questionCode,
        action,
        admin_id: adminContext.admin_id,
        admin_name: adminContext.admin_name,
        changes,
        metadata: {
          ip_address: adminContext.ip_address,
          user_agent: adminContext.user_agent,
          batch_id: batchId,
          reason,
        },
      });
    } catch (error) {
      // Log but don't throw - audit failure shouldn't fail the main operation
      logger.error('Error creating audit entry:', error);
    }
  }

  /**
   * Bulk delete questions by module and micro-skill
   * This performs a hard delete for bulk operations
   */
  async bulkDeleteQuestionsByMicroSkill(
    moduleId: number,
    microSkillId: number,
    adminContext: AdminContext,
    reason?: string
  ): Promise<{ deleted_count: number }> {
    try {
      // First, get all questions that match the criteria (excluding already archived)
      const questions = await QuestionModel.find({
        module_id: moduleId,
        micro_skill_id: microSkillId,
        status: { $ne: QuestionStatus.ARCHIVED },
      });

      if (questions.length === 0) {
        return { deleted_count: 0 };
      }

      // Create audit entries for each question being deleted
      const auditPromises = questions.map((question) =>
        this.createAuditEntry(
          question._id.toString(),
          question.question_code,
          AuditAction.DELETED,
          adminContext,
          [{ field: 'status', old_value: question.status, new_value: QuestionStatus.ARCHIVED }],
          reason || `Bulk deleted from Module ${moduleId}, Micro-skill ${microSkillId}`
        )
      );

      // Archive all matching questions (soft delete)
      const result = await QuestionModel.updateMany(
        {
          module_id: moduleId,
          micro_skill_id: microSkillId,
          status: { $ne: QuestionStatus.ARCHIVED },
        },
        { $set: { status: QuestionStatus.ARCHIVED } }
      );

      // Wait for all audit entries to be created
      await Promise.all(auditPromises);

      logger.info(
        `Bulk deleted ${result.modifiedCount} questions from Module ${moduleId}, Micro-skill ${microSkillId} by admin ${adminContext.admin_id}`
      );

      return { deleted_count: result.modifiedCount };
    } catch (error: any) {
      logger.error('Error bulk deleting questions:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const questionService = new QuestionService();
