import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Brain, AlertCircle, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface DiagnosisProps {
  diagnosis: {
    mastery: {
      topicMap: Array<{ id: number; name: string; status: string; score: number }>;
    };
    errorIntelligence: {
      breakdown: Array<{ type: string; percentage: number; trend: string }>;
    };
    retention: {
      retentionScore: number;
      decayRiskItems: number;
    };
  };
}

const CHART_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

export function LearningDiagnosis({ diagnosis }: DiagnosisProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100 text-sm">
          <p className="font-medium text-gray-900">{data.type}</p>
          <p className="text-gray-500">{data.percentage}% of errors</p>
        </div>
      );
    }
    return null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bar: 'bg-green-500', text: 'text-green-600' };
    if (score >= 60) return { bar: 'bg-yellow-500', text: 'text-yellow-600' };
    if (score >= 40) return { bar: 'bg-orange-500', text: 'text-orange-600' };
    return { bar: 'bg-gray-300', text: 'text-gray-500' };
  };

  const getRetentionColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Topic Mastery */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#56339B]/10 rounded-lg flex items-center justify-center">
              <Brain size={16} className="text-[#56339B]" />
            </div>
            <h3 className="font-semibold text-gray-900">Topic Mastery</h3>
          </div>
          <span className="text-xs text-gray-500">{diagnosis.mastery.topicMap.length} topics</span>
        </div>

        <div className="p-4 max-h-[280px] overflow-y-auto">
          {diagnosis.mastery.topicMap.length > 0 ? (
            <div className="space-y-3">
              {diagnosis.mastery.topicMap.map((topic) => {
                const colors = getScoreColor(topic.score);
                return (
                  <div key={topic.id} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 truncate flex-1 mr-2">{topic.name}</span>
                      <span className={cn("text-sm font-semibold", colors.text)}>{topic.score}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", colors.bar)}
                        style={{ width: `${topic.score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <Brain size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No topics tracked yet</p>
              <p className="text-xs text-gray-400 mt-1">Start practicing to see your progress</p>
            </div>
          )}
        </div>
      </div>

      {/* Error Analysis */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertCircle size={16} className="text-red-500" />
          </div>
          <h3 className="font-semibold text-gray-900">Error Analysis</h3>
        </div>

        <div className="p-4">
          {diagnosis.errorIntelligence.breakdown.length > 0 ? (
            <>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={diagnosis.errorIntelligence.breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="percentage"
                      strokeWidth={0}
                    >
                      {diagnosis.errorIntelligence.breakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 mt-3">
                {diagnosis.errorIntelligence.breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="text-gray-600">{item.type}</span>
                    </div>
                    <span className="font-medium text-gray-900">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <AlertCircle size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No error data yet</p>
              <p className="text-xs text-gray-400 mt-1">Practice more to see patterns</p>
            </div>
          )}
        </div>
      </div>

      {/* Retention Health */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <RefreshCw size={16} className="text-orange-500" />
          </div>
          <h3 className="font-semibold text-gray-900">Retention Health</h3>
        </div>

        <div className="p-5">
          {/* Retention Score Display */}
          <div className="text-center mb-6">
            <div className="relative inline-flex items-center justify-center w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke={diagnosis.retention.retentionScore >= 80 ? '#22c55e' : diagnosis.retention.retentionScore >= 60 ? '#eab308' : '#ef4444'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 * (1 - diagnosis.retention.retentionScore / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-2xl font-bold", getRetentionColor(diagnosis.retention.retentionScore))}>
                  {diagnosis.retention.retentionScore}
                </span>
                <span className="text-xs text-gray-400">/ 100</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Memory Retention</p>
          </div>

          {/* Revision Status */}
          {diagnosis.retention.decayRiskItems > 0 ? (
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    {diagnosis.retention.decayRiskItems} topics need revision
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Review these topics soon to maintain your progress
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">All caught up!</p>
                  <p className="text-xs text-green-600 mt-1">No topics need immediate revision</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
