/**
 * USER SEEDING SCRIPT
 *
 * This script creates test user accounts for development and testing purposes.
 * It creates users for each segment (competitive_exam, school, kids, professional)
 * with different subscription levels.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - This script should ONLY be run in development/staging environments
 * - NEVER run this in production as it creates test accounts with known passwords
 * - The script is idempotent (can be run multiple times safely)
 * - Existing users with same email won't be duplicated
 *
 * USAGE:
 * npm run db:seed:users
 * or
 * ts-node src/scripts/seed-users.ts
 */

import database from '../config/database.config';
import { UserModel } from '../models/user.model';
import { UserSegment, SubscriptionPlan } from '../types';
import logger from '../utils/logger.util';

/**
 * Interface for test user data
 * This defines what information we need to create a test user
 */
interface TestUser {
  name: string;
  email: string;
  password: string;
  age: number;
  segment: UserSegment;
  subscriptionPlan: SubscriptionPlan;
  targetExam?: string;
}

/**
 * TEST USER DATA
 *
 * Array of test users covering all segments and subscription plans.
 * These passwords are intentionally simple for testing - NEVER do this in production!
 */
const TEST_USERS: TestUser[] = [
  // ===== COMPETITIVE EXAM SEGMENT =====
  {
    name: 'Rahul Sharma',
    email: 'rahul.sharma@testmail.com',
    password: 'Test@123', // Simple password for testing
    age: 24,
    segment: UserSegment.COMPETITIVE_EXAM,
    subscriptionPlan: SubscriptionPlan.PREMIUM,
    targetExam: 'CAT_2025',
  },
  {
    name: 'Priya Patel',
    email: 'priya.patel@testmail.com',
    password: 'Test@123',
    age: 22,
    segment: UserSegment.COMPETITIVE_EXAM,
    subscriptionPlan: SubscriptionPlan.BASIC,
    targetExam: 'IPMAT_2025',
  },
  {
    name: 'Amit Kumar',
    email: 'amit.kumar@testmail.com',
    password: 'Test@123',
    age: 26,
    segment: UserSegment.COMPETITIVE_EXAM,
    subscriptionPlan: SubscriptionPlan.FREE,
    targetExam: 'SSC_CGL_2025',
  },

  // ===== SCHOOL SEGMENT =====
  {
    name: 'Neha Gupta',
    email: 'neha.gupta@testmail.com',
    password: 'Test@123',
    age: 16,
    segment: UserSegment.SCHOOL,
    subscriptionPlan: SubscriptionPlan.PREMIUM,
  },
  {
    name: 'Rohan Singh',
    email: 'rohan.singh@testmail.com',
    password: 'Test@123',
    age: 17,
    segment: UserSegment.SCHOOL,
    subscriptionPlan: SubscriptionPlan.BASIC,
  },
  {
    name: 'Sneha Reddy',
    email: 'sneha.reddy@testmail.com',
    password: 'Test@123',
    age: 15,
    segment: UserSegment.SCHOOL,
    subscriptionPlan: SubscriptionPlan.FREE,
  },

  // ===== KIDS SEGMENT =====
  {
    name: 'Aarav Mehta',
    email: 'aarav.mehta@testmail.com',
    password: 'Test@123',
    age: 11,
    segment: UserSegment.KIDS,
    subscriptionPlan: SubscriptionPlan.PREMIUM,
  },
  {
    name: 'Diya Joshi',
    email: 'diya.joshi@testmail.com',
    password: 'Test@123',
    age: 12,
    segment: UserSegment.KIDS,
    subscriptionPlan: SubscriptionPlan.BASIC,
  },
  {
    name: 'Aryan Verma',
    email: 'aryan.verma@testmail.com',
    password: 'Test@123',
    age: 10,
    segment: UserSegment.KIDS,
    subscriptionPlan: SubscriptionPlan.FREE,
  },

  // ===== PROFESSIONAL SEGMENT =====
  {
    name: 'Vikram Malhotra',
    email: 'vikram.malhotra@testmail.com',
    password: 'Test@123',
    age: 28,
    segment: UserSegment.PROFESSIONAL,
    subscriptionPlan: SubscriptionPlan.PREMIUM,
  },
  {
    name: 'Anjali Desai',
    email: 'anjali.desai@testmail.com',
    password: 'Test@123',
    age: 30,
    segment: UserSegment.PROFESSIONAL,
    subscriptionPlan: SubscriptionPlan.BASIC,
  },
];

/**
 * CREATE A SINGLE USER
 *
 * This function creates one user in the database.
 * It handles duplicate checking and error handling.
 *
 * @param userData - The user data to create
 * @returns The created user or null if it already exists
 */
