/**
 * QUESTION SELECTION SERVICE
 *
 * This is the CORE of the adaptive learning engine!
 * It implements the intelligent algorithm that selects the right questions
 * for each user based on their skill level, performance history, and weak areas.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - This algorithm is what makes our platform "adaptive"
 * - It ensures users are always challenged at the right level
 * - Not too easy (boring), not too hard (frustrating)
 * - Focus on weak areas while maintaining overall progress
 *
 * ALGORITHM OVERVIEW:
 * 1. Analyze user's current skill levels across all micro-skills
 * 2. Categorize skills into: Weak, Moderate, Strong
 * 3. Select questions with distribution: 40% weak, 40% moderate, 20% strong
 * 4. Apply difficulty adjustment based on recent performance
 * 5. Consider skill decay (skills degrade over time without practice)
 * 6. Avoid recently attempted questions
 *
 * BUSINESS RULES:
 * - Weak areas: Mastery level < 50%
 * - Moderate areas: Mastery level 50-75%
 * - Strong areas: Mastery level > 75%
 * - Session size: 10 questions (configurable)
 * - Difficulty range: 1-5 (1=easiest, 5=hardest)
 */

import { QuestionModel } from '../models/question.model';
import { UserProgressModel } from '../models/userProgress.model';
import { IQuestion } from '../types';
import logger from '../utils/logger.util';

/**
 * SKILL CATEGORY INTERFACE
 *
 * Categorizes a micro-skill based on user's mastery level
 */
interface SkillCategory {
  micro_skill_id: number;
  module_id: number;
  mastery_level: number;
  current_difficulty: number;
  category: 'weak' | 'moderate' | 'strong' | 'unstarted';
  last_practiced?: Date;
  decay_factor: number; // How much the skill has degraded (0-1)
}

/**
 * QUESTION SELECTION RESULT
 *
 * Result returned by the selection algorithm
 */
interface QuestionSelectionResult {
  question: IQuestion;
  reason: string; // Why this question was selected (for debugging/analytics)
  target_skill: {
    micro_skill_id: number;
    module_id: number;
    current_mastery: number;
    category: string;
  };
}

/**
 * SELECTION CRITERIA
 *
 * Parameters that guide question selection
 */
interface SelectionCriteria {
  user_id: string;
  session_size?: number; // Number of questions to select (default: 10)
  user_segment?: string; // competitive_exam, school, kids, professional
  exclude_question_ids?: string[]; // Questions to exclude (recently attempted)
  focus_modules?: number[]; // Specific modules to focus on (optional)
}

/**
 * CALCULATE SKILL DECAY
 *
 * Skills degrade over time without practice.
 * This function calculates how much a skill has decayed.
 *
 * FORMULA: decay_factor = e^(-0.05 * days_since_last_practice)
 *
 * EXAMPLES:
 * - 0 days: decay = 1.00 (no decay)
 * - 7 days: decay = 0.70 (30% decay)
 * - 14 days: decay = 0.50 (50% decay)
 * - 30 days: decay = 0.22 (78% decay)
 *
 * WHY THIS MATTERS:
 * - If a user practiced a skill 30 days ago, it's likely degraded
 * - We adjust the effective mastery level to account for this
 * - This helps identify skills that need refreshing
 *
 * @param lastPracticedDate - When the skill was last practiced
 * @returns Decay factor (0-1, where 1 = no decay)
 */
