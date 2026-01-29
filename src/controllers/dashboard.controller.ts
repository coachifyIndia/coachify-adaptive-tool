/**
 * DASHBOARD CONTROLLER
 *
 * Provides aggregated dashboard data for the frontend.
 * All data is calculated from real user sessions and progress.
 */

import { Request, Response } from 'express';
import { SessionModel } from '../models/session.model';
import { UserModel } from '../models/user.model';
import { UserProgressModel } from '../models/userProgress.model';
import { getModuleName } from '../constants/modules.constant';
import logger from '../utils/logger.util';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardPerformance {
  accuracy: {
    overall: number;
    trend: string;
    byDifficulty: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
  speed: {
    avgTimePerQuestion: number;
    idealTimeDifference: number;
  };
  consistency: {
    score: number;
    currentStreak: number;
    bestStreak: number;
  };
}

interface DashboardDiagnosis {
  mastery: {
    mastered: number;
    learning: number;
    notStarted: number;
    topicMap: Array<{
      id: number;
      name: string;
      status: string;
      score: number;
    }>;
  };
  errorIntelligence: {
    breakdown: Array<{
      type: string;
      percentage: number;
      trend: string;
    }>;
  };
  retention: {
    retentionScore: number;
    decayRiskItems: number;
  };
}

interface DashboardAdaptivity {
  nextBestAction: {
    type: string;
    title: string;
    reason: string;
    predictedImprovement: string;
  };
  strengthRadar: {
    strong: string[];
    weak: string[];
    danger: string[];
  };
}

interface DashboardMotivation {
  dailyGoalProgress: number;
  xp: number;
  level: number;
  badges: Array<{ name: string; icon: string }>;
  transparencyMSG: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate accuracy by difficulty level
 */
function calculateAccuracyByDifficulty(sessions: any[]): { easy: number; medium: number; hard: number } {
  const difficultyBuckets = {
    easy: { correct: 0, total: 0 },    // Difficulty 1-3
    medium: { correct: 0, total: 0 },  // Difficulty 4-6
    hard: { correct: 0, total: 0 },    // Difficulty 7-10
  };

  for (const session of sessions) {
    for (const question of session.questions || []) {
      const difficulty = question.difficulty || 1;
      let bucket: 'easy' | 'medium' | 'hard';

      if (difficulty <= 3) {
        bucket = 'easy';
      } else if (difficulty <= 6) {
        bucket = 'medium';
      } else {
        bucket = 'hard';
      }

      difficultyBuckets[bucket].total += 1;
      if (question.is_correct) {
        difficultyBuckets[bucket].correct += 1;
      }
    }
  }

  return {
    easy: difficultyBuckets.easy.total > 0
      ? Math.round((difficultyBuckets.easy.correct / difficultyBuckets.easy.total) * 100)
      : 0,
    medium: difficultyBuckets.medium.total > 0
      ? Math.round((difficultyBuckets.medium.correct / difficultyBuckets.medium.total) * 100)
      : 0,
    hard: difficultyBuckets.hard.total > 0
      ? Math.round((difficultyBuckets.hard.correct / difficultyBuckets.hard.total) * 100)
      : 0,
  };
}

/**
 * Calculate accuracy trend (comparing recent vs older sessions)
 */
function calculateAccuracyTrend(sessions: any[]): string {
  if (sessions.length < 4) {
    return '+0%';
  }

  const halfPoint = Math.floor(sessions.length / 2);
  const recentSessions = sessions.slice(0, halfPoint);
  const olderSessions = sessions.slice(halfPoint);

  let recentCorrect = 0, recentTotal = 0;
  let olderCorrect = 0, olderTotal = 0;

  for (const session of recentSessions) {
    for (const q of session.questions || []) {
      recentTotal++;
      if (q.is_correct) recentCorrect++;
    }
  }

  for (const session of olderSessions) {
    for (const q of session.questions || []) {
      olderTotal++;
      if (q.is_correct) olderCorrect++;
    }
  }

  const recentAccuracy = recentTotal > 0 ? recentCorrect / recentTotal : 0;
  const olderAccuracy = olderTotal > 0 ? olderCorrect / olderTotal : 0;

  if (olderAccuracy === 0) return '+0%';

  const change = ((recentAccuracy - olderAccuracy) / olderAccuracy) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Calculate consistency score based on session regularity
 */
function calculateConsistencyScore(sessions: any[]): number {
  if (sessions.length < 2) return 0;

  // Get unique practice days in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const practiceDays = new Set<string>();
  for (const session of sessions) {
    const sessionDate = new Date(session.completed_at || session.started_at);
    if (sessionDate >= thirtyDaysAgo) {
      practiceDays.add(sessionDate.toISOString().split('T')[0]);
    }
  }

  // Score: practice days / 30 days * 100
  return Math.round((practiceDays.size / 30) * 100);
}

/**
 * Analyze error patterns from sessions
 */
function analyzeErrorPatterns(sessions: any[]): Array<{ type: string; percentage: number; trend: string }> {
  let totalWrong = 0;
  let rushed = 0;       // Wrong + fast time
  let slow = 0;         // Wrong + slow time
  let withHints = 0;    // Wrong + used hints
  let other = 0;        // Wrong + normal

  const EXPECTED_TIME = 60; // seconds

  for (const session of sessions) {
    for (const q of session.questions || []) {
      if (!q.is_correct) {
        totalWrong++;
        const timeTaken = q.time_taken_seconds || 0;

        if (timeTaken < EXPECTED_TIME * 0.5) {
          rushed++;
        } else if (timeTaken > EXPECTED_TIME * 1.5) {
          slow++;
        } else if (q.hints_used > 0) {
          withHints++;
        } else {
          other++;
        }
      }
    }
  }

  if (totalWrong === 0) {
    return [
      { type: 'No Errors', percentage: 100, trend: 'stable' },
    ];
  }

  return [
    { type: 'Time Pressure (Rushed)', percentage: Math.round((rushed / totalWrong) * 100), trend: 'stable' },
    { type: 'Conceptual (Slow)', percentage: Math.round((slow / totalWrong) * 100), trend: 'stable' },
    { type: 'Needed Help (Hints)', percentage: Math.round((withHints / totalWrong) * 100), trend: 'stable' },
    { type: 'Calculation Error', percentage: Math.round((other / totalWrong) * 100), trend: 'stable' },
  ].filter(e => e.percentage > 0);
}

/**
 * Calculate retention score based on skill decay
 */
async function calculateRetentionScore(userId: string): Promise<{ retentionScore: number; decayRiskItems: number }> {
  const progressRecords = await UserProgressModel.find({ user_id: userId }).lean();

  if (progressRecords.length === 0) {
    return { retentionScore: 100, decayRiskItems: 0 };
  }

  let totalDecay = 0;
  let decayRiskCount = 0;
  const now = new Date();

  for (const record of progressRecords) {
    const lastPracticed = new Date(record.skill_status?.last_practiced || now);
    const daysSince = Math.floor((now.getTime() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24));

    // Decay formula: e^(-0.05 * days)
    const decay = Math.exp(-0.05 * daysSince);
    totalDecay += decay;

    // Risk if decay > 50%
    if (decay < 0.5) {
      decayRiskCount++;
    }
  }

  const avgRetention = totalDecay / progressRecords.length;
  return {
    retentionScore: Math.round(avgRetention * 100),
    decayRiskItems: decayRiskCount,
  };
}

/**
 * Get next best action recommendation
 */
async function getNextBestAction(
  _userId: string,
  sessions: any[]
): Promise<DashboardAdaptivity['nextBestAction']> {
  // Find weakest module
  const moduleStats: Record<number, { correct: number; total: number }> = {};

  for (const session of sessions) {
    const moduleId = session.module_id;
    if (!moduleStats[moduleId]) {
      moduleStats[moduleId] = { correct: 0, total: 0 };
    }

    for (const q of session.questions || []) {
      moduleStats[moduleId].total++;
      if (q.is_correct) {
        moduleStats[moduleId].correct++;
      }
    }
  }

  // Find module with lowest accuracy that has been attempted
  let weakestModule: { id: number; accuracy: number } | null = null;

  for (const [moduleId, stats] of Object.entries(moduleStats)) {
    if (stats.total >= 3) { // At least 3 questions attempted
      const accuracy = stats.correct / stats.total;
      if (!weakestModule || accuracy < weakestModule.accuracy) {
        weakestModule = { id: parseInt(moduleId), accuracy };
      }
    }
  }

  if (weakestModule) {
    const moduleName = getModuleName(weakestModule.id);
    const currentAccuracy = Math.round(weakestModule.accuracy * 100);
    return {
      type: 'practice',
      title: `Practice ${moduleName}`,
      reason: `Your accuracy in ${moduleName} is ${currentAccuracy}%. Focused practice can help improve this.`,
      predictedImprovement: `+${Math.min(15, Math.round((100 - currentAccuracy) * 0.2))}% Accuracy`,
    };
  }

  // Default: suggest starting a new module
  return {
    type: 'explore',
    title: 'Start Your Learning Journey',
    reason: 'Begin practicing to see personalized recommendations based on your performance.',
    predictedImprovement: '+10% Overall Skills',
  };
}

/**
 * Get strength/weakness radar
 */
async function getStrengthRadar(
  _userId: string,
  sessions: any[]
): Promise<DashboardAdaptivity['strengthRadar']> {
  const moduleStats: Record<number, { correct: number; total: number; avgTime: number }> = {};

  for (const session of sessions) {
    const moduleId = session.module_id;
    if (!moduleStats[moduleId]) {
      moduleStats[moduleId] = { correct: 0, total: 0, avgTime: 0 };
    }

    let totalTime = 0;
    for (const q of session.questions || []) {
      moduleStats[moduleId].total++;
      totalTime += q.time_taken_seconds || 0;
      if (q.is_correct) {
        moduleStats[moduleId].correct++;
      }
    }

    if (session.questions?.length > 0) {
      moduleStats[moduleId].avgTime = totalTime / session.questions.length;
    }
  }

  const strong: string[] = [];
  const weak: string[] = [];
  const danger: string[] = []; // High accuracy but very slow

  for (const [moduleId, stats] of Object.entries(moduleStats)) {
    if (stats.total < 3) continue;

    const accuracy = stats.correct / stats.total;
    const moduleName = getModuleName(parseInt(moduleId));

    if (accuracy >= 0.8) {
      if (stats.avgTime > 90) {
        // Good accuracy but slow
        danger.push(moduleName);
      } else {
        strong.push(moduleName);
      }
    } else if (accuracy < 0.5) {
      weak.push(moduleName);
    }
  }

  return { strong, weak, danger };
}

/**
 * Get topic mastery map
 */
async function getTopicMasteryMap(
  _userId: string,
  sessions: any[]
): Promise<DashboardDiagnosis['mastery']> {
  const moduleStats: Record<number, { correct: number; total: number }> = {};
  const attemptedModules = new Set<number>();

  for (const session of sessions) {
    attemptedModules.add(session.module_id);
    if (!moduleStats[session.module_id]) {
      moduleStats[session.module_id] = { correct: 0, total: 0 };
    }

    for (const q of session.questions || []) {
      moduleStats[session.module_id].total++;
      if (q.is_correct) {
        moduleStats[session.module_id].correct++;
      }
    }
  }

  const topicMap: Array<{ id: number; name: string; status: string; score: number }> = [];
  let mastered = 0;
  let learning = 0;
  let notStarted = 0;

  // Total modules: 0-20 (21 modules)
  for (let moduleId = 0; moduleId <= 20; moduleId++) {
    const stats = moduleStats[moduleId];
    const moduleName = getModuleName(moduleId);

    if (!stats || stats.total === 0) {
      notStarted++;
      topicMap.push({
        id: moduleId,
        name: moduleName,
        status: 'Not Started',
        score: 0,
      });
    } else {
      const accuracy = Math.round((stats.correct / stats.total) * 100);

      if (accuracy >= 80) {
        mastered++;
        topicMap.push({
          id: moduleId,
          name: moduleName,
          status: 'Mastered',
          score: accuracy,
        });
      } else {
        learning++;
        topicMap.push({
          id: moduleId,
          name: moduleName,
          status: 'Learning',
          score: accuracy,
        });
      }
    }
  }

  // Sort by score descending, then by status
  topicMap.sort((a, b) => {
    if (a.status === 'Not Started' && b.status !== 'Not Started') return 1;
    if (b.status === 'Not Started' && a.status !== 'Not Started') return -1;
    return b.score - a.score;
  });

  return {
    mastered,
    learning,
    notStarted,
    topicMap: topicMap.slice(0, 10), // Top 10 for display
  };
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

/**
 * GET /api/v1/dashboard/summary
 *
 * Returns all dashboard data aggregated from real user sessions
 */
export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    logger.info(`Getting dashboard summary for user ${userId}`);

    // Fetch user data
    const user = await UserModel.findOne({ user_id: userId }).lean();
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
      });
      return;
    }

    // Fetch all completed sessions (last 50)
    const sessions = await SessionModel.find({
      user_id: userId,
      completed_at: { $exists: true },
    })
      .sort({ completed_at: -1 })
      .limit(50)
      .lean();

    // Calculate all metrics
    let totalCorrect = 0;
    let totalQuestions = 0;
    let totalTime = 0;

    for (const session of sessions) {
      for (const q of session.questions || []) {
        totalQuestions++;
        totalTime += q.time_taken_seconds || 0;
        if (q.is_correct) {
          totalCorrect++;
        }
      }
    }

    const overallAccuracy = totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0;

    const avgTimePerQuestion = totalQuestions > 0
      ? Math.round(totalTime / totalQuestions)
      : 0;

    // Build performance data
    const performance: DashboardPerformance = {
      accuracy: {
        overall: overallAccuracy,
        trend: calculateAccuracyTrend(sessions),
        byDifficulty: calculateAccuracyByDifficulty(sessions),
      },
      speed: {
        avgTimePerQuestion,
        idealTimeDifference: avgTimePerQuestion - 60, // 60s is ideal
      },
      consistency: {
        score: calculateConsistencyScore(sessions),
        currentStreak: user.progress_summary?.current_streak_days || 0,
        bestStreak: user.progress_summary?.longest_streak_days || 0,
      },
    };

    // Build diagnosis data
    const retentionData = await calculateRetentionScore(userId);
    const masteryData = await getTopicMasteryMap(userId, sessions);

    const diagnosis: DashboardDiagnosis = {
      mastery: masteryData,
      errorIntelligence: {
        breakdown: analyzeErrorPatterns(sessions),
      },
      retention: retentionData,
    };

    // Build adaptivity data
    const nextAction = await getNextBestAction(userId, sessions);
    const strengthRadar = await getStrengthRadar(userId, sessions);

    const adaptivity: DashboardAdaptivity = {
      nextBestAction: nextAction,
      strengthRadar,
    };

    // Build motivation data
    const motivation: DashboardMotivation = {
      dailyGoalProgress: Math.min(100, Math.round((totalQuestions / 20) * 100)), // 20 questions = 100%
      xp: user.gamification?.total_points || 0,
      level: user.gamification?.current_level || 1,
      badges: (user.gamification?.badges_earned || []).map((badge: string) => ({
        name: badge,
        icon: '🏆',
      })),
      transparencyMSG: generateTransparencyMessage(performance, diagnosis, adaptivity),
    };

    // Send response
    res.status(200).json({
      success: true,
      data: {
        performance,
        diagnosis,
        adaptivity,
        motivation,
        meta: {
          sessionsAnalyzed: sessions.length,
          questionsAnalyzed: totalQuestions,
          lastUpdated: new Date().toISOString(),
        },
      },
    });

    logger.info(`Dashboard summary retrieved for user ${userId}`);
  } catch (error: any) {
    logger.error('Error in getDashboardSummary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve dashboard summary',
      error: 'DASHBOARD_ERROR',
    });
  }
}

