import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  GripVertical,
  Lightbulb,
  BookOpen,
  AlertTriangle,
  Info,
  X,
  FolderPlus,
  FileQuestion,
} from 'lucide-react';
import {
  adminQuestionService,
  adminCurriculumService,
  QuestionStatus,
} from '../../services/admin.service';
import type { CreateQuestionData, SolutionStep, CommonError, CreateModuleData, CreateMicroSkillData } from '../../services/admin.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MathEditor } from '../../components/ui/MathEditor';
import { MathInput } from '../../components/ui/MathInput';
import { cn } from '../../utils/cn';

// ============================================================================
// CONSTANTS - Matching Backend Schema
// ============================================================================

const QuestionType = {
  MCQ: 'mcq',
  NUMERICAL_INPUT: 'numerical_input',
  TEXT_INPUT: 'text_input',
  TRUE_FALSE: 'true_false',
} as const;

type QuestionTypeValue = (typeof QuestionType)[keyof typeof QuestionType];

const QUESTION_TYPES: { value: QuestionTypeValue; label: string; description: string }[] = [
  { value: QuestionType.MCQ, label: 'Multiple Choice', description: 'Select one correct answer from options' },
  { value: QuestionType.NUMERICAL_INPUT, label: 'Numerical Input', description: 'Enter a numeric answer' },
  { value: QuestionType.TEXT_INPUT, label: 'Text Input', description: 'Enter a text-based answer' },
  { value: QuestionType.TRUE_FALSE, label: 'True/False', description: 'Select true or false' },
];

// Difficulty scale 1-10 matching backend schema
const DIFFICULTY_CONFIG: { value: number; label: string; color: string }[] = [
  { value: 1, label: 'Level 1 - Beginner', color: 'bg-green-100 text-green-700' },
  { value: 2, label: 'Level 2 - Easy', color: 'bg-green-100 text-green-700' },
  { value: 3, label: 'Level 3 - Easy-Medium', color: 'bg-lime-100 text-lime-700' },
  { value: 4, label: 'Level 4 - Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 5, label: 'Level 5 - Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 6, label: 'Level 6 - Medium-Hard', color: 'bg-orange-100 text-orange-700' },
  { value: 7, label: 'Level 7 - Hard', color: 'bg-orange-100 text-orange-700' },
  { value: 8, label: 'Level 8 - Very Hard', color: 'bg-red-100 text-red-700' },
  { value: 9, label: 'Level 9 - Expert', color: 'bg-red-100 text-red-700' },
  { value: 10, label: 'Level 10 - Master', color: 'bg-purple-100 text-purple-700' },
];

const STATUS_OPTIONS: { value: QuestionStatus; label: string; description: string }[] = [
  { value: QuestionStatus.DRAFT, label: 'Draft', description: 'Work in progress, not visible to users' },
  { value: QuestionStatus.REVIEW, label: 'Review', description: 'Ready for review by content team' },
  { value: QuestionStatus.ACTIVE, label: 'Active', description: 'Live and available to users' },
  { value: QuestionStatus.PUBLISHED, label: 'Published', description: 'Officially published' },
  { value: QuestionStatus.ARCHIVED, label: 'Archived', description: 'No longer in use' },
];

// Helper types for curriculum data (fetched from API)
interface MicroSkillOption {
  id: number;
  name: string;
  description: string;
}

interface ModuleOption {
  id: number;
  name: string;
  description: string;
  micro_skills: MicroSkillOption[];
}

// Validation constants from backend
const VALIDATION = {
  MIN_EXPECTED_TIME: 10,
  MAX_EXPECTED_TIME: 3600,
  MIN_POINTS: 0,
  MAX_POINTS: 1000,
  MAX_HINTS: 3,
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 6,
  MIN_SOLUTION_STEPS: 1,
};

// ============================================================================
// FORM COMPONENT
// ============================================================================

interface FormErrors {
  [key: string]: string;
}

