# 🤖 AI Question Generation Guide

This guide will help you generate **800+ high-quality questions** using AI (ChatGPT/Claude) for the Coachify Adaptive Learning Engine.

## 📋 Overview

- **21 Modules** covering all mathematical topics
- **74 Micro-Skills** (specific learning objectives)
- **12 Questions per Skill** (3 Easy + 6 Medium + 3 Hard)
- **Total: ~888 Questions**

---

## 🚀 Quick Start (3 Steps)

### Step 1: Generate AI Prompts

Run this command to create prompt files for each module:

```bash
cd /Users/shivamjoshi/Desktop/coachify-adaptive-learning
ts-node src/scripts/generate-ai-prompts.ts
```

This creates the `ai-prompts/` folder with 21 prompt files.

### Step 2: Feed Prompts to AI

1. **Open** the `ai-prompts/` folder
2. **Pick a module** (start with Module 0)
3. **Copy** the entire content of `module_0_Mental_Math_Mastery.txt`
4. **Paste** into ChatGPT-4, Claude Opus, or Claude Sonnet
5. **Wait** for AI to generate the JSON array
6. **Copy** the JSON response
7. **Save** as `ai-questions/module_0_questions.json`
8. **Repeat** for all 21 modules

### Step 3: Import to Database

Once you have all JSON files, run:

```bash
ts-node src/scripts/import-ai-questions.ts
```

This imports all questions into your MongoDB database!

---

## 📁 Folder Structure

```
coachify-adaptive-learning/
├── ai-prompts/              # Generated prompts (Step 1)
│   ├── README.md
│   ├── module_0_Mental_Math_Mastery.txt
│   ├── module_1_Fractions_Fundamentals.txt
│   └── ... (21 total)
│
├── ai-questions/            # AI responses (Step 2) - YOU CREATE THIS
│   ├── module_0_questions.json
│   ├── module_1_questions.json
│   └── ... (21 total)
│
└── src/scripts/
    ├── generate-ai-prompts.ts
    └── import-ai-questions.ts
```

---

## 🎯 Detailed Instructions

### Using ChatGPT (Recommended)

**Best Model:** GPT-4 or GPT-4 Turbo

1. Open ChatGPT
2. Copy-paste the entire module prompt
3. Wait for generation (may take 30-60 seconds)
4. Click "Copy code" on the JSON response
5. Save to `ai-questions/module_X_questions.json`

**Pro Tip:** If ChatGPT stops mid-response, type "continue" to get the rest.

### Using Claude

**Best Model:** Claude Opus 3 or Claude Sonnet 3.5

1. Open Claude.ai or use API
2. Paste the module prompt
3. Claude will generate all questions in one go
4. Copy the JSON response
5. Save to `ai-questions/module_X_questions.json`

**Pro Tip:** Claude handles larger responses better than ChatGPT.

### Using Local AI (Ollama, etc.)

You can use local models, but quality may vary:
- **Good:** Llama 3 70B, Mixtral 8x7B
- **Okay:** Llama 3 8B
- **Not Recommended:** Smaller models (<7B parameters)

---

## ✅ Quality Checklist

Before importing, verify each JSON file:

### 1. Valid JSON Format
```bash
# Test if JSON is valid
cat ai-questions/module_0_questions.json | jq . > /dev/null
```

### 2. Correct Structure
- Each question has `question_code`, `module_id`, `micro_skill_id`
- `question_data` contains: `text`, `type`, `correct_answer`, `solution_steps`, `hints`
- `metadata` contains: `difficulty_level`, `expected_time_seconds`, `points`, `tags`

### 3. Answer Accuracy
- Spot-check 5-10 questions per module
- Verify mathematical correctness
- Check solution steps are logical

### 4. Difficulty Progression
- Easy questions (1-3): Simple, foundational
- Medium questions (4-7): Applied, multi-step
- Hard questions (8-10): Complex, advanced

---

## 🐛 Common Issues & Fixes

### Issue 1: JSON Parse Error

**Problem:** Invalid JSON syntax

**Fix:**
```bash
# Validate JSON
jsonlint ai-questions/module_0_questions.json

# Or use online tool: jsonlint.com
```

### Issue 2: AI Stopped Mid-Response

**Problem:** Response truncated, incomplete JSON

