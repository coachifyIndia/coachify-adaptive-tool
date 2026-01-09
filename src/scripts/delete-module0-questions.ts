/**
 * DELETE MODULE 0 QUESTIONS
 *
 * Module 0 (Magic Maths) should have NO practice questions per PDF.
 * This script deletes all 36 questions from Module 0.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const QuestionSchema = new mongoose.Schema({}, { collection: 'questions', strict: false });
const QuestionModel = mongoose.model('Question', QuestionSchema);

async function deleteModule0Questions(): Promise<void> {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB\n');

    // Count Module 0 questions
    const count = await QuestionModel.countDocuments({ module_id: 0 });
    console.log(`📊 Found ${count} questions in Module 0`);

    if (count === 0) {
      console.log('✅ No questions to delete!\n');
      await mongoose.disconnect();
      return;
    }

    // Get question codes for confirmation
    const questions = await QuestionModel.find({ module_id: 0 }, { question_code: 1 }).limit(10).lean() as any[];
    console.log(`\n📋 Sample question codes to be deleted:`);
    questions.forEach((q: any) => console.log(`   - ${q.question_code}`));
    if (count > 10) {
      console.log(`   ... and ${count - 10} more\n`);
    }

    // Delete all Module 0 questions
    console.log(`🗑️  Deleting ${count} questions from Module 0...`);
    const result = await QuestionModel.deleteMany({ module_id: 0 });

    console.log(`\n✅ Successfully deleted ${result.deletedCount} questions from Module 0`);
    console.log(`\n📊 Module 0 now has: ${await QuestionModel.countDocuments({ module_id: 0 })} questions (should be 0)\n`);

    await mongoose.disconnect();
    console.log('✅ Complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteModule0Questions();
