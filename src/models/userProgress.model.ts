import mongoose, { Schema } from 'mongoose';
import { IUserProgress, IErrorDetail, IPerformanceHistory } from '../types';

const SkillStatusSchema = new Schema(
  {
    current_difficulty: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 1,
    },
    mastery_level: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0,
    },
    total_questions_attempted: {
      type: Number,
      default: 0,
      min: 0,
    },
    correct_answers: {
      type: Number,
      default: 0,
      min: 0,
    },
    avg_time_per_question: {
      type: Number,
      default: 0,
      min: 0,
    },
    last_5_performance: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr: number[]) => arr.length <= 5 && arr.every((v) => v === 0 || v === 1),
        message: 'last_5_performance must contain at most 5 binary values (0 or 1)',
      },
    },
    decay_factor: {
      type: Number,
      default: 1,
      min: 0,
      max: 1,
    },
    last_practiced: {
      type: Date,
      default: Date.now,
    },
    hints_usage_rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    avg_confidence: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
    },
    optimal_time_range: {
      min_seconds: { type: Number, default: 20, min: 0 },
      max_seconds: { type: Number, default: 120, min: 0 },
    },
    speed_pattern: {
      type: String,
      enum: ['rusher', 'balanced', 'careful'],
      default: 'balanced',
    },
  },
  { _id: false }
);

const MilestoneTrackingSchema = new Schema(
  {
    sets_completed: {
      type: Number,
      default: 0,
      min: 0,
    },
    best_streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    milestones_achieved: {
      type: [String],
      default: [],
    },
    next_review_date: {
      type: Date,
      required: true,
      default: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      },
    },
  },
  { _id: false }
);

