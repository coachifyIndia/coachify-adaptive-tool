/**
 * PRACTICE SESSION CONTROLLER
 *
 * Handles all practice session operations:
 * - Starting new sessions
 * - Getting next questions (adaptive)
 * - Submitting answers
 * - Tracking performance
 * - Ending sessions
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - This controller orchestrates the learning experience
 * - It connects the question selection algorithm with user progress tracking
 * - Each session is a complete practice set (default: 10 questions)
 * - Real-time performance tracking and difficulty adjustment
 *
 * USER FLOW:
 * 1. Start Session → Get 10 adaptive questions
 * 2. Answer Question → Submit answer
 * 3. Get Feedback → See solution, hints, performance
 * 4. Next Question → Repeat until all 10 answered
 * 5. End Session → See summary, updated progress
 */

import { Request, Response } from 'express';
import {
  SessionModel,
  UserProgressModel,
  UserModel,
  QuestionModel
} from '../models';
import { selectQuestionsForSession, selectAdaptiveDrillQuestions } from '../services/questionSelection.service';
import { getModuleName, getModuleDescription } from '../constants/modules.constant';
import { getMicroSkillName } from '../constants/microskills.constant';
import logger from '../utils/logger.util';

/**
 * START NEW PRACTICE SESSION
 *
 * Creates a new practice session with adaptively selected questions.
 *
 * PROCESS:
 * 1. Validate user exists and is authenticated
 * 2. Use adaptive algorithm to select questions
 * 3. Create session record in database
 * 4. Return first question to user
 *
 * REQUEST BODY:
 * {
 *   "session_size": 10,           // Optional, default: 10
 *   "focus_modules": [0, 1, 3],   // Optional, specific modules
 *   "difficulty_preference": "adaptive" // Optional: adaptive, easy, medium, hard
 * }
 *
 * RESPONSE:
 * {
 *   "success": true,
 *   "message": "Practice session started",
 *   "data": {
 *     "session": {
 *       "session_id": "SES_...",
 *       "total_questions": 10,
 *       "current_question_index": 0
 *     },
 *     "first_question": {
 *       "question_id": "...",
 *       "question_code": "M0_MS1_Q001",
 *       "text": "What is ...",
 *       "type": "mcq",
 *       "options": [...],
 *       "difficulty_level": 2,
 *       "points": 10,
 *       "hints": [...]
 *     },
 *     "progress_info": {
 *       "questions_remaining": 9,
 *       "estimated_time_minutes": 15
 *     }
 *   }
 * }
 *
 * @route POST /api/v1/practice/start
 * @access Private
 */
