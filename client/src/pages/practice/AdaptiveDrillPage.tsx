import { useState, useEffect } from 'react';
import { practiceService } from '../../services/practice.service';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { ArrowLeft } from 'lucide-react';

interface ModuleData {
  id: number;
  name: string;
  description: string;
  question_count: number;
  micro_skill_count: number;
  micro_skills: { id: number; name: string; count: number }[];
}

export default function AdaptiveDrillPage() {
  const navigate = useNavigate();
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [startingSession, setStartingSession] = useState(false);
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
    } finally {
      setLoading(false);
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

    // Fetch drill status when expanding
    if (newExpandedModule && !drillStatus[moduleId]) {
      fetchDrillStatus(moduleId);
    }
  };

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
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <Button
              variant="ghost"
              className="pl-0 gap-2 text-gray-600 hover:text-indigo-600 hover:bg-transparent transition-colors"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft size={20} /> <span className="font-medium">Back to Dashboard</span>
            </Button>
            <div className="text-right">
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
                Adaptive Drills
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Progressive drills that adapt to your skill level
              </p>
            </div>
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
