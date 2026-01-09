/**
 * AI QUESTION GENERATION PROMPT SCRIPT
 *
 * This script generates prompts that you can feed to AI (ChatGPT/Claude)
 * to generate questions for each module and micro-skill.
 *
 * USAGE:
 * ts-node src/scripts/generate-ai-prompts.ts
 *
 * This will create files in /ai-prompts/ folder with prompts for each module.
 * Feed these prompts to AI to get question JSON files.
 */

import fs from 'fs';
import path from 'path';

// Module and Micro-skill mapping (21 modules, 74 micro-skills)
const MODULES_AND_SKILLS = [
  {
    module_id: 0,
    module_name: "Mental Math Mastery",
    skills: [
      { id: 1, name: "Addition tricks (tens and ones)" },
      { id: 2, name: "Subtraction using complements" },
      { id: 3, name: "Quick multiplication (2, 5, 10)" },
    ]
  },
  {
    module_id: 1,
    module_name: "Fractions Fundamentals",
    skills: [
      { id: 4, name: "Identifying fractions" },
      { id: 5, name: "Equivalent fractions" },
      { id: 6, name: "Adding like fractions" },
      { id: 7, name: "Adding unlike fractions" },
    ]
  },
  {
    module_id: 2,
    module_name: "Basic Arithmetic",
    skills: [
      { id: 8, name: "Multi-digit addition" },
      { id: 9, name: "Multi-digit subtraction" },
      { id: 10, name: "Basic multiplication tables" },
      { id: 11, name: "Basic division" },
    ]
  },
  {
    module_id: 3,
    module_name: "Advanced Multiplication",
    skills: [
      { id: 12, name: "2-digit × 1-digit" },
      { id: 13, name: "2-digit × 2-digit" },
      { id: 14, name: "Multiplication by 11, 12, 15" },
      { id: 15, name: "Squaring numbers ending in 5" },
    ]
  },
  {
    module_id: 4,
    module_name: "Division Techniques",
    skills: [
      { id: 16, name: "Long division basics" },
      { id: 17, name: "Division with remainders" },
      { id: 18, name: "Dividing by multiples of 10" },
    ]
  },
  {
    module_id: 5,
    module_name: "Decimals",
    skills: [
      { id: 19, name: "Decimal place values" },
      { id: 20, name: "Adding and subtracting decimals" },
      { id: 21, name: "Multiplying decimals" },
      { id: 22, name: "Dividing decimals" },
    ]
  },
  {
    module_id: 6,
    module_name: "Ratios and Proportions",
    skills: [
      { id: 23, name: "Understanding ratios" },
      { id: 24, name: "Simplifying ratios" },
      { id: 25, name: "Solving proportions" },
      { id: 26, name: "Direct and inverse proportions" },
    ]
  },
  {
    module_id: 7,
    module_name: "Exponents and Powers",
    skills: [
      { id: 27, name: "Basic exponent rules" },
      { id: 28, name: "Negative exponents" },
      { id: 29, name: "Fractional exponents" },
    ]
  },
  {
    module_id: 8,
    module_name: "Square Roots and Cube Roots",
    skills: [
      { id: 30, name: "Perfect squares (1-20)" },
      { id: 31, name: "Estimating square roots" },
      { id: 32, name: "Perfect cubes (1-10)" },
    ]
  },
  {
    module_id: 9,
    module_name: "Percentages",
    skills: [
      { id: 33, name: "Converting fractions to percentages" },
      { id: 34, name: "Converting percentages to fractions" },
      { id: 35, name: "Finding percentage of a number" },
      { id: 36, name: "Percentage increase/decrease" },
      { id: 37, name: "Profit and loss percentages" },
    ]
  },
  {
    module_id: 10,
    module_name: "Simple Interest and Compound Interest",
    skills: [
      { id: 38, name: "Simple interest calculation" },
      { id: 39, name: "Compound interest (annual)" },
      { id: 40, name: "Compound interest (semi-annual/quarterly)" },
    ]
  },
  {
    module_id: 11,
    module_name: "Time, Speed, and Distance",
    skills: [
      { id: 41, name: "Basic speed = distance/time" },
      { id: 42, name: "Relative speed (same/opposite direction)" },
      { id: 43, name: "Average speed problems" },
    ]
  },
  {
    module_id: 12,
    module_name: "Algebra Basics",
    skills: [
      { id: 44, name: "Simplifying algebraic expressions" },
      { id: 45, name: "Solving linear equations (1 variable)" },
      { id: 46, name: "Solving linear equations (2 variables)" },
    ]
  },
  {
    module_id: 13,
    module_name: "Quadratic Equations",
    skills: [
      { id: 47, name: "Factoring quadratics" },
      { id: 48, name: "Quadratic formula" },
      { id: 49, name: "Nature of roots (discriminant)" },
    ]
  },
  {
    module_id: 14,
    module_name: "Geometry - Lines and Angles",
    skills: [
      { id: 50, name: "Complementary and supplementary angles" },
      { id: 51, name: "Vertically opposite angles" },
      { id: 52, name: "Parallel lines and transversals" },
    ]
  },
  {
    module_id: 15,
    module_name: "Geometry - Triangles",
    skills: [
      { id: 53, name: "Types of triangles" },
      { id: 54, name: "Pythagorean theorem" },
      { id: 55, name: "Area and perimeter of triangles" },
      { id: 56, name: "Congruence and similarity" },
    ]
  },
  {
    module_id: 16,
    module_name: "Geometry - Circles",
    skills: [
      { id: 57, name: "Circumference and area" },
      { id: 58, name: "Arc length and sector area" },
      { id: 59, name: "Chords and tangents" },
    ]
  },
  {
    module_id: 17,
    module_name: "Mensuration - 2D Shapes",
    skills: [
      { id: 60, name: "Area of rectangles and squares" },
      { id: 61, name: "Area of parallelograms and trapeziums" },
      { id: 62, name: "Combined shapes" },
    ]
  },
  {
    module_id: 18,
    module_name: "Mensuration - 3D Shapes",
    skills: [
      { id: 63, name: "Volume and surface area of cubes/cuboids" },
      { id: 64, name: "Volume and surface area of cylinders" },
      { id: 65, name: "Volume and surface area of cones and spheres" },
    ]
  },
  {
    module_id: 19,
    module_name: "Data Interpretation",
    skills: [
      { id: 66, name: "Reading bar graphs" },
      { id: 67, name: "Reading pie charts" },
      { id: 68, name: "Reading line graphs" },
      { id: 69, name: "Reading tables" },
    ]
  },
  {
    module_id: 20,
    module_name: "Statistics and Probability",
    skills: [
      { id: 70, name: "Mean, median, mode" },
      { id: 71, name: "Range and standard deviation" },
      { id: 72, name: "Basic probability" },
      { id: 73, name: "Conditional probability" },
      { id: 74, name: "Permutations and combinations" },
    ]
  },
];

