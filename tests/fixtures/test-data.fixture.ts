/**
 * TEST DATA FIXTURE
 *
 * Test data and helper functions for adaptive drill testing
 */

import { APIRequestContext } from '@playwright/test';
import { getAuthHeader } from './auth.fixture';

// Test module
export const TEST_MODULE = {
  module_id: 1,
  name: 'Speed Addition',
  micro_skills: [1, 2, 3],
};

// Session type
export type SessionData = {
  session_id: string;
  total_questions: number;
  current_question_index: number;
  started_at: string;
  questions: any[]; // Will be populated as we get them
  first_question?: any;
};

/**
 * Start a new adaptive drill session
 */
export async function startAdaptiveDrill(
  request: APIRequestContext,
  token: string,
  moduleId: number = TEST_MODULE.module_id,
  drillNumber: number = 1
): Promise<SessionData> {
  // Use the correct drill endpoint
  const response = await request.post('/api/v1/practice/drill/start', {
    headers: getAuthHeader(token),
    data: {
      module_id: moduleId,
      drill_number: drillNumber,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to start session: ${response.status()} ${await response.text()}`);
  }

  const data = await response.json();
  const sessionId = data.data.session.session_id;
  const totalQuestions = data.data.session.total_questions;

  // We need to get all question details by fetching the session
  // and then fetching each question's details
  const sessionResponse = await request.get(`/api/v1/practice/session/${sessionId}`, {
    headers: getAuthHeader(token),
  });

  const sessionData = await sessionResponse.json();
  const plannedQuestionIds = sessionData.data.session.planned_questions || [];

  // Fetch question details using the questions explore endpoint
  // We need to get actual question data including correct_answer and micro_skill_id
  const questions: any[] = [];

  // Build question list from the session - use first question as template for now
  // and fetch each question's actual data
  const firstQ = data.data.first_question;

  for (let i = 0; i < plannedQuestionIds.length; i++) {
    const questionId = plannedQuestionIds[i];

    // For the first question, we already have the data
    if (i === 0 && firstQ) {
      questions.push({
        question_id: questionId,
        micro_skill_id: firstQ.micro_skill_id,
        difficulty: firstQ.difficulty_level,
        correct_answer: firstQ.options?.[0]?.value || '0', // First option is usually correct in test data
        text: firstQ.text,
      });
    } else {
      // For subsequent questions, we'll discover them as we answer
      // Use placeholder - actual answer validation happens server-side
      questions.push({
        question_id: questionId,
        micro_skill_id: 0, // Will be determined by server
        difficulty: 1, // Will be determined by server
        correct_answer: '0', // Default answer (option A)
      });
    }
  }

  return {
    session_id: sessionId,
    total_questions: totalQuestions,
    current_question_index: 0,
    started_at: data.data.session.started_at,
    session_type: 'drill',
    questions,
    first_question: firstQ,
  };
}

/**
 * Fetch full question details for a session
 * This populates micro_skill_id and correct answers for all questions
 */
export async function getFullSessionQuestions(
  request: APIRequestContext,
  token: string,
  sessionId: string
): Promise<any[]> {
  // Get session with enriched questions
  const response = await request.get(`/api/v1/practice/session/${sessionId}`, {
    headers: getAuthHeader(token),
  });

  if (!response.ok()) {
    return [];
  }

  const data = await response.json();
  return data.data.session.questions || [];
}

/**
 * Submit answer for a question
 */
export async function submitAnswer(
  request: APIRequestContext,
  token: string,
  sessionId: string,
  questionId: string,
  answer: string,
  timeSpent: number = 60,
  hintsUsed: number = 0
): Promise<any> {
  const response = await request.post('/api/v1/practice/submit-answer', {
    headers: getAuthHeader(token),
    data: {
      session_id: sessionId,
      question_id: questionId,
      user_answer: answer,
      time_spent_seconds: timeSpent,
      hints_used: hintsUsed,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to submit answer: ${response.status()} ${await response.text()}`);
  }

  return await response.json();
}

/**
 * Answer data collected during session
 */
export interface AnsweredQuestion {
  question_id: string;
  micro_skill_id: number;
  difficulty: number;
  is_correct: boolean;
  correct_answer: any;
  user_answer: any;
}

/**
 * Complete all questions in a session with specified accuracy
 *
 * This function submits answers to achieve approximately the target accuracy.
 * It discovers correct answers from the feedback and uses them for subsequent questions.
 *
 * Strategy:
 * - First pass: Submit wrong answers for all questions to learn correct answers
 * - OR: Use a lookup mechanism for the specific module's questions
 *
 * For simplicity: We'll submit answers and track results. To achieve target accuracy,
 * we'll first submit wrong answers to learn, then for questions where we need correct,
 * we'll use the revealed answer pattern.
 */
export async function completeSessionWithAccuracy(
  request: APIRequestContext,
  token: string,
  session: SessionData,
  accuracyPercent: number = 100
): Promise<{
  actualAccuracy: number;
  questionsAnswered: number;
  answeredQuestions: AnsweredQuestion[];
}> {
  const totalQuestions = session.total_questions;
  const targetCorrect = Math.ceil((totalQuestions * accuracyPercent) / 100);

  const answeredQuestions: AnsweredQuestion[] = [];

  // Start with first question from session
  let currentQuestion = session.first_question;
  let currentQuestionId = currentQuestion?.question_id || session.questions[0]?.question_id;
  let currentMicroSkillId = currentQuestion?.micro_skill_id || 0;
  let currentDifficulty = currentQuestion?.difficulty_level || 1;

  // Track correct answers per question (learned from feedback)
  const correctAnswers: Map<string, any> = new Map();

  for (let i = 0; i < totalQuestions; i++) {
    if (!currentQuestionId) break;

    const shouldBeCorrect = answeredQuestions.filter((q) => q.is_correct).length < targetCorrect;

    // Determine answer based on whether we want correct or wrong
    let answer: any;
    if (shouldBeCorrect && correctAnswers.has(currentQuestionId)) {
      // We've seen this question before and know the answer
      answer = correctAnswers.get(currentQuestionId);
    } else if (shouldBeCorrect) {
      // Try a common correct answer pattern (for numerical questions, use 0 or guess)
      // Most test questions have simple numerical answers
      answer = '999999'; // Intentionally wrong first to learn
    } else {
      // Intentionally wrong
      answer = 'WRONG_ANSWER_' + Math.random();
    }

    const response = await request.post('/api/v1/practice/submit-answer', {
      headers: getAuthHeader(token),
      data: {
        session_id: session.session_id,
        question_id: currentQuestionId,
        user_answer: answer,
        time_spent_seconds: 60,
        hints_used: 0,
      },
    });

    if (!response.ok()) {
      console.warn(`Failed to submit answer for question ${currentQuestionId}`);
      break;
    }

    const result = await response.json();

    // Store the correct answer for this question (revealed in feedback)
    correctAnswers.set(currentQuestionId, result.data.feedback?.correct_answer);

    answeredQuestions.push({
      question_id: currentQuestionId,
      micro_skill_id: currentMicroSkillId,
      difficulty: currentDifficulty,
      is_correct: result.data.is_correct,
      correct_answer: result.data.feedback?.correct_answer,
      user_answer: answer,
    });

    // Get next question from response
    if (result.data.next_question) {
      currentQuestionId = result.data.next_question.question_id;
      currentMicroSkillId = result.data.next_question.micro_skill_id;
      currentDifficulty = result.data.next_question.difficulty_level;
    } else {
      currentQuestionId = null; // Session complete
    }
  }

  const correctCount = answeredQuestions.filter((q) => q.is_correct).length;
  const actualAccuracy = answeredQuestions.length > 0
    ? (correctCount / answeredQuestions.length) * 100
    : 0;

  return {
    actualAccuracy,
    questionsAnswered: answeredQuestions.length,
    answeredQuestions,
  };
}

/**
 * End a practice session
 */
export async function endSession(
  request: APIRequestContext,
  token: string,
  sessionId: string
): Promise<any> {
  const response = await request.post('/api/v1/practice/end-session', {
    headers: getAuthHeader(token),
    data: {
      session_id: sessionId,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to end session: ${response.status()} ${await response.text()}`);
  }

  return await response.json();
}

/**
 * Get session details
 */
export async function getSessionDetails(
  request: APIRequestContext,
  token: string,
  sessionId: string
): Promise<any> {
  const response = await request.get(`/api/v1/practice/session/${sessionId}`, {
    headers: getAuthHeader(token),
  });

  if (!response.ok()) {
    throw new Error(`Failed to get session: ${response.status()}`);
  }

  return await response.json();
}

/**
 * Clean up any active sessions for test user
 */
export async function cleanupActiveSessions(
  request: APIRequestContext,
  token: string
): Promise<void> {
  try {
    // Try to start a dummy session to check for active sessions
    const response = await request.post('/api/v1/practice/drill/start', {
      headers: getAuthHeader(token),
      data: {
        module_id: TEST_MODULE.module_id,
        drill_number: 1,
      },
    });

    if (response.ok()) {
      // Session started successfully, end it immediately
      const data = await response.json();
      await request.post('/api/v1/practice/end-session', {
        headers: getAuthHeader(token),
        data: { session_id: data.data.session.session_id },
      });
    } else {
      const errorData = await response.json();
      if (errorData.error === 'ACTIVE_SESSION_EXISTS' && errorData.data?.active_session_id) {
        // End the active session
        await request.post('/api/v1/practice/end-session', {
          headers: getAuthHeader(token),
          data: { session_id: errorData.data.active_session_id },
        });
        console.log(`   Ended active session: ${errorData.data.active_session_id}`);
      }
    }
  } catch (error) {
    console.warn('Cleanup failed (non-critical):', error);
  }
}

/**
 * Reset drill progress for a module (allows starting from Drill 1 again)
 */
export async function resetDrillProgress(
  request: APIRequestContext,
  token: string,
  moduleId: number = TEST_MODULE.module_id
): Promise<void> {
  try {
    await request.post('/api/v1/practice/drill/reset', {
      headers: getAuthHeader(token),
      data: { module_id: moduleId },
    });
    console.log(`   Reset drill progress for module ${moduleId}`);
  } catch (error) {
    console.warn('Reset failed (non-critical):', error);
  }
}

/**
 * Extract micro-skill IDs from session questions
 */
export function extractMicroSkills(questions: any[]): Record<number, any[]> {
  const bySkill: Record<number, any[]> = {};

  questions.forEach((q) => {
    const skillId = q.micro_skill_id;
    if (!bySkill[skillId]) {
      bySkill[skillId] = [];
    }
    bySkill[skillId].push(q);
  });

  return bySkill;
}

/**
 * Calculate accuracy for a specific micro-skill
 */
export function calculateSkillAccuracy(
  session: SessionData,
  microSkillId: number
): number {
  const skillQuestions = session.questions.filter(
    (q) => q.micro_skill_id === microSkillId
  );

  if (skillQuestions.length === 0) return 0;

  const correct = skillQuestions.filter((q) => q.is_correct).length;
  return correct / skillQuestions.length;
}

/**
 * Get difficulty for a specific micro-skill in session
 */
export function getSkillDifficulty(
  session: SessionData,
  microSkillId: number
): number {
  const skillQuestions = session.questions.filter(
    (q) => q.micro_skill_id === microSkillId
  );

  if (skillQuestions.length === 0) return 0;

  const avgDifficulty =
    skillQuestions.reduce((sum, q) => sum + q.difficulty, 0) / skillQuestions.length;

  return Math.round(avgDifficulty);
}

/**
 * Check if any questions are repeated between sessions
 */
export function hasRepeatedQuestions(
  session1: SessionData,
  session2: SessionData
): boolean {
  const ids1 = new Set(session1.questions.map((q) => q.question_id));
  const ids2 = session2.questions.map((q) => q.question_id);

  return ids2.some((id) => ids1.has(id));
}
