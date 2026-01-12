# Analytics API Architecture

**Senior Backend Developer - Technical Design**
**Date:** January 9, 2026

---

## 🎯 Design Goals

1. **Separation of Concerns**: Analytics separate from practice logic
2. **Scalability**: Support future analytics features
3. **Performance**: Efficient queries, optional caching
4. **Security**: User can only access their own analytics
5. **Flexibility**: Module-level and global analytics

---

## 📡 API Endpoint Structure

### Base Route
```
/api/v1/analytics/*
```

### Endpoint Organization

#### **Confidence Analytics**
```
GET /api/v1/analytics/confidence
GET /api/v1/analytics/confidence/history
GET /api/v1/analytics/confidence/by-skill
```

#### **Time Analytics**
```
GET /api/v1/analytics/time/speed-accuracy
GET /api/v1/analytics/time/time-of-day
GET /api/v1/analytics/time/fatigue/:session_id
GET /api/v1/analytics/time/difficulty-analysis
GET /api/v1/analytics/time/recommendations
```

---

## 🏗️ Architecture Layers

```
Client Request
    ↓
analytics.routes.ts (Route definitions + validation)
    ↓
auth.middleware.ts (Verify JWT, extract user_id)
    ↓
analytics.controller.ts (Request handling, response formatting)
    ↓
confidenceScoring.service.ts | timeAnalytics.service.ts
    ↓
Database Models (Session, TimeAnalytics)
    ↓
Response to Client
```

---

## 📋 Detailed Endpoint Specifications

### 1. GET /api/v1/analytics/confidence

**Purpose:** Overall confidence analytics for user

**Query Parameters:**
- `module_id` (optional): Filter by specific module
- `lookback_sessions` (optional, default: 20): Number of recent sessions

**Request Example:**
```
GET /api/v1/analytics/confidence?module_id=1&lookback_sessions=10
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "avg_confidence": 72.5,
      "total_questions_analyzed": 150,
      "trend": "improving",
      "sessions_analyzed": 10
    },
    "distribution": {
      "high_confidence": 45,
      "medium_confidence": 80,
      "low_confidence": 25
    },
    "by_module": [
      {
        "module_id": 1,
        "module_name": "Speed Addition",
        "avg_confidence": 75.2,
        "questions_count": 50
      }
    ],
    "recent_trend": [
      { "session_id": "SES_001", "avg_confidence": 68.5, "date": "2026-01-08" },
      { "session_id": "SES_002", "avg_confidence": 75.0, "date": "2026-01-09" }
    ]
  }
}
```

---

### 2. GET /api/v1/analytics/confidence/by-skill

**Purpose:** Confidence breakdown by micro-skill

**Query Parameters:**
- `module_id` (optional): Filter by module
- `lookback_sessions` (optional, default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "micro_skill_id": 1,
        "micro_skill_name": "2-Digit Addition",
        "avg_confidence": 82.3,
        "questions_count": 30,
        "confidence_category": "high"
      },
      {
        "micro_skill_id": 2,
        "micro_skill_name": "3-Digit Addition",
        "avg_confidence": 58.2,
        "questions_count": 25,
        "confidence_category": "medium"
      }
    ]
  }
}
```

---

### 3. GET /api/v1/analytics/time/speed-accuracy

**Purpose:** Correlation between speed and accuracy

**Query Parameters:**
- `module_id` (optional)
- `lookback_sessions` (optional, default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "correlation": -0.45,
    "interpretation": "Strong negative correlation: Rushing significantly reduces accuracy",
    "recommendation": "Slow down and take more time to think through problems",
    "pace_distribution": {
      "rushed": 35,
      "optimal": 85,
      "slow": 30
    },
    "sample_size": 150
  }
}
```

---

### 4. GET /api/v1/analytics/time/time-of-day

**Purpose:** Best/worst practice hours

**Query Parameters:**
- `module_id` (optional)
- `lookback_days` (optional, default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "best_hours": [
      { "hour": 9, "accuracy": 0.85, "avg_confidence": 0.78, "sample_size": 5 },
      { "hour": 10, "accuracy": 0.82, "avg_confidence": 0.75, "sample_size": 4 },
      { "hour": 15, "accuracy": 0.80, "avg_confidence": 0.72, "sample_size": 3 }
    ],
    "worst_hours": [
      { "hour": 23, "accuracy": 0.55, "avg_confidence": 0.48, "sample_size": 2 },
      { "hour": 22, "accuracy": 0.62, "avg_confidence": 0.52, "sample_size": 3 }
    ],
    "recommendation": "Your performance is significantly better at 9 AM, 10 AM. Schedule practice sessions during these hours for optimal results.",
    "hourly_data": [
      { "hour": 9, "accuracy": 0.85, "avg_confidence": 0.78, "sample_size": 5 },
      { "hour": 10, "accuracy": 0.82, "avg_confidence": 0.75, "sample_size": 4 }
    ]
  }
}
```

---

### 5. GET /api/v1/analytics/time/fatigue/:session_id

**Purpose:** Fatigue detection for specific session

**Parameters:**
- `session_id` (required, in URL)

**Response:**
```json
{
  "success": true,
  "data": {
    "fatigue_detected": true,
    "onset_question_number": 6,
    "first_half_accuracy": 0.85,
    "second_half_accuracy": 0.55,
    "accuracy_drop_percentage": 35.3,
    "first_half_avg_time": 45.2,
    "second_half_avg_time": 62.8,
    "time_increase_percentage": 38.9,
    "recommendation": "Fatigue detected! Your accuracy dropped by 35.3% and you slowed down by 38.9% in the second half. Take a 10-minute break every 5 questions."
  }
}
```

---

### 6. GET /api/v1/analytics/time/difficulty-analysis

**Purpose:** Time allocation across difficulty levels

**Query Parameters:**
- `module_id` (optional)
- `lookback_sessions` (optional, default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "difficulty_levels": [
      {
        "difficulty": 1,
        "avg_time_taken": 35.2,
        "expected_time": 40.0,
        "time_ratio": 0.88,
        "questions_count": 15
      },
      {
        "difficulty": 5,
        "avg_time_taken": 85.5,
        "expected_time": 60.0,
        "time_ratio": 1.43,
        "questions_count": 20
      }
    ],
    "overallocated_levels": [5, 6],
    "underallocated_levels": [1, 2],
    "recommendation": "You're spending significantly more time than expected on difficulty levels 5, 6. These may need more focused practice or conceptual review."
  }
}
```

