/**
 * TIME ANALYTICS MODEL
 *
 * Stores aggregated time-based performance analytics for users.
 * Used for efficient querying of time-of-day patterns, speed patterns,
 * and fatigue analysis without recalculating from raw session data.
 *
 * DESIGN RATIONALE:
 * - Separate collection for analytics improves query performance
 * - Pre-aggregated data enables fast dashboard loading
 * - Historical tracking (last 50 sessions) for trend analysis
 * - Module-level filtering (0 = all modules)
 */

import mongoose, { Schema } from 'mongoose';
import {
  ITimeAnalytics,
  ITimeAnalyticsModel,
  IHourlyStats,
  IFatiguePattern,
  ISpeedPattern,
} from '../types';
import logger from '../utils/logger.util';

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

const HourlyStatsSchema = new Schema<IHourlyStats>(
  {
    hour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
    sessions_count: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    total_questions: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    avg_accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0,
    },
    avg_confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.5,
    },
    avg_time_per_question: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const FatiguePatternSchema = new Schema<IFatiguePattern>(
  {
    session_id: {
      type: String,
      required: true,
    },
    session_date: {
      type: Date,
      required: true,
    },
    fatigue_detected: {
      type: Boolean,
      required: true,
      default: false,
    },
    onset_question_number: {
      type: Number,
      min: 1,
    },
    first_half_accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    second_half_accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    accuracy_drop_percentage: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const SpeedPatternSchema = new Schema<ISpeedPattern>(
  {
    type: {
      type: String,
      required: true,
      enum: ['rusher', 'balanced', 'careful'],
      default: 'balanced',
    },
    rusher_percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    optimal_percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    careful_percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  { _id: false }
);

// ============================================================================
// MAIN SCHEMA
// ============================================================================

const TimeAnalyticsSchema = new Schema<ITimeAnalytics>(
  {
    user_id: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    module_id: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      index: true,
    },

    // Time-of-day statistics (24-hour buckets)
    hourly_stats: {
      type: [HourlyStatsSchema],
      default: () => {
        // Initialize all 24 hours with default values
        return Array.from({ length: 24 }, (_, hour) => ({
          hour,
          sessions_count: 0,
          total_questions: 0,
          avg_accuracy: 0,
          avg_confidence: 0.5,
          avg_time_per_question: 0,
        }));
      },
    },
    best_hours: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr: number[]) => arr.every((h) => h >= 0 && h <= 23),
        message: 'best_hours must contain valid hours (0-23)',
      },
    },
    worst_hours: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr: number[]) => arr.every((h) => h >= 0 && h <= 23),
        message: 'worst_hours must contain valid hours (0-23)',
      },
    },

    // Speed pattern analysis
    overall_speed_pattern: {
      type: SpeedPatternSchema,
      required: true,
      default: () => ({
        type: 'balanced',
        rusher_percentage: 0,
        optimal_percentage: 0,
        careful_percentage: 0,
      }),
    },
    rusher_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    optimal_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    careful_count: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Fatigue history (last 50 sessions)
    fatigue_history: {
      type: [FatiguePatternSchema],
      default: [],
      validate: {
        validator: (arr: IFatiguePattern[]) => arr.length <= 50,
        message: 'fatigue_history must contain at most 50 entries',
      },
    },
    fatigue_frequency_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Optimal performance metrics
    optimal_practice_duration_minutes: {
      type: Number,
      default: 30,
      min: 10,
      max: 120,
    },
    recommended_break_interval_minutes: {
      type: Number,
      default: 25,
      min: 10,
      max: 60,
    },

    // Metadata
    last_updated: {
      type: Date,
      default: Date.now,
    },
    total_sessions_analyzed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'time_analytics',
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Compound index for efficient user+module queries
TimeAnalyticsSchema.index({ user_id: 1, module_id: 1 }, { unique: true });

// Index for finding analytics needing updates
TimeAnalyticsSchema.index({ last_updated: 1 });

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * GET OR CREATE TIME ANALYTICS
 *
 * Retrieves existing analytics record or creates a new one if not found.
 *
 * @param userId - User ID
 * @param moduleId - Module ID (0 = all modules)
 * @returns Time analytics document
 */
TimeAnalyticsSchema.statics.getOrCreate = async function (
  userId: string,
  moduleId: number = 0
): Promise<ITimeAnalytics> {
  try {
    let analytics = await this.findOne({ user_id: userId, module_id: moduleId });

    if (!analytics) {
      logger.info(`Creating new time analytics for user ${userId}, module ${moduleId}`);
      analytics = await this.create({
        user_id: userId,
        module_id: moduleId,
      });
    }

    return analytics;
  } catch (error) {
    logger.error('Error in getOrCreate:', error);
    throw error;
  }
};

/**
 * UPDATE WITH SESSION
 *
 * Updates analytics with data from a completed session.
 * This is called asynchronously after session completion.
 *
 * @param userId - User ID
 * @param sessionId - Session ID
 */
