import mongoose from 'mongoose';
import { QuestionModel } from '../src/models/question.model';

async function insertMissingQuestions() {
  try {
    await mongoose.connect('mongodb://localhost:27017/adaptive_learning_engine');
    console.log('Connected to MongoDB');

    const questionsToInsert: any[] = [];

    // ========================================
    // MICRO-SKILL 2: 3 Digit Numbers
    // ========================================

    // Difficulty 1: Simple 3-digit addition with round numbers
    const ms2_diff1 = [
      { q1: 100, q2: 200, ans: 300, time: 25 },
      { q1: 300, q2: 400, ans: 700, time: 25 },
      { q1: 500, q2: 200, ans: 700, time: 25 },
      { q1: 100, q2: 100, ans: 200, time: 25 },
      { q1: 600, q2: 300, ans: 900, time: 25 },
      { q1: 200, q2: 500, ans: 700, time: 25 },
      { q1: 400, q2: 400, ans: 800, time: 25 },
      { q1: 700, q2: 200, ans: 900, time: 25 },
    ];

    ms2_diff1.forEach((q, idx) => {
      questionsToInsert.push({
        question_code: `M1_MS2_Q${String(51 + idx).padStart(3, '0')}`,
        module_id: 1,
        micro_skill_id: 2,
        question_data: {
          text: `Calculate: ${q.q1} + ${q.q2}`,
          type: 'numerical_input',
          correct_answer: q.ans,
          solution_steps: [
            { step: 1, action: 'Add the numbers', calculation: `${q.q1} + ${q.q2}`, result: `${q.ans}` }
          ],
          hints: [
            { level: 1, text: 'These are round numbers - just add the hundreds' },
            { level: 2, text: `${q.q1 / 100} hundreds + ${q.q2 / 100} hundreds = ${q.ans / 100} hundreds` }
          ],
          options: []
        },
        metadata: {
          difficulty_level: 1,
          expected_time_seconds: q.time,
          points: 10,
          tags: ['addition', '3_digit', 'round_numbers'],
          prerequisites: [],
          common_errors: []
        },
        performance: {
          total_attempts: 0,
          success_rate: 0,
          avg_hints_used: 0,
          abandon_rate: 0
        },
        status: 'active'
      });
    });

    // Difficulty 2: 3-digit with one non-zero digit
    const ms2_diff2 = [
      { q1: 123, q2: 100, ans: 223, time: 30 },
      { q1: 234, q2: 200, ans: 434, time: 30 },
      { q1: 345, q2: 300, ans: 645, time: 30 },
      { q1: 456, q2: 100, ans: 556, time: 30 },
      { q1: 567, q2: 200, ans: 767, time: 30 },
      { q1: 678, q2: 100, ans: 778, time: 30 },
      { q1: 789, q2: 100, ans: 889, time: 30 },
      { q1: 321, q2: 300, ans: 621, time: 30 },
    ];

    ms2_diff2.forEach((q, idx) => {
      questionsToInsert.push({
        question_code: `M1_MS2_Q${String(59 + idx).padStart(3, '0')}`,
        module_id: 1,
        micro_skill_id: 2,
        question_data: {
          text: `Calculate: ${q.q1} + ${q.q2}`,
          type: 'numerical_input',
          correct_answer: q.ans,
          solution_steps: [
            { step: 1, action: 'Add the numbers', calculation: `${q.q1} + ${q.q2}`, result: `${q.ans}` }
          ],
          hints: [
            { level: 1, text: 'Add the hundreds first, then the rest' },
            { level: 2, text: 'No carrying needed here' }
          ],
          options: []
        },
        metadata: {
          difficulty_level: 2,
          expected_time_seconds: q.time,
          points: 10,
          tags: ['addition', '3_digit', 'no_carry'],
          prerequisites: [],
          common_errors: []
        },
        performance: {
          total_attempts: 0,
          success_rate: 0,
          avg_hints_used: 0,
          abandon_rate: 0
        },
        status: 'active'
      });
    });

    // ========================================
    // MICRO-SKILL 3: 4 Digit Numbers
    // ========================================

    // Difficulty 1: Simple 4-digit addition with round thousands
    const ms3_diff1 = [
      { q1: 1000, q2: 2000, ans: 3000, time: 30 },
      { q1: 3000, q2: 4000, ans: 7000, time: 30 },
      { q1: 5000, q2: 2000, ans: 7000, time: 30 },
      { q1: 1000, q2: 1000, ans: 2000, time: 30 },
      { q1: 6000, q2: 3000, ans: 9000, time: 30 },
      { q1: 2000, q2: 5000, ans: 7000, time: 30 },
      { q1: 4000, q2: 4000, ans: 8000, time: 30 },
      { q1: 7000, q2: 2000, ans: 9000, time: 30 },
    ];

    ms3_diff1.forEach((q, idx) => {
      questionsToInsert.push({
        question_code: `M1_MS3_Q${String(51 + idx).padStart(3, '0')}`,
        module_id: 1,
        micro_skill_id: 3,
        question_data: {
          text: `Calculate: ${q.q1} + ${q.q2}`,
          type: 'numerical_input',
          correct_answer: q.ans,
          solution_steps: [
            { step: 1, action: 'Add the numbers', calculation: `${q.q1} + ${q.q2}`, result: `${q.ans}` }
          ],
          hints: [
            { level: 1, text: 'These are round thousands - just add them' },
            { level: 2, text: `${q.q1 / 1000} thousands + ${q.q2 / 1000} thousands = ${q.ans / 1000} thousands` }
          ],
          options: []
        },
        metadata: {
          difficulty_level: 1,
          expected_time_seconds: q.time,
          points: 10,
          tags: ['addition', '4_digit', 'round_thousands'],
          prerequisites: [],
          common_errors: []
        },
        performance: {
          total_attempts: 0,
          success_rate: 0,
          avg_hints_used: 0,
          abandon_rate: 0
        },
        status: 'active'
      });
    });

    // Difficulty 2: 4-digit with hundreds
    const ms3_diff2 = [
      { q1: 1200, q2: 2000, ans: 3200, time: 35 },
      { q1: 3400, q2: 2000, ans: 5400, time: 35 },
      { q1: 5600, q2: 1000, ans: 6600, time: 35 },
      { q1: 2300, q2: 3000, ans: 5300, time: 35 },
      { q1: 4500, q2: 2000, ans: 6500, time: 35 },
      { q1: 6700, q2: 1000, ans: 7700, time: 35 },
      { q1: 7800, q2: 1000, ans: 8800, time: 35 },
      { q1: 3210, q2: 2000, ans: 5210, time: 35 },
    ];

    ms3_diff2.forEach((q, idx) => {
      questionsToInsert.push({
        question_code: `M1_MS3_Q${String(59 + idx).padStart(3, '0')}`,
        module_id: 1,
        micro_skill_id: 3,
        question_data: {
          text: `Calculate: ${q.q1} + ${q.q2}`,
          type: 'numerical_input',
          correct_answer: q.ans,
          solution_steps: [
            { step: 1, action: 'Add the numbers', calculation: `${q.q1} + ${q.q2}`, result: `${q.ans}` }
          ],
          hints: [
            { level: 1, text: 'Add the thousands first' },
            { level: 2, text: 'No carrying needed' }
          ],
          options: []
        },
        metadata: {
          difficulty_level: 2,
          expected_time_seconds: q.time,
          points: 10,
          tags: ['addition', '4_digit', 'no_carry'],
          prerequisites: [],
          common_errors: []
        },
        performance: {
          total_attempts: 0,
          success_rate: 0,
          avg_hints_used: 0,
          abandon_rate: 0
        },
        status: 'active'
      });
    });

    // Difficulty 3: 4-digit simple addition
    const ms3_diff3 = [
      { q1: 1234, q2: 2000, ans: 3234, time: 40 },
      { q1: 2345, q2: 3000, ans: 5345, time: 40 },
      { q1: 3456, q2: 1000, ans: 4456, time: 40 },
      { q1: 4567, q2: 2000, ans: 6567, time: 40 },
      { q1: 5678, q2: 1000, ans: 6678, time: 40 },
      { q1: 6789, q2: 1000, ans: 7789, time: 40 },
      { q1: 7123, q2: 2000, ans: 9123, time: 40 },
      { q1: 8234, q2: 1000, ans: 9234, time: 40 },
    ];

    ms3_diff3.forEach((q, idx) => {
      questionsToInsert.push({
        question_code: `M1_MS3_Q${String(67 + idx).padStart(3, '0')}`,
        module_id: 1,
        micro_skill_id: 3,
        question_data: {
          text: `Calculate: ${q.q1} + ${q.q2}`,
          type: 'numerical_input',
          correct_answer: q.ans,
          solution_steps: [
            { step: 1, action: 'Add the numbers', calculation: `${q.q1} + ${q.q2}`, result: `${q.ans}` }
          ],
          hints: [
            { level: 1, text: 'Start from the ones place' },
            { level: 2, text: 'Add each place value' }
          ],
          options: []
        },
        metadata: {
          difficulty_level: 3,
          expected_time_seconds: q.time,
          points: 15,
          tags: ['addition', '4_digit'],
          prerequisites: [],
          common_errors: []
        },
        performance: {
          total_attempts: 0,
          success_rate: 0,
          avg_hints_used: 0,
          abandon_rate: 0
        },
        status: 'active'
      });
    });

    // Difficulty 4: 4-digit with simple carrying
    const ms3_diff4 = [
      { q1: 1256, q2: 2345, ans: 3601, time: 45 },
      { q1: 2378, q2: 3412, ans: 5790, time: 45 },
      { q1: 3489, q2: 1234, ans: 4723, time: 45 },
      { q1: 4567, q2: 2145, ans: 6712, time: 45 },
      { q1: 5678, q2: 1234, ans: 6912, time: 45 },
      { q1: 6789, q2: 2123, ans: 8912, time: 45 },
      { q1: 7234, q2: 1567, ans: 8801, time: 45 },
      { q1: 8345, q2: 1456, ans: 9801, time: 45 },
    ];

    ms3_diff4.forEach((q, idx) => {
      questionsToInsert.push({
        question_code: `M1_MS3_Q${String(75 + idx).padStart(3, '0')}`,
        module_id: 1,
        micro_skill_id: 3,
        question_data: {
          text: `Calculate: ${q.q1} + ${q.q2}`,
          type: 'numerical_input',
          correct_answer: q.ans,
          solution_steps: [
            { step: 1, action: 'Add ones place with carry', calculation: 'Add and carry', result: 'Result' },
            { step: 2, action: 'Add tens place with carry', calculation: 'Add and carry', result: 'Result' },
            { step: 3, action: 'Complete addition', calculation: `${q.q1} + ${q.q2}`, result: `${q.ans}` }
          ],
          hints: [
            { level: 1, text: 'Remember to carry when needed' },
            { level: 2, text: 'Work from right to left' }
          ],
          options: []
        },
        metadata: {
          difficulty_level: 4,
          expected_time_seconds: q.time,
          points: 15,
          tags: ['addition', '4_digit', 'with_carry'],
          prerequisites: [],
          common_errors: [
            { type: 'carry_error', frequency: 0.3, description: 'Forgetting to carry' }
          ]
        },
        performance: {
          total_attempts: 0,
          success_rate: 0,
          avg_hints_used: 0,
          abandon_rate: 0
        },
        status: 'active'
      });
    });

    console.log(`\n=== INSERTING QUESTIONS ===`);
    console.log(`Total questions to insert: ${questionsToInsert.length}`);
    console.log(`- Micro-skill 2 (3 Digit) - Difficulty 1: ${ms2_diff1.length}`);
    console.log(`- Micro-skill 2 (3 Digit) - Difficulty 2: ${ms2_diff2.length}`);
    console.log(`- Micro-skill 3 (4 Digit) - Difficulty 1: ${ms3_diff1.length}`);
    console.log(`- Micro-skill 3 (4 Digit) - Difficulty 2: ${ms3_diff2.length}`);
    console.log(`- Micro-skill 3 (4 Digit) - Difficulty 3: ${ms3_diff3.length}`);
    console.log(`- Micro-skill 3 (4 Digit) - Difficulty 4: ${ms3_diff4.length}`);

    // Insert all questions
    const result = await QuestionModel.insertMany(questionsToInsert);
    console.log(`\n✅ Successfully inserted ${result.length} questions!`);

    // Verify insertion
    console.log(`\n=== VERIFICATION ===`);
    for (let skill = 2; skill <= 3; skill++) {
      console.log(`\nMicro-skill ${skill}:`);
      for (let diff = 1; diff <= 10; diff++) {
        const count = await QuestionModel.countDocuments({
          module_id: 1,
          micro_skill_id: skill,
          'metadata.difficulty_level': diff
        });
        if (count > 0) {
          console.log(`  Difficulty ${diff}: ${count} questions`);
        }
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error inserting questions:', error);
    process.exit(1);
  }
}

insertMissingQuestions();