/**
 * Question schema template for AI
 */
const QUESTION_SCHEMA_TEMPLATE = {
  question_code: "M{module_id}_MS{micro_skill_id}_Q{question_number}",
  module_id: 0,
  micro_skill_id: 1,
  question_data: {
    text: "Question text here",
    type: "numerical_input | mcq | true_false",
    options: ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"], // Only for MCQ
    correct_answer: "Answer here (number, string, or array for multiple correct MCQ)",
    solution_steps: [
      {
        step: 1,
        action: "Description of this step",
        calculation: "Mathematical operation",
        result: "Result of this step"
      }
    ],
    hints: [
      {
        level: 1,
        text: "First hint (subtle)"
      },
      {
        level: 2,
        text: "Second hint (more direct)"
      }
    ]
  },
  metadata: {
    difficulty_level: 1, // 1-10 scale
    expected_time_seconds: 60,
    points: 10,
    tags: ["tag1", "tag2"],
    prerequisites: ["M0_MS1"],
    common_errors: [
      {
        type: "Calculation mistake",
        frequency: 0.3,
        description: "Students often forget to carry over"
      }
    ]
  }
};

/**
 * Generate AI prompt for a specific module
 */
function generateModulePrompt(moduleData: typeof MODULES_AND_SKILLS[0], questionsPerSkill: number = 12): string {
  const totalQuestions = moduleData.skills.length * questionsPerSkill;

  return `# QUESTION GENERATION TASK

## Context
You are a question generation AI for an adaptive learning platform called "Coachify". Your task is to generate high-quality mathematics questions for competitive exam preparation (JEE, CAT, SAT, etc.) and school students.

## Module Information
- **Module ID**: ${moduleData.module_id}
- **Module Name**: ${moduleData.module_name}
- **Total Questions to Generate**: ${totalQuestions} (${questionsPerSkill} per skill)

## Micro-Skills in This Module:
${moduleData.skills.map(skill => `- **Skill ${skill.id}**: ${skill.name}`).join('\n')}

## Question Requirements

### For Each Micro-Skill, Generate ${questionsPerSkill} Questions:
- **3 Easy questions** (difficulty: 1-3) - Basic concept understanding
- **6 Medium questions** (difficulty: 4-7) - Application of concepts
- **3 Hard questions** (difficulty: 8-10) - Complex problem-solving

### Question Types Distribution:
- **70% Numerical Input**: Questions where answer is a number
- **25% MCQ**: Multiple choice with 4 options (A, B, C, D)
- **5% True/False**: Yes/No or True/False questions

### Quality Guidelines:
1. **Accuracy**: All answers must be mathematically correct
2. **Clarity**: Questions must be unambiguous and clear
3. **Progressive Difficulty**: Questions should increase in complexity
4. **Real-world Context**: Include word problems with practical scenarios
5. **Detailed Solutions**: Provide step-by-step solution for each question
6. **Helpful Hints**: 2 hints per question (progressive difficulty)
7. **Common Errors**: Identify typical mistakes students make

### Expected Time Guidelines:
- Easy (1-3): 30-60 seconds
- Medium (4-7): 60-120 seconds
- Hard (8-10): 120-180 seconds

### Points Distribution:
- Easy: 5 points
- Medium: 10 points
- Hard: 15 points

## Output Format

Generate a **valid JSON array** with the following structure:

\`\`\`json
[
  {
    "question_code": "M${moduleData.module_id}_MS1_Q001",
    "module_id": ${moduleData.module_id},
    "micro_skill_id": 1,
    "question_data": {
      "text": "Calculate: 37 + 48 using mental math tricks",
      "type": "numerical_input",
      "correct_answer": 85,
      "solution_steps": [
        {
          "step": 1,
          "action": "Break into tens and ones",
          "calculation": "37 = 30 + 7, 48 = 40 + 8",
          "result": "Separated into place values"
        },
        {
          "step": 2,
          "action": "Add tens",
          "calculation": "30 + 40",
          "result": 70
        },
        {
          "step": 3,
          "action": "Add ones",
          "calculation": "7 + 8",
          "result": 15
        },
        {
          "step": 4,
          "action": "Combine results",
          "calculation": "70 + 15",
          "result": 85
        }
      ],
      "hints": [
        {
          "level": 1,
          "text": "Try breaking each number into tens and ones"
        },
        {
          "level": 2,
          "text": "Add the tens first (30 + 40), then add the ones (7 + 8)"
        }
      ]
    },
    "metadata": {
      "difficulty_level": 2,
      "expected_time_seconds": 45,
      "points": 5,
      "tags": ["mental_math", "addition", "place_value"],
      "prerequisites": [],
      "common_errors": [
        {
          "type": "Incorrect carrying",
          "frequency": 0.25,
          "description": "Students sometimes forget to add the carried over value"
        }
      ]
    },
    "status": "active"
  }
  // ... more questions
]
\`\`\`

## Specific Instructions for ${moduleData.module_name}:

${generateModuleSpecificInstructions(moduleData)}

## Question Numbering:
${moduleData.skills.map(skill => `
**Skill ${skill.id} - ${skill.name}:**
- Questions: M${moduleData.module_id}_MS${skill.id}_Q001 to M${moduleData.module_id}_MS${skill.id}_Q${questionsPerSkill.toString().padStart(3, '0')}
- Easy (1-3): Q001-Q003
- Medium (4-7): Q004-Q009
- Hard (8-10): Q010-Q${questionsPerSkill.toString().padStart(3, '0')}
`).join('\n')}

## Important Notes:
1. **Do NOT include any explanatory text** - only output valid JSON
2. **Ensure all JSON is properly formatted** with correct commas and brackets
3. **Verify all mathematical answers** are correct
4. **Use consistent difficulty progression** within each skill
5. **Include variety** in question presentation and contexts

## Start Generating Questions Now!

Generate all ${totalQuestions} questions following the exact JSON format above.
`;
}

