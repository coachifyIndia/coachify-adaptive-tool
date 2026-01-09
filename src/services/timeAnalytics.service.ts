/**
 * TIME ANALYTICS SERVICE
 *
 * Provides comprehensive time-based analysis functions for student performance.
 *
 * CORE FUNCTIONS:
 * 1. analyzeSpeedAccuracyCorrelation - Find if rushing/being careful affects accuracy
 * 2. analyzeTimeOfDayPerformance - Identify best/worst practice hours
 * 3. detectFatigue - Identify performance decline during sessions
 * 4. analyzeDifficultyVsTime - Find time allocation patterns across difficulty levels
 * 5. generateRecommendations - Combine all analyses into actionable advice
 * 6. updateUserTimeAnalytics - Background process to update aggregated analytics
 *
 * DESIGN PHILOSOPHY:
 * - All functions are read-only (safe to run in parallel)
 * - Graceful degradation (partial data returns partial insights)
 * - Statistical validity (minimum sample size requirements)
 * - Clear, actionable recommendations
 */

import { SessionModel } from '../models/session.model';
import { TimeAnalyticsModel } from '../models/timeAnalytics.model';
import { ITimeOfDayStats } from '../types';
import logger from '../utils/logger.util';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SpeedAccuracyResult {
  correlation: number; // -1 to 1
  interpretation: string;
  recommendation: string;
  pace_distribution: {
    rushed: number; // Count of rushed questions (<0.5x expected)
    optimal: number; // Count of optimal pace (0.5-1.5x expected)
    slow: number; // Count of slow questions (>1.5x expected)
  };
  sample_size: number;
}

export interface TimeOfDayResult {
  best_hours: ITimeOfDayStats[];
  worst_hours: ITimeOfDayStats[];
  recommendation: string;
  hourly_data: ITimeOfDayStats[];
}

export interface FatigueResult {
  fatigue_detected: boolean;
  onset_question_number?: number;
  first_half_accuracy: number;
  second_half_accuracy: number;
  accuracy_drop_percentage: number;
  first_half_avg_time: number;
  second_half_avg_time: number;
  time_increase_percentage: number;
  recommendation: string;
}

export interface DifficultyTimeResult {
  difficulty_levels: Array<{
    difficulty: number;
    avg_time_taken: number;
    expected_time: number;
    time_ratio: number; // actual/expected
    questions_count: number;
  }>;
  overallocated_levels: number[]; // Difficulties where too much time is spent
  underallocated_levels: number[]; // Difficulties where too little time is spent
  recommendation: string;
}

export interface RecommendationsResult {
  primary_recommendation: string;
  insights: string[];
  actions: string[];
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * CALCULATE PEARSON CORRELATION
 *
 * Calculates Pearson correlation coefficient between two arrays.
 * Used to find correlation between time spent and correctness.
 *
 * @param x - First variable array
 * @param y - Second variable array
 * @returns Correlation coefficient (-1 to 1)
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  try {
    if (x.length !== y.length || x.length < 3) {
      return 0; // Insufficient data
    }

    const n = x.length;

    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    // Calculate covariance and standard deviations
    let covariance = 0;
    let stdDevX = 0;
    let stdDevY = 0;

    for (let i = 0; i < n; i++) {
      const devX = x[i] - meanX;
      const devY = y[i] - meanY;

      covariance += devX * devY;
      stdDevX += devX * devX;
      stdDevY += devY * devY;
    }

    // Avoid division by zero
    if (stdDevX === 0 || stdDevY === 0) {
      return 0;
    }

    const correlation = covariance / Math.sqrt(stdDevX * stdDevY);

    // Clamp to [-1, 1] range
    return Math.max(-1, Math.min(1, correlation));
  } catch (error) {
    logger.error('Error calculating Pearson correlation:', error);
    return 0;
  }
}

/**
 * CATEGORIZE PACE
 *
 * Categorizes a question attempt as rushed, optimal, or slow.
 *
 * @param timeTaken - Time taken in seconds
 * @param expectedTime - Expected time in seconds
 * @returns Pace category
 */
function categorizePace(
  timeTaken: number,
  expectedTime: number
): 'rushed' | 'optimal' | 'slow' {
  const ratio = timeTaken / (expectedTime || 60);

  if (ratio < 0.5) return 'rushed';
  if (ratio > 1.5) return 'slow';
  return 'optimal';
}

