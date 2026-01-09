import { useState, useEffect } from 'react';
import { practiceService } from '../../services/practice.service';
import type { Question } from '../../services/practice.service';
import { Button } from '../../components/ui/Button';
import { Search, Filter, Clock, BarChart2, BookOpen } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Module {
  id: number;
  name: string;
  description: string;
  micro_skills: MicroSkill[];
}

interface MicroSkill {
  id: number;
  name: string;
}

export default function QuestionExplorerPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Filters
  const [selectedModuleId, setSelectedModuleId] = useState<number | ''>('');
  const [selectedMicroSkillId, setSelectedMicroSkillId] = useState<number | ''>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | ''>('');

  useEffect(() => {
    fetchModules();
  }, []);

  // Reset micro-skill when module changes
  useEffect(() => {
    setSelectedMicroSkillId('');
  }, [selectedModuleId]);

  const fetchModules = async () => {
    try {
      const response = await practiceService.getModules();
      if (response.success) {
        setModules(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch modules', error);
    }
  };

  const handleSearch = async (newPage = 1) => {
    setLoading(true);
    try {
      const filters: any = {
        page: newPage,
        limit
      };

      if (selectedModuleId) filters.moduleId = selectedModuleId;
      if (selectedMicroSkillId) filters.microSkillId = selectedMicroSkillId;
      if (selectedDifficulty) filters.difficulty = selectedDifficulty;

      const response = await practiceService.getQuestionsExplorer(filters);
      if (response.success) {
        setQuestions(response.data.questions);
        setTotal(response.data.pagination.total);
        setPage(newPage);
      }
    } catch (error) {
      console.error('Failed to fetch questions', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedModule = () => {
    return modules.find(m => m.id === Number(selectedModuleId));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Question Explorer</h1>
          <p className="text-gray-500 mt-2">Browse the entire question bank. Filter by module, skill, and difficulty to inspect content.</p>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-indigo-50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            
            {/* Module Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
              <select
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">All Modules</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>{module.name}</option>
                ))}
              </select>
            </div>

            {/* Micro-skill Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Micro-skill</label>
              <select
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={selectedMicroSkillId}
                onChange={(e) => setSelectedMicroSkillId(e.target.value ? Number(e.target.value) : '')}
                disabled={!selectedModuleId}
              >
                <option value="">All Skills</option>
                {getSelectedModule()?.micro_skills.map(skill => (
                  <option key={skill.id} value={skill.id}>{skill.name}</option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
              <select
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Any Difficulty</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                  <option key={level} value={level}>Level {level}</option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <Button onClick={() => handleSearch(1)} className="w-full">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading questions...</p>
            </div>
          ) : questions.length > 0 ? (
            <>
              <p className="text-sm text-gray-500">Found {total} questions</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {questions.map((q) => (
                  <div key={q.question_id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          "bg-indigo-50 text-indigo-700 border-indigo-100"
                        )}>
                          {q.micro_skill_name || 'General'}
                        </span>
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          "bg-gray-100 text-gray-800 border-gray-200"
                        )}>
                          Div {Math.ceil(q.difficulty_level / 3)}
                        </span>
                      </div>
                      
                      <p className="text-gray-900 font-medium mb-4 line-clamp-3" dangerouslySetInnerHTML={{ __html: q.text }} />
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <BarChart2 size={14} /> 
                        <span>Lvl {q.difficulty_level}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{q.expected_time_seconds || 30}s</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {total > limit && (
                <div className="flex justify-center mt-8 gap-2">
                  <Button 
                    variant="outline" 
                    disabled={page === 1} 
                    onClick={() => handleSearch(page - 1)}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center px-4 font-medium text-gray-700">
                    Page {page} of {Math.ceil(total / limit)}
                  </div>
                  <Button 
                    variant="outline" 
                    disabled={page >= Math.ceil(total / limit)} 
                    onClick={() => handleSearch(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
              <Filter className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No questions found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your filters to find what you're looking for.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
