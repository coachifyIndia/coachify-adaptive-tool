/**
 * ANALYTICS CONTROLLER
 *
 * Handles all analytics-related requests:
 * - Confidence scoring analytics
 * - Time-based performance analytics
 * - Learning pattern insights
 *
 * All endpoints are authenticated - users can only access their own analytics.
 */

import { Request, Response } from 'express';
import { SessionModel } from '../models/session.model';
import logger from '../utils/logger.util';

// Import time analytics service functions
import {
  analyzeSpeedAccuracyCorrelation,
  analyzeTimeOfDayPerformance,
  detectFatigue,
  analyzeDifficultyVsTime,
  generateRecommendations,
} from '../services/timeAnalytics.service';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse and validate query parameters
 */
function parseQueryParams(req: Request): {
  module_id?: number;
  lookback_sessions: number;
  lookback_days: number;
} {
  const module_id = req.query.module_id ? parseInt(req.query.module_id as string) : undefined;
  const lookback_sessions = req.query.lookback_sessions
    ? parseInt(req.query.lookback_sessions as string)
    : 20;
  const lookback_days = req.query.lookback_days
    ? parseInt(req.query.lookback_days as string)
    : 30;

  // Validate ranges
  if (module_id !== undefined && (module_id < 0 || module_id > 20)) {
    throw new Error('module_id must be between 0 and 20');
  }
  if (lookback_sessions < 1 || lookback_sessions > 100) {
    throw new Error('lookback_sessions must be between 1 and 100');
  }
  if (lookback_days < 1 || lookback_days > 365) {
    throw new Error('lookback_days must be between 1 and 365');
  }

  return { module_id, lookback_sessions, lookback_days };
}

// ============================================================================
// CONFIDENCE ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/analytics/confidence
 *
 * Overall confidence analytics for the user
 */
export async function getConfidenceAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const { module_id, lookback_sessions } = parseQueryParams(req);

    logger.info(`Getting confidence analytics for user ${user_id}`, {
      module_id,
      lookback_sessions,
    });

    // Build query
    const query: any = {
      user_id,
      completed_at: { $exists: true },
    };

    if (module_id !== undefined) {
      query.module_id = module_id;
    }

    // Fetch recent sessions
    const sessions = await SessionModel.find(query)
      .sort({ completed_at: -1 })
      .limit(lookback_sessions)
      .lean();

    if (sessions.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No sessions found',
        data: {
          summary: {
            avg_confidence: 0,
            total_questions_analyzed: 0,
            trend: 'insufficient_data',
            sessions_analyzed: 0,
          },
          distribution: {
            high_confidence: 0,
            medium_confidence: 0,
            low_confidence: 0,
          },
          by_module: [],
          recent_trend: [],
        },
      });
      return;
    }

    // Collect all confidence scores
    const allScores: number[] = [];
    const moduleScores: Record<number, { scores: number[]; count: number }> = {};
    const recentTrend: Array<{ session_id: string; avg_confidence: number; date: string }> = [];

    for (const session of sessions) {
      const sessionScores = session.questions
        .filter((q: any) => q.confidence_score !== undefined)
        .map((q: any) => q.confidence_score);

      allScores.push(...sessionScores);

      // Group by module
      if (!moduleScores[session.module_id]) {
        moduleScores[session.module_id] = { scores: [], count: 0 };
      }
      moduleScores[session.module_id].scores.push(...sessionScores);
      moduleScores[session.module_id].count += sessionScores.length;

      // Recent trend (last 10 sessions)
      if (recentTrend.length < 10 && sessionScores.length > 0 && session.completed_at) {
        const avgConfidence =
          sessionScores.reduce((sum, score) => sum + score, 0) / sessionScores.length;
        recentTrend.push({
          session_id: session.session_id,
          avg_confidence: parseFloat((avgConfidence * 100).toFixed(1)),
          date: session.completed_at.toISOString().split('T')[0],
        });
      }
    }

    // Calculate overall statistics
    const avgConfidence =
      allScores.length > 0
        ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        : 0;

    const highConfidenceCount = allScores.filter((score) => score > 0.8).length;
    const mediumConfidenceCount = allScores.filter(
      (score) => score >= 0.5 && score <= 0.8
    ).length;
    const lowConfidenceCount = allScores.filter((score) => score < 0.5).length;

    // Calculate trend (comparing first half vs second half of sessions)
    let trend = 'stable';
    if (sessions.length >= 4) {
      const halfPoint = Math.floor(sessions.length / 2);
      const recentHalf = sessions.slice(0, halfPoint);
      const olderHalf = sessions.slice(halfPoint);

      const recentScores: number[] = [];
      const olderScores: number[] = [];

      recentHalf.forEach((s) => {
        recentScores.push(
          ...s.questions
            .filter((q: any) => q.confidence_score !== undefined)
            .map((q: any) => q.confidence_score)
        );
      });

      olderHalf.forEach((s) => {
        olderScores.push(
          ...s.questions
            .filter((q: any) => q.confidence_score !== undefined)
            .map((q: any) => q.confidence_score)
        );
      });

      if (recentScores.length > 0 && olderScores.length > 0) {
        const recentAvg = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
        const olderAvg = olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length;
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;

        if (change > 5) trend = 'improving';
        else if (change < -5) trend = 'declining';
      }
    }

    // Format by-module data
    const byModule = Object.entries(moduleScores).map(([moduleId, data]) => ({
      module_id: parseInt(moduleId),
      module_name: `Module ${moduleId}`, // TODO: Get actual module names from constant
      avg_confidence: parseFloat(
        ((data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length) * 100).toFixed(1)
      ),
      questions_count: data.count,
    }));

    // Send response
    res.status(200).json({
      success: true,
      data: {
        summary: {
          avg_confidence: parseFloat((avgConfidence * 100).toFixed(1)),
          total_questions_analyzed: allScores.length,
          trend,
          sessions_analyzed: sessions.length,
        },
        distribution: {
          high_confidence: highConfidenceCount,
          medium_confidence: mediumConfidenceCount,
          low_confidence: lowConfidenceCount,
        },
        by_module: byModule,
        recent_trend: recentTrend,
      },
    });

    logger.info(`Confidence analytics retrieved for user ${user_id}`);
  } catch (error: any) {
    logger.error('Error in getConfidenceAnalytics:', error);
    res.status(error.message.includes('must be') ? 400 : 500).json({
      success: false,
      message: error.message || 'Failed to retrieve confidence analytics',
      error: 'CONFIDENCE_ANALYTICS_ERROR',
    });
  }
}

