/**
 * MODULE AND MICRO-SKILLS DATA STRUCTURE
 *
 * This file contains the complete structure of all 21 modules and 74 micro-skills
 * that make up the Adaptive Learning Engine curriculum.
 *
 * IMPORTANT CONCEPTS FOR JUNIOR DEVELOPERS:
 * - Each module contains multiple micro-skills (smallest unit of learning)
 * - Micro-skills are numbered 1-74 globally across all modules
 * - Some modules may have prerequisites (skills you need to learn first)
 * - Difficulty progression: skills within a module should get harder
 *
 * DATA STRUCTURE:
 * - module_id: Unique identifier (0-20)
 * - name: Human-readable module name
 * - description: What students will learn in this module
 * - micro_skills: Array of skills within this module
 *   - micro_skill_id: Global unique ID (1-74)
 *   - name: Skill name
 *   - description: What this specific skill teaches
 *   - estimated_time_minutes: Average time to master this skill
 *   - prerequisites: Array of micro_skill_ids that should be learned first
 */

export interface MicroSkill {
  micro_skill_id: number;
  name: string;
  description: string;
  estimated_time_minutes: number;
  prerequisites: number[]; // Array of micro_skill_ids that must be learned first
}

export interface Module {
  module_id: number;
  name: string;
  description: string;
  total_micro_skills: number;
  estimated_completion_hours: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  micro_skills: MicroSkill[];
}

/**
 * COMPLETE MODULE STRUCTURE
 *
 * This array represents the entire curriculum with all 21 modules and 74 micro-skills.
 * The data is based on the PRD (Product Requirements Document).
 */
