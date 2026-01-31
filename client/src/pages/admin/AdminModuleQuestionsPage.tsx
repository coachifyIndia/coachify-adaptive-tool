import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  AlertTriangle,
} from 'lucide-react';
import {
  adminQuestionService,
  adminCurriculumService,
  QuestionStatus,
} from '../../services/admin.service';
import type { Question, ModuleData } from '../../services/admin.service';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { useAdminAuth } from '../../context/AdminAuthContext';

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle2; color: string; bgColor: string }
> = {
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
    label: 'Review',
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
  1: 'Very Easy',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Very Hard',
};

interface MicroSkillQuestions {
  microSkillId: number;
  microSkillName: string;
  questions: Question[];
}

export default function AdminModuleQuestionsPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { canEditQuestions } = useAdminAuth();

  const [module, setModule] = useState<ModuleData | null>(null);
  const [microSkillQuestions, setMicroSkillQuestions] = useState<MicroSkillQuestions[]>([]);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{
    microSkillId: number;
    microSkillName: string;
    count: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!moduleId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load curriculum to get module and micro-skill names
      let curriculum;
      try {
        curriculum = await adminCurriculumService.getCurriculum();
      } catch (err: any) {
        console.error('Failed to load curriculum:', err);
        setError('Failed to load curriculum data');
        return;
      }

      const modules = curriculum?.modules || [];
      const moduleData = modules.find((m) => m.id === Number(moduleId));

      if (!moduleData) {
        setError('Module not found');
        return;
      }

      setModule(moduleData);

      // Load all questions for this module (paginated - max 100 per request)
      const allQuestions: Question[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await adminQuestionService.getQuestions({
          module_id: Number(moduleId),
          limit: 100,
          page,
        });

        const questions = response.data || [];
        allQuestions.push(...questions);

        // Check if there are more pages
        if (questions.length < 100 || page >= response.pagination.total_pages) {
          hasMore = false;
        } else {
          page++;
        }
      }

      // Ensure micro_skills exists
      const microSkills = moduleData.micro_skills || [];
      const microSkillIds = new Set(microSkills.map((s) => s.id));

      // Group questions by micro-skill (include all questions, including archived)
      const groupedQuestions: MicroSkillQuestions[] = microSkills.map((skill) => ({
        microSkillId: skill.id,
        microSkillName: skill.name,
        questions: allQuestions.filter((q) => q.micro_skill_id === skill.id),
      }));

      // Find questions that don't belong to any known micro-skill
      const uncategorizedQuestions = allQuestions.filter(
        (q) => !microSkillIds.has(q.micro_skill_id)
      );

      // Add "Uncategorized" tab if there are orphaned questions
      if (uncategorizedQuestions.length > 0) {
        // Group uncategorized by their micro_skill_id
        const uncategorizedBySkillId = new Map<number, Question[]>();
        uncategorizedQuestions.forEach((q) => {
          const existing = uncategorizedBySkillId.get(q.micro_skill_id) || [];
          existing.push(q);
          uncategorizedBySkillId.set(q.micro_skill_id, existing);
        });

        // Add a tab for each uncategorized micro_skill_id
        uncategorizedBySkillId.forEach((questions, skillId) => {
          groupedQuestions.push({
            microSkillId: skillId,
            microSkillName: `Micro-skill ${skillId} (Not in curriculum)`,
            questions,
          });
        });
      }

      setMicroSkillQuestions(groupedQuestions);

      // Set first tab with questions as active, or first tab if none have questions
      const firstWithQuestions = groupedQuestions.find((g) => g.questions.length > 0);
      setActiveTab(firstWithQuestions?.microSkillId || groupedQuestions[0]?.microSkillId || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load module data');
    } finally {
      setIsLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (questionId: string) => {
    try {
      setIsDeleting(true);
      await adminQuestionService.deleteQuestion(questionId);
      setDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete question');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteConfirm || !moduleId) return;

    try {
      setIsDeleting(true);
      await adminQuestionService.bulkDeleteQuestionsByMicroSkill(
        Number(moduleId),
        bulkDeleteConfirm.microSkillId,
        `Bulk deleted from admin module questions page`
      );
      setBulkDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete questions');
    } finally {
      setIsDeleting(false);
    }
  };

  const activeSkillData = microSkillQuestions.find((g) => g.microSkillId === activeTab);
  const totalQuestions = microSkillQuestions.reduce((sum, g) => sum + g.questions.length, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          <p className="text-gray-500 text-sm">Loading module questions...</p>
        </div>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/admin/dashboard')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error || 'Module not found'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/dashboard')}
            className="gap-2 -ml-2 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{module.name}</h1>
          <p className="text-gray-500 mt-1">
            {totalQuestions} questions across {microSkillQuestions.length} micro-skills
          </p>
        </div>
        {canEditQuestions && (
          <Link to={`/admin/questions/new?module_id=${moduleId}`}>
            <Button className="gap-2">Add Question to Module</Button>
          </Link>
        )}
      </div>

      {/* Micro-skill Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
            {microSkillQuestions.map((group) => (
              <button
                key={group.microSkillId}
                onClick={() => setActiveTab(group.microSkillId)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeTab === group.microSkillId
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {group.microSkillName}
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs',
                    activeTab === group.microSkillId
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {group.questions.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeSkillData && (
            <>
              {/* Bulk Delete Button - only for non-archived questions */}
              {canEditQuestions && (() => {
                const nonArchivedCount = activeSkillData.questions.filter(
                  (q) => q.status !== QuestionStatus.ARCHIVED
                ).length;
                return nonArchivedCount > 0 ? (
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="outline"
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      onClick={() =>
                        setBulkDeleteConfirm({
                          microSkillId: activeSkillData.microSkillId,
                          microSkillName: activeSkillData.microSkillName,
                          count: nonArchivedCount,
                        })
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete All ({nonArchivedCount})
                    </Button>
                  </div>
                ) : null;
              })()}

              {/* Questions List */}
              {activeSkillData.questions.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No questions yet</h3>
                  <p className="text-gray-500 mt-1">
                    No questions in this micro-skill yet. Add a question to get started.
                  </p>
                  {canEditQuestions && (
                    <Link
                      to={`/admin/questions/new?module_id=${moduleId}&micro_skill_id=${activeSkillData.microSkillId}`}
                      className="mt-4 inline-block"
                    >
                      <Button>Add Question</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Question
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Difficulty
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {activeSkillData.questions.map((question) => {
                        const statusConfig = STATUS_CONFIG[question.status] || {
                          label: question.status || 'Unknown',
                          icon: AlertCircle,
                          color: 'text-gray-600',
                          bgColor: 'bg-gray-50',
                        };
                        const StatusIcon = statusConfig.icon;
                        const isArchived = question.status === QuestionStatus.ARCHIVED;

                        return (
                          <tr
                            key={question._id}
                            className={cn(
                              'hover:bg-gray-50',
                              isArchived && 'bg-gray-100/50 opacity-60'
                            )}
                          >
                            <td className="px-4 py-4">
                              <div className="max-w-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-xs text-gray-400 font-mono">
                                    {question.question_code}
                                  </p>
                                  {isArchived && (
                                    <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                                      ARCHIVED
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={cn(
                                    'text-sm line-clamp-2',
                                    isArchived ? 'text-gray-500' : 'text-gray-900'
                                  )}
                                  title={question.question_data.text}
                                >
                                  {question.question_data.text.length > 100
                                    ? `${question.question_data.text.substring(0, 100)}...`
                                    : question.question_data.text}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      'w-2 h-2 rounded-full',
                                      i < question.metadata.difficulty_level
                                        ? 'bg-indigo-500'
                                        : 'bg-gray-200'
                                    )}
                                  />
                                ))}
                                <span className="ml-2 text-sm text-gray-600">
                                  {DIFFICULTY_LABELS[question.metadata.difficulty_level]}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                                  statusConfig.bgColor,
                                  statusConfig.color
                                )}
                              >
                                <StatusIcon className="w-3.5 h-3.5" />
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canEditQuestions && !isArchived && (
                                  <>
                                    <Link
                                      to={`/admin/questions/${question._id}/edit`}
                                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Link>
                                    <button
                                      onClick={() => setDeleteConfirm(question._id)}
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Single Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Question</h3>
            <p className="mt-2 text-gray-600">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setBulkDeleteConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold">Delete All Questions</h3>
            </div>
            <p className="text-gray-600">
              This will permanently delete{' '}
              <span className="font-semibold text-gray-900">{bulkDeleteConfirm.count} questions</span>{' '}
              from <span className="font-semibold text-gray-900">{bulkDeleteConfirm.microSkillName}</span>.
            </p>
            <p className="mt-2 text-sm text-red-600 font-medium">This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setBulkDeleteConfirm(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : `Delete ${bulkDeleteConfirm.count} Questions`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
