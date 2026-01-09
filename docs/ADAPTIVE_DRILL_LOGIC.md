# Adaptive Drill Recommendation Logic

## Overview

The Adaptive Drill system is the core of Coachify's personalized learning engine. It dynamically adjusts difficulty levels and question allocation based on individual student performance, ensuring optimal learning progression.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Difficulty Adaptation Algorithm](#difficulty-adaptation-algorithm)
3. [Dynamic Question Allocation](#dynamic-question-allocation)
4. [Question Repetition Prevention](#question-repetition-prevention)
5. [Examples & Scenarios](#examples--scenarios)
6. [Technical Implementation](#technical-implementation)

---

## Core Principles

The adaptive system operates on three fundamental principles:

### 1. **Performance-Based Difficulty Adjustment**
- Students who perform well move to harder questions quickly
- Students who struggle receive easier questions immediately
- Adjustments are based on overall skill performance, not individual questions

### 2. **Mastery-Based Resource Allocation**
- More practice time is allocated to skills that need improvement
- Mastered skills receive minimal maintenance questions
- Focus shifts dynamically as students progress

### 3. **No Question Repetition**
- Students never see the same question twice across all drills
- Ensures fresh content and prevents memorization
- Maintains engagement and accurate assessment

---

## Difficulty Adaptation Algorithm

### How It Works

After each completed drill, the system analyzes performance for each micro-skill and adjusts the difficulty for the next drill.

### Performance Thresholds

| Accuracy | Performance Level | Difficulty Adjustment | Rationale |
|----------|------------------|----------------------|-----------|
| **100%** | Perfect | **+3 levels** | Student has mastered current difficulty; accelerate progression |
| **85-99%** | Excellent | **+2 levels** | Strong performance; increase challenge significantly |
| **75-84%** | Good | **+1 level** | Solid performance; gradual progression |
| **60-74%** | Adequate | **No change** | Maintain current difficulty for consolidation |
| **40-59%** | Struggling | **-1 level** | Reduce difficulty slightly to build confidence |
| **0-39%** | Poor | **Reset to Level 1** | Fundamental gaps; restart from basics |

### Calculation Details

```
Base Difficulty = Average difficulty of questions attempted in last drill
Accuracy = (Correct Answers / Total Questions) × 100
New Difficulty = Base Difficulty + Adjustment
Final Difficulty = Clamp(New Difficulty, 1, 10)  // Keep within bounds
```

### Example Progression

**Student: Sarah | Micro-skill: 2 Digit Addition**

| Drill | Questions | Difficulty | Accuracy | Adjustment | Next Difficulty |
|-------|-----------|------------|----------|------------|-----------------|
| 1 | 4 questions | [3, 3, 3, 3] | 100% | +3 | 6 |
| 2 | 2 questions | [6, 6] | 100% | +3 | 9 |
| 3 | 2 questions | [9, 9] | 50% | -1 | 8 |
| 4 | 2 questions | [8, 8] | 100% | +3 | 10 (max) |

**Key Insight:** Sarah jumped from difficulty 3 to 9 in just 3 drills because of consistent perfect performance. This accelerated learning prevents boredom and maximizes engagement.

---

## Dynamic Question Allocation

### The Problem

Traditional systems give equal practice to all skills, wasting time on mastered content while under-serving struggling areas.

### Our Solution

Dynamically allocate more questions to skills that need practice, fewer to mastered skills.

### Mastery Classification

The system analyzes the **last 2-3 completed drills** to classify each skill:

#### **MASTERED Skills**
- **Criteria:** Average accuracy ≥ 90% AND minimum accuracy ≥ 85%
- **Allocation Weight:** 0.3× (30% of normal)
- **Question Count:** ~1-2 questions per drill
- **Goal:** Maintenance only; prevent skill decay

#### **STRUGGLING Skills**
- **Criteria:** Average accuracy < 50%
- **Allocation Weight:** 1.5× (150% of normal)
- **Question Count:** ~4-5 questions per drill
- **Goal:** Intensive practice to build proficiency

#### **DEVELOPING Skills**
- **Criteria:** Average accuracy 50-89%
- **Allocation Weight:** 1.0× (100% of normal)
- **Question Count:** ~3 questions per drill
- **Goal:** Standard practice for steady improvement

### Allocation Formula

```
For a 10-question drill with 3 skills:

Step 1: Calculate allocation weights
  Skill A (Mastered):    Weight = 0.3
  Skill B (Struggling):  Weight = 1.5
  Skill C (Developing):  Weight = 1.0
  Total Weight = 2.8

Step 2: Calculate proportions
  Skill A: 0.3 / 2.8 = 10.7% → 1 question
  Skill B: 1.5 / 2.8 = 53.6% → 5 questions
  Skill C: 1.0 / 2.8 = 35.7% → 4 questions

Step 3: Verify total = 10 questions ✓
```

### Example: Before vs After

**Student: Rahul | Module: Speed Addition (10 questions/drill)**

**WITHOUT Dynamic Allocation:**
```
Drill 1-4 (Fixed Distribution):
  - Micro-skill 1 (2 Digit Numbers): 4 questions [Accuracy: 100%, 100%, 100%, 100%]
  - Micro-skill 2 (3 Digit Numbers): 3 questions [Accuracy: 0%, 0%, 0%, 0%]
  - Micro-skill 3 (4 Digit Numbers): 3 questions [Accuracy: 0%, 33%, 0%, 0%]

Problem: 16 questions wasted on mastered skill!
```

**WITH Dynamic Allocation:**
```
Drill 5 (Adaptive Distribution):
  - Micro-skill 1 (2 Digit Numbers): 1 question   [MASTERED → Minimal maintenance]
  - Micro-skill 2 (3 Digit Numbers): 5 questions  [STRUGGLING → Intensive practice]
  - Micro-skill 3 (4 Digit Numbers): 4 questions  [STRUGGLING → Focused practice]

Result: 9 questions focused on weak areas!
```

**Impact:** 80% more practice time allocated to skills that actually need it.

---

## Question Repetition Prevention

### Strategy

**Global Exclusion List:** The system maintains a list of ALL question IDs attempted in previous drills and excludes them from selection.

### Implementation

```javascript
// Collect all previously attempted questions
const previousQuestions = [];
for (const drill of completedDrills) {
  for (const question of drill.questions) {
    previousQuestions.push(question.question_id);
  }
}

// Select new questions excluding all previous attempts
const newQuestion = await QuestionModel.findOne({
  module_id: moduleId,
  micro_skill_id: skillId,
  'metadata.difficulty_level': targetDifficulty,
  _id: { $nin: previousQuestions }  // Exclude all previous
});
```

### Fallback Logic

If no questions are available at the target difficulty (already attempted all):

1. **Find lowest available difficulty** for this skill
2. **Select unattempted question** at that difficulty
3. **Log the substitution** for transparency

This ensures students always get fresh content even if the question bank is limited.

---

## Examples & Scenarios

### Scenario 1: Fast Learner

**Student:** Alex (Strong math skills)
**Module:** Speed Addition

| Drill | MS1 Allocation | MS1 Difficulty | MS1 Accuracy | MS2 Allocation | MS2 Difficulty | MS2 Accuracy |
|-------|----------------|----------------|--------------|----------------|----------------|--------------|
| 1 | 5 questions | Diff 1 | 100% | 5 questions | Diff 1 | 100% |
| 2 | 2 questions | Diff 4 (+3) | 100% | 2 questions | Diff 4 (+3) | 100% |
| 3 | 1 question | Diff 7 (+3) | 100% | 1 question | Diff 7 (+3) | 100% |
| 4 | 1 question | Diff 10 (+3) | 100% | 1 question | Diff 10 (+3) | 100% |

**Outcome:** Reached maximum difficulty in 4 drills. System now focuses on other modules.

---

### Scenario 2: Uneven Skills

**Student:** Priya (Strong at simple, weak at complex)
**Module:** Speed Addition

| Drill | MS1 (2-Digit) | MS2 (3-Digit) | MS3 (4-Digit) |
|-------|---------------|---------------|---------------|
| 1 | 3 questions, Diff 3, 100% | 4 questions, Diff 3, 75% | 3 questions, Diff 3, 33% |
| 2 | 2 questions, Diff 6 (+3) [MASTERED] | 4 questions, Diff 4 (+1) [DEVELOPING] | 4 questions, Diff 1 (reset) [STRUGGLING] |
| 3 | 1 question, Diff 9 (+3) [MASTERED] | 3 questions, Diff 5 (+1) [DEVELOPING] | 6 questions, Diff 2 (+1) [STRUGGLING] |

**Outcome:**
- MS1: Mastered quickly, minimal maintenance
- MS3: 6 questions focused practice in Drill 3
- Efficient resource allocation based on need

---

### Scenario 3: Consistent Struggle

**Student:** Kiran (Needs fundamental support)
**Module:** Speed Addition

| Drill | All Skills Difficulty | All Skills Accuracy | System Response |
|-------|----------------------|---------------------|-----------------|
| 1 | Diff 3 | 20% | Reset ALL to Diff 1 (poor performance) |
| 2 | Diff 1 | 40% | Maintain Diff 1 (struggling) |
| 3 | Diff 1 | 60% | Maintain Diff 1 (adequate) |
| 4 | Diff 1 | 80% | Increase to Diff 2 (good) |
| 5 | Diff 2 | 90% | Increase to Diff 4 (excellent) |

**Outcome:** Student builds strong foundation before advancing. No artificial acceleration.

---

## Technical Implementation

### Location
```
File: src/services/questionSelection.service.ts
Function: selectAdaptiveDrillQuestions()
Lines: 574-852
```

### Key Components

#### 1. Performance Analysis (Lines 622-686)
```typescript
// Analyze last drill for each micro-skill
for (const msId of microSkillIds) {
  const skillQuestions = lastSession.questions.filter(q => q.micro_skill_id === msId);
  const accuracy = correctAnswers / totalQuestions;

  // Apply graduated difficulty adjustment
  if (accuracy === 1.0) adjustment = 3;
  else if (accuracy >= 0.85) adjustment = 2;
  else if (accuracy >= 0.75) adjustment = 1;
  else if (accuracy >= 0.60) adjustment = 0;
  else if (accuracy >= 0.40) adjustment = -1;
  else difficulty = 1; // Reset

  skillDifficulties[msId] = difficulty;
}
```

#### 2. Dynamic Allocation (Lines 694-769)
```typescript
// Analyze last 2-3 drills for mastery classification
for (const msId of microSkillIds) {
  const recentAccuracies = []; // Last 2-3 drill accuracies
  const avgAccuracy = average(recentAccuracies);
  const minAccuracy = min(recentAccuracies);

  if (avgAccuracy >= 0.90 && minAccuracy >= 0.85) {
    allocationWeight = 0.3; // MASTERED
  } else if (avgAccuracy < 0.50) {
    allocationWeight = 1.5; // STRUGGLING
  } else {
    allocationWeight = 1.0; // DEVELOPING
  }
}

// Convert weights to actual question counts
skillQuestionCounts = calculateProportions(allocationWeights, totalQuestions);
```

#### 3. Question Selection (Lines 775-843)
```typescript
// Select questions for each skill based on allocation
for (const msId of microSkillIds) {
  const targetCount = skillQuestionCounts[msId];

  for (let i = 0; i < targetCount; i++) {
    const question = await QuestionModel.findOne({
      module_id,
      micro_skill_id: msId,
      'metadata.difficulty_level': targetDifficulty,
      _id: { $nin: allPreviousQuestionIds } // No repetition
    });

    selectedQuestions.push(question);
  }
}
```

### Database Schema

**Session Document:**
```javascript
{
  session_id: "SES_123456",
  user_id: "USR_8370962",
  session_type: "drill",
  module_id: 1,
  questions: [
    {
      question_id: ObjectId("..."),
      micro_skill_id: 1,
      difficulty: 3,
      is_correct: true,
      time_taken_seconds: 25
    }
  ],
  completed_at: ISODate("2026-01-05T...")
}
```

### Performance Considerations

**Time Complexity:** O(n × m × log q)
- n = number of micro-skills (~3-5)
- m = questions per skill (~1-5)
- q = questions in database (~100-1000 per skill)

**Database Queries:**
- 1 query to fetch completed drills
- 1 aggregation to get micro-skill names
- n × m queries to select questions (with indexed lookups)

**Optimization:** Uses MongoDB indexes on `module_id`, `micro_skill_id`, and `metadata.difficulty_level` for fast retrieval.

---

## Configuration & Tuning

### Adjustable Parameters

```typescript
// In questionSelection.service.ts

// Difficulty adjustment increments
const PERFECT_INCREASE = 3;      // 100% accuracy
const EXCELLENT_INCREASE = 2;    // 85-99%
const GOOD_INCREASE = 1;         // 75-84%
const STRUGGLING_DECREASE = -1;  // 40-59%
const POOR_RESET = 1;            // 0-39%

// Allocation weights
const MASTERED_WEIGHT = 0.3;     // Reduce to 30%
const STRUGGLING_WEIGHT = 1.5;   // Increase to 150%
const DEVELOPING_WEIGHT = 1.0;   // Standard

// Mastery thresholds
const MASTERY_AVG_THRESHOLD = 0.90;    // 90% average
const MASTERY_MIN_THRESHOLD = 0.85;    // 85% minimum
const STRUGGLE_THRESHOLD = 0.50;       // <50% average

// Analysis window
const RECENT_DRILLS_TO_ANALYZE = 3;    // Last 3 drills
```

### Testing & Validation

**Unit Tests:** `tests/services/questionSelection.test.ts`
- Test difficulty progression for each accuracy band
- Test allocation weight calculation
- Test question exclusion logic

**Integration Tests:** `tests/integration/adaptiveDrill.test.ts`
- Test full drill flow with multiple students
- Verify no question repetition across drills
- Validate mastery classification

---

## Future Enhancements

### Planned Features

1. **Multi-Dimensional Adaptation**
   - Adapt not just difficulty, but also question types
   - Introduce conceptual vs computational question balance

2. **Decay Factor**
   - Gradually increase difficulty of mastered skills over time
   - Prevent long-term skill degradation

3. **Cross-Module Intelligence**
   - Transfer learning insights across related modules
   - "Student struggled with 3-digit addition, recommend 2-digit review"

4. **Personalized Thresholds**
   - Learn individual student patterns
   - Adjust thresholds based on historical performance trends

5. **Confidence Scoring**
   - Track time spent per question
   - Distinguish confident correct answers from lucky guesses

---

## Appendix: Math Behind the Algorithm

### Weighted Allocation Formula

Given:
- n skills with weights w₁, w₂, ..., wₙ
- Total questions Q

Calculate questions per skill:

```
Total Weight W = Σ wᵢ
Proportion for skill i: pᵢ = wᵢ / W
Questions for skill i: qᵢ = round(Q × pᵢ)

Constraint: Σ qᵢ = Q (adjust for rounding errors)
```

### Difficulty Progression Model

```
Dₜ₊₁ = Clamp(Dₜ + f(Aₜ), Dₘᵢₙ, Dₘₐₓ)

Where:
- Dₜ = Difficulty at drill t
- Aₜ = Accuracy at drill t
- f(A) = Adjustment function:
    f(A) = { 3,  if A = 1.0
           { 2,  if A ≥ 0.85
           { 1,  if A ≥ 0.75
           { 0,  if A ≥ 0.60
           {-1,  if A ≥ 0.40
           { reset to 1, if A < 0.40
- Dₘᵢₙ = 1, Dₘₐₓ = 10
```

---

## Contact & Support

For questions or suggestions about the adaptive algorithm:
- **Technical Lead:** Shivam Joshi
- **Documentation:** `/docs/ADAPTIVE_DRILL_LOGIC.md`
- **Implementation:** `/src/services/questionSelection.service.ts`

---

**Last Updated:** January 5, 2026
**Version:** 2.0
**Status:** Production (Enhanced with Dynamic Allocation)
