# Question Generation Index

## Overview

**Total Questions to Generate:** 2404
**Modules:** 20
**Generation Order:** High Priority → Medium → Low

## Generation Priority Order

1. **Module 3: Speed Multiplication**
   - Priority: 🔴 HIGH
   - Questions needed: 728
   - Prompt file: `module_3_prompt.txt`
   - Output file: `../ai-questions-new/module_3_questions.json`

2. **Module 19: DI + QA Application**
   - Priority: 🔴 HIGH
   - Questions needed: 202
   - Prompt file: `module_19_prompt.txt`
   - Output file: `../ai-questions-new/module_19_questions.json`

3. **Module 18: Factorisation**
   - Priority: 🔴 HIGH
   - Questions needed: 164
   - Prompt file: `module_18_prompt.txt`
   - Output file: `../ai-questions-new/module_18_questions.json`

4. **Module 9: Percentage**
   - Priority: 🟡 MEDIUM
   - Questions needed: 152
   - Prompt file: `module_9_prompt.txt`
   - Output file: `../ai-questions-new/module_9_questions.json`

5. **Module 5: Squaring Techniques**
   - Priority: 🟡 MEDIUM
   - Questions needed: 134
   - Prompt file: `module_5_prompt.txt`
   - Output file: `../ai-questions-new/module_5_questions.json`

6. **Module 6: Cubing Techniques**
   - Priority: 🟡 MEDIUM
   - Questions needed: 134
   - Prompt file: `module_6_prompt.txt`
   - Output file: `../ai-questions-new/module_6_questions.json`

7. **Module 17: Simple Equations**
   - Priority: 🟡 MEDIUM
   - Questions needed: 114
   - Prompt file: `module_17_prompt.txt`
   - Output file: `../ai-questions-new/module_17_questions.json`

8. **Module 1: Speed Addition**
   - Priority: 🟡 MEDIUM
   - Questions needed: 97
   - Prompt file: `module_1_prompt.txt`
   - Output file: `../ai-questions-new/module_1_questions.json`

9. **Module 2: Speed Subtraction**
   - Priority: 🟢 LOW
   - Questions needed: 96
   - Prompt file: `module_2_prompt.txt`
   - Output file: `../ai-questions-new/module_2_questions.json`

10. **Module 12: Fractions**
   - Priority: 🟢 LOW
   - Questions needed: 83
   - Prompt file: `module_12_prompt.txt`
   - Output file: `../ai-questions-new/module_12_questions.json`

11. **Module 7: Cube Rooting Techniques**
   - Priority: 🟢 LOW
   - Questions needed: 76
   - Prompt file: `module_7_prompt.txt`
   - Output file: `../ai-questions-new/module_7_questions.json`

12. **Module 8: Square Rooting Techniques**
   - Priority: 🟢 LOW
   - Questions needed: 76
   - Prompt file: `module_8_prompt.txt`
   - Output file: `../ai-questions-new/module_8_questions.json`

13. **Module 4: Speed Division**
   - Priority: 🟢 LOW
   - Questions needed: 64
   - Prompt file: `module_4_prompt.txt`
   - Output file: `../ai-questions-new/module_4_questions.json`

14. **Module 10: Ratio**
   - Priority: 🟢 LOW
   - Questions needed: 56
   - Prompt file: `module_10_prompt.txt`
   - Output file: `../ai-questions-new/module_10_questions.json`

15. **Module 11: Average**
   - Priority: 🟢 LOW
   - Questions needed: 38
   - Prompt file: `module_11_prompt.txt`
   - Output file: `../ai-questions-new/module_11_questions.json`

16. **Module 13: Indices**
   - Priority: 🟢 LOW
   - Questions needed: 38
   - Prompt file: `module_13_prompt.txt`
   - Output file: `../ai-questions-new/module_13_questions.json`

17. **Module 14: Surds**
   - Priority: 🟢 LOW
   - Questions needed: 38
   - Prompt file: `module_14_prompt.txt`
   - Output file: `../ai-questions-new/module_14_questions.json`

18. **Module 15: VBODMAS**
   - Priority: 🟢 LOW
   - Questions needed: 38
   - Prompt file: `module_15_prompt.txt`
   - Output file: `../ai-questions-new/module_15_questions.json`

19. **Module 16: Approximation Techniques**
   - Priority: 🟢 LOW
   - Questions needed: 38
   - Prompt file: `module_16_prompt.txt`
   - Output file: `../ai-questions-new/module_16_questions.json`

20. **Module 20: Miscellaneous**
   - Priority: 🟢 LOW
   - Questions needed: 38
   - Prompt file: `module_20_prompt.txt`
   - Output file: `../ai-questions-new/module_20_questions.json`

## How to Use

### Step 1: Generate Questions with AI

For each module (in priority order):

1. Open the prompt file (e.g., `module_3_prompt.txt`)
2. Copy the entire prompt
3. Paste into ChatGPT-4 or Claude
4. Save the JSON output to `../ai-questions-new/module_{id}_questions.json`

### Step 2: Import Questions

After generating questions for a module:

```bash
cd /Users/shivamjoshi/Desktop/coachify-adaptive-learning
npx ts-node src/scripts/import-ai-questions.ts ai-questions-new/module_{id}_questions.json
```

### Step 3: Verify

Check the import results and verify question count:

```bash
npx ts-node src/scripts/analyze-salvageable-questions.ts
```

## Tips for Quality

- Generate one module at a time
- Review AI output for quality before importing
- If AI truncates output, ask it to continue
- Use "regenerate" if quality is poor
- Test imported questions in the app

## Progress Tracking

- [ ] Module 3 (728 questions)
- [ ] Module 19 (202 questions)
- [ ] Module 18 (164 questions)
- [ ] Module 9 (152 questions)
- [ ] Module 5 (134 questions)
- [ ] Module 6 (134 questions)
- [ ] Module 17 (114 questions)
- [ ] Module 1 (97 questions)
- [ ] Module 2 (96 questions)
- [ ] Module 12 (83 questions)
- [ ] Module 7 (76 questions)
- [ ] Module 8 (76 questions)
- [ ] Module 4 (64 questions)
- [ ] Module 10 (56 questions)
- [ ] Module 11 (38 questions)
- [ ] Module 13 (38 questions)
- [ ] Module 14 (38 questions)
- [ ] Module 15 (38 questions)
- [ ] Module 16 (38 questions)
- [ ] Module 20 (38 questions)

---

**Last Updated:** 31/12/2025
