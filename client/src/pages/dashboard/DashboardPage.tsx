import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { practiceService } from '../../services/practice.service';
import { dashboardService } from '../../services/dashboard.service';
import type { DashboardData } from '../../services/dashboard.service';
import { useNavigate } from 'react-router-dom';
import { AtAGlanceMetrics } from './components/AtAGlanceMetrics';
import { LearningDiagnosis } from './components/LearningDiagnosis';
import { ActionCenter } from './components/ActionCenter';
import { Trophy, Calendar, AlertCircle } from 'lucide-react';

// Default empty state for dashboard data
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
        // Fetch real dashboard data from backend
        const dashboardData = await dashboardService.getDashboardSummary();
        setData(dashboardData);
      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard data');
        // Keep empty state on error
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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
           <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">
                   Welcome back, <span className="font-semibold text-gray-900">{user?.name}</span>. 
                   {data.motivation.transparencyMSG}
                </p>
              </div>
              <div className="flex items-center gap-4">
                 <div className="hidden md:flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-sm font-medium border border-yellow-100">
                    <Trophy size={16} />
                    <span>Level {data.motivation.level}</span>
                 </div>
                 <div className="hidden md:flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-100">
                    <Calendar size={16} />
                    <span>Day {data.performance.consistency.currentStreak} Streak</span>
                 </div>
                 <button
                   onClick={() => navigate('/analytics-testing')}
                   className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium border border-purple-200 hover:bg-purple-100 transition-colors"
                 >
                   🧪 API Testing
                 </button>
              </div>
           </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
         {/* Layer 1: Core Metrics */}
         <section>
            <h2 className="sr-only">Performance Metrics</h2>
            <AtAGlanceMetrics performance={data.performance} />
         </section>

         {/* Layer 3: Action Center (Placed closer to top for better UX) */}
         <section>
            <h2 className="sr-only">Recommended Actions</h2>
            <ActionCenter 
               adaptivity={data.adaptivity} 
               onStartSession={startSession}
               loading={sessionStarting} 
            />
         </section>

         {/* Layer 2: Diagnosis */}
         <section>
             <h2 className="text-lg font-bold text-gray-900 mb-4">Learning Diagnosis</h2>
             <LearningDiagnosis diagnosis={data.diagnosis} />
         </section>

      </main>
    </div>
  );
}