export async function startPracticeSession(req: Request, res: Response): Promise<void> {
  try {
    // ========================================================================
    // STEP 1: EXTRACT REQUEST DATA
    // ========================================================================

    const user_id = req.userId!; // Set by authenticate middleware
    const {
      session_size = 10,
      focus_modules = [],
    } = req.body;

    logger.info(`Starting practice session for user: ${user_id}`);

    // ========================================================================
    // STEP 2: CHECK FOR ACTIVE SESSION
    // ========================================================================

    // Check if user has an incomplete session
    const activeSession = await SessionModel.findOne({
      user_id,
      completed_at: null, // Not ended yet
    });

    if (activeSession) {
      logger.warn(`User ${user_id} has active session: ${activeSession.session_id}`);
      res.status(400).json({
        success: false,
        message: 'You have an active session. Please complete or abandon it first.',
        error: 'ACTIVE_SESSION_EXISTS',
        data: {
          active_session_id: activeSession.session_id,
        },
      });
      return;
    }

    // ========================================================================
    // STEP 3: SELECT QUESTIONS USING ADAPTIVE ALGORITHM
    // ========================================================================

    const selectedQuestions = await selectQuestionsForSession({
      user_id,
      session_size,
      focus_modules,
    });

    if (selectedQuestions.length === 0) {
      logger.error(`No questions found for user ${user_id}`);
      res.status(404).json({
        success: false,
        message: 'No questions available for practice. Please try again later.',
        error: 'NO_QUESTIONS_FOUND',
      });
      return;
    }

    logger.info(`Selected ${selectedQuestions.length} questions for session`);

    // ========================================================================
    // STEP 4: GENERATE SESSION ID
    // ========================================================================

    const session_id = await SessionModel.generateSessionId();

    // ========================================================================
    // STEP 5: CREATE SESSION RECORD
    // ========================================================================

    // Determine module_id (use first question's module or focus_modules[0] or 0)
    const module_id = selectedQuestions[0]?.question.module_id || focus_modules[0] || 0;

    const session = new SessionModel({
      session_id,
      user_id,
      module_id,
      set_number: 1,
      session_type: 'practice' as any,
      planned_questions: selectedQuestions.map((sq) => sq.question._id.toString()),
      started_at: new Date(),
      questions: [], // Will be populated as user answers
      session_metrics: {
        total_questions: selectedQuestions.length,
        correct_answers: 0,
        total_score: 0,
        accuracy: 0,
        avg_time: 0,
        difficulty_progression: [],
        micro_skills_covered: [],
        improvement_from_last: 0,
      },
    });

    await session.save();

    logger.info(`Session created: ${session_id}`);

    // ========================================================================
    // STEP 6: PREPARE FIRST QUESTION
    // ========================================================================

    const firstQuestion = selectedQuestions[0].question;

    // Remove solution from response (user hasn't attempted yet)
    const questionResponse = {
      question_id: firstQuestion._id,
      question_code: firstQuestion.question_code,
      module_id: firstQuestion.module_id,
      module_name: getModuleName(firstQuestion.module_id),
      micro_skill_id: firstQuestion.micro_skill_id,
      micro_skill_name: getMicroSkillName(firstQuestion.micro_skill_id),
      text: firstQuestion.question_data.text,
      type: firstQuestion.question_data.type,
      options: firstQuestion.question_data.options,
      difficulty_level: firstQuestion.metadata.difficulty_level,
      points: firstQuestion.metadata.points,
      expected_time_seconds: firstQuestion.metadata.expected_time_seconds,
      hints: firstQuestion.question_data.hints.map((h) => ({
        level: h.level,
        text: h.text,
      })),
      tags: firstQuestion.metadata.tags,
    };

    // ========================================================================
    // STEP 7: CALCULATE ESTIMATED TIME
    // ========================================================================

    const estimatedTime = selectedQuestions.reduce(
      (sum, sq) => sum + (sq.question.metadata?.expected_time_seconds || 60),
      0
    );

    // ========================================================================
    // STEP 8: SEND RESPONSE
    // ========================================================================

    res.status(201).json({
      success: true,
      message: 'Practice session started successfully!',
      data: {
        session: {
          session_id: session.session_id,
          total_questions: selectedQuestions.length,
          current_question_index: 0,
          started_at: session.started_at,
        },
        first_question: questionResponse,
        progress_info: {
          questions_remaining: selectedQuestions.length - 1,
          estimated_time_minutes: Math.ceil(estimatedTime / 60),
          selection_strategy: 'adaptive',
        },
        debug_info: {
          // For development/debugging
          question_distribution: {
            weak: selectedQuestions.filter((q) => q.target_skill.category === 'weak').length,
            moderate: selectedQuestions.filter((q) => q.target_skill.category === 'moderate').length,
            strong: selectedQuestions.filter((q) => q.target_skill.category === 'strong').length,
          },
        },
      },
    });

    logger.info(`Session started successfully for user ${user_id}: ${session_id}`);
  } catch (error: any) {
    logger.error('Error starting practice session:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while starting the practice session.',
      error: 'SESSION_START_ERROR',
    });
  }
}

/**
 * SUBMIT ANSWER
 *
 * User submits their answer to a question.
 * System evaluates, provides feedback, updates progress.
 *
 * REQUEST BODY:
 * {
 *   "session_id": "SES_...",
 *   "question_id": "...",
 *   "user_answer": "answer or option index",
 *   "time_spent_seconds": 45,
 *   "hints_used": 1
 * }
 *
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": {
 *     "is_correct": true,
 *     "points_earned": 8,
 *     "feedback": {...},
 *     "solution": {...},
 *     "performance_update": {...},
 *     "next_question": {...} or null if session complete
 *   }
 * }
 *
 * @route POST /api/v1/practice/submit-answer
 * @access Private
 */