const ErrorDetailSchema = new Schema<IErrorDetail>(
  {
    error_type: {
      type: String,
      required: true,
      trim: true,
    },
    frequency: {
      type: Number,
      required: true,
      min: 0,
    },
    last_occurrence: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const ErrorPatternsSchema = new Schema(
  {
    common_mistakes: {
      type: [ErrorDetailSchema],
      default: [],
    },
    remediation_needed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const PerformanceHistorySchema = new Schema<IPerformanceHistory>(
  {
    date: {
      type: Date,
      required: true,
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
    questions_attempted: {
      type: Number,
      required: true,
      min: 0,
    },
    avg_confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    hour_of_day: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
  },
  { _id: false }
);

const UserProgressSchema = new Schema<IUserProgress>(
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
      min: 0,
      max: 20,
      index: true,
    },
    micro_skill_id: {
      type: Number,
      required: true,
      min: 1,
      max: 74,
      index: true,
    },
    skill_status: {
      type: SkillStatusSchema,
      required: true,
      default: () => ({}),
    },
    milestone_tracking: {
      type: MilestoneTrackingSchema,
      required: true,
      default: () => ({}),
    },
    error_patterns: {
      type: ErrorPatternsSchema,
      default: () => ({}),
    },
    performance_history: {
      type: [PerformanceHistorySchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    collection: 'user_progress',
  }
);

// Compound indexes
UserProgressSchema.index({ user_id: 1, module_id: 1, micro_skill_id: 1 }, { unique: true });
UserProgressSchema.index({ user_id: 1, 'skill_status.last_practiced': 1 });
UserProgressSchema.index({ 'milestone_tracking.next_review_date': 1 });

// Instance method to update skill status based on question attempt
UserProgressSchema.methods.updateSkillStatus = function (
  isCorrect: boolean,
  timeTaken: number,
  hintsUsed: number
) {
  // Update total questions and correct answers
  this.skill_status.total_questions_attempted += 1;
  if (isCorrect) {
    this.skill_status.correct_answers += 1;
  }

  // Update last 5 performance
  this.skill_status.last_5_performance.push(isCorrect ? 1 : 0);
  if (this.skill_status.last_5_performance.length > 5) {
    this.skill_status.last_5_performance.shift();
  }

  // Calculate accuracy
  const accuracy = this.skill_status.correct_answers / this.skill_status.total_questions_attempted;

  // Update mastery level
  this.skill_status.mastery_level = accuracy;

  // Update average time per question
  const totalTime =
    this.skill_status.avg_time_per_question * (this.skill_status.total_questions_attempted - 1);
  this.skill_status.avg_time_per_question =
    (totalTime + timeTaken) / this.skill_status.total_questions_attempted;

  // Update hints usage rate
  const totalHints =
    this.skill_status.hints_usage_rate * (this.skill_status.total_questions_attempted - 1);
  this.skill_status.hints_usage_rate =
    (totalHints + hintsUsed) / this.skill_status.total_questions_attempted;

  // Update last practiced
  this.skill_status.last_practiced = new Date();

  // Reset decay factor (skill was just practiced)
  this.skill_status.decay_factor = 1;
};

// Instance method to adjust difficulty based on performance
UserProgressSchema.methods.adjustDifficulty = function (): number {
  const recentPerformance = this.skill_status.last_5_performance;

  if (recentPerformance.length < 3) {
    return 0; // Not enough data
  }

  const recentCorrect = recentPerformance.reduce((sum: number, val: number) => sum + val, 0);
  const accuracy = recentCorrect / recentPerformance.length;

  let adjustment = 0;

  if (accuracy >= 0.85) {
    // 85-100% accuracy: increase difficulty
    adjustment = accuracy >= 0.95 ? 2 : 1;
  } else if (accuracy >= 0.6) {
    // 60-84% accuracy: maintain or slight increase
    adjustment = accuracy >= 0.75 ? 1 : 0;
  } else if (accuracy >= 0.4) {
    // 40-59% accuracy: decrease by 1
    adjustment = -1;
  } else {
    // Below 40%: significant decrease
    adjustment = -2;
  }

  // Apply adjustment
  const newDifficulty = Math.max(1, Math.min(10, this.skill_status.current_difficulty + adjustment));
  this.skill_status.current_difficulty = newDifficulty;

  return adjustment;
};

// Instance method to calculate skill decay
UserProgressSchema.methods.calculateDecay = function (): number {
  const now = new Date();
  const lastPracticed = new Date(this.skill_status.last_practiced);
  const daysSinceLastPractice = Math.floor(
    (now.getTime() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Decay formula: decay_factor = e^(-0.05 * days)
  // This gives approximately 60% retention after 10 days, 36% after 20 days
  const decayFactor = Math.exp(-0.05 * daysSinceLastPractice);
  this.skill_status.decay_factor = Math.max(0.1, decayFactor); // Minimum 10% retention

  return this.skill_status.decay_factor;
};

// Instance method to add performance history entry
UserProgressSchema.methods.addPerformanceHistory = function (
  accuracy: number,
  avgTime: number,
  questionsAttempted: number,
  avgConfidence: number = 0.5,
  hourOfDay?: number
) {
  const now = new Date();
  const hour = hourOfDay !== undefined ? hourOfDay : now.getHours();

  this.performance_history.push({
    date: now,
    accuracy,
    avg_time: avgTime,
    questions_attempted: questionsAttempted,
    avg_confidence: avgConfidence,
    hour_of_day: hour,
  });

  // Keep only last 30 entries
  if (this.performance_history.length > 30) {
    this.performance_history = this.performance_history.slice(-30);
  }
};

// Static method to find skills needing review
UserProgressSchema.statics.findSkillsNeedingReview = function (userId: string) {
  const today = new Date();
  return this.find({
    user_id: userId,
    'milestone_tracking.next_review_date': { $lte: today },
  }).sort({ 'skill_status.mastery_level': 1 });
};

// Static method to find weak skills
UserProgressSchema.statics.findWeakSkills = function (userId: string, threshold = 0.6) {
  return this.find({
    user_id: userId,
    'skill_status.mastery_level': { $lt: threshold },
  })
    .sort({ 'skill_status.mastery_level': 1 })
    .limit(10);
};

// Static method to find strong skills
UserProgressSchema.statics.findStrongSkills = function (userId: string, threshold = 0.8) {
  return this.find({
    user_id: userId,
    'skill_status.mastery_level': { $gte: threshold },
  }).sort({ 'skill_status.mastery_level': -1 });
};

export const UserProgressModel = mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