/**
 * Generate module-specific instructions
 */
function generateModuleSpecificInstructions(moduleData: typeof MODULES_AND_SKILLS[0]): string {
  const specificInstructions: { [key: string]: string } = {
    "Mental Math Mastery": "Focus on tricks and shortcuts. Questions should emphasize speed and mental calculation. Include various number ranges.",
    "Fractions Fundamentals": "Use visual fraction representations where possible. Include practical scenarios (pizza slices, measurements, etc.).",
    "Basic Arithmetic": "Cover various number ranges. Include word problems with real-life contexts.",
    "Advanced Multiplication": "Teach specific multiplication shortcuts. Include pattern recognition questions.",
    "Division Techniques": "Focus on long division steps. Include division with and without remainders.",
    "Decimals": "Emphasize place value understanding. Include money-related word problems.",
    "Ratios and Proportions": "Use real-world scenarios (recipes, maps, speed). Ensure clear ratio notation.",
    "Exponents and Powers": "Start with simple exponential rules. Progress to negative and fractional exponents.",
    "Square Roots and Cube Roots": "Include both perfect squares/cubes and approximations.",
    "Percentages": "Focus on practical applications: discounts, profits, taxes, growth rates.",
    "Simple Interest and Compound Interest": "Use realistic financial scenarios. Clear time period specifications.",
    "Time, Speed, and Distance": "Include train problems, car problems, relative motion scenarios.",
    "Algebra Basics": "Progress from simple to complex expressions. Include practical applications.",
    "Quadratic Equations": "Cover all solution methods. Include word problems leading to quadratics.",
    "Geometry - Lines and Angles": "Include diagrams descriptions. Focus on angle relationships.",
    "Geometry - Triangles": "Cover all triangle types. Include Pythagorean theorem applications.",
    "Geometry - Circles": "Focus on practical applications: wheels, pizza, circular gardens.",
    "Mensuration - 2D Shapes": "Include combined shapes. Real-world area problems (flooring, painting).",
    "Mensuration - 3D Shapes": "Focus on volume and surface area. Include packaging, containers scenarios.",
    "Data Interpretation": "Create realistic data sets. Include multi-step interpretation questions.",
    "Statistics and Probability": "Use practical scenarios (dice, cards, sports). Clear probability notation.",
  };

  return specificInstructions[moduleData.module_name] || "Generate diverse, practical questions covering all aspects of the micro-skills.";
}

