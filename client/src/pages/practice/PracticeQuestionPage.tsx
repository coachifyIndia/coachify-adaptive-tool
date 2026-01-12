import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { practiceService } from '../../services/practice.service';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, PlayCircle, Loader2, BookOpen, Target, Zap } from 'lucide-react';

export default function PracticeQuestionPage() {
  const navigate = useNavigate();
  const [sessionStarting, setSessionStarting] = useState(false);

  const startPracticeSession = async (sessionSize: number) => {
    setSessionStarting(true);
    try {
      const response = await practiceService.startSession({ session_size: sessionSize });
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

  return (
    <div className="min-h-screen bg-[#F8F9FC] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
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
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Practice Questions</h1>
            <p className="text-sm text-gray-500">Start a practice session to improve your skills</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How Practice Questions Work</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Choose your session length and start practicing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Questions are tailored to your current skill level</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Get instant feedback and detailed explanations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Track your progress and build confidence</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Session Size Cards */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Choose Session Length</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Session */}
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 p-6 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Quick</h3>
                  <p className="text-xs text-gray-500">5 Questions</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">Perfect for a quick warm-up or review session</p>
              <div className="text-xs text-gray-500 mb-4">⏱️ ~5-10 minutes</div>
              <Button
                onClick={() => startPracticeSession(5)}
                disabled={sessionStarting}
                className="w-full"
              >
                {sessionStarting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    <PlayCircle size={16} className="mr-2" />
                    Start Quick Session
                  </>
                )}
              </Button>
            </div>

            {/* Standard Session */}
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border-2 border-indigo-200 p-6 hover:-translate-y-1 transition-transform duration-300 relative">
              <div className="absolute top-3 right-3">
                <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full">Recommended</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Standard</h3>
                  <p className="text-xs text-gray-500">10 Questions</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">Balanced session for steady progress and skill building</p>
              <div className="text-xs text-gray-500 mb-4">⏱️ ~15-20 minutes</div>
              <Button
                onClick={() => startPracticeSession(10)}
                disabled={sessionStarting}
                className="w-full"
              >
                {sessionStarting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    <PlayCircle size={16} className="mr-2" />
                    Start Standard Session
                  </>
                )}
              </Button>
            </div>

            {/* Extended Session */}
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 p-6 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Extended</h3>
                  <p className="text-xs text-gray-500">15 Questions</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">Deep practice session for maximum learning impact</p>
              <div className="text-xs text-gray-500 mb-4">⏱️ ~25-30 minutes</div>
              <Button
                onClick={() => startPracticeSession(15)}
                disabled={sessionStarting}
                className="w-full"
              >
                {sessionStarting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    <PlayCircle size={16} className="mr-2" />
                    Start Extended Session
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Practice Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Practice consistently for best results - even 5 minutes daily helps!</li>
            <li>Review wrong answers to understand your mistakes</li>
            <li>Focus on understanding concepts, not just getting answers right</li>
            <li>Take breaks between sessions to avoid fatigue</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