function calculateSkillDecay(lastPracticedDate?: Date): number {
  if (!lastPracticedDate) {
    return 1.0; // Never practiced, no decay to apply
  }

  const now = new Date();
  const daysSinceLastPractice = Math.floor(
    (now.getTime() - lastPracticedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Apply exponential decay formula
  const decayFactor = Math.exp(-0.05 * daysSinceLastPractice);

  return Math.max(0.1, decayFactor); // Minimum 10% retention
}

/**
 * CATEGORIZE USER SKILLS
 *
 * Analyzes all of user's skills and categorizes them into:
 * - Weak (mastery < 50%)
 * - Moderate (mastery 50-75%)
 * - Strong (mastery > 75%)
 * - Unstarted (never practiced)
 *
 * Also applies skill decay to adjust effective mastery levels.
 *
 * @param user_id - The user's ID
 * @returns Categorized skills
 */
async function categorizeUserSkills(user_id: string): Promise<SkillCategory[]> {
  try {
    // STEP 1: Fetch all user progress records
    const userProgress = await UserProgressModel.find({ user_id }).lean();

    // STEP 2: Create skill categories map
    const skillCategories: Map<string, SkillCategory> = new Map();

    // STEP 3: Process each progress record
    for (const progress of userProgress) {
      const key = `${progress.module_id}_${progress.micro_skill_id}`;

      // Calculate decay factor
      const decayFactor = calculateSkillDecay(progress.skill_status.last_practiced);

      // Adjust mastery level for decay
      const effectiveMastery = progress.skill_status.mastery_level * decayFactor;

      // Categorize based on effective mastery
      let category: 'weak' | 'moderate' | 'strong' | 'unstarted';
      if (effectiveMastery < 50) {
        category = 'weak';
      } else if (effectiveMastery < 75) {
        category = 'moderate';
      } else {
        category = 'strong';
      }

      skillCategories.set(key, {
        micro_skill_id: progress.micro_skill_id,
        module_id: progress.module_id,
        mastery_level: effectiveMastery,
        current_difficulty: progress.skill_status.current_difficulty,
        category,
        last_practiced: progress.skill_status.last_practiced,
        decay_factor: decayFactor,
      });
    }

    return Array.from(skillCategories.values());
  } catch (error) {
    logger.error('Error categorizing user skills:', error);
    throw error;
  }
}

/**
 * SELECT QUESTIONS FOR PRACTICE SESSION
 *
 * This is the MAIN ALGORITHM that selects questions adaptively.
 *
 * DISTRIBUTION STRATEGY:
 * - 40% from weak areas (need improvement)
 * - 40% from moderate areas (building mastery)
 * - 20% from strong areas (maintain proficiency, build confidence)
 *
 * SELECTION PROCESS:
 * 1. Categorize all user skills
 * 2. Determine target distribution based on session size
 * 3. Select questions from each category
 * 4. Ensure variety (different modules, skills)
 * 5. Avoid recently attempted questions
 * 6. Match difficulty to user's current level
 *
 * @param criteria - Selection criteria
 * @returns Array of selected questions with metadata
 */
export async function selectQuestionsForSession(
  criteria: SelectionCriteria
): Promise<QuestionSelectionResult[]> {
  try {
    const {
      user_id,
      session_size = 10,
      exclude_question_ids = [],
      focus_modules = [],
    } = criteria;

    logger.info(`Selecting ${session_size} questions for user: ${user_id}`);

    // ========================================================================
    // STEP 1: CATEGORIZE USER'S SKILLS
    // ========================================================================

    const skillCategories = await categorizeUserSkills(user_id);

    // Separate skills by category
    const weakSkills = skillCategories.filter((s) => s.category === 'weak');
    const moderateSkills = skillCategories.filter((s) => s.category === 'moderate');
    const strongSkills = skillCategories.filter((s) => s.category === 'strong');

    logger.debug(
      `Skill distribution - Weak: ${weakSkills.length}, Moderate: ${moderateSkills.length}, Strong: ${strongSkills.length}`
    );

    // ========================================================================
    // STEP 2: CALCULATE TARGET DISTRIBUTION
    // ========================================================================

    // Default distribution: 40% weak, 40% moderate, 20% strong
    let targetWeak = Math.round(session_size * 0.4);
    let targetModerate = Math.round(session_size * 0.4);
    let targetStrong = Math.round(session_size * 0.2);

    // ADAPTIVE ADJUSTMENT:
    // If user has few weak areas, redistribute to moderate/strong
    if (weakSkills.length < targetWeak) {
      const surplus = targetWeak - weakSkills.length;
      targetWeak = weakSkills.length;
      targetModerate += Math.floor(surplus * 0.6);
      targetStrong += Math.ceil(surplus * 0.4);
    }

    // If user has few moderate areas, redistribute
    if (moderateSkills.length < targetModerate) {
      const surplus = targetModerate - moderateSkills.length;
      targetModerate = moderateSkills.length;
      targetStrong += surplus;
    }

    // If user is a complete beginner (no skills practiced)
    if (skillCategories.length === 0) {
      logger.info('New user detected - selecting beginner-friendly questions');
      return await selectBeginnersQuestions(session_size, exclude_question_ids, focus_modules);
    }

    logger.debug(
      `Target distribution - Weak: ${targetWeak}, Moderate: ${targetModerate}, Strong: ${targetStrong}`
    );

    // ========================================================================
    // STEP 3: SELECT QUESTIONS FROM EACH CATEGORY
    // ========================================================================

    const selectedQuestions: QuestionSelectionResult[] = [];

    // Select from weak areas
    if (targetWeak > 0 && weakSkills.length > 0) {
      const weakQuestions = await selectQuestionsFromCategory(
        weakSkills,
        targetWeak,
        exclude_question_ids,
        'weak',
        focus_modules
      );
      selectedQuestions.push(...weakQuestions);
    }

    // Select from moderate areas
    if (targetModerate > 0 && moderateSkills.length > 0) {
      const moderateQuestions = await selectQuestionsFromCategory(
        moderateSkills,
        targetModerate,
        exclude_question_ids,
        'moderate',
        focus_modules
      );
      selectedQuestions.push(...moderateQuestions);
    }

    // Select from strong areas
    if (targetStrong > 0 && strongSkills.length > 0) {
      const strongQuestions = await selectQuestionsFromCategory(
        strongSkills,
        targetStrong,
        exclude_question_ids,
        'strong',
        focus_modules
      );
      selectedQuestions.push(...strongQuestions);
    }

    // ========================================================================
    // STEP 4: FILL REMAINING SLOTS IF NEEDED
    // ========================================================================

    // If we didn't get enough questions, fill with any available questions
    if (selectedQuestions.length < session_size) {
      const needed = session_size - selectedQuestions.length;
      logger.warn(`Only found ${selectedQuestions.length}/${session_size} questions, filling remaining slots`);

      const fillQuestions = await fillRemainingSlots(
        needed,
        exclude_question_ids,
        selectedQuestions.map((q) => q.question._id.toString()),
        focus_modules
      );
      selectedQuestions.push(...fillQuestions);
    }

    // ========================================================================
    // STEP 5: SHUFFLE TO AVOID PREDICTABLE PATTERNS
    // ========================================================================

    shuffleArray(selectedQuestions);

    logger.info(`Successfully selected ${selectedQuestions.length} questions for user ${user_id}`);

    return selectedQuestions;
  } catch (error) {
    logger.error('Error selecting questions for session:', error);
    throw error;
  }
}

/**
 * SELECT QUESTIONS FROM A SPECIFIC CATEGORY
 *
 * Selects questions matching the skill category (weak/moderate/strong)
 *
 * SELECTION CRITERIA:
 * - Match micro_skill_id from the category
 * - Match difficulty level to user's current level
 * - Ensure variety (don't select all from same skill)
 * - Avoid excluded questions
 *
 * @param skills - Skills in this category
 * @param count - Number of questions to select
 * @param excludeIds - Question IDs to exclude
 * @param category - Category name (for logging)
 * @param focusModules - Specific modules to focus on
 * @returns Selected questions
 */
async function selectQuestionsFromCategory(
  skills: SkillCategory[],
  count: number,
  excludeIds: string[],
  category: string,
  focusModules: number[]
): Promise<QuestionSelectionResult[]> {
  const selected: QuestionSelectionResult[] = [];

  // Sort skills: prioritize those with lowest mastery (need most help)
  const sortedSkills = [...skills].sort((a, b) => a.mastery_level - b.mastery_level);

  // Filter by focus modules if specified
  const relevantSkills = focusModules.length > 0
    ? sortedSkills.filter((s) => focusModules.includes(s.module_id))
    : sortedSkills;

  // Try to get questions from each skill (variety)
  for (const skill of relevantSkills) {
    if (selected.length >= count) break;

    // Determine appropriate difficulty level
    // For weak areas, use current difficulty or lower
    // For strong areas, use current difficulty or higher
    let targetDifficulty = skill.current_difficulty;
    if (category === 'weak' && targetDifficulty > 1) {
      targetDifficulty = Math.max(1, targetDifficulty - 1);
    } else if (category === 'strong' && targetDifficulty < 5) {
      targetDifficulty = Math.min(5, targetDifficulty + 1);
    }

    // Find questions for this skill
    const questions = await QuestionModel.find({
      module_id: skill.module_id,
      micro_skill_id: skill.micro_skill_id,
      'metadata.difficulty_level': { $gte: targetDifficulty - 1, $lte: targetDifficulty + 1 },
      _id: { $nin: excludeIds },
    })
      .limit(2) // Get up to 2 questions per skill for variety
      .lean();

    // Add questions to selection
    for (const question of questions) {
      if (selected.length >= count) break;

      selected.push({
        question: question as unknown as IQuestion,
        reason: `${category} area - mastery: ${skill.mastery_level.toFixed(1)}%, decay: ${(skill.decay_factor * 100).toFixed(0)}%`,
        target_skill: {
          micro_skill_id: skill.micro_skill_id,
          module_id: skill.module_id,
          current_mastery: skill.mastery_level,
          category,
        },
      });

      // Add to exclude list for next iterations
      excludeIds.push(question._id.toString());
    }
  }

  return selected;
}

/**
 * SELECT BEGINNER-FRIENDLY QUESTIONS
 *
 * For brand new users who haven't practiced any skills yet.
 * Selects easy questions from foundational modules.
 *
 * @param count - Number of questions to select
 * @param excludeIds - Questions to exclude
 * @param focusModules - Specific modules to focus on (optional)
 * @returns Selected beginner questions
 */
async function selectBeginnersQuestions(
  count: number,
  excludeIds: string[],
  focusModules: number[] = []
): Promise<QuestionSelectionResult[]> {
  // Determine which modules to use
  let targetModules: number[];
  if (focusModules.length > 0) {
    // ✅ FIX: Use focus modules if specified
    targetModules = focusModules;
  } else {
    // Default beginner modules (foundational topics)
    targetModules = [0, 1, 2]; // Mental Math, Fractions, Basic Arithmetic
  }

  const questions = await QuestionModel.find({
    module_id: { $in: targetModules },
    'metadata.difficulty_level': { $lte: 2 }, // Easy questions only
    _id: { $nin: excludeIds },
  })
    .limit(count)
    .lean();

  return questions.map((q) => ({
    question: q as unknown as IQuestion,
    reason: 'Beginner-friendly question for new user',
    target_skill: {
      micro_skill_id: q.micro_skill_id,
      module_id: q.module_id,
      current_mastery: 0,
      category: 'unstarted',
    },
  }));
}

/**
 * FILL REMAINING SLOTS
 *
 * If we couldn't find enough questions from categorized skills,
 * fill the remaining slots with any available questions.
 *
 * @param count - Number of questions needed
 * @param excludeIds - Questions to exclude
 * @param alreadySelected - Questions already selected
 * @param focusModules - Specific modules to focus on (optional)
 * @returns Fill questions
 */
async function fillRemainingSlots(
  count: number,
  excludeIds: string[],
  alreadySelected: string[],
  focusModules: number[] = []
): Promise<QuestionSelectionResult[]> {
  const allExcluded = [...excludeIds, ...alreadySelected];

  // Build query with module filter if focus modules specified
  const query: any = {
    _id: { $nin: allExcluded },
  };

  // ✅ FIX: Filter by focus modules if specified
  if (focusModules.length > 0) {
    query.module_id = { $in: focusModules };
  }

  const questions = await QuestionModel.find(query)
    .limit(count)
    .lean();

  return questions.map((q) => ({
    question: q as unknown as IQuestion,
    reason: 'Fill question - maintaining session size',
    target_skill: {
      micro_skill_id: q.micro_skill_id,
      module_id: q.module_id,
      current_mastery: 0,
      category: 'unstarted',
    },
  }));
}

/**
 * SHUFFLE ARRAY
 *
 * Fisher-Yates shuffle algorithm to randomize question order.
 * This prevents predictable patterns (e.g., all easy questions first).
 *
 * @param array - Array to shuffle (modified in place)
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * GET NEXT QUESTION IN SESSION
 *
 * Gets the next question for an ongoing session.
 * This is called after each answer submission.
 *
 * @param user_id - User ID
 * @param session_id - Current session ID
 * @param attempted_question_ids - Questions already attempted in this session
 * @returns Next question
 */
export async function getNextQuestion(
  user_id: string,
  _session_id: string,
  attempted_question_ids: string[]
): Promise<QuestionSelectionResult | null> {
  try {
    // Select a single question, excluding already attempted ones
    const questions = await selectQuestionsForSession({
      user_id,
      session_size: 1,
      exclude_question_ids: attempted_question_ids,
    });

    return questions.length > 0 ? questions[0] : null;
  } catch (error) {
    logger.error('Error getting next question:', error);
    throw error;
  }
}

/**
 * SELECT QUESTIONS FOR ADAPTIVE DRILL
 *
 * Selects questions for a specific adaptive drill (mixed micro-skills).
 *
 * ADAPTIVE STRATEGY:
 * - Mixes questions from ALL micro-skills in the module.
 * - Per-skill difficulty adaptation:
 *   - Fetches last completed drill for this module.
 *   - If skill was answered correctly → Increase Difficulty
 *   - If skill was answered incorrectly → Maintain Difficulty
 *   - If new skill → Default Difficulty 1
 *
 * @param user_id - User ID
 * @param module_id - Module ID
 * @param session_size - Number of questions (default 10)
 * @returns Selected questions
 */
export async function selectAdaptiveDrillQuestions(
  user_id: string,
  module_id: number,
  session_size: number = 10
): Promise<QuestionSelectionResult[]> {
  try {
    const { QuestionModel } = require('../models/question.model');
    const { SessionModel } = require('../models/session.model');

    logger.info(`Selecting adaptive drill questions for user ${user_id}, module ${module_id}`);

    // 1. Get all micro-skills for this module (from Questions)
    // We query distinct micro_skills from questions available in this module
    const microSkillIds = await QuestionModel.distinct('micro_skill_id', {
      module_id: module_id
    });

    if (!microSkillIds || microSkillIds.length === 0) {
      logger.warn(`No micro-skills found for module ${module_id}`);
      return [];
    }
    
    // 2. Fetch ALL Completed Drills for this module
    // We need: (a) Last drill for difficulty adjustment, (b) ALL drills to exclude attempted questions
    const allCompletedDrills = await SessionModel.find({
      user_id,
      module_id,
      session_type: 'drill',
      completed_at: { $ne: null }
    }).sort({ completed_at: -1 });

    const lastSession = allCompletedDrills.length > 0 ? allCompletedDrills[0] : null;

    // ✅ NEW: Collect ALL question IDs attempted in previous drills to avoid repetition
    const previouslyAttemptedQuestionIds: string[] = [];
    for (const session of allCompletedDrills) {
      for (const question of session.questions) {
        if (question.question_id) {
          previouslyAttemptedQuestionIds.push(question.question_id.toString());
        }
      }
    }

    logger.info(`Found ${allCompletedDrills.length} previous drill(s) with ${previouslyAttemptedQuestionIds.length} total attempted questions to exclude`);

    // 3. Determine Difficulty for Each Micro-skill
    // This implements the core adaptive difficulty algorithm
    const skillDifficulties: Record<number, number> = {};

    for (const msId of microSkillIds) {
      let difficulty = 1; // Default: First drill or skill not in previous drill

      if (lastSession) {
        // Find questions for this micro-skill in the last session
        const skillQuestions = lastSession.questions.filter((q: any) => q.micro_skill_id === msId);

        if (skillQuestions.length > 0) {
          // Calculate performance metrics
          const totalQuestions = skillQuestions.length;
          const correctAnswers = skillQuestions.filter((q: any) => q.is_correct).length;
          const accuracy = correctAnswers / totalQuestions;
          const accuracyPercent = (accuracy * 100).toFixed(0);

          // Calculate base difficulty (average of questions attempted)
          const avgDifficulty = skillQuestions.reduce(
            (sum: number, q: any) => sum + (q.difficulty || 1),
            0
          ) / totalQuestions;
          const baseDifficulty = Math.round(avgDifficulty);

          // CORE ADAPTIVE LOGIC: Two distinct paths
          if (accuracy < 0.40) {
            // PATH 1: Poor Performance (0-39%) → HARD RESET to Difficulty 1
            // Indicates fundamental gaps - restart from basics
            difficulty = 1;
            logger.info(
              `Skill ${msId}: Poor (${accuracyPercent}%) → RESET to difficulty 1`
            );
          } else {
            // PATH 2: Adequate or Better (40-100%) → CALCULATED ADJUSTMENT
            // Apply graduated difficulty changes based on performance bands
            let adjustment = 0;

            if (accuracy === 1.0) {
              // 100%: Perfect → Accelerate by +3 levels
              adjustment = 3;
              logger.info(`Skill ${msId}: Perfect (${accuracyPercent}%) → +3 levels`);
            } else if (accuracy >= 0.85) {
              // 85-99%: Excellent → Advance by +2 levels
              adjustment = 2;
              logger.info(`Skill ${msId}: Excellent (${accuracyPercent}%) → +2 levels`);
            } else if (accuracy >= 0.75) {
              // 75-84%: Good → Progress by +1 level
              adjustment = 1;
              logger.info(`Skill ${msId}: Good (${accuracyPercent}%) → +1 level`);
            } else if (accuracy >= 0.60) {
              // 60-74%: Adequate → Maintain current level
              adjustment = 0;
              logger.info(`Skill ${msId}: Adequate (${accuracyPercent}%) → Maintain`);
            } else {
              // 40-59%: Struggling → Step back by -1 level
              adjustment = -1;
              logger.info(`Skill ${msId}: Struggling (${accuracyPercent}%) → -1 level`);
            }

            // Apply adjustment with bounds (difficulty must be between 1 and 10)
            difficulty = Math.max(1, Math.min(10, baseDifficulty + adjustment));
          }

          logger.info(
            `Skill ${msId} result: ${correctAnswers}/${totalQuestions} (${accuracyPercent}%) | ` +
            `Base: ${baseDifficulty} → New: ${difficulty}`
          );
        } else {
          // Skill not in last session - treat as new skill
          difficulty = 1;
          logger.info(`Skill ${msId}: Not in last drill → Start at difficulty 1`);
        }
      } else {
        // No previous session - first drill
        logger.info(`Skill ${msId}: First drill → Start at difficulty 1`);
      }

      skillDifficulties[msId] = difficulty;
    }

    // ✅ NEW: Calculate Dynamic Question Allocation Based on Skill Mastery
    // Analyze performance across multiple recent drills to determine mastery level
    const skillAllocation: Record<number, number> = {};
    const recentDrillsToAnalyze = Math.min(3, allCompletedDrills.length); // Look at last 2-3 drills

    for (const msId of microSkillIds) {
      // Default: Equal distribution
      let allocationWeight = 1.0;

      if (recentDrillsToAnalyze >= 2) {
        // Analyze last 2-3 drills for this skill
        const recentAccuracies: number[] = [];

        for (let i = 0; i < recentDrillsToAnalyze; i++) {
          const drill = allCompletedDrills[i];
          const skillQuestions = drill.questions.filter((q: any) => q.micro_skill_id === msId);

          if (skillQuestions.length > 0) {
            const correct = skillQuestions.filter((q: any) => q.is_correct).length;
            const accuracy = correct / skillQuestions.length;
            recentAccuracies.push(accuracy);
          }
        }

        // Determine mastery status
        if (recentAccuracies.length >= 2) {
          const avgAccuracy = recentAccuracies.reduce((a, b) => a + b, 0) / recentAccuracies.length;
          const minAccuracy = Math.min(...recentAccuracies);

          // ✅ MASTERED: Consistently high performance (90%+ average, 85%+ minimum)
          // Reduce question allocation to maintain skill without over-practicing
          if (avgAccuracy >= 0.90 && minAccuracy >= 0.85) {
            allocationWeight = 0.3; // Reduce to ~30% of normal allocation
            logger.info(`Skill ${msId}: MASTERED (${(avgAccuracy*100).toFixed(0)}% avg) → Reduced allocation (${allocationWeight}x)`);
          }
          // ✅ STRUGGLING: Consistently low performance (< 50% average)
          // Increase question allocation for focused practice
          else if (avgAccuracy < 0.50) {
            allocationWeight = 1.5; // Increase to 150% of normal allocation
            logger.info(`Skill ${msId}: STRUGGLING (${(avgAccuracy*100).toFixed(0)}% avg) → Increased allocation (${allocationWeight}x)`);
          }
          // ✅ DEVELOPING: Moderate performance (50-89%)
          // Standard allocation
          else {
            allocationWeight = 1.0;
            logger.info(`Skill ${msId}: DEVELOPING (${(avgAccuracy*100).toFixed(0)}% avg) → Standard allocation (${allocationWeight}x)`);
          }
        }
      }

      skillAllocation[msId] = allocationWeight;
    }

    // Calculate actual question counts per skill based on allocation weights
    const totalWeight = Object.values(skillAllocation).reduce((a, b) => a + b, 0);
    const skillQuestionCounts: Record<number, number> = {};
    let allocatedQuestions = 0;

    for (const msId of microSkillIds) {
      const proportion = skillAllocation[msId] / totalWeight;
      const count = Math.max(1, Math.round(session_size * proportion)); // Minimum 1 question per skill
      skillQuestionCounts[msId] = count;
      allocatedQuestions += count;
    }

    // Adjust if we've allocated too many/few questions due to rounding
    const diff = allocatedQuestions - session_size;
    if (diff !== 0) {
      // Add/remove from the skill with highest allocation weight
      const maxWeightSkill = microSkillIds.reduce((a: number, b: number) =>
        skillAllocation[a] > skillAllocation[b] ? a : b
      );
      skillQuestionCounts[maxWeightSkill] = Math.max(1, skillQuestionCounts[maxWeightSkill] - diff);
    }

    logger.info(`Question allocation for ${microSkillIds.length} skills: ${JSON.stringify(skillQuestionCounts)}`);

    // 4. Select Questions with Dynamic Allocation
    const selectedQuestions: QuestionSelectionResult[] = [];
    let selectedIds: string[] = [];

    // Select questions for each skill based on calculated allocation
    for (const msId of microSkillIds) {
      const targetCount = skillQuestionCounts[msId];
      let selectedForSkill = 0;
      let attempts = 0;
      const maxAttempts = 20; // Prevent infinite loops

      while (selectedForSkill < targetCount && attempts < maxAttempts) {
        attempts++;

        const diff = skillDifficulties[msId];

        // ✅ Updated exclusion list to include both previously attempted AND currently selected
        const currentExcludedIds = [...previouslyAttemptedQuestionIds, ...selectedIds];

        // Find a question for this skill and strict difficulty
        // ✅ ENHANCED: Excludes questions from ALL previous drills + current selection
        const question = await QuestionModel.findOne({
          module_id,
          micro_skill_id: msId,
          'metadata.difficulty_level': diff,
          _id: { $nin: currentExcludedIds }
        });

        if (question) {
          selectedQuestions.push({
            question: question,
            reason: `Adaptive Drill - Skill ${msId} Level ${diff}`,
            target_skill: {
              micro_skill_id: msId,
              module_id,
              current_mastery: 0, // Placeholder
              category: 'adaptive'
            }
          });
          selectedIds.push(question._id.toString());
          selectedForSkill++;
        } else {
          // ✅ CRITICAL FIX: If desired difficulty not available, find LOWEST available difficulty
          // This ensures struggling students get the easiest available questions
          logger.warn(`No difficulty ${diff} questions for skill ${msId}, finding lowest available difficulty`);

          // Find the lowest available difficulty for this skill
          const lowestDiffQuestion = await QuestionModel.findOne({
            module_id,
            micro_skill_id: msId,
            _id: { $nin: currentExcludedIds }
          }).sort({ 'metadata.difficulty_level': 1 }); // Sort ascending to get lowest first

          if (lowestDiffQuestion) {
            const actualDiff = lowestDiffQuestion.metadata?.difficulty_level || 1;
            logger.info(`Using difficulty ${actualDiff} instead of ${diff} for skill ${msId}`);

            selectedQuestions.push({
              question: lowestDiffQuestion,
              reason: `Adaptive Drill - Skill ${msId} Level ${actualDiff} (lowest available)`,
              target_skill: { micro_skill_id: msId, module_id, current_mastery: 0, category: 'adaptive' }
            });
            selectedIds.push(lowestDiffQuestion._id.toString());
            selectedForSkill++;
          } else {
            logger.error(`No questions available for skill ${msId} in module ${module_id}`);
            break; // No more questions available, stop trying
          }
        }
      }

      logger.info(`Selected ${selectedForSkill}/${targetCount} questions for skill ${msId}`);
    }
    
    // Shuffle final selection
    shuffleArray(selectedQuestions);

    return selectedQuestions;

  } catch (error) {
     logger.error('Error selecting adaptive drill questions:', error);
     throw error;
  }
}

/**
 * EXPORT SERVICE FUNCTIONS
 */
export default {
  selectQuestionsForSession,
  getNextQuestion,
  calculateSkillDecay,
  selectAdaptiveDrillQuestions,
};