export async function submitAnswer(req: Request, res: Response): Promise<void> {
  try {
    // ========================================================================
    // STEP 1: EXTRACT AND VALIDATE REQUEST DATA
    // ========================================================================

    const user_id = req.userId!;
    const { session_id, question_id, user_answer, time_spent_seconds = 0, hints_used = 0 } = req.body;

    logger.info(`Answer submission - Session: ${session_id}, Question: ${question_id}`);

    // ========================================================================
    // STEP 2: FETCH SESSION
    // ========================================================================

    const session = await SessionModel.findOne({ session_id, user_id });

    if (!session) {
      logger.warn(`Session not found: ${session_id} for user ${user_id}`);
      res.status(404).json({
        success: false,
        message: 'Session not found.',
        error: 'SESSION_NOT_FOUND',
      });
      return;
    }

    if (session.completed_at) {
      res.status(400).json({
        success: false,
        message: 'This session has already ended.',
        error: 'SESSION_ENDED',
      });
      return;
    }

    // ========================================================================
    // STEP 3: VERIFY QUESTION IS IN SESSION
    // ========================================================================

    // Check if question is in planned questions
    if (!session.planned_questions.includes(question_id)) {
      res.status(400).json({
        success: false,
        message: 'Question not found in this session.',
        error: 'QUESTION_NOT_IN_SESSION',
      });
      return;
    }

    // Check if already attempted
    const alreadyAttempted = session.questions.some((q) => q.question_id === question_id);

    if (alreadyAttempted) {
      res.status(400).json({
        success: false,
        message: 'This question has already been answered.',
        error: 'QUESTION_ALREADY_ANSWERED',
      });
      return;
    }

    // ========================================================================
    // STEP 4: FETCH FULL QUESTION DETAILS
    // ========================================================================

    const question = await QuestionModel.findById(question_id);

    if (!question) {
      res.status(404).json({
        success: false,
        message: 'Question not found.',
        error: 'QUESTION_NOT_FOUND',
      });
      return;
    }

    // ========================================================================
    // STEP 5: EVALUATE ANSWER
    // ========================================================================

    const is_correct = question.evaluateAnswer(user_answer);

    // Calculate points earned
    // Base points - deduct for hints used and slow response
    const basePoints = question.metadata.points;
    const hintPenalty = hints_used * 2; // 2 points per hint
    const timePenalty =
      time_spent_seconds > question.metadata.expected_time_seconds ? 1 : 0;

    const points_earned = is_correct
      ? Math.max(0, basePoints - hintPenalty - timePenalty)
      : 0;

    // ========================================================================
    // STEP 5B: CALCULATE CONFIDENCE SCORE
    // ========================================================================

    const { calculateConfidenceScore } = await import('../services/confidenceScoring.service');

    const confidenceResult = calculateConfidenceScore({
      is_correct,
      time_taken_seconds: time_spent_seconds,
      expected_time_seconds: question.metadata.expected_time_seconds,
      hints_used,
      max_hints: question.question_data.hints.length || 2,
      difficulty_level: question.metadata.difficulty_level,
    });

    const confidence_score = confidenceResult.confidence_score;

    logger.debug('Confidence score calculated', {
      question_id,
      confidence_score,
      interpretation: confidenceResult.interpretation,
    });

    // ========================================================================
    // STEP 6: ADD QUESTION ATTEMPT TO SESSION
    // ========================================================================

    const now = new Date();
    const attempt_number = session.questions.filter(q => q.question_id === question_id).length + 1;

    // Create new question attempt
    const questionAttempt = {
      question_id: question_id,
      micro_skill_id: question.micro_skill_id,
      difficulty: question.metadata.difficulty_level,
      presented_at: new Date(now.getTime() - (time_spent_seconds * 1000)), // Approximate
      answered_at: now,
      time_taken_seconds: time_spent_seconds,
      user_answer: user_answer,
      is_correct: is_correct,
      hints_used: hints_used,
      attempt_number: attempt_number,
      confidence_score: confidence_score,
    };

    session.questions.push(questionAttempt);

    // Update session metrics
    session.session_metrics.correct_answers = session.questions.filter(q => q.is_correct).length;
    session.session_metrics.total_score += points_earned;
    session.session_metrics.accuracy = session.questions.length > 0
      ? session.session_metrics.correct_answers / session.questions.length
      : 0;
    session.session_metrics.difficulty_progression.push(question.metadata.difficulty_level);
    if (!session.session_metrics.micro_skills_covered.includes(question.micro_skill_id)) {
      session.session_metrics.micro_skills_covered.push(question.micro_skill_id);
    }

    // Calculate average confidence
    const allConfidences = session.questions.map(q => q.confidence_score || 0.5);
    session.session_metrics.avg_confidence = allConfidences.length > 0
      ? allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length
      : 0.5;

    await session.save();

    // ========================================================================
    // STEP 7: UPDATE USER PROGRESS
    // ========================================================================

    // Find or create user progress for this skill
    let userProgress = await UserProgressModel.findOne({
      user_id,
      module_id: question.module_id,
      micro_skill_id: question.micro_skill_id,
    });

    if (!userProgress) {
      // Create new progress record
      userProgress = new UserProgressModel({
        user_id,
        module_id: question.module_id,
        micro_skill_id: question.micro_skill_id,
        skill_status: {
          current_difficulty: question.metadata.difficulty_level,
          mastery_level: is_correct ? 10 : 0,
          total_questions_attempted: 0,
          correct_answers: 0,
          avg_time_per_question: 0,
          last_5_performance: [],
          decay_factor: 1.0,
          last_practiced: new Date(),
          hints_usage_rate: 0,
        },
        milestone_tracking: {
          sets_completed: 0,
          best_streak: 0,
          milestones_achieved: [],
          next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
        error_patterns: {
          common_mistakes: [],
          remediation_needed: false,
        },
        performance_history: [],
      });
    }

    // Update skill status using model method
    userProgress.updateSkillStatus(is_correct, time_spent_seconds, hints_used);

    await userProgress.save();

    // ========================================================================
    // STEP 8: UPDATE USER POINTS AND STREAKS
    // ========================================================================

    const user = await UserModel.findOne({ user_id });
    if (user) {
      user.addPoints(points_earned);
      user.updateStreak();
      await user.save();
    }

    // ========================================================================
    // STEP 9: CHECK IF SESSION IS COMPLETE
    // ========================================================================

    const answeredQuestionIds = session.questions.map(q => q.question_id);
    const allQuestionsAnswered = session.planned_questions.every(qid => answeredQuestionIds.includes(qid));

    let nextQuestion = null;

    if (!allQuestionsAnswered) {
      // Find next unanswered question ID
      const nextQuestionId = session.planned_questions.find(qid => !answeredQuestionIds.includes(qid));
      if (nextQuestionId) {
        const fullNextQuestion = await QuestionModel.findById(nextQuestionId);
        if (fullNextQuestion) {
          nextQuestion = {
            question_id: fullNextQuestion._id,
            question_code: fullNextQuestion.question_code,
            module_id: fullNextQuestion.module_id,
            module_name: getModuleName(fullNextQuestion.module_id),
            micro_skill_id: fullNextQuestion.micro_skill_id,
            micro_skill_name: getMicroSkillName(fullNextQuestion.micro_skill_id),
            text: fullNextQuestion.question_data.text,
            type: fullNextQuestion.question_data.type,
            options: fullNextQuestion.question_data.options,
            difficulty_level: fullNextQuestion.metadata.difficulty_level,
            points: fullNextQuestion.metadata.points,
            expected_time_seconds: fullNextQuestion.metadata.expected_time_seconds,
            hints: fullNextQuestion.question_data.hints.map((h) => ({
              level: h.level,
              text: h.text,
            })),
          };
        }
      }
    }

    // ========================================================================
    // STEP 10: PREPARE RESPONSE
    // ========================================================================

    res.status(200).json({
      success: true,
      message: is_correct ? 'Correct answer!' : 'Incorrect answer.',
      data: {
        is_correct,
        points_earned,
        feedback: {
          correct_answer: question.question_data.correct_answer,
          solution_steps: question.question_data.solution_steps,
        },
        performance_update: {
          current_mastery: userProgress.skill_status.mastery_level.toFixed(1),
          difficulty_adjustment: userProgress.adjustDifficulty(),
          questions_attempted: userProgress.skill_status.total_questions_attempted,
          accuracy: (
            (userProgress.skill_status.correct_answers /
              userProgress.skill_status.total_questions_attempted) *
            100
          ).toFixed(1),
        },
        session_progress: {
          questions_answered: session.questions.length,
          questions_remaining: session.planned_questions.length - session.questions.length,
          current_score: session.session_metrics.total_score,
          accuracy: (session.session_metrics.accuracy * 100).toFixed(1),
        },
        next_question: nextQuestion,
        session_complete: allQuestionsAnswered,
      },
    });

    logger.info(
      `Answer submitted - User: ${user_id}, Correct: ${is_correct}, Points: ${points_earned}`
    );
  } catch (error: any) {
    logger.error('Error submitting answer:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting your answer.',
      error: 'ANSWER_SUBMISSION_ERROR',
    });
  }
}

