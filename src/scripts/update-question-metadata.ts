/**
 * UPDATE QUESTION METADATA
 *
 * Updates existing questions with proper difficulty levels and time estimates
 * based on their module and micro-skill assignments
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import micro-skill metadata
import { getMicroSkillMetadata } from '../constants/microskills.constant';

const QuestionSchema = new mongoose.Schema({}, { collection: 'questions', strict: false });
const QuestionModel = mongoose.model('Question', QuestionSchema);

interface UpdateStats {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
}

async function updateQuestionMetadata(): Promise<void> {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB\n');

    const allQuestions = await QuestionModel.find({}).lean() as any[];
    console.log(`📊 Found ${allQuestions.length} questions to analyze\n`);

    const stats: UpdateStats = {
      total: allQuestions.length,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    // Group questions by micro-skill for proper distribution
    const questionsBySkill: { [key: number]: any[] } = {};

    for (const q of allQuestions) {
      const skillId = q.micro_skill_id;
      if (!questionsBySkill[skillId]) {
        questionsBySkill[skillId] = [];
      }
      questionsBySkill[skillId].push(q);
    }

    console.log(`📋 Processing ${Object.keys(questionsBySkill).length} different micro-skills...\n`);

    // Process each micro-skill
    for (const [skillIdStr, questions] of Object.entries(questionsBySkill)) {
      const skillId = parseInt(skillIdStr);
      const skillMeta = getMicroSkillMetadata(skillId);

      if (!skillMeta) {
        console.log(`⚠️  Micro-skill ${skillId}: No metadata found, skipping ${questions.length} questions`);
        stats.skipped += questions.length;
        continue;
      }

      console.log(`🔧 Micro-skill ${skillId} (${skillMeta.name}): Updating ${questions.length} questions`);

      // Sort questions by existing difficulty or randomly assign
      const sorted = questions.sort((a, b) => {
        const aDiff = a.metadata?.difficulty_level || 0;
        const bDiff = b.metadata?.difficulty_level || 0;
        return aDiff - bDiff;
      });

      const total = sorted.length;
      const easyCount = Math.ceil(total * 0.20); // 20% easy
      const hardCount = Math.ceil(total * 0.20); // 20% hard
      const mediumCount = total - easyCount - hardCount; // 60% medium

      // Assign difficulty levels with distribution
      for (let i = 0; i < sorted.length; i++) {
        const q = sorted[i];
        let newDifficulty: number;
        let newTime: number;

        if (i < easyCount) {
          // Easy (20%)
          newDifficulty = Math.floor(Math.random() * (skillMeta.difficulty_range.min + 2 - skillMeta.difficulty_range.min + 1)) + skillMeta.difficulty_range.min;
          newTime = Math.floor(skillMeta.avg_time_seconds * 0.7); // 70% of avg time
        } else if (i < easyCount + mediumCount) {
          // Medium (60%)
          const midPoint = Math.floor((skillMeta.difficulty_range.min + skillMeta.difficulty_range.max) / 2);
          newDifficulty = Math.floor(Math.random() * 3) + midPoint - 1; // ±1 around midpoint
          newTime = Math.floor(skillMeta.avg_time_seconds * (0.9 + Math.random() * 0.3)); // 90-120% of avg
        } else {
          // Hard (20%)
          newDifficulty = Math.floor(Math.random() * 3) + (skillMeta.difficulty_range.max - 2); // Top range
          newTime = Math.floor(skillMeta.avg_time_seconds * 1.4); // 140% of avg time
        }

        // Ensure difficulty is within 1-10 range
        newDifficulty = Math.max(1, Math.min(10, newDifficulty));

        // Ensure time is at least 30 seconds
        newTime = Math.max(30, newTime);

        try {
          await QuestionModel.updateOne(
            { _id: q._id },
            {
              $set: {
                'metadata.difficulty_level': newDifficulty,
                'metadata.expected_time_seconds': newTime,
              },
            }
          );
          stats.updated++;
        } catch (error) {
          console.error(`   ❌ Error updating ${q.question_code}:`, error);
          stats.errors++;
        }
      }

      console.log(`   ✅ Updated ${questions.length} questions (Easy: ${easyCount}, Medium: ${mediumCount}, Hard: ${hardCount})\n`);
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   UPDATE SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`📊 Total Questions:        ${stats.total}`);
    console.log(`✅ Successfully Updated:   ${stats.updated}`);
    console.log(`⏭️  Skipped:                ${stats.skipped}`);
    console.log(`❌ Errors:                 ${stats.errors}`);
    console.log('');

    await mongoose.disconnect();
    console.log('✅ Complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateQuestionMetadata();