export const MODULES_DATA: Module[] = [
  // ============================================================================
  // MODULE 0: MAGIC MATHS
  // ============================================================================
  {
    module_id: 0,
    name: 'Magic Maths',
    description: 'Interactive mathematical tricks and patterns to build foundational thinking',
    total_micro_skills: 5,
    estimated_completion_hours: 3,
    difficulty_level: 'beginner',
    micro_skills: [
      {
        micro_skill_id: 1,
        name: 'Mathematical Tricks',
        description: 'Learn fascinating mathematical shortcuts and mental calculation tricks',
        estimated_time_minutes: 30,
        prerequisites: [],
      },
      {
        micro_skill_id: 2,
        name: 'Date of Birth Prediction',
        description: 'Techniques to predict day of the week for any date',
        estimated_time_minutes: 40,
        prerequisites: [1],
      },
      {
        micro_skill_id: 3,
        name: 'Mental Calculation Shortcuts',
        description: 'Speed up calculations using mental math techniques',
        estimated_time_minutes: 35,
        prerequisites: [1],
      },
      {
        micro_skill_id: 4,
        name: 'Day Calculation (Zeller\'s Rule)',
        description: 'Master Zeller\'s algorithm for day-of-week calculations',
        estimated_time_minutes: 45,
        prerequisites: [2],
      },
      {
        micro_skill_id: 5,
        name: 'Mathematical Patterns',
        description: 'Recognize and use mathematical patterns for quick solutions',
        estimated_time_minutes: 30,
        prerequisites: [1, 3],
      },
    ],
  },

  // ============================================================================
  // MODULE 1: SPEED ADDITION
  // ============================================================================
  {
    module_id: 1,
    name: 'Speed Addition',
    description: 'Master fast addition techniques for 2, 3, and 4-digit numbers',
    total_micro_skills: 3,
    estimated_completion_hours: 2,
    difficulty_level: 'beginner',
    micro_skills: [
      {
        micro_skill_id: 6,
        name: '2-Digit Addition',
        description: 'Quick addition of two 2-digit numbers using mental math',
        estimated_time_minutes: 25,
        prerequisites: [],
      },
      {
        micro_skill_id: 7,
        name: '3-Digit Addition',
        description: 'Fast addition of 3-digit numbers with carry optimization',
        estimated_time_minutes: 35,
        prerequisites: [6],
      },
      {
        micro_skill_id: 8,
        name: '4-Digit Addition',
        description: 'Master addition of large 4-digit numbers efficiently',
        estimated_time_minutes: 40,
        prerequisites: [7],
      },
    ],
  },

  // ============================================================================
  // MODULE 2: SPEED SUBTRACTION
  // ============================================================================
  {
    module_id: 2,
    name: 'Speed Subtraction',
    description: 'Learn efficient subtraction methods with borrowing simplification',
    total_micro_skills: 3,
    estimated_completion_hours: 2,
    difficulty_level: 'beginner',
    micro_skills: [
      {
        micro_skill_id: 9,
        name: '2-Digit Subtraction',
        description: 'Quick subtraction techniques for 2-digit numbers',
        estimated_time_minutes: 25,
        prerequisites: [6],
      },
      {
        micro_skill_id: 10,
        name: '3-Digit Subtraction',
        description: 'Fast subtraction with simplified borrowing methods',
        estimated_time_minutes: 35,
        prerequisites: [9],
      },
      {
        micro_skill_id: 11,
        name: '4-Digit Subtraction',
        description: 'Master large number subtraction with mental strategies',
        estimated_time_minutes: 40,
        prerequisites: [10],
      },
    ],
  },

  // ============================================================================
  // MODULE 3: SPEED MULTIPLICATION (Largest Module - 16 Micro-Skills)
  // ============================================================================
  {
    module_id: 3,
    name: 'Speed Multiplication',
    description: 'Comprehensive multiplication techniques from basic patterns to advanced methods',
    total_micro_skills: 16,
    estimated_completion_hours: 8,
    difficulty_level: 'intermediate',
    micro_skills: [
      {
        micro_skill_id: 12,
        name: 'Multiplication by 9s Series',
        description: 'Pattern-based multiplication for numbers ending in 9',
        estimated_time_minutes: 20,
        prerequisites: [],
      },
      {
        micro_skill_id: 13,
        name: 'Multiplication by 1s Series',
        description: 'Quick multiplication patterns for 11, 111, etc.',
        estimated_time_minutes: 20,
        prerequisites: [],
      },
      {
        micro_skill_id: 14,
        name: 'Similar Digit Multiplication',
        description: 'Special techniques when digits are similar (e.g., 23 × 27)',
        estimated_time_minutes: 30,
        prerequisites: [12],
      },
      {
        micro_skill_id: 15,
        name: 'Powers of 5 Shortcuts',
        description: 'Lightning-fast multiplication by 5, 25, 125, etc.',
        estimated_time_minutes: 25,
        prerequisites: [],
      },
      {
        micro_skill_id: 16,
        name: 'Criss-Cross Method (2-Digit)',
        description: 'Visual criss-cross technique for 2-digit multiplication',
        estimated_time_minutes: 35,
        prerequisites: [6, 7],
      },
      {
        micro_skill_id: 17,
        name: 'Criss-Cross Method (3-Digit)',
        description: 'Extended criss-cross for 3-digit numbers',
        estimated_time_minutes: 40,
        prerequisites: [16],
      },
      {
        micro_skill_id: 18,
        name: 'Criss-Cross Method (4-Digit)',
        description: 'Advanced criss-cross for 4-digit multiplication',
        estimated_time_minutes: 45,
        prerequisites: [17],
      },
      {
        micro_skill_id: 19,
        name: 'Base 10 Method',
        description: 'Multiplication using base 10 deviation technique',
        estimated_time_minutes: 30,
        prerequisites: [14],
      },
      {
        micro_skill_id: 20,
        name: 'Base 100 Method',
        description: 'Multiplication using base 100 for larger numbers',
        estimated_time_minutes: 35,
        prerequisites: [19],
      },
      {
        micro_skill_id: 21,
        name: 'Base 1000 Method',
        description: 'Advanced base method for very large numbers',
        estimated_time_minutes: 40,
        prerequisites: [20],
      },
      {
        micro_skill_id: 22,
        name: 'Multiple Technique',
        description: 'Breaking numbers into multiples for easier calculation',
        estimated_time_minutes: 30,
        prerequisites: [15],
      },
      {
        micro_skill_id: 23,
        name: 'Submultiple Technique',
        description: 'Division-based shortcuts for multiplication',
        estimated_time_minutes: 30,
        prerequisites: [22],
      },
      {
        micro_skill_id: 24,
        name: 'Mixed Base Calculations',
        description: 'Combining different base methods for optimal speed',
        estimated_time_minutes: 40,
        prerequisites: [19, 20],
      },
      {
        micro_skill_id: 25,
        name: 'Algebraic Multiplication',
        description: 'Using algebraic identities for quick multiplication',
        estimated_time_minutes: 35,
        prerequisites: [14],
      },
      {
        micro_skill_id: 26,
        name: 'Digit Sum Verification',
        description: 'Verify multiplication results using digit sum technique',
        estimated_time_minutes: 25,
        prerequisites: [12, 13],
      },
      {
        micro_skill_id: 27,
        name: 'Advanced Multiplication Patterns',
        description: 'Master complex multiplication patterns and shortcuts',
        estimated_time_minutes: 45,
        prerequisites: [24, 25],
      },
    ],
  },

  // ============================================================================
  // MODULE 4: SPEED DIVISION
  // ============================================================================
  {
    module_id: 4,
    name: 'Speed Division',
    description: 'Efficient division techniques using base methods',
    total_micro_skills: 2,
    estimated_completion_hours: 2,
    difficulty_level: 'intermediate',
    micro_skills: [
      {
        micro_skill_id: 28,
        name: 'Base Method (Small Divisors)',
        description: 'Quick division using base method for smaller numbers',
        estimated_time_minutes: 40,
        prerequisites: [19],
      },
      {
        micro_skill_id: 29,
        name: 'Base Method (Large Divisors)',
        description: 'Division techniques for larger divisors and remainders',
        estimated_time_minutes: 50,
        prerequisites: [28],
      },
    ],
  },

  // ============================================================================
  // MODULE 5: SQUARING TECHNIQUES
  // ============================================================================
  {
    module_id: 5,
    name: 'Squaring Techniques',
    description: 'Fast methods to calculate squares of numbers',
    total_micro_skills: 4,
    estimated_completion_hours: 3,
    difficulty_level: 'intermediate',
    micro_skills: [
      {
        micro_skill_id: 30,
        name: 'Squaring Numbers Ending in 5',
        description: 'Lightning-fast technique for numbers ending in 5',
        estimated_time_minutes: 25,
        prerequisites: [],
      },
      {
        micro_skill_id: 31,
        name: '2-Digit Squaring',
        description: 'Quick squaring methods for any 2-digit number',
        estimated_time_minutes: 35,
        prerequisites: [30],
      },
      {
        micro_skill_id: 32,
        name: 'Multi-Digit Squaring',
        description: 'Squaring larger numbers using patterns',
        estimated_time_minutes: 40,
        prerequisites: [31],
      },
      {
        micro_skill_id: 33,
        name: 'Sum and Difference of Squares',
        description: 'Using algebraic identities: a² - b² = (a+b)(a-b)',
        estimated_time_minutes: 30,
        prerequisites: [31],
      },
    ],
  },

  // ============================================================================
  // MODULE 6: CUBING TECHNIQUES
  // ============================================================================
  {
    module_id: 6,
    name: 'Cubing Techniques',
    description: 'Methods to calculate cubes quickly',
    total_micro_skills: 4,
    estimated_completion_hours: 3,
    difficulty_level: 'advanced',
    micro_skills: [
      {
        micro_skill_id: 34,
        name: '2-Digit Cubing',
        description: 'Fast cubing of 2-digit numbers',
        estimated_time_minutes: 40,
        prerequisites: [31],
      },
      {
        micro_skill_id: 35,
        name: 'Base 100 Cubing',
        description: 'Cubing using base 100 deviation method',
        estimated_time_minutes: 45,
        prerequisites: [34],
      },
      {
        micro_skill_id: 36,
        name: 'Base 1000 Cubing',
        description: 'Advanced cubing for larger numbers',
        estimated_time_minutes: 50,
        prerequisites: [35],
      },
      {
        micro_skill_id: 37,
        name: 'Alternative Base Cubing',
        description: 'Choosing optimal base for different numbers',
        estimated_time_minutes: 45,
        prerequisites: [35, 36],
      },
    ],
  },

  // ============================================================================
  // MODULE 7: CUBE ROOTING TECHNIQUES
  // ============================================================================
  {
    module_id: 7,
    name: 'Cube Rooting Techniques',
    description: 'Find cube roots of numbers efficiently',
    total_micro_skills: 2,
    estimated_completion_hours: 2,
    difficulty_level: 'advanced',
    micro_skills: [
      {
        micro_skill_id: 38,
        name: 'Perfect Cube Roots',
        description: 'Quickly find cube roots of perfect cubes',
        estimated_time_minutes: 40,
        prerequisites: [34],
      },
      {
        micro_skill_id: 39,
        name: 'Imperfect Cube Approximations',
        description: 'Estimate cube roots of non-perfect cubes',
        estimated_time_minutes: 50,
        prerequisites: [38],
      },
    ],
  },

  // ============================================================================
  // MODULE 8: SQUARE ROOTING TECHNIQUES
  // ============================================================================
  {
    module_id: 8,
    name: 'Square Rooting Techniques',
    description: 'Methods to find square roots quickly',
    total_micro_skills: 2,
    estimated_completion_hours: 2,
    difficulty_level: 'intermediate',
    micro_skills: [
      {
        micro_skill_id: 40,
        name: 'Perfect Square Roots',
        description: 'Instantly recognize and calculate perfect square roots',
        estimated_time_minutes: 35,
        prerequisites: [30],
      },
      {
        micro_skill_id: 41,
        name: 'Imperfect Square Approximations',
        description: 'Estimate square roots using approximation techniques',
        estimated_time_minutes: 45,
        prerequisites: [40],
      },
    ],
  },

  // ============================================================================
  // MODULE 9: PERCENTAGE
  // ============================================================================
  {
    module_id: 9,
    name: 'Percentage',
    description: 'Master percentage calculations and applications',
    total_micro_skills: 5,
    estimated_completion_hours: 3,
    difficulty_level: 'beginner',
    micro_skills: [
      {
        micro_skill_id: 42,
        name: 'Percentage Basics',
        description: 'Understanding percentages and basic conversions',
        estimated_time_minutes: 30,
        prerequisites: [],
      },
      {
        micro_skill_id: 43,
        name: 'Quick Percentage Calculations',
        description: 'Mental shortcuts for common percentage calculations',
        estimated_time_minutes: 35,
        prerequisites: [42],
      },
      {
        micro_skill_id: 44,
        name: 'Percentage Change',
        description: 'Calculate increase, decrease, and percentage change',
        estimated_time_minutes: 30,
        prerequisites: [43],
      },
      {
        micro_skill_id: 45,
        name: 'Multiplying Factor Technique',
        description: 'Use multiplying factors for complex percentage problems',
        estimated_time_minutes: 40,
        prerequisites: [44],
      },
      {
        micro_skill_id: 46,
        name: 'Successive Percentage Changes',
        description: 'Handle multiple percentage changes in sequence',
        estimated_time_minutes: 45,
        prerequisites: [45],
      },
    ],
  },

  // ============================================================================
  // MODULE 10: RATIO
  // ============================================================================
  {
    module_id: 10,
    name: 'Ratio',
    description: 'Understand and apply ratio concepts',
    total_micro_skills: 3,
    estimated_completion_hours: 2,
    difficulty_level: 'beginner',
    micro_skills: [
      {
        micro_skill_id: 47,
        name: 'Ratio Fundamentals',
        description: 'Basic ratio concepts and simplification',
        estimated_time_minutes: 30,
        prerequisites: [],
      },
      {
        micro_skill_id: 48,
        name: 'Combining Ratios',
        description: 'Techniques to combine multiple ratios',
        estimated_time_minutes: 40,
        prerequisites: [47],
      },
      {
        micro_skill_id: 49,
        name: 'Complex Ratio Problems',
        description: 'Advanced ratio applications and patterns',
        estimated_time_minutes: 45,
        prerequisites: [48],
      },
    ],
  },

  // ============================================================================
  // MODULE 11: AVERAGE
  // ============================================================================
  {
    module_id: 11,
    name: 'Average',
    description: 'Calculate and apply average concepts',
    total_micro_skills: 2,
    estimated_completion_hours: 1.5,
    difficulty_level: 'beginner',
    micro_skills: [
      {
        micro_skill_id: 50,
        name: 'Average Basics',
        description: 'Understanding mean, median, and basic averages',
        estimated_time_minutes: 35,
        prerequisites: [],
      },
      {
        micro_skill_id: 51,
        name: 'Advanced Average Patterns',
        description: 'Shortcuts and patterns for complex average problems',
        estimated_time_minutes: 45,
        prerequisites: [50],
      },
    ],
  },

  // ============================================================================
  // MODULE 12: FRACTIONS
  // ============================================================================
  {
    module_id: 12,
    name: 'Fractions',
    description: 'Master fraction operations and comparisons',
    total_micro_skills: 5,
    estimated_completion_hours: 3,
    difficulty_level: 'beginner',
    micro_skills: [
      {
        micro_skill_id: 52,
        name: 'Fraction Fundamentals',
        description: 'Basic fraction concepts and simplification',
        estimated_time_minutes: 30,
        prerequisites: [],
      },
      {
        micro_skill_id: 53,
        name: 'Fraction Addition',
        description: 'Add fractions with different denominators',
        estimated_time_minutes: 35,
        prerequisites: [52],
      },
      {
        micro_skill_id: 54,
        name: 'Fraction Subtraction',
        description: 'Subtract fractions efficiently',
        estimated_time_minutes: 35,
        prerequisites: [53],
      },
      {
        micro_skill_id: 55,
        name: 'HCF and LCM Applications',
        description: 'Use HCF and LCM in fraction problems',
        estimated_time_minutes: 40,
        prerequisites: [53, 54],
      },
      {
        micro_skill_id: 56,
        name: 'Fraction Comparison',
        description: 'Quick techniques to compare fractions',
        estimated_time_minutes: 35,
        prerequisites: [52],
      },
    ],
  },

  // ============================================================================
  // MODULE 13: INDICES
  // ============================================================================
  {
    module_id: 13,
    name: 'Indices',
    description: 'Properties and operations with indices (exponents)',
    total_micro_skills: 1,
    estimated_completion_hours: 1.5,
    difficulty_level: 'intermediate',
    micro_skills: [
      {
        micro_skill_id: 57,
        name: 'Indices Properties',
        description: 'Master all properties and rules of indices',
        estimated_time_minutes: 60,
        prerequisites: [31],
      },
    ],
  },

  // ============================================================================
  // MODULE 14: SURDS
  // ============================================================================
  {
    module_id: 14,
    name: 'Surds',
    description: 'Operations and simplification of surds (radicals)',
    total_micro_skills: 1,
    estimated_completion_hours: 1.5,
    difficulty_level: 'intermediate',
    micro_skills: [
      {
        micro_skill_id: 58,
        name: 'Surds Operations',
        description: 'Simplify and operate with surds',
        estimated_time_minutes: 60,
        prerequisites: [40],
      },
    ],
  },

  // ============================================================================
  // MODULE 15: VBODMAS
  // ============================================================================
  {
    module_id: 15,
    name: 'VBODMAS',
    description: 'Master order of operations in complex expressions',
    total_micro_skills: 1,
    estimated_completion_hours: 1,
    difficulty_level: 'beginner',
    micro_skills: [
      {
        micro_skill_id: 59,
        name: 'Order of Operations',
        description: 'VBODMAS/PEMDAS rules for solving complex expressions',
        estimated_time_minutes: 45,
        prerequisites: [],
      },
    ],
  },

  // ============================================================================
  // MODULE 16: APPROXIMATION
  // ============================================================================
  {
    module_id: 16,
    name: 'Approximation Techniques',
    description: 'Quick estimation and approximation strategies',
    total_micro_skills: 1,
    estimated_completion_hours: 1,
    difficulty_level: 'beginner',
    micro_skills: [
      {
        micro_skill_id: 60,
        name: 'Estimation Strategies',
        description: 'Round and estimate for quick approximate answers',
        estimated_time_minutes: 45,
        prerequisites: [42],
      },
    ],
  },

  // ============================================================================
  // MODULE 17: SIMPLE EQUATIONS
  // ============================================================================
  {
    module_id: 17,
    name: 'Simple Equations',
    description: 'Solve linear equations and word problems',
    total_micro_skills: 4,
    estimated_completion_hours: 2.5,
    difficulty_level: 'beginner',
    micro_skills: [
      {
        micro_skill_id: 61,
        name: 'Equation Basics',
        description: 'Fundamentals of solving linear equations',
        estimated_time_minutes: 30,
        prerequisites: [],
      },
      {
        micro_skill_id: 62,
        name: 'Word Problem Conversions',
        description: 'Convert word problems into equations',
        estimated_time_minutes: 40,
        prerequisites: [61],
      },
      {
        micro_skill_id: 63,
        name: 'Advanced Equation Solving',
        description: 'Solve complex linear equations',
        estimated_time_minutes: 40,
        prerequisites: [61],
      },
      {
        micro_skill_id: 64,
        name: 'Graphical Representations',
        description: 'Understand equations through graphs',
        estimated_time_minutes: 45,
        prerequisites: [61],
      },
    ],
  },

  // ============================================================================
  // MODULE 18: FACTORISATION
  // ============================================================================
  {
    module_id: 18,
    name: 'Factorisation',
    description: 'Factor algebraic expressions and equations',
    total_micro_skills: 4,
    estimated_completion_hours: 3,
    difficulty_level: 'intermediate',
    micro_skills: [
      {
        micro_skill_id: 65,
        name: 'Simple Quadratic Factoring',
        description: 'Factor simple quadratic expressions',
        estimated_time_minutes: 35,
        prerequisites: [61],
      },
      {
        micro_skill_id: 66,
        name: 'Complex Quadratic Factoring',
        description: 'Advanced quadratic factorization techniques',
        estimated_time_minutes: 45,
        prerequisites: [65],
      },
      {
        micro_skill_id: 67,
        name: 'Cubic Factorization',
        description: 'Factor cubic expressions',
        estimated_time_minutes: 50,
        prerequisites: [66],
      },
      {
        micro_skill_id: 68,
        name: 'HCF Applications in Algebra',
        description: 'Use HCF concepts in algebraic expressions',
        estimated_time_minutes: 40,
        prerequisites: [55, 65],
      },
    ],
  },

  // ============================================================================
  // MODULE 19: DATA INTERPRETATION + QUANTITATIVE APTITUDE APPLICATION
  // ============================================================================
  {
    module_id: 19,
    name: 'DI + QA Application',
    description: 'Apply quantitative skills to data interpretation',
    total_micro_skills: 5,
    estimated_completion_hours: 4,
    difficulty_level: 'advanced',
    micro_skills: [
      {
        micro_skill_id: 69,
        name: 'Percentage in DI',
        description: 'Apply percentage concepts to data interpretation',
        estimated_time_minutes: 40,
        prerequisites: [46],
      },
      {
        micro_skill_id: 70,
        name: 'Ratio and Proportion in DI',
        description: 'Use ratio concepts for data analysis',
        estimated_time_minutes: 40,
        prerequisites: [49],
      },
      {
        micro_skill_id: 71,
        name: 'Approximation in DI',
        description: 'Quick approximations for data interpretation',
        estimated_time_minutes: 35,
        prerequisites: [60],
      },
      {
        micro_skill_id: 72,
        name: 'Table Handling Techniques',
        description: 'Efficiently extract and analyze tabular data',
        estimated_time_minutes: 45,
        prerequisites: [42, 47],
      },
      {
        micro_skill_id: 73,
        name: 'Multi-Skill Integration',
        description: 'Combine multiple quantitative skills for complex DI',
        estimated_time_minutes: 60,
        prerequisites: [69, 70, 71, 72],
      },
    ],
  },

  // ============================================================================
  // MODULE 20: MISCELLANEOUS
  // ============================================================================
  {
    module_id: 20,
    name: 'Miscellaneous',
    description: 'Additional problem-solving techniques',
    total_micro_skills: 1,
    estimated_completion_hours: 1,
    difficulty_level: 'beginner',
    micro_skills: [
      {
        micro_skill_id: 74,
        name: 'Unitary Method',
        description: 'Solve real-world problems using unitary method',
        estimated_time_minutes: 50,
        prerequisites: [47],
      },
    ],
  },
];