/**
 * END PRACTICE SESSION
 *
 * User completes or abandons a practice session.
 * System calculates final summary and recommendations.
 *
 * @route POST /api/v1/practice/end-session
 * @access Private
 */
export async function endPracticeSession(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const { session_id } = req.body;

    logger.info(`Ending session: ${session_id} for user: ${user_id}`);

    // Fetch session
    const session = await SessionModel.findOne({ session_id, user_id });

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found.',
        error: 'SESSION_NOT_FOUND',
      });
      return;
    }

    if (session.completed_at) {
      res.status(400).json({
        success: false,
        message: 'Session already ended.',
        error: 'SESSION_ALREADY_ENDED',
      });
      return;
    }

    // Mark session as ended
    session.completed_at = new Date();

    // Calculate session metrics using model method
    session.calculateMetrics();

    await session.save();

    // ========================================================================
    // CALCULATE CONFIDENCE METRICS
    // ========================================================================
    const confidenceScores = session.questions
      .filter((q: any) => q.confidence_score !== undefined)
      .map((q: any) => q.confidence_score);

    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum: number, score: number) => sum + score, 0) / confidenceScores.length
      : 0;

    const highConfidenceCount = confidenceScores.filter((score: number) => score > 0.8).length;
    const mediumConfidenceCount = confidenceScores.filter((score: number) => score >= 0.5 && score <= 0.8).length;
    const lowConfidenceCount = confidenceScores.filter((score: number) => score < 0.5).length;

    logger.debug('Confidence metrics calculated', {
      avgConfidence,
      highConfidenceCount,
      mediumConfidenceCount,
      lowConfidenceCount,
    });

    // Prepare response
    const durationMinutes = Math.round(
      (session.completed_at.getTime() - session.started_at.getTime()) / 60000
    );

    res.status(200).json({
      success: true,
      message: 'Practice session completed!',
      data: {
        session_summary: {
          session_id: session.session_id,
          started_at: session.started_at,
          completed_at: session.completed_at,
          duration_minutes: durationMinutes,
          total_questions: session.session_metrics.total_questions,
          questions_attempted: session.questions.length,
          questions_correct: session.session_metrics.correct_answers,
          accuracy: (session.session_metrics.accuracy * 100).toFixed(1),
          points_earned: session.session_metrics.total_score,
          avg_time_per_question: session.session_metrics.avg_time.toFixed(1),
          confidence_metrics: {
            avg_confidence: parseFloat((avgConfidence * 100).toFixed(1)),
            high_confidence_count: highConfidenceCount,
            medium_confidence_count: mediumConfidenceCount,
            low_confidence_count: lowConfidenceCount,
          },
        },
        performance_analysis: {
          strengths: [], // TODO: Implement analysis
          weaknesses: [], // TODO: Implement analysis
          recommended_focus: [], // TODO: Implement recommendations
        },
      },
    });

    logger.info(`Session ended: ${session_id}`);
  } catch (error: any) {
    logger.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while ending the session.',
      error: 'SESSION_END_ERROR',
    });
  }
}