/**
 * Generate transparency message based on performance data
 */
function generateTransparencyMessage(
  performance: DashboardPerformance,
  diagnosis: DashboardDiagnosis,
  adaptivity: DashboardAdaptivity
): string {
  const messages: string[] = [];

  // Based on accuracy trend
  if (performance.accuracy.trend.startsWith('+')) {
    messages.push(`Great progress! Your accuracy improved ${performance.accuracy.trend} recently.`);
  } else if (performance.accuracy.trend.startsWith('-')) {
    messages.push(`Let's work on improving! Your accuracy dipped ${performance.accuracy.trend} recently.`);
  }

  // Based on weak areas
  if (adaptivity.strengthRadar.weak.length > 0) {
    messages.push(`Focus area: ${adaptivity.strengthRadar.weak[0]} needs more practice.`);
  }

  // Based on streak
  if (performance.consistency.currentStreak >= 3) {
    messages.push(`Amazing ${performance.consistency.currentStreak}-day streak! Keep it up!`);
  }

  // Based on retention
  if (diagnosis.retention.decayRiskItems > 0) {
    messages.push(`${diagnosis.retention.decayRiskItems} topics need revision to prevent forgetting.`);
  }

  // Default message
  if (messages.length === 0) {
    messages.push('Keep practicing to see personalized insights here!');
  }

  return messages[0];
}

