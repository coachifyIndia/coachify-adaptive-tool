import { ArrowRight, Sparkles, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface ActionProps {
  adaptivity: {
    nextBestAction: {
      type: string;
      title: string;
      reason: string;
      predictedImprovement: string;
    };
    strengthRadar: {
      strong: string[];
      weak: string[];
      danger: string[];
    };
  };
  onStartSession: () => void;
  loading: boolean;
}

export function ActionCenter({ adaptivity, onStartSession, loading }: ActionProps) {
  const hasWeakTopics = adaptivity.strengthRadar.weak.length > 0 || adaptivity.strengthRadar.danger.length > 0;
  const hasStrongTopics = adaptivity.strengthRadar.strong.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Primary Action Card */}
      <div className="lg:col-span-2 bg-[#56339B] rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-yellow-300" />
              <span className="text-sm font-medium text-white/80 uppercase tracking-wide">Recommended for you</span>
            </div>

            <h3 className="text-xl font-semibold mb-2">{adaptivity.nextBestAction.title}</h3>
            <p className="text-white/70 text-sm mb-4 max-w-md">{adaptivity.nextBestAction.reason}</p>

            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 w-fit">
              <TrendingUp size={16} className="text-green-400" />
              <span className="text-sm">
                Expected: <span className="font-semibold text-green-400">{adaptivity.nextBestAction.predictedImprovement}</span>
              </span>
            </div>
          </div>

          <div>
            <button
              onClick={onStartSession}
              disabled={loading}
              className={cn(
                "flex items-center gap-2 px-6 py-3 bg-white text-[#56339B] font-semibold rounded-lg",
                "hover:bg-gray-100 transition-colors",
                "disabled:opacity-70 disabled:cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Start Practice
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Focus Areas Card */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Your Focus Areas</h4>

        {hasWeakTopics || hasStrongTopics ? (
          <div className="space-y-4">
            {/* Areas needing improvement */}
            {hasWeakTopics && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-orange-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase">Needs improvement</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {adaptivity.strengthRadar.danger.map((topic, i) => (
                    <span
                      key={`danger-${i}`}
                      className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-md"
                    >
                      {topic}
                    </span>
                  ))}
                  {adaptivity.strengthRadar.weak.map((topic, i) => (
                    <span
                      key={`weak-${i}`}
                      className="px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-md"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strong areas */}
            {hasStrongTopics && (
              <div className={hasWeakTopics ? "pt-3 border-t border-gray-100" : ""}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase">Strong topics</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {adaptivity.strengthRadar.strong.map((topic, i) => (
                    <span
                      key={`strong-${i}`}
                      className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-md"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Complete practice sessions to see your focus areas</p>
          </div>
        )}
      </div>
    </div>
  );
}
