/**
 * CONFIDENCE SCORING SERVICE
 *
 * Calculates automatic confidence scores for student answers based on:
 * - Correctness (40% weight)
 * - Time efficiency (35% weight) - Gaussian curve
 * - Hints usage (15% weight)
 * - Difficulty level (10% weight)
 *
 * ALGORITHM DESIGN:
 * The confidence score represents how confidently the student answered,
 * not just if they got it right. A correct answer that took too long or
 * needed hints indicates lower confidence/understanding.
 *
 * TIME FACTOR: Uses Gaussian distribution to reward answers near expected time.
 * Peak confidence at expected_time, decreases for both rushed and slow answers.
 */

import logger from '../utils/logger.util';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ConfidenceScoreInput {
  is_correct: boolean;
  time_taken_seconds: number;
  expected_time_seconds: number;
  hints_used: number;
  max_hints: number;
  difficulty_level: number; // 1-10
}

export interface ConfidenceScoreResult {
  confidence_score: number; // 0-1 scale
  interpretation: string;
  factors: {
    correctness_factor: number;
    time_factor: number;
    hints_factor: number;
    difficulty_factor: number;
  };
}

// ============================================================================
// ALGORITHM WEIGHTS
// ============================================================================

const WEIGHTS = {
  CORRECTNESS: 0.40,
  TIME: 0.35,
  HINTS: 0.15,
  DIFFICULTY: 0.10,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * CALCULATE TIME FACTOR
 *
 * Uses Gaussian (normal) distribution to calculate time efficiency.
 * Peak value (1.0) at expected_time, decreases symmetrically for both
 * faster and slower times.
 *
 * FORMULA: e^(-((time - expected)^2 / (2 × sigma^2)))
 * where sigma = expected_time × 0.5
 *
 * EXAMPLES (expected_time = 60s):
 * - 30s (rushed): 0.61
 * - 60s (perfect): 1.00
 * - 90s (slow): 0.61
 * - 120s (very slow): 0.14
 *
 * @param timeTaken - Actual time taken in seconds
 * @param expectedTime - Expected time in seconds
 * @returns Time factor (0-1)
 */
function calculateTimeFactor(timeTaken: number, expectedTime: number): number {
  try {
    // Handle edge cases
    if (expectedTime <= 0) {
      logger.warn('Invalid expected_time, using default 60s');
      expectedTime = 60;
    }

    if (timeTaken < 0) {
      logger.warn('Negative time_taken, using 0');
      timeTaken = 0;
    }

    // Sigma is 50% of expected time (allows reasonable variance)
    const sigma = expectedTime * 0.5;

    // Gaussian formula
    const exponent = -Math.pow(timeTaken - expectedTime, 2) / (2 * Math.pow(sigma, 2));
    const factor = Math.exp(exponent);

    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, factor));
  } catch (error) {
    logger.error('Error calculating time factor:', error);
    return 0.5; // Neutral default
  }
}

/**
 * CALCULATE HINTS FACTOR
 *
 * Linear penalty based on hints used.
 * Each hint reduces the base score (1.0) by 25% of maximum hints.
 *
 * EXAMPLES (max_hints = 2):
 * - 0 hints: 1.00
 * - 1 hint: 0.875
 * - 2 hints: 0.75
 *
 * @param hintsUsed - Number of hints used
 * @param maxHints - Maximum hints available
 * @returns Hints factor (0.75-1.0)
 */
function calculateHintsFactor(hintsUsed: number, maxHints: number): number {
  try {
    // Handle edge cases
    if (maxHints <= 0) {
      return 1.0; // No hints available, no penalty
    }

    if (hintsUsed < 0) {
      logger.warn('Negative hints_used, using 0');
      hintsUsed = 0;
    }

    // Clamp hints used to max
    hintsUsed = Math.min(hintsUsed, maxHints);

    // Linear penalty: 25% reduction per hint
    const hintRatio = hintsUsed / maxHints;
    const factor = 1.0 - hintRatio * 0.25;

    return Math.max(0.75, Math.min(1, factor)); // Floor at 0.75
  } catch (error) {
    logger.error('Error calculating hints factor:', error);
    return 0.875; // Neutral default (1 hint)
  }
}

/**
 * CALCULATE DIFFICULTY FACTOR
 *
 * Rewards correct answers on harder questions, neutral on incorrect.
 *
 * LOGIC:
 * - Correct: scales from 0.5 (easy) to 1.0 (hard)
 * - Incorrect: 0.5 (slight penalty regardless of difficulty)
 *
 * EXAMPLES:
 * - Correct, difficulty 1: 0.55
 * - Correct, difficulty 5: 0.75
 * - Correct, difficulty 10: 1.00
 * - Incorrect, any difficulty: 0.5
 *
 * @param isCorrect - Whether answer was correct
 * @param difficultyLevel - Question difficulty (1-10)
 * @returns Difficulty factor (0.5-1.0)
 */
function calculateDifficultyFactor(isCorrect: boolean, difficultyLevel: number): number {
  try {
    // Clamp difficulty to valid range
    difficultyLevel = Math.max(1, Math.min(10, difficultyLevel));

    if (isCorrect) {
      // Correct answer: bonus for harder questions
      // Formula: 0.5 + (difficulty/10) × 0.5
      // Ranges from 0.55 (diff=1) to 1.0 (diff=10)
      return 0.5 + (difficultyLevel / 10) * 0.5;
    } else {
      // Incorrect answer: neutral/slight penalty
      return 0.5;
    }
  } catch (error) {
    logger.error('Error calculating difficulty factor:', error);
    return 0.75; // Neutral default
  }
}