/**
 * GET /api/v1/dashboard/streak
 *
 * Get user's current streak information
 */
export async function getUserStreak(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const user = await UserModel.findOne({ user_id: userId }).lean();
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
      });
      return;
    }

    // Get practice dates for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await SessionModel.find({
      user_id: userId,
      completed_at: { $gte: thirtyDaysAgo },
    }).lean();

    // Build calendar of practice days
    const practiceDays: string[] = [];
    const daySet = new Set<string>();

    for (const session of sessions) {
      if (session.completed_at) {
        const dateStr = new Date(session.completed_at).toISOString().split('T')[0];
        if (!daySet.has(dateStr)) {
          daySet.add(dateStr);
          practiceDays.push(dateStr);
        }
      }
    }

    practiceDays.sort().reverse();

    res.status(200).json({
      success: true,
      data: {
        currentStreak: user.progress_summary?.current_streak_days || 0,
        longestStreak: user.progress_summary?.longest_streak_days || 0,
        practiceDaysLast30: practiceDays.length,
        recentPracticeDays: practiceDays.slice(0, 7),
      },
    });
  } catch (error: any) {
    logger.error('Error in getUserStreak:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve streak data',
      error: 'STREAK_ERROR',
    });
  }
}

/**
 * GET /api/v1/dashboard/accuracy-by-difficulty
 *
 * Get detailed accuracy breakdown by difficulty level
 */