// ============================================================================
// CORE ANALYSIS FUNCTIONS
// ============================================================================

/**
 * ANALYZE SPEED-ACCURACY CORRELATION
 *
 * Calculates Pearson correlation between time ratio and correctness.
 * Negative correlation: rushing reduces accuracy
 * Positive correlation: taking more time improves accuracy
 * Zero correlation: speed doesn't affect accuracy
 *
 * @param user_id - User ID
 * @param module_id - Optional module filter (undefined = all modules)
 * @param lookback_sessions - Number of recent sessions to analyze (default: 20)
 * @returns Speed-accuracy analysis result
 */
export async function analyzeSpeedAccuracyCorrelation(
  user_id: string,
  module_id?: number,
  lookback_sessions: number = 20
): Promise<SpeedAccuracyResult> {
  try {
    logger.info(`Analyzing speed-accuracy correlation for user ${user_id}`);

    // ========================================================================
    // STEP 1: FETCH RECENT SESSIONS
    // ========================================================================

    const query: any = {
      user_id,
      completed_at: { $exists: true },
    };

    if (module_id !== undefined) {
      query.module_id = module_id;
    }

    const sessions = await SessionModel.find(query)
      .sort({ completed_at: -1 })
      .limit(lookback_sessions)
      .lean();

    if (sessions.length === 0) {
      return {
        correlation: 0,
        interpretation: 'No completed sessions found',
        recommendation: 'Complete more practice sessions to see speed-accuracy insights',
        pace_distribution: { rushed: 0, optimal: 0, slow: 0 },
        sample_size: 0,
      };
    }

    // ========================================================================
    // STEP 2: EXTRACT QUESTION-LEVEL DATA
    // ========================================================================

    const timeRatios: number[] = [];
    const correctness: number[] = [];

    let rushedCount = 0;
    let optimalCount = 0;
    let slowCount = 0;

    for (const session of sessions) {
      for (const question of session.questions) {
        const expectedTime = 60; // Default expected time (could be pulled from question metadata)
        const ratio = question.time_taken_seconds / expectedTime;

        timeRatios.push(ratio);
        correctness.push(question.is_correct ? 1 : 0);

        // Categorize pace
        const pace = categorizePace(question.time_taken_seconds, expectedTime);
        if (pace === 'rushed') rushedCount++;
        else if (pace === 'optimal') optimalCount++;
        else slowCount++;
      }
    }

    // ========================================================================
    // STEP 3: CALCULATE CORRELATION
    // ========================================================================

    const correlation = calculatePearsonCorrelation(timeRatios, correctness);

    // ========================================================================
    // STEP 4: INTERPRET RESULTS
    // ========================================================================

    let interpretation = '';
    let recommendation = '';

    if (correlation < -0.3) {
      interpretation = 'Strong negative correlation: Rushing significantly reduces accuracy';
      recommendation =
        'Slow down and take more time to think through problems. Your accuracy improves when you work at a measured pace.';
    } else if (correlation < -0.1) {
      interpretation = 'Moderate negative correlation: Rushing somewhat reduces accuracy';
      recommendation =
        'Try to maintain a steady pace. Rushing slightly affects your performance.';
    } else if (correlation > 0.3) {
      interpretation = 'Strong positive correlation: Taking more time improves accuracy';
      recommendation =
        'Keep taking your time! Your thorough approach leads to better results.';
    } else if (correlation > 0.1) {
      interpretation = 'Moderate positive correlation: Extra time slightly helps accuracy';
      recommendation = 'Your careful approach is beneficial. Continue at your current pace.';
    } else {
      interpretation = 'Low correlation: Speed and accuracy are independent';
      recommendation =
        'Great balance! Your speed doesn\'t significantly impact accuracy. This indicates strong fundamentals.';
    }

    // ========================================================================
    // STEP 5: RETURN RESULT
    // ========================================================================

    return {
      correlation: parseFloat(correlation.toFixed(3)),
      interpretation,
      recommendation,
      pace_distribution: {
        rushed: rushedCount,
        optimal: optimalCount,
        slow: slowCount,
      },
      sample_size: timeRatios.length,
    };
  } catch (error) {
    logger.error('Error in analyzeSpeedAccuracyCorrelation:', error);
    throw error;
  }
}

