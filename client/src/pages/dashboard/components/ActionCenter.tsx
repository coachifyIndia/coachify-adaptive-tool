import React from 'react';
import { ArrowRight, Lightbulb, Shield, TrendingUp } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Next Best Action - Prominent Call to Action */}
      <div className="lg:col-span-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex-1">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-3 backdrop-blur-sm border border-white/10">
                 🎯 RECOMMENDED FOR YOU
              </span>
              <h2 className="text-2xl font-bold mb-2">{adaptivity.nextBestAction.title}</h2>
              <p className="text-indigo-100 mb-4 text-sm leading-relaxed max-w-lg">
                 {adaptivity.nextBestAction.reason}
              </p>
              <div className="flex items-center gap-4 text-sm font-medium bg-black/20 w-fit px-4 py-2 rounded-lg backdrop-blur-sm">
                 <TrendingUp size={16} className="text-green-400" />
                 <span>Expected Gain: <span className="text-green-300">{adaptivity.nextBestAction.predictedImprovement}</span></span>
              </div>
           </div>
           
           <div className="flex-shrink-0">
               <Button 
                 onClick={onStartSession}
                 disabled={loading}
                 className="bg-white text-indigo-700 hover:bg-gray-50 border-none shadow-xl px-8 py-6 text-lg font-bold"
               >
                 {loading ? 'Loading...' : 'Start Practice'} <ArrowRight className="ml-2" />
               </Button>
           </div>
        </div>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl"></div>
      </div>

      {/* Strength/Weakness Summary */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
             <Shield size={20} className="text-gray-400" /> Focus Areas
          </h3>
          
          <div className="space-y-4">
             <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Needs Attention</p>
                <div className="flex flex-wrap gap-2">
                   {adaptivity.strengthRadar.weak.map((topic, i) => (
                      <span key={i} className="px-2 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded border border-red-100">
                         {topic}
                      </span>
                   ))}
                   {adaptivity.strengthRadar.danger.map((topic, i) => (
                      <span key={i} className="px-2 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded border border-orange-100 flex items-center gap-1">
                         <AlertIcon /> {topic}
                      </span>
                   ))}
                </div>
             </div>
             
             <div className="pt-2 border-t border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Strong Topics</p>
                <div className="flex flex-wrap gap-2">
                   {adaptivity.strengthRadar.strong.map((topic, i) => (
                      <span key={i} className="px-2 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded border border-green-100">
                         {topic}
                      </span>
                   ))}
                </div>
             </div>
          </div>
      </div>
    </div>
  );
}

const AlertIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);