export async function getAccuracyByDifficulty(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const moduleId = req.query.module_id ? parseInt(req.query.module_id as string) : undefined;

    const query: any = {
      user_id: userId,
      completed_at: { $exists: true },
    };

    if (moduleId !== undefined) {
      query.module_id = moduleId;
    }

    const sessions = await SessionModel.find(query)
      .sort({ completed_at: -1 })
      .limit(50)
      .lean();

    // Initialize buckets for each difficulty 1-10
    const difficultyStats: Record<number, { correct: number; total: number; avgTime: number }> = {};
    for (let i = 1; i <= 10; i++) {
      difficultyStats[i] = { correct: 0, total: 0, avgTime: 0 };
    }

    for (const session of sessions) {
      for (const q of session.questions || []) {
        const difficulty = Math.min(10, Math.max(1, q.difficulty || 1));
        difficultyStats[difficulty].total++;
        difficultyStats[difficulty].avgTime += q.time_taken_seconds || 0;
        if (q.is_correct) {
          difficultyStats[difficulty].correct++;
        }
      }
    }

    // Calculate percentages
    const result = Object.entries(difficultyStats).map(([level, stats]) => ({
      difficulty: parseInt(level),
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      totalQuestions: stats.total,
      correctAnswers: stats.correct,
      avgTimeSeconds: stats.total > 0 ? Math.round(stats.avgTime / stats.total) : 0,
    }));

    // Group by Easy/Medium/Hard
    const grouped = {
      easy: {
        accuracy: 0,
        total: 0,
        levels: result.filter(r => r.difficulty <= 3),
      },
      medium: {
        accuracy: 0,
        total: 0,
        levels: result.filter(r => r.difficulty >= 4 && r.difficulty <= 6),
      },
      hard: {
        accuracy: 0,
        total: 0,
        levels: result.filter(r => r.difficulty >= 7),
      },
    };

    // Calculate group averages
    for (const group of ['easy', 'medium', 'hard'] as const) {
      const levels = grouped[group].levels;
      let correct = 0, total = 0;
      for (const l of levels) {
        correct += l.correctAnswers;
        total += l.totalQuestions;
      }
      grouped[group].total = total;
      grouped[group].accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    }

    res.status(200).json({
      success: true,
      data: {
        byLevel: result,
        grouped: {
          easy: { accuracy: grouped.easy.accuracy, totalQuestions: grouped.easy.total },
          medium: { accuracy: grouped.medium.accuracy, totalQuestions: grouped.medium.total },
          hard: { accuracy: grouped.hard.accuracy, totalQuestions: grouped.hard.total },
        },
      },
    });
  } catch (error: any) {
    logger.error('Error in getAccuracyByDifficulty:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve accuracy by difficulty',
      error: 'ACCURACY_DIFFICULTY_ERROR',
    });
  }
}
