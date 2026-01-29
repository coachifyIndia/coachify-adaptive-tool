import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  FileQuestion,
  Calendar,
  Clock,
  X,
  Eye,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { adminAuditService } from '../../services/admin.service';
import type { AuditLog } from '../../services/admin.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../utils/cn';

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  created: { label: 'Created', icon: Plus, color: 'text-green-600' },
  updated: { label: 'Updated', icon: Edit2, color: 'text-blue-600' },
  deleted: { label: 'Deleted', icon: Trash2, color: 'text-red-600' },
  status_changed: { label: 'Status Changed', icon: RefreshCw, color: 'text-purple-600' },
  published: { label: 'Published', icon: CheckCircle2, color: 'text-green-600' },
  archived: { label: 'Archived', icon: Trash2, color: 'text-gray-600' },
  bulk_imported: { label: 'Bulk Imported', icon: Upload, color: 'text-indigo-600' },
};

interface AuditFilters {
  question_id?: string;
  admin_id?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export default function AdminAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const [filters, setFilters] = useState<AuditFilters>({
    action: searchParams.get('action') || undefined,
    start_date: searchParams.get('start_date') || undefined,
    end_date: searchParams.get('end_date') || undefined,
    page: Number(searchParams.get('page')) || 1,
    limit: 25,
  });

  const loadLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminAuditService.getAuditLogs(filters);
      setLogs(response.data);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        pages: response.pagination.total_pages,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.action) params.set('action', filters.action);
    if (filters.start_date) params.set('start_date', filters.start_date);
    if (filters.end_date) params.set('end_date', filters.end_date);
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const handleFilterChange = (key: keyof AuditFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      action: undefined,
      start_date: undefined,
      end_date: undefined,
      page: 1,
      limit: 25,
    });
  };

  const hasActiveFilters = filters.action || filters.start_date || filters.end_date;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || { label: action, icon: Edit2, color: 'text-gray-600' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500 mt-1">Track all changes made to questions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn('gap-2', hasActiveFilters && 'border-indigo-500 text-indigo-600')}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                {[filters.action, filters.start_date, filters.end_date].filter(Boolean).length}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="gap-1 text-gray-500">
              <X className="w-4 h-4" />
              Clear Filters
            </Button>
          )}
          <Button variant="ghost" onClick={loadLogs} className="gap-2 ml-auto">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Actions</option>
                {Object.entries(ACTION_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <Input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <Input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <X className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No audit logs found</h3>
            <p className="text-gray-500 mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Logs will appear here when changes are made'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {logs.map((log) => {
                const actionConfig = getActionConfig(log.action);
                const ActionIcon = actionConfig.icon;

                return (
                  <div key={log._id} className="hover:bg-gray-50 transition-colors">
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                          className={cn(
                            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                            actionConfig.color === 'text-green-600' && 'bg-green-100',
                            actionConfig.color === 'text-blue-600' && 'bg-blue-100',
                            actionConfig.color === 'text-red-600' && 'bg-red-100',
                            actionConfig.color === 'text-purple-600' && 'bg-purple-100',
                            actionConfig.color === 'text-indigo-600' && 'bg-indigo-100',
                            actionConfig.color === 'text-gray-600' && 'bg-gray-100'
                          )}
                        >
                          <ActionIcon className={cn('w-5 h-5', actionConfig.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('font-medium', actionConfig.color)}>
                              {actionConfig.label}
                            </span>
                            <span className="text-gray-600">by</span>
                            <span className="font-medium text-gray-900 flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {log.admin_name}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                            <Link
                              to={`/admin/questions/${log.question_id}`}
                              className="flex items-center gap-1 hover:text-indigo-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FileQuestion className="w-4 h-4" />
                              <span className="font-mono">{log.question_code}</span>
                            </Link>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* View button */}
                        <Link
                          to={`/admin/questions/${log.question_id}`}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedLog === log._id && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                        <div className="pl-14">
                          {/* Changes */}
                          {log.changes && log.changes.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Changes</h4>
                              <div className="space-y-2">
                                {log.changes.map((change, i) => (
                                  <div
                                    key={i}
                                    className="bg-white rounded-lg border border-gray-200 p-3"
                                  >
                                    <p className="text-sm font-medium text-gray-900 mb-1">
                                      {change.field}
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <p className="text-gray-500 text-xs mb-1">Before</p>
                                        <p className="text-red-600 bg-red-50 p-2 rounded text-xs font-mono overflow-auto max-h-20">
                                          {JSON.stringify(change.old_value, null, 2)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-500 text-xs mb-1">After</p>
                                        <p className="text-green-600 bg-green-50 p-2 rounded text-xs font-mono overflow-auto max-h-20">
                                          {JSON.stringify(change.new_value, null, 2)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Metadata */}
                          {log.metadata && (
                            <div className="text-sm text-gray-500">
                              {log.metadata.ip_address && (
                                <p>IP: {log.metadata.ip_address}</p>
                              )}
                              {log.metadata.batch_id && (
                                <p>Batch ID: {log.metadata.batch_id}</p>
                              )}
                              {log.metadata.reason && (
                                <p>Reason: {log.metadata.reason}</p>
                              )}
                            </div>
                          )}

                          {log.changes.length === 0 && !log.metadata && (
                            <p className="text-sm text-gray-500">No additional details available</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} logs
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
    </div>
  );
}
