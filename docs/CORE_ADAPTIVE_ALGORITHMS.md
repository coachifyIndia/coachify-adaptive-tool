# Core Adaptive Learning Algorithms

**Coachify Adaptive Learning Engine - Complete Algorithm Documentation**
**Date:** January 9, 2026

---

## 📋 Table of Contents

1. [Phase 1: Adaptive Drill Logic](#phase-1-adaptive-drill-logic)
   - [Algorithm 1: Difficulty Adaptation](#algorithm-1-difficulty-adaptation)
   - [Algorithm 2: Dynamic Question Allocation](#algorithm-2-dynamic-question-allocation)
   - [Algorithm 3: Question Repetition Prevention](#algorithm-3-question-repetition-prevention)
2. [Phase 2: Intelligence Layer](#phase-2-intelligence-layer)
   - [Algorithm 4: Confidence Scoring](#algorithm-4-confidence-scoring)
   - [Algorithm 5: Time Analytics](#algorithm-5-time-analytics)
3. [Complete Question Selection Flow](#complete-question-selection-flow)

---

## Phase 1: Adaptive Drill Logic

Phase 1 implements the core adaptive behavior that personalizes question difficulty and distribution based on student performance.

---

### Algorithm 1: Difficulty Adaptation

**Purpose:** Adjust question difficulty for each micro-skill based on previous session performance.

#### Input
- **Last Session Data:** Questions attempted, correctness, difficulty levels
- **Current Micro-Skill:** Skill to determine difficulty for

#### Output
- **Target Difficulty:** Integer from 1 (easiest) to 10 (hardest)

---

#### Algorithm Logic

```
FOR each micro-skill in module:

    // Step 1: Default to beginner level
    difficulty = 1

    // Step 2: Check if student has previous drill session
    IF no previous session EXISTS:
        RETURN difficulty = 1  // First drill ever
    END IF

    // Step 3: Get questions for this skill from last session
    skill_questions = FILTER questions WHERE micro_skill_id = current_skill

    IF skill_questions is EMPTY:
        RETURN difficulty = 1  // New skill for student
    END IF

    // Step 4: Calculate performance metrics
    total_questions = COUNT(skill_questions)
    correct_answers = COUNT(skill_questions WHERE is_correct = true)
    accuracy = correct_answers / total_questions

    // Step 5: Calculate base difficulty (what they attempted last time)
    avg_difficulty = AVERAGE(skill_questions.difficulty)
    base_difficulty = ROUND(avg_difficulty)

    // Step 6: Apply adaptive logic (TWO DISTINCT PATHS)

    IF accuracy < 0.40:
        // PATH 1: Poor Performance (0-39%)
        // Student is struggling fundamentally - reset to basics
        difficulty = 1
        LOG "Skill {skill_id}: Poor ({accuracy}%) → RESET to difficulty 1"

    ELSE:
        // PATH 2: Adequate or Better (40-100%)
        // Calculate graduated adjustment based on performance bands

        adjustment = 0

        IF accuracy = 1.00:
            // Perfect performance - accelerate learning
            adjustment = +3
            LOG "Skill {skill_id}: Perfect (100%) → +3 levels"

        ELSE IF accuracy >= 0.85:
            // Excellent performance - advance quickly
            adjustment = +2
            LOG "Skill {skill_id}: Excellent ({accuracy}%) → +2 levels"

        ELSE IF accuracy >= 0.75:
            // Good performance - progress steadily
            adjustment = +1
            LOG "Skill {skill_id}: Good ({accuracy}%) → +1 level"

        ELSE IF accuracy >= 0.60:
            // Adequate performance - maintain current level
            adjustment = 0
            LOG "Skill {skill_id}: Adequate ({accuracy}%) → Maintain"

        ELSE:
            // Struggling (40-59%) - step back slightly
            adjustment = -1
            LOG "Skill {skill_id}: Struggling ({accuracy}%) → -1 level"
        END IF

        // Apply adjustment with bounds
        difficulty = CLAMP(base_difficulty + adjustment, 1, 10)
    END IF

    RETURN difficulty
END FOR
```

---

#### Performance Band Table

| Accuracy Range | Classification | Adjustment | Example: Base 5 → New |
|---------------|----------------|------------|----------------------|
| **100%** | Perfect | +3 levels | 5 → 8 |
| **85-99%** | Excellent | +2 levels | 5 → 7 |
| **75-84%** | Good | +1 level | 5 → 6 |
| **60-74%** | Adequate | No change | 5 → 5 |
| **40-59%** | Struggling | -1 level | 5 → 4 |
| **0-39%** | Poor | Reset to 1 | 5 → 1 |

---

#### Example Walkthrough

**Scenario:** Student completed Drill 1 for Micro-Skill 2 (3-Digit Addition)

**Drill 1 Results:**
- Questions attempted: 3 questions, all at Difficulty 1
- Correct answers: 3/3 (100% accuracy)

**Calculation for Drill 2:**
```
1. base_difficulty = AVERAGE([1, 1, 1]) = 1
2. accuracy = 3/3 = 1.00 (100%)
3. accuracy = 1.00 → adjustment = +3
4. new_difficulty = CLAMP(1 + 3, 1, 10) = 4
```

**Result:** Drill 2 will give Difficulty 4 questions for this skill

**Progressive Learning:**
```
Drill 1: 100% at Difficulty 1 → Drill 2: Difficulty 4
Drill 2: 100% at Difficulty 4 → Drill 3: Difficulty 7
Drill 3: 100% at Difficulty 7 → Drill 4: Difficulty 10
Drill 4: 100% at Difficulty 10 → Drill 5: Difficulty 10 (capped)
```

---

### Algorithm 2: Dynamic Question Allocation

**Purpose:** Allocate more questions to skills that need practice, fewer to mastered skills.

#### Input
- **Recent Drill History:** Last 2-3 completed drills
- **Session Size:** Total questions for this drill (e.g., 10)
- **Micro-Skills:** List of skills to practice

#### Output
- **Question Count per Skill:** How many questions each skill gets

---

#### Algorithm Logic

```
// Step 1: Determine number of recent drills to analyze
recent_drills = MIN(3, total_completed_drills)

FOR each micro-skill in module:

    // Step 2: Default allocation weight
    allocation_weight = 1.0  // Standard allocation

    // Step 3: Need at least 2 drills to determine mastery
    IF recent_drills >= 2:

        // Step 4: Collect accuracies from recent drills
        accuracies = []

        FOR each drill in last 2-3 drills:
            skill_questions = FILTER drill.questions WHERE micro_skill_id = current_skill

            IF skill_questions is NOT EMPTY:
                correct = COUNT(skill_questions WHERE is_correct = true)
                accuracy = correct / COUNT(skill_questions)
                accuracies.APPEND(accuracy)
            END IF
        END FOR

        // Step 5: Classify skill mastery level
        IF accuracies.LENGTH >= 2:
            avg_accuracy = AVERAGE(accuracies)
            min_accuracy = MINIMUM(accuracies)

            // CLASSIFICATION LOGIC

            IF avg_accuracy >= 0.90 AND min_accuracy >= 0.85:
                // MASTERED: Consistently excellent
                // Reduce allocation - maintain without over-practicing
                allocation_weight = 0.3  // 30% of normal
                LOG "Skill {skill_id}: MASTERED ({avg_accuracy}%) → Reduced (0.3x)"

            ELSE IF avg_accuracy < 0.50:
                // STRUGGLING: Consistently poor
                // Increase allocation - needs focused practice
                allocation_weight = 1.5  // 150% of normal
                LOG "Skill {skill_id}: STRUGGLING ({avg_accuracy}%) → Increased (1.5x)"

            ELSE:
                // DEVELOPING: Moderate performance
                // Standard allocation
                allocation_weight = 1.0  // 100% of normal
                LOG "Skill {skill_id}: DEVELOPING ({avg_accuracy}%) → Standard (1.0x)"
            END IF
        END IF
    END IF

    skill_allocation[skill_id] = allocation_weight
END FOR

// Step 6: Convert weights to actual question counts
total_weight = SUM(all allocation_weights)

FOR each micro-skill:
    proportion = skill_allocation[skill_id] / total_weight
    question_count = MAX(1, ROUND(session_size * proportion))
    skill_question_counts[skill_id] = question_count
END FOR

// Step 7: Adjust for rounding errors
allocated_total = SUM(skill_question_counts)
difference = allocated_total - session_size

IF difference != 0:
    // Add/remove from skill with highest weight
    max_weight_skill = skill with MAXIMUM allocation_weight
    skill_question_counts[max_weight_skill] -= difference
    skill_question_counts[max_weight_skill] = MAX(1, skill_question_counts[max_weight_skill])
END IF

RETURN skill_question_counts
```

---

#### Mastery Classification Table

| Status | Criteria | Allocation Weight | Example (10 questions, 3 skills) |
|--------|----------|-------------------|----------------------------------|
| **MASTERED** | Avg ≥ 90% AND Min ≥ 85% | 0.3× (30%) | 1 question |
| **DEVELOPING** | Avg 50-89% | 1.0× (100%) | 3 questions |
| **STRUGGLING** | Avg < 50% | 1.5× (150%) | 6 questions |

---

#### Example Walkthrough

**Scenario:** Module with 3 micro-skills, 10-question drill

**Recent Performance (last 2 drills):**
- **Skill 1:** 95%, 90% → Average: 92.5%, Min: 90% → **MASTERED**
- **Skill 2:** 45%, 40% → Average: 42.5%, Min: 40% → **STRUGGLING**
- **Skill 3:** 70%, 75% → Average: 72.5%, Min: 70% → **DEVELOPING**

**Calculation:**
```
1. Allocation weights:
   Skill 1: 0.3 (mastered)
   Skill 2: 1.5 (struggling)
   Skill 3: 1.0 (developing)
   Total weight = 0.3 + 1.5 + 1.0 = 2.8

2. Question counts:
   Skill 1: ROUND(10 × 0.3/2.8) = ROUND(1.07) = 1 question
   Skill 2: ROUND(10 × 1.5/2.8) = ROUND(5.36) = 5 questions
   Skill 3: ROUND(10 × 1.0/2.8) = ROUND(3.57) = 4 questions
   Total = 1 + 5 + 4 = 10 ✓

3. Result:
   - Student gets 5 questions on struggling skill (50% of drill)
   - Only 1 question on mastered skill (maintenance)
   - 4 questions on developing skill (standard practice)
```

**Benefit:** Student spends 50% of time on what they need most!

---

### Algorithm 3: Question Repetition Prevention

**Purpose:** Never show the same question twice across all drills.

#### Input
- **All Completed Drills:** Every drill session student has done
- **Currently Selected Questions:** Questions picked so far in current selection

#### Output
- **Exclusion List:** Question IDs to avoid

---

#### Algorithm Logic

```
// Step 1: Collect all previously attempted question IDs
previously_attempted = []

FOR each completed_drill in all_drills:
    FOR each question in completed_drill.questions:
        previously_attempted.APPEND(question.question_id)
    END FOR
END FOR

LOG "Excluding {COUNT(previously_attempted)} questions from previous drills"

// Step 2: When selecting each question
current_excluded = previously_attempted + currently_selected_ids

// Step 3: Query database with exclusion
question = DATABASE.FIND_ONE({
    module_id: target_module,
    micro_skill_id: target_skill,
    difficulty_level: target_difficulty,
    _id: NOT IN current_excluded  // ← Key exclusion
})

// Step 4: Fallback if no questions available at target difficulty
IF question is NULL:
    // Try lower difficulties
    FOR difficulty FROM target_difficulty-1 DOWN TO 1:
        question = DATABASE.FIND_ONE({
            module_id: target_module,
            micro_skill_id: target_skill,
            difficulty_level: difficulty,
            _id: NOT IN current_excluded
        })

        IF question is NOT NULL:
            LOG "No questions at difficulty {target}, using {difficulty}"
            BREAK
        END IF
    END FOR
END IF

// Step 5: If still no question (all attempted)
IF question is NULL:
    LOG "WARNING: All questions attempted for skill {skill_id}"
    // System will skip or use random question
END IF

RETURN question
```

---

#### Example Walkthrough

**Scenario:** Student has completed 3 drills

**Question Bank:**
- Skill 1, Difficulty 3: Questions [Q1, Q2, Q3, Q4, Q5]

**Drill History:**
- Drill 1: Q1, Q2
- Drill 2: Q3, Q4
- Drill 3: (current)

**Selection for Drill 3:**
```
1. previously_attempted = [Q1, Q2, Q3, Q4]
2. Target: Skill 1, Difficulty 3
3. Query: Find questions WHERE skill=1 AND difficulty=3 AND _id NOT IN [Q1,Q2,Q3,Q4]
4. Result: Q5 selected
5. currently_selected = [Q5]
6. Next question for same skill: Exclude [Q1,Q2,Q3,Q4,Q5]
```

**Benefit:** Each drill feels fresh, prevents memorization!

---

## Phase 2: Intelligence Layer

Phase 2 adds analytical depth to understand HOW students learn, not just IF they learn.

---

### Algorithm 4: Confidence Scoring

**Purpose:** Measure confidence level of each answer based on multiple factors.

#### Input (per question)
- **Correctness:** True/False
- **Time Taken:** Actual seconds spent
- **Expected Time:** Ideal time for this difficulty
- **Hints Used:** Number of hints requested
- **Max Hints:** Total hints available
- **Difficulty Level:** Question difficulty (1-10)

#### Output
- **Confidence Score:** 0.0 to 1.0 (0% to 100%)
- **Interpretation:** Human-readable explanation

---

#### Algorithm Logic

```
// Weights for each factor
WEIGHT_CORRECTNESS = 0.40  // 40%
WEIGHT_TIME = 0.35         // 35%
WEIGHT_HINTS = 0.15        // 15%
WEIGHT_DIFFICULTY = 0.10   // 10%

// Step 1: Calculate Correctness Factor (binary)
IF is_correct:
    correctness_factor = 1.0
ELSE:
    correctness_factor = 0.0
END IF

// Step 2: Calculate Time Factor (Gaussian distribution)
// Peak confidence at expected_time, decreases for rushed or slow answers
sigma = expected_time × 0.5
exponent = -(time_taken - expected_time)² / (2 × sigma²)
time_factor = e^exponent
time_factor = CLAMP(time_factor, 0, 1)

// Step 3: Calculate Hints Factor (linear penalty)
IF max_hints > 0:
    hint_ratio = hints_used / max_hints
    hints_factor = 1.0 - (hint_ratio × 0.25)  // Max 25% penalty
    hints_factor = MAX(0.75, hints_factor)     // Floor at 0.75
ELSE:
    hints_factor = 1.0  // No hints available
END IF

// Step 4: Calculate Difficulty Factor
IF is_correct:
    // Correct answer: bonus for harder questions
    difficulty_factor = 0.5 + (difficulty_level / 10) × 0.5
    // Ranges from 0.55 (diff=1) to 1.0 (diff=10)
ELSE:
    // Incorrect answer: neutral penalty
    difficulty_factor = 0.5
END IF

// Step 5: Combine with weights
confidence_score = (
    correctness_factor × WEIGHT_CORRECTNESS +
    time_factor × WEIGHT_TIME +
    hints_factor × WEIGHT_HINTS +
    difficulty_factor × WEIGHT_DIFFICULTY
)

// Step 6: Clamp to valid range
confidence_score = CLAMP(confidence_score, 0, 1)

RETURN confidence_score
```

---

#### Time Factor (Gaussian Curve)

**Why Gaussian?** Both rushing and taking too long indicate lower confidence.

```
Time Factor Graph (expected_time = 60s):

1.0 |        *        ← Peak at expected time
    |       ***
0.8 |      *****
    |     *******
0.6 |    *********    ← Rushed (30s) or slow (90s)
    |   ***********
0.4 |  *************
    | ***************
0.2 |*****************
    |___________________
    0   30   60   90  120 seconds
```

---

#### Example Calculations

**Example 1: Confident Correct Answer**
```
Input:
- is_correct = true
- time_taken = 58s (expected: 60s)
- hints_used = 0 (max: 2)
- difficulty = 5

Calculation:
1. correctness_factor = 1.0
2. time_factor = e^(-(58-60)²/(2×30²)) = e^(-0.0022) ≈ 0.998
3. hints_factor = 1.0 - (0/2 × 0.25) = 1.0
4. difficulty_factor = 0.5 + (5/10 × 0.5) = 0.75

confidence_score = 1.0×0.40 + 0.998×0.35 + 1.0×0.15 + 0.75×0.10
                 = 0.40 + 0.349 + 0.15 + 0.075
                 = 0.974 (97.4%)

Interpretation: "High confidence - Strong understanding demonstrated"
```

**Example 2: Lucky Guess (Correct but Low Confidence)**
```
Input:
- is_correct = true
- time_taken = 120s (expected: 60s, very slow)
- hints_used = 2 (max: 2, used all hints)
- difficulty = 2

Calculation:
1. correctness_factor = 1.0
2. time_factor = e^(-(120-60)²/(2×30²)) = e^(-2.0) ≈ 0.135
3. hints_factor = 1.0 - (2/2 × 0.25) = 0.75
4. difficulty_factor = 0.5 + (2/10 × 0.5) = 0.60

confidence_score = 1.0×0.40 + 0.135×0.35 + 0.75×0.15 + 0.60×0.10
                 = 0.40 + 0.047 + 0.113 + 0.06
                 = 0.620 (62.0%)

Interpretation: "Good confidence - Answer correct but took extra time and hints"
```

**Example 3: Incorrect Answer**
```
Input:
- is_correct = false
- time_taken = 45s (expected: 60s, rushed)
- hints_used = 0
- difficulty = 5

Calculation:
1. correctness_factor = 0.0
2. time_factor = e^(-(45-60)²/(2×30²)) = e^(-0.125) ≈ 0.882
3. hints_factor = 1.0
4. difficulty_factor = 0.5 (incorrect)

confidence_score = 0.0×0.40 + 0.882×0.35 + 1.0×0.15 + 0.5×0.10
                 = 0.0 + 0.309 + 0.15 + 0.05
                 = 0.509 (50.9%)

Interpretation: "Attempted confidently but incorrect - May have conceptual misunderstanding"
```

---

### Algorithm 5: Time Analytics

Phase 2 includes 5 time-based analyses. Here are the key algorithms:

---

#### 5.1 Speed-Accuracy Correlation

**Purpose:** Determine if rushing affects accuracy.

**Algorithm:**
```
// Step 1: Collect data from recent sessions
FOR each session in last N sessions:
    FOR each question in session:
        time_ratio = time_taken / expected_time
        correctness = is_correct ? 1 : 0

        time_ratios.APPEND(time_ratio)
        correctness_values.APPEND(correctness)
    END FOR
END FOR

// Step 2: Calculate Pearson correlation
correlation = PEARSON_CORRELATION(time_ratios, correctness_values)

// Step 3: Interpret
IF correlation < -0.3:
    interpretation = "Strong negative: Rushing reduces accuracy"
    recommendation = "Slow down and think through problems"
ELSE IF correlation > 0.3:
    interpretation = "Strong positive: Taking time improves accuracy"
    recommendation = "Keep taking your time!"
ELSE:
    interpretation = "Speed and accuracy are independent"
    recommendation = "Great balance!"
END IF

RETURN {correlation, interpretation, recommendation}
```

**Correlation Values:**
- `-1.0`: Perfect negative (faster = less accurate)
- `0.0`: No relationship
- `+1.0`: Perfect positive (slower = more accurate)

---

#### 5.2 Time-of-Day Performance

**Purpose:** Find when student performs best.

**Algorithm:**
```
// Step 1: Initialize 24-hour buckets
FOR hour FROM 0 TO 23:
    hourly_stats[hour] = {
        sessions: 0,
        total_accuracy: 0,
        total_confidence: 0
    }
END FOR

// Step 2: Aggregate sessions by hour
FOR each session in last 30 days:
    hour = EXTRACT_HOUR(session.started_at)

    hourly_stats[hour].sessions += 1
    hourly_stats[hour].total_accuracy += session.accuracy
    hourly_stats[hour].total_confidence += session.avg_confidence
END FOR

// Step 3: Calculate averages
FOR each hour WITH sessions >= 2:  // Minimum sample size
    hourly_stats[hour].avg_accuracy = total_accuracy / sessions
    hourly_stats[hour].avg_confidence = total_confidence / sessions
END FOR

// Step 4: Identify best and worst hours
sorted_by_accuracy = SORT(hourly_stats, BY avg_accuracy, DESC)
best_hours = sorted_by_accuracy[0:3]    // Top 3
worst_hours = sorted_by_accuracy[-3:]   // Bottom 3

// Step 5: Generate recommendation
accuracy_difference = best_hours[0].avg_accuracy - worst_hours[0].avg_accuracy

IF accuracy_difference > 0.15:  // 15% difference
    recommendation = "You perform {difference}% better at {best_hours}. Schedule practice then!"
ELSE:
    recommendation = "Your performance is consistent throughout the day."
END IF

RETURN {best_hours, worst_hours, recommendation}
```

---

#### 5.3 Fatigue Detection

**Purpose:** Detect performance decline during a session.

**Algorithm:**
```
// Requires minimum 6 questions
IF session.questions.LENGTH < 6:
    RETURN {fatigue_detected: false}
END IF

// Step 1: Split session into halves
midpoint = FLOOR(questions.LENGTH / 2)
first_half = questions[0:midpoint]
second_half = questions[midpoint:]

// Step 2: Calculate metrics for each half
first_half_accuracy = COUNT(first_half WHERE is_correct) / midpoint
second_half_accuracy = COUNT(second_half WHERE is_correct) / (LENGTH - midpoint)

first_half_avg_time = AVERAGE(first_half.time_taken)
second_half_avg_time = AVERAGE(second_half.time_taken)

// Step 3: Calculate drops
accuracy_drop = ((first_half_accuracy - second_half_accuracy) / first_half_accuracy) × 100
time_increase = ((second_half_avg_time - first_half_avg_time) / first_half_avg_time) × 100

// Step 4: Detect fatigue
fatigue_detected = (accuracy_drop > 15) OR (time_increase > 20)

// Step 5: Generate recommendation
IF fatigue_detected:
    IF accuracy_drop > 15 AND time_increase > 20:
        recommendation = "Accuracy dropped {accuracy_drop}% and speed decreased {time_increase}%. Take 10-minute breaks every {midpoint} questions."
    ELSE IF accuracy_drop > 15:
        recommendation = "Accuracy decreased {accuracy_drop}%. Consider shorter sessions."
    ELSE:
        recommendation = "You slowed down {time_increase}%. Try breaks to maintain focus."
    END IF
ELSE:
    recommendation = "No fatigue detected. Consistent performance!"
END IF

RETURN {
    fatigue_detected,
    onset_question_number: midpoint + 1,
    first_half_accuracy,
    second_half_accuracy,
    accuracy_drop,
    recommendation
}
```

---

## Complete Question Selection Flow

**This section shows how all algorithms work together during drill creation.**

---

### Step-by-Step Flow

```
START: User clicks "Start Drill" for Module 1

┌─────────────────────────────────────────────────────────────┐
│ STEP 1: GATHER CONTEXT                                      │
├─────────────────────────────────────────────────────────────┤
│ • Fetch user's completed drills for this module             │
│ • Get micro-skills for this module (e.g., MS1, MS2, MS3)    │
│ • Determine session size (e.g., 10 questions)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: COLLECT EXCLUSION LIST                              │
├─────────────────────────────────────────────────────────────┤
│ • Loop through ALL previous drills                           │
│ • Extract every question_id attempted                        │
│ • Result: [Q1, Q5, Q7, Q12, Q18, ...] (to avoid)           │
│                                                              │
│ Algorithm: Question Repetition Prevention                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: DETERMINE DIFFICULTY PER SKILL                      │
├─────────────────────────────────────────────────────────────┤
│ FOR each micro-skill (MS1, MS2, MS3):                       │
│   • Get last session's questions for this skill             │
│   • Calculate accuracy (correct/total)                      │
│   • Get average difficulty attempted                        │
│   • Apply difficulty adaptation algorithm                   │
│   • Store target difficulty for this skill                  │
│                                                              │
│ Example Results:                                            │
│ • MS1: Difficulty 6 (was good at difficulty 5)             │
│ • MS2: Difficulty 1 (struggled at difficulty 3, reset)     │
│ • MS3: Difficulty 4 (perfect at difficulty 1, jump up)     │
│                                                              │
│ Algorithm: Difficulty Adaptation                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: CALCULATE QUESTION ALLOCATION                       │
├─────────────────────────────────────────────────────────────┤
│ FOR each micro-skill:                                        │
│   • Analyze last 2-3 drills for this skill                  │
│   • Calculate average accuracy across drills                │
│   • Classify: MASTERED / DEVELOPING / STRUGGLING           │
│   • Assign allocation weight (0.3x / 1.0x / 1.5x)          │
│                                                              │
│ Convert weights to question counts:                         │
│ • Total weight = 0.3 + 1.5 + 1.0 = 2.8                     │
│ • MS1 (MASTERED): 10 × (0.3/2.8) = 1 question             │
│ • MS2 (STRUGGLING): 10 × (1.5/2.8) = 5 questions          │
│ • MS3 (DEVELOPING): 10 × (1.0/2.8) = 4 questions          │
│                                                              │
│ Algorithm: Dynamic Question Allocation                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: SELECT ACTUAL QUESTIONS                             │
├─────────────────────────────────────────────────────────────┤
│ FOR each micro-skill:                                        │
│   target_count = skill_question_counts[skill_id]            │
│   target_difficulty = skill_difficulties[skill_id]          │
│                                                              │
│   WHILE selected < target_count:                            │
│     • Query database:                                       │
│       - module_id = current_module                          │
│       - micro_skill_id = current_skill                      │
│       - difficulty_level = target_difficulty                │
│       - _id NOT IN (excluded_ids + selected_ids)           │
│                                                              │
│     IF question found:                                      │
│       • Add to selected_questions                           │
│       • Add question_id to selected_ids                     │
│     ELSE:                                                   │
│       • Try difficulty-1, then difficulty-2, etc.           │
│       • Stop if no questions available                      │
│     END IF                                                  │
│   END WHILE                                                 │
│ END FOR                                                     │
│                                                              │
│ Algorithm: Question Repetition Prevention                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: CREATE SESSION                                      │
├─────────────────────────────────────────────────────────────┤
│ • Shuffle selected questions                                │
│ • Create session document in database                       │
│ • Initialize session metrics                                │
│ • Return first question to user                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ USER ANSWERS QUESTIONS                                       │
├─────────────────────────────────────────────────────────────┤
│ FOR each question answered:                                 │
│   • Check correctness                                       │
│   • Calculate confidence score (Phase 2)                    │
│   • Store answer with time_taken, confidence_score          │
│   • Return feedback to user                                 │
│                                                              │
│ Algorithm: Confidence Scoring                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: SESSION COMPLETION                                  │
├─────────────────────────────────────────────────────────────┤
│ • Calculate session metrics (accuracy, avg_time)            │
│ • Calculate confidence metrics (avg, distribution)          │
│ • Detect fatigue (Phase 2)                                  │
│ • Trigger background: Update time analytics                 │
│ • Return session summary with all insights                  │
│                                                              │
│ Algorithms: Confidence Scoring, Fatigue Detection           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKGROUND PROCESSING                                        │
├─────────────────────────────────────────────────────────────┤
│ • Update TimeAnalytics collection                           │
│ • Aggregate speed patterns                                  │
│ • Update hourly statistics                                  │
│ • Record fatigue patterns                                   │
│                                                              │
│ Algorithm: Time Analytics (All 5 types)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
                         END

NEXT DRILL: Start from STEP 1 with updated history
```

---

### Complete Example

**User:** Student Sarah, Module 1 (Speed Addition with 3 micro-skills)

---

**Drill 1 (First Ever):**
```
STEP 1: No previous drills
STEP 3: All skills → Difficulty 1 (default)
STEP 4: All skills → 3-4 questions each (equal)
STEP 5: Select 10 questions (Difficulty 1 only)
RESULT:
  • MS1: 4 questions, Difficulty 1 → 100% correct
  • MS2: 3 questions, Difficulty 1 → 67% correct
  • MS3: 3 questions, Difficulty 1 → 100% correct
```

---

**Drill 2 (After Drill 1):**
```
STEP 2: Exclude 10 question IDs from Drill 1
STEP 3: Calculate difficulties
  • MS1: 100% at Diff 1 → +3 → Difficulty 4
  • MS2: 67% at Diff 1 → 0 → Difficulty 1 (maintain)
  • MS3: 100% at Diff 1 → +3 → Difficulty 4
STEP 4: Only 1 drill, use equal allocation
  • All skills: 3-4 questions
STEP 5: Select 10 NEW questions
RESULT:
  • MS1: 4 questions, Difficulty 4 → 100% correct
  • MS2: 3 questions, Difficulty 1 → 33% correct (poor!)
  • MS3: 3 questions, Difficulty 4 → 100% correct
```

---

**Drill 3 (After Drills 1-2):**
```
STEP 2: Exclude 20 question IDs from Drills 1-2
STEP 3: Calculate difficulties
  • MS1: 100% at Diff 4 → +3 → Difficulty 7
  • MS2: 33% at Diff 1 → RESET → Difficulty 1 (poor performance)
  • MS3: 100% at Diff 4 → +3 → Difficulty 7
STEP 4: Now have 2 drills, analyze mastery
  • MS1: [100%, 100%] avg=100%, min=100% → MASTERED (0.3x)
  • MS2: [67%, 33%] avg=50%, min=33% → STRUGGLING (1.5x)
  • MS3: [100%, 100%] avg=100%, min=100% → MASTERED (0.3x)

  Allocation: MS1=1, MS2=8, MS3=1 (MS2 gets 80% of drill!)
STEP 5: Select 10 NEW questions
RESULT:
  • MS1: 1 question, Difficulty 7 (maintenance only)
  • MS2: 8 questions, Difficulty 1 (focused practice)
  • MS3: 1 question, Difficulty 7 (maintenance only)
```

**Outcome:** Sarah spends 80% of Drill 3 practicing what she needs most!

---

## Summary Tables

### Algorithm Integration

| Algorithm | When It Runs | Input | Output | Impact |
|-----------|-------------|-------|--------|---------|
| **Difficulty Adaptation** | Before drill creation | Last session performance | Target difficulty per skill | Questions match ability |
| **Question Allocation** | Before drill creation | Last 2-3 session trends | Questions per skill | Focus on weak areas |
| **Repetition Prevention** | During question selection | All past questions | Exclusion list | Fresh content always |
| **Confidence Scoring** | During answer submission | Answer metrics | Confidence score (0-1) | Understand HOW they answered |
| **Time Analytics** | After session completion | Session patterns | Performance insights | Optimize learning schedule |

---

### Key Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Difficulty Range** | 1-10 | Standard scale, easy to understand |
| **Max Difficulty Jump** | +3 levels | Accelerate learning for perfect performance |
| **Poor Performance Threshold** | < 40% | Fundamental gaps require reset |
| **Mastery Threshold** | Avg ≥ 90%, Min ≥ 85% | Requires consistency across multiple drills |
| **Struggling Threshold** | Avg < 50% | Clear indicator of difficulty |
| **Mastered Allocation** | 0.3× (30%) | Maintain without over-practicing |
| **Struggling Allocation** | 1.5× (150%) | Focused practice where needed |
| **Lookback Window** | 2-3 drills | Balance between reactivity and stability |
| **Confidence Weights** | 40-35-15-10% | Correctness most important, time second |
| **Fatigue Threshold** | 15% accuracy drop or 20% time increase | Evidence-based indicators |

---

## Design Principles

### 1. **Personalization**
Every student gets a unique experience based on their performance.

### 2. **Adaptivity**
System continuously adjusts to student progress in real-time.

### 3. **Efficiency**
Time spent practicing what's needed most, not randomly.

### 4. **Transparency**
Algorithms are explainable and logical (not black boxes).

### 5. **Graceful Degradation**
System works even with limited data (defaults are sensible).

### 6. **Scientific Foundation**
- Graduated difficulty changes (educational research)
- Gaussian time distribution (cognitive science)
- Spaced practice allocation (learning theory)
- Fatigue detection (attention research)

---

## Performance Characteristics

### Computational Complexity

| Algorithm | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| Difficulty Adaptation | O(n) | O(1) | n = questions in last session |
| Question Allocation | O(m×k) | O(m) | m = skills, k = lookback drills |
| Repetition Prevention | O(d×q) | O(d×q) | d = total drills, q = questions/drill |
| Confidence Scoring | O(1) | O(1) | Simple arithmetic |
| Time Analytics | O(s×q) | O(24) | s = sessions analyzed |

**All algorithms are highly efficient and scale well.**

---

## Conclusion

The Coachify Adaptive Learning Engine implements a sophisticated multi-layered algorithm system that:

1. **Adapts difficulty** to student ability in real-time
2. **Allocates practice time** based on mastery levels
3. **Prevents repetition** for always-fresh content
4. **Measures confidence** beyond correctness
5. **Analyzes patterns** to optimize learning

Each algorithm is designed with educational principles and cognitive science research in mind, while remaining computationally efficient and explainable.

---

**Document Version:** 1.0
**Last Updated:** January 9, 2026
**Author:** Senior Software Development Team
