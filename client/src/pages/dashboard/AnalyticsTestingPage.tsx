import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '../../services/analytics.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, PlayCircle, Loader2 } from 'lucide-react';

interface ApiResult {
  endpoint: string;
  loading: boolean;
  data: any;
  error: string | null;
  timestamp: string | null;
}

export default function AnalyticsTestingPage() {
  const navigate = useNavigate();
  const [sessionIdInput, setSessionIdInput] = useState('');
  const [results, setResults] = useState<Record<string, ApiResult>>({});

  const updateResult = (key: string, partial: Partial<ApiResult>) => {
    setResults(prev => ({
      ...prev,
      [key]: { ...prev[key], ...partial } as ApiResult
    }));
  };

  const callApi = async (
    key: string,
    endpoint: string,
    apiFunction: () => Promise<any>
  ) => {
    updateResult(key, { endpoint, loading: true, error: null, data: null, timestamp: null });
    
    try {
      const response = await apiFunction();
      updateResult(key, {
        loading: false,
        data: response,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error: any) {
      updateResult(key, {
        loading: false,
        error: error.response?.data?.message || error.message || 'Unknown error',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const apiTests = [
    // Confidence Analytics
    {
      category: 'Confidence Analytics',
      apis: [
        {
          key: 'confidence-overall',
          name: 'Overall Confidence Analytics',
          endpoint: 'GET /api/v1/analytics/confidence',
          description: 'Get overall confidence metrics across all sessions',
          handler: () => callApi('confidence-overall', '/analytics/confidence', analyticsService.getOverallConfidence)
        },
        {
          key: 'confidence-by-skill',
          name: 'Confidence by Micro-Skill',
          endpoint: 'GET /api/v1/analytics/confidence/by-skill',
          description: 'Get confidence breakdown by each micro-skill',
          handler: () => callApi('confidence-by-skill', '/analytics/confidence/by-skill', analyticsService.getConfidenceBySkill)
        }
      ]
    },
    // Time Analytics
    {
      category: 'Time Analytics',
      apis: [
        {
          key: 'speed-accuracy',
          name: 'Speed-Accuracy Correlation',
          endpoint: 'GET /api/v1/analytics/time/speed-accuracy',
          description: 'Analyze correlation between speed and accuracy',
          handler: () => callApi('speed-accuracy', '/analytics/time/speed-accuracy', analyticsService.getSpeedAccuracyCorrelation)
        },
        {
          key: 'time-of-day',
          name: 'Time of Day Analysis',
          endpoint: 'GET /api/v1/analytics/time/time-of-day',
          description: 'Find best and worst practice hours',
          handler: () => callApi('time-of-day', '/analytics/time/time-of-day', analyticsService.getTimeOfDay)
        },
        {
          key: 'fatigue',
          name: 'Fatigue Detection',
          endpoint: 'GET /api/v1/analytics/time/fatigue/:session_id',
          description: 'Detect fatigue patterns in a specific session',
          handler: () => {
            if (!sessionIdInput) {
              alert('Please enter a Session ID first');
              return;
            }
            callApi('fatigue', `/analytics/time/fatigue/${sessionIdInput}`, () => analyticsService.getFatigueDetection(sessionIdInput));
          },
          requiresInput: true
        },
        {
          key: 'difficulty-analysis',
          name: 'Difficulty & Time Analysis',
          endpoint: 'GET /api/v1/analytics/time/difficulty-analysis',
          description: 'Analyze time allocation across difficulty levels',
          handler: () => callApi('difficulty-analysis', '/analytics/time/difficulty-analysis', analyticsService.getDifficultyAnalysis)
        },
        {
          key: 'recommendations',
          name: 'Combined Recommendations',
          endpoint: 'GET /api/v1/analytics/time/recommendations',
          description: 'Get personalized practice recommendations',
          handler: () => callApi('recommendations', '/analytics/time/recommendations', analyticsService.getRecommendations)
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FC] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <Button
            variant="ghost"
            className="pl-0 gap-2 text-gray-600 hover:text-indigo-600 hover:bg-transparent transition-colors"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={20} /> <span className="font-medium">Back to Dashboard</span>
          </Button>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics API Testing</h1>
            <p className="text-sm text-gray-500">Test and debug analytics endpoints</p>
          </div>
        </div>

        {/* Session ID Input (for fatigue detection) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Session ID (Required for Fatigue Detection API)
          </label>
          <Input
            placeholder="Enter Session ID (e.g., SES_123456)"
            value={sessionIdInput}
            onChange={(e) => setSessionIdInput(e.target.value)}
            className="max-w-md"
          />
          <p className="text-xs text-gray-500 mt-1">
            Tip: Complete a practice session first, then use that session ID here
          </p>
        </div>

        {/* API Test Sections */}
        {apiTests.map((section) => (
          <div key={section.category} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="inline-block w-1 h-6 bg-indigo-600 rounded"></span>
              {section.category}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {section.apis.map((api) => {
                const result = results[api.key];

                return (
                  <div
                    key={api.key}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* API Header */}
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{api.name}</h3>
                          <code className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded mt-1 inline-block">
                            {api.endpoint}
                          </code>
                          <p className="text-sm text-gray-600 mt-2">{api.description}</p>
                          {api.requiresInput && (
                            <p className="text-xs text-orange-600 mt-1 font-medium">
                              ⚠️ Requires Session ID input above
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={api.handler}
                          disabled={result?.loading}
                          className="flex items-center gap-2 shrink-0"
                        >
                          {result?.loading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <PlayCircle size={16} />
                              Test API
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* API Result */}
                    {result && (
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-700">Response:</span>
                          {result.timestamp && (
                            <span className="text-xs text-gray-500">
                              Received at {result.timestamp}
                            </span>
                          )}
                        </div>

                        {result.error ? (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-red-800 mb-1">Error</p>
                            <p className="text-sm text-red-700">{result.error}</p>
                          </div>
                        ) : result.data ? (
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <pre className="text-xs text-gray-800 p-4 overflow-x-auto max-h-96 overflow-y-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quick Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Quick Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Make sure you have completed some practice sessions to see meaningful analytics</li>
            <li>For Fatigue Detection, copy a session ID from your recent sessions</li>
            <li>Check browser console for detailed network requests</li>
            <li>Responses are displayed in JSON format for easy inspection</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
