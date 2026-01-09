# Adaptive Learning System - Core Logic Guide

**For Product Managers & Leadership**

---

## Overview

The adaptive system makes two real-time decisions after every practice drill:
1. **What difficulty level** should each topic be for this student?
2. **How many questions** should we give for each topic?

These decisions are based entirely on the student's performance in previous drills.

---

## Core Logic 1: Difficulty Adjustment

After each drill, the system calculates accuracy for each topic and adjusts difficulty:

| Accuracy | Difficulty Change | Example |
|----------|------------------|---------|
| **100%** | +3 levels | Level 2 → Level 5 |
| **85-99%** | +2 levels | Level 2 → Level 4 |
| **75-84%** | +1 level | Level 2 → Level 3 |
| **60-74%** | No change | Level 2 → Level 2 |
| **40-59%** | -1 level | Level 2 → Level 1 |
| **0-39%** | Reset to Level 1 | Any level → Level 1 |

**Key Point:** Perfect performance accelerates learning. Poor performance immediately simplifies content.

---

## Core Logic 2: Question Allocation

The system analyzes the **last 2-3 drills** to classify each topic as:

| Classification | Criteria | Questions Allocated |
|---------------|----------|-------------------|
| **MASTERED** | Average ≥ 90% AND minimum ≥ 85% | 30% of normal (1-2 questions) |
| **DEVELOPING** | Average between 50-89% | 100% of normal (3 questions) |
| **STRUGGLING** | Average < 50% | 150% of normal (4-5 questions) |

**Calculation Example:**

For a 10-question drill with 3 topics:
- Topic A (Mastered): 0.3 weight → 1 question
- Topic B (Struggling): 1.5 weight → 5 questions
- Topic C (Developing): 1.0 weight → 4 questions

**Key Point:** More practice time automatically goes to topics that need it most.

---

## Example: Complete Drill Progression

**Student Profile:** Mixed performance across 3 topics

| Drill | Topic A (2-Digit) | Topic B (3-Digit) | Topic C (4-Digit) |
|-------|------------------|------------------|------------------|
| **Drill 1** | 4 questions, Lvl 3<br>**100% correct** | 3 questions, Lvl 3<br>**75% correct** | 3 questions, Lvl 3<br>**33% correct** |
| **System Decision** | +3 levels → Lvl 6<br>MASTERED → Reduce allocation | +1 level → Lvl 4<br>DEVELOPING → Standard | Reset → Lvl 1<br>STRUGGLING → Increase allocation |
| **Drill 2** | **2 questions**, Lvl 6<br>100% correct | 3 questions, Lvl 4<br>67% correct | **5 questions**, Lvl 1<br>40% correct |
| **System Decision** | +3 levels → Lvl 9<br>Still MASTERED → Keep reduced | No change → Lvl 4<br>Still DEVELOPING | Stay → Lvl 1<br>Still STRUGGLING → Keep increased |
| **Drill 3** | **1 question**, Lvl 9<br>100% correct | 3 questions, Lvl 4<br>100% correct | **6 questions**, Lvl 1<br>83% correct |
| **System Decision** | Lvl 10 (max)<br>Maintenance only | +3 levels → Lvl 7<br>Now MASTERED | +2 levels → Lvl 3<br>Improving → Standard allocation |

**Outcome Summary:**
- Topic A: Reached max difficulty in 3 drills, minimal time spent
- Topic B: Progressed steadily when ready
- Topic C: Got 60% of practice time in Drill 2-3 when needed most

---

## Key Rules

### Rule 1: No Question Repetition
- System tracks all questions attempted across all drills
- Each question appears only once for each student
- Ensures fresh content and prevents memorization

### Rule 2: Minimum Question Availability
- If target difficulty unavailable (all attempted), system selects lowest available difficulty
- Ensures students always get questions even with limited question bank

### Rule 3: Analysis Window
- Uses last 2-3 drills to classify mastery (not just one drill)
- Prevents over-reaction to one bad performance
- Requires consistency to earn MASTERED status

---

## System Constraints

**Difficulty Levels:** 1 (easiest) to 10 (hardest)

**Question Bank Requirements:**
- Minimum 8-12 questions per topic per difficulty level
- System will flag gaps if questions unavailable at target difficulty

**Performance Calculations:**
- Accuracy = (Correct Answers / Total Questions) × 100
- Classification requires minimum 2 drills of data
- First drill uses default allocation (equal distribution)

---

**Last Updated:** January 5, 2026
**Version:** 2.0 (Core Logic)
