/**
 * ADMIN IMPORT SERVICE
 *
 * Handles bulk import of questions.
 * Processes imports in chunks to avoid memory issues.
 * Provides progress tracking and error reporting.
 */

import {
  ImportBatchModel,
  ImportStatus,
  ImportFileType,
  IImportBatch,
  IImportError,
} from '../../models/importBatch.model';
import { QuestionAuditModel, AuditAction } from '../../models/questionAudit.model';
import { QuestionModel } from '../../models/question.model';
import { QuestionStatus } from '../../types';
import { createQuestionSchema } from '../validators/admin.validator';
import logger from '../../utils/logger.util';

// ============================================================================
// TYPES
// ============================================================================

export interface ImportQuestionInput {
  question_code?: string;
  module_id: number;
  micro_skill_id: number;
  question_data: {
    text: string;
    type: string;
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
  status?: string;
}

export interface AdminContext {
  admin_id: string;
  admin_name: string;
  ip_address?: string;
  user_agent?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHUNK_SIZE = 50; // Process 50 questions at a time

// ============================================================================
// SERVICE CLASS
// ============================================================================

class ImportService {
  /**
   * Initialize a new import batch
   */
  async initializeBatch(
    fileName: string,
    fileType: ImportFileType,
    totalRows: number,
    adminContext: AdminContext
  ): Promise<IImportBatch> {
    try {
      const batch = new ImportBatchModel({
        admin_id: adminContext.admin_id,
        admin_name: adminContext.admin_name,
        file_name: fileName,
        file_type: fileType,
        status: ImportStatus.PENDING,
        total_rows: totalRows,
        processed_rows: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        import_errors: [],
        import_warnings: [],
        created_question_ids: [],
      });

      await batch.save();

      logger.info(`Import batch created: ${batch.batch_id} by admin ${adminContext.admin_id}`);
      return batch;
    } catch (error: any) {
      logger.error('Error initializing import batch:', error);
      throw error;
    }
  }

  /**
   * Get import batch by ID
   */
  async getBatch(batchId: string): Promise<IImportBatch | null> {
    try {
      return await ImportBatchModel.findOne({ batch_id: batchId });
    } catch (error: any) {
      logger.error('Error getting import batch:', error);
      throw error;
    }
  }

  /**
   * Get recent imports by admin
   */
  async getAdminImports(adminId: string, limit: number = 20): Promise<any[]> {
    try {
      const imports = await ImportBatchModel.find({ admin_id: adminId })
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      return imports;
    } catch (error: any) {
      logger.error('Error getting admin imports:', error);
      throw error;
    }
  }

  /**
   * Validate questions before import
   */
  async validateQuestions(
    batchId: string,
    questions: ImportQuestionInput[]
  ): Promise<{
    valid: ImportQuestionInput[];
    invalid: Array<{ row: number; errors: string[] }>;
    warnings: Array<{ row: number; warnings: string[] }>;
  }> {
    try {
      const batch = await this.getBatch(batchId);
      if (!batch) {
        throw new Error('Batch not found');
      }

      // Update status to validating
      batch.status = ImportStatus.VALIDATING;
      await batch.save();

      const valid: ImportQuestionInput[] = [];
      const invalid: Array<{ row: number; errors: string[] }> = [];
      const warnings: Array<{ row: number; warnings: string[] }> = [];

      for (let i = 0; i < questions.length; i++) {
        const rowNumber = i + 1;
        const question = questions[i];
        const rowErrors: string[] = [];
        const rowWarnings: string[] = [];

        // Validate against schema
        const { error } = createQuestionSchema.validate(question, {
          abortEarly: false,
        });

        if (error) {
          error.details.forEach((detail) => {
            rowErrors.push(`${detail.path.join('.')}: ${detail.message}`);
          });
        }

        // Check for duplicate question codes
        if (question.question_code) {
          const existing = await QuestionModel.findOne({
            question_code: question.question_code,
          });
          if (existing) {
            rowWarnings.push(`Question code ${question.question_code} already exists - will generate new code`);
            delete question.question_code; // Remove to auto-generate
          }
        }

        // Check module/skill combination validity (basic check)
        if (question.module_id < 0 || question.module_id > 20) {
          rowErrors.push('Invalid module_id');
        }
        if (question.micro_skill_id < 1 || question.micro_skill_id > 74) {
          rowErrors.push('Invalid micro_skill_id');
        }

        if (rowErrors.length > 0) {
          invalid.push({ row: rowNumber, errors: rowErrors });
        } else {
          valid.push(question);
          if (rowWarnings.length > 0) {
            warnings.push({ row: rowNumber, warnings: rowWarnings });
          }
        }
      }

      // Update batch with validation summary
      batch.validation_summary = {
        valid: valid.length,
        invalid: invalid.length,
        warnings: warnings.length,
      };

      // Store validation errors in batch
      invalid.forEach((inv) => {
        inv.errors.forEach((err) => {
          batch.import_errors.push({
            row: inv.row,
            message: err,
          });
        });
      });

      warnings.forEach((warn) => {
        warn.warnings.forEach((w) => {
          batch.import_warnings.push({
            row: warn.row,
            message: w,
          });
        });
      });

      await batch.save();

      logger.info(`Validation complete for batch ${batchId}: ${valid.length} valid, ${invalid.length} invalid`);

      return { valid, invalid, warnings };
    } catch (error: any) {
      logger.error('Error validating questions:', error);
      throw error;
    }
  }

