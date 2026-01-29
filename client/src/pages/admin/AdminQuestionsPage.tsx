import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  MoreVertical,
  X,
} from 'lucide-react';
import {
  adminQuestionService,
  QuestionStatus,
} from '../../services/admin.service';
import type { Question, QuestionFilters } from '../../services/admin.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../utils/cn';
import { useAdminAuth } from '../../context/AdminAuthContext';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bgColor: string; borderColor: string }> = {
  [QuestionStatus.ACTIVE]: {
    label: 'Active',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  [QuestionStatus.DRAFT]: {
    label: 'Draft',
    icon: AlertCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  [QuestionStatus.REVIEW]: {
    label: 'Review',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  [QuestionStatus.PUBLISHED]: {
    label: 'Published',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  [QuestionStatus.ARCHIVED]: {
    label: 'Archived',
    icon: Archive,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Very Hard',
};

export default function AdminQuestionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canEditQuestions } = useAdminAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState<QuestionFilters>({
    search: searchParams.get('search') || '',
    status: (searchParams.get('status') as QuestionStatus) || undefined,
    module_id: searchParams.get('module_id') ? Number(searchParams.get('module_id')) : undefined,
    difficulty_level: searchParams.get('difficulty') ? Number(searchParams.get('difficulty')) : undefined,
    page: Number(searchParams.get('page')) || 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const loadQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminQuestionService.getQuestions(filters);
      setQuestions(response.data);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        pages: response.pagination.total_pages,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.module_id) params.set('module_id', String(filters.module_id));
    if (filters.difficulty_level) params.set('difficulty', String(filters.difficulty_level));
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: keyof QuestionFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: undefined,
      module_id: undefined,
      difficulty_level: undefined,
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

  const handleDelete = async (questionId: string) => {
    try {
      await adminQuestionService.deleteQuestion(questionId);
      setDeleteConfirm(null);
      loadQuestions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleStatusChange = async (questionId: string, newStatus: QuestionStatus) => {
    try {
      await adminQuestionService.updateQuestionStatus(questionId, newStatus);
      setActionMenuOpen(null);
      loadQuestions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const hasActiveFilters = filters.status || filters.module_id || filters.difficulty_level;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questions</h1>
          <p className="text-gray-500 mt-1">Manage your question bank</p>
        </div>
        {canEditQuestions && (
          <Link to="/admin/questions/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Question
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search questions..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-10 h-10"
              />
            </div>
          </form>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn('gap-2', hasActiveFilters && 'border-indigo-500 text-indigo-600')}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                  {[filters.status, filters.module_id, filters.difficulty_level].filter(Boolean).length}
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-1 text-gray-500">
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
              <select
                value={filters.module_id || ''}
                onChange={(e) => handleFilterChange('module_id', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Modules</option>
                {Array.from({ length: 21 }, (_, i) => (
                  <option key={i} value={i}>
                    Module {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={filters.difficulty_level || ''}
                onChange={(e) =>
                  handleFilterChange('difficulty_level', e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Difficulties</option>
                {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Questions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No questions found</h3>
            <p className="text-gray-500 mt-1">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Get started by creating your first question'}
            </p>
            {canEditQuestions && !hasActiveFilters && (
              <Link to="/admin/questions/new" className="mt-4 inline-block">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Question
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Module / Skill
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {questions.map((question) => {
                    const statusConfig = STATUS_CONFIG[question.status] || {
                      label: question.status || 'Unknown',
                      icon: AlertCircle,
                      color: 'text-gray-600',
                      bgColor: 'bg-gray-50',
                      borderColor: 'border-gray-200',
                    };
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={question._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="max-w-md">
                            <p className="text-xs text-gray-400 font-mono mb-1">
                              {question.question_code}
                            </p>
                            <p className="text-sm text-gray-900 line-clamp-2">
                              {question.question_data.text}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">Module {question.module_id}</p>
                            <p className="text-gray-500">Skill {question.micro_skill_id}</p>
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
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900">
                              {(question.performance.success_rate * 100).toFixed(0)}% success
                            </p>
                            <p className="text-gray-500">
                              {question.performance.total_attempts} attempts
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/admin/questions/${question._id}`}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {canEditQuestions && (
                              <>
                                <Link
                                  to={`/admin/questions/${question._id}/edit`}
                                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Link>
                                <div className="relative">
                                  <button
                                    onClick={() =>
                                      setActionMenuOpen(
                                        actionMenuOpen === question._id ? null : question._id
                                      )
                                    }
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  {actionMenuOpen === question._id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setActionMenuOpen(null)}
                                      />
                                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                                          Change Status
                                        </div>
                                        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                                          if (status === question.status) return null;
                                          const Icon = config.icon;
                                          return (
                                            <button
                                              key={status}
                                              onClick={() =>
                                                handleStatusChange(question._id, status as QuestionStatus)
                                              }
                                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                              <Icon className={cn('w-4 h-4', config.color)} />
                                              Move to {config.label}
                                            </button>
                                          );
                                        })}
                                        <div className="border-t border-gray-100 mt-1 pt-1">
                                          <button
                                            onClick={() => {
                                              setActionMenuOpen(null);
                                              setDeleteConfirm(question._id);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Question
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
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

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} questions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page! - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))}
                    disabled={pagination.page === pagination.pages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Question</h3>
            <p className="mt-2 text-gray-600">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
