import { Target, Clock, BarChart3, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface MetricsProps {
  performance: {
    accuracy: {
      overall: number;
      trend: string;
      byDifficulty: { easy: number; medium: number; hard: number };
    };
    speed: {
      avgTimePerQuestion: number;
      idealTimeDifference: number;
    };
    consistency: {
      score: number;
      currentStreak: number;
      bestStreak?: number;
    };
  };
}

export function AtAGlanceMetrics({ performance }: MetricsProps) {
  const isPositiveTrend = performance.accuracy.trend.startsWith('+');
  const isFasterThanIdeal = performance.speed.idealTimeDifference <= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Accuracy Card */}
      <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-[#56339B]/10 rounded-lg flex items-center justify-center">
            <Target size={20} className="text-[#56339B]" />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            isPositiveTrend ? "text-green-600" : "text-red-500"
          )}>
            {isPositiveTrend ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {performance.accuracy.trend}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-1">Overall Accuracy</p>
        <p className="text-3xl font-bold text-gray-900 mb-4">{performance.accuracy.overall}%</p>

        {/* Difficulty Breakdown */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
          <div className="text-center">
            <div className="w-full h-1 bg-gray-100 rounded-full mb-1.5">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${performance.accuracy.byDifficulty.easy}%` }} />
            </div>
            <p className="text-xs text-gray-500">Easy</p>
            <p className="text-sm font-semibold text-gray-700">{performance.accuracy.byDifficulty.easy}%</p>
          </div>
          <div className="text-center">
            <div className="w-full h-1 bg-gray-100 rounded-full mb-1.5">
              <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${performance.accuracy.byDifficulty.medium}%` }} />
            </div>
            <p className="text-xs text-gray-500">Medium</p>
            <p className="text-sm font-semibold text-gray-700">{performance.accuracy.byDifficulty.medium}%</p>
          </div>
          <div className="text-center">
            <div className="w-full h-1 bg-gray-100 rounded-full mb-1.5">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${performance.accuracy.byDifficulty.hard}%` }} />
            </div>
            <p className="text-xs text-gray-500">Hard</p>
            <p className="text-sm font-semibold text-gray-700">{performance.accuracy.byDifficulty.hard}%</p>
          </div>
        </div>
      </div>

      {/* Speed Card */}
      <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Clock size={20} className="text-orange-600" />
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-1">Avg. Time / Question</p>
        <p className="text-3xl font-bold text-gray-900 mb-2">{performance.speed.avgTimePerQuestion}s</p>

        <div className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          isFasterThanIdeal ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
        )}>
          {isFasterThanIdeal ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(performance.speed.idealTimeDifference)}s {isFasterThanIdeal ? 'faster' : 'slower'} than ideal
        </div>

        {/* Speed Gauge */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Slow</span>
            <span>Fast</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isFasterThanIdeal ? "bg-green-500" : "bg-orange-500"
              )}
              style={{ width: `${Math.min(100, Math.max(10, 100 - performance.speed.avgTimePerQuestion * 2))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Consistency Card */}
      <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <BarChart3 size={20} className="text-blue-600" />
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-1">Consistency Score</p>
        <p className="text-3xl font-bold text-gray-900 mb-2">{performance.consistency.score}</p>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">{performance.consistency.currentStreak} day streak</span>
          {performance.consistency.currentStreak > 0 && (
            <span className="text-orange-500 text-lg">🔥</span>
          )}
        </div>

        {/* Streak Visual */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Last 7 days</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div
                key={day}
                className={cn(
                  "flex-1 h-6 rounded",
                  day <= performance.consistency.currentStreak ? "bg-[#56339B]" : "bg-gray-100"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mastery Progress Card */}
      <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-[#56339B]/10 rounded-lg flex items-center justify-center">
            <Award size={20} className="text-[#56339B]" />
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-1">Concept Mastery</p>
        <div className="flex items-baseline gap-1 mb-2">
          <p className="text-3xl font-bold text-gray-900">4</p>
          <p className="text-lg text-gray-400">/20</p>
        </div>
        <p className="text-sm text-gray-500 mb-4">modules completed</p>

        {/* Circular Progress */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#56339B] rounded-full" style={{ width: '20%' }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">20% complete</p>
            </div>
            <div className="ml-4 w-12 h-12 relative">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#56339B"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={125.6}
                  strokeDashoffset={125.6 * 0.8}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#56339B]">20%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
