import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileQuestion,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  TrendingUp,
  Plus,
  Upload,
  ArrowRight,
} from 'lucide-react';
import { adminQuestionService } from '../../services/admin.service';
import type { DashboardStats } from '../../services/admin.service';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function StatCard({ title, value, icon, color, bgColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
        <div className={cn('p-3 rounded-xl', bgColor)}>
          <div className={color}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await adminQuestionService.getQuestionStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
        <button
          onClick={loadStats}
          className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  const statusStats = [
    {
      key: 'active',
      title: 'Active',
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      key: 'published',
      title: 'Published',
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      key: 'draft',
      title: 'Drafts',
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      key: 'archived',
      title: 'Archived',
      icon: <Archive className="w-6 h-6" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ].filter((stat) => stats?.by_status?.[stat.key]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your question bank</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/import">
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Bulk Import
            </Button>
          </Link>
          <Link to="/admin/questions/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Question
            </Button>
          </Link>
        </div>
      </div>

      {/* Total Questions Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 font-medium">Total Questions</p>
            <p className="text-4xl font-bold mt-1">
              {stats?.total?.toLocaleString() || 0}
            </p>
            <p className="text-indigo-200 mt-2 text-sm">Across all modules and skills</p>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl">
            <FileQuestion className="w-12 h-12" />
          </div>
        </div>
      </div>

      {/* Status Stats Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Questions by Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusStats.map((stat) => (
            <StatCard
              key={stat.key}
              title={stat.title}
              value={stats?.by_status?.[stat.key] || 0}
              icon={stat.icon}
              color={stat.color}
              bgColor={stat.bgColor}
            />
          ))}
        </div>
      </div>

      {/* Module Distribution */}
      {stats?.by_module && Object.keys(stats.by_module).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Questions by Module</h2>
            <Link
              to="/admin/questions"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.by_module)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([moduleId, count]) => {
                const percentage =
                  stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={moduleId} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-gray-600">
                      Module {moduleId}
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm font-medium text-gray-700">
                      {count}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/admin/questions?status=review"
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
          >
            <div className="p-2 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Review Pending</p>
              <p className="text-sm text-gray-500">
                {stats?.by_status?.review || 0} questions waiting
              </p>
            </div>
          </Link>
          <Link
            to="/admin/questions/new"
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
          >
            <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
              <Plus className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Create Question</p>
              <p className="text-sm text-gray-500">Add a new question</p>
            </div>
          </Link>
          <Link
            to="/admin/audit"
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
          >
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Activity Logs</p>
              <p className="text-sm text-gray-500">View recent changes</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
