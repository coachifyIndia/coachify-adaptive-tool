import api from './api';

export interface ProgressInfo {
  questions_remaining: number;
  estimated_time_minutes: number;
}

export interface PerformanceUpdate {
  current_mastery: string;
  difficulty_adjustment: string;
  questions_attempted: number;
  accuracy: string;
}

export interface StartSessionResponse {
  success: boolean;
  data: {
    session: {
      session_id: string;
      total_questions: number;
    };
    first_question: Question;
    progress_info: ProgressInfo;
  };
}

export interface Question {
  question_id: string;
  text: string;
  type: string;
  options?: string[];
  difficulty_level: number;
  module_id?: number;
  module_name?: string;
  micro_skill_id?: number;
  micro_skill_name?: string;
  expected_time_seconds?: number;
}

export interface SubmitAnswerResponse {
  success: boolean;
  data: {
    is_correct: boolean;
    points_earned: number;
    feedback: {
      explanation: string;
      solution_steps: string[];
    };
    performance_update: PerformanceUpdate;
    next_question: Question | null;
  };
}

export interface EndSessionResponse {
  success: boolean;
  data: {
    session_summary: {
      total_questions: number;
      questions_attempted: number;
      questions_correct: number;
      accuracy: number;
      points_earned: number;
      duration_minutes: number;
      confidence_metrics?: {
        avg_confidence: number; // 0-100%
        high_confidence_count: number; // >80%
        medium_confidence_count: number; // 50-80%
        low_confidence_count: number; // <50%
      };
    };
  };
}

export const practiceService = {
  async startSession(config: { session_size?: number; focus_modules?: number[]; difficulty_preference?: string } = {}) {
    const response = await api.post<StartSessionResponse>('/practice/start', config);
    return response.data;
  },

  async startAdaptiveDrill(moduleId: number, drillNumber: number) {
    const response = await api.post<StartSessionResponse>('/practice/drill/start', {
      module_id: moduleId,
      drill_number: drillNumber
    });
    return response.data;
  },

  async submitAnswer(data: {
    session_id: string;
    question_id: string;
    user_answer: string | string[];
    time_spent_seconds: number;
  }) {
    const response = await api.post<SubmitAnswerResponse>('/practice/submit-answer', data);
    return response.data;
  },

  async endSession(sessionId: string) {
    const response = await api.post<EndSessionResponse>('/practice/end-session', { session_id: sessionId });
    return response.data;
  },

  async getSession(sessionId: string): Promise<StartSessionResponse> {
    const response = await api.get(`/practice/session/${sessionId}`);
    return response.data;
  },

  async getHistory(): Promise<{ success: boolean; data: any }> {
    const response = await api.get('/practice/history');
    return response.data;
  },

  async getModules(): Promise<{ success: boolean; data: any[] }> {
    const response = await api.get('/practice/modules');
    return response.data;
  },

  async getDrillStatus(moduleId: number) {
    const response = await api.get<{ success: boolean; data: any }>(`/practice/drill/status/${moduleId}`);
    return response.data;
  },

  async resetDrillProgress(moduleId: number) {
    const response = await api.post<{ success: boolean; message: string; data: any }>('/practice/drill/reset', {
      module_id: moduleId
    });
    return response.data;
  },

  async getQuestionsExplorer(filters: { moduleId?: number; microSkillId?: number; difficulty?: number; page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters.moduleId) params.append('moduleId', filters.moduleId.toString());
    if (filters.microSkillId) params.append('microSkillId', filters.microSkillId.toString());
    if (filters.difficulty) params.append('difficulty', filters.difficulty.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get<{ success: boolean; data: { questions: Question[]; pagination: any } }>(`/practice/questions/explore?${params.toString()}`);
    return response.data;
  },
};