/**
 * ANALYZE TIME-OF-DAY PERFORMANCE
 *
 * Aggregates sessions by hour of day (0-23) and identifies best/worst hours.
 *
 * @param user_id - User ID
 * @param module_id - Optional module filter
 * @param lookback_days - Number of days to look back (default: 30)
 * @returns Time-of-day analysis result
 */
export async function analyzeTimeOfDayPerformance(
  user_id: string,
  module_id?: number,
  lookback_days: number = 30
): Promise<TimeOfDayResult> {
  try {
    logger.info(`Analyzing time-of-day performance for user ${user_id}`);

    // ========================================================================
    // STEP 1: FETCH SESSIONS FROM LOOKBACK PERIOD
    // ========================================================================

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookback_days);

    const query: any = {
      user_id,
      completed_at: { $gte: cutoffDate },
    };

    if (module_id !== undefined) {
      query.module_id = module_id;
    }

    const sessions = await SessionModel.find(query).lean();

    if (sessions.length === 0) {
      return {
        best_hours: [],
        worst_hours: [],
        recommendation: 'No recent sessions found. Complete practice sessions throughout the day to see patterns.',
        hourly_data: [],
      };
    }

    // ========================================================================
    // STEP 2: AGGREGATE BY HOUR
    // ========================================================================

    // Initialize 24-hour buckets
    const hourlyBuckets: Array<{
      hour: number;
      sessions: number;
      totalQuestions: number;
      totalAccuracy: number;
      totalConfidence: number;
      totalTime: number;
    }> = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sessions: 0,
      totalQuestions: 0,
      totalAccuracy: 0,
      totalConfidence: 0,
      totalTime: 0,
    }));

    for (const session of sessions) {
      const hour = new Date(session.started_at).getHours();
      const bucket = hourlyBuckets[hour];

      bucket.sessions += 1;
      bucket.totalQuestions += session.session_metrics.total_questions;
      bucket.totalAccuracy += session.session_metrics.accuracy;
      bucket.totalConfidence += session.session_metrics.avg_confidence || 0.5;
      bucket.totalTime +=
        session.session_metrics.avg_time * session.session_metrics.total_questions;
    }

    // ========================================================================
    // STEP 3: CALCULATE AVERAGES
    // ========================================================================

    const hourlyData: ITimeOfDayStats[] = hourlyBuckets
      .filter((bucket) => bucket.sessions >= 2) // Minimum sample size
      .map((bucket) => ({
        hour: bucket.hour,
        accuracy: bucket.totalAccuracy / bucket.sessions,
        avg_confidence: bucket.totalConfidence / bucket.sessions,
        sample_size: bucket.sessions,
      }));

    if (hourlyData.length === 0) {
      return {
        best_hours: [],
        worst_hours: [],
        recommendation:
          'Not enough data yet. Practice at different times of day to identify your optimal hours.',
        hourly_data: [],
      };
    }

    // ========================================================================
    // STEP 4: IDENTIFY BEST AND WORST HOURS
    // ========================================================================

    const sortedByAccuracy = [...hourlyData].sort((a, b) => b.accuracy - a.accuracy);

    const bestHours = sortedByAccuracy.slice(0, 3);
    const worstHours = sortedByAccuracy.slice(-3).reverse();

    // ========================================================================
    // STEP 5: GENERATE RECOMMENDATION
    // ========================================================================

    const accuracyDiff =
      (bestHours[0].accuracy - worstHours[0].accuracy) * 100;

    let recommendation = '';

    if (accuracyDiff > 15) {
      const bestHoursList = bestHours.map((h) => formatHour(h.hour)).join(', ');
      recommendation = `Your performance is significantly better at ${bestHoursList}. Schedule practice sessions during these hours for optimal results.`;
    } else if (accuracyDiff > 8) {
      const bestHoursList = bestHours.map((h) => formatHour(h.hour)).join(', ');
      recommendation = `You tend to perform better at ${bestHoursList}. Consider practicing during these times when possible.`;
    } else {
      recommendation =
        'Your performance is consistent throughout the day. Practice whenever it fits your schedule!';
    }

    // ========================================================================
    // STEP 6: RETURN RESULT
    // ========================================================================

    return {
      best_hours: bestHours,
      worst_hours: worstHours,
      recommendation,
      hourly_data: hourlyData,
    };
  } catch (error) {
    logger.error('Error in analyzeTimeOfDayPerformance:', error);
    throw error;
  }
}

