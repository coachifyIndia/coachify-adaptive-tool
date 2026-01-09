/**
 * MODULE METADATA CONSTANTS
 * 
 * Contains all module information including module names, descriptions, and skills
 */

export interface ModuleMetadata {
  id: number;
  name: string;
  description: string;
}

export const MODULES_METADATA: ModuleMetadata[] = [
  { id: 0, name: "Magic Maths", description: "Master magical calculation techniques and mental math tricks" },
  { id: 1, name: "Speed Addition", description: "Learn rapid addition techniques for quick mental calculations" },
  { id: 2, name: "Speed Subtraction", description: "Master fast subtraction methods and mental calculation shortcuts" },
  { id: 3, name: "Speed Multiplication", description: "Learn advanced multiplication techniques for lightning-fast calculations" },
  { id: 4, name: "Speed Division", description: "Master quick division methods and mental division strategies" },
  { id: 5, name: "Squaring Techniques", description: "Learn efficient techniques for squaring numbers mentally" },
  { id: 6, name: "Cubing Techniques", description: "Master methods for calculating cubes of numbers quickly" },
  { id: 7, name: "Cube Rooting Techniques", description: "Learn techniques for finding cube roots efficiently" },
  { id: 8, name: "Square Rooting Techniques", description: "Master methods for calculating square roots mentally" },
  { id: 9, name: "Percentage", description: "Apply percentage concepts to real-world scenarios including profit, loss, and discounts" },
  { id: 10, name: "Ratio", description: "Understand and solve problems involving ratios and proportional relationships" },
  { id: 11, name: "Average", description: "Master calculation of averages and mean values in various contexts" },
  { id: 12, name: "Fractions", description: "Build a strong foundation in understanding and working with fractions" },
  { id: 13, name: "Indices", description: "Learn the rules and applications of indices and exponents" },
  { id: 14, name: "Surds", description: "Master operations with surds and irrational numbers" },
  { id: 15, name: "VBODMAS", description: "Master the order of operations using VBODMAS rule" },
  { id: 16, name: "Approximation Techniques", description: "Learn efficient approximation methods for quick estimation" },
  { id: 17, name: "Simple Equations", description: "Solve linear equations and simple algebraic expressions" },
  { id: 18, name: "Factorisation", description: "Master factorisation techniques for algebraic expressions" },
  { id: 19, name: "DI + QA Application", description: "Apply calculation techniques to Data Interpretation and Quantitative Aptitude problems" },
  { id: 20, name: "Miscellaneous", description: "Practice mixed calculation problems and advanced problem-solving techniques" },
];

export function getModuleName(moduleId: number): string {
  const module = MODULES_METADATA.find(m => m.id === moduleId);
  return module ? module.name : `Module ${moduleId}`;
}

export function getModuleDescription(moduleId: number): string {
  const module = MODULES_METADATA.find(m => m.id === moduleId);
  return module ? module.description : `Practice material for Module ${moduleId}`;
}
