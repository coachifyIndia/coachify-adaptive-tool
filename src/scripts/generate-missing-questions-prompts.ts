/**
 * GENERATE MISSING QUESTIONS PROMPTS
 *
 * This script analyzes the current database and generates AI prompts
 * for all missing questions based on the PDF specification.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { MICRO_SKILLS_METADATA } from '../constants/microskills.constant';
import { getModuleName } from '../constants/modules.constant';

const QuestionSchema = new mongoose.Schema({}, { collection: 'questions', strict: false });
const QuestionModel = mongoose.model('Question', QuestionSchema);

interface ModuleGap {
  moduleId: number;
  moduleName: string;
  currentQuestions: number;
  expectedQuestions: number;
  gap: number;
  microSkills: Array<{
    id: number;
    name: string;
    current: number;
    expected: number;
    gap: number;
  }>;
}

async function generatePrompts(): Promise<void> {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB\n');

    // Analyze current questions
    const questions = await QuestionModel.find({}).lean() as any[];

    const questionsByModule: { [moduleId: number]: { [microSkillId: number]: number } } = {};

    for (const q of questions) {
      if (!questionsByModule[q.module_id]) {
        questionsByModule[q.module_id] = {};
      }
      if (!questionsByModule[q.module_id][q.micro_skill_id]) {
        questionsByModule[q.module_id][q.micro_skill_id] = 0;
      }
      questionsByModule[q.module_id][q.micro_skill_id]++;
    }

    // Calculate gaps
    const gaps: ModuleGap[] = [];
    const moduleSkillsMap: { [moduleId: number]: number[] } = {};

    for (const ms of MICRO_SKILLS_METADATA) {
      if (!moduleSkillsMap[ms.module_id]) {
        moduleSkillsMap[ms.module_id] = [];
      }
      moduleSkillsMap[ms.module_id].push(ms.id);
    }

    for (let moduleId = 1; moduleId <= 20; moduleId++) {
      const skillsForModule = MICRO_SKILLS_METADATA.filter(ms => ms.module_id === moduleId);
      const moduleExpected = skillsForModule.reduce((sum, ms) => sum + ms.practice_questions, 0);
      const moduleCurrent = Object.values(questionsByModule[moduleId] || {}).reduce((sum, count) => sum + count, 0);

      const microSkillGaps = skillsForModule.map(ms => {
        const current = (questionsByModule[moduleId] && questionsByModule[moduleId][ms.id]) || 0;
        return {
          id: ms.id,
          name: ms.name,
          current,
          expected: ms.practice_questions,
          gap: ms.practice_questions - current,
        };
      }).filter(ms => ms.gap > 0);

      if (microSkillGaps.length > 0) {
        gaps.push({
          moduleId,
          moduleName: getModuleName(moduleId),
          currentQuestions: moduleCurrent,
          expectedQuestions: moduleExpected,
          gap: moduleExpected - moduleCurrent,
          microSkills: microSkillGaps,
        });
      }
    }

    // Sort by gap size (largest first)
    gaps.sort((a, b) => b.gap - a.gap);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   QUESTION GENERATION PLAN');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let totalGap = 0;
    for (const gap of gaps) {
      console.log(`📦 Module ${gap.moduleId}: ${gap.moduleName}`);
      console.log(`   Current: ${gap.currentQuestions} | Expected: ${gap.expectedQuestions} | Gap: ${gap.gap}`);
      console.log(`   Micro-skills needing questions: ${gap.microSkills.length}`);
      totalGap += gap.gap;
    }

    console.log(`\n📊 Total Questions to Generate: ${totalGap}\n`);

    // Create prompts directory
    const promptsDir = path.join(__dirname, '../../ai-prompts-new');
    if (!fs.existsSync(promptsDir)) {
      fs.mkdirSync(promptsDir, { recursive: true });
    }

    // Generate prompts for each module
    console.log('✍️  Generating AI prompts...\n');

    for (const gap of gaps) {
      const prompt = generateModulePrompt(gap);
      const filename = `module_${gap.moduleId}_prompt.txt`;
      const filepath = path.join(promptsDir, filename);

      fs.writeFileSync(filepath, prompt);
      console.log(`✅ Created: ${filename} (${gap.gap} questions)`);
    }

    // Generate master index
    const indexContent = generateIndexFile(gaps, totalGap);
    fs.writeFileSync(path.join(promptsDir, 'INDEX.md'), indexContent);

    console.log(`\n✅ Generated ${gaps.length} prompt files`);
    console.log(`📁 Location: ${promptsDir}`);
    console.log(`📄 See INDEX.md for generation order\n`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function generateModulePrompt(gap: ModuleGap): string {
  const microSkillDetails = gap.microSkills.map((ms, index) => {
    const metadata = MICRO_SKILLS_METADATA.find(m => m.id === ms.id)!;
    return `
${index + 1}. **Micro-Skill ${ms.id}: ${ms.name}**
   - Questions needed: ${ms.gap}
   - Difficulty range: ${metadata.difficulty_range.min}-${metadata.difficulty_range.max}
   - Average time: ${metadata.avg_time_seconds} seconds
   - Distribution: ${Math.ceil(ms.gap * 0.2)} easy, ${Math.ceil(ms.gap * 0.6)} medium, ${Math.ceil(ms.gap * 0.2)} hard`;
  }).join('\n');

  return `# Question Generation Prompt for Module ${gap.moduleId}: ${gap.moduleName}

## Module Overview
- **Module ID:** ${gap.moduleId}
- **Module Name:** ${gap.moduleName}
- **Total Questions Needed:** ${gap.gap}
- **Micro-Skills:** ${gap.microSkills.length}

## Micro-Skills Breakdown
${microSkillDetails}

## Instructions for AI

You are tasked with generating **${gap.gap} high-quality math practice questions** for the "${gap.moduleName}" module. These questions will be used in an adaptive learning platform for competitive exam preparation.

### Requirements

1. **Question Format**
   - Each question must be a JSON object
   - Follow the exact schema provided below
   - Generate realistic, exam-like scenarios
   - Use proper mathematical notation

2. **Difficulty Distribution**
   - **Easy (20%):** Straightforward calculations, basic concepts
   - **Medium (60%):** Multi-step problems, moderate complexity
   - **Hard (20%):** Complex scenarios, time pressure, advanced techniques

3. **Quality Standards**
   - Real-world applications and practical scenarios
   - Progressive difficulty within each micro-skill
   - Clear, unambiguous problem statements
   - Accurate solution steps and hints
   - Common errors based on typical student mistakes

### JSON Schema

\`\`\`json
{
  "question_code": "M${gap.moduleId}_MS{micro_skill_id}_Q{001-999}",
  "module_id": ${gap.moduleId},
  "micro_skill_id": {micro_skill_id},
  "question_data": {
    "text": "Clear, concise question statement",
    "type": "numerical_input",
    "correct_answer": 42,
    "solution_steps": [
      {
        "step": 1,
        "action": "What to do",
        "calculation": "Math expression",
        "result": "Result"
      }
    ],
    "hints": [
      {
        "level": 1,
        "text": "Gentle nudge in right direction"
      },
      {
        "level": 2,
        "text": "More specific guidance"
      },
      {
        "level": 3,
        "text": "Almost complete solution path"
      }
    ]
  },
  "metadata": {
    "difficulty_level": 1-10,
    "expected_time_seconds": 30-180,
    "points": 10,
    "tags": ["tag1", "tag2"],
    "prerequisites": [],
    "common_errors": [
      {
        "type": "calculation_error",
        "frequency": 0.3,
        "description": "Description of common mistake"
      }
    ]
  }
}
\`\`\`

### Example Question

\`\`\`json
{
  "question_code": "M${gap.moduleId}_MS${gap.microSkills[0]?.id || 1}_Q001",
  "module_id": ${gap.moduleId},
  "micro_skill_id": ${gap.microSkills[0]?.id || 1},
  "question_data": {
    "text": "Calculate: 47 + 38",
    "type": "numerical_input",
    "correct_answer": 85,
    "solution_steps": [
      {
        "step": 1,
        "action": "Add the ones place",
        "calculation": "7 + 8 = 15",
        "result": "15 (carry 1)"
      },
      {
        "step": 2,
        "action": "Add the tens place with carry",
        "calculation": "4 + 3 + 1 = 8",
        "result": "8"
      },
      {
        "step": 3,
        "action": "Combine results",
        "calculation": "80 + 5",
        "result": "85"
      }
    ],
    "hints": [
      {
        "level": 1,
        "text": "Start by adding the ones place digits"
      },
      {
        "level": 2,
        "text": "Remember to carry when the sum is greater than 9"
      },
      {
        "level": 3,
        "text": "7 + 8 = 15, carry the 1, then 4 + 3 + 1 = 8"
      }
    ]
  },
  "metadata": {
    "difficulty_level": 2,
    "expected_time_seconds": 45,
    "points": 10,
    "tags": ["addition", "two_digit", "carry"],
    "prerequisites": [],
    "common_errors": [
      {
        "type": "carry_error",
        "frequency": 0.4,
        "description": "Forgetting to carry the 1"
      }
    ]
  }
}
\`\`\`

### Output Format

Please output a JSON array containing all ${gap.gap} questions:

\`\`\`json
[
  { /* question 1 */ },
  { /* question 2 */ },
  ...
  { /* question ${gap.gap} */ }
]
\`\`\`

### Important Notes

1. Ensure question_code is unique for each question
2. Use sequential numbering: Q001, Q002, Q003, etc.
3. Distribute questions evenly across micro-skills
4. Vary the scenarios and numbers used
5. Make questions progressively harder within each difficulty level
6. Include diverse problem types and contexts

---

**Start generating questions now. Output only the JSON array.**
`;
}