/**
 * GET SESSION DETAILS
 *
 * Retrieve details of a specific session
 *
 * @route GET /api/v1/practice/session/:session_id
 * @access Private
 */
export async function getSessionDetails(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const { session_id } = req.params;

    const session = await SessionModel.findOne({ session_id, user_id }).lean();
    console.log(`[getSessionDetails] Found session: ${!!session} for ${session_id}`);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found.',
        error: 'SESSION_NOT_FOUND',
      });
      return;
    }

    // Enrich questions with expected time and names
    const enrichedQuestions = await Promise.all(
      session.questions.map(async (q: any) => {
        const questionData = await QuestionModel.findById(q.question_id);
        return {
          ...q,
          micro_skill_name: getMicroSkillName(q.micro_skill_id),
          expected_time_seconds: questionData?.metadata?.expected_time_seconds || 60, // Fallback default
          question_text: questionData?.question_data?.text
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        session: {
            ...session,
            questions: enrichedQuestions
        },
      },
    });
  } catch (error: any) {
    logger.error('Error fetching session details:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching session details.',
      error: 'SESSION_FETCH_ERROR',
    });
  }
}

/**
 * GET PRACTICE HISTORY
 *
 * Retrieve user's past practice sessions with stats.
 *
 * @route GET /api/v1/practice/history
 * @access Private
 */
