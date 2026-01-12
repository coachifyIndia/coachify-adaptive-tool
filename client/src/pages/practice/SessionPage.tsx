import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { practiceService } from '../../services/practice.service';
import type { Question, EndSessionResponse } from '../../services/practice.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface Feedback {
  is_correct: boolean;
  points_earned: number;
  feedback: {
    explanation: string;
    solution_steps?: string[];
    correct_answer?: string;
  };
  next_question: Question | null;
}

type SessionSummary = EndSessionResponse['data']['session_summary'];

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // State
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(Date.now());

  // Initialize
  useEffect(() => {
    if (location.state?.initialData) {
      setCurrentQuestion(location.state.initialData.first_question);
      setLoading(false);
      setStartTime(Date.now());
    } else if (sessionId) {
      // Fetch session details if refreshed (implementation omitted for brevity in MVP plan, but good to handle)
      // For now, assume flow starts from Dashboard.
       // logic to fetch session...
       setLoading(false); 
    }
  }, [sessionId, location.state]);

  const handleSubmit = async () => {
    if (!sessionId || !currentQuestion) return;
    
    setIsSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const response = await practiceService.submitAnswer({
        session_id: sessionId,
        question_id: currentQuestion.question_id,
        user_answer: userAnswer,
        time_spent_seconds: timeSpent,
      });

      setFeedback(response.data);
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (feedback?.next_question) {
      setCurrentQuestion(feedback.next_question);
      setUserAnswer('');
      setFeedback(null);
      setStartTime(Date.now());
    } else {
      // Session complete
      handleEndSession();
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      const response = await practiceService.endSession(sessionId);
      setSessionSummary(response.data.session_summary);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  if (sessionSummary) {
    const accuracy = Math.round(sessionSummary.accuracy);
    const confidenceMetrics = sessionSummary.confidence_metrics;

    return (
      <div className="min-h-screen bg-[#F8F9FC] py-8 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Complete! 🎉</h1>
            <p className="text-gray-600">Great job! Here's how you performed.</p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Score Card */}
            <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-16 h-16 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-2">Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-gray-900">{sessionSummary.questions_correct}</span>
                <span className="text-lg text-gray-400">/</span>
                <span className="text-2xl text-gray-500">{sessionSummary.questions_attempted}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Questions Correct</p>
            </div>

            {/* Accuracy Card */}
            <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className={`w-16 h-16 ${accuracy >= 80 ? 'text-green-600' : accuracy >= 50 ? 'text-orange-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Accuracy</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-extrabold ${accuracy >= 80 ? 'text-green-600' : accuracy >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                  {accuracy}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                <div 
                  className={`h-1.5 rounded-full ${accuracy >= 80 ? 'bg-green-500' : accuracy >= 50 ? 'bg-orange-500' : 'bg-red-500'}`} 
                  style={{ width: `${accuracy}%` }}
                ></div>
              </div>
            </div>

            {/* Points Card */}
            <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-16 h-16 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Points</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-gray-900">{sessionSummary.points_earned}</span>
                <span className="text-sm text-gray-500">pts</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Earned this session</p>
            </div>
          </div>

          {/* Confidence Metrics Section */}
          {confidenceMetrics && (
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Confidence Insights</h2>
                    <p className="text-sm text-gray-600">How confident were you in your answers?</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Average Confidence */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Average Confidence</span>
                    <span className={`text-2xl font-bold ${
                      confidenceMetrics.avg_confidence >= 80 ? 'text-green-600' : 
                      confidenceMetrics.avg_confidence >= 50 ? 'text-orange-500' : 
                      'text-red-500'
                    }`}>
                      {Math.round(confidenceMetrics.avg_confidence)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        confidenceMetrics.avg_confidence >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                        confidenceMetrics.avg_confidence >= 50 ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 
                        'bg-gradient-to-r from-red-400 to-red-600'
                      }`}
                      style={{ width: `${confidenceMetrics.avg_confidence}%` }}
                    ></div>
                  </div>
                </div>

                {/* Confidence Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  {/* High Confidence */}
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">High</p>
                        <p className="text-xs text-green-600">&gt;80% confident</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-green-700">{confidenceMetrics.high_confidence_count}</span>
                      <span className="text-sm text-green-600">questions</span>
                    </div>
                  </div>

                  {/* Medium Confidence */}
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Medium</p>
                        <p className="text-xs text-orange-600">50-80% confident</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-orange-700">{confidenceMetrics.medium_confidence_count}</span>
                      <span className="text-sm text-orange-600">questions</span>
                    </div>
                  </div>

                  {/* Low Confidence */}
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Low</p>
                        <p className="text-xs text-red-600">&lt;50% confident</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-red-700">{confidenceMetrics.low_confidence_count}</span>
                      <span className="text-sm text-red-600">questions</span>
                    </div>
                  </div>
                </div>

                {/* Insight Message */}
                {confidenceMetrics.low_confidence_count > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">Practice Tip</p>
                      <p className="text-sm text-blue-700 mt-1">
                        You had {confidenceMetrics.low_confidence_count} question(s) with low confidence. 
                        Consider reviewing these topics to strengthen your understanding.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center pt-4">
            <Button 
              className="px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all" 
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !currentQuestion) {
    return <div className="p-10 text-center">Loading question...</div>;
  }

  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Module and Micro-skill Header */}
        {(currentQuestion.module_name || currentQuestion.micro_skill_name) && (
          <div className="px-6 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
            <div className="flex items-center gap-2 text-sm">
              {currentQuestion.module_name && (
                <span className="font-semibold text-indigo-700">{currentQuestion.module_name}</span>
              )}
              {currentQuestion.module_name && currentQuestion.micro_skill_name && (
                <span className="text-gray-400">›</span>
              )}
              {currentQuestion.micro_skill_name && (
                <span className="text-indigo-600">{currentQuestion.micro_skill_name}</span>
              )}
            </div>
          </div>
        )}

        <div className="p-6 border-b border-gray-200">
          <span className="text-sm font-medium text-indigo-600">Question</span>
          <h3 className="text-lg font-medium mt-2">
            {currentQuestion.text}
          </h3>
          <p className="text-xs text-gray-400 mt-1">Difficulty: {currentQuestion.difficulty_level}</p>
        </div>

        <div className="p-6 space-y-4">
          {!feedback ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
              {currentQuestion.type === 'mcq' && currentQuestion.options ? (
                <div className="space-y-2">
                   {currentQuestion.options.map((opt: string, idx: number) => (
                     <div key={idx} className="flex items-center">
                       <input
                         type="radio"
                         name="mcq"
                         id={`opt-${idx}`}
                         value={String.fromCharCode(65 + idx)} // A, B, C...
                         checked={userAnswer === String.fromCharCode(65 + idx)}
                         onChange={(e) => setUserAnswer(e.target.value)}
                         className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                       />
                       <label htmlFor={`opt-${idx}`} className="ml-3 block text-sm font-medium text-gray-700">
                         {opt}
                       </label>
                     </div>
                   ))}
                </div>
              ) : (
                <Input
                  placeholder="Enter your answer"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                />
              )}
              
              <Button type="submit" disabled={isSubmitting || !userAnswer} className="w-full">
                {isSubmitting ? 'Submitting...' : 'Submit Answer'}
              </Button>
            </form>
          ) : (
            <div className={`p-4 rounded-md ${feedback.is_correct ? 'bg-green-50' : 'bg-red-50'}`}>
              <h4 className={`text-lg font-bold ${feedback.is_correct ? 'text-green-800' : 'text-red-800'}`}>
                {feedback.is_correct ? 'Correct!' : 'Incorrect'}
              </h4>
              <p className="mt-2 text-sm text-gray-700">
                {feedback.feedback.explanation}
              </p>
              <div className="mt-4">
                <Button onClick={handleNext}>
                  {feedback.next_question ? 'Next Question' : 'View Summary'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
