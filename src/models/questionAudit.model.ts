/**
 * QUESTION AUDIT MODEL
 *
 * Tracks all changes made to questions for audit trail.
 * Stored in separate collection to prevent document bloat.
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  DELETED = 'deleted',
  RESTORED = 'restored',
  BULK_IMPORTED = 'bulk_imported'
}

// ============================================================================
// INTERFACE
// ============================================================================

export interface IQuestionAudit extends Document {
  question_id: string;
  question_code: string;
  action: AuditAction;
  admin_id: string;
  admin_name: string;
  changes: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    batch_id?: string; // For bulk imports
    reason?: string;   // Optional reason for change
  };
  created_at: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const QuestionAuditSchema = new Schema<IQuestionAudit>(
  {
    question_id: {
      type: String,
      required: true,
      index: true
    },
    question_code: {
      type: String,
      required: true
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true
    },
    admin_id: {
      type: String,
      required: true,
      index: true
    },
    admin_name: {
      type: String,
      required: true
    },
    changes: [
      {
        field: { type: String, required: true },
        old_value: { type: Schema.Types.Mixed },
        new_value: { type: Schema.Types.Mixed }
      }
    ],
    metadata: {
      ip_address: String,
      user_agent: String,
      batch_id: String,
      reason: String
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false } // No updatedAt needed for audit logs
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Compound indexes for common queries
QuestionAuditSchema.index({ question_id: 1, created_at: -1 });
QuestionAuditSchema.index({ admin_id: 1, created_at: -1 });
QuestionAuditSchema.index({ action: 1, created_at: -1 });
QuestionAuditSchema.index({ created_at: -1 }); // For recent activity

// TTL index for automatic cleanup (optional - keep audits for 2 years)
// QuestionAuditSchema.index({ created_at: 1 }, { expireAfterSeconds: 63072000 });

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get change history for a specific question
 */
QuestionAuditSchema.statics.getQuestionHistory = function (
  questionId: string,
  limit: number = 50
) {
  return this.find({ question_id: questionId })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get recent activity by an admin
 */
QuestionAuditSchema.statics.getAdminActivity = function (
  adminId: string,
  limit: number = 100
) {
  return this.find({ admin_id: adminId })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get recent activity across all admins
 */
QuestionAuditSchema.statics.getRecentActivity = function (limit: number = 50) {
  return this.find()
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get activity summary by action type
 */
QuestionAuditSchema.statics.getActivitySummary = function (
  startDate: Date,
  endDate: Date
) {
  return this.aggregate([
    {
      $match: {
        created_at: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    }
  ]);
};

// ============================================================================
// EXPORT
// ============================================================================

export const QuestionAuditModel = mongoose.model<IQuestionAudit>(
  'QuestionAudit',
  QuestionAuditSchema
);