export async function getPracticeHistory(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    
    // 1. Fetch recent sessions (last 50 for granular history)
    const recentSessions = await SessionModel.find({ 
      user_id, 
      completed_at: { $ne: null } 
    })
    .sort({ completed_at: -1 })
    .limit(50)
    .select('session_id module_id started_at completed_at session_metrics questions set_number');

    // 2. Calculate Dashboard Aggregates
    let totalQuestionsAttempted = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalSetsCompleted = recentSessions.length;
    
    // 3. Module Breakdown
    const moduleStats: Record<number, {
      name: string; 
      sets_attempted: number; 
      correct: number; 
      wrong: number;
      accuracy: number;
    }> = {};

    recentSessions.forEach(session => {
      // Global Totals
      const correct = session.session_metrics?.correct_answers || 0;
      const total = session.session_metrics?.total_questions || 0;
      const wrong = total - correct; // Approximation based on total questions in session

      totalQuestionsAttempted += total;
      totalCorrect += correct;
      totalWrong += wrong;

      // Module Stats
      if (!moduleStats[session.module_id]) {
        moduleStats[session.module_id] = {
          name: getModuleName(session.module_id),
          sets_attempted: 0,
          correct: 0,
          wrong: 0,
          accuracy: 0
        };
      }
      
      moduleStats[session.module_id].sets_attempted += 1;
      moduleStats[session.module_id].correct += correct;
      moduleStats[session.module_id].wrong += wrong;
    });

    // Calculate accuracies for modules
    Object.values(moduleStats).forEach(stat => {
      const total = stat.correct + stat.wrong;
      stat.accuracy = total > 0 ? (stat.correct / total) * 100 : 0;
    });

    const dashboardStats = {
      total_questions: totalQuestionsAttempted,
      total_correct: totalCorrect,
      total_wrong: totalWrong,
      total_sets: totalSetsCompleted,
      module_breakdown: moduleStats
    };

    res.status(200).json({
      success: true,
      data: {
        stats: dashboardStats,
        history: recentSessions.slice(0, 10) // Only send 10 most recent for the list view
      },
    });
  } catch (error: any) {
    logger.error('Error fetching practice history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch practice history.',
      error: 'HISTORY_FETCH_ERROR',
    });
  }
}

/**
 * GET MODULES
 *
 * Retrieve all available modules and their question counts.
 * Aggregates data from QuestionModel.
 *
 * @route GET /api/v1/practice/modules
 * @access Private
 */