/**
 * Main execution
 */
async function generateAllPrompts() {
  const outputDir = path.join(process.cwd(), 'ai-prompts');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🤖 Generating AI prompts for question generation...\n');
  console.log(`📁 Output directory: ${outputDir}\n`);

  // Generate prompts for each module
  for (const module of MODULES_AND_SKILLS) {
    const prompt = generateModulePrompt(module, 12); // 12 questions per skill
    const filename = `module_${module.module_id}_${module.module_name.replace(/\s+/g, '_')}.txt`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, prompt, 'utf-8');

    const totalQuestions = module.skills.length * 12;
    console.log(`✅ Module ${module.module_id}: ${module.module_name}`);
    console.log(`   📝 ${module.skills.length} skills × 12 questions = ${totalQuestions} questions`);
    console.log(`   📄 File: ${filename}\n`);
  }

  // Generate a master README
  const readmeContent = `# AI Question Generation Prompts

This folder contains prompts for generating questions for all 21 modules.

## Instructions:

### Step 1: Generate Questions with AI

For each module file:
1. Copy the entire content of the module file
2. Paste it into ChatGPT-4, Claude, or another AI model
3. Wait for the AI to generate the JSON array of questions
4. Copy the JSON output

### Step 2: Save AI Output

Save each AI response as a JSON file:
- Module 0: \`module_0_questions.json\`
- Module 1: \`module_1_questions.json\`
- ... and so on

### Step 3: Import to Database

Once you have all JSON files, run:
\`\`\`bash
ts-node src/scripts/import-ai-questions.ts
\`\`\`

This will import all questions from the JSON files into your database.

## Progress Tracker:

${MODULES_AND_SKILLS.map(m => `- [ ] Module ${m.module_id}: ${m.module_name} (${m.skills.length * 12} questions)`).join('\n')}

## Total Questions: ${MODULES_AND_SKILLS.reduce((sum, m) => sum + (m.skills.length * 12), 0)} questions

## Tips:

1. **Quality Check**: Review AI-generated questions for accuracy
2. **Batch Processing**: Generate 2-3 modules at a time
3. **Verify JSON**: Ensure valid JSON before importing (use jsonlint.com)
4. **Test Import**: Start with one module to verify the process works
`;

  fs.writeFileSync(path.join(outputDir, 'README.md'), readmeContent, 'utf-8');
  console.log('📚 README.md created with instructions\n');

  // Generate a sample JSON template
  const sampleTemplate = {
    _comment: "This is a sample question template. Replace with actual questions.",
    questions: [QUESTION_SCHEMA_TEMPLATE]
  };
  fs.writeFileSync(
    path.join(outputDir, 'SAMPLE_TEMPLATE.json'),
    JSON.stringify(sampleTemplate, null, 2),
    'utf-8'
  );
  console.log('📋 SAMPLE_TEMPLATE.json created\n');

  // Summary
  const totalModules = MODULES_AND_SKILLS.length;
  const totalQuestions = MODULES_AND_SKILLS.reduce((sum, m) => sum + (m.skills.length * 12), 0);

  console.log('═'.repeat(60));
  console.log('✅ All prompts generated successfully!');
  console.log('═'.repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   - Total Modules: ${totalModules}`);
  console.log(`   - Total Micro-Skills: 74`);
  console.log(`   - Total Questions to Generate: ${totalQuestions}`);
  console.log(`   - Questions per Skill: 12`);
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('   1. Open the ai-prompts/ folder');
  console.log('   2. Feed each module file to ChatGPT/Claude');
  console.log('   3. Save the JSON outputs');
  console.log('   4. Run the import script to load into database');
  console.log('');
}

// Run the script
generateAllPrompts().catch(console.error);
