import React from 'react';
import { Target, Zap, Activity, TrendingUp } from 'lucide-react';
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
    };
  };
}

export function AtAGlanceMetrics({ performance }: MetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Accuracy Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <Target size={48} className="text-indigo-600" />
        </div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Overall Accuracy</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">{performance.accuracy.overall}%</h3>
          </div>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {performance.accuracy.trend} <TrendingUp size={12} className="ml-1" />
          </span>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="flex-1 bg-green-50 rounded p-1 text-center border border-green-100">
             <span className="block font-semibold text-green-700">{performance.accuracy.byDifficulty.easy}%</span>
             <span className="text-gray-500">Easy</span>
          </div>
          <div className="flex-1 bg-yellow-50 rounded p-1 text-center border border-yellow-100">
             <span className="block font-semibold text-yellow-700">{performance.accuracy.byDifficulty.medium}%</span>
             <span className="text-gray-500">Med</span>
          </div>
          <div className="flex-1 bg-red-50 rounded p-1 text-center border border-red-100">
             <span className="block font-semibold text-red-700">{performance.accuracy.byDifficulty.hard}%</span>
             <span className="text-gray-500">Hard</span>
          </div>
        </div>
      </div>

      {/* Speed Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <Zap size={48} className="text-yellow-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Avg Time / Q</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-1">{performance.speed.avgTimePerQuestion}s</h3>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            <span className={cn("font-medium", performance.speed.idealTimeDifference < 0 ? "text-green-600" : "text-red-600")}>
               {Math.abs(performance.speed.idealTimeDifference)}s {performance.speed.idealTimeDifference < 0 ? 'faster' : 'slower'}
            </span> than ideal
          </p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
             <div className="bg-yellow-500 h-full rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>
      </div>

       {/* Consistency Card */}
       <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <Activity size={48} className="text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Consistency Score</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-1">{performance.consistency.score}</h3>
        </div>
        <div className="mt-4 flex items-center justify-between">
           <div>
               <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Current Streak</p>
               <p className="text-lg font-bold text-gray-800">{performance.consistency.currentStreak} Days 🔥</p>
           </div>
           {/* Visual Streak Dots */}
           <div className="flex gap-1">
              {[1,2,3,4,5].map(day => (
                  <div key={day} className={cn("w-2 h-6 rounded-sm", day <= performance.consistency.currentStreak ? "bg-blue-500" : "bg-gray-200")}></div>
              ))}
           </div>
        </div>
      </div>

       {/* Mastery Overview */}
       <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg border border-indigo-500 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 p-4 opacity-20">
           <Target size={48} className="text-white" />
        </div>
        <div>
           <p className="text-indigo-100 text-sm font-medium">Concept Mastery</p>
           <h3 className="text-3xl font-bold mt-1">4/20</h3>
           <p className="text-sm text-indigo-100 mt-1">Modules Mastered</p>
        </div>
        <div className="mt-4 bg-indigo-800/50 rounded-lg p-2 flex items-center justify-between">
            <span className="text-xs font-medium">Next Milestone: 5</span>
            <div className="w-16 h-16 relative flex items-center justify-center">
                 <svg className="transform -rotate-90 w-12 h-12">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-800" />
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white" strokeDasharray={125} strokeDashoffset={125 - (125 * 0.8)} />
                 </svg>
                 <span className="absolute text-xs font-bold">80%</span>
            </div>
        </div>
      </div>

    </div>
  );
}