  /**
   * Process import - import questions in chunks
   */
  async processImport(
    batchId: string,
    questions: ImportQuestionInput[],
    adminContext: AdminContext
  ): Promise<void> {
    try {
      const batch = await this.getBatch(batchId);
      if (!batch) {
        throw new Error('Batch not found');
      }

      // Update status to processing
      batch.status = ImportStatus.PROCESSING;
      batch.started_at = new Date();
      await batch.save();

      logger.info(`Starting import for batch ${batchId}: ${questions.length} questions`);

      // Process in chunks
      for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
        const chunk = questions.slice(i, i + CHUNK_SIZE);
        await this.processChunk(batch, chunk, i, adminContext);

        // Small delay between chunks to avoid overwhelming the database
        if (i + CHUNK_SIZE < questions.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Finalize batch
      batch.completed_at = new Date();

      if (batch.failed > 0) {
        batch.status = ImportStatus.COMPLETED_WITH_ERRORS;
      } else {
        batch.status = ImportStatus.COMPLETED;
      }

      await batch.save();

      logger.info(
        `Import completed for batch ${batchId}: ${batch.successful} successful, ${batch.failed} failed, ${batch.skipped} skipped`
      );
    } catch (error: any) {
      logger.error(`Import failed for batch ${batchId}:`, error);

      // Update batch status to failed
      const batch = await this.getBatch(batchId);
      if (batch) {
        batch.status = ImportStatus.FAILED;
        batch.completed_at = new Date();
        batch.import_errors.push({
          row: 0,
          message: `Import failed: ${error.message}`,
        });
        await batch.save();
      }

      throw error;
    }
  }

  /**
   * Process a chunk of questions
   */
  private async processChunk(
    batch: IImportBatch,
    chunk: ImportQuestionInput[],
    startIndex: number,
    adminContext: AdminContext
  ): Promise<void> {
    for (let i = 0; i < chunk.length; i++) {
      const rowNumber = startIndex + i + 1;
      const questionInput = chunk[i];

      try {
        // Generate question code if not provided
        const questionCode =
          questionInput.question_code ||
          (await this.generateQuestionCode(
            questionInput.module_id,
            questionInput.micro_skill_id
          ));

        // Create the question
        const question = new QuestionModel({
          question_code: questionCode,
          module_id: questionInput.module_id,
          micro_skill_id: questionInput.micro_skill_id,
          question_data: {
            text: questionInput.question_data.text,
            type: questionInput.question_data.type,
            options: questionInput.question_data.options || [],
            correct_answer: questionInput.question_data.correct_answer,
            solution_steps: questionInput.question_data.solution_steps,
            hints: questionInput.question_data.hints || [],
          },
          metadata: {
            difficulty_level: questionInput.metadata.difficulty_level,
            expected_time_seconds: questionInput.metadata.expected_time_seconds,
            actual_avg_time: 0,
            points: questionInput.metadata.points,
            tags: questionInput.metadata.tags || [],
            prerequisites: questionInput.metadata.prerequisites || [],
            common_errors: questionInput.metadata.common_errors || [],
          },
          performance: {
            total_attempts: 0,
            success_rate: 0,
            avg_hints_used: 0,
            abandon_rate: 0,
          },
          status: (questionInput.status as QuestionStatus) || QuestionStatus.DRAFT,
        });

        await question.save();

        // Create audit entry
        await QuestionAuditModel.create({
          question_id: question._id.toString(),
          question_code: questionCode,
          action: AuditAction.BULK_IMPORTED,
          admin_id: adminContext.admin_id,
          admin_name: adminContext.admin_name,
          changes: [],
          metadata: {
            batch_id: batch.batch_id,
            ip_address: adminContext.ip_address,
            user_agent: adminContext.user_agent,
          },
        });

        // Update batch counters
        batch.successful += 1;
        batch.created_question_ids.push(question._id.toString());
      } catch (error: any) {
        logger.error(`Error importing question at row ${rowNumber}:`, error);

        batch.failed += 1;
        batch.import_errors.push({
          row: rowNumber,
          message: error.message || 'Unknown error',
        });
      }

      batch.processed_rows += 1;
    }

    // Save batch progress
    await batch.save();
  }

  /**
   * Generate unique question code
   */
  private async generateQuestionCode(moduleId: number, microSkillId: number): Promise<string> {
    const count = await QuestionModel.countDocuments({
      module_id: moduleId,
      micro_skill_id: microSkillId,
    });

    const questionNumber = count + 1;
    return `M${moduleId}_MS${microSkillId}_Q${questionNumber}`;
  }

  /**
   * Cancel an import
   */
  async cancelImport(batchId: string): Promise<boolean> {
    try {
      const batch = await this.getBatch(batchId);
      if (!batch) {
        return false;
      }

      if (batch.status === ImportStatus.COMPLETED || batch.status === ImportStatus.FAILED) {
        throw new Error('Cannot cancel completed or failed import');
      }

      batch.status = ImportStatus.CANCELLED;
      batch.completed_at = new Date();
      await batch.save();

      logger.info(`Import cancelled: ${batchId}`);
      return true;
    } catch (error: any) {
      logger.error('Error cancelling import:', error);
      throw error;
    }
  }

  /**
   * Get import progress
   */
  async getImportProgress(batchId: string): Promise<{
    batch_id: string;
    status: ImportStatus;
    progress_percentage: number;
    processed_rows: number;
    total_rows: number;
    successful: number;
    failed: number;
    skipped: number;
    errors: IImportError[];
    is_complete: boolean;
  } | null> {
    try {
      const batch = await this.getBatch(batchId);
      if (!batch) {
        return null;
      }

      const progressPercentage =
        batch.total_rows > 0
          ? Math.round((batch.processed_rows / batch.total_rows) * 100)
          : 0;

      const isComplete = [
        ImportStatus.COMPLETED,
        ImportStatus.COMPLETED_WITH_ERRORS,
        ImportStatus.FAILED,
        ImportStatus.CANCELLED,
      ].includes(batch.status);

      return {
        batch_id: batch.batch_id,
        status: batch.status,
        progress_percentage: progressPercentage,
        processed_rows: batch.processed_rows,
        total_rows: batch.total_rows,
        successful: batch.successful,
        failed: batch.failed,
        skipped: batch.skipped,
        errors: batch.import_errors.slice(-20), // Return last 20 errors
        is_complete: isComplete,
      };
    } catch (error: any) {
      logger.error('Error getting import progress:', error);
      throw error;
    }
  }

  /**
   * Rollback an import (delete all questions created by this batch)
   */
  async rollbackImport(batchId: string, adminContext: AdminContext): Promise<{
    rolled_back_count: number;
  }> {
    try {
      const batch = await this.getBatch(batchId);
      if (!batch) {
        throw new Error('Batch not found');
      }

      if (batch.created_question_ids.length === 0) {
        return { rolled_back_count: 0 };
      }

      // Delete all questions created by this batch
      const result = await QuestionModel.deleteMany({
        _id: { $in: batch.created_question_ids },
      });

      // Create audit entries for rollback
      for (const questionId of batch.created_question_ids) {
        await QuestionAuditModel.create({
          question_id: questionId,
          question_code: 'ROLLED_BACK',
          action: AuditAction.DELETED,
          admin_id: adminContext.admin_id,
          admin_name: adminContext.admin_name,
          changes: [],
          metadata: {
            batch_id: batch.batch_id,
            reason: 'Batch import rollback',
          },
        });
      }

      // Update batch
      batch.status = ImportStatus.CANCELLED;
      batch.import_errors.push({
        row: 0,
        message: `Batch rolled back by ${adminContext.admin_name}`,
      });
      await batch.save();

      logger.info(`Import rolled back: ${batchId}, ${result.deletedCount} questions deleted`);

      return { rolled_back_count: result.deletedCount };
    } catch (error: any) {
      logger.error('Error rolling back import:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const importService = new ImportService();