/**
 * GET CONFIDENCE INTERPRETATION
 *
 * Translates confidence score to human-readable message.
 *
 * @param score - Confidence score (0-1)
 * @param isCorrect - Whether answer was correct
 * @returns Interpretation string
 */
function getInterpretation(score: number, isCorrect: boolean): string {
  if (isCorrect) {
    if (score >= 0.8) {
      return 'High confidence - Strong understanding demonstrated';
    } else if (score >= 0.6) {
      return 'Good confidence - Answer correct but could be faster or needed hints';
    } else if (score >= 0.4) {
      return 'Moderate confidence - Correct answer but took extra time or multiple hints';
    } else {
      return 'Low confidence - Answer correct but struggled significantly';
    }
  } else {
    if (score >= 0.4) {
      return 'Attempted confidently but incorrect - May have conceptual misunderstanding';
    } else if (score >= 0.2) {
      return 'Low confidence attempt - Answer incorrect with hints or extra time';
    } else {
      return 'Very low confidence - Struggled and answered incorrectly';
    }
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * CALCULATE CONFIDENCE SCORE
 *
 * Main function that combines all factors using weighted formula:
 *
 * Confidence = (
 *   Correctness × 0.40 +
 *   Time Factor × 0.35 +
 *   Hints Factor × 0.15 +
 *   Difficulty Factor × 0.10
 * )
 *
 * USAGE:
 * ```typescript
 * const result = calculateConfidenceScore({
 *   is_correct: true,
 *   time_taken_seconds: 65,
 *   expected_time_seconds: 60,
 *   hints_used: 1,
 *   max_hints: 2,
 *   difficulty_level: 5,
 * });
 * console.log(result.confidence_score); // e.g., 0.76
 * console.log(result.interpretation);
 * ```
 *
 * @param input - Confidence calculation parameters
 * @returns Confidence score result with interpretation
 */
export function calculateConfidenceScore(
  input: ConfidenceScoreInput
): ConfidenceScoreResult {
  try {
    logger.debug('Calculating confidence score', { input });

    // ========================================================================
    // STEP 1: CALCULATE INDIVIDUAL FACTORS
    // ========================================================================

    // Correctness factor (binary: 1.0 or 0.0)
    const correctnessFactor = input.is_correct ? 1.0 : 0.0;

    // Time factor (Gaussian distribution)
    const timeFactor = calculateTimeFactor(input.time_taken_seconds, input.expected_time_seconds);

    // Hints factor (linear penalty)
    const hintsFactor = calculateHintsFactor(input.hints_used, input.max_hints);

    // Difficulty factor (bonus/penalty)
    const difficultyFactor = calculateDifficultyFactor(input.is_correct, input.difficulty_level);

    // ========================================================================
    // STEP 2: APPLY WEIGHTS AND COMBINE
    // ========================================================================

    const confidenceScore =
      correctnessFactor * WEIGHTS.CORRECTNESS +
      timeFactor * WEIGHTS.TIME +
      hintsFactor * WEIGHTS.HINTS +
      difficultyFactor * WEIGHTS.DIFFICULTY;

    // Clamp to [0, 1] range (safety check)
    const finalScore = Math.max(0, Math.min(1, confidenceScore));

    // ========================================================================
    // STEP 3: GENERATE INTERPRETATION
    // ========================================================================

    const interpretation = getInterpretation(finalScore, input.is_correct);

    // ========================================================================
    // STEP 4: RETURN RESULT
    // ========================================================================

    const result: ConfidenceScoreResult = {
      confidence_score: parseFloat(finalScore.toFixed(3)), // Round to 3 decimal places
      interpretation,
      factors: {
        correctness_factor: parseFloat(correctnessFactor.toFixed(3)),
        time_factor: parseFloat(timeFactor.toFixed(3)),
        hints_factor: parseFloat(hintsFactor.toFixed(3)),
        difficulty_factor: parseFloat(difficultyFactor.toFixed(3)),
      },
    };

    logger.debug('Confidence score calculated', { result });

    return result;
  } catch (error) {
    logger.error('Error in calculateConfidenceScore:', error);

    // Return neutral confidence on error
    return {
      confidence_score: 0.5,
      interpretation: 'Unable to calculate confidence - using neutral value',
      factors: {
        correctness_factor: input.is_correct ? 1.0 : 0.0,
        time_factor: 0.5,
        hints_factor: 0.875,
        difficulty_factor: 0.75,
      },
    };
  }
}

// ============================================================================
// VALIDATION FUNCTION
// ============================================================================

/**
 * VALIDATE CONFIDENCE INPUT
 *
 * Validates input parameters before calculation.
 * Useful for API endpoint validation.
 *
 * @param input - Input to validate
 * @returns Validation result
 */
export function validateConfidenceInput(input: Partial<ConfidenceScoreInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof input.is_correct !== 'boolean') {
    errors.push('is_correct must be a boolean');
  }

  if (
    typeof input.time_taken_seconds !== 'number' ||
    input.time_taken_seconds < 0
  ) {
    errors.push('time_taken_seconds must be a non-negative number');
  }

  if (
    typeof input.expected_time_seconds !== 'number' ||
    input.expected_time_seconds <= 0
  ) {
    errors.push('expected_time_seconds must be a positive number');
  }

  if (typeof input.hints_used !== 'number' || input.hints_used < 0) {
    errors.push('hints_used must be a non-negative number');
  }

  if (typeof input.max_hints !== 'number' || input.max_hints < 0) {
    errors.push('max_hints must be a non-negative number');
  }

  if (
    typeof input.difficulty_level !== 'number' ||
    input.difficulty_level < 1 ||
    input.difficulty_level > 10
  ) {
    errors.push('difficulty_level must be a number between 1 and 10');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  calculateConfidenceScore,
  validateConfidenceInput,
};
