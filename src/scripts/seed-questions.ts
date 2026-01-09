/**
 * SAMPLE QUESTIONS SEEDING SCRIPT
 *
 * This script creates sample questions for testing and development.
 * It creates questions across different modules and difficulty levels.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - This creates a SMALL set of sample questions (not the full 3,100)
 * - Questions are structured with text, correct answer, solution steps, and hints
 * - Each question has metadata like difficulty level and expected time
 * - The script is idempotent (safe to run multiple times)
 *
 * USAGE:
 * npm run db:seed:questions
 * or
 * ts-node src/scripts/seed-questions.ts
 */

import database from '../config/database.config';
import { QuestionModel } from '../models/question.model';
import { QuestionType, QuestionStatus } from '../types';
import logger from '../utils/logger.util';

/**
 * Interface for sample question data
 * This makes it easier to create questions with proper structure
 */
interface SampleQuestion {
  module_id: number;
  micro_skill_id: number;
  text: string;
  type: QuestionType;
  options?: string[];
  correct_answer: string | number;
  solution_steps: Array<{
    step: number;
    action: string;
    calculation: string;
    result: string | number;
  }>;
  hints: Array<{
    level: number;
    text: string;
  }>;
  difficulty_level: number; // 1-10
  expected_time_seconds: number;
  points: number;
  tags: string[];
}

/**
 * SAMPLE QUESTIONS DATA
 *
 * These are example questions across different modules and difficulty levels.
 * In production, you'll have 3,100+ questions loaded from a JSON file or database.
 */
