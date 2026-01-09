import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  IUser,
  IUserModel,
  UserSegment,
  SubscriptionPlan,
  DifficultyPreference,
  InterfaceTheme,
} from '../types';

const SubscriptionSchema = new Schema(
  {
    plan: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      default: SubscriptionPlan.FREE,
    },
    valid_till: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const ProfileSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    age: {
      type: Number,
      required: true,
      min: 10,
      max: 99,
    },
    segment: {
      type: String,
      enum: Object.values(UserSegment),
      required: true,
    },
    target_exam: {
      type: String,
      trim: true,
    },
    registration_date: {
      type: Date,
      default: Date.now,
    },
    subscription: {
      type: SubscriptionSchema,
      required: true,
    },
  },
  { _id: false }
);

const PreferencesSchema = new Schema(
  {
    daily_goal_minutes: {
      type: Number,
      default: 30,
      min: 10,
      max: 300,
    },
    difficulty_preference: {
      type: String,
      enum: Object.values(DifficultyPreference),
      default: DifficultyPreference.ADAPTIVE,
    },
    reminder_time: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    interface_theme: {
      type: String,
      enum: Object.values(InterfaceTheme),
      default: InterfaceTheme.MINIMAL,
    },
  },
  { _id: false }
);

const SkillLevelSchema = new Schema(
  {
    level: {
      type: Number,
      min: 1,
      max: 10,
      default: 1,
    },
    last_practiced: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ProgressSummarySchema = new Schema(
  {
    total_questions_attempted: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_time_spent_minutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    current_streak_days: {
      type: Number,
      default: 0,
      min: 0,
    },
    longest_streak_days: {
      type: Number,
      default: 0,
      min: 0,
    },
    modules_completed: {
      type: [Number],
      default: [],
    },
    skill_levels: {
      type: Map,
      of: SkillLevelSchema,
      default: new Map(),
    },
  },
  { _id: false }
);

const GamificationSchema = new Schema(
  {
    total_points: {
      type: Number,
      default: 0,
      min: 0,
    },
    current_level: {
      type: Number,
      default: 1,
      min: 1,
    },
    badges_earned: {
      type: [String],
      default: [],
    },
    achievements: {
      type: [String],
      default: [],
    },
    leaderboard_opt_in: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
      match: /^USR_\d{7}$/,
      index: true,
    },
    profile: {
      type: ProfileSchema,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    preferences: {
      type: PreferencesSchema,
      default: () => ({}),
    },
    progress_summary: {
      type: ProgressSummarySchema,
      default: () => ({}),
    },
    gamification: {
      type: GamificationSchema,
      default: () => ({}),
    },
    refresh_tokens: {
      type: [String],
      default: [],
      select: false,
    },
    last_active: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes
UserSchema.index({ 'profile.email': 1 }, { unique: true });
UserSchema.index({ 'profile.segment': 1, last_active: -1 });
UserSchema.index({ user_id: 1 }, { unique: true });

// Pre-save middleware to hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Instance method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Static method to generate unique user ID
UserSchema.statics.generateUserId = async function (): Promise<string> {
  let userId: string;
  let exists = true;

  while (exists) {
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    userId = `USR_${randomNum}`;
    const user = await this.findOne({ user_id: userId });
    exists = !!user;
  }

  return userId!;
};

// Static method to find active users by segment
UserSchema.statics.findActiveUsersBySegment = function (segment: UserSegment, limit = 100) {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  return this.find({
    'profile.segment': segment,
    last_active: { $gte: oneMonthAgo },
  })
    .limit(limit)
    .sort({ last_active: -1 });
};

// Instance method to update streak
UserSchema.methods.updateStreak = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = new Date(this.last_active);
  lastActive.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    // Already practiced today
    return;
  } else if (daysDiff === 1) {
    // Consecutive day
    this.progress_summary.current_streak_days += 1;
    if (
      this.progress_summary.current_streak_days > this.progress_summary.longest_streak_days
    ) {
      this.progress_summary.longest_streak_days = this.progress_summary.current_streak_days;
    }
  } else {
    // Streak broken
    this.progress_summary.current_streak_days = 1;
  }

  this.last_active = new Date();
};

// Instance method to add points
UserSchema.methods.addPoints = function (points: number) {
  this.gamification.total_points += points;

  // Level up logic (every 1000 points = 1 level)
  const newLevel = Math.floor(this.gamification.total_points / 1000) + 1;
  if (newLevel > this.gamification.current_level) {
    this.gamification.current_level = newLevel;
  }
};

export const UserModel = mongoose.model<IUser, IUserModel>('User', UserSchema);
