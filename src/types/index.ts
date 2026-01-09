import { Document, Model } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum QuestionType {
  NUMERICAL_INPUT = 'numerical_input',
  TEXT_INPUT = 'text_input',
  MCQ = 'mcq',
  TRUE_FALSE = 'true_false',
}

export enum QuestionStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

export enum UserSegment {
  COMPETITIVE_EXAM = 'competitive_exam',
  SCHOOL = 'school',
  KIDS = 'kids',
  PROFESSIONAL = 'professional',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
}

export enum DifficultyPreference {
  ADAPTIVE = 'adaptive',
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum InterfaceTheme {
  MINIMAL = 'minimal',
  GAMIFIED = 'gamified',
  COLORFUL = 'colorful',
}

export enum SessionType {
  ADAPTIVE_SET = 'adaptive_set',
  PRACTICE = 'practice',
  DIAGNOSTIC = 'diagnostic',
  REMEDIAL = 'remedial',
  DRILL = 'drill',
}

export enum VideoStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UPDATING = 'updating',
}

export enum VideoDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

// ============================================================================
// QUESTION INTERFACES
// ============================================================================

export interface ISolutionStep {
  step: number;
  action: string;
  calculation: string;
  result: string | number;
}

export interface IHint {
  level: number;
  text: string;
}

export interface ICommonError {
  type: string;
  frequency: number;
  description: string;
}

export interface IQuestionData {
  text: string;
  type: QuestionType;
  options?: string[];
  correct_answer: string | number;
  solution_steps: ISolutionStep[];
  hints: IHint[];
}

export interface IQuestionMetadata {
  difficulty_level: number;
  expected_time_seconds: number;
  actual_avg_time: number;
  points: number;
  tags: string[];
  prerequisites: string[];
  common_errors: ICommonError[];
}

export interface IQuestionPerformance {
  total_attempts: number;
  success_rate: number;
  avg_hints_used: number;
  abandon_rate: number;
}

export interface IQuestion extends Document {
  question_code: string;
  module_id: number;
  micro_skill_id: number;
  question_data: IQuestionData;
  metadata: IQuestionMetadata;
  performance: IQuestionPerformance;
  status: QuestionStatus;
  createdAt: Date;
  updatedAt: Date;
  updatePerformance(isCorrect: boolean, hintsUsed: number, wasAbandoned: boolean): void;
  evaluateAnswer(userAnswer: any): boolean;
}

// Question Model interface with static methods
export interface IQuestionModel extends Model<IQuestion> {
  findByModule(moduleId: number, status?: QuestionStatus): Promise<IQuestion[]>;
  findByMicroSkill(microSkillId: number, status?: QuestionStatus): Promise<IQuestion[]>;
  findByDifficulty(moduleId: number, microSkillId: number, minDifficulty: number, maxDifficulty: number): Promise<IQuestion[]>;
}

// ============================================================================
// USER INTERFACES
// ============================================================================

export interface ISubscription {
  plan: SubscriptionPlan;
  valid_till: Date;
}

export interface IProfile {
  name: string;
  email: string;
  age: number;
  segment: UserSegment;
  target_exam?: string;
  registration_date: Date;
  subscription: ISubscription;
}

export interface IPreferences {
  daily_goal_minutes: number;
  difficulty_preference: DifficultyPreference;
  reminder_time?: string;
  interface_theme: InterfaceTheme;
}

export interface ISkillLevel {
  level: number;
  last_practiced: Date;
}

export interface IProgressSummary {
  total_questions_attempted: number;
  total_time_spent_minutes: number;
  current_streak_days: number;
  longest_streak_days: number;
  modules_completed: number[];
  skill_levels: Map<string, ISkillLevel>;
}

export interface IGamification {
  total_points: number;
  current_level: number;
  badges_earned: string[];
  achievements: string[];
  leaderboard_opt_in: boolean;
}

export interface IUser extends Document {
  user_id: string;
  profile: IProfile;
  password: string;
  preferences: IPreferences;
  progress_summary: IProgressSummary;
  gamification: IGamification;
  refresh_tokens?: string[];
  createdAt: Date;
  updatedAt: Date;
  last_active: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateStreak(): void;
  addPoints(points: number): void;
}

// User Model interface with static methods
export interface IUserModel extends Model<IUser> {
  generateUserId(): Promise<string>;
}

// ============================================================================
// USER PROGRESS INTERFACES
// ============================================================================

export interface ISkillStatus {
  current_difficulty: number;
  mastery_level: number;
  total_questions_attempted: number;
  correct_answers: number;
  avg_time_per_question: number;
  last_5_performance: number[];
  decay_factor: number;
  last_practiced: Date;
  hints_usage_rate: number;
  avg_confidence: number; // 0-1 scale, average confidence for this skill
  optimal_time_range: {
    min_seconds: number;
    max_seconds: number;
  };
  speed_pattern: 'rusher' | 'balanced' | 'careful';
}

export interface IMilestoneTracking {
  sets_completed: number;
  best_streak: number;
  milestones_achieved: string[];
  next_review_date: Date;
}

export interface IErrorDetail {
  error_type: string;
  frequency: number;
  last_occurrence: Date;
}

export interface IErrorPatterns {
  common_mistakes: IErrorDetail[];
  remediation_needed: boolean;
}

export interface IPerformanceHistory {
  date: Date;
  accuracy: number;
  avg_time: number;
  questions_attempted: number;
  avg_confidence: number; // 0-1 scale
  hour_of_day: number; // 0-23, for time-of-day analysis
}

