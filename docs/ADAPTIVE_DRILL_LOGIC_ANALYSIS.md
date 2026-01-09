# Deep Analysis: Adaptive Drill Core Logic

## Problem Statement

The adaptive drill system is not adjusting difficulty correctly. All questions remain at Difficulty 1 despite good performance.

---

## Root Cause Analysis

### Actual User Data (rahul.sharma@testmail.com)

**Drill 1 Performance:**
```
MS1 (2 Digit Numbers): 2/3 correct (67%) at Difficulty 1
MS2 (3 Digit Numbers): 3/3 correct (100%) at Difficulty 1
MS3 (4 Digit Numbers): 4/4 correct (100%) at Difficulty 1
```

**Drill 2 ACTUAL:**
```
MS1: Difficulty 1 (3 questions)
MS2: Difficulty 1 (3 questions)
MS3: Difficulty 1 (4 questions)
```

**Drill 2 EXPECTED:**
```
MS1: 67% → Adequate (60-74%) → Maintain → Difficulty 1 ✓
MS2: 100% → Perfect → +3 levels → Difficulty 4 ✗ (Got 1)
MS3: 100% → Perfect → +3 levels → Difficulty 4 ✗ (Got 1)
```

---

## The Bug

### Original Code (BROKEN)
```typescript
let difficulty = 1; // Line 623

if (lastSession) {
  const skillQuestions = lastSession.questions.filter(...);

  if (skillQuestions.length > 0) {
    const accuracy = correctAnswers / totalQuestions;
    const baseDifficulty = Math.round(avgDifficulty);

    let adjustment = 0;

    if (accuracy === 1.0) {
      adjustment = 3;
    } else if (accuracy >= 0.85) {
      adjustment = 2;
    } else if (accuracy >= 0.75) {
      adjustment = 1;
    } else if (accuracy >= 0.60) {
      adjustment = 0;
    } else if (accuracy >= 0.40) {
      adjustment = -1;
    } else {
      difficulty = 1; // ← Only sets difficulty for poor performance
    }

    // ❌ BUG: Checks INITIAL value of difficulty, not the one set above
    if (difficulty !== 1) {
      difficulty = Math.max(1, Math.min(10, baseDifficulty + adjustment));
    }
  }
}
```

### Why It Failed

**Execution trace for MS2 (100% accuracy):**

1. `difficulty = 1` (initial value)
2. Enter if block (lastSession exists)
3. Calculate: `accuracy = 1.0`, `baseDifficulty = 1`, `adjustment = 3`
4. Take first if branch: `if (accuracy === 1.0)` → sets `adjustment = 3`
5. **Does NOT enter the else branch**, so `difficulty` remains 1
6. Check: `if (difficulty !== 1)` → **FALSE!** (difficulty is still 1)
7. Skip the calculation
8. Final: `difficulty = 1` ❌ WRONG!

**The bug:** The code only sets `difficulty = 1` explicitly in the else branch (poor performance). For all other cases, it tries to apply the calculation ONLY if difficulty is not 1, but difficulty is ALWAYS 1 at this point!

---

## Correct Logic Design

### Decision Flow

```
START: difficulty = 1 (default)
  ↓
Is there a previous session?
  NO → Use difficulty = 1 (first drill)
  YES → Continue
    ↓
  Did this skill appear in previous session?
    NO → Use difficulty = 1 (new skill)
    YES → Continue
      ↓
    Calculate: accuracy, baseDifficulty
      ↓
    Is accuracy < 40%? (POOR)
      YES → difficulty = 1 (HARD RESET)
      NO → Continue
        ↓
      Calculate adjustment based on accuracy:
        100%:     adjustment = +3
        85-99%:   adjustment = +2
        75-84%:   adjustment = +1
        60-74%:   adjustment = 0
        40-59%:   adjustment = -1
        ↓
      difficulty = clamp(baseDifficulty + adjustment, 1, 10)
      ↓
END: Use calculated difficulty
```

### Key Principles

1. **Two Distinct Paths:**
   - Poor performance (< 40%): HARD RESET to 1
   - All other cases: CALCULATED adjustment from base

2. **No Conditional Application:**
   - Don't check initial value
   - Always apply the calculation when in the adjustment path

3. **Clear Separation:**
   - Reset logic is separate from adjustment logic
   - No mixing of concerns

---

## Correct Implementation

