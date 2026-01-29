import mongoose, { Schema } from 'mongoose';
import {
  IVideoLecture,
  VideoStatus,
  VideoDifficulty,
  IVideoContent,
  IVideoMetadata,
  IEducationalContent,
  IEngagementMetrics,
  IUserInteractions,
} from '../types';

const VideoContentSchema = new Schema<IVideoContent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    duration_seconds: {
      type: Number,
      required: true,
      min: 60,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnail: {
      type: String,
      required: true,
      trim: true,
    },
    transcript_available: {
      type: Boolean,
      default: false,
    },
    transcript_url: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const VideoMetadataSchema = new Schema<IVideoMetadata>(
  {
    instructor: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      default: 'English',
      trim: true,
    },
    subtitles_available: {
      type: [String],
      default: [],
    },
    difficulty_level: {
      type: String,
      enum: Object.values(VideoDifficulty),
      required: true,
    },
    prerequisites: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const EducationalContentSchema = new Schema<IEducationalContent>(
  {
    key_concepts: {
      type: [String],
      default: [],
    },
    learning_objectives: {
      type: [String],
      default: [],
    },
    practice_problems_covered: {
      type: Number,
      default: 0,
      min: 0,
    },
    related_questions: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const EngagementMetricsSchema = new Schema<IEngagementMetrics>(
  {
    total_views: {
      type: Number,
      default: 0,
      min: 0,
    },
    unique_viewers: {
      type: Number,
      default: 0,
      min: 0,
    },
    avg_watch_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    avg_rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    helpful_votes: {
      type: Number,
      default: 0,
      min: 0,
    },
    unhelpful_votes: {
      type: Number,
      default: 0,
      min: 0,
    },
    completion_rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  { _id: false }
);

const UserInteractionsSchema = new Schema<IUserInteractions>(
  {
    bookmarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    shares: {
      type: Number,
      default: 0,
      min: 0,
    },
    comments_count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const VideoLectureSchema = new Schema<IVideoLecture>(
  {
    video_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^M\d+_MS\d+_VID$/,
      index: true,
    },
    module_id: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    micro_skill_id: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    content: {
      type: VideoContentSchema,
      required: true,
    },
    metadata: {
      type: VideoMetadataSchema,
      required: true,
    },
    educational_content: {
      type: EducationalContentSchema,
      default: () => ({}),
    },
    engagement_metrics: {
      type: EngagementMetricsSchema,
      default: () => ({}),
    },
    user_interactions: {
      type: UserInteractionsSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: Object.values(VideoStatus),
      default: VideoStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'video_lectures',
  }
);

// Indexes
VideoLectureSchema.index({ module_id: 1, micro_skill_id: 1 });
VideoLectureSchema.index({ 'engagement_metrics.avg_rating': -1 });

// Static method to find videos by module
VideoLectureSchema.statics.findByModule = function (moduleId: number, status = VideoStatus.ACTIVE) {
  return this.find({ module_id: moduleId, status });
};

// Static method to find videos by micro-skill
VideoLectureSchema.statics.findByMicroSkill = function (
  microSkillId: number,
  status = VideoStatus.ACTIVE
) {
  return this.find({ micro_skill_id: microSkillId, status });
};

// Static method to find top-rated videos
VideoLectureSchema.statics.findTopRated = function (limit = 10) {
  return this.find({ status: VideoStatus.ACTIVE })
    .sort({ 'engagement_metrics.avg_rating': -1 })
    .limit(limit);
};

// Static method to find most viewed videos
VideoLectureSchema.statics.findMostViewed = function (limit = 10) {
  return this.find({ status: VideoStatus.ACTIVE })
    .sort({ 'engagement_metrics.total_views': -1 })
    .limit(limit);
};

// Instance method to record view
VideoLectureSchema.methods.recordView = function (watchPercentage: number, isUniqueViewer = false) {
  this.engagement_metrics.total_views += 1;

  if (isUniqueViewer) {
    this.engagement_metrics.unique_viewers += 1;
  }

  // Update average watch percentage
  const totalWatchTime =
    this.engagement_metrics.avg_watch_percentage * (this.engagement_metrics.total_views - 1);
  this.engagement_metrics.avg_watch_percentage =
    (totalWatchTime + watchPercentage) / this.engagement_metrics.total_views;

  // Update completion rate (watched > 90%)
  if (watchPercentage >= 0.9) {
    const totalCompletions =
      this.engagement_metrics.completion_rate * (this.engagement_metrics.total_views - 1);
    this.engagement_metrics.completion_rate =
      (totalCompletions + 1) / this.engagement_metrics.total_views;
  } else {
    const totalCompletions =
      this.engagement_metrics.completion_rate * (this.engagement_metrics.total_views - 1);
    this.engagement_metrics.completion_rate = totalCompletions / this.engagement_metrics.total_views;
  }
};

// Instance method to add rating
VideoLectureSchema.methods.addRating = function (rating: number) {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const totalRatings = this.engagement_metrics.helpful_votes + this.engagement_metrics.unhelpful_votes;
  const currentTotalRating = this.engagement_metrics.avg_rating * totalRatings;

  if (rating >= 4) {
    this.engagement_metrics.helpful_votes += 1;
  } else if (rating <= 2) {
    this.engagement_metrics.unhelpful_votes += 1;
  }

  const newTotalRatings = totalRatings + 1;
  this.engagement_metrics.avg_rating = (currentTotalRating + rating) / newTotalRatings;
};

export const VideoLectureModel = mongoose.model<IVideoLecture>('VideoLecture', VideoLectureSchema);