function generateIndexFile(gaps: ModuleGap[], totalGap: number): string {
  const moduleList = gaps.map((gap, index) => {
    const priority = index < 3 ? '🔴 HIGH' : index < 8 ? '🟡 MEDIUM' : '🟢 LOW';
    return `${index + 1}. **Module ${gap.moduleId}: ${gap.moduleName}**
   - Priority: ${priority}
   - Questions needed: ${gap.gap}
   - Prompt file: \`module_${gap.moduleId}_prompt.txt\`
   - Output file: \`../ai-questions-new/module_${gap.moduleId}_questions.json\``;
  }).join('\n\n');

  return `# Question Generation Index

## Overview

**Total Questions to Generate:** ${totalGap}
**Modules:** ${gaps.length}
**Generation Order:** High Priority → Medium → Low

## Generation Priority Order

${moduleList}

## How to Use

### Step 1: Generate Questions with AI

For each module (in priority order):

1. Open the prompt file (e.g., \`module_3_prompt.txt\`)
2. Copy the entire prompt
3. Paste into ChatGPT-4 or Claude
4. Save the JSON output to \`../ai-questions-new/module_{id}_questions.json\`

### Step 2: Import Questions

After generating questions for a module:

\`\`\`bash
cd /Users/shivamjoshi/Desktop/coachify-adaptive-learning
npx ts-node src/scripts/import-ai-questions.ts ai-questions-new/module_{id}_questions.json
\`\`\`

### Step 3: Verify

Check the import results and verify question count:

\`\`\`bash
npx ts-node src/scripts/analyze-salvageable-questions.ts
\`\`\`

## Tips for Quality

- Generate one module at a time
- Review AI output for quality before importing
- If AI truncates output, ask it to continue
- Use "regenerate" if quality is poor
- Test imported questions in the app

## Progress Tracking

- [ ] Module ${gaps[0]?.moduleId} (${gaps[0]?.gap} questions)
- [ ] Module ${gaps[1]?.moduleId} (${gaps[1]?.gap} questions)
- [ ] Module ${gaps[2]?.moduleId} (${gaps[2]?.gap} questions)
${gaps.slice(3).map(g => `- [ ] Module ${g.moduleId} (${g.gap} questions)`).join('\n')}

---

**Last Updated:** ${new Date().toLocaleDateString()}
`;
}

generatePrompts();