/**
 * DETECT FATIGUE
 *
 * Compares first-half vs second-half performance within a session.
 * Fatigue detected if:
 * - Accuracy drops by 15%+ OR
 * - Average time increases by 20%+
 *
 * @param session_id - Session ID
 * @returns Fatigue detection result
 */
export async function detectFatigue(session_id: string): Promise<FatigueResult> {
  try {
    logger.info(`Detecting fatigue for session ${session_id}`);

    // ========================================================================
    // STEP 1: FETCH SESSION
    // ========================================================================

    const session = await SessionModel.findOne({ session_id }).lean();

    if (!session || !session.completed_at) {
      return {
        fatigue_detected: false,
        first_half_accuracy: 0,
        second_half_accuracy: 0,
        accuracy_drop_percentage: 0,
        first_half_avg_time: 0,
        second_half_avg_time: 0,
        time_increase_percentage: 0,
        recommendation: 'Session not found or not completed',
      };
    }

    const questions = session.questions;

    if (questions.length < 6) {
      return {
        fatigue_detected: false,
        first_half_accuracy: 0,
        second_half_accuracy: 0,
        accuracy_drop_percentage: 0,
        first_half_avg_time: 0,
        second_half_avg_time: 0,
        time_increase_percentage: 0,
        recommendation: 'Not enough questions to detect fatigue (minimum 6 required)',
      };
    }

    // ========================================================================
    // STEP 2: SPLIT INTO HALVES
    // ========================================================================

    const midpoint = Math.floor(questions.length / 2);
    const firstHalf = questions.slice(0, midpoint);
    const secondHalf = questions.slice(midpoint);

    // ========================================================================
    // STEP 3: CALCULATE METRICS
    // ========================================================================

    // Accuracy
    const firstHalfCorrect = firstHalf.filter((q) => q.is_correct).length;
    const secondHalfCorrect = secondHalf.filter((q) => q.is_correct).length;

    const firstHalfAccuracy = firstHalfCorrect / firstHalf.length;
    const secondHalfAccuracy = secondHalfCorrect / secondHalf.length;

    const accuracyDrop = ((firstHalfAccuracy - secondHalfAccuracy) / firstHalfAccuracy) * 100;

    // Time
    const firstHalfAvgTime =
      firstHalf.reduce((sum, q) => sum + q.time_taken_seconds, 0) / firstHalf.length;
    const secondHalfAvgTime =
      secondHalf.reduce((sum, q) => sum + q.time_taken_seconds, 0) / secondHalf.length;

    const timeIncrease = ((secondHalfAvgTime - firstHalfAvgTime) / firstHalfAvgTime) * 100;

    // ========================================================================
    // STEP 4: DETECT FATIGUE
    // ========================================================================

    const fatigueDetected = accuracyDrop > 15 || timeIncrease > 20;

    // ========================================================================
    // STEP 5: GENERATE RECOMMENDATION
    // ========================================================================

    let recommendation = '';

    if (fatigueDetected) {
      if (accuracyDrop > 15 && timeIncrease > 20) {
        recommendation = `Fatigue detected! Your accuracy dropped by ${accuracyDrop.toFixed(1)}% and you slowed down by ${timeIncrease.toFixed(1)}% in the second half. Take a 10-minute break every ${midpoint} questions.`;
      } else if (accuracyDrop > 15) {
        recommendation = `Your accuracy decreased by ${accuracyDrop.toFixed(1)}% during the session. Consider taking short breaks to maintain focus.`;
      } else {
        recommendation = `You slowed down by ${timeIncrease.toFixed(1)}% during the session, indicating fatigue. Try shorter practice sessions or regular breaks.`;
      }
    } else {
      recommendation = 'No fatigue detected. Your performance remained consistent throughout the session!';
    }

    // ========================================================================
    // STEP 6: RETURN RESULT
    // ========================================================================

    return {
      fatigue_detected: fatigueDetected,
      onset_question_number: fatigueDetected ? midpoint + 1 : undefined,
      first_half_accuracy: parseFloat(firstHalfAccuracy.toFixed(3)),
      second_half_accuracy: parseFloat(secondHalfAccuracy.toFixed(3)),
      accuracy_drop_percentage: parseFloat(accuracyDrop.toFixed(1)),
      first_half_avg_time: parseFloat(firstHalfAvgTime.toFixed(1)),
      second_half_avg_time: parseFloat(secondHalfAvgTime.toFixed(1)),
      time_increase_percentage: parseFloat(timeIncrease.toFixed(1)),
      recommendation,
    };
  } catch (error) {
    logger.error('Error in detectFatigue:', error);
    throw error;
  }
}