const SAMPLE_QUESTIONS: SampleQuestion[] = [
  // ======================================================================
  // MODULE 0: MAGIC MATHS - Sample Questions
  // ======================================================================
  {
    module_id: 0,
    micro_skill_id: 1,
    text: 'What is the result of 37 + 48 using the tens-and-ones mental math trick?',
    type: QuestionType.NUMERICAL_INPUT,
    correct_answer: 85,
    solution_steps: [
      {
        step: 1,
        action: 'Break down into tens and ones',
        calculation: '37 = 30 + 7, 48 = 40 + 8',
        result: 'Tens: 30 + 40 = 70, Ones: 7 + 8 = 15',
      },
      {
        step: 2,
        action: 'Add tens and ones',
        calculation: '70 + 15',
        result: 85,
      },
    ],
    hints: [
      { level: 1, text: 'Try breaking each number into tens and ones separately' },
      { level: 2, text: 'Add the tens first (30 + 40), then add the ones (7 + 8)' },
    ],
    difficulty_level: 1,
    expected_time_seconds: 30,
    points: 5,
    tags: ['mental_math', 'addition', 'basic'],
  },

  {
    module_id: 0,
    micro_skill_id: 3,
    text: 'Calculate 25 × 4 mentally',
    type: QuestionType.NUMERICAL_INPUT,
    correct_answer: 100,
    solution_steps: [
      {
        step: 1,
        action: 'Recognize that 25 × 4 = 100',
        calculation: '25 × 4 = (100 ÷ 4) × 4',
        result: 100,
      },
    ],
    hints: [
      { level: 1, text: 'Think about how many 25s make 100' },
      { level: 2, text: '25 is one quarter of 100, so 25 × 4 = 100' },
    ],
    difficulty_level: 2,
    expected_time_seconds: 20,
    points: 5,
    tags: ['mental_math', 'multiplication', 'patterns'],
  },

  // ======================================================================
  // MODULE 1: SPEED ADDITION - Sample Questions
  // ======================================================================
  {
    module_id: 1,
    micro_skill_id: 6,
    text: 'Add: 47 + 38',
    type: QuestionType.NUMERICAL_INPUT,
    correct_answer: 85,
    solution_steps: [
      {
        step: 1,
        action: 'Add the tens',
        calculation: '40 + 30',
        result: 70,
      },
      {
        step: 2,
        action: 'Add the ones',
        calculation: '7 + 8',
        result: 15,
      },
      {
        step: 3,
        action: 'Combine',
        calculation: '70 + 15',
        result: 85,
      },
    ],
    hints: [
      { level: 1, text: 'Add the tens place first, then the ones' },
      { level: 2, text: '40 + 30 = 70, then 7 + 8 = 15, finally 70 + 15 = 85' },
    ],
    difficulty_level: 2,
    expected_time_seconds: 25,
    points: 5,
    tags: ['addition', '2-digit', 'speed'],
  },

  {
    module_id: 1,
    micro_skill_id: 7,
    text: 'Calculate: 456 + 789',
    type: QuestionType.MCQ,
    options: ['1145', '1235', '1245', '1345'],
    correct_answer: '1245',
    solution_steps: [
      {
        step: 1,
        action: 'Add ones place',
        calculation: '6 + 9 = 15 (write 5, carry 1)',
        result: '5 in ones, carry 1',
      },
      {
        step: 2,
        action: 'Add tens place with carry',
        calculation: '5 + 8 + 1 = 14 (write 4, carry 1)',
        result: '4 in tens, carry 1',
      },
      {
        step: 3,
        action: 'Add hundreds place with carry',
        calculation: '4 + 7 + 1 = 12',
        result: '1245',
      },
    ],
    hints: [
      { level: 1, text: 'Start from the rightmost digit and work left, carrying over when needed' },
      { level: 2, text: 'Ones: 6+9=15 (carry 1), Tens: 5+8+1=14 (carry 1), Hundreds: 4+7+1=12' },
    ],
    difficulty_level: 3,
    expected_time_seconds: 35,
    points: 10,
    tags: ['addition', '3-digit', 'carry'],
  },

  // ======================================================================
  // MODULE 3: SPEED MULTIPLICATION - Sample Questions
  // ======================================================================
  {
    module_id: 3,
    micro_skill_id: 12,
    text: 'Calculate: 9 × 7',
    type: QuestionType.NUMERICAL_INPUT,
    correct_answer: 63,
    solution_steps: [
      {
        step: 1,
        action: 'Use the 9s trick',
        calculation: '(7 - 1) in tens place, (10 - 7) in ones',
        result: '6 in tens, 3 in ones',
      },
      {
        step: 2,
        action: 'Combine',
        calculation: '60 + 3',
        result: 63,
      },
    ],
    hints: [
      { level: 1, text: 'For 9 times any number n, tens = n-1, ones = 10-n' },
      { level: 2, text: '9 × 7: tens = 7-1 = 6, ones = 10-7 = 3, so 63' },
    ],
    difficulty_level: 2,
    expected_time_seconds: 20,
    points: 5,
    tags: ['multiplication', 'pattern', '9s'],
  },

  {
    module_id: 3,
    micro_skill_id: 15,
    text: 'Multiply: 36 × 5',
    type: QuestionType.NUMERICAL_INPUT,
    correct_answer: 180,
    solution_steps: [
      {
        step: 1,
        action: 'Multiply by 10 and divide by 2',
        calculation: '36 × 10 = 360',
        result: 360,
      },
      {
        step: 2,
        action: 'Divide by 2',
        calculation: '360 ÷ 2',
        result: 180,
      },
    ],
    hints: [
      { level: 1, text: 'Multiplying by 5 is the same as multiplying by 10 and dividing by 2' },
      { level: 2, text: '36 × 10 = 360, then 360 ÷ 2 = 180' },
    ],
    difficulty_level: 2,
    expected_time_seconds: 25,
    points: 5,
    tags: ['multiplication', 'powers_of_5', 'shortcut'],
  },

  // ======================================================================
  // MODULE 9: PERCENTAGE - Sample Questions
  // ======================================================================
  {
    module_id: 9,
    micro_skill_id: 42,
    text: 'What is 20% of 150?',
    type: QuestionType.MCQ,
    options: ['25', '30', '35', '40'],
    correct_answer: '30',
    solution_steps: [
      {
        step: 1,
        action: 'Convert percentage to decimal',
        calculation: '20% = 20/100 = 0.20',
        result: 0.2,
      },
      {
        step: 2,
        action: 'Multiply by the number',
        calculation: '0.20 × 150',
        result: 30,
      },
    ],
    hints: [
      { level: 1, text: 'Convert 20% to a decimal (0.20) and multiply by 150' },
      { level: 2, text: '20% means 20 per 100, so 20/100 × 150' },
    ],
    difficulty_level: 2,
    expected_time_seconds: 30,
    points: 5,
    tags: ['percentage', 'basic', 'calculation'],
  },

  {
    module_id: 9,
    micro_skill_id: 43,
    text: 'If a shirt costs ₹500 and there\'s a 25% discount, what is the discounted price?',
    type: QuestionType.NUMERICAL_INPUT,
    correct_answer: 375,
    solution_steps: [
      {
        step: 1,
        action: 'Calculate discount amount',
        calculation: '25% of 500 = 0.25 × 500',
        result: 125,
      },
      {
        step: 2,
        action: 'Subtract from original price',
        calculation: '500 - 125',
        result: 375,
      },
    ],
    hints: [
      { level: 1, text: 'First find 25% of 500, then subtract from the original price' },
      { level: 2, text: '25% of 500 = 125, so 500 - 125 = 375' },
    ],
    difficulty_level: 3,
    expected_time_seconds: 40,
    points: 10,
    tags: ['percentage', 'discount', 'real_world'],
  },

  // ======================================================================
  // MODULE 12: FRACTIONS - Sample Questions
  // ======================================================================
  {
    module_id: 12,
    micro_skill_id: 52,
    text: 'Simplify the fraction: 12/18',
    type: QuestionType.MCQ,
    options: ['1/2', '2/3', '3/4', '4/5'],
    correct_answer: '2/3',
    solution_steps: [
      {
        step: 1,
        action: 'Find GCD of 12 and 18',
        calculation: 'GCD(12, 18) = 6',
        result: 6,
      },
      {
        step: 2,
        action: 'Divide both numerator and denominator by GCD',
        calculation: '(12 ÷ 6) / (18 ÷ 6)',
        result: '2/3',
      },
    ],
    hints: [
      { level: 1, text: 'Find the greatest common divisor of 12 and 18' },
      { level: 2, text: 'Both 12 and 18 are divisible by 6' },
    ],
    difficulty_level: 2,
    expected_time_seconds: 35,
    points: 5,
    tags: ['fractions', 'simplification', 'gcd'],
  },

  // ======================================================================
  // MODULE 17: SIMPLE EQUATIONS - Sample Questions
  // ======================================================================
  {
    module_id: 17,
    micro_skill_id: 61,
    text: 'Solve for x: 2x + 5 = 15',
    type: QuestionType.NUMERICAL_INPUT,
    correct_answer: 5,
    solution_steps: [
      {
        step: 1,
        action: 'Subtract 5 from both sides',
        calculation: '2x + 5 - 5 = 15 - 5',
        result: '2x = 10',
      },
      {
        step: 2,
        action: 'Divide both sides by 2',
        calculation: '2x ÷ 2 = 10 ÷ 2',
        result: 'x = 5',
      },
    ],
    hints: [
      { level: 1, text: 'First isolate the term with x by subtracting 5 from both sides' },
      { level: 2, text: 'After subtracting 5, you get 2x = 10, then divide by 2' },
    ],
    difficulty_level: 2,
    expected_time_seconds: 30,
    points: 5,
    tags: ['equations', 'linear', 'algebra'],
  },
];