```typescript
let difficulty = 1; // Default for first drill or new skill

if (lastSession) {
  const skillQuestions = lastSession.questions.filter(
    (q: any) => q.micro_skill_id === msId
  );

  if (skillQuestions.length > 0) {
    // Calculate performance metrics
    const totalQuestions = skillQuestions.length;
    const correctAnswers = skillQuestions.filter((q: any) => q.is_correct).length;
    const accuracy = correctAnswers / totalQuestions;
    const avgDifficulty = skillQuestions.reduce(
      (sum: number, q: any) => sum + (q.difficulty || 1),
      0
    ) / totalQuestions;
    const baseDifficulty = Math.round(avgDifficulty);
    const accuracyPercent = (accuracy * 100).toFixed(0);

    // DECISION: Reset vs Adjust
    if (accuracy < 0.40) {
      // PATH 1: Poor Performance → Hard Reset
      difficulty = 1;
      logger.info(
        `Skill ${msId}: Poor (${accuracyPercent}%) → Reset to difficulty 1`
      );
    } else {
      // PATH 2: All Other Cases → Calculate Adjustment
      let adjustment = 0;

      if (accuracy === 1.0) {
        adjustment = 3;
        logger.info(`Skill ${msId}: Perfect (${accuracyPercent}%) → +3 levels`);
      } else if (accuracy >= 0.85) {
        adjustment = 2;
        logger.info(`Skill ${msId}: Excellent (${accuracyPercent}%) → +2 levels`);
      } else if (accuracy >= 0.75) {
        adjustment = 1;
        logger.info(`Skill ${msId}: Good (${accuracyPercent}%) → +1 level`);
      } else if (accuracy >= 0.60) {
        adjustment = 0;
        logger.info(`Skill ${msId}: Adequate (${accuracyPercent}%) → Maintain`);
      } else {
        // 0.40 <= accuracy < 0.60
        adjustment = -1;
        logger.info(`Skill ${msId}: Struggling (${accuracyPercent}%) → -1 level`);
      }

      // Apply adjustment with bounds
      difficulty = Math.max(1, Math.min(10, baseDifficulty + adjustment));
    }

    logger.info(
      `Skill ${msId} result: ${correctAnswers}/${totalQuestions} (${accuracyPercent}%) | ` +
      `Base: ${baseDifficulty} → New: ${difficulty}`
    );
  }
}

skillDifficulties[msId] = difficulty;
```

---

## Verification with Real Data

### Drill 1 → Drill 2 Calculation

**MS1: 2/3 (67%)**
```
accuracy = 0.67
baseDifficulty = 1
Path: accuracy >= 0.60 && < 0.75 → Adequate → adjustment = 0
difficulty = max(1, min(10, 1 + 0)) = 1 ✓
```

**MS2: 3/3 (100%)**
```
accuracy = 1.0
baseDifficulty = 1
Path: accuracy === 1.0 → Perfect → adjustment = 3
difficulty = max(1, min(10, 1 + 3)) = 4 ✓
```

**MS3: 4/4 (100%)**
```
accuracy = 1.0
baseDifficulty = 1
Path: accuracy === 1.0 → Perfect → adjustment = 3
difficulty = max(1, min(10, 1 + 3)) = 4 ✓
```

---

## Edge Cases Covered

### Case 1: First Drill (No Previous Data)
```
lastSession = null
→ difficulty = 1 (default) ✓
```

### Case 2: Skill Not in Previous Drill
```
lastSession exists
skillQuestions.length = 0
→ difficulty = 1 (default) ✓
```

### Case 3: Progressive Improvement
```
Drill 1: 50% at Diff 1 → Drill 2: Diff 1 (maintain)
Drill 2: 80% at Diff 1 → Drill 3: Diff 2 (+1)
Drill 3: 100% at Diff 2 → Drill 4: Diff 5 (+3)
Drill 4: 100% at Diff 5 → Drill 5: Diff 8 (+3)
Drill 5: 100% at Diff 8 → Drill 6: Diff 10 (clamped)
✓
```

### Case 4: Performance Drop
```
Drill 1: 100% at Diff 1 → Drill 2: Diff 4
Drill 2: 30% at Diff 4 → Drill 3: Diff 1 (reset)
✓
```

### Case 5: Gradual Decline
```
Drill 1: 100% at Diff 5 → Drill 2: Diff 8
Drill 2: 50% at Diff 8 → Drill 3: Diff 7 (-1)
Drill 3: 50% at Diff 7 → Drill 4: Diff 6 (-1)
✓
```

### Case 6: At Maximum Difficulty
```
Drill 1: 100% at Diff 9 → Drill 2: Diff 10 (would be 12, clamped)
Drill 2: 100% at Diff 10 → Drill 3: Diff 10 (stays at max)
✓
```

---

## Implementation Quality Checklist

✅ **Clear Logic Flow:** Two distinct paths (reset vs adjust)
✅ **No Conditional Bugs:** Always applies calculation when in adjust path
✅ **Proper Bounds:** Clamps to [1, 10]
✅ **Comprehensive Logging:** Logs decision, base, and result
✅ **Edge Cases Handled:** First drill, new skill, boundaries
✅ **Performance Thresholds:** All 6 bands correctly implemented
✅ **Mathematical Correctness:** baseDifficulty + adjustment with clamp

---

## Conclusion

The bug was caused by checking the INITIAL value of `difficulty` instead of applying the calculation unconditionally in the adjustment path.

The fix: Restructure into two clear paths:
1. **Reset Path:** Poor performance → Set to 1
2. **Adjustment Path:** All others → Calculate from base

This eliminates the conditional application bug and makes the code easier to understand and maintain.
