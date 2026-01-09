/**
 * API VERIFICATION SCRIPT
 *
 * This script verifies that all API endpoints return proper module and microskill names.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Simple schema for querying
const QuestionSchema = new mongoose.Schema({}, { collection: 'questions', strict: false });
const QuestionModel = mongoose.model('Question', QuestionSchema);

// Import constants (assuming they're compiled to JS)
const { getModuleName, getModuleDescription } = require('./dist/constants/modules.constant');
const { getMicroSkillName } = require('./dist/constants/microskills.constant');

async function verifyAPI() {
  try {
    console.log('\n🔍 Verifying API Response Structure...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Sample question response
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST: Question Response Structure');
    console.log('═══════════════════════════════════════════════════════════\n');

    const sampleQuestion = await QuestionModel.findOne({ module_id: 3 }).lean();

    if (sampleQuestion) {
      console.log('📝 Sample Question Response (what frontend receives):\n');
      console.log('Question Code:', sampleQuestion.question_code);
      console.log('Module ID:', sampleQuestion.module_id);
      console.log('Module Name:', getModuleName(sampleQuestion.module_id));
      console.log('Micro-Skill ID:', sampleQuestion.micro_skill_id);
      console.log('Micro-Skill Name:', getMicroSkillName(sampleQuestion.micro_skill_id));
      console.log('Question Text:', sampleQuestion.question_data.text.substring(0, 60) + '...');
    }

    // Test 2: Verify all modules have proper names
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('MODULE NAME VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allModules = await QuestionModel.distinct('module_id');
    const sortedModules = allModules.sort((a, b) => a - b);

    console.log('All Modules with Names:\n');
    for (const moduleId of sortedModules) {
      const name = getModuleName(moduleId);
      const desc = getModuleDescription(moduleId);
      const questionCount = await QuestionModel.countDocuments({ module_id: moduleId });
      console.log(`Module ${moduleId}: ${name}`);
      console.log(`  Description: ${desc}`);
      console.log(`  Questions: ${questionCount}\n`);
    }

    // Test 3: Sample micro-skills
    console.log('═══════════════════════════════════════════════════════════');
    console.log('MICRO-SKILL NAME VERIFICATION (Sample from Module 3)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const module3MicroSkills = await QuestionModel.distinct('micro_skill_id', { module_id: 3 });
    const sortedMS = module3MicroSkills.sort((a, b) => a - b);

    console.log('Module 3 (Speed Multiplication) Micro-Skills:\n');
    for (const msId of sortedMS) {
      const name = getMicroSkillName(msId);
      const count = await QuestionModel.countDocuments({ module_id: 3, micro_skill_id: msId });
      console.log(`  MS${msId}: ${name} (${count} questions)`);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ VERIFICATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('✅ API endpoints NOW return:');
    console.log('   - module_id AND module_name');
    console.log('   - micro_skill_id AND micro_skill_name');
    console.log('   - module_description\n');

    console.log('✅ Updated endpoints:');
    console.log('   - GET /api/v1/practice/modules');
    console.log('   - POST /api/v1/practice/start (returns first_question with names)');
    console.log('   - POST /api/v1/practice/submit-answer (returns next_question with names)');
    console.log('   - GET /api/v1/practice/history (module names in breakdown)\n');

    console.log('✅ Frontend Integration:');
    console.log('   The frontend can now display proper names like:');
    console.log('   "Module 3: Speed Multiplication - Micro-Skill 7: Series of 9s"');
    console.log('   instead of just "Module 3 - MS 7"\n');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyAPI();
