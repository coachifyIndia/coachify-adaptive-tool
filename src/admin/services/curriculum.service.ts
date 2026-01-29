/**
 * CURRICULUM SERVICE
 *
 * Service for managing modules and micro-skills in the curriculum.
 * Provides CRUD operations for dynamic curriculum management.
 */

import { ModuleModel } from '../../models/curriculum.model';
import type { IModule, IMicroSkill } from '../../models/curriculum.model';
import logger from '../../utils/logger.util';

// Type for lean document (plain JS object without Mongoose Document methods)
type LeanModule = Omit<IModule, keyof import('mongoose').Document>;

// ============================================================================
// TYPES
// ============================================================================

export interface CreateModuleInput {
  name: string;
  description: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_completion_hours?: number;
  created_by?: string;
}

export interface CreateMicroSkillInput {
  module_id: number;
  name: string;
  description: string;
  estimated_time_minutes?: number;
  prerequisites?: number[];
  created_by?: string;
}

export interface UpdateModuleInput {
  name?: string;
  description?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_completion_hours?: number;
  is_active?: boolean;
  updated_by?: string;
}

export interface UpdateMicroSkillInput {
  name?: string;
  description?: string;
  estimated_time_minutes?: number;
  prerequisites?: number[];
  is_active?: boolean;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class CurriculumService {
  // ==========================================================================
  // MODULE OPERATIONS
  // ==========================================================================

  /**
   * Get all modules with their micro-skills
   */
  async getAllModules(includeInactive = false): Promise<LeanModule[]> {
    const filter = includeInactive ? {} : { is_active: true };
    return ModuleModel.find(filter).sort({ module_id: 1 }).lean() as Promise<LeanModule[]>;
  }

  /**
   * Get a single module by ID
   */
  async getModuleById(moduleId: number): Promise<LeanModule | null> {
    return ModuleModel.findOne({ module_id: moduleId }).lean() as Promise<LeanModule | null>;
  }

  /**
   * Create a new module
   */
  async createModule(input: CreateModuleInput): Promise<IModule> {
    // Get next available module_id
    const nextId = await this.getNextModuleId();

    const module = new ModuleModel({
      module_id: nextId,
      name: input.name,
      description: input.description,
      difficulty_level: input.difficulty_level || 'beginner',
      estimated_completion_hours: input.estimated_completion_hours || 2,
      micro_skills: [],
      is_active: true,
      created_by: input.created_by,
    });

    await module.save();
    logger.info(`Created new module: ${module.module_id} - ${module.name}`);
    return module.toObject();
  }

  /**
   * Update a module
   */
  async updateModule(moduleId: number, input: UpdateModuleInput): Promise<LeanModule | null> {
    const module = await ModuleModel.findOneAndUpdate(
      { module_id: moduleId },
      {
        ...input,
        updated_by: input.updated_by,
      },
      { new: true }
    ).lean() as LeanModule | null;

    if (module) {
      logger.info(`Updated module: ${moduleId}`);
    }
    return module;
  }

  /**
   * Delete (deactivate) a module
   */
  async deleteModule(moduleId: number, updatedBy?: string): Promise<boolean> {
    const result = await ModuleModel.findOneAndUpdate(
      { module_id: moduleId },
      { is_active: false, updated_by: updatedBy },
      { new: true }
    );
    if (result) {
      logger.info(`Deactivated module: ${moduleId}`);
      return true;
    }
    return false;
  }

  /**
   * Get next available module ID
   * Considers both database modules and static file data
   */
  async getNextModuleId(): Promise<number> {
    // Get max from database
    const lastModule = await ModuleModel.findOne().sort({ module_id: -1 }).lean();
    const dbMaxId = lastModule ? lastModule.module_id : -1;

    // Also check static file for max module_id (in case DB is empty but static data exists)
    let staticMaxId = -1;
    try {
      const { MODULES_DATA } = await import('../../data/modules.data');
      if (MODULES_DATA && MODULES_DATA.length > 0) {
        staticMaxId = Math.max(...MODULES_DATA.map((m) => m.module_id));
      }
    } catch {
      // Static file not available, ignore
    }

    // Return the next ID after the maximum from either source
    const maxId = Math.max(dbMaxId, staticMaxId);
    return maxId + 1;
  }

  // ==========================================================================
  // MICRO-SKILL OPERATIONS
  // ==========================================================================

  /**
   * Get all micro-skills across all modules
   */
  async getAllMicroSkills(includeInactive = false): Promise<{ module_id: number; micro_skill: IMicroSkill }[]> {
    const modules = await this.getAllModules(includeInactive);
    const result: { module_id: number; micro_skill: IMicroSkill }[] = [];

    for (const module of modules) {
      for (const skill of module.micro_skills) {
        if (includeInactive || skill.is_active) {
          result.push({ module_id: module.module_id, micro_skill: skill });
        }
      }
    }

    return result.sort((a, b) => a.micro_skill.micro_skill_id - b.micro_skill.micro_skill_id);
  }

  /**
   * Get micro-skills for a specific module
   */
  async getMicroSkillsByModule(moduleId: number, includeInactive = false): Promise<IMicroSkill[]> {
    const module = await this.getModuleById(moduleId);
    if (!module) return [];

    if (includeInactive) {
      return module.micro_skills;
    }
    return module.micro_skills.filter((s) => s.is_active);
  }

  /**
   * Get a single micro-skill by ID
   */
  async getMicroSkillById(microSkillId: number): Promise<{ module: LeanModule; micro_skill: IMicroSkill } | null> {
    const modules = await ModuleModel.find({ 'micro_skills.micro_skill_id': microSkillId }).lean() as LeanModule[];

    for (const module of modules) {
      const skill = module.micro_skills.find((s) => s.micro_skill_id === microSkillId);
      if (skill) {
        return { module, micro_skill: skill };
      }
    }
    return null;
  }

  /**
   * Create a new micro-skill in a module
   */
  async createMicroSkill(input: CreateMicroSkillInput): Promise<IMicroSkill> {
    const module = await ModuleModel.findOne({ module_id: input.module_id });
    if (!module) {
      throw new Error(`Module ${input.module_id} not found`);
    }

    // Get next available micro_skill_id
    const nextId = await this.getNextMicroSkillId();

    const newSkill: IMicroSkill = {
      micro_skill_id: nextId,
      name: input.name,
      description: input.description,
      estimated_time_minutes: input.estimated_time_minutes || 30,
      prerequisites: input.prerequisites || [],
      is_active: true,
    };

    module.micro_skills.push(newSkill);
    module.updated_by = input.created_by;
    await module.save();

    logger.info(`Created new micro-skill: ${nextId} - ${newSkill.name} in module ${input.module_id}`);
    return newSkill;
  }

  /**
   * Update a micro-skill
   */
  async updateMicroSkill(
    microSkillId: number,
    input: UpdateMicroSkillInput,
    updatedBy?: string
  ): Promise<IMicroSkill | null> {
    const result = await this.getMicroSkillById(microSkillId);
    if (!result) return null;

    const module = await ModuleModel.findOne({ module_id: result.module.module_id });
    if (!module) return null;

    const skillIndex = module.micro_skills.findIndex((s) => s.micro_skill_id === microSkillId);
    if (skillIndex === -1) return null;

    // Update fields
    if (input.name !== undefined) module.micro_skills[skillIndex].name = input.name;
    if (input.description !== undefined) module.micro_skills[skillIndex].description = input.description;
    if (input.estimated_time_minutes !== undefined)
      module.micro_skills[skillIndex].estimated_time_minutes = input.estimated_time_minutes;
    if (input.prerequisites !== undefined) module.micro_skills[skillIndex].prerequisites = input.prerequisites;
    if (input.is_active !== undefined) module.micro_skills[skillIndex].is_active = input.is_active;

    module.updated_by = updatedBy;
    await module.save();

    logger.info(`Updated micro-skill: ${microSkillId}`);
    return module.micro_skills[skillIndex];
  }

  /**
   * Delete (deactivate) a micro-skill
   */
  async deleteMicroSkill(microSkillId: number, updatedBy?: string): Promise<boolean> {
    const result = await this.updateMicroSkill(microSkillId, { is_active: false }, updatedBy);
    if (result) {
      logger.info(`Deactivated micro-skill: ${microSkillId}`);
      return true;
    }
    return false;
  }

  /**
   * Get next available micro-skill ID
   * Considers both database modules and static file data
   */
  async getNextMicroSkillId(): Promise<number> {
    // Get max from database
    const modules = await ModuleModel.find().lean();
    let dbMaxId = 0;
    for (const module of modules) {
      for (const skill of module.micro_skills) {
        if (skill.micro_skill_id > dbMaxId) {
          dbMaxId = skill.micro_skill_id;
        }
      }
    }

    // Also check static file for max micro_skill_id (in case DB is empty but static data exists)
    let staticMaxId = 0;
    try {
      const { MODULES_DATA } = await import('../../data/modules.data');
      if (MODULES_DATA && MODULES_DATA.length > 0) {
        for (const module of MODULES_DATA) {
          for (const skill of module.micro_skills) {
            if (skill.micro_skill_id > staticMaxId) {
              staticMaxId = skill.micro_skill_id;
            }
          }
        }
      }
    } catch {
      // Static file not available, ignore
    }

    // Return the next ID after the maximum from either source
    const maxId = Math.max(dbMaxId, staticMaxId);
    return maxId + 1;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Check if a module exists
   */
  async moduleExists(moduleId: number): Promise<boolean> {
    const count = await ModuleModel.countDocuments({ module_id: moduleId });
    return count > 0;
  }

  /**
   * Check if a micro-skill exists
   */
  async microSkillExists(microSkillId: number): Promise<boolean> {
    const result = await this.getMicroSkillById(microSkillId);
    return result !== null;
  }

  /**
   * Validate module_id and micro_skill_id combination
   */
  async validateModuleAndSkill(moduleId: number, microSkillId: number): Promise<boolean> {
    const module = await this.getModuleById(moduleId);
    if (!module) return false;

    return module.micro_skills.some((s) => s.micro_skill_id === microSkillId && s.is_active);
  }

  /**
   * Get curriculum statistics
   */
  async getStats(): Promise<{
    total_modules: number;
    total_micro_skills: number;
    active_modules: number;
    active_micro_skills: number;
  }> {
    const modules = await ModuleModel.find().lean();

    let totalMicroSkills = 0;
    let activeMicroSkills = 0;
    let activeModules = 0;

    for (const module of modules) {
      if (module.is_active) activeModules++;
      totalMicroSkills += module.micro_skills.length;
      activeMicroSkills += module.micro_skills.filter((s) => s.is_active).length;
    }

    return {
      total_modules: modules.length,
      total_micro_skills: totalMicroSkills,
      active_modules: activeModules,
      active_micro_skills: activeMicroSkills,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const curriculumService = new CurriculumService();