export interface IUserProgress extends Document {
  user_id: string;
  module_id: number;
  micro_skill_id: number;
  skill_status: ISkillStatus;
  milestone_tracking: IMilestoneTracking;
  error_patterns: IErrorPatterns;
  performance_history: IPerformanceHistory[];
  updatedAt: Date;
  updateSkillStatus(isCorrect: boolean, timeTaken: number, hintsUsed: number): void;
  adjustDifficulty(): number;
  calculateDecay(): number;
  addPerformanceHistory(accuracy: number, avgTime: number, questionsAttempted: number): void;
}

// ============================================================================
// SESSION INTERFACES
// ============================================================================

export interface IQuestionAttempt {
  question_id: string;
  micro_skill_id: number;
  difficulty: number;
  presented_at: Date;
  answered_at: Date;
  time_taken_seconds: number;
  user_answer: string | number;
  is_correct: boolean;
  hints_used: number;
  attempt_number: number;
  confidence_score: number; // 0-1 scale, calculated automatically
}

export interface ITimeAnalysis {
  speed_accuracy_correlation: number; // -1 to 1 (Pearson correlation)
  rush_indicators: number; // Count of rushed answers
  slow_indicators: number; // Count of overly slow answers
  fatigue_detected: boolean;
  optimal_pace_questions: number;
}

export interface ISpeedPattern {
  type: 'rusher' | 'balanced' | 'careful';
  rusher_percentage: number;
  optimal_percentage: number;
  careful_percentage: number;
}

export interface ITimeOfDayStats {
  hour: number; // 0-23
  accuracy: number;
  avg_confidence: number;
  sample_size: number;
}

export interface ISessionMetrics {
  total_questions: number;
  correct_answers: number;
  total_score: number;
  accuracy: number;
  avg_time: number;
  difficulty_progression: number[];
  micro_skills_covered: number[];
  improvement_from_last: number;
  avg_confidence: number; // 0-1 scale, average confidence score
  time_analysis: ITimeAnalysis;
}

export interface IDifficultyAdjustments {
  [key: string]: number;
}

export interface INextSetRecommendation {
  difficulty_adjustments: IDifficultyAdjustments;
  focus_areas: number[];
  video_recommendations: string[];
}

export interface ISession extends Document {
  session_id: string;
  user_id: string;
  module_id: number;
  set_number: number;
  session_type: SessionType;
  planned_questions: string[];
  started_at: Date;
  completed_at?: Date;
  duration_seconds: number;
  questions: IQuestionAttempt[];
  session_metrics: ISessionMetrics;
  next_set_recommendation: INextSetRecommendation;
  feedback_viewed: boolean;
  videos_watched: string[];
  calculateMetrics(): void;
}

// Session Model interface with static methods
export interface ISessionModel extends Model<ISession> {
  generateSessionId(): Promise<string>;
  getRecentSessions(userId: string, limit?: number): Promise<ISession[]>;
  getUserSessionStats(userId: string): Promise<any>;
}

// ============================================================================
// VIDEO LECTURE INTERFACES
// ============================================================================

export interface IVideoContent {
  title: string;
  description: string;
  duration_seconds: number;
  url: string;
  thumbnail: string;
  transcript_available: boolean;
  transcript_url?: string;
}

export interface IVideoMetadata {
  instructor: string;
  language: string;
  subtitles_available: string[];
  difficulty_level: VideoDifficulty;
  prerequisites: string[];
}

export interface IEducationalContent {
  key_concepts: string[];
  learning_objectives: string[];
  practice_problems_covered: number;
  related_questions: string[];
}

export interface IEngagementMetrics {
  total_views: number;
  unique_viewers: number;
  avg_watch_percentage: number;
  avg_rating: number;
  helpful_votes: number;
  unhelpful_votes: number;
  completion_rate: number;
}

export interface IUserInteractions {
  bookmarks: number;
  shares: number;
  comments_count: number;
}

export interface IVideoLecture extends Document {
  video_id: string;
  module_id: number;
  micro_skill_id: number;
  content: IVideoContent;
  metadata: IVideoMetadata;
  educational_content: IEducationalContent;
  engagement_metrics: IEngagementMetrics;
  user_interactions: IUserInteractions;
  status: VideoStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// TIME ANALYTICS INTERFACES
// ============================================================================

export interface IHourlyStats {
  hour: number; // 0-23
  sessions_count: number;
  total_questions: number;
  avg_accuracy: number;
  avg_confidence: number;
  avg_time_per_question: number;
}

export interface IFatiguePattern {
  session_id: string;
  session_date: Date;
  fatigue_detected: boolean;
  onset_question_number?: number;
  first_half_accuracy: number;
  second_half_accuracy: number;
  accuracy_drop_percentage: number;
}

export interface ITimeAnalytics extends Document {
  user_id: string;
  module_id: number; // 0 = all modules

  // Time-of-day statistics
  hourly_stats: IHourlyStats[];
  best_hours: number[]; // Top 3 hours
  worst_hours: number[]; // Bottom 3 hours

  // Speed pattern analysis
  overall_speed_pattern: ISpeedPattern;
  rusher_count: number;
  optimal_count: number;
  careful_count: number;

  // Fatigue history (last 50 sessions)
  fatigue_history: IFatiguePattern[];
  fatigue_frequency_percentage: number;

  // Optimal performance metrics
  optimal_practice_duration_minutes: number;
  recommended_break_interval_minutes: number;

  // Last update
  last_updated: Date;
  total_sessions_analyzed: number;
}

// TimeAnalytics Model interface with static methods
export interface ITimeAnalyticsModel extends Model<ITimeAnalytics> {
  getOrCreate(userId: string, moduleId: number): Promise<ITimeAnalytics>;
  updateWithSession(userId: string, sessionId: string): Promise<void>;
}