/**
 * HELPER FUNCTIONS FOR JUNIOR DEVELOPERS
 *
 * These utility functions help you work with the module data easily
 */

/**
 * Get total number of modules
 * @returns Total count of modules (should be 21)
 */
export const getTotalModules = (): number => {
  return MODULES_DATA.length;
};

/**
 * Get total number of micro-skills across all modules
 * @returns Total count of micro-skills (should be 74)
 */
export const getTotalMicroSkills = (): number => {
  return MODULES_DATA.reduce((total, module) => total + module.micro_skills.length, 0);
};

/**
 * Find a module by its ID
 * @param moduleId - The ID of the module to find (0-20)
 * @returns The module object or undefined if not found
 */
export const getModuleById = (moduleId: number): Module | undefined => {
  return MODULES_DATA.find((module) => module.module_id === moduleId);
};

/**
 * Find a micro-skill by its global ID
 * @param microSkillId - The global micro-skill ID (1-74)
 * @returns Object with module and micro-skill, or undefined if not found
 */
export const getMicroSkillById = (
  microSkillId: number
): { module: Module; microSkill: MicroSkill } | undefined => {
  for (const module of MODULES_DATA) {
    const microSkill = module.micro_skills.find((ms) => ms.micro_skill_id === microSkillId);
    if (microSkill) {
      return { module, microSkill };
    }
  }
  return undefined;
};

