/**
 * MASTER SEEDING SCRIPT
 *
 * This script orchestrates the entire database seeding process.
 * It runs all individual seed scripts in the correct order.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - This is your "one-click" setup for development data
 * - It runs seeds in order: users → questions → (future: videos)
 * - Safe to run multiple times (idempotent)
 * - Use this to quickly set up a development environment
 *
 * USAGE:
 * npm run db:seed
 * or
 * ts-node src/scripts/seed.ts
 *
 * OPTIONS:
 * --users-only : Seed only users
 * --questions-only : Seed only questions
 */

import logger from '../utils/logger.util';
import { seedUsers } from './seed-users';
import { seedQuestions } from './seed-questions';

/**
 * Parse command line arguments
 * This allows running specific seeds only
 *
 * @returns Object with flags for which seeds to run
 */
function parseArguments() {
  const args = process.argv.slice(2);

  return {
    usersOnly: args.includes('--users-only'),
    questionsOnly: args.includes('--questions-only'),
    // videosOnly: args.includes('--videos-only'),
  };
}

/**
 * MAIN SEEDING ORCHESTRATOR
 *
 * This function coordinates all seeding operations in the correct order.
 * Order matters because some data may depend on other data existing first.
 */
async function runAllSeeds() {
  const args = parseArguments();

  // If no specific flag is set, we run all seeds
  const runAll = !args.usersOnly && !args.questionsOnly;

  try {
    logger.info('╔' + '═'.repeat(78) + '╗');
    logger.info('║' + ' '.repeat(20) + 'COACHIFY - DATABASE SEEDING' + ' '.repeat(30) + '║');
    logger.info('╚' + '═'.repeat(78) + '╝');
    logger.info('');

    // Display what will be seeded
    if (runAll) {
      logger.info('📋 Running ALL seed scripts...\n');
    } else {
      logger.info('📋 Running SELECTED seed scripts:');
      if (args.usersOnly) logger.info('   - Users only');
      if (args.questionsOnly) logger.info('   - Questions only');
      logger.info('');
    }

    // Track start time to show total duration
    const startTime = Date.now();

    // ========================================================================
    // STEP 1: SEED USERS
    // ========================================================================
    if (runAll || args.usersOnly) {
      logger.info('\n' + '─'.repeat(80));
      logger.info('📝 STEP 1/2: Seeding Users');
      logger.info('─'.repeat(80));

      try {
        // Note: seedUsers() handles its own database connection
        await seedUsers();
      } catch (error) {
        logger.error('Failed to seed users:', error);
        throw error; // Stop execution if users fail
      }
    }

    // ========================================================================
    // STEP 2: SEED QUESTIONS
    // ========================================================================
    if (runAll || args.questionsOnly) {
      logger.info('\n' + '─'.repeat(80));
      logger.info('📝 STEP 2/2: Seeding Questions');
      logger.info('─'.repeat(80));

      try {
        // Note: seedQuestions() handles its own database connection
        await seedQuestions();
      } catch (error) {
        logger.error('Failed to seed questions:', error);
        throw error;
      }
    }

    // ========================================================================
    // STEP 3: SEED VIDEOS (TODO - to be implemented)
    // ========================================================================
    // if (runAll || args.videosOnly) {
    //   logger.info('\n' + '─'.repeat(80));
    //   logger.info('📝 STEP 3/3: Seeding Video Lectures');
    //   logger.info('─'.repeat(80));
    //
    //   try {
    //     await seedVideos();
    //   } catch (error) {
    //     logger.error('Failed to seed videos:', error);
    //     throw error;
    //   }
    // }

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('\n' + '═'.repeat(80));
    logger.info('✨ ALL SEEDING COMPLETED SUCCESSFULLY! ✨');
    logger.info('═'.repeat(80));
    logger.info(`⏱️  Total time: ${duration} seconds`);
    logger.info('');

    // Display helpful information for developers
    logger.info('📌 NEXT STEPS:');
    logger.info('   1. Your database is now populated with test data');
    logger.info('   2. You can login with any of the test users (password: Test@123)');
    logger.info('   3. Start the development server: npm run dev');
    logger.info('   4. Test the adaptive learning algorithm with the sample questions');
    logger.info('');
    logger.info('📚 TEST USER EMAILS:');
    logger.info('   - rahul.sharma@testmail.com (Competitive Exam, Premium)');
    logger.info('   - neha.gupta@testmail.com (School, Premium)');
    logger.info('   - aarav.mehta@testmail.com (Kids, Premium)');
    logger.info('   - vikram.malhotra@testmail.com (Professional, Premium)');
    logger.info('');
    logger.info('🔄 TO RESET:');
    logger.info('   Run: npm run db:reset');
    logger.info('');
    logger.info('=' + '='.repeat(79));
  } catch (error) {
    logger.error('\n❌ SEEDING FAILED:', error);
    logger.error('');
    logger.error('💡 TROUBLESHOOTING TIPS:');
    logger.error('   1. Make sure MongoDB is running');
    logger.error('   2. Check your .env file has correct MONGODB_URI');
    logger.error('   3. Ensure you have proper network connection');
    logger.error('   4. Try running: npm run db:reset and then npm run db:seed again');
    logger.error('');
    throw error;
  }
}

/**
 * Execute the main seeding function
 */
if (require.main === module) {
  runAllSeeds()
    .then(() => {
      process.exit(0); // Exit with success
    })
    .catch((error) => {
      logger.error('Seeding process failed:', error);
      process.exit(1); // Exit with error
    });
}

// Export for programmatic use
export { runAllSeeds };