**Fix:**
- ChatGPT: Type "continue" to get the rest
- Claude: Usually completes in one go
- Manually add closing `]` bracket if needed

### Issue 3: Wrong Module ID

**Problem:** Questions have incorrect `module_id`

**Fix:**
```bash
# Find-replace in JSON file
# Replace: "module_id": 99
# With: "module_id": 0
```

### Issue 4: Duplicate Questions

**Problem:** Import script shows "already exists"

**Fix:**
- This is normal! Script skips duplicates
- If you want to re-import, delete questions first:
```javascript
// In MongoDB shell or Compass
db.questions.deleteMany({ module_id: 0 })
```

---

## 📊 Progress Tracking

Track your progress in `ai-prompts/README.md`:

```markdown
- [x] Module 0: Mental Math Mastery (36 questions)
- [x] Module 1: Fractions Fundamentals (48 questions)
- [ ] Module 2: Basic Arithmetic (48 questions)
- [ ] Module 3: Advanced Multiplication (48 questions)
... (21 total)
```

---

## 🎨 Question Quality Tips

### Good Question Example:
```json
{
  "question_data": {
    "text": "A shopkeeper marks up an item by 40% and then offers a 25% discount. If the final price is ₹840, what was the cost price?",
    "type": "numerical_input",
    "correct_answer": 800,
    "solution_steps": [
      {
        "step": 1,
        "action": "Let cost price be x",
        "calculation": "After 40% markup: x × 1.40",
        "result": "1.4x"
      },
      {
        "step": 2,
        "action": "Apply 25% discount",
        "calculation": "1.4x × 0.75",
        "result": "1.05x"
      },
      {
        "step": 3,
        "action": "Equate to final price",
        "calculation": "1.05x = 840",
        "result": "x = 800"
      }
    ]
  }
}
```

### Bad Question Example:
```json
{
  "question_data": {
    "text": "Calculate", // ❌ Unclear
    "correct_answer": 42, // ❌ No context
    "solution_steps": [] // ❌ No solution
  }
}
```

---

## 💡 Pro Tips

### Batch Processing
Generate 3-5 modules at a time, then import:
```bash
# Generate modules 0-4
# Then import
ts-node src/scripts/import-ai-questions.ts

# Continue with modules 5-9
# Import again
```

### Parallel Generation
- Use multiple AI chat windows
- Generate different modules simultaneously
- Saves time!

### Quality Over Speed
- Don't rush through all 21 modules in one day
- Review questions for accuracy
- Better to have 500 good questions than 888 mediocre ones

### Save Prompts
Keep your AI chat history! You can:
- Regenerate if needed
- Ask AI to fix specific questions
- Generate more questions later

---

## 🧪 Testing After Import

After importing, test the questions:

```bash
# Start server
npm run dev

# Login and start practice session
# In Postman: POST /api/v1/practice/start

# Verify:
# - Questions from different modules appear
# - Difficulty progresses appropriately
# - Solutions are correct
```

---

## 📞 Need Help?

### Common Questions:

**Q: Can I use free ChatGPT (GPT-3.5)?**
A: Yes, but quality will be lower. GPT-4 is strongly recommended.

**Q: How long does this take?**
A: ~2-4 hours for all 21 modules (with GPT-4/Claude)

**Q: Can I generate questions in batches?**
A: Yes! Generate and import 5-10 modules at a time.

**Q: What if AI generates wrong answers?**
A: Spot-check and manually fix in the JSON file before importing.

**Q: Can I add more questions later?**
A: Yes! Generate new questions with higher Q numbers (Q013, Q014, etc.)

---

## 🎯 Next Steps After Question Generation

Once you have 800+ questions:

1. **Test Adaptive Algorithm**: Ensure variety in question selection
2. **Add More Modules**: Expand beyond the initial 21
3. **Create Question Variations**: Generate alternative versions
4. **Add Explanatory Videos**: Link questions to video content
5. **Collect Analytics**: Track which questions are most challenging

---

## 🚀 Ready to Start?

Run this now:
```bash
cd /Users/shivamjoshi/Desktop/coachify-adaptive-learning
ts-node src/scripts/generate-ai-prompts.ts
```

Then check the `ai-prompts/` folder and start generating! 🎉
