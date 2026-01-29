/**
 * ADMIN MODEL
 *
 * Represents admin users who manage questions and content.
 * Separate from regular users for security isolation.
 */

import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// ============================================================================
// ENUMS
// ============================================================================

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',      // Full access, manage other admins
  CONTENT_ADMIN = 'content_admin',  // Create/edit/publish questions
  REVIEWER = 'reviewer'             // Review and approve questions only
}

// ============================================================================
// INTERFACE
// ============================================================================

export interface IAdmin extends Document {
  admin_id: string;
  email: string;
  password: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  last_login?: Date;
  created_by?: string;  // admin_id of creator
  created_at: Date;
  updated_at: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ============================================================================
// SCHEMA
// ============================================================================

const AdminSchema = new Schema<IAdmin>(
  {
    admin_id: {
      type: String,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Don't return password by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    role: {
      type: String,
      enum: {
        values: Object.values(AdminRole),
        message: 'Role must be one of: super_admin, content_admin, reviewer'
      },
      default: AdminRole.CONTENT_ADMIN
    },
    is_active: {
      type: Boolean,
      default: true
    },
    last_login: {
      type: Date
    },
    created_by: {
      type: String // admin_id of the admin who created this account
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// ============================================================================
// INDEXES
// ============================================================================

AdminSchema.index({ email: 1 });
AdminSchema.index({ role: 1, is_active: 1 });

// ============================================================================
// PRE-SAVE HOOKS
// ============================================================================

/**
 * Generate admin_id before saving new admin
 */
AdminSchema.pre('save', async function (next) {
  // Generate admin_id if new document
  if (this.isNew && !this.admin_id) {
    this.admin_id = `ADM_${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
  }

  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Compare password with hashed password
 */
AdminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find admin by email (includes password for auth)
 */
AdminSchema.statics.findByEmailWithPassword = function (email: string) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

/**
 * Find active admins by role
 */
AdminSchema.statics.findActiveByRole = function (role: AdminRole) {
  return this.find({ role, is_active: true });
};

// ============================================================================
// EXPORT
// ============================================================================

export const AdminModel = mongoose.model<IAdmin>('Admin', AdminSchema);