/**
 * ANALYZE DIFFICULTY VS TIME
 *
 * Compares actual time spent vs expected time per difficulty level.
 * Identifies levels where time is over/under-allocated.
 *
 * @param user_id - User ID
 * @param module_id - Optional module filter
 * @param lookback_sessions - Number of recent sessions (default: 20)
 * @returns Difficulty-time analysis result
 */
export async function analyzeDifficultyVsTime(
  user_id: string,
  module_id?: number,
  lookback_sessions: number = 20
): Promise<DifficultyTimeResult> {
  try {
    logger.info(`Analyzing difficulty vs time for user ${user_id}`);

    // ========================================================================
    // STEP 1: FETCH RECENT SESSIONS
    // ========================================================================

    const query: any = {
      user_id,
      completed_at: { $exists: true },
    };

    if (module_id !== undefined) {
      query.module_id = module_id;
    }

    const sessions = await SessionModel.find(query)
      .sort({ completed_at: -1 })
      .limit(lookback_sessions)
      .lean();

    if (sessions.length === 0) {
      return {
        difficulty_levels: [],
        overallocated_levels: [],
        underallocated_levels: [],
        recommendation: 'No sessions found. Complete practice sessions to see time allocation insights.',
      };
    }

    // ========================================================================
    // STEP 2: GROUP BY DIFFICULTY LEVEL
    // ========================================================================

    const difficultyBuckets: Array<{
      difficulty: number;
      totalTime: number;
      expectedTime: number;
      count: number;
    }> = Array.from({ length: 10 }, (_, i) => ({
      difficulty: i + 1,
      totalTime: 0,
      expectedTime: 0,
      count: 0,
    }));

    for (const session of sessions) {
      for (const question of session.questions) {
        const diff = question.difficulty - 1; // 0-indexed
        if (diff >= 0 && diff < 10) {
          difficultyBuckets[diff].totalTime += question.time_taken_seconds;
          difficultyBuckets[diff].expectedTime += 60; // Default expected time
          difficultyBuckets[diff].count += 1;
        }
      }
    }

    // ========================================================================
    // STEP 3: CALCULATE RATIOS
    // ========================================================================

    const difficultyLevels = difficultyBuckets
      .filter((bucket) => bucket.count >= 3) // Minimum sample size
      .map((bucket) => ({
        difficulty: bucket.difficulty,
        avg_time_taken: bucket.totalTime / bucket.count,
        expected_time: bucket.expectedTime / bucket.count,
        time_ratio: bucket.totalTime / bucket.expectedTime,
        questions_count: bucket.count,
      }));

    // ========================================================================
    // STEP 4: IDENTIFY OVER/UNDER-ALLOCATED
    // ========================================================================

    const overallocated = difficultyLevels
      .filter((level) => level.time_ratio > 1.3) // >30% over expected
      .map((level) => level.difficulty);

    const underallocated = difficultyLevels
      .filter((level) => level.time_ratio < 0.7) // <30% under expected
      .map((level) => level.difficulty);

    // ========================================================================
    // STEP 5: GENERATE RECOMMENDATION
    // ========================================================================

    let recommendation = '';

    if (overallocated.length > 0 && underallocated.length > 0) {
      recommendation = `You're spending too much time on difficulty levels ${overallocated.join(', ')} and too little on levels ${underallocated.join(', ')}. Consider balancing your time allocation.`;
    } else if (overallocated.length > 0) {
      recommendation = `You're spending significantly more time than expected on difficulty levels ${overallocated.join(', ')}. These may need more focused practice or conceptual review.`;
    } else if (underallocated.length > 0) {
      recommendation = `You're rushing through difficulty levels ${underallocated.join(', ')}. Take more time to ensure accuracy.`;
    } else {
      recommendation = 'Good time allocation across difficulty levels! Your pacing matches expectations.';
    }

    // ========================================================================
    // STEP 6: RETURN RESULT
    // ========================================================================

    return {
      difficulty_levels: difficultyLevels.map((level) => ({
        ...level,
        avg_time_taken: parseFloat(level.avg_time_taken.toFixed(1)),
        expected_time: parseFloat(level.expected_time.toFixed(1)),
        time_ratio: parseFloat(level.time_ratio.toFixed(2)),
      })),
      overallocated_levels: overallocated,
      underallocated_levels: underallocated,
      recommendation,
    };
  } catch (error) {
    logger.error('Error in analyzeDifficultyVsTime:', error);
    throw error;
  }
}

