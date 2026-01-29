import mongoose, { Schema } from 'mongoose';
import {
  IQuestion,
  IQuestionModel,
  QuestionType,
  QuestionStatus,
  ISolutionStep,
  IHint,
  ICommonError,
} from '../types';

const SolutionStepSchema = new Schema<ISolutionStep>(
  {
    step: {
      type: Number,
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    calculation: {
      type: String,
      required: true,
      trim: true,
    },
    result: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false }
);

const HintSchema = new Schema<IHint>(
  {
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const CommonErrorSchema = new Schema<ICommonError>(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    frequency: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>(
  {
    question_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^M\d+_MS\d+_Q\d+$/,
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
    question_data: {
      text: {
        type: String,
        required: true,
        trim: true,
      },
      type: {
        type: String,
        enum: Object.values(QuestionType),
        required: true,
      },
      options: {
        type: [String],
        default: [],
        validate: {
          validator: function (this: IQuestion, options: string[]) {
            if (this.question_data.type === QuestionType.MCQ) {
              return options && options.length >= 2;
            }
            return true;
          },
          message: 'MCQ questions must have at least 2 options',
        },
      },
      correct_answer: {
        type: Schema.Types.Mixed,
        required: true,
      },
      solution_steps: {
        type: [SolutionStepSchema],
        required: true,
        validate: {
          validator: (steps: ISolutionStep[]) => steps.length > 0,
          message: 'At least one solution step is required',
        },
      },
      hints: {
        type: [HintSchema],
        default: [],
        validate: {
          validator: (hints: IHint[]) => hints.length <= 3,
          message: 'Maximum 3 hints allowed',
        },
      },
    },
    metadata: {
      difficulty_level: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
        index: true,
      },
      expected_time_seconds: {
        type: Number,
        required: true,
        min: 10,
      },
      actual_avg_time: {
        type: Number,
        default: 0,
        min: 0,
      },
      points: {
        type: Number,
        required: true,
        min: 0,
      },
      tags: {
        type: [String],
        default: [],
        index: true,
      },
      prerequisites: {
        type: [String],
        default: [],
      },
      common_errors: {
        type: [CommonErrorSchema],
        default: [],
      },
    },
    performance: {
      total_attempts: {
        type: Number,
        default: 0,
        min: 0,
      },
      success_rate: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
        index: true,
      },
      avg_hints_used: {
        type: Number,
        default: 0,
        min: 0,
      },
      abandon_rate: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
    },
    status: {
      type: String,
      enum: Object.values(QuestionStatus),
      default: QuestionStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'questions',
  }
);

// Compound indexes for efficient queries
QuestionSchema.index({ module_id: 1, micro_skill_id: 1, 'metadata.difficulty_level': 1 });
QuestionSchema.index({ status: 1, module_id: 1 });

// Instance method to update performance metrics
QuestionSchema.methods.updatePerformance = function (
  isCorrect: boolean,
  hintsUsed: number,
  wasAbandoned: boolean
) {
  this.performance.total_attempts += 1;

  if (isCorrect) {
    const currentSuccesses = this.performance.success_rate * (this.performance.total_attempts - 1);
    this.performance.success_rate = (currentSuccesses + 1) / this.performance.total_attempts;
  } else {
    const currentSuccesses = this.performance.success_rate * (this.performance.total_attempts - 1);
    this.performance.success_rate = currentSuccesses / this.performance.total_attempts;
  }

  if (wasAbandoned) {
    const currentAbandons = this.performance.abandon_rate * (this.performance.total_attempts - 1);
    this.performance.abandon_rate = (currentAbandons + 1) / this.performance.total_attempts;
  }

  const currentHintsTotal = this.performance.avg_hints_used * (this.performance.total_attempts - 1);
  this.performance.avg_hints_used = (currentHintsTotal + hintsUsed) / this.performance.total_attempts;
};

// Static methods
QuestionSchema.statics.findByModule = function (moduleId: number, status = QuestionStatus.ACTIVE) {
  return this.find({ module_id: moduleId, status });
};

QuestionSchema.statics.findByMicroSkill = function (
  microSkillId: number,
  status = QuestionStatus.ACTIVE
) {
  return this.find({ micro_skill_id: microSkillId, status });
};

QuestionSchema.statics.findByDifficulty = function (
  moduleId: number,
  microSkillId: number,
  minDifficulty: number,
  maxDifficulty: number
) {
  return this.find({
    module_id: moduleId,
    micro_skill_id: microSkillId,
    'metadata.difficulty_level': { $gte: minDifficulty, $lte: maxDifficulty },
    status: QuestionStatus.ACTIVE,
  });
};

// Instance method to evaluate answer
QuestionSchema.methods.evaluateAnswer = function (userAnswer: any): boolean {
  const correctAnswer = this.question_data.correct_answer;

  // Handle different question types
  if (this.question_data.type === QuestionType.MCQ) {
    // For MCQ, compare arrays or single value
    if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
      return userAnswer.length === correctAnswer.length &&
             userAnswer.every((ans: string) => correctAnswer.includes(ans));
    }
    return String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase();
  }

  if (this.question_data.type === QuestionType.TRUE_FALSE) {
    return Boolean(userAnswer) === Boolean(correctAnswer);
  }

  if (this.question_data.type === QuestionType.NUMERICAL_INPUT) {
    // For numerical input, compare with small tolerance
    const tolerance = 0.01;
    return Math.abs(Number(userAnswer) - Number(correctAnswer)) < tolerance;
  }

  return false;
};

export const QuestionModel = mongoose.model<IQuestion, IQuestionModel>('Question', QuestionSchema);