TimeAnalyticsSchema.statics.updateWithSession = async function (
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    const { SessionModel } = await import('./session.model');

    // Fetch session data
    const session = await SessionModel.findOne({ session_id: sessionId });

    if (!session || !session.completed_at) {
      logger.warn(`Session ${sessionId} not found or not completed`);
      return;
    }

    // Get or create analytics
    const analytics = await (this as ITimeAnalyticsModel).getOrCreate(userId, session.module_id);

    // Update hourly stats
    const sessionHour = session.started_at.getHours();
    const hourlyStats = analytics.hourly_stats.find((h: IHourlyStats) => h.hour === sessionHour);

    if (hourlyStats) {
      const totalSessions = hourlyStats.sessions_count;
      const totalQuestions = hourlyStats.total_questions;

      // Update weighted averages
      hourlyStats.sessions_count += 1;
      hourlyStats.total_questions += session.session_metrics.total_questions;

      hourlyStats.avg_accuracy =
        (hourlyStats.avg_accuracy * totalSessions + session.session_metrics.accuracy) /
        hourlyStats.sessions_count;

      hourlyStats.avg_confidence =
        (hourlyStats.avg_confidence * totalSessions + session.session_metrics.avg_confidence) /
        hourlyStats.sessions_count;

      hourlyStats.avg_time_per_question =
        (hourlyStats.avg_time_per_question * totalQuestions +
          session.session_metrics.avg_time * session.session_metrics.total_questions) /
        hourlyStats.total_questions;
    }

    // Update speed pattern counts
    const timeAnalysis = session.session_metrics.time_analysis;
    analytics.rusher_count += timeAnalysis.rush_indicators;
    analytics.optimal_count += timeAnalysis.optimal_pace_questions;
    analytics.careful_count += timeAnalysis.slow_indicators;

    // Calculate percentages
    const totalQuestions = analytics.rusher_count + analytics.optimal_count + analytics.careful_count;

    if (totalQuestions > 0) {
      analytics.overall_speed_pattern.rusher_percentage =
        (analytics.rusher_count / totalQuestions) * 100;
      analytics.overall_speed_pattern.optimal_percentage =
        (analytics.optimal_count / totalQuestions) * 100;
      analytics.overall_speed_pattern.careful_percentage =
        (analytics.careful_count / totalQuestions) * 100;

      // Determine type
      if (analytics.overall_speed_pattern.rusher_percentage > 40) {
        analytics.overall_speed_pattern.type = 'rusher';
      } else if (analytics.overall_speed_pattern.careful_percentage > 50) {
        analytics.overall_speed_pattern.type = 'careful';
      } else {
        analytics.overall_speed_pattern.type = 'balanced';
      }
    }

    // Add fatigue pattern
    if (timeAnalysis.fatigue_detected) {
      // Calculate fatigue details from session questions
      const questions = session.questions;
      const midpoint = Math.floor(questions.length / 2);

      const firstHalf = questions.slice(0, midpoint);
      const secondHalf = questions.slice(midpoint);

      const firstHalfAccuracy =
        firstHalf.filter((q) => q.is_correct).length / firstHalf.length;
      const secondHalfAccuracy =
        secondHalf.filter((q) => q.is_correct).length / secondHalf.length;

      const accuracyDrop = ((firstHalfAccuracy - secondHalfAccuracy) / firstHalfAccuracy) * 100;

      const fatiguePattern: IFatiguePattern = {
        session_id: sessionId,
        session_date: session.started_at,
        fatigue_detected: true,
        onset_question_number: midpoint + 1,
        first_half_accuracy: firstHalfAccuracy,
        second_half_accuracy: secondHalfAccuracy,
        accuracy_drop_percentage: accuracyDrop,
      };

      analytics.fatigue_history.push(fatiguePattern);

      // Keep only last 50
      if (analytics.fatigue_history.length > 50) {
        analytics.fatigue_history = analytics.fatigue_history.slice(-50);
      }

      // Update fatigue frequency
      const fatigueCount = analytics.fatigue_history.filter((f: IFatiguePattern) => f.fatigue_detected).length;
      analytics.fatigue_frequency_percentage =
        (fatigueCount / analytics.fatigue_history.length) * 100;
    }

    // Update best/worst hours
    const sortedHours = [...analytics.hourly_stats]
      .filter((h) => h.sessions_count >= 2) // Minimum sample size
      .sort((a, b) => b.avg_accuracy - a.avg_accuracy);

    analytics.best_hours = sortedHours.slice(0, 3).map((h) => h.hour);
    analytics.worst_hours = sortedHours.slice(-3).map((h) => h.hour);

    // Update metadata
    analytics.last_updated = new Date();
    analytics.total_sessions_analyzed += 1;

    await analytics.save();

    logger.info(`Updated time analytics for user ${userId}, session ${sessionId}`);
  } catch (error) {
    logger.error('Error in updateWithSession:', error);
    // Don't throw - this is a background process
  }
};

// ============================================================================
// EXPORT
// ============================================================================

export const TimeAnalyticsModel = mongoose.model<ITimeAnalytics, ITimeAnalyticsModel>(
  'TimeAnalytics',
  TimeAnalyticsSchema
);