/**
 * GENERATE RECOMMENDATIONS
 *
 * Combines all analyses into prioritized recommendations.
 *
 * @param user_id - User ID
 * @param module_id - Optional module filter
 * @returns Combined recommendations
 */
export async function generateRecommendations(
  user_id: string,
  module_id?: number
): Promise<RecommendationsResult> {
  try {
    logger.info(`Generating recommendations for user ${user_id}`);

    // ========================================================================
    // STEP 1: RUN ALL ANALYSES IN PARALLEL
    // ========================================================================

    const [speedAccuracy, timeOfDay, difficultyTime] = await Promise.all([
      analyzeSpeedAccuracyCorrelation(user_id, module_id).catch(() => null),
      analyzeTimeOfDayPerformance(user_id, module_id).catch(() => null),
      analyzeDifficultyVsTime(user_id, module_id).catch(() => null),
    ]);

    // ========================================================================
    // STEP 2: COLLECT INSIGHTS
    // ========================================================================

    const insights: string[] = [];
    const actions: string[] = [];
    let priority: 'high' | 'medium' | 'low' = 'low';

    // Speed-accuracy insights
    if (speedAccuracy && Math.abs(speedAccuracy.correlation) > 0.2) {
      insights.push(speedAccuracy.interpretation);
      actions.push(speedAccuracy.recommendation);

      if (Math.abs(speedAccuracy.correlation) > 0.3) {
        priority = 'high';
      } else {
        priority = 'medium';
      }
    }

    // Time-of-day insights
    if (timeOfDay && timeOfDay.best_hours.length > 0) {
      const accuracyDiff =
        (timeOfDay.best_hours[0].accuracy - timeOfDay.worst_hours[0].accuracy) * 100;

      if (accuracyDiff > 15) {
        insights.push(
          `Significant performance variation by time of day (${accuracyDiff.toFixed(1)}% difference)`
        );
        actions.push(timeOfDay.recommendation);

        if (priority === 'low') priority = 'medium';
      }
    }

    // Difficulty-time insights
    if (
      difficultyTime &&
      (difficultyTime.overallocated_levels.length > 0 ||
        difficultyTime.underallocated_levels.length > 0)
    ) {
      insights.push('Time allocation could be optimized across difficulty levels');
      actions.push(difficultyTime.recommendation);

      if (priority === 'low') priority = 'medium';
    }

    // ========================================================================
    // STEP 3: DETERMINE PRIMARY RECOMMENDATION
    // ========================================================================

    let primaryRecommendation = '';

    if (priority === 'high' && speedAccuracy) {
      primaryRecommendation = speedAccuracy.recommendation;
    } else if (insights.length > 0) {
      primaryRecommendation = actions[0];
    } else {
      primaryRecommendation =
        'Keep up the great work! Complete more practice sessions to receive personalized recommendations.';
      priority = 'low';
    }

    // ========================================================================
    // STEP 4: RETURN RESULT
    // ========================================================================

    return {
      primary_recommendation: primaryRecommendation,
      insights,
      actions,
      priority,
    };
  } catch (error) {
    logger.error('Error in generateRecommendations:', error);
    throw error;
  }
}

/**
 * UPDATE USER TIME ANALYTICS
 *
 * Background async function to update TimeAnalytics collection.
 * Called after session completion (non-blocking).
 *
 * @param user_id - User ID
 * @param session_id - Session ID
 */
export async function updateUserTimeAnalytics(
  user_id: string,
  session_id: string
): Promise<void> {
  try {
    logger.info(`Updating time analytics for user ${user_id}, session ${session_id}`);

    // Use the TimeAnalytics model static method
    await TimeAnalyticsModel.updateWithSession(user_id, session_id);

    logger.info(`Successfully updated time analytics for user ${user_id}`);
  } catch (error) {
    logger.error('Error in updateUserTimeAnalytics:', error);
    // Don't throw - this is a background process
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format hour to readable string
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  analyzeSpeedAccuracyCorrelation,
  analyzeTimeOfDayPerformance,
  detectFatigue,
  analyzeDifficultyVsTime,
  generateRecommendations,
  updateUserTimeAnalytics,
  calculatePearsonCorrelation,
};