/**
 * GET /api/v1/analytics/confidence/by-skill
 *
 * Confidence breakdown by micro-skill
 */
export async function getConfidenceBySkill(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const { module_id, lookback_sessions } = parseQueryParams(req);

    logger.info(`Getting confidence by skill for user ${user_id}`, {
      module_id,
      lookback_sessions,
    });

    // Build query
    const query: any = {
      user_id,
      completed_at: { $exists: true },
    };

    if (module_id !== undefined) {
      query.module_id = module_id;
    }

    // Fetch recent sessions
    const sessions = await SessionModel.find(query)
      .sort({ completed_at: -1 })
      .limit(lookback_sessions)
      .lean();

    if (sessions.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No sessions found',
        data: {
          skills: [],
        },
      });
      return;
    }

    // Group by micro-skill
    const skillScores: Record<
      number,
      { scores: number[]; module_id: number; count: number }
    > = {};

    for (const session of sessions) {
      for (const question of session.questions) {
        if (question.confidence_score !== undefined) {
          const skillId = question.micro_skill_id;
          if (!skillScores[skillId]) {
            skillScores[skillId] = {
              scores: [],
              module_id: session.module_id,
              count: 0,
            };
          }
          skillScores[skillId].scores.push(question.confidence_score);
          skillScores[skillId].count += 1;
        }
      }
    }

    // Calculate averages and categorize
    const skills = Object.entries(skillScores).map(([skillId, data]) => {
      const avgConfidence =
        data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;

      let category = 'medium';
      if (avgConfidence >= 0.8) category = 'high';
      else if (avgConfidence < 0.5) category = 'low';

      return {
        micro_skill_id: parseInt(skillId),
        micro_skill_name: `Micro-Skill ${skillId}`, // TODO: Get actual skill names
        avg_confidence: parseFloat((avgConfidence * 100).toFixed(1)),
        questions_count: data.count,
        confidence_category: category,
      };
    });

    // Sort by confidence (lowest first - these need attention)
    skills.sort((a, b) => a.avg_confidence - b.avg_confidence);

    res.status(200).json({
      success: true,
      data: {
        skills,
      },
    });

    logger.info(`Confidence by skill retrieved for user ${user_id}`);
  } catch (error: any) {
    logger.error('Error in getConfidenceBySkill:', error);
    res.status(error.message.includes('must be') ? 400 : 500).json({
      success: false,
      message: error.message || 'Failed to retrieve confidence by skill',
      error: 'CONFIDENCE_BY_SKILL_ERROR',
    });
  }
}

