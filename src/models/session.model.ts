import mongoose, { Schema } from 'mongoose';
import {
  ISession,
  ISessionModel,
  SessionType,
  IQuestionAttempt,
  ISessionMetrics,
  INextSetRecommendation,
} from '../types';

const QuestionAttemptSchema = new Schema<IQuestionAttempt>(
  {
    question_id: {
      type: String,
      required: true,
      ref: 'Question',
    },
    micro_skill_id: {
      type: Number,
      required: true,
      min: 1,
      max: 74,
    },
    difficulty: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    presented_at: {
      type: Date,
      required: true,
    },
    answered_at: {
      type: Date,
      required: true,
    },
    time_taken_seconds: {
      type: Number,
      required: true,
      min: 0,
    },
    user_answer: {
      type: Schema.Types.Mixed,
      required: true,
    },
    is_correct: {
      type: Boolean,
      required: true,
    },
    hints_used: {
      type: Number,
      required: true,
      min: 0,
      max: 2,
    },
    attempt_number: {
      type: Number,
      required: true,
      min: 1,
    },
    confidence_score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.5,
    },
  },
  { _id: false }
);

const SessionMetricsSchema = new Schema<ISessionMetrics>(
  {
    total_questions: {
      type: Number,
      required: true,
      min: 0,
    },
    correct_answers: {
      type: Number,
      required: true,
      min: 0,
    },
    total_score: {
      type: Number,
      required: true,
      min: 0,
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    avg_time: {
      type: Number,
      required: true,
      min: 0,
    },
    difficulty_progression: {
      type: [Number],
      default: [],
    },
    micro_skills_covered: {
      type: [Number],
      default: [],
    },
    improvement_from_last: {
      type: Number,
      default: 0,
    },
    avg_confidence: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
    },
    time_analysis: {
      speed_accuracy_correlation: { type: Number, default: 0, min: -1, max: 1 },
      rush_indicators: { type: Number, default: 0, min: 0 },
      slow_indicators: { type: Number, default: 0, min: 0 },
      fatigue_detected: { type: Boolean, default: false },
      optimal_pace_questions: { type: Number, default: 0, min: 0 },
    },
  },
  { _id: false }
);

const NextSetRecommendationSchema = new Schema<INextSetRecommendation>(
  {
    difficulty_adjustments: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    focus_areas: {
      type: [Number],
      default: [],
    },
    video_recommendations: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const SessionSchema = new Schema<ISession>(
  {
    session_id: {
      type: String,
      required: true,
      unique: true,
      match: /^SES_\d{6}$/,
      index: true,
    },
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
      max: 20,
      index: true,
    },
    set_number: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    session_type: {
      type: String,
      enum: Object.values(SessionType),
      required: true,
      default: SessionType.PRACTICE,
      index: true,
    },
    planned_questions: {
      type: [String],
      default: [],
    },
    started_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completed_at: {
      type: Date,
    },
    duration_seconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    questions: {
      type: [QuestionAttemptSchema],
      default: [],
    },
    session_metrics: {
      type: SessionMetricsSchema,
      required: true,
      default: () => ({
        total_questions: 0,
        correct_answers: 0,
        total_score: 0,
        accuracy: 0,
        avg_time: 0,
        difficulty_progression: [],
        micro_skills_covered: [],
        improvement_from_last: 0,
      }),
    },
    next_set_recommendation: NextSetRecommendationSchema,
    feedback_viewed: {
      type: Boolean,
      default: false,
    },
    videos_watched: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'sessions',
  }
);

// Indexes
SessionSchema.index({ user_id: 1, completed_at: -1 });
SessionSchema.index({ module_id: 1, session_type: 1, completed_at: -1 });

// Static method to generate unique session ID
SessionSchema.statics.generateSessionId = async function (): Promise<string> {
  let sessionId: string;
  let exists = true;

  while (exists) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    sessionId = `SES_${randomNum}`;
    const session = await this.findOne({ session_id: sessionId });
    exists = !!session;
  }

  return sessionId!;
};

// Static method to get user's recent sessions
SessionSchema.statics.getRecentSessions = function (userId: string, limit = 10) {
  return this.find({ user_id: userId, completed_at: { $exists: true } })
    .sort({ completed_at: -1 })
    .limit(limit);
};

// Static method to get user's session stats
SessionSchema.statics.getUserSessionStats = async function (userId: string) {
  const stats = await this.aggregate([
    { $match: { user_id: userId, completed_at: { $exists: true } } },
    {
      $group: {
        _id: null,
        total_sessions: { $sum: 1 },
        total_questions: { $sum: '$session_metrics.total_questions' },
        total_correct: { $sum: '$session_metrics.correct_answers' },
        avg_accuracy: { $avg: '$session_metrics.accuracy' },
        total_time: { $sum: '$duration_seconds' },
      },
    },
  ]);

  return stats.length > 0 ? stats[0] : null;
};

// Instance method to calculate session metrics
SessionSchema.methods.calculateMetrics = function () {
  const totalQuestions = this.questions.length;
  const correctAnswers = this.questions.filter((q: IQuestionAttempt) => q.is_correct).length;
  const totalTime = this.questions.reduce(
    (sum: number, q: IQuestionAttempt) => sum + q.time_taken_seconds,
    0
  );
  const totalScore = correctAnswers * 10; // Assuming 10 points per correct answer

  this.session_metrics.total_questions = totalQuestions;
  this.session_metrics.correct_answers = correctAnswers;
  this.session_metrics.accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  this.session_metrics.avg_time = totalQuestions > 0 ? totalTime / totalQuestions : 0;
  this.session_metrics.total_score = totalScore;
  this.session_metrics.difficulty_progression = this.questions.map(
    (q: IQuestionAttempt) => q.difficulty
  );
  this.session_metrics.micro_skills_covered = [
    ...new Set(this.questions.map((q: IQuestionAttempt) => q.micro_skill_id)),
  ];

  this.duration_seconds = totalTime;
};

export const SessionModel = mongoose.model<ISession, ISessionModel>('Session', SessionSchema);