/**
 * Generate question code in format: M{module}_MS{skill}_Q{number}
 *
 * @param moduleId - The module ID
 * @param microSkillId - The micro-skill ID
 * @param questionNumber - The question number for this skill
 * @returns Formatted question code (e.g., "M3_MS12_Q001")
 */
function generateQuestionCode(
  moduleId: number,
  microSkillId: number,
  questionNumber: number
): string {
  // Pad the question number with zeros to make it 3 digits
  const paddedNumber = questionNumber.toString().padStart(3, '0');
  return `M${moduleId}_MS${microSkillId}_Q${paddedNumber}`;
}

/**
 * CREATE A SINGLE QUESTION
 *
 * This function creates one question in the database.
 * It handles duplicate checking and generates the question code.
 *
 * @param questionData - The question data to create
 * @param questionNumber - The sequential number for this question
 * @returns The created question or null if it already exists
 */
async function createQuestion(questionData: SampleQuestion, questionNumber: number) {
  try {
    // STEP 1: Generate question code
    const questionCode = generateQuestionCode(
      questionData.module_id,
      questionData.micro_skill_id,
      questionNumber
    );

    // STEP 2: Check if question already exists
    const existingQuestion = await QuestionModel.findOne({ question_code: questionCode });

    if (existingQuestion) {
      logger.info(`Question already exists: ${questionCode} - Skipping`);
      return null;
    }

    // STEP 3: Create the question document
    const question = new QuestionModel({
      question_code: questionCode,
      module_id: questionData.module_id,
      micro_skill_id: questionData.micro_skill_id,
      question_data: {
        text: questionData.text,
        type: questionData.type,
        options: questionData.options || [],
        correct_answer: questionData.correct_answer,
        solution_steps: questionData.solution_steps,
        hints: questionData.hints,
      },
      metadata: {
        difficulty_level: questionData.difficulty_level,
        expected_time_seconds: questionData.expected_time_seconds,
        actual_avg_time: 0, // Will be updated as users attempt the question
        points: questionData.points,
        tags: questionData.tags,
        prerequisites: [], // Can be added later
        common_errors: [], // Will be populated as we track user errors
      },
      performance: {
        total_attempts: 0,
        success_rate: 0,
        avg_hints_used: 0,
        abandon_rate: 0,
      },
      status: QuestionStatus.ACTIVE,
    });

    // STEP 4: Save to database
    await question.save();

    logger.info(
      `✓ Created question: ${questionCode} - Module ${questionData.module_id}, Skill ${questionData.micro_skill_id}, Difficulty ${questionData.difficulty_level}`
    );

    return question;
  } catch (error) {
    logger.error(`Error creating question ${questionData.text.substring(0, 50)}:`, error);
    throw error;
  }
}

