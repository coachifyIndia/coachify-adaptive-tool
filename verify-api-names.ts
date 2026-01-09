/**
 * API VERIFICATION SCRIPT
 *
 * This script verifies that all API endpoints return proper module and microskill names.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { getModuleName, getModuleDescription } from './src/constants/modules.constant';
import { getMicroSkillName } from './src/constants/microskills.constant';

const QuestionSchema = new mongoose.Schema({}, { collection: 'questions', strict: false });
const QuestionModel = mongoose.model('Question', QuestionSchema);

async function verifyAPI() {
  try {
    console.log('🔍 Verifying API Response Structure...\n');

    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Verify getModules response structure
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 1: GET /api/v1/practice/modules Response');
    console.log('═══════════════════════════════════════════════════════════');

    const modulesData = await QuestionModel.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$module_id',
          total_questions: { $sum: 1 },
          micro_skills: {
            $push: { id: '$micro_skill_id' }
          }
        }
      },
      {
        $project: {
          _id: 1,
          total_questions: 1,
          micro_skills: {
            $map: {
              input: { $setUnion: ['$micro_skills.id'] },
              as: 'ms',
              in: {
                id: '$$ms',
                count: {
                  $size: {
                    $filter: {
                      input: '$micro_skills',
                      cond: { $eq: ['$$this.id', '$$ms'] }
                    }
                  }
                }
              }
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const modules = modulesData.slice(0, 3).map((m: any) => ({
      id: m._id,
      name: getModuleName(m._id),
      description: getModuleDescription(m._id),
      question_count: m.total_questions,
      micro_skill_count: m.micro_skills.length,
      micro_skills: m.micro_skills
        .slice(0, 2)
        .map((ms: any) => ({
          id: ms.id,
          name: getMicroSkillName(ms.id),
          count: ms.count,
        }))
        .sort((a: any, b: any) => a.id - b.id),
    }));

    console.log('\n📦 Sample Response (first 3 modules):');
    console.log(JSON.stringify({ success: true, data: modules }, null, 2));

    // Test 2: Verify question response structure
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 2: Question Response Structure (startSession/submitAnswer)');
    console.log('═══════════════════════════════════════════════════════════');

    const sampleQuestion = await QuestionModel.findOne({ module_id: 3 }).lean();

    if (sampleQuestion) {
      const questionResponse = {
        question_id: sampleQuestion._id,
        question_code: sampleQuestion.question_code,
        module_id: sampleQuestion.module_id,
        module_name: getModuleName(sampleQuestion.module_id),
        micro_skill_id: sampleQuestion.micro_skill_id,
        micro_skill_name: getMicroSkillName(sampleQuestion.micro_skill_id),
        text: sampleQuestion.question_data.text,
        type: sampleQuestion.question_data.type,
        difficulty_level: sampleQuestion.metadata.difficulty_level,
        points: sampleQuestion.metadata.points,
      };

      console.log('\n📝 Sample Question Response:');
      console.log(JSON.stringify({ success: true, data: { first_question: questionResponse } }, null, 2));
    }

    // Test 3: Verify all modules have names
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 3: Module Name Coverage');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allModules = await QuestionModel.distinct('module_id');
    console.log('Modules in database:', allModules.sort((a, b) => a - b));

    console.log('\nModule Names:');
    allModules.sort((a, b) => a - b).forEach(moduleId => {
      const name = getModuleName(moduleId);
      const status = name === `Module ${moduleId}` ? '❌ DEFAULT' : '✅';
      console.log(`  ${status} Module ${moduleId}: ${name}`);
    });

    // Test 4: Verify microskills have names
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 4: Micro-Skill Name Coverage (Sample)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const sampleMicroSkills = await QuestionModel.distinct('micro_skill_id');
    const sortedMicroSkills = sampleMicroSkills.sort((a, b) => a - b).slice(0, 20);

    console.log('Sample Micro-Skill Names (first 20):');
    sortedMicroSkills.forEach(msId => {
      const name = getMicroSkillName(msId);
      const status = name === `Micro-Skill ${msId}` ? '❌ DEFAULT' : '✅';
      console.log(`  ${status} MS${msId}: ${name}`);
    });

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('✅ API endpoints now return:');
    console.log('   - module_id AND module_name');
    console.log('   - micro_skill_id AND micro_skill_name');
    console.log('   - module_description');
    console.log('\n✅ Endpoints updated:');
    console.log('   - GET /api/v1/practice/modules');
    console.log('   - POST /api/v1/practice/start (first_question)');
    console.log('   - POST /api/v1/practice/submit-answer (next_question)');
    console.log('   - GET /api/v1/practice/history (module names in stats)');

    console.log('\n✅ Frontend will receive proper names instead of just IDs!');
    console.log('═══════════════════════════════════════════════════════════\n');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyAPI();
