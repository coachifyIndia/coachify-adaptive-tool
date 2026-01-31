import adminApi from './adminApi';

// ============================================================================
// TYPES
// ============================================================================

export const AdminRole = {
  SUPER_ADMIN: 'super_admin',
  CONTENT_ADMIN: 'content_admin',
  REVIEWER: 'reviewer',
} as const;

export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

export const QuestionStatus = {
  ACTIVE: 'active',
  DRAFT: 'draft',
  REVIEW: 'review',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type QuestionStatus = (typeof QuestionStatus)[keyof typeof QuestionStatus];

export interface Admin {
  admin_id: string;
  email: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  data: {
    admin: Admin;
    tokens: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  };
}

export interface SolutionStep {
  step: number;
  action: string;
  calculation: string;
  result: string | number;
}

export interface Hint {
  level: number;
  text: string;
}

export interface CommonError {
  type: string;
  frequency: number;
  description: string;
}

export interface Question {
  _id: string;
  question_code: string;
  module_id: number;
  micro_skill_id: number;
  question_data: {
    text: string;
    type: string;
    options: string[];
    correct_answer: string | number | boolean;
    solution_steps: SolutionStep[];
    hints: Hint[];
  };
  metadata: {
    difficulty_level: number;
    expected_time_seconds: number;
    actual_avg_time: number;
    points: number;
    tags: string[];
    prerequisites: string[];
    common_errors: CommonError[];
  };
  performance: {
    total_attempts: number;
    success_rate: number;
    avg_hints_used: number;
    abandon_rate: number;
  };
  status: QuestionStatus;
  created_by?: string;
  last_modified_by?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionFilters {
  module_id?: number;
  micro_skill_id?: number;
  status?: QuestionStatus;
  difficulty_level?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateQuestionData {
  module_id: number;
  micro_skill_id: number;
  question_data: {
    text: string;
    type: string;
    options?: string[];
    correct_answer: string | number | boolean;
    solution_steps: SolutionStep[];
    hints?: Hint[];
  };
  metadata: {
    difficulty_level: number;
    expected_time_seconds: number;
    points: number;
    tags?: string[];
    prerequisites?: string[];
    common_errors?: CommonError[];
  };
  status?: QuestionStatus;
}

export interface AuditLog {
  _id: string;
  audit_id: string;
  question_id: string;
  question_code: string;
  action: string;
  admin_id: string;
  admin_name: string;
  changes: Array<{
    field: string;
    old_value: unknown;
    new_value: unknown;
  }>;
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    batch_id?: string;
    reason?: string;
  };
  created_at: string;
}

export interface ImportBatch {
  _id: string;
  batch_id: string;
  admin_id: string;
  admin_name: string;
  file_name: string;
  file_type: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  successful: number;
  failed: number;
  skipped: number;
  import_errors: Array<{ row: number; message: string }>;
  import_warnings: Array<{ row: number; message: string }>;
  created_question_ids: string[];
  validation_summary?: {
    valid: number;
    invalid: number;
    warnings: number;
  };
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface DashboardStats {
  total: number;
  by_status: Record<string, number>;
  by_module: Record<string, number>;
  by_difficulty?: Record<string, number>;
  by_type?: Record<string, number>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ============================================================================
// AUTH SERVICE
// ============================================================================

export const adminAuthService = {
  async login(credentials: { email: string; password: string }) {
    const response = await adminApi.post<AdminLoginResponse>('/auth/login', credentials);
    return response.data;
  },

  async logout() {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    if (refreshToken) {
      try {
        await adminApi.post('/auth/logout', { refresh_token: refreshToken });
      } catch {
        // Ignore logout errors
      }
    }
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
  },

  async getCurrentAdmin() {
    const response = await adminApi.get<{ success: boolean; data: Admin }>('/auth/me');
    return response.data.data;
  },

  async changePassword(data: { current_password: string; new_password: string }) {
    const response = await adminApi.post<{ success: boolean; message: string }>(
      '/auth/change-password',
      data
    );
    return response.data;
  },

  getStoredAdmin(): Admin | null {
    const stored = localStorage.getItem('admin_user');
    return stored ? JSON.parse(stored) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('admin_access_token');
  },
};

// ============================================================================
// QUESTIONS SERVICE
// ============================================================================

export const adminQuestionService = {
  async getQuestions(filters: QuestionFilters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await adminApi.get<PaginatedResponse<Question>>(
      `/questions?${params.toString()}`
    );
    return response.data;
  },

  async getQuestion(questionId: string) {
    const response = await adminApi.get<{ success: boolean; data: { question: Question } }>(
      `/questions/${questionId}`
    );
    return response.data.data.question;
  },

  async createQuestion(data: CreateQuestionData) {
    const response = await adminApi.post<{ success: boolean; data: { question: Question } }>(
      '/questions',
      data
    );
    return response.data.data.question;
  },

  async updateQuestion(questionId: string, data: Partial<CreateQuestionData>) {
    const response = await adminApi.put<{ success: boolean; data: { question: Question } }>(
      `/questions/${questionId}`,
      data
    );
    return response.data.data.question;
  },

  async deleteQuestion(questionId: string) {
    const response = await adminApi.delete<{ success: boolean; message: string }>(
      `/questions/${questionId}`
    );
    return response.data;
  },

  async bulkDeleteQuestionsByMicroSkill(moduleId: number, microSkillId: number, reason?: string) {
    const response = await adminApi.delete<{
      success: boolean;
      message: string;
      data: { deleted_count: number };
    }>('/questions/bulk', {
      data: { module_id: moduleId, micro_skill_id: microSkillId, reason },
    });
    return response.data;
  },

  async updateQuestionStatus(questionId: string, status: QuestionStatus, reason?: string) {
    const response = await adminApi.patch<{ success: boolean; data: { question: Question } }>(
      `/questions/${questionId}/status`,
      { status, reason }
    );
    return response.data.data.question;
  },

  async getQuestionStats() {
    const response = await adminApi.get<{ success: boolean; data: DashboardStats }>(
      '/questions/stats'
    );
    return response.data.data;
  },
};

// ============================================================================
// CURRICULUM SERVICE
// ============================================================================

export interface MicroSkillData {
  id: number;
  name: string;
  description: string;
  estimated_time_minutes: number;
  prerequisites: number[];
}

export interface ModuleData {
  id: number;
  name: string;
  description: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  micro_skills: MicroSkillData[];
}

export interface CurriculumData {
  modules: ModuleData[];
  total_modules: number;
  total_micro_skills: number;
}

export interface CreateModuleData {
  name: string;
  description: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_completion_hours?: number;
}

export interface CreateMicroSkillData {
  name: string;
  description: string;
  estimated_time_minutes?: number;
  prerequisites?: number[];
}

export const adminCurriculumService = {
  async getCurriculum(): Promise<CurriculumData> {
    const response = await adminApi.get<{ success: boolean; data: CurriculumData }>(
      '/curriculum'
    );
    return response.data.data;
  },

  async createModule(data: CreateModuleData): Promise<ModuleData> {
    const response = await adminApi.post<{
      success: boolean;
      data: { module: ModuleData };
    }>('/curriculum/modules', data);
    return response.data.data.module;
  },

  async createMicroSkill(moduleId: number, data: CreateMicroSkillData): Promise<MicroSkillData> {
    const response = await adminApi.post<{
      success: boolean;
      data: { micro_skill: MicroSkillData; module_id: number };
    }>(`/curriculum/modules/${moduleId}/micro-skills`, data);
    return response.data.data.micro_skill;
  },

  async seedCurriculum(): Promise<{ total_modules: number; total_micro_skills: number }> {
    const response = await adminApi.post<{
      success: boolean;
      data: { total_modules: number; total_micro_skills: number };
    }>('/curriculum/seed');
    return response.data.data;
  },
};

// ============================================================================
// AUDIT SERVICE
// ============================================================================

export const adminAuditService = {
  async getAuditLogs(filters: {
    question_id?: string;
    admin_id?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (filters.limit) params.append('limit', String(filters.limit));

    // Use the recent activity endpoint
    const response = await adminApi.get<{ success: boolean; data: AuditLog[] }>(
      `/audit/recent?${params.toString()}`
    );

    // Transform to match expected format
    const data = response.data.data || [];
    return {
      success: true,
      data: data,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 50,
        total: data.length,
        total_pages: 1,
      },
    };
  },

  async getQuestionHistory(questionId: string) {
    const response = await adminApi.get<{ success: boolean; data: AuditLog[] }>(
      `/audit/questions/${questionId}`
    );
    return response.data.data || [];
  },
};

// ============================================================================
// IMPORT SERVICE
// ============================================================================

export const adminImportService = {
  async validateImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await adminApi.post<{
      success: boolean;
      data: {
        batch_id: string;
        valid_count: number;
        invalid_count: number;
        warnings_count: number;
        errors: Array<{ row: number; errors: string[] }>;
        warnings: Array<{ row: number; warnings: string[] }>;
      };
    }>('/import/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async processImport(batchId: string) {
    const response = await adminApi.post<{
      success: boolean;
      message: string;
      data: { batch_id: string };
    }>(`/import/${batchId}/process`);
    return response.data;
  },

  async getImportProgress(batchId: string) {
    const response = await adminApi.get<{
      success: boolean;
      data: {
        batch_id: string;
        status: string;
        progress_percentage: number;
        processed_rows: number;
        total_rows: number;
        successful: number;
        failed: number;
        skipped: number;
        errors: Array<{ row: number; message: string }>;
        is_complete: boolean;
      };
    }>(`/import/${batchId}/progress`);
    return response.data.data;
  },

  async getImportHistory(limit: number = 20) {
    const response = await adminApi.get<{
      success: boolean;
      data: { imports: ImportBatch[] };
    }>(`/import/history?limit=${limit}`);
    return response.data.data.imports;
  },

  async rollbackImport(batchId: string) {
    const response = await adminApi.post<{
      success: boolean;
      message: string;
      data: { rolled_back_count: number };
    }>(`/import/${batchId}/rollback`);
    return response.data;
  },
};

// ============================================================================
// ADMIN MANAGEMENT SERVICE (Super Admin Only)
// ============================================================================

export const adminManagementService = {
  async getAdmins() {
    const response = await adminApi.get<{
      success: boolean;
      data: { admins: Admin[] };
    }>('/admins');
    return response.data.data.admins;
  },

  async createAdmin(data: {
    name: string;
    email: string;
    password: string;
    role: AdminRole;
  }) {
    const response = await adminApi.post<{
      success: boolean;
      data: { admin: Admin };
    }>('/admins', data);
    return response.data.data.admin;
  },

  async updateAdmin(adminId: string, data: Partial<{ name: string; role: AdminRole; is_active: boolean }>) {
    const response = await adminApi.put<{
      success: boolean;
      data: { admin: Admin };
    }>(`/admins/${adminId}`, data);
    return response.data.data.admin;
  },

  async deleteAdmin(adminId: string) {
    const response = await adminApi.delete<{
      success: boolean;
      message: string;
    }>(`/admins/${adminId}`);
    return response.data;
  },
};