/**
 * Get all micro-skills for a specific difficulty level
 * @param difficulty - The difficulty level to filter by
 * @returns Array of micro-skills matching the difficulty
 */
export const getMicroSkillsByDifficulty = (
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): MicroSkill[] => {
  return MODULES_DATA.filter((module) => module.difficulty_level === difficulty).flatMap(
    (module) => module.micro_skills
  );
};

/**
 * Validate that all micro-skill IDs are unique and sequential (1-74)
 * This is useful for data integrity checks
 * @returns Object with validation result and any errors found
 */
export const validateModuleData = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const microSkillIds: number[] = [];

  // Collect all micro-skill IDs
  MODULES_DATA.forEach((module) => {
    module.micro_skills.forEach((ms) => {
      microSkillIds.push(ms.micro_skill_id);
    });
  });

  // Check for duplicates
  const uniqueIds = new Set(microSkillIds);
  if (uniqueIds.size !== microSkillIds.length) {
    errors.push('Duplicate micro-skill IDs found');
  }

  // Check if we have exactly 74 micro-skills
  if (microSkillIds.length !== 74) {
    errors.push(`Expected 74 micro-skills, found ${microSkillIds.length}`);
  }

  // Check if IDs are sequential (1-74)
  const sortedIds = [...microSkillIds].sort((a, b) => a - b);
  for (let i = 0; i < sortedIds.length; i++) {
    if (sortedIds[i] !== i + 1) {
      errors.push(`Micro-skill IDs are not sequential. Missing or duplicate ID: ${i + 1}`);
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
