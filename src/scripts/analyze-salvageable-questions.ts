/**
 * ANALYZE SALVAGEABLE QUESTIONS
 *
 * This script analyzes existing questions in the database and determines:
 * 1. Which questions can be salvaged and remapped to correct micro-skills
 * 2. Which questions need difficulty level and time estimates added/updated
 * 3. Which questions should be deleted (e.g., Module 0)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Correct micro-skill mapping from PDF
const CORRECT_MODULE_SKILLS: { [key: number]: { skillCount: number; questionCount: number; skillIds: number[] } } = {
  0: { skillCount: 0, questionCount: 0, skillIds: [] }, // NO QUESTIONS
  1: { skillCount: 3, questionCount: 150, skillIds: [1, 2, 3] },
  2: { skillCount: 3, questionCount: 150, skillIds: [4, 5, 6] },
  3: { skillCount: 16, questionCount: 800, skillIds: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] },
  4: { skillCount: 2, questionCount: 100, skillIds: [23, 24] },
  5: { skillCount: 4, questionCount: 200, skillIds: [25, 26, 27, 28] },
  6: { skillCount: 4, questionCount: 200, skillIds: [29, 30, 31, 32] },
  7: { skillCount: 2, questionCount: 100, skillIds: [33, 34] },
  8: { skillCount: 2, questionCount: 100, skillIds: [35, 36] },
  9: { skillCount: 4, questionCount: 200, skillIds: [37, 38, 39, 40] }, // Basics is video only
  10: { skillCount: 2, questionCount: 80, skillIds: [41, 42] }, // Basics is video only
  11: { skillCount: 1, questionCount: 50, skillIds: [43] }, // Basics is video only
  12: { skillCount: 4, questionCount: 120, skillIds: [44, 45, 46, 47] }, // Basics is video only
  13: { skillCount: 1, questionCount: 50, skillIds: [48] },
  14: { skillCount: 1, questionCount: 50, skillIds: [49] },
  15: { skillCount: 1, questionCount: 50, skillIds: [50] },
  16: { skillCount: 1, questionCount: 50, skillIds: [51] },
  17: { skillCount: 3, questionCount: 150, skillIds: [52, 53, 54] }, // Basics is video only
  18: { skillCount: 4, questionCount: 200, skillIds: [55, 56, 57, 58] },
  19: { skillCount: 5, questionCount: 250, skillIds: [59, 60, 61, 62, 63] },
  20: { skillCount: 1, questionCount: 50, skillIds: [64] },
};

// Question Schema
const QuestionSchema = new mongoose.Schema({
  question_code: String,
  module_id: Number,
  micro_skill_id: Number,
  question_data: {
    text: String,
    type: String,
    correct_answer: mongoose.Schema.Types.Mixed,
    options: [String],
    solution_steps: Array,
    hints: Array,
  },
  metadata: {
    difficulty_level: Number,
    expected_time_seconds: Number,
    points: Number,
    tags: [String],
    prerequisites: [String],
    common_errors: Array,
  },
}, { collection: 'questions' });

const QuestionModel = mongoose.model('Question', QuestionSchema);

interface AnalysisResult {
  totalQuestions: number;
  toDelete: {
    module0: number; // Should have 0 questions
    invalidStructure: number;
    total: number;
  };
  toUpdate: {
    needsDifficulty: number;
    needsTimeEstimate: number;
    needsRemap: number;
    total: number;
  };
  salvageable: {
    canKeepAsIs: number;
    canKeepWithUpdates: number;
    total: number;
  };
  byModule: { [key: number]: {
    current: number;
    expected: number;
    salvageable: number;
    toDelete: number;
    gap: number;
  }};
}

async function analyzeQuestions(): Promise<void> {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB\n');

    const allQuestions = await QuestionModel.find({}).lean() as any[];

    const result: AnalysisResult = {
      totalQuestions: allQuestions.length,
      toDelete: {
        module0: 0,
        invalidStructure: 0,
        total: 0,
      },
      toUpdate: {
        needsDifficulty: 0,
        needsTimeEstimate: 0,
        needsRemap: 0,
        total: 0,
      },
      salvageable: {
        canKeepAsIs: 0,
        canKeepWithUpdates: 0,
        total: 0,
      },
      byModule: {},
    };

    // Initialize byModule
    for (let i = 0; i <= 20; i++) {
      result.byModule[i] = {
        current: 0,
        expected: CORRECT_MODULE_SKILLS[i].questionCount,
        salvageable: 0,
        toDelete: 0,
        gap: CORRECT_MODULE_SKILLS[i].questionCount,
      };
    }

    // Analyze each question
    for (const q of allQuestions) {
      const moduleId = q.module_id;
      result.byModule[moduleId].current++;

      // Module 0 should have NO questions
      if (moduleId === 0) {
        result.toDelete.module0++;
        result.toDelete.total++;
        result.byModule[moduleId].toDelete++;
        continue;
      }

      // Check if micro_skill_id is valid for this module
      const correctSkills = CORRECT_MODULE_SKILLS[moduleId].skillIds;
      const isValidSkill = correctSkills.includes(q.micro_skill_id);

      if (!isValidSkill) {
        result.toUpdate.needsRemap++;
        // Still salvageable with remapping
      }

      // Check metadata
      const needsDifficulty = !q.metadata?.difficulty_level || q.metadata.difficulty_level < 1 || q.metadata.difficulty_level > 10;
      const needsTime = !q.metadata?.expected_time_seconds || q.metadata.expected_time_seconds <= 0;

      if (needsDifficulty) result.toUpdate.needsDifficulty++;
      if (needsTime) result.toUpdate.needsTimeEstimate++;

      // Determine if salvageable
      if (!needsDifficulty && !needsTime && isValidSkill) {
        result.salvageable.canKeepAsIs++;
        result.byModule[moduleId].salvageable++;
      } else if (isValidSkill || (!isValidSkill && moduleId <= 20)) {
        result.salvageable.canKeepWithUpdates++;
        result.byModule[moduleId].salvageable++;
      } else {
        result.toDelete.invalidStructure++;
        result.toDelete.total++;
        result.byModule[moduleId].toDelete++;
      }
    }

    result.salvageable.total = result.salvageable.canKeepAsIs + result.salvageable.canKeepWithUpdates;
    result.toUpdate.total = result.toUpdate.needsDifficulty + result.toUpdate.needsTimeEstimate + result.toUpdate.needsRemap;

    // Calculate gaps
    for (let i = 0; i <= 20; i++) {
      result.byModule[i].gap = result.byModule[i].expected - result.byModule[i].salvageable;
    }

    // Print Results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   SALVAGEABLE QUESTIONS ANALYSIS REPORT');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 Total Questions in Database: ${result.totalQuestions}`);
    console.log('');

    console.log('🗑️  QUESTIONS TO DELETE:');
    console.log(`   Module 0 (shouldn't exist):     ${result.toDelete.module0}`);
    console.log(`   Invalid structure:              ${result.toDelete.invalidStructure}`);
    console.log(`   ─────────────────────────────────────────`);
    console.log(`   TOTAL TO DELETE:                ${result.toDelete.total}`);
    console.log('');

    console.log('✅ SALVAGEABLE QUESTIONS:');
    console.log(`   Can keep as-is:                 ${result.salvageable.canKeepAsIs}`);
    console.log(`   Can keep with updates:          ${result.salvageable.canKeepWithUpdates}`);
    console.log(`   ─────────────────────────────────────────`);
    console.log(`   TOTAL SALVAGEABLE:              ${result.salvageable.total}`);
    console.log('');

    console.log('🔧 UPDATES NEEDED:');
    console.log(`   Need difficulty level:          ${result.toUpdate.needsDifficulty}`);
    console.log(`   Need time estimate:             ${result.toUpdate.needsTimeEstimate}`);
    console.log(`   Need remapping:                 ${result.toUpdate.needsRemap}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   BREAKDOWN BY MODULE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (let i = 0; i <= 20; i++) {
      const m = result.byModule[i];
      const percentComplete = m.expected > 0 ? ((m.salvageable / m.expected) * 100).toFixed(1) : 'N/A';

      console.log(`Module ${i}: ${m.current} current | ${m.salvageable} salvageable | ${m.expected} needed | Gap: ${m.gap}`);
      if (m.expected > 0) {
        console.log(`   Progress: ${percentComplete}% | To Delete: ${m.toDelete}`);
      } else {
        console.log(`   ⚠️  Should have 0 questions (currently has ${m.current})`);
      }
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   RECOMMENDED ACTIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`1. DELETE ${result.toDelete.module0} Module 0 questions immediately`);
    console.log(`2. UPDATE ${result.salvageable.canKeepWithUpdates} questions with difficulty & time`);
    console.log(`3. REMAP ${result.toUpdate.needsRemap} questions to correct micro-skills`);
    console.log(`4. GENERATE ${Object.values(result.byModule).reduce((sum, m) => sum + m.gap, 0)} new questions`);
    console.log('');

    // Save detailed report
    const reportPath = path.join(__dirname, '../../SALVAGEABLE_QUESTIONS_REPORT.json');
    const fs = require('fs');
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`📝 Detailed report saved to: SALVAGEABLE_QUESTIONS_REPORT.json\n`);

    await mongoose.disconnect();
    console.log('✅ Analysis complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeQuestions();
