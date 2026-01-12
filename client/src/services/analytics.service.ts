import api from './api';

export const analyticsService = {
  // Confidence Analytics
  async getOverallConfidence() {
    const response = await api.get('/analytics/confidence');
    return response.data;
  },

  async getConfidenceBySkill() {
    const response = await api.get('/analytics/confidence/by-skill');
    return response.data;
  },

  // Time Analytics
  async getSpeedAccuracyCorrelation() {
    const response = await api.get('/analytics/time/speed-accuracy');
    return response.data;
  },

  async getTimeOfDay() {
    const response = await api.get('/analytics/time/time-of-day');
    return response.data;
  },

  async getFatigueDetection(sessionId: string) {
    const response = await api.get(`/analytics/time/fatigue/${sessionId}`);
    return response.data;
  },

  async getDifficultyAnalysis() {
    const response = await api.get('/analytics/time/difficulty-analysis');
    return response.data;
  },

  async getRecommendations() {
    const response = await api.get('/analytics/time/recommendations');
    return response.data;
  },
};
