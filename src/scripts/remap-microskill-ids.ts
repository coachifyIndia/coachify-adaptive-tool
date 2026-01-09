/**
 * REMAP MICRO-SKILL IDS
 *
 * This script remaps all questions to the correct micro-skill IDs based on the PDF structure.
 *
 * Strategy:
 * 1. Analyze current questions by module_id and existing micro_skill_id
 * 2. Map them to correct micro-skill IDs based on PDF specification
 * 3. Update question_code to reflect new IDs
 * 4. Delete questions with invalid IDs that can't be remapped
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const QuestionSchema = new mongoose.Schema({}, { collection: 'questions', strict: false });
const QuestionModel = mongoose.model('Question', QuestionSchema);

// PDF-based micro-skill mapping: module_id -> array of correct micro-skill IDs
const CORRECT_MICROSKILL_IDS: { [moduleId: number]: number[] } = {
  0: [], // No questions
  1: [1, 2, 3], // Speed Addition: 2-digit, 3-digit, 4-digit
  2: [4, 5, 6], // Speed Subtraction: 2-digit, 3-digit, 4-digit
  3: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], // Speed Multiplication: 16 skills
  4: [23, 24], // Speed Division: 2 skills
  5: [25, 26, 27, 28], // Squaring Techniques: 4 skills
  6: [29, 30, 31, 32], // Cubing Techniques: 4 skills
  7: [33, 34], // Cube Rooting: 2 skills
  8: [35, 36], // Square Rooting: 2 skills
  9: [37, 38, 39, 40], // Percentage: 4 skills (Basics is video-only)
  10: [41, 42], // Ratio: 2 skills (Basics is video-only)
  11: [43], // Average: 1 skill (Basics is video-only)
  12: [44, 45, 46, 47], // Fractions: 4 skills (Basics is video-only)
  13: [48], // Indices: 1 skill
  14: [49], // Surds: 1 skill
  15: [50], // VBODMAS: 1 skill
  16: [51], // Approximation: 1 skill
  17: [52, 53, 54], // Simple Equations: 3 skills (Basics is video-only)
  18: [55, 56, 57, 58], // Factorisation: 4 skills
  19: [59, 60, 61, 62, 63], // DI + QA: 5 skills
  20: [64], // Miscellaneous: 1 skill
};

interface RemapStats {
  totalQuestions: number;
  remapped: number;
  deleted: number;
  errors: number;
  byModule: { [moduleId: number]: { remapped: number; deleted: number } };
}

async function remapMicroSkillIds(): Promise<void> {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB\n');

    const allQuestions = await QuestionModel.find({}).lean() as any[];
    console.log(`📊 Found ${allQuestions.length} questions to process\n`);

    const stats: RemapStats = {
      totalQuestions: allQuestions.length,
      remapped: 0,
      deleted: 0,
      errors: 0,
      byModule: {},
    };

    // Group questions by module
    const questionsByModule: { [moduleId: number]: any[] } = {};
    for (const q of allQuestions) {
      if (!questionsByModule[q.module_id]) {
        questionsByModule[q.module_id] = [];
        stats.byModule[q.module_id] = { remapped: 0, deleted: 0 };
      }
      questionsByModule[q.module_id].push(q);
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   REMAPPING MICRO-SKILL IDS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Process each module
    for (const [moduleIdStr, questions] of Object.entries(questionsByModule)) {
      const moduleId = parseInt(moduleIdStr);
      const correctSkillIds = CORRECT_MICROSKILL_IDS[moduleId] || [];

      console.log(`📦 Module ${moduleId}: ${questions.length} questions`);

      if (correctSkillIds.length === 0) {
        console.log(`   ⚠️  Module ${moduleId} should have 0 questions - DELETING ALL`);
        for (const q of questions) {
          await QuestionModel.deleteOne({ _id: q._id });
          stats.deleted++;
          stats.byModule[moduleId].deleted++;
        }
        continue;
      }

      // Group by current micro_skill_id
      const byCurrentSkillId: { [skillId: number]: any[] } = {};
      for (const q of questions) {
        if (!byCurrentSkillId[q.micro_skill_id]) {
          byCurrentSkillId[q.micro_skill_id] = [];
        }
        byCurrentSkillId[q.micro_skill_id].push(q);
      }

      const currentSkillIds = Object.keys(byCurrentSkillId).map(Number).sort((a, b) => a - b);
      console.log(`   Current skill IDs: ${currentSkillIds.join(', ')}`);
      console.log(`   Correct skill IDs: ${correctSkillIds.join(', ')}`);

      // Strategy: Map current skill IDs to correct skill IDs by position
      // If current has more skills than correct, delete extras
      // If current has fewer skills than correct, distribute evenly

      let remappingIndex = 0;
      for (const currentSkillId of currentSkillIds) {
        const questionsForSkill = byCurrentSkillId[currentSkillId];

        if (remappingIndex < correctSkillIds.length) {
          // Map to correct skill ID
          const newSkillId = correctSkillIds[remappingIndex];

          console.log(`   Remapping ${questionsForSkill.length} questions: skill ${currentSkillId} → ${newSkillId}`);

          for (const q of questionsForSkill) {
            // Update micro_skill_id and question_code
            const oldCode = q.question_code;
            const newCode = `M${moduleId}_MS${newSkillId}_Q${oldCode.split('_Q')[1] || '001'}`;

            try {
              await QuestionModel.updateOne(
                { _id: q._id },
                {
                  $set: {
                    micro_skill_id: newSkillId,
                    question_code: newCode,
                  },
                }
              );
              stats.remapped++;
              stats.byModule[moduleId].remapped++;
            } catch (error) {
              console.error(`      ❌ Error updating ${oldCode}:`, error);
              stats.errors++;
            }
          }

          remappingIndex++;
        } else {
          // Extra skill - delete these questions
          console.log(`   ⚠️  Deleting ${questionsForSkill.length} extra questions from skill ${currentSkillId}`);

          for (const q of questionsForSkill) {
            await QuestionModel.deleteOne({ _id: q._id });
            stats.deleted++;
            stats.byModule[moduleId].deleted++;
          }
        }
      }

      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   REMAPPING SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`📊 Total Questions:        ${stats.totalQuestions}`);
    console.log(`✅ Successfully Remapped:  ${stats.remapped}`);
    console.log(`🗑️  Deleted:                ${stats.deleted}`);
    console.log(`❌ Errors:                 ${stats.errors}`);
    console.log('');

    console.log('By Module:');
    console.log('-'.repeat(60));
    for (const [moduleId, moduleStats] of Object.entries(stats.byModule)) {
      console.log(`  Module ${moduleId}: Remapped ${moduleStats.remapped}, Deleted ${moduleStats.deleted}`);
    }
    console.log('');

    await mongoose.disconnect();
    console.log('✅ Remapping complete!');
    console.log('\n💡 Next: Restart server and test API at /api/v1/practice/modules');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

remapMicroSkillIds();
