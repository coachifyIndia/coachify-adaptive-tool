import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { practiceService } from '../../services/practice.service';
import type { Question } from '../../services/practice.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
// Removed Card import as we are using divs per previous decision

// A simple internal Card component since we didn't create one fully earlier
// Or we can just use divs. Let's use divs for speed if Card isn't ready.
// Actually I check list, I only created Button and Input. I'll use standard Tailwind divs.

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // State
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<any>(null);
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
    return (
      <div className="container mx-auto max-w-2xl py-10 px-4">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Session Complete!</h2>
          <div className="space-y-2">
            <p>Score: {sessionSummary.questions_correct} / {sessionSummary.questions_attempted}</p>
            <p>Accuracy: {sessionSummary.accuracy}%</p>
            <p>Points Earned: {sessionSummary.points_earned}</p>
          </div>
          <Button className="mt-6" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
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
