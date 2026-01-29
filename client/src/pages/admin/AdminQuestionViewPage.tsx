import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  Activity,
  Calendar,
  User,
  Lightbulb,
  History,
} from 'lucide-react';
import {
  adminQuestionService,
  adminAuditService,
  QuestionStatus,
} from '../../services/admin.service';
import type { Question, AuditLog } from '../../services/admin.service';
import { Button } from '../../components/ui/Button';
import { MathDisplay } from '../../components/ui/MathDisplay';
import { cn } from '../../utils/cn';
import { useAdminAuth } from '../../context/AdminAuthContext';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bgColor: string }> = {
  [QuestionStatus.ACTIVE]: {
    label: 'Active',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  [QuestionStatus.DRAFT]: {
    label: 'Draft',
    icon: AlertCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  [QuestionStatus.REVIEW]: {
    label: 'Under Review',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  [QuestionStatus.PUBLISHED]: {
    label: 'Published',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  [QuestionStatus.ARCHIVED]: {
    label: 'Archived',
    icon: Archive,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Level 1 - Beginner',
  2: 'Level 2 - Easy',
  3: 'Level 3 - Easy-Medium',
  4: 'Level 4 - Medium',
  5: 'Level 5 - Medium',
  6: 'Level 6 - Medium-Hard',
  7: 'Level 7 - Hard',
  8: 'Level 8 - Very Hard',
  9: 'Level 9 - Expert',
  10: 'Level 10 - Master',
};

// Module and Micro-skill name lookup
const MODULE_NAMES: Record<number, string> = {
  0: 'Magic Maths', 1: 'Speed Addition', 2: 'Speed Subtraction', 3: 'Speed Multiplication',
  4: 'Speed Division', 5: 'Squaring Techniques', 6: 'Cubing Techniques', 7: 'Cube Rooting',
  8: 'Square Rooting', 9: 'Percentage', 10: 'Ratio', 11: 'Average', 12: 'Fractions',
  13: 'Indices', 14: 'Surds', 15: 'VBODMAS', 16: 'Approximation', 17: 'Simple Equations',
  18: 'Factorisation', 19: 'DI + QA Application', 20: 'Miscellaneous',
};

const MICRO_SKILL_NAMES: Record<number, string> = {
  1: 'Mathematical Tricks', 2: 'Date of Birth Prediction', 3: 'Mental Calculation Shortcuts',
  4: "Day Calculation (Zeller's Rule)", 5: 'Mathematical Patterns', 6: '2-Digit Addition',
  7: '3-Digit Addition', 8: '4-Digit Addition', 9: '2-Digit Subtraction', 10: '3-Digit Subtraction',
  11: '4-Digit Subtraction', 12: 'Multiplication by 9s Series', 13: 'Multiplication by 1s Series',
  14: 'Similar Digit Multiplication', 15: 'Powers of 5 Shortcuts', 16: 'Criss-Cross (2-Digit)',
  17: 'Criss-Cross (3-Digit)', 18: 'Criss-Cross (4-Digit)', 19: 'Base 10 Method',
  20: 'Base 100 Method', 21: 'Base 1000 Method', 22: 'Multiple Technique', 23: 'Submultiple Technique',
  24: 'Mixed Base Calculations', 25: 'Algebraic Multiplication', 26: 'Digit Sum Verification',
  27: 'Advanced Multiplication Patterns', 28: 'Base Method (Small Divisors)', 29: 'Base Method (Large Divisors)',
  30: 'Squaring Numbers Ending in 5', 31: '2-Digit Squaring', 32: 'Multi-Digit Squaring',
  33: 'Sum and Difference of Squares', 34: '2-Digit Cubing', 35: 'Base 100 Cubing',
  36: 'Base 1000 Cubing', 37: 'Alternative Base Cubing', 38: 'Perfect Cube Roots',
  39: 'Imperfect Cube Approximations', 40: 'Perfect Square Roots', 41: 'Imperfect Square Approximations',
  42: 'Percentage Basics', 43: 'Quick Percentage Calculations', 44: 'Percentage Change',
  45: 'Multiplying Factor Technique', 46: 'Successive Percentage Changes', 47: 'Ratio Fundamentals',
  48: 'Combining Ratios', 49: 'Complex Ratio Problems', 50: 'Average Basics',
  51: 'Advanced Average Patterns', 52: 'Fraction Fundamentals', 53: 'Fraction Addition',
  54: 'Fraction Subtraction', 55: 'HCF and LCM Applications', 56: 'Fraction Comparison',
  57: 'Indices Properties', 58: 'Surds Operations', 59: 'Order of Operations',
  60: 'Estimation Strategies', 61: 'Equation Basics', 62: 'Word Problem Conversions',
  63: 'Advanced Equation Solving', 64: 'Graphical Representations', 65: 'Simple Quadratic Factoring',
  66: 'Complex Quadratic Factoring', 67: 'Cubic Factorization', 68: 'HCF Applications in Algebra',
  69: 'Percentage in DI', 70: 'Ratio and Proportion in DI', 71: 'Approximation in DI',
  72: 'Table Handling Techniques', 73: 'Multi-Skill Integration', 74: 'Unitary Method',
};

const getModuleName = (moduleId: number): string => MODULE_NAMES[moduleId] || `Module ${moduleId}`;
const getMicroSkillName = (microSkillId: number): string => MICRO_SKILL_NAMES[microSkillId] || `Skill ${microSkillId}`;

export default function AdminQuestionViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEditQuestions } = useAdminAuth();

  const [question, setQuestion] = useState<Question | null>(null);
  const [history, setHistory] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadQuestion();
  }, [id]);

  const loadQuestion = async () => {
    try {
      setIsLoading(true);
      const [questionData, historyData] = await Promise.all([
        adminQuestionService.getQuestion(id!),
        adminAuditService.getQuestionHistory(id!),
      ]);
      setQuestion(questionData);
      setHistory(historyData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load question');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error || 'Question not found'}</span>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[question.status] || {
    label: question.status || 'Unknown',
    icon: AlertCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  };
  const StatusIcon = statusConfig.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Questions
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Question Details</h1>
          <p className="text-gray-500 mt-1 font-mono">{question.question_code}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEditQuestions && (
            <Link to={`/admin/questions/${question._id}/edit`}>
              <Button className="gap-2">
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
            statusConfig.bgColor,
            statusConfig.color
          )}
        >
          <StatusIcon className="w-4 h-4" />
          {statusConfig.label}
        </span>
        <span className="text-sm text-gray-500">
          {getModuleName(question.module_id)} | {getMicroSkillName(question.micro_skill_id)}
        </span>
      </div>

      {/* Question Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Question</h2>
        <div className="text-gray-800">
          <MathDisplay content={question.question_data.text} block />
        </div>

        {/* Options */}
        {question.question_data.options && question.question_data.options.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Options</h3>
            <div className="space-y-2">
              {question.question_data.options.map((option, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    index === question.question_data.correct_answer
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  )}
                >
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
                      index === question.question_data.correct_answer
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-700'
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-gray-800 flex-1">
                    <MathDisplay content={option} />
                  </span>
                  {index === question.question_data.correct_answer && (
                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text/Numerical Answer */}
        {typeof question.question_data.correct_answer === 'string' ||
          (typeof question.question_data.correct_answer === 'number' &&
            (!question.question_data.options || question.question_data.options.length === 0) && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Correct Answer</h3>
                <div className="p-3 rounded-lg border border-green-300 bg-green-50 inline-block">
                  <span className="text-green-700 font-medium">
                    {question.question_data.correct_answer}
                  </span>
                </div>
              </div>
            ))}
      </div>

      {/* Solution Steps */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Solution Steps</h2>
        <div className="space-y-4">
          {question.question_data.solution_steps.map((step, index) => (
            <div key={index} className="relative pl-8">
              <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-700">
                {step.step}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-medium text-gray-800">{step.action}</p>
                {step.calculation && (
                  <div className="mt-1 text-gray-600 text-sm">
                    <MathDisplay content={step.calculation} />
                  </div>
                )}
                {step.result && (
                  <div className="mt-2 text-indigo-600 font-medium">
                    Result: <MathDisplay content={String(step.result)} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hints */}
      {question.question_data.hints && question.question_data.hints.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900">Hints</h2>
          </div>
          <div className="space-y-3">
            {question.question_data.hints.map((hint, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-sm font-medium text-yellow-700">
                  {hint.level}
                </span>
                <div className="text-gray-700">
                  <MathDisplay content={hint.text} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Difficulty</dt>
              <dd className="font-medium">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-2 h-2 rounded-full',
                        i < question.metadata.difficulty_level ? 'bg-indigo-500' : 'bg-gray-200'
                      )}
                    />
                  ))}
                  <span className="ml-2">{DIFFICULTY_LABELS[question.metadata.difficulty_level]}</span>
                </div>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Expected Time</dt>
              <dd className="font-medium">{question.metadata.expected_time_seconds}s</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Points</dt>
              <dd className="font-medium">{question.metadata.points}</dd>
            </div>
            {question.metadata.tags && question.metadata.tags.length > 0 && (
              <div>
                <dt className="text-gray-500 mb-2">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {question.metadata.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
          </div>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Total Attempts</dt>
              <dd className="font-medium">{question.performance.total_attempts}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Success Rate</dt>
              <dd className="font-medium text-green-600">
                {(question.performance.success_rate * 100).toFixed(1)}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Avg. Hints Used</dt>
              <dd className="font-medium">{question.performance.avg_hints_used.toFixed(1)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Abandon Rate</dt>
              <dd className="font-medium text-red-600">
                {(question.performance.abandon_rate * 100).toFixed(1)}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Avg. Time</dt>
              <dd className="font-medium">{question.metadata.actual_avg_time || 0}s</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Timeline/History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900">History</h2>
          </div>
          {history.length > 3 && (
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? 'Show Less' : `Show All (${history.length})`}
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {(showHistory ? history : history.slice(0, 3)).map((log) => (
            <div key={log._id} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <User className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{log.admin_name}</span>
                  <span className="text-gray-500"> {log.action.replace(/_/g, ' ')}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-sm text-gray-500">No history available</p>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex items-center justify-between text-sm text-gray-500 px-2">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          Created: {new Date(question.created_at).toLocaleString()}
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          Updated: {new Date(question.updated_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