// ============================================================================
// TIME ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/analytics/time/speed-accuracy
 *
 * Analyze correlation between speed and accuracy
 */
export async function getSpeedAccuracyAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const { module_id, lookback_sessions } = parseQueryParams(req);

    logger.info(`Getting speed-accuracy analysis for user ${user_id}`, {
      module_id,
      lookback_sessions,
    });

    const result = await analyzeSpeedAccuracyCorrelation(user_id, module_id, lookback_sessions);

    res.status(200).json({
      success: true,
      data: result,
    });

    logger.info(`Speed-accuracy analysis retrieved for user ${user_id}`);
  } catch (error: any) {
    logger.error('Error in getSpeedAccuracyAnalysis:', error);
    res.status(error.message.includes('must be') ? 400 : 500).json({
      success: false,
      message: error.message || 'Failed to retrieve speed-accuracy analysis',
      error: 'SPEED_ACCURACY_ERROR',
    });
  }
}

/**
 * GET /api/v1/analytics/time/time-of-day
 *
 * Analyze best/worst practice hours
 */
export async function getTimeOfDayAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const { module_id, lookback_days } = parseQueryParams(req);

    logger.info(`Getting time-of-day analysis for user ${user_id}`, {
      module_id,
      lookback_days,
    });

    const result = await analyzeTimeOfDayPerformance(user_id, module_id, lookback_days);

    res.status(200).json({
      success: true,
      data: result,
    });

    logger.info(`Time-of-day analysis retrieved for user ${user_id}`);
  } catch (error: any) {
    logger.error('Error in getTimeOfDayAnalysis:', error);
    res.status(error.message.includes('must be') ? 400 : 500).json({
      success: false,
      message: error.message || 'Failed to retrieve time-of-day analysis',
      error: 'TIME_OF_DAY_ERROR',
    });
  }
}

/**
 * GET /api/v1/analytics/time/fatigue/:session_id
 *
 * Detect fatigue in specific session
 */
export async function getFatigueAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const { session_id } = req.params;

    logger.info(`Getting fatigue analysis for session ${session_id}`);

    // Verify session belongs to user
    const session = await SessionModel.findOne({ session_id, user_id });

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found or does not belong to you',
        error: 'SESSION_NOT_FOUND',
      });
      return;
    }

    const result = await detectFatigue(session_id);

    res.status(200).json({
      success: true,
      data: result,
    });

    logger.info(`Fatigue analysis retrieved for session ${session_id}`);
  } catch (error: any) {
    logger.error('Error in getFatigueAnalysis:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve fatigue analysis',
      error: 'FATIGUE_ANALYSIS_ERROR',
    });
  }
}

/**
 * GET /api/v1/analytics/time/difficulty-analysis
 *
 * Analyze time allocation across difficulty levels
 */
export async function getDifficultyTimeAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const { module_id, lookback_sessions } = parseQueryParams(req);

    logger.info(`Getting difficulty-time analysis for user ${user_id}`, {
      module_id,
      lookback_sessions,
    });

    const result = await analyzeDifficultyVsTime(user_id, module_id, lookback_sessions);

    res.status(200).json({
      success: true,
      data: result,
    });

    logger.info(`Difficulty-time analysis retrieved for user ${user_id}`);
  } catch (error: any) {
    logger.error('Error in getDifficultyTimeAnalysis:', error);
    res.status(error.message.includes('must be') ? 400 : 500).json({
      success: false,
      message: error.message || 'Failed to retrieve difficulty-time analysis',
      error: 'DIFFICULTY_TIME_ERROR',
    });
  }
}

/**
 * GET /api/v1/analytics/time/recommendations
 *
 * Get combined time-based recommendations
 */
export async function getTimeRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const user_id = req.userId!;
    const { module_id } = parseQueryParams(req);

    logger.info(`Getting time recommendations for user ${user_id}`, { module_id });

    const result = await generateRecommendations(user_id, module_id);

    res.status(200).json({
      success: true,
      data: result,
    });

    logger.info(`Time recommendations retrieved for user ${user_id}`);
  } catch (error: any) {
    logger.error('Error in getTimeRecommendations:', error);
    res.status(error.message.includes('must be') ? 400 : 500).json({
      success: false,
      message: error.message || 'Failed to retrieve time recommendations',
      error: 'TIME_RECOMMENDATIONS_ERROR',
    });
  }
}