export default function AdminQuestionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Curriculum data fetched from API
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [curriculumLoading, setCurriculumLoading] = useState(true);

  // Form state with full schema support
  const [formData, setFormData] = useState<CreateQuestionData>({
    module_id: 0,
    micro_skill_id: 1,
    question_data: {
      text: '',
      type: QuestionType.MCQ,
      options: ['', '', '', ''],
      correct_answer: 0,
      solution_steps: [{ step: 1, action: '', calculation: '', result: '' }],
      hints: [],
    },
    metadata: {
      difficulty_level: 5,
      expected_time_seconds: 60,
      points: 10,
      tags: [],
      prerequisites: [],
      common_errors: [],
    },
    status: QuestionStatus.DRAFT,
  });

  const [tagInput, setTagInput] = useState('');
  const [prerequisiteInput, setPrerequisiteInput] = useState('');

  // Modal states for adding new module/micro-skill
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [showAddMicroSkillModal, setShowAddMicroSkillModal] = useState(false);
  const [newModuleData, setNewModuleData] = useState<CreateModuleData>({
    name: '',
    description: '',
    difficulty_level: 'beginner',
  });
  const [newMicroSkillData, setNewMicroSkillData] = useState<CreateMicroSkillData>({
    name: '',
    description: '',
    estimated_time_minutes: 30,
  });
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [isCreatingMicroSkill, setIsCreatingMicroSkill] = useState(false);

  // Helper functions for curriculum data
  const getMicroSkillsForModule = (moduleId: number): MicroSkillOption[] => {
    const module = modules.find(m => m.id === moduleId);
    return module?.micro_skills || [];
  };

  const getFirstMicroSkillId = (moduleId: number): number => {
    const microSkills = getMicroSkillsForModule(moduleId);
    return microSkills.length > 0 ? microSkills[0].id : 1;
  };

  // Fetch curriculum data on mount
  useEffect(() => {
    loadCurriculum();
  }, []);

  // Load question if editing
  useEffect(() => {
    if (isEditing && modules.length > 0) {
      loadQuestion();
    }
  }, [id, modules]);

  const loadCurriculum = async () => {
    try {
      setCurriculumLoading(true);
      const data = await adminCurriculumService.getCurriculum();
      setModules(data.modules);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load curriculum';
      setError(`Failed to load curriculum data: ${errorMessage}`);
    } finally {
      setCurriculumLoading(false);
    }
  };

  // Create new module handler
  const handleCreateModule = async () => {
    if (!newModuleData.name.trim() || !newModuleData.description.trim()) {
      return;
    }

    try {
      setIsCreatingModule(true);
      const newModule = await adminCurriculumService.createModule(newModuleData);

      // Add to local state
      setModules((prev) => [
        ...prev,
        {
          ...newModule,
          micro_skills: [],
        },
      ]);

      // Select the new module
      updateFormData('module_id', newModule.id);

      // Reset and close modal
      setNewModuleData({ name: '', description: '', difficulty_level: 'beginner' });
      setShowAddModuleModal(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create module';
      setError(errorMessage);
    } finally {
      setIsCreatingModule(false);
    }
  };

  // Create new micro-skill handler
  const handleCreateMicroSkill = async () => {
    if (!newMicroSkillData.name.trim() || !newMicroSkillData.description.trim()) {
      return;
    }

    try {
      setIsCreatingMicroSkill(true);
      const newMicroSkill = await adminCurriculumService.createMicroSkill(
        formData.module_id,
        newMicroSkillData
      );

      // Add to local state
      setModules((prev) =>
        prev.map((m) =>
          m.id === formData.module_id
            ? { ...m, micro_skills: [...m.micro_skills, newMicroSkill] }
            : m
        )
      );

      // Select the new micro-skill
      updateFormData('micro_skill_id', newMicroSkill.id);

      // Reset and close modal
      setNewMicroSkillData({ name: '', description: '', estimated_time_minutes: 30 });
      setShowAddMicroSkillModal(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create micro-skill';
      setError(errorMessage);
    } finally {
      setIsCreatingMicroSkill(false);
    }
  };

  const loadQuestion = async () => {
    try {
      setIsLoading(true);
      const question = await adminQuestionService.getQuestion(id!);
      setFormData({
        module_id: question.module_id,
        micro_skill_id: question.micro_skill_id,
        question_data: {
          text: question.question_data.text,
          type: question.question_data.type,
          options: question.question_data.options || ['', '', '', ''],
          correct_answer: question.question_data.correct_answer,
          solution_steps: question.question_data.solution_steps || [{ step: 1, action: '', calculation: '', result: '' }],
          hints: question.question_data.hints || [],
        },
        metadata: {
          difficulty_level: question.metadata.difficulty_level,
          expected_time_seconds: question.metadata.expected_time_seconds,
          points: question.metadata.points,
          tags: question.metadata.tags || [],
          prerequisites: question.metadata.prerequisites || [],
          common_errors: question.metadata.common_errors || [],
        },
        status: question.status,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load question';
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Question text validation
    if (!formData.question_data.text.trim()) {
      errors.questionText = 'Question text is required';
    }

    // Module validation - check if module exists in curriculum
    const selectedModule = modules.find(m => m.id === formData.module_id);
    if (!selectedModule) {
      errors.module = 'Please select a valid module';
    }

    // Micro skill validation - must belong to selected module
    const validMicroSkills = getMicroSkillsForModule(formData.module_id);
    const isValidMicroSkill = validMicroSkills.some(ms => ms.id === formData.micro_skill_id);
    if (!isValidMicroSkill) {
      errors.microSkill = `Selected micro skill doesn't belong to Module ${formData.module_id}`;
    }

    // Options validation for MCQ
    if (formData.question_data.type === QuestionType.MCQ) {
      const validOptions = formData.question_data.options?.filter((o) => o.trim()) || [];
      if (validOptions.length < VALIDATION.MIN_OPTIONS) {
        errors.options = `At least ${VALIDATION.MIN_OPTIONS} options are required`;
      }
      if (typeof formData.question_data.correct_answer !== 'number' ||
          formData.question_data.correct_answer < 0 ||
          formData.question_data.correct_answer >= validOptions.length) {
        errors.correctAnswer = 'Please select a valid correct answer';
      }
    }

    // True/False validation
    if (formData.question_data.type === QuestionType.TRUE_FALSE) {
      if (typeof formData.question_data.correct_answer !== 'boolean' &&
          formData.question_data.correct_answer !== 'true' &&
          formData.question_data.correct_answer !== 'false') {
        errors.correctAnswer = 'Please select true or false';
      }
    }

    // Numerical/Text input validation
    if (formData.question_data.type === QuestionType.NUMERICAL_INPUT ||
        formData.question_data.type === QuestionType.TEXT_INPUT) {
      if (formData.question_data.correct_answer === '' ||
          formData.question_data.correct_answer === undefined) {
        errors.correctAnswer = 'Correct answer is required';
      }
    }

    // Solution steps validation
    if (formData.question_data.solution_steps.length < VALIDATION.MIN_SOLUTION_STEPS) {
      errors.solutionSteps = 'At least one solution step is required';
    }
    const hasEmptyStep = formData.question_data.solution_steps.some(
      (step) => !step.action.trim()
    );
    if (hasEmptyStep) {
      errors.solutionSteps = 'All solution steps must have an action';
    }

    // Hints validation
    if ((formData.question_data.hints?.length || 0) > VALIDATION.MAX_HINTS) {
      errors.hints = `Maximum ${VALIDATION.MAX_HINTS} hints allowed`;
    }

    // Metadata validation
    if (formData.metadata.expected_time_seconds < VALIDATION.MIN_EXPECTED_TIME ||
        formData.metadata.expected_time_seconds > VALIDATION.MAX_EXPECTED_TIME) {
      errors.expectedTime = `Expected time must be between ${VALIDATION.MIN_EXPECTED_TIME} and ${VALIDATION.MAX_EXPECTED_TIME} seconds`;
    }

    if (formData.metadata.points < VALIDATION.MIN_POINTS ||
        formData.metadata.points > VALIDATION.MAX_POINTS) {
      errors.points = `Points must be between ${VALIDATION.MIN_POINTS} and ${VALIDATION.MAX_POINTS}`;
    }

    if (formData.metadata.difficulty_level < 1 || formData.metadata.difficulty_level > 10) {
      errors.difficulty = 'Difficulty must be between 1 and 10';
    }

    // Common errors validation
    const invalidCommonErrors = formData.metadata.common_errors?.some(
      (ce) => !ce.type.trim() || ce.frequency < 0 || ce.frequency > 1
    );
    if (invalidCommonErrors) {
      errors.commonErrors = 'All common errors must have a type and frequency between 0 and 1';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      setError('Please fix the validation errors before submitting');
      return;
    }

    try {
      setIsSaving(true);

      // Prepare data for submission
      const submitData: CreateQuestionData = {
        ...formData,
        question_data: {
          ...formData.question_data,
          // Clean up options for non-MCQ types
          options: formData.question_data.type === QuestionType.MCQ
            ? formData.question_data.options?.filter((o) => o.trim())
            : undefined,
          // Convert correct_answer for true_false
          correct_answer: formData.question_data.type === QuestionType.TRUE_FALSE
            ? formData.question_data.correct_answer === 'true' || formData.question_data.correct_answer === true
            : formData.question_data.correct_answer,
        },
        metadata: {
          ...formData.metadata,
          // Filter out empty tags and prerequisites
          tags: formData.metadata.tags?.filter((t) => t.trim()) || [],
          prerequisites: formData.metadata.prerequisites?.filter((p) => p.trim()) || [],
          // Filter out incomplete common errors
          common_errors: formData.metadata.common_errors?.filter(
            (ce) => ce.type.trim() && ce.description.trim()
          ) || [],
        },
      };

      if (isEditing) {
        await adminQuestionService.updateQuestion(id!, submitData);
      } else {
        await adminQuestionService.createQuestion(submitData);
      }

      navigate('/admin/questions');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save question';
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (path: string, value: unknown) => {
    setFormData((prev) => {
      const newData = { ...prev };
      const keys = path.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return { ...newData };
    });
    // Clear related error when field is updated
    const errorKey = path.split('.').pop() || path;
    if (formErrors[errorKey]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  // Question type change handler
  const handleTypeChange = (newType: QuestionTypeValue) => {
    updateFormData('question_data.type', newType);

    // Reset correct answer and options based on type
    switch (newType) {
      case QuestionType.MCQ:
        updateFormData('question_data.options', ['', '', '', '']);
        updateFormData('question_data.correct_answer', 0);
        break;
      case QuestionType.TRUE_FALSE:
        updateFormData('question_data.options', ['True', 'False']);
        updateFormData('question_data.correct_answer', 'true');
        break;
      case QuestionType.NUMERICAL_INPUT:
        updateFormData('question_data.options', undefined);
        updateFormData('question_data.correct_answer', 0);
        break;
      case QuestionType.TEXT_INPUT:
        updateFormData('question_data.options', undefined);
        updateFormData('question_data.correct_answer', '');
        break;
    }
  };

  // Options handlers
  const addOption = () => {
    if (formData.question_data.options && formData.question_data.options.length < VALIDATION.MAX_OPTIONS) {
      updateFormData('question_data.options', [...formData.question_data.options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (formData.question_data.options && formData.question_data.options.length > VALIDATION.MIN_OPTIONS) {
      const newOptions = formData.question_data.options.filter((_, i) => i !== index);
      updateFormData('question_data.options', newOptions);
      // Adjust correct answer if needed
      if (typeof formData.question_data.correct_answer === 'number') {
        if (formData.question_data.correct_answer >= index) {
          updateFormData(
            'question_data.correct_answer',
            Math.max(0, (formData.question_data.correct_answer as number) - 1)
          );
        }
      }
    }
  };

  // Solution steps handlers
  const addSolutionStep = () => {
    const steps = formData.question_data.solution_steps;
    updateFormData('question_data.solution_steps', [
      ...steps,
      { step: steps.length + 1, action: '', calculation: '', result: '' },
    ]);
  };

  const removeSolutionStep = (index: number) => {
    if (formData.question_data.solution_steps.length > VALIDATION.MIN_SOLUTION_STEPS) {
      const newSteps = formData.question_data.solution_steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, step: i + 1 }));
      updateFormData('question_data.solution_steps', newSteps);
    }
  };

  const updateSolutionStep = (index: number, field: keyof SolutionStep, value: string | number) => {
    const newSteps = [...formData.question_data.solution_steps];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newSteps[index] as any)[field] = value;
    updateFormData('question_data.solution_steps', newSteps);
  };

  // Hints handlers
  const addHint = () => {
    const hints = formData.question_data.hints || [];
    if (hints.length < VALIDATION.MAX_HINTS) {
      updateFormData('question_data.hints', [...hints, { level: hints.length + 1, text: '' }]);
    }
  };

  const removeHint = (index: number) => {
    const newHints = (formData.question_data.hints || [])
      .filter((_, i) => i !== index)
      .map((hint, i) => ({ ...hint, level: i + 1 }));
    updateFormData('question_data.hints', newHints);
  };

  // Tags handlers
  const addTag = () => {
    if (tagInput.trim() && !formData.metadata.tags?.includes(tagInput.trim())) {
      updateFormData('metadata.tags', [...(formData.metadata.tags || []), tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    updateFormData(
      'metadata.tags',
      (formData.metadata.tags || []).filter((t) => t !== tag)
    );
  };

  // Prerequisites handlers
  const addPrerequisite = () => {
    if (prerequisiteInput.trim() && !formData.metadata.prerequisites?.includes(prerequisiteInput.trim())) {
      updateFormData('metadata.prerequisites', [...(formData.metadata.prerequisites || []), prerequisiteInput.trim()]);
      setPrerequisiteInput('');
    }
  };

  const removePrerequisite = (prereq: string) => {
    updateFormData(
      'metadata.prerequisites',
      (formData.metadata.prerequisites || []).filter((p) => p !== prereq)
    );
  };

  // Common errors handlers
  const addCommonError = () => {
    const errors = formData.metadata.common_errors || [];
    updateFormData('metadata.common_errors', [
      ...errors,
      { type: '', frequency: 0.1, description: '' },
    ]);
  };

  const removeCommonError = (index: number) => {
    const newErrors = (formData.metadata.common_errors || []).filter((_, i) => i !== index);
    updateFormData('metadata.common_errors', newErrors);
  };

  const updateCommonError = (index: number, field: keyof CommonError, value: string | number) => {
    const newErrors = [...(formData.metadata.common_errors || [])];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newErrors[index] as any)[field] = value;
    updateFormData('metadata.common_errors', newErrors);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading || curriculumLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <p className="text-sm text-gray-500">
          {curriculumLoading ? 'Loading curriculum data...' : 'Loading question...'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Questions
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Question' : 'Create New Question'}
        </h1>
        <p className="text-gray-500 mt-1">
          Fill in all required fields to create a production-ready question
        </p>
      </div>

      {/* Global Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ================================================================== */}
        {/* SECTION 1: Basic Information */}
        {/* ================================================================== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

          {/* Module & Micro Skill Selection - Full Width Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Module */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.module_id}
                  onChange={(e) => {
                    const newModuleId = Number(e.target.value);
                    updateFormData('module_id', newModuleId);
                    // Auto-select first micro-skill of the new module
                    updateFormData('micro_skill_id', getFirstMicroSkillId(newModuleId));
                  }}
                  className={cn(
                    'flex-1 h-10 px-3 rounded-md border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
                    formErrors.module ? 'border-red-300' : 'border-gray-300'
                  )}
                  required
                >
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      Module {module.id}: {module.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddModuleModal(true)}
                  className="flex items-center gap-1 px-3 h-10 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
                  title="Add New Module"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">New</span>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {modules.find(m => m.id === formData.module_id)?.description}
              </p>
              {formErrors.module && (
                <p className="mt-1 text-xs text-red-500">{formErrors.module}</p>
              )}
            </div>

            {/* Micro Skill - Filtered by Module */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Micro Skill <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.micro_skill_id}
                  onChange={(e) => updateFormData('micro_skill_id', Number(e.target.value))}
                  className={cn(
                    'flex-1 h-10 px-3 rounded-md border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
                    formErrors.microSkill ? 'border-red-300' : 'border-gray-300'
                  )}
                  required
                >
                  {getMicroSkillsForModule(formData.module_id).map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      MS{skill.id}: {skill.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddMicroSkillModal(true)}
                  disabled={formData.module_id === undefined}
                  className="flex items-center gap-1 px-3 h-10 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md border border-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add New Micro-skill to Selected Module"
                >
                  <FileQuestion className="w-4 h-4" />
                  <span className="hidden sm:inline">New</span>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {getMicroSkillsForModule(formData.module_id).find(s => s.id === formData.micro_skill_id)?.description || 'Select a micro skill'}
              </p>
              {formErrors.microSkill && (
                <p className="mt-1 text-xs text-red-500">{formErrors.microSkill}</p>
              )}
            </div>
          </div>

          {/* Question Type - Separate Row */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.question_data.type}
              onChange={(e) => handleTypeChange(e.target.value as QuestionTypeValue)}
              className="w-full sm:w-64 h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {QUESTION_TYPES.find((t) => t.value === formData.question_data.type)?.description}
            </p>
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECTION 2: Question Content */}
        {/* ================================================================== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Question Content</h2>

          {/* Question Text */}
          <MathEditor
            label="Question Text"
            required
            value={formData.question_data.text}
            onChange={(value) => updateFormData('question_data.text', value)}
            rows={5}
            error={formErrors.questionText}
            placeholder="Enter the question text. Use $...$ for inline math (e.g., $x^2 + y^2$) or $$...$$ for display math."
            helpText="Click toolbar buttons to insert mathematical symbols and notation."
          />

          {/* MCQ Options */}
          {formData.question_data.type === QuestionType.MCQ && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Answer Options <span className="text-red-500">*</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addOption}
                  disabled={(formData.question_data.options?.length || 0) >= VALIDATION.MAX_OPTIONS}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-3">
                {formData.question_data.options?.map((option, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={formData.question_data.correct_answer === index}
                      onChange={() => updateFormData('question_data.correct_answer', index)}
                      className="w-4 h-4 mt-2.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="w-6 h-6 mt-1.5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <div className="flex-1">
                      <MathInput
                        value={option}
                        onChange={(value) => {
                          const newOptions = [...(formData.question_data.options || [])];
                          newOptions[index] = value;
                          updateFormData('question_data.options', newOptions);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + index)} (use $...$ for math)`}
                        className="h-10"
                      />
                    </div>
                    {(formData.question_data.options?.length || 0) > VALIDATION.MIN_OPTIONS && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 mt-0.5 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {formErrors.options && (
                <p className="mt-2 text-xs text-red-500">{formErrors.options}</p>
              )}
              {formErrors.correctAnswer && (
                <p className="mt-2 text-xs text-red-500">{formErrors.correctAnswer}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Select the radio button next to the correct answer. Min {VALIDATION.MIN_OPTIONS}, max {VALIDATION.MAX_OPTIONS} options.
              </p>
            </div>
          )}

          {/* True/False Options */}
          {formData.question_data.type === QuestionType.TRUE_FALSE && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="true_false_answer"
                    checked={formData.question_data.correct_answer === 'true' || formData.question_data.correct_answer === true}
                    onChange={() => updateFormData('question_data.correct_answer', 'true')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">True</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="true_false_answer"
                    checked={formData.question_data.correct_answer === 'false' || formData.question_data.correct_answer === false}
                    onChange={() => updateFormData('question_data.correct_answer', 'false')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">False</span>
                </label>
              </div>
              {formErrors.correctAnswer && (
                <p className="mt-2 text-xs text-red-500">{formErrors.correctAnswer}</p>
              )}
            </div>
          )}

          {/* Numerical Input Answer */}
          {formData.question_data.type === QuestionType.NUMERICAL_INPUT && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correct Answer (Numerical) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="any"
                value={formData.question_data.correct_answer as number}
                onChange={(e) => updateFormData('question_data.correct_answer', Number(e.target.value))}
                className={cn('max-w-md h-10', formErrors.correctAnswer && 'border-red-300')}
                placeholder="Enter the numeric answer"
                required
              />
              {formErrors.correctAnswer && (
                <p className="mt-1 text-xs text-red-500">{formErrors.correctAnswer}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter the exact numerical value that will be accepted as correct
              </p>
            </div>
          )}

          {/* Text Input Answer */}
          {formData.question_data.type === QuestionType.TEXT_INPUT && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correct Answer (Text) <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.question_data.correct_answer as string}
                onChange={(e) => updateFormData('question_data.correct_answer', e.target.value)}
                className={cn('max-w-md h-10', formErrors.correctAnswer && 'border-red-300')}
                placeholder="Enter the text answer"
                required
              />
              {formErrors.correctAnswer && (
                <p className="mt-1 text-xs text-red-500">{formErrors.correctAnswer}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter the expected text response (case sensitivity may vary by implementation)
              </p>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* SECTION 3: Solution Steps */}
        {/* ================================================================== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Solution Steps</h2>
              <p className="text-sm text-gray-500">At least one step is required</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addSolutionStep} className="gap-1">
              <Plus className="w-4 h-4" />
              Add Step
            </Button>
          </div>
          {formErrors.solutionSteps && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{formErrors.solutionSteps}</p>
            </div>
          )}
          <div className="space-y-4">
            {formData.question_data.solution_steps.map((step, index) => (
              <div
                key={index}
                className="relative p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">Step {step.step}</span>
                </div>
                {formData.question_data.solution_steps.length > VALIDATION.MIN_SOLUTION_STEPS && (
                  <button
                    type="button"
                    onClick={() => removeSolutionStep(index)}
                    className="absolute right-4 top-4 p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Action <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={step.action}
                      onChange={(e) => updateSolutionStep(index, 'action', e.target.value)}
                      placeholder="e.g., Identify the variables"
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Calculation
                    </label>
                    <MathInput
                      value={step.calculation}
                      onChange={(value) => updateSolutionStep(index, 'calculation', value)}
                      placeholder="e.g., $x = 2 + 3$"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Result</label>
                    <MathInput
                      value={String(step.result ?? '')}
                      onChange={(value) => updateSolutionStep(index, 'result', value)}
                      placeholder="e.g., $x = 5$"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECTION 4: Hints (Optional, Max 3) */}
        {/* ================================================================== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Hints</h2>
                <p className="text-sm text-gray-500">Optional, max {VALIDATION.MAX_HINTS} hints</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addHint}
              disabled={(formData.question_data.hints?.length || 0) >= VALIDATION.MAX_HINTS}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Hint ({formData.question_data.hints?.length || 0}/{VALIDATION.MAX_HINTS})
            </Button>
          </div>
          {formErrors.hints && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{formErrors.hints}</p>
            </div>
          )}
          {(formData.question_data.hints?.length || 0) === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hints added yet</p>
              <p className="text-xs">Hints help students who are stuck</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.question_data.hints?.map((hint, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-8 h-8 mt-1 rounded-full bg-yellow-100 flex items-center justify-center text-sm font-medium text-yellow-700">
                    {hint.level}
                  </span>
                  <div className="flex-1">
                    <MathInput
                      value={hint.text}
                      onChange={(value) => {
                        const newHints = [...(formData.question_data.hints || [])];
                        newHints[index] = { ...newHints[index], text: value };
                        updateFormData('question_data.hints', newHints);
                      }}
                      placeholder={`Hint ${hint.level} - Use $...$ for math (e.g., "Try using $a^2 + b^2 = c^2$")`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHint(index)}
                    className="p-2 mt-0.5 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* SECTION 5: Metadata */}
        {/* ================================================================== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>

          {/* Difficulty, Time, Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Difficulty Level (1-10) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.metadata.difficulty_level}
                onChange={(e) => updateFormData('metadata.difficulty_level', Number(e.target.value))}
                className={cn(
                  'w-full h-10 px-3 rounded-md border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  formErrors.difficulty ? 'border-red-300' : 'border-gray-300'
                )}
              >
                {DIFFICULTY_CONFIG.map((diff) => (
                  <option key={diff.value} value={diff.value}>
                    {diff.label}
                  </option>
                ))}
              </select>
              {formErrors.difficulty && (
                <p className="mt-1 text-xs text-red-500">{formErrors.difficulty}</p>
              )}
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-3 h-3 rounded-full',
                      i < formData.metadata.difficulty_level ? 'bg-indigo-500' : 'bg-gray-200'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Expected Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Time (seconds) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={VALIDATION.MIN_EXPECTED_TIME}
                max={VALIDATION.MAX_EXPECTED_TIME}
                value={formData.metadata.expected_time_seconds}
                onChange={(e) => updateFormData('metadata.expected_time_seconds', Number(e.target.value))}
                className={cn('h-10', formErrors.expectedTime && 'border-red-300')}
              />
              {formErrors.expectedTime ? (
                <p className="mt-1 text-xs text-red-500">{formErrors.expectedTime}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  {VALIDATION.MIN_EXPECTED_TIME}s - {VALIDATION.MAX_EXPECTED_TIME}s
                </p>
              )}
            </div>

            {/* Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={VALIDATION.MIN_POINTS}
                max={VALIDATION.MAX_POINTS}
                value={formData.metadata.points}
                onChange={(e) => updateFormData('metadata.points', Number(e.target.value))}
                className={cn('h-10', formErrors.points && 'border-red-300')}
              />
              {formErrors.points ? (
                <p className="mt-1 text-xs text-red-500">{formErrors.points}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  {VALIDATION.MIN_POINTS} - {VALIDATION.MAX_POINTS}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag (e.g., algebra, fractions)..."
                className="flex-1 h-10"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            {(formData.metadata.tags?.length || 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.metadata.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Prerequisites */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-gray-500" />
              <label className="block text-sm font-medium text-gray-700">Prerequisites</label>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Skills or concepts students should know before attempting this question
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={prerequisiteInput}
                onChange={(e) => setPrerequisiteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPrerequisite();
                  }
                }}
                placeholder="Add a prerequisite (e.g., basic multiplication)..."
                className="flex-1 h-10"
              />
              <Button type="button" variant="outline" onClick={addPrerequisite}>
                Add
              </Button>
            </div>
            {(formData.metadata.prerequisites?.length || 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.metadata.prerequisites?.map((prereq) => (
                  <span
                    key={prereq}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-sm"
                  >
                    {prereq}
                    <button
                      type="button"
                      onClick={() => removePrerequisite(prereq)}
                      className="hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECTION 6: Common Errors */}
        {/* ================================================================== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Common Errors</h2>
                <p className="text-sm text-gray-500">Document common mistakes students make</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addCommonError} className="gap-1">
              <Plus className="w-4 h-4" />
              Add Error
            </Button>
          </div>
          {formErrors.commonErrors && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{formErrors.commonErrors}</p>
            </div>
          )}
          {(formData.metadata.common_errors?.length || 0) === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No common errors documented</p>
              <p className="text-xs">This helps provide better feedback to students</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.metadata.common_errors?.map((error, index) => (
                <div key={index} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-orange-700">Error #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeCommonError(index)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Error Type <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={error.type}
                        onChange={(e) => updateCommonError(index, 'type', e.target.value)}
                        placeholder="e.g., Sign error"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Frequency (0-1) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={error.frequency}
                          onChange={(e) => updateCommonError(index, 'frequency', Number(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm font-mono text-gray-600 w-12">
                          {(error.frequency * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={error.description}
                        onChange={(e) => updateCommonError(index, 'description', e.target.value)}
                        placeholder="e.g., Forgetting to flip the sign when multiplying by negative"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* SECTION 7: Status & Submit */}
        {/* ================================================================== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => updateFormData('status', e.target.value)}
                className="w-full sm:w-64 h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {STATUS_OPTIONS.find((s) => s.value === formData.status)?.description}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2 min-w-[140px]">
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditing ? 'Update Question' : 'Create Question'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Form Summary/Validation Info */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Before submitting:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Ensure all required fields (*) are filled</li>
                  <li>Verify the correct answer is properly selected</li>
                  <li>Add at least one solution step with an action</li>
                  <li>Consider adding hints for student guidance (max 3)</li>
                  <li>Document common errors to improve feedback quality</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ================================================================== */}
      {/* ADD MODULE MODAL */}
      {/* ================================================================== */}
      {showAddModuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Add New Module</h3>
              </div>
              <button
                onClick={() => setShowAddModuleModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Module Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newModuleData.name}
                  onChange={(e) => setNewModuleData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Advanced Calculus"
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newModuleData.description}
                  onChange={(e) => setNewModuleData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Describe what this module covers..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={newModuleData.difficulty_level}
                  onChange={(e) => setNewModuleData(prev => ({ ...prev, difficulty_level: e.target.value as 'beginner' | 'intermediate' | 'advanced' }))}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModuleModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateModule}
                disabled={isCreatingModule || !newModuleData.name.trim() || !newModuleData.description.trim()}
                className="gap-2"
              >
                {isCreatingModule ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4" />
                    Create Module
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ADD MICRO-SKILL MODAL */}
      {/* ================================================================== */}
      {showAddMicroSkillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Add New Micro-skill</h3>
              </div>
              <button
                onClick={() => setShowAddMicroSkillModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <p className="text-sm text-indigo-700">
                  Adding to: <span className="font-medium">Module {formData.module_id} - {modules.find(m => m.id === formData.module_id)?.name}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Micro-skill Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newMicroSkillData.name}
                  onChange={(e) => setNewMicroSkillData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Quadratic Formula Application"
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newMicroSkillData.description}
                  onChange={(e) => setNewMicroSkillData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Describe what this micro-skill teaches..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Time (minutes)
                </label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={newMicroSkillData.estimated_time_minutes}
                  onChange={(e) => setNewMicroSkillData(prev => ({ ...prev, estimated_time_minutes: Number(e.target.value) }))}
                  className="h-10 max-w-[150px]"
                />
                <p className="mt-1 text-xs text-gray-500">How long to master this skill (5-120 minutes)</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddMicroSkillModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateMicroSkill}
                disabled={isCreatingMicroSkill || !newMicroSkillData.name.trim() || !newMicroSkillData.description.trim()}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isCreatingMicroSkill ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileQuestion className="w-4 h-4" />
                    Create Micro-skill
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