export async function getModules(_req: Request, res: Response): Promise<void> {
  try {
    // Aggregate questions by module_id
    const modulesData = await QuestionModel.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: { module_id: '$module_id', micro_skill_id: '$micro_skill_id' },
          question_count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.module_id',
          total_questions: { $sum: '$question_count' },
          micro_skills: {
            $push: {
              id: '$_id.micro_skill_id',
              count: '$question_count',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Map to cleaner format with proper module names and descriptions
    const modules = modulesData.map((m) => ({
      id: m._id,
      name: getModuleName(m._id),
      description: getModuleDescription(m._id),
      question_count: m.total_questions,
      micro_skill_count: m.micro_skills.length,
      micro_skills: m.micro_skills
        .map((ms: any) => ({
          id: ms.id,
          name: getMicroSkillName(ms.id),
          count: ms.count,
        }))
        .sort((a: any, b: any) => a.id - b.id),
    }));

    res.status(200).json({
      success: true,
      data: modules,
    });
  } catch (error: any) {
    logger.error('Error fetching modules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch modules.',
      error: 'MODULES_FETCH_ERROR',
    });
  }
}

/**
 * EXPORT CONTROLLER FUNCTIONS
 */
export default {
  startPracticeSession,
  submitAnswer,
  endPracticeSession,
  getSessionDetails,
  getPracticeHistory,
  getModules,
  startAdaptiveDrill,
  getDrillStatus,
  resetModuleDrills,
  getQuestionsExplorer,
};

/**
 * START ADAPTIVE DRILL
 *
 * Starts a specific adaptive drill (1-5) for a module.
 * Enforces sequential progression.
 *
 * @route POST /api/v1/practice/drill/start
 */
export async function startAdaptiveDrill(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const { module_id, drill_number } = req.body;

    if (!module_id || !drill_number) {
       res.status(400).json({ success: false, message: 'Module ID and Drill Number are required.' });
       return;
    }

    // 1. Check Prerequisites
    if (drill_number > 1) {
      const prevDrill = await SessionModel.findOne({
        user_id,
        module_id,
        session_type: 'drill',
        set_number: drill_number - 1,
        completed_at: { $ne: null }
      });

      if (!prevDrill) {
         res.status(403).json({ 
           success: false, 
           message: `Drill ${drill_number} is locked. Please complete Drill ${drill_number - 1} first.`,
           error: 'DRILL_LOCKED'
         });
         return;
      }
    }

    // 2. Select Questions (Adaptive Mix)
    // Uses new logic: Mixed micro-skills, difficulty based on last drill's performance per skill
    const selectedQuestions = await selectAdaptiveDrillQuestions(
      user_id,
      module_id,
      10
    );

     if (selectedQuestions.length === 0) {
      res.status(404).json({ success: false, message: 'No questions available.' });
      return;
    }

    const session_id = await SessionModel.generateSessionId();

    const session = new SessionModel({
      session_id,
      user_id,
      module_id,
      set_number: drill_number, // Using set_number to track drill number
      session_type: 'drill',
      planned_questions: selectedQuestions.map((sq) => sq.question._id.toString()),
      started_at: new Date(),
      questions: [],
      session_metrics: {
        total_questions: selectedQuestions.length,
        correct_answers: 0,
        total_score: 0,
        accuracy: 0,
        avg_time: 0,
        difficulty_progression: [],
        micro_skills_covered: [],
        improvement_from_last: 0,
      },
    });

    await session.save();

    // Response similar to startPracticeSession
    const firstQuestion = selectedQuestions[0].question;
     const questionResponse = {
      question_id: firstQuestion._id,
      question_code: firstQuestion.question_code,
      module_id: firstQuestion.module_id,
      module_name: getModuleName(firstQuestion.module_id),
      micro_skill_id: firstQuestion.micro_skill_id,
      micro_skill_name: getMicroSkillName(firstQuestion.micro_skill_id),
      text: firstQuestion.question_data.text,
      type: firstQuestion.question_data.type,
      options: firstQuestion.question_data.options,
      difficulty_level: firstQuestion.metadata.difficulty_level,
      points: firstQuestion.metadata.points,
      expected_time_seconds: firstQuestion.metadata.expected_time_seconds,
      hints: firstQuestion.question_data.hints.map((h) => ({
        level: h.level,
        text: h.text,
      })),
      tags: firstQuestion.metadata.tags,
    };

    res.status(201).json({
      success: true,
      message: `Adaptive Drill ${drill_number} started!`,
      data: {
        session: {
          session_id: session.session_id,
          total_questions: selectedQuestions.length,
          current_question_index: 0,
          started_at: session.started_at,
        },
        first_question: questionResponse,
        progress_info: {
          questions_remaining: selectedQuestions.length - 1,
          estimated_time_minutes: 15,
        }
      },
    });

  } catch (error: any) {
    logger.error('Error starting adaptive drill:', error);
    res.status(500).json({ success: false, message: 'Failed to start adaptive drill.' });
  }
}

/**
 * GET DRILL STATUS
 *
 * Gets the completion status and performance for all drills in a module.
 * Used to display drill progress with color coding on frontend.
 *
 * @route GET /api/v1/practice/drill/status/:moduleId
 * @access Private
 */
