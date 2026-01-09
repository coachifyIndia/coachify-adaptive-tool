
// This service provides mock data for the advanced dashboard layout
// satisfying the 4-layer requirement: Performance, Diagnosis, Adaptivity, Motivation

export const MOCK_DASHBOARD_DATA = {
  // Layer 1: Core Performance Metrics
  performance: {
    accuracy: {
      overall: 78,
      trend: "+4.5%", // vs last 7 days
      byDifficulty: {
        easy: 92,
        medium: 75,
        hard: 45
      }
    },
    speed: {
      avgTimePerQuestion: 45, // seconds
      idealTimeDifference: -5, // 5 seconds faster than ideal
      matrix: {
        fastCorrect: 60, // %
        fastWrong: 15,
        slowCorrect: 20,
        slowWrong: 5
      }
    },
    consistency: {
      score: 85,
      currentStreak: 4, // days
      bestStreak: 12,
      varianceIndex: 0.12 // Low variance is good
    }
  },

  // Layer 2: Learning Diagnosis
  diagnosis: {
    mastery: {
      mastered: 4,
      learning: 6,
      notStarted: 10,
      topicMap: [
        { id: 1, name: "Speed Addition", status: "Mastered", score: 95 },
        { id: 2, name: "Speed Subtraction", status: "Mastered", score: 92 },
        { id: 3, name: "Speed Multiplication", status: "Learning", score: 68 },
        { id: 4, name: "Speed Division", status: "Learning", score: 55 },
        { id: 5, name: "Squaring Techniques", status: "Not Started", score: 0 },
        // ... more topics
      ]
    },
    errorIntelligence: {
      breakdown: [
        { type: "Calculation Error", percentage: 45, trend: "decreasing" },
        { type: "Conceptual Error", percentage: 30, trend: "stable" },
        { type: "Time Pressure", percentage: 15, trend: "increasing" },
        { type: "Interpretation", percentage: 10, trend: "decreasing" }
      ],
      repeatedMistakeIndex: 2.4 // Avg times same mistake repeated
    },
    retention: {
      retentionScore: 72,
      decayRiskItems: 3, // Number of topics needing revision
      curveData: [
        { day: 1, retention: 100 },
        { day: 3, retention: 80 },
        { day: 7, retention: 60 },
        { day: 14, retention: 75 }, // bump due to revision
        { day: 30, retention: 70 }
      ]
    }
  },

  // Layer 3: Adaptivity & Recommendations
  adaptivity: {
    nextBestAction: {
      type: "practice",
      title: "Speed Multiplication: Criss-Cross Method",
      reason: "High error rate in recent attempts. Quick fix possible.",
      predictedImprovement: "+5% Accuracy"
    },
    strengthRadar: {
      strong: ["Mental Math", "Addition"],
      weak: ["Division", "Fractions"],
      danger: ["Multiplication"] // High accuracy but slow/volatile
    },
    prediction: {
      currentExpectedScore: 720,
      projectedScore: 780, // if recommended actions taken
      velocity: "Accelerating"
    }
  },

  // Layer 4 & 5: Motivation & Control
  motivation: {
    dailyGoalProgress: 80, // %
    xp: 2450,
    level: 5,
    badges: [
      { name: "Speed Demon", icon: "⚡" },
      { name: "Consistency King", icon: "👑" }
    ],
    transparencyMSG: "We're focusing on Multiplication today because your speed dropped by 15% in the last session."
  }
};

export const getDashboardData = () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_DASHBOARD_DATA), 800);
    });
};