/**
 * MAIN SEEDING FUNCTION
 *
 * This orchestrates the entire question seeding process.
 */
async function seedQuestions() {
  try {
    // STEP 1: Connect to database
    logger.info('Connecting to database...');
    await database.connect();
    logger.info('Database connected successfully');

    // STEP 2: Seed questions
    logger.info(`\nSeeding ${SAMPLE_QUESTIONS.length} sample questions...`);
    logger.info('='.repeat(60));

    let createdCount = 0;
    let skippedCount = 0;

    // Track question numbers per micro-skill
    // This ensures each skill's questions are numbered sequentially
    const questionCounters: { [key: number]: number } = {};

    // Process each question
    for (const questionData of SAMPLE_QUESTIONS) {
      // Initialize counter for this micro-skill if it doesn't exist
      if (!questionCounters[questionData.micro_skill_id]) {
        questionCounters[questionData.micro_skill_id] = 1;
      }

      const question = await createQuestion(
        questionData,
        questionCounters[questionData.micro_skill_id]
      );

      if (question) {
        createdCount++;
        // Increment counter for this micro-skill
        questionCounters[questionData.micro_skill_id]++;
      } else {
        skippedCount++;
      }
    }

    // STEP 3: Summary
    logger.info('='.repeat(60));
    logger.info('\n📊 SEEDING SUMMARY:');
    logger.info(`   ✓ Created: ${createdCount} questions`);
    logger.info(`   ⊘ Skipped: ${skippedCount} questions (already existed)`);
    logger.info(`   📧 Total: ${SAMPLE_QUESTIONS.length} questions processed\n`);

    // STEP 4: Display statistics
    const stats = await QuestionModel.aggregate([
      { $match: { status: QuestionStatus.ACTIVE } },
      {
        $group: {
          _id: '$module_id',
          count: { $sum: 1 },
          avgDifficulty: { $avg: '$metadata.difficulty_level' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    logger.info('📈 QUESTIONS BY MODULE:');
    logger.info('='.repeat(60));
    stats.forEach((stat) => {
      logger.info(
        `   Module ${stat._id}: ${stat.count} questions (Avg Difficulty: ${stat.avgDifficulty.toFixed(1)})`
      );
    });
    logger.info('='.repeat(60));
  } catch (error) {
    logger.error('Error during question seeding:', error);
    throw error;
  } finally {
    // ALWAYS disconnect from database
    await database.disconnect();
    logger.info('\nDatabase disconnected');
  }
}

/**
 * Execute the seeding function
 */
if (require.main === module) {
  seedQuestions()
    .then(() => {
      logger.info('\n✅ Question seeding completed successfully!');
      logger.info('💡 TIP: You can add more questions by extending the SAMPLE_QUESTIONS array');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n❌ Question seeding failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
export { seedQuestions, createQuestion, SAMPLE_QUESTIONS };
