
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

// Helper to generate random integer
const rInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

// Generators
function generateArithmetic(difficulty: string): any {
  let min = 10, max = 99;
  if(difficulty === 'medium') { min = 100; max = 999; }
  if(difficulty === 'hard') { min = 1000; max = 9999; }

  const a = rInt(min, max);
  const b = rInt(min, max);
  const op = rItem(['+', '-', '*']);
  
  let ans = 0;
  if (op === '+') ans = a + b;
  else if (op === '-') ans = a - b;
  else ans = a * b;

  return {
    text: `Calculate: ${a} ${op} ${b}`,
    correct_answer: ans,
    solution: `${a} ${op} ${b} = ${ans}`
  };
}

function generateSequence(_difficulty: string): any {
	const start = rInt(1, 20);
	const step = rInt(2, 10);
	const seq = [start, start+step, start+step*2, start+step*3];
	const ans = start+step*4;
	
	return {
		text: `What comes next in the sequence: ${seq.join(', ')}, ...?`,
		correct_answer: ans,
		solution: `The pattern is adding ${step}. ${seq[3]} + ${step} = ${ans}`
	}
}

function generateGeometry(_difficulty: string): any {
	const shape = rItem(['square', 'rectangle']);
	if(shape === 'square') {
		const side = rInt(5, 50);
		const type = rItem(['area', 'perimeter']);
		if(type === 'area') {
			return {
				text: `Find the area of a square with side length ${side}.`,
				correct_answer: side * side,
				solution: `Area = side × side = ${side} × ${side} = ${side*side}`
			}
		} else {
			return {
				text: `Find the perimeter of a square with side length ${side}.`,
				correct_answer: side * 4,
				solution: `Perimeter = 4 × side = 4 × ${side} = ${side*4}`
			}
		}
	} else {
		const l = rInt(5, 20);
		const w = rInt(2, 15);
		return {
			text: `Find the area of a rectangle with length ${l} and width ${w}.`,
			correct_answer: l * w,
			solution: `Area = length × width = ${l} × ${w} = ${l*w}`
		}
	}
}

// Main generator function
function generateQuestionData(moduleName: string, _skillName: string, difficulty: string) {
	// Simple routing logic based on module name
	if (moduleName.includes("Geometry") || moduleName.includes("Mensuration")) {
		return generateGeometry(difficulty);
	}
    if (moduleName.includes("Mental") || moduleName.includes("Arithmetic") || moduleName.includes("Multiplication")) {
        return generateArithmetic(difficulty);
    }
    // Default fallback
	return generateSequence(difficulty);
}

async function generateAllQuestions() {
  const outputDir = path.join(process.cwd(), 'ai-questions');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const module of MODULES_AND_SKILLS) {
    const questions = [];
    
    for (const skill of module.skills) {
      // 12 questions per skill: 3 easy, 6 medium, 3 hard
      const difficulties = [
        ...Array(3).fill('easy'),
        ...Array(6).fill('medium'),
        ...Array(3).fill('hard')
      ];

      let qNum = 1;
      for (const diff of difficulties) {
        const gen = generateQuestionData(module.module_name, skill.name, diff);
        
        // Map difficulty string to 1-10
        let level = 1;
        if (diff === 'medium') level = 5;
        if (diff === 'hard') level = 9;

        const q = {
          question_code: `M${module.module_id}_MS${skill.id}_Q${qNum.toString().padStart(3, '0')}`,
          module_id: module.module_id,
          micro_skill_id: skill.id,
          question_data: {
            text: gen.text,
            type: "numerical_input", 
            correct_answer: gen.correct_answer,
            solution_steps: [
              {
                step: 1,
                action: "Calculate result",
                calculation: gen.solution,
                result: gen.correct_answer
              }
            ],
            hints: [
              { level: 1, text: "Read the question carefully." },
              { level: 2, text: "Check your calculations." }
            ]
          },
          metadata: {
            difficulty_level: level,
            expected_time_seconds: 60,
            points: 10,
            tags: [module.module_name, skill.name],
          },
          status: "active"
        };
        questions.push(q);
        qNum++;
      }
    }
    
    // Write module file
    const filename = `module_${module.module_id}_questions.json`;
    fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(questions, null, 2));
    console.log(`Generated ${questions.length} questions for Module ${module.module_id}`);
  }
}

generateAllQuestions();
