import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { practiceService } from '../../services/practice.service';
import { Button } from '../../components/ui/Button';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Target, 
  Zap,
  BarChart2
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface DrillSummary {
  session_metrics: {
    total_score: number;
    accuracy: number;
    correct_answers: number;
    total_questions: number;
    avg_time: number;
    micro_skills_covered: number[];
  };
  questions: Array<{
    question_id: string;
    micro_skill_id: number;
    micro_skill_name: string;
    is_correct: boolean;
    time_taken_seconds: number;
    expected_time_seconds: number;
    user_answer: any;
    question_text: string;
    confidence_score?: number; // 0-1 scale
  }>;
  duration_seconds: number;
}

export default function AdaptiveDrillSummaryPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DrillSummary | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails(sessionId);
    }
  }, [sessionId]);

  const fetchSessionDetails = async (id: string) => {
    try {
      const response = await practiceService.getSession(id);
      if (response.success && response.data.session) {
        setSummary(response.data.session as DrillSummary);
      }
    } catch (error) {
      console.error('Failed to fetch session details', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-indigo-200 rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Summary not found</h2>
        <Button onClick={() => navigate('/practice')}>Return to Practice</Button>
      </div>
    );
  }

  const accuracy = Math.round(summary.session_metrics.accuracy * 100);
  const uniqueMicroSkills = [...new Set(summary.questions.map(q => q.micro_skill_name))];

  return (
    <div className="min-h-screen bg-[#F8F9FC] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
           <Button 
            variant="ghost" 
            className="pl-0 gap-2 text-gray-600 hover:text-indigo-600 hover:bg-transparent transition-colors" 
            onClick={() => navigate('/practice')}
           >
              <ArrowLeft size={20} /> <span className="font-medium">Back to Drills</span>
           </Button>
           <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Session Summary</h1>
              <p className="text-sm text-gray-500">Adaptive Drill Assessment</p>
           </div>
        </div>

        {/* Hero Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {/* Score Card */}
           <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target size={64} className="text-indigo-600" />
              </div>
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-2">Total Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-gray-900">{summary.session_metrics.total_score}</span>
                <span className="text-sm text-gray-500">pts</span>
              </div>
           </div>

           {/* Accuracy Card */}
           <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <BarChart2 size={64} className={accuracy >= 80 ? 'text-green-600' : accuracy >= 50 ? 'text-orange-500' : 'text-red-500'} />
              </div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Accuracy</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-4xl font-extrabold", accuracy >= 80 ? 'text-green-600' : accuracy >= 50 ? 'text-orange-500' : 'text-red-500')}>
                    {accuracy}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                  <div className={cn("h-1.5 rounded-full", accuracy >= 80 ? 'bg-green-500' : accuracy >= 50 ? 'bg-orange-500' : 'bg-red-500')} style={{ width: `${accuracy}%` }}></div>
              </div>
           </div>

           {/* Speed Card */}
           <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock size={64} className="text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Avg Speed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-gray-900">{Math.round(summary.session_metrics.avg_time)}</span>
                <span className="text-sm text-gray-500">sec/q</span>
              </div>
           </div>

           {/* Skills Card */}
           <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap size={64} className="text-purple-500" />
              </div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Skills Covered</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-gray-900">{uniqueMicroSkills.length}</span>
                <span className="text-sm text-gray-500">Micro-skills</span>
              </div>
              <div className="flex gap-1 mt-3 flex-wrap">
                  {uniqueMicroSkills.slice(0, 3).map((skill, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 bg-purple-50 text-purple-700 rounded-full font-medium border border-purple-100">{skill}</span>
                  ))}
                  {uniqueMicroSkills.length > 3 && <span className="text-[10px] px-2 py-1 bg-gray-50 text-gray-500 rounded-full">+{uniqueMicroSkills.length - 3} more</span>}
              </div>
           </div>
        </div>

        {/* Micro-skill Performance Breakdown */}
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 overflow-hidden">
             <div className="px-8 py-6 border-b border-gray-100">
               <h2 className="text-xl font-bold text-gray-900">Micro-skill Performance</h2>
               <p className="text-sm text-gray-500 mt-1">Breakdown of your accuracy and speed by skill</p>
             </div>
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                     <th scope="col" className="px-8 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Micro-skill</th>
                     <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                     <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                     <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                     <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Incorrect</th>
                     <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {Object.entries(
                     summary.questions.reduce((acc, q) => {
                       if (!acc[q.micro_skill_name]) {
                         acc[q.micro_skill_name] = { total: 0, correct: 0, time: 0 };
                       }
                       acc[q.micro_skill_name].total++;
                       if (q.is_correct) acc[q.micro_skill_name].correct++;
                       acc[q.micro_skill_name].time += q.time_taken_seconds;
                       return acc;
                     }, {} as Record<string, { total: number; correct: number; time: number }>)
                   ).map(([skill, stats], idx) => {
                      const accuracy = Math.round((stats.correct / stats.total) * 100);
                      return (
                       <tr key={idx} className="hover:bg-gray-50 transition-colors">
                         <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{skill}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{stats.total}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-center">
                           <span className={cn(
                             "px-2 py-1 rounded-full text-xs font-semibold",
                             accuracy >= 80 ? "bg-green-100 text-green-800" :
                             accuracy >= 50 ? "bg-yellow-100 text-yellow-800" :
                             "bg-red-100 text-red-800"
                           )}>
                             {accuracy}%
                           </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-center font-medium">{stats.correct}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-center font-medium">{stats.total - stats.correct}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{Math.round(stats.time / stats.total)}s</td>
                       </tr>
                      );
                   })}
                 </tbody>
               </table>
             </div>
        </div>

        {/* Confidence Insights Section */}
        {(() => {
          // Calculate confidence metrics from questions
          const confidenceScores = summary.questions
            .filter(q => q.confidence_score !== undefined)
            .map(q => (q.confidence_score || 0) * 100); // Convert to percentage

          if (confidenceScores.length === 0) return null;

          const avgConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
          const highConfidenceCount = confidenceScores.filter(score => score > 80).length;
          const mediumConfidenceCount = confidenceScores.filter(score => score >= 50 && score <= 80).length;
          const lowConfidenceCount = confidenceScores.filter(score => score < 50).length;

          return (
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
                      avgConfidence >= 80 ? 'text-green-600' : 
                      avgConfidence >= 50 ? 'text-orange-500' : 
                      'text-red-500'
                    }`}>
                      {Math.round(avgConfidence)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        avgConfidence >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                        avgConfidence >= 50 ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 
                        'bg-gradient-to-r from-red-400 to-red-600'
                      }`}
                      style={{ width: `${avgConfidence}%` }}
                    ></div>
                  </div>
                </div>

                {/* Confidence Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  {/* High Confidence */}
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">High</p>
                        <p className="text-xs text-green-600">&gt;80% confident</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-green-700">{highConfidenceCount}</span>
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
                      <span className="text-3xl font-bold text-orange-700">{mediumConfidenceCount}</span>
                      <span className="text-sm text-orange-600">questions</span>
                    </div>
                  </div>

                  {/* Low Confidence */}
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Low</p>
                        <p className="text-xs text-red-600">&lt;50% confident</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-red-700">{lowConfidenceCount}</span>
                      <span className="text-sm text-red-600">questions</span>
                    </div>
                  </div>
                </div>

                {/* Insight Message */}
                {lowConfidenceCount > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">Practice Tip</p>
                      <p className="text-sm text-blue-700 mt-1">
                        You had {lowConfidenceCount} question(s) with low confidence. 
                        Consider reviewing these topics to strengthen your understanding.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Detailed Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white">
              <div>
                  <h2 className="text-xl font-bold text-gray-900">Performance Breakdown</h2>
                  <p className="text-sm text-gray-500 mt-1">Detailed analysis of every question attempted</p>
              </div>
              <div className="flex gap-6 text-sm font-medium">
                 <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg text-green-700 border border-green-100">
                    <CheckCircle2 size={18} />
                    <span>{summary.session_metrics.correct_answers} Correct</span>
                 </div>
                 <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg text-red-700 border border-red-100">
                    <XCircle size={18} />
                    <span>{summary.questions.length - summary.session_metrics.correct_answers} Incorrect</span>
                 </div>
              </div>
           </div>

           <div className="divide-y divide-gray-100">
              {summary.questions.map((q, index) => (
                 <div key={index} className="px-8 py-6 hover:bg-[#FAFAFA] transition-all duration-200 group">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Status Icon */}
                        <div className="flex-shrink-0 pt-1">
                            {q.is_correct ? (
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm ring-4 ring-green-50">
                                    <CheckCircle2 size={20} className="stroke-[3]" />
                                </div>
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-sm ring-4 ring-red-50">
                                    <XCircle size={20} className="stroke-[3]" />
                                </div>
                            )}
                        </div>

                        <div className="flex-grow">
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                <span className="text-sm font-semibold text-gray-400">Q{index + 1}</span>
                                <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    {q.micro_skill_name}
                                </span>
                                {q.time_taken_seconds < q.expected_time_seconds / 2 && q.is_correct && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                        <TrendingUp size={12} /> Fast
                                    </span>
                                )}
                            </div>
                            
                            <p className="text-gray-900 text-lg font-medium leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: q.question_text }}></p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 flex items-center gap-2"><Clock size={16} /> Time Taken</span>
                                    <span className={cn("font-semibold", 
                                        q.time_taken_seconds > q.expected_time_seconds ? "text-red-600" : "text-green-600"
                                    )}>
                                        {q.time_taken_seconds}s <span className="text-gray-400 font-normal text-xs">/ {q.expected_time_seconds}s expected</span>
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Difficulty Level</span>
                                    <div className="flex gap-1">
                                        {[1,2,3].map((lvl) => (
                                            <div key={lvl} className={cn("h-1.5 w-6 rounded-full", 
                                                lvl <= (q as any).difficulty ? "bg-indigo-500" : "bg-gray-200"
                                            )}></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
}
