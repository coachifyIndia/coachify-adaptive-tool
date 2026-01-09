/**
 * MICRO-SKILL CONSTANTS
 *
 * Complete mapping of all 64 micro-skills from the PDF Course Structure
 * Each micro-skill contains topics where students practice specific calculation techniques
 */

export interface MicroSkillMetadata {
  id: number;
  module_id: number;
  name: string;
  practice_questions: number; // Number of questions per PDF
  adaptive_drill_tests: number; // Number of drill tests per PDF
  difficulty_range: { min: number; max: number }; // Difficulty range 1-10
  avg_time_seconds: number; // Average time to solve
}

export const MICRO_SKILLS_METADATA: MicroSkillMetadata[] = [
  // Module 0: Magic Maths - NO QUESTIONS (video lectures only)

  // Module 1: Speed Addition (150 questions)
  { id: 1, module_id: 1, name: "2 Digit Numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 1, max: 6 }, avg_time_seconds: 45 },
  { id: 2, module_id: 1, name: "3 Digit Numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 3, max: 7 }, avg_time_seconds: 60 },
  { id: 3, module_id: 1, name: "4 Digit Numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 75 },

  // Module 2: Speed Subtraction (150 questions)
  { id: 4, module_id: 2, name: "2 Digit Numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 1, max: 6 }, avg_time_seconds: 45 },
  { id: 5, module_id: 2, name: "3 Digit Numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 3, max: 7 }, avg_time_seconds: 60 },
  { id: 6, module_id: 2, name: "4 Digit Numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 75 },

  // Module 3: Speed Multiplication (800 questions)
  { id: 7, module_id: 3, name: "Series of 9s", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 2, max: 6 }, avg_time_seconds: 60 },
  { id: 8, module_id: 3, name: "Series of 1s", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 2, max: 6 }, avg_time_seconds: 60 },
  { id: 9, module_id: 3, name: "Similar digits in the multiplier", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 3, max: 7 }, avg_time_seconds: 70 },
  { id: 10, module_id: 3, name: "Powers of 5", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 2, max: 6 }, avg_time_seconds: 55 },
  { id: 11, module_id: 3, name: "Criss-Cross Method: 2 Digit Numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 3, max: 7 }, avg_time_seconds: 65 },
  { id: 12, module_id: 3, name: "Criss-Cross Method: 3 Digit Numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 8 }, avg_time_seconds: 90 },
  { id: 13, module_id: 3, name: "Criss-Cross Method: 4 Digit Numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 7, max: 10 }, avg_time_seconds: 120 },
  { id: 14, module_id: 3, name: "Base 10", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 3, max: 7 }, avg_time_seconds: 70 },
  { id: 15, module_id: 3, name: "Base is a multiple of 10", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 80 },
  { id: 16, module_id: 3, name: "Base 100", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 75 },
  { id: 17, module_id: 3, name: "Base is a multiple of 100", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 90 },
  { id: 18, module_id: 3, name: "Base is a submultiple of 100", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 90 },
  { id: 19, module_id: 3, name: "Base 1000", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 6, max: 9 }, avg_time_seconds: 100 },
  { id: 20, module_id: 3, name: "Base is a multiple of 1000", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 6, max: 10 }, avg_time_seconds: 110 },
  { id: 21, module_id: 3, name: "Base is a submultiple of 1000", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 6, max: 10 }, avg_time_seconds: 110 },
  { id: 22, module_id: 3, name: "Multiplying numbers with different base values", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 7, max: 10 }, avg_time_seconds: 120 },

  // Module 4: Speed Division (100 questions)
  { id: 23, module_id: 4, name: "Base Method: Divisor is smaller than base", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 90 },
  { id: 24, module_id: 4, name: "Base Method: Divisor is greater than base", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 100 },

  // Module 5: Squaring Techniques (200 questions)
  { id: 25, module_id: 5, name: "When unit digit is 5", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 2, max: 6 }, avg_time_seconds: 50 },
  { id: 26, module_id: 5, name: "2 digit numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 3, max: 7 }, avg_time_seconds: 65 },
  { id: 27, module_id: 5, name: "Higher digit numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 85 },
  { id: 28, module_id: 5, name: "Sum and difference of squares", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 75 },

  // Module 6: Cubing Techniques (200 questions)
  { id: 29, module_id: 6, name: "2 digit numbers", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 90 },
  { id: 30, module_id: 6, name: "Base 100", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 8 }, avg_time_seconds: 95 },
  { id: 31, module_id: 6, name: "Base 1000", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 6, max: 9 }, avg_time_seconds: 105 },
  { id: 32, module_id: 6, name: "Any other base", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 7, max: 10 }, avg_time_seconds: 120 },

  // Module 7: Cube Rooting Techniques (100 questions)
  { id: 33, module_id: 7, name: "Perfect Cubes", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 3, max: 7 }, avg_time_seconds: 60 },
  { id: 34, module_id: 7, name: "Imperfect Cubes", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 80 },

  // Module 8: Square Rooting Techniques (100 questions)
  { id: 35, module_id: 8, name: "Perfect Squares", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 2, max: 6 }, avg_time_seconds: 50 },
  { id: 36, module_id: 8, name: "Imperfect Squares", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 70 },

  // Module 9: Percentage (200 questions) - "Percentage Basics" is video only
  { id: 37, module_id: 9, name: "Percentage Calculations", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 3, max: 7 }, avg_time_seconds: 90 },
  { id: 38, module_id: 9, name: "Percentage Change", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 100 },
  { id: 39, module_id: 9, name: "Multiplying Factor Concept", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 110 },
  { id: 40, module_id: 9, name: "Successive Percentage Change", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 6, max: 10 }, avg_time_seconds: 130 },

  // Module 10: Ratio (80 questions) - "Ratio Basics" is video only
  { id: 41, module_id: 10, name: "Combination of Ratios", practice_questions: 30, adaptive_drill_tests: 3, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 100 },
  { id: 42, module_id: 10, name: "Various Patterns", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 115 },

  // Module 11: Average (50 questions) - "Average Basics" is video only
  { id: 43, module_id: 11, name: "Various Patterns", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 95 },

  // Module 12: Fractions (120 questions) - "Fractions Basics" is video only
  { id: 44, module_id: 12, name: "Addition of Fractions", practice_questions: 30, adaptive_drill_tests: 3, difficulty_range: { min: 3, max: 7 }, avg_time_seconds: 80 },
  { id: 45, module_id: 12, name: "Subtraction of Fractions", practice_questions: 30, adaptive_drill_tests: 3, difficulty_range: { min: 3, max: 7 }, avg_time_seconds: 80 },
  { id: 46, module_id: 12, name: "HCF and LCM of Fractions", practice_questions: 30, adaptive_drill_tests: 3, difficulty_range: { min: 5, max: 8 }, avg_time_seconds: 100 },
  { id: 47, module_id: 12, name: "Comparison of Fractions", practice_questions: 30, adaptive_drill_tests: 3, difficulty_range: { min: 4, max: 7 }, avg_time_seconds: 70 },

  // Module 13: Indices (50 questions)
  { id: 48, module_id: 13, name: "Properties of Indices", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 85 },

  // Module 14: Surds (50 questions)
  { id: 49, module_id: 14, name: "Properties of Surds", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 95 },

  // Module 15: VBODMAS (50 questions)
  { id: 50, module_id: 15, name: "VBODMAS Rule", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 90 },

  // Module 16: Approximation Techniques (50 questions)
  { id: 51, module_id: 16, name: "Various Approximation Patterns", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 8 }, avg_time_seconds: 80 },

  // Module 17: Simple Equations (150 questions) - "Equations Basics" is video only
  { id: 52, module_id: 17, name: "Equation Formation from Word Problems", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 130 },
  { id: 53, module_id: 17, name: "Equation Solving Techniques", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 100 },
  { id: 54, module_id: 17, name: "System of Solutions and Plotting the Graph", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 6, max: 10 }, avg_time_seconds: 150 },

  // Module 18: Factorisation (200 questions)
  { id: 55, module_id: 18, name: "Factorisation of Simple Quadratics", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 7 }, avg_time_seconds: 95 },
  { id: 56, module_id: 18, name: "Factorisation of Harder Quadratics", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 6, max: 9 }, avg_time_seconds: 120 },
  { id: 57, module_id: 18, name: "Factorisation of Cubics", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 7, max: 10 }, avg_time_seconds: 150 },
  { id: 58, module_id: 18, name: "Highest Common Factor", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 8 }, avg_time_seconds: 100 },

  // Module 19: DI + QA Application (250 questions)
  { id: 59, module_id: 19, name: "Percentage Applications", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 140 },
  { id: 60, module_id: 19, name: "Ratio, Proportion and Average Applications", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 5, max: 9 }, avg_time_seconds: 150 },
  { id: 61, module_id: 19, name: "Approximation, Estimation and Option Elimination", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 6, max: 9 }, avg_time_seconds: 120 },
  { id: 62, module_id: 19, name: "Data Simplification and Table Handling", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 6, max: 10 }, avg_time_seconds: 160 },
  { id: 63, module_id: 19, name: "Multi-Skill Application & Decision Intelligence", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 7, max: 10 }, avg_time_seconds: 180 },

  // Module 20: Miscellaneous (50 questions)
  { id: 64, module_id: 20, name: "Unitary Method and its Applications", practice_questions: 50, adaptive_drill_tests: 5, difficulty_range: { min: 4, max: 8 }, avg_time_seconds: 105 },
];

export function getMicroSkillMetadata(microSkillId: number): MicroSkillMetadata | undefined {
  return MICRO_SKILLS_METADATA.find(ms => ms.id === microSkillId);
}

export function getMicroSkillsByModule(moduleId: number): MicroSkillMetadata[] {
  return MICRO_SKILLS_METADATA.filter(ms => ms.module_id === moduleId);
}

export function getMicroSkillName(microSkillId: number): string {
  const microSkill = MICRO_SKILLS_METADATA.find(ms => ms.id === microSkillId);
  return microSkill ? microSkill.name : `Micro-Skill ${microSkillId}`;
}