---

### 7. GET /api/v1/analytics/time/recommendations

**Purpose:** Combined time-based recommendations

**Query Parameters:**
- `module_id` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "primary_recommendation": "Your performance is 20% better at 9 AM! Schedule practice sessions during this hour for optimal results.",
    "insights": [
      "Strong negative correlation: Rushing significantly reduces accuracy",
      "Significant performance variation by time of day (25% difference)",
      "Time allocation could be optimized across difficulty levels"
    ],
    "actions": [
      "Slow down and take more time to think through problems",
      "Schedule practice sessions at 9 AM for best results",
      "Spend less time on difficulty levels 5, 6 - review concepts first"
    ],
    "priority": "high"
  }
}
```

---

## 🔒 Security & Validation

### Authentication
- All endpoints require JWT authentication
- Extract `user_id` from token
- Users can ONLY access their own analytics

### Input Validation
```typescript
// Query parameter validation
module_id: number (optional, 0-20)
lookback_sessions: number (optional, 1-100, default: 20)
lookback_days: number (optional, 1-365, default: 30)
session_id: string (required for fatigue endpoint)
```

### Error Handling
- 401: Unauthorized (invalid/missing token)
- 400: Bad Request (invalid parameters)
- 404: Not Found (session doesn't exist or doesn't belong to user)
- 500: Internal Server Error (with logged details)

---

## 📁 File Structure

```
src/
├── routes/
│   └── analytics.routes.ts          # NEW - Route definitions
├── controllers/
│   └── analytics.controller.ts      # NEW - Request handlers
├── services/
│   ├── confidenceScoring.service.ts # EXISTS - Add analytics functions
│   └── timeAnalytics.service.ts     # EXISTS - Already has functions
├── middlewares/
│   └── auth.middleware.ts           # EXISTS - Reuse for authentication
└── validators/
    └── analytics.validator.ts       # NEW - Request validation (optional)
```

---

## 🚀 Implementation Plan

### Phase 1: Setup (5 min)
1. Create `analytics.routes.ts`
2. Create `analytics.controller.ts`
3. Register routes in `server.ts`

### Phase 2: Confidence Endpoints (15 min)
1. Implement `getConfidenceAnalytics` controller
2. Implement `getConfidenceBySkill` controller
3. Add helper functions to confidence service if needed

### Phase 3: Time Analytics Endpoints (20 min)
1. Implement all 5 time analytics controllers
2. Wire up existing service functions
3. Add error handling and logging

### Phase 4: Testing (10 min)
1. Test each endpoint with Postman/curl
2. Verify authentication works
3. Check response formats
4. Test error cases

**Total Estimated Time: 50 minutes**

---

## 🧪 Testing Strategy

### Manual Testing Checklist
- [ ] All endpoints return 401 without auth token
- [ ] All endpoints return valid data with auth token
- [ ] Module filtering works correctly
- [ ] Lookback parameters work
- [ ] Error messages are user-friendly
- [ ] Response times < 500ms
- [ ] No sensitive data leaks

### Test Users
- `rahul.sharma@testmail.com` (has session history)
- Test with different modules
- Test with no history (new user)

---

## 💡 Performance Considerations

### Optimization Strategies
1. **Database Indexes**: Ensure indexes on `user_id`, `module_id`, `completed_at`
2. **Query Limits**: Default lookback limits prevent excessive data loading
3. **Async Processing**: Time analytics updates run in background
4. **Caching** (Future): Redis cache for expensive calculations

### Expected Performance
- Confidence analytics: < 200ms
- Time analytics: < 300ms
- Fatigue detection: < 100ms (single session)

---

## 📝 API Documentation

Will be added to:
- Postman collection: `Coachify_API.postman_collection.json`
- README API section
- Swagger/OpenAPI spec (future)

---

**Ready for implementation! Let's build this step by step.** 🚀