async function createUser(userData: TestUser) {
  try {
    // STEP 1: Check if user already exists
    // We check by email since it's unique
    const existingUser = await UserModel.findOne({ 'profile.email': userData.email });

    if (existingUser) {
      logger.info(`User already exists: ${userData.email} - Skipping`);
      return null;
    }

    // STEP 2: Generate unique user ID
    // This uses the static method we created in the User model
    const userId = await UserModel.generateUserId();

    // STEP 3: Calculate subscription validity
    // Premium and Basic get 1 year, Free gets 30 days
    const subscriptionValidTill = new Date();
    if (userData.subscriptionPlan === SubscriptionPlan.PREMIUM) {
      subscriptionValidTill.setFullYear(subscriptionValidTill.getFullYear() + 1);
    } else if (userData.subscriptionPlan === SubscriptionPlan.BASIC) {
      subscriptionValidTill.setFullYear(subscriptionValidTill.getFullYear() + 1);
    } else {
      subscriptionValidTill.setDate(subscriptionValidTill.getDate() + 30);
    }

    // STEP 4: Create the user document
    // The password will be automatically hashed by the pre-save hook in the model
    const user = new UserModel({
      user_id: userId,
      profile: {
        name: userData.name,
        email: userData.email,
        age: userData.age,
        segment: userData.segment,
        target_exam: userData.targetExam,
        registration_date: new Date(),
        subscription: {
          plan: userData.subscriptionPlan,
          valid_till: subscriptionValidTill,
        },
      },
      password: userData.password, // This will be hashed automatically
      preferences: {
        // Set defaults based on user segment
        daily_goal_minutes: userData.segment === UserSegment.KIDS ? 20 : 30,
        difficulty_preference: 'adaptive',
        interface_theme:
          userData.segment === UserSegment.KIDS
            ? 'colorful'
            : userData.segment === UserSegment.COMPETITIVE_EXAM
            ? 'minimal'
            : 'gamified',
      },
      // Progress summary starts empty - will be filled as user practices
      progress_summary: {
        total_questions_attempted: 0,
        total_time_spent_minutes: 0,
        current_streak_days: 0,
        longest_streak_days: 0,
        modules_completed: [],
        skill_levels: new Map(),
      },
      // Gamification starts at level 1 with 0 points
      gamification: {
        total_points: 0,
        current_level: 1,
        badges_earned: [],
        achievements: [],
        leaderboard_opt_in: userData.segment !== UserSegment.KIDS, // Kids opt-out by default
      },
    });

    // STEP 5: Save to database
    await user.save();

    logger.info(
      `✓ Created user: ${userData.name} (${userData.email}) - Segment: ${userData.segment}, Plan: ${userData.subscriptionPlan}`
    );

    return user;
  } catch (error) {
    logger.error(`Error creating user ${userData.email}:`, error);
    throw error;
  }
}

/**
 * MAIN SEEDING FUNCTION
 *
 * This is the main function that orchestrates the seeding process.
 * It connects to the database, creates all users, and handles cleanup.
 */
async function seedUsers() {
  try {
    // STEP 1: Connect to database
    logger.info('Connecting to database...');
    await database.connect();
    logger.info('Database connected successfully');

    // STEP 2: Seed users
    logger.info(`\nSeeding ${TEST_USERS.length} test users...`);
    logger.info('='.repeat(60));

    let createdCount = 0;
    let skippedCount = 0;

    // Process each user one by one
    for (const userData of TEST_USERS) {
      const user = await createUser(userData);
      if (user) {
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    // STEP 3: Summary
    logger.info('='.repeat(60));
    logger.info('\n📊 SEEDING SUMMARY:');
    logger.info(`   ✓ Created: ${createdCount} users`);
    logger.info(`   ⊘ Skipped: ${skippedCount} users (already existed)`);
    logger.info(`   📧 Total: ${TEST_USERS.length} users processed\n`);

    // STEP 4: Display login credentials
    logger.info('🔑 TEST USER CREDENTIALS:');
    logger.info('='.repeat(60));
    logger.info('All test users have the password: Test@123');
    logger.info('\nEmails by segment:');
    logger.info('  Competitive Exam:');
    logger.info('    - rahul.sharma@testmail.com (Premium)');
    logger.info('    - priya.patel@testmail.com (Basic)');
    logger.info('    - amit.kumar@testmail.com (Free)');
    logger.info('  School:');
    logger.info('    - neha.gupta@testmail.com (Premium)');
    logger.info('    - rohan.singh@testmail.com (Basic)');
    logger.info('    - sneha.reddy@testmail.com (Free)');
    logger.info('  Kids:');
    logger.info('    - aarav.mehta@testmail.com (Premium)');
    logger.info('    - diya.joshi@testmail.com (Basic)');
    logger.info('    - aryan.verma@testmail.com (Free)');
    logger.info('  Professional:');
    logger.info('    - vikram.malhotra@testmail.com (Premium)');
    logger.info('    - anjali.desai@testmail.com (Basic)');
    logger.info('='.repeat(60));
  } catch (error) {
    logger.error('Error during user seeding:', error);
    throw error;
  } finally {
    // ALWAYS disconnect from database, even if there's an error
    await database.disconnect();
    logger.info('\nDatabase disconnected');
  }
}

/**
 * Execute the seeding function
 * This runs when you execute this file directly
 */
if (require.main === module) {
  seedUsers()
    .then(() => {
      logger.info('\n✅ User seeding completed successfully!');
      process.exit(0); // Exit with success code
    })
    .catch((error) => {
      logger.error('\n❌ User seeding failed:', error);
      process.exit(1); // Exit with error code
    });
}

// Export for use in other scripts
export { seedUsers, createUser, TEST_USERS };
