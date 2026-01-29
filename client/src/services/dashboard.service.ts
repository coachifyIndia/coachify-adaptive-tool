/**
 * DASHBOARD SERVICE
 *
 * Client-side service for fetching real dashboard data from the backend.
 * Replaces the mock dashboard service for production use.
 */

import api from './api';

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardPerformance {
  accuracy: {
    overall: number;
    trend: string;
    byDifficulty: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
  speed: {
    avgTimePerQuestion: number;
    idealTimeDifference: number;
  };
  consistency: {
    score: number;
    currentStreak: number;
    bestStreak: number;
  };
}

export interface DashboardDiagnosis {
  mastery: {
    mastered: number;
    learning: number;
    notStarted: number;
    topicMap: Array<{
      id: number;
      name: string;
      status: string;
      score: number;
    }>;
  };
  errorIntelligence: {
    breakdown: Array<{
      type: string;
      percentage: number;
      trend: string;
    }>;
  };
  retention: {
    retentionScore: number;
    decayRiskItems: number;
  };
}

export interface DashboardAdaptivity {
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
}

export interface DashboardMotivation {
  dailyGoalProgress: number;
  xp: number;
  level: number;
  badges: Array<{ name: string; icon: string }>;
  transparencyMSG: string;
}

export interface DashboardData {
  performance: DashboardPerformance;
  diagnosis: DashboardDiagnosis;
  adaptivity: DashboardAdaptivity;
  motivation: DashboardMotivation;
  meta?: {
    sessionsAnalyzed: number;
    questionsAnalyzed: number;
    lastUpdated: string;
  };
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  practiceDaysLast30: number;
  recentPracticeDays: string[];
}

export interface AccuracyByDifficultyData {
  byLevel: Array<{
    difficulty: number;
    accuracy: number;
    totalQuestions: number;
    correctAnswers: number;
    avgTimeSeconds: number;
  }>;
  grouped: {
    easy: { accuracy: number; totalQuestions: number };
    medium: { accuracy: number; totalQuestions: number };
    hard: { accuracy: number; totalQuestions: number };
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get complete dashboard summary with all real data
 */
export async function getDashboardSummary(): Promise<DashboardData> {
  const response = await api.get('/dashboard/summary');
  return response.data.data;
}

/**
 * Get user streak information
 */
export async function getUserStreak(): Promise<StreakData> {
  const response = await api.get('/dashboard/streak');
  return response.data.data;
}

/**
 * Get accuracy breakdown by difficulty level
 */
export async function getAccuracyByDifficulty(moduleId?: number): Promise<AccuracyByDifficultyData> {
  const params = moduleId !== undefined ? { module_id: moduleId } : {};
  const response = await api.get('/dashboard/accuracy-by-difficulty', { params });
  return response.data.data;
}

// ============================================================================
// DASHBOARD SERVICE OBJECT
// ============================================================================

export const dashboardService = {
  getDashboardSummary,
  getUserStreak,
  getAccuracyByDifficulty,
};

export default dashboardService;
