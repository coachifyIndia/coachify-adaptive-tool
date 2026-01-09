import { useState, useEffect } from 'react';
import { practiceService } from '../../services/practice.service';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

interface ModuleData {
  id: number;
  name: string;
  description: string;
  question_count: number;
  micro_skill_count: number;
  micro_skills: { id: number; name: string; count: number }[];
}

// ... (removed stray code)

export default function PracticeModulesPage() {
  const navigate = useNavigate();
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [startingSession, setStartingSession] = useState(false);
  const [activeTab, setActiveTab] = useState<'practice' | 'adaptive'>('practice');
  const [drillStatus, setDrillStatus] = useState<{ [key: number]: any }>({});

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await practiceService.getModules();
      if (response.success) {
        setModules(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch modules', error);
         // Fallback data for dev/when backend is down
      const dummyModules = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Module ${i + 1}`,
        description: `Practice sets for Module ${i + 1}`,
        question_count: 50,
        micro_skill_count: 4,
        micro_skills: [
            { id: 1, name: 'Micro-skill 1', count: 30 },
            { id: 2, name: 'Micro-skill 2', count: 20 },
            { id: 3, name: 'Micro-skill 3', count: 40 },
            { id: 4, name: 'Micro-skill 4', count: 10 }
        ]
      }));
      setModules(dummyModules);
    } finally {
      setLoading(false);
    }
  };

  const startSet = async (moduleId: number, setSize: number) => {
    setStartingSession(true);
    try {
      const response = await practiceService.startSession({
        session_size: setSize,
        focus_modules: [moduleId]
      });
      navigate(`/practice/session/${response.data.session.session_id}`, {
        state: { initialData: response.data }
      });
    } catch (error: any) {
      if (error.response?.data?.error === 'ACTIVE_SESSION_EXISTS') {
        const activeSessionId = error.response.data.data.active_session_id;
        navigate(`/practice/session/${activeSessionId}`);
      } else {
        alert('Failed to start session. Please try again.');
      }
    } finally {
      setStartingSession(false);
    }
  };
  
  const fetchDrillStatus = async (moduleId: number) => {
    try {
      const response = await practiceService.getDrillStatus(moduleId);
      if (response.success) {
        setDrillStatus((prev) => ({ ...prev, [moduleId]: response.data.drills }));
      }
    } catch (error) {
      console.error('Failed to fetch drill status', error);
    }
  };

  const handleModuleExpand = (moduleId: number) => {
    const newExpandedModule = expandedModule === moduleId ? null : moduleId;
    setExpandedModule(newExpandedModule);

    // Fetch drill status when expanding for adaptive tab
    if (newExpandedModule && activeTab === 'adaptive' && !drillStatus[moduleId]) {
      fetchDrillStatus(moduleId);
    }
  };

  // Fetch drill status when switching to adaptive tab
  useEffect(() => {
    if (activeTab === 'adaptive' && expandedModule && !drillStatus[expandedModule]) {
      fetchDrillStatus(expandedModule);
    }
  }, [activeTab, expandedModule]);

  const startAdaptiveDrill = async (moduleId: number, drillNumber: number) => {
    setStartingSession(true);
    try {
      const response = await practiceService.startAdaptiveDrill(moduleId, drillNumber);
      navigate(`/practice/session/${response.data.session.session_id}`, {
        state: { initialData: response.data }
      });
    } catch (error: any) {
      console.error('Failed to start drill', error);
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else if (error.response?.data?.error === 'ACTIVE_SESSION_EXISTS') {
        const activeSessionId = error.response.data.data.active_session_id;
        navigate(`/practice/session/${activeSessionId}`);
      } else {
        alert('Failed to start adaptive drill. Please try again.');
      }
    } finally {
      setStartingSession(false);
      // Refresh drill status after completing
      fetchDrillStatus(moduleId);
    }
  };

  const handleResetDrills = async (moduleId: number) => {
// @TODO: Shadcn se alert dalna hai
      try {
        console.log('Resetting drills for module:', moduleId);
        const response = await practiceService.resetDrillProgress(moduleId);
        console.log('Reset response:', response);
        // Refresh drill status
        await fetchDrillStatus(moduleId);
      } catch (error: any) {
        console.error('Failed to reset drills', error);
      }
    
  };

  return (
    <div className="py-10 bg-gray-50 min-h-[calc(100vh-64px)]">
      <header>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
            Practice Modules
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Master your skills with practice sets and adaptive drills.
          </p>
          
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('practice')}
                className={cn(
                  activeTab === 'practice'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                )}
              >
                Practice Questions
              </button>
              <button
                onClick={() => setActiveTab('adaptive')}
                className={cn(
                  activeTab === 'adaptive'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                )}
              >
                Adaptive Drills
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl sm:px-6 lg:px-8 mt-8">
        {loading ? (
          <div className="text-center py-12">Loading modules...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 px-4 sm:px-0">
            {modules.map((module) => (
              <div 
                key={module.id} 
                className="bg-white overflow-hidden shadow rounded-lg border border-gray-200"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{module.name}</h3>
                      <p className="text-sm text-gray-500">{module.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => handleModuleExpand(module.id)}
                    >
                      {expandedModule === module.id ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>

                  {expandedModule === module.id && (
                    <div className="mt-6 border-t border-gray-100 pt-6">
                      
                      {activeTab === 'practice' ? (
                        <div className="space-y-6">
                            {module.micro_skills?.length ? (
                              module.micro_skills.map((ms, idx) => {
                                 const setBytes = Math.ceil((ms.count || 0) / 10) || 1; 
                                 const sets = Array.from({ length: setBytes }, (_, i) => i + 1);
                                 
                                 return (
                                <div key={idx} className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="font-medium text-gray-900 mb-3">{ms.name} <span className="text-xs text-gray-500 font-normal">({ms.count} questions)</span></h4>
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    {sets.map((setNum) => (
                                      <div key={setNum} className="bg-white p-3 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
                                        <div className="mb-2">
                                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Set {setNum}</span>
                                          <p className="text-sm text-gray-900">{setNum === sets.length && ms.count % 10 !== 0 ? ms.count % 10 : 10} Questions</p>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="w-full text-xs"
                                          onClick={() => startSet(module.id, 10)}
                                          disabled={startingSession}
                                        >
                                          Start
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                              })
                           ) : (
                               <div className="text-gray-500 text-sm italic">No micro-skills data available.</div>
                           )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                           <div className="bg-blue-50 p-4 rounded-md mb-4 flex justify-between items-center">
                              <p className="text-sm text-blue-700">Adaptive Drills generate personalised questions based on your weak areas.</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleResetDrills(module.id)}
                              >
                                Reset Progress
                              </Button>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                              {(drillStatus[module.id] || [1, 2, 3, 4, 5].map(num => ({
                                drill_number: num,
                                completed: false,
                                locked: num > 1,
                                status: 'not_started',
                                accuracy: null
                              }))).map((drill: any) => {
                                const drillNum = drill.drill_number;

                                // Determine background color based on status
                                let bgColor = "bg-white border-indigo-200 shadow-sm";
                                let badgeColor = "bg-indigo-100 text-indigo-700";
                                let statusText = "Ready to start";

                                if (drill.locked) {
                                  bgColor = "bg-gray-50 border-gray-200 opacity-60";
                                  badgeColor = "bg-gray-200 text-gray-500";
                                  statusText = "Locked";
                                } else if (drill.completed) {
                                  if (drill.status === 'excellent') {
                                    bgColor = "bg-green-50 border-green-300 shadow-sm";
                                    badgeColor = "bg-green-100 text-green-700";
                                    statusText = `${drill.accuracy}% ✓`;
                                  } else if (drill.status === 'needs_improvement') {
                                    bgColor = "bg-orange-50 border-orange-300 shadow-sm";
                                    badgeColor = "bg-orange-100 text-orange-700";
                                    statusText = `${drill.accuracy}%`;
                                  } else if (drill.status === 'poor') {
                                    bgColor = "bg-red-100 border-red-300 shadow-sm";
                                    badgeColor = "bg-red-200 text-red-800";
                                    statusText = `${drill.accuracy}%`;
                                  }
                                }

                                return (
                                  <div key={drillNum} className={cn(
                                      "p-4 rounded-lg border flex flex-col items-center justify-center text-center space-y-3",
                                      bgColor
                                  )}>
                                      <div className={cn(
                                          "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
                                          badgeColor
                                      )}>
                                          {drillNum}
                                      </div>
                                      <div>
                                          <h4 className="text-sm font-medium text-gray-900">Adaptive Drill {drillNum}</h4>
                                          <p className="text-xs text-gray-500">{statusText}</p>
                                      </div>
                                      <Button
                                          size="sm"
                                          variant={drill.completed ? 'outline' : 'default'}
                                          disabled={drill.locked || startingSession}
                                          onClick={() => {
                                            if (drill.completed && drill.last_session_id) {
                                                navigate(`/practice/drill/${drill.last_session_id}/summary`);
                                            } else {
                                                startAdaptiveDrill(module.id, drillNum);
                                            }
                                          }}
                                      >
                                          {drill.locked ? 'Locked' : drill.completed ? 'View Results' : 'Start Drill'}
                                      </Button>
                                  </div>
                                );
                              })}
                           </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
