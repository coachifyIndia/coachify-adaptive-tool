/**
 * CURRICULUM MODEL
 *
 * MongoDB model for storing modules and micro-skills.
 * This allows dynamic management of the curriculum through the admin panel.
 */

import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// INTERFACES
// ============================================================================

export interface IMicroSkill {
  micro_skill_id: number;
  name: string;
  description: string;
  estimated_time_minutes: number;
  prerequisites: number[];
  is_active: boolean;
}

export interface IModule extends Document {
  module_id: number;
  name: string;
  description: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_completion_hours: number;
  micro_skills: IMicroSkill[];
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const MicroSkillSchema = new Schema<IMicroSkill>(
  {
    micro_skill_id: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    estimated_time_minutes: {
      type: Number,
      required: true,
      min: 1,
      default: 30,
    },
    prerequisites: {
      type: [Number],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const ModuleSchema = new Schema<IModule>(
  {
    module_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    difficulty_level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    estimated_completion_hours: {
      type: Number,
      min: 0,
      default: 2,
    },
    micro_skills: {
      type: [MicroSkillSchema],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: String,
    },
    updated_by: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// ============================================================================
// INDEXES
// ============================================================================

ModuleSchema.index({ module_id: 1 });
ModuleSchema.index({ is_active: 1 });
ModuleSchema.index({ 'micro_skills.micro_skill_id': 1 });

// ============================================================================
// STATIC METHODS
// ============================================================================

ModuleSchema.statics.getNextModuleId = async function (): Promise<number> {
  const lastModule = await this.findOne().sort({ module_id: -1 }).lean();
  return lastModule ? lastModule.module_id + 1 : 0;
};

ModuleSchema.statics.getNextMicroSkillId = async function (): Promise<number> {
  const modules = await this.find().lean();
  let maxId = 0;
  for (const module of modules) {
    for (const skill of module.micro_skills) {
      if (skill.micro_skill_id > maxId) {
        maxId = skill.micro_skill_id;
      }
    }
  }
  return maxId + 1;
};

// ============================================================================
// EXPORT
// ============================================================================

export const ModuleModel = mongoose.model<IModule>('Module', ModuleSchema);
