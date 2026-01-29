/**
 * IMPORT BATCH MODEL
 *
 * Tracks bulk import operations for questions.
 * Stores progress, errors, and results.
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum ImportStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  COMPLETED_WITH_ERRORS = 'completed_with_errors',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum ImportFileType {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json'
}

// ============================================================================
// INTERFACE
// ============================================================================

export interface IImportError {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

export interface IImportBatch extends Document {
  batch_id: string;
  admin_id: string;
  admin_name: string;
  file_name: string;
  file_type: ImportFileType;
  status: ImportStatus;
  total_rows: number;
  processed_rows: number;
  successful: number;
  failed: number;
  skipped: number;
  import_errors: IImportError[];  // Renamed to avoid conflict with Document.errors
  import_warnings: IImportError[];
  created_question_ids: string[];
  validation_summary?: {
    valid: number;
    invalid: number;
    warnings: number;
  };
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const ImportBatchSchema = new Schema<IImportBatch>(
  {
    batch_id: {
      type: String,
      required: true,
      unique: true,
      index: true
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
    file_name: {
      type: String,
      required: true
    },
    file_type: {
      type: String,
      enum: Object.values(ImportFileType),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(ImportStatus),
      default: ImportStatus.PENDING
    },
    total_rows: {
      type: Number,
      default: 0
    },
    processed_rows: {
      type: Number,
      default: 0
    },
    successful: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    skipped: {
      type: Number,
      default: 0
    },
    import_errors: [
      {
        row: { type: Number, required: true },
        field: String,
        message: { type: String, required: true },
        value: Schema.Types.Mixed
      }
    ],
    import_warnings: [
      {
        row: { type: Number, required: true },
        field: String,
        message: { type: String, required: true },
        value: Schema.Types.Mixed
      }
    ],
    created_question_ids: [String],
    validation_summary: {
      valid: Number,
      invalid: Number,
      warnings: Number
    },
    started_at: Date,
    completed_at: Date
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

// ============================================================================
// PRE-SAVE HOOKS
// ============================================================================

/**
 * Generate batch_id before saving new batch
 */
ImportBatchSchema.pre('save', function (next) {
  if (this.isNew && !this.batch_id) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.batch_id = `BATCH_${timestamp}_${random}`;
  }
  next();
});

// ============================================================================
// INDEXES
// ============================================================================

ImportBatchSchema.index({ admin_id: 1, created_at: -1 });
ImportBatchSchema.index({ status: 1, created_at: -1 });

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Calculate progress percentage
 */
ImportBatchSchema.methods.getProgressPercentage = function (): number {
  if (this.total_rows === 0) return 0;
  return Math.round((this.processed_rows / this.total_rows) * 100);
};

/**
 * Check if import is complete
 */
ImportBatchSchema.methods.isComplete = function (): boolean {
  return [
    ImportStatus.COMPLETED,
    ImportStatus.COMPLETED_WITH_ERRORS,
    ImportStatus.FAILED,
    ImportStatus.CANCELLED
  ].includes(this.status);
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get recent imports by admin
 */
ImportBatchSchema.statics.getAdminImports = function (
  adminId: string,
  limit: number = 20
) {
  return this.find({ admin_id: adminId })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get pending or processing imports
 */
ImportBatchSchema.statics.getActiveImports = function () {
  return this.find({
    status: { $in: [ImportStatus.PENDING, ImportStatus.VALIDATING, ImportStatus.PROCESSING] }
  })
    .sort({ created_at: -1 })
    .lean();
};

// ============================================================================
// EXPORT
// ============================================================================

export const ImportBatchModel = mongoose.model<IImportBatch>(
  'ImportBatch',
  ImportBatchSchema
);
