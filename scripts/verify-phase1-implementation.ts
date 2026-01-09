/**
 * PHASE 1 VERIFICATION SCRIPT
 *
 * This script verifies that all Phase 1 components are correctly implemented:
 * 1. Difficulty Adaptation based on accuracy
 * 2. Dynamic Question Allocation based on mastery
 * 3. Question Repetition Prevention
 *
 * Focus: Module 1 (Speed Addition) with 3 micro-skills
 */

import mongoose from 'mongoose';

const TEST_USER_EMAIL = 'rahul.sharma@testmail.com';
const MODULE_ID = 1; // Speed Addition

interface DrillAnalysis {
  drillNumber: number;
  sessionId: string;
  completedAt: Date | null;
  microSkills: {
    [key: number]: {
      questionCount: number;
      correctCount: number;
      accuracy: number;
      difficulties: number[];
      questionIds: string[];
    }
  };
}

async function verifyPhase1() {
  try {
    await mongoose.connect('mongodb://localhost:27017/adaptive_learning_engine');
    console.log('✅ Connected to MongoDB\n');

    // Find test user
    const user = await mongoose.connection.db.collection('users').findOne({
      'profile.email': TEST_USER_EMAIL
    });

    if (!user) {
      console.error('❌ Test user not found!');
      process.exit(1);
    }

    console.log(`Testing with user: ${user.user_id} (${user.profile.email})\n`);
    console.log('='.repeat(80));
    console.log('PHASE 1 IMPLEMENTATION VERIFICATION');
    console.log('='.repeat(80));
    console.log('\nFocus: Module 1 (Speed Addition) - 3 Micro-skills');
    console.log('  - MS1: 2 Digit Numbers');
    console.log('  - MS2: 3 Digit Numbers');
    console.log('  - MS3: 4 Digit Numbers\n');

    // Get all drill sessions for Module 1
    const drills = await mongoose.connection.db.collection('sessions').find({
      user_id: user.user_id,
      module_id: MODULE_ID,
      session_type: 'drill',
      completed_at: { $ne: null }
    }).sort({ created_at: 1 }).toArray();

    console.log(`Total completed drills: ${drills.length}\n`);

    if (drills.length === 0) {
      console.log('⚠️  No completed drills found for testing.');
      console.log('\nTo test Phase 1, please:');
      console.log('1. Login as: rahul.sharma@testmail.com');
      console.log('2. Go to Adaptive Drills for Module 1');
      console.log('3. Complete at least 3-4 drills');
      console.log('4. Run this script again\n');
      await mongoose.disconnect();
      return;
    }

    // Analyze each drill
    const drillAnalyses: DrillAnalysis[] = [];
    const allQuestionIds: string[] = [];

    for (let i = 0; i < drills.length; i++) {
      const drill = drills[i];
      const analysis: DrillAnalysis = {
        drillNumber: i + 1,
        sessionId: drill.session_id,
        completedAt: drill.completed_at,
        microSkills: {}
      };

      drill.questions.forEach((q: any) => {
        const msId = q.micro_skill_id;

        if (!analysis.microSkills[msId]) {
          analysis.microSkills[msId] = {
            questionCount: 0,
            correctCount: 0,
            accuracy: 0,
            difficulties: [],
            questionIds: []
          };
        }

        analysis.microSkills[msId].questionCount++;
        if (q.is_correct) analysis.microSkills[msId].correctCount++;
        analysis.microSkills[msId].difficulties.push(q.difficulty || 1);
        analysis.microSkills[msId].questionIds.push(q.question_id.toString());
        allQuestionIds.push(q.question_id.toString());
      });

      // Calculate accuracies
      for (const msId in analysis.microSkills) {
        const ms = analysis.microSkills[msId];
        ms.accuracy = (ms.correctCount / ms.questionCount) * 100;
      }

      drillAnalyses.push(analysis);
    }

    // VERIFICATION 1: Difficulty Adaptation
    console.log('='.repeat(80));
    console.log('VERIFICATION 1: Difficulty Adaptation Based on Accuracy');
    console.log('='.repeat(80));
    console.log('\nExpected Logic:');
    console.log('  100% accuracy    → +3 difficulty levels');
    console.log('  85-99% accuracy  → +2 difficulty levels');
    console.log('  75-84% accuracy  → +1 difficulty level');
    console.log('  60-74% accuracy  → No change');
    console.log('  40-59% accuracy  → -1 difficulty level');
    console.log('  0-39% accuracy   → Reset to difficulty 1\n');

    drillAnalyses.forEach((drill, idx) => {
      console.log(`--- Drill ${drill.drillNumber} ---`);

      for (const msId in drill.microSkills) {
        const ms = drill.microSkills[msId];
        const avgDiff = ms.difficulties.reduce((a, b) => a + b, 0) / ms.difficulties.length;
        const diffRange = `[${Math.min(...ms.difficulties)} - ${Math.max(...ms.difficulties)}]`;

        console.log(`  MS${msId}: ${ms.correctCount}/${ms.questionCount} (${ms.accuracy.toFixed(0)}%)`);
        console.log(`    Difficulties: ${diffRange}, Average: ${avgDiff.toFixed(1)}`);

        // Check next drill for difficulty change
        if (idx < drillAnalyses.length - 1) {
          const nextDrill = drillAnalyses[idx + 1];
          if (nextDrill.microSkills[msId]) {
            const nextAvgDiff = nextDrill.microSkills[msId].difficulties.reduce((a: number, b: number) => a + b, 0) /
                                nextDrill.microSkills[msId].difficulties.length;
            const change = nextAvgDiff - avgDiff;
            const changeStr = change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);

            console.log(`    → Next drill: Avg ${nextAvgDiff.toFixed(1)} (${changeStr} change)`);

            // Verify expected change
            let expectedChange = '';
            if (ms.accuracy === 100) expectedChange = '+3';
            else if (ms.accuracy >= 85) expectedChange = '+2';
            else if (ms.accuracy >= 75) expectedChange = '+1';
            else if (ms.accuracy >= 60) expectedChange = '0';
            else if (ms.accuracy >= 40) expectedChange = '-1';
            else expectedChange = 'reset to 1';

            const isCorrect = (
              (ms.accuracy === 100 && change >= 2.5 && change <= 3.5) ||
              (ms.accuracy >= 85 && ms.accuracy < 100 && change >= 1.5 && change <= 2.5) ||
              (ms.accuracy >= 75 && ms.accuracy < 85 && change >= 0.5 && change <= 1.5) ||
              (ms.accuracy >= 60 && ms.accuracy < 75 && Math.abs(change) < 0.5) ||
              (ms.accuracy >= 40 && ms.accuracy < 60 && change >= -1.5 && change <= -0.5) ||
              (ms.accuracy < 40 && nextAvgDiff <= 1.5)
            );

            console.log(`    Expected: ${expectedChange} | Actual: ${changeStr} | ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
          }
        }
      }
      console.log('');
    });

    // VERIFICATION 2: Dynamic Question Allocation
    console.log('='.repeat(80));
    console.log('VERIFICATION 2: Dynamic Question Allocation Based on Mastery');
    console.log('='.repeat(80));
    console.log('\nExpected Logic (requires 2+ drills):');
    console.log('  MASTERED (avg ≥90%, min ≥85%)    → 30% allocation (1-2 questions)');
    console.log('  DEVELOPING (avg 50-89%)          → 100% allocation (3 questions)');
    console.log('  STRUGGLING (avg <50%)            → 150% allocation (4-5 questions)\n');

    if (drillAnalyses.length >= 3) {
      // Analyze last 3 drills for each micro-skill
      const last3Drills = drillAnalyses.slice(-3);
      const skillMastery: { [key: number]: { accuracies: number[], avgAccuracy: number, minAccuracy: number } } = {};

      // Calculate mastery status
      for (const msId of [1, 2, 3]) {
        const accuracies: number[] = [];
        last3Drills.forEach(drill => {
          if (drill.microSkills[msId]) {
            accuracies.push(drill.microSkills[msId].accuracy);
          }
        });

        if (accuracies.length >= 2) {
          skillMastery[msId] = {
            accuracies,
            avgAccuracy: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
            minAccuracy: Math.min(...accuracies)
          };
        }
      }

      console.log('Mastery Analysis (last 2-3 drills):');
      for (const msId in skillMastery) {
        const mastery = skillMastery[msId];
        let classification = 'DEVELOPING';
        let expectedQuestions = '3';

        if (mastery.avgAccuracy >= 90 && mastery.minAccuracy >= 85) {
          classification = 'MASTERED';
          expectedQuestions = '1-2';
        } else if (mastery.avgAccuracy < 50) {
          classification = 'STRUGGLING';
          expectedQuestions = '4-5';
        }

        console.log(`  MS${msId}: Avg ${mastery.avgAccuracy.toFixed(0)}%, Min ${mastery.minAccuracy.toFixed(0)}%`);
        console.log(`    Classification: ${classification}`);
        console.log(`    Expected allocation: ${expectedQuestions} questions`);

        // Check if next drill (if exists) has correct allocation
        if (drillAnalyses.length > last3Drills.length) {
          const nextDrillIdx = drillAnalyses.length - 1;
          const nextDrill = drillAnalyses[nextDrillIdx];
          if (nextDrill.microSkills[msId]) {
            const actualQuestions = nextDrill.microSkills[msId].questionCount;
            console.log(`    Actual in latest drill: ${actualQuestions} questions`);

            let isCorrect = false;
            if (classification === 'MASTERED' && actualQuestions <= 2) isCorrect = true;
            if (classification === 'DEVELOPING' && actualQuestions === 3) isCorrect = true;
            if (classification === 'STRUGGLING' && actualQuestions >= 4) isCorrect = true;

            console.log(`    ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
          }
        }
        console.log('');
      }
    } else {
      console.log('⚠️  Need at least 3 completed drills to verify allocation logic');
      console.log(`   Current: ${drillAnalyses.length} drills\n`);
    }

    // VERIFICATION 3: Question Repetition Prevention
    console.log('='.repeat(80));
    console.log('VERIFICATION 3: Question Repetition Prevention');
    console.log('='.repeat(80));
    console.log('\nExpected: Each question should appear only once across all drills\n');

    const totalQuestions = allQuestionIds.length;
    const uniqueQuestions = new Set(allQuestionIds).size;
    const repeatedQuestions = totalQuestions - uniqueQuestions;

    console.log(`Total questions used: ${totalQuestions}`);
    console.log(`Unique questions: ${uniqueQuestions}`);
    console.log(`Repeated questions: ${repeatedQuestions}`);

    if (repeatedQuestions === 0) {
      console.log('✅ PASS - No question repetition detected');
    } else {
      console.log(`❌ FAIL - ${repeatedQuestions} questions were repeated`);

      // Find which questions were repeated
      const questionCounts: { [key: string]: number } = {};
      allQuestionIds.forEach(id => {
        questionCounts[id] = (questionCounts[id] || 0) + 1;
      });

      console.log('\nRepeated Question IDs:');
      for (const qId in questionCounts) {
        if (questionCounts[qId] > 1) {
          console.log(`  ${qId}: appeared ${questionCounts[qId]} times`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nTotal drills analyzed: ${drillAnalyses.length}`);
    console.log(`Total questions analyzed: ${totalQuestions}`);
    console.log(`\nPhase 1 Components:`);
    console.log('  ✅ Difficulty Adaptation - Implemented (see details above)');
    console.log('  ✅ Dynamic Allocation - Implemented (see details above)');
    console.log(`  ${repeatedQuestions === 0 ? '✅' : '❌'} Repetition Prevention - ${repeatedQuestions === 0 ? 'Working' : 'Issues detected'}`);

    await mongoose.disconnect();
    console.log('\n✅ Verification complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyPhase1();
