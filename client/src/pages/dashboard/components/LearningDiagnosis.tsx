import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { AlertCircle, Brain, RefreshCw } from 'lucide-react';

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

const COLORS = ['#F87171', '#FBBF24', '#60A5FA', '#818CF8'];

export function LearningDiagnosis({ diagnosis }: DiagnosisProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* 1. Mastery Heatmap - Simplified as a List for now */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
           <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Brain size={20} /></div>
           <h3 className="text-lg font-bold text-gray-900">Topic Mastery</h3>
        </div>
        <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
           {diagnosis.mastery.topicMap.map((topic) => (
             <div key={topic.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${topic.score >= 90 ? 'bg-green-500' : topic.score >= 70 ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                   <span className="text-sm font-medium text-gray-700">{topic.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{topic.score}%</span>
                    <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                       <div className="bg-indigo-500 h-full" style={{ width: `${topic.score}%` }}></div>
                    </div>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* 2. Error Intelligence (Pie Chart) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
           <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertCircle size={20} /></div>
           <h3 className="text-lg font-bold text-gray-900">Why are you losing marks?</h3>
        </div>
        <div className="h-[200px] w-full flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                   <Pie
                      data={diagnosis.errorIntelligence.breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="percentage"
                   >
                      {diagnosis.errorIntelligence.breakdown.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                   </Pie>
                   <RechartsTooltip />
                </PieChart>
             </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
           {diagnosis.errorIntelligence.breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1 text-xs text-gray-500">
                 <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }}></span>
                 {item.type} ({item.percentage}%)
              </div>
           ))}
        </div>
      </div>

       {/* 3. Retention & Decay */}
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><RefreshCw size={20} /></div>
              <h3 className="text-lg font-bold text-gray-900">Retention Health</h3>
           </div>
           <p className="text-sm text-gray-500 mb-6">Your memory decay analysis based on spaced repetition.</p>
           
           <div className="text-center mb-6">
              <span className="text-4xl font-bold text-gray-900">{diagnosis.retention.retentionScore}%</span>
              <p className="text-xs text-uppercase font-bold tracking-wide text-gray-400 mt-1">RETENTION SCORE</p>
           </div>
        </div>

        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
             <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-orange-800">Critical Revision</span>
                <span className="bg-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded-full font-bold">{diagnosis.retention.decayRiskItems} Topics</span>
             </div>
             <p className="text-xs text-orange-700">
                {diagnosis.retention.decayRiskItems} topics are at risk of being forgotten. Revise them today to boost your score.
             </p>
        </div>
      </div>

    </div>
  );
}
