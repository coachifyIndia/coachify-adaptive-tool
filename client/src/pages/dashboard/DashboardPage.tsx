import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { practiceService } from '../../services/practice.service';
import { dashboardService } from '../../services/dashboard.service';
import type { DashboardData } from '../../services/dashboard.service';
import { useNavigate } from 'react-router-dom';
import { AtAGlanceMetrics } from './components/AtAGlanceMetrics';
import { LearningDiagnosis } from './components/LearningDiagnosis';
import { ActionCenter } from './components/ActionCenter';
import { AlertCircle, Loader2, BookOpen, Target, Flame, Trophy } from 'lucide-react';

const EMPTY_DASHBOARD_DATA: DashboardData = {
  performance: {
    accuracy: { overall: 0, trend: '+0%', byDifficulty: { easy: 0, medium: 0, hard: 0 } },
    speed: { avgTimePerQuestion: 0, idealTimeDifference: 0 },
    consistency: { score: 0, currentStreak: 0, bestStreak: 0 },
  },
  diagnosis: {
    mastery: { mastered: 0, learning: 0, notStarted: 21, topicMap: [] },
    errorIntelligence: { breakdown: [] },
    retention: { retentionScore: 100, decayRiskItems: 0 },
  },
  adaptivity: {
    nextBestAction: {
      type: 'explore',
      title: 'Start Your Learning Journey',
      reason: 'Begin practicing to see personalized recommendations.',
      predictedImprovement: '+10% Skills',
    },
    strengthRadar: { strong: [], weak: [], danger: [] },
  },
  motivation: {
    dailyGoalProgress: 0,
    xp: 0,
    level: 1,
    badges: [],
    transparencyMSG: 'Start practicing to see your progress!',
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStarting, setSessionStarting] = useState(false);
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const dashboardData = await dashboardService.getDashboardSummary();
        setData(dashboardData);
      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard data');
        setData(EMPTY_DASHBOARD_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const startSession = async () => {
    setSessionStarting(true);
    try {
      const response = await practiceService.startSession({ session_size: 10 });
      navigate(`/practice/session/${response.data.session.session_id}`, {
        state: { initialData: response.data }
      });
    } catch (error: any) {
      console.error('Failed to start session', error);
      if (error.response?.data?.error === 'ACTIVE_SESSION_EXISTS') {
        const activeSessionId = error.response.data.data.active_session_id;
        navigate(`/practice/session/${activeSessionId}`);
      } else {
        alert('Failed to start session. Please try again.');
      }
    } finally {
      setSessionStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#56339B] animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load dashboard</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#56339B] text-white font-medium rounded-lg hover:bg-[#4a2d85] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const greeting = getGreeting();
  const firstName = user?.name?.split(' ')[0] || 'Student';

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Dashboard Header */}
      <div className="bg-[#56339B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="text-white">
              <p className="text-[#c4b5fd] text-sm">{greeting}</p>
              <h1 className="text-2xl font-semibold mt-1">Welcome back, {firstName}!</h1>
              <p className="text-[#c4b5fd] text-sm mt-1">{data.motivation.transparencyMSG}</p>
            </div>

            {/* Quick Stats Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <QuickStatBadge
                icon={<Trophy size={18} />}
                value={data.motivation.level}
                label="Level"
              />
              <QuickStatBadge
                icon={<Flame size={18} />}
                value={data.performance.consistency.currentStreak}
                label="Day Streak"
              />
              <QuickStatBadge
                icon={<Target size={18} />}
                value={`${data.motivation.xp}`}
                label="XP Earned"
              />
              <QuickStatBadge
                icon={<BookOpen size={18} />}
                value="4/20"
                label="Modules"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Primary Action Card */}
        <section className="mb-6">
          <ActionCenter
            adaptivity={data.adaptivity}
            onStartSession={startSession}
            loading={sessionStarting}
          />
        </section>

        {/* Performance Stats */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Performance</h2>
            <span className="text-sm text-[#56339B] font-medium cursor-pointer hover:underline">View Details</span>
          </div>
          <AtAGlanceMetrics performance={data.performance} />
        </section>

        {/* Learning Analytics */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Learning Analytics</h2>
            <span className="text-sm text-[#56339B] font-medium cursor-pointer hover:underline">View All</span>
          </div>
          <LearningDiagnosis diagnosis={data.diagnosis} />
        </section>
      </div>
    </div>
  );
}

function QuickStatBadge({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5 flex items-center gap-3 min-w-[120px]">
      <div className="text-white/80">{icon}</div>
      <div>
        <p className="text-white font-semibold text-lg leading-tight">{value}</p>
        <p className="text-white/70 text-xs">{label}</p>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