export async function getDrillStatus(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const module_id = parseInt(req.params.moduleId);

    if (!module_id) {
      res.status(400).json({ success: false, message: 'Module ID is required.' });
      return;
    }

    // Get all completed drills for this module
    const completedDrills = await SessionModel.find({
      user_id,
      module_id,
      session_type: 'drill',
      completed_at: { $ne: null }
    })
      .select('session_id set_number session_metrics.accuracy session_metrics.correct_answers session_metrics.total_questions completed_at')
      .sort({ completed_at: 1 }) // Ascending so we can just use .find() to get first or filter and get last
      .lean();

    // Build drill status array (1-5)
    const drillStatus: any[] = [];
    for (let drillNum = 1; drillNum <= 5; drillNum++) {
      // Find all attempts for this drill number
      const attempts = completedDrills.filter((d: any) => d.set_number === drillNum);
      const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null; // Since sorted ascending, last is latest

      if (latestAttempt) {
         const accuracy = Math.round((latestAttempt.session_metrics.correct_answers / latestAttempt.session_metrics.total_questions) * 100);
         let status: 'excellent' | 'needs_improvement' | 'poor' = 'poor';
         if (accuracy >= 80) status = 'excellent';
         else if (accuracy >= 50) status = 'needs_improvement';

         drillStatus.push({
           drill_number: drillNum,
           completed: true,
           locked: false,
           status,
           accuracy,
           last_session_id: latestAttempt.session_id
         });
      } else {
         // Drill not completed. Is it locked?
         // Drill 1 is always unlocked. Drill N is locked if Drill N-1 is not completed.
         const prevDrillCompleted: boolean = drillNum === 1 || (drillStatus[drillNum - 2]?.completed === true);

         drillStatus.push({
           drill_number: drillNum,
           completed: false,
           locked: !prevDrillCompleted,
           status: 'not_started',
           accuracy: null,
           last_session_id: null
         });
      }
    }

    res.status(200).json({ success: true, data: { module_id, drills: drillStatus } });
  } catch (error: any) {
    logger.error('Error fetching drill status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch drill status.' });
  }
}

/**
 * RESET MODULE DRILLS
 *
 * Resets all adaptive drill progress for a specific module.
 * Deletes all drill sessions for the user and module.
 *
 * @route POST /api/v1/practice/drill/reset
 */
export async function resetModuleDrills(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const { module_id } = req.body;

    if (!module_id) {
       res.status(400).json({ success: false, message: 'Module ID is required.' });
       return;
    }

    // Delete all drill sessions for this module
    const result = await SessionModel.deleteMany({
      user_id,
      module_id,
      session_type: 'drill'
    });

    logger.info(`Reset drills for user ${user_id}, module ${module_id}. Deleted ${result.deletedCount} sessions.`);

    res.status(200).json({ 
      success: true, 
      message: 'Adaptive drill progress reset successfully.',
      data: { deleted_count: result.deletedCount } 
    });

  } catch (error) {
    logger.error('Error resetting drills:', error);
    res.status(500).json({ success: false, message: 'Failed to reset drill progress.' });
  }
}

/**
 * GET QUESTIONS EXPLORER
 *
 * Allows users to browse questions by filtering on Module, Micro-skill, and Difficulty Level.
 *
 * @route GET /api/v1/practice/questions/explore
 * @query moduleId, microSkillId, difficulty, page, limit
 */
export async function getQuestionsExplorer(req: Request, res: Response): Promise<void> {
  try {
    const { moduleId, microSkillId, difficulty, page = 1, limit = 20 } = req.query;

    const query: any = {};

    if (moduleId) {
      query.module_id = parseInt(moduleId as string);
    }

    if (microSkillId) {
      query.micro_skill_id = parseInt(microSkillId as string);
    }

    if (difficulty) {
      query['metadata.difficulty_level'] = parseInt(difficulty as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [rawQuestions, total] = await Promise.all([
      QuestionModel.find(query)
        .select('question_code module_id micro_skill_id question_data metadata')
        .sort({ module_id: 1, micro_skill_id: 1, 'metadata.difficulty_level': 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      QuestionModel.countDocuments(query)
    ]);

    // ✅ Get micro-skill names for display
    const microSkillIds = [...new Set(rawQuestions.map((q: any) => q.micro_skill_id))];
    const microSkills = await QuestionModel.aggregate([
      { $match: { micro_skill_id: { $in: microSkillIds } } },
      { $group: { _id: '$micro_skill_id', name: { $first: '$question_data.micro_skill_name' } } }
    ]);

    const microSkillMap: Record<number, string> = {};
    microSkills.forEach((ms: any) => {
      microSkillMap[ms._id] = ms.name;
    });

    // ✅ Transform to flat structure for frontend
    const questions = rawQuestions.map((q: any) => ({
      question_id: q._id.toString(),
      question_code: q.question_code,
      module_id: q.module_id,
      micro_skill_id: q.micro_skill_id,
      micro_skill_name: microSkillMap[q.micro_skill_id] || 'Unknown Skill',
      text: q.question_data?.text || 'No question text available',
      difficulty_level: q.metadata?.difficulty_level || 1,
      expected_time_seconds: q.metadata?.expected_time_seconds || 30,
      points: q.metadata?.points || 10
    }));

    res.status(200).json({
      success: true,
      data: {
        questions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    logger.error('Error exploring questions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch questions.' });
  }
}
