/**
 * DATABASE RESET/CLEANUP SCRIPT
 *
 * This script DELETES ALL DATA from the database and resets it to a clean state.
 *
 * ⚠️  DANGER - READ THIS CAREFULLY! ⚠️
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - This script PERMANENTLY DELETES all data
 * - NEVER run this in production
 * - It's designed for development/testing only
 * - Always make backups before running
 * - The script has safety checks to prevent accidental production wipes
 *
 * USAGE:
 * npm run db:reset
 * or
 * ts-node src/scripts/reset.ts
 *
 * SAFETY FEATURES:
 * - Requires NODE_ENV to be 'development' or 'test'
 * - Asks for confirmation before deleting
 * - Can be bypassed with --force flag (use carefully!)
 */

import database from '../config/database.config';
import logger from '../utils/logger.util';
import { QuestionModel } from '../models/question.model';
import { UserModel } from '../models/user.model';
import { UserProgressModel } from '../models/userProgress.model';
import { SessionModel } from '../models/session.model';
import { VideoLectureModel } from '../models/videoLecture.model';
import config from '../config/env.config';
import * as readline from 'readline';

/**
 * SAFETY CHECK
 *
 * This prevents accidental deletion of production data.
 * Only allows reset in development or test environments.
 *
 * @throws Error if running in production
 */
function safetyCheck() {
  const environment = config.node.env;

  // CRITICAL: Do not allow reset in production!
  if (environment === 'production') {
    logger.error('╔' + '═'.repeat(78) + '╗');
    logger.error('║' + ' '.repeat(15) + '🚨 CRITICAL ERROR - PRODUCTION DETECTED 🚨' + ' '.repeat(19) + '║');
    logger.error('╠' + '═'.repeat(78) + '╣');
    logger.error('║  This script CANNOT be run in production environment!                      ║');
    logger.error('║  Running this would DELETE ALL YOUR PRODUCTION DATA!                       ║');
    logger.error('║                                                                            ║');
    logger.error('║  Current NODE_ENV: ' + environment.padEnd(57) + '║');
    logger.error('╚' + '═'.repeat(78) + '╝');

    throw new Error('ABORTED: Cannot reset database in production environment');
  }

  logger.warn('⚠️  Environment check passed: Running in ' + environment + ' mode');
}

/**
 * ASK FOR CONFIRMATION
 *
 * Requires the user to explicitly confirm before deleting data.
 * Can be bypassed with --force flag.
 *
 * @returns Promise that resolves to true if user confirms, false otherwise
 */
function askForConfirmation(): Promise<boolean> {
  // Check if --force flag is present
  const args = process.argv.slice(2);
  if (args.includes('--force')) {
    logger.warn('🚀 --force flag detected, skipping confirmation');
    return Promise.resolve(true);
  }

  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    logger.warn('');
    logger.warn('⚠️  WARNING: This will DELETE ALL DATA from your database!');
    logger.warn('');
    logger.warn('The following collections will be completely erased:');
    logger.warn('  - users');
    logger.warn('  - questions');
    logger.warn('  - user_progress');
    logger.warn('  - sessions');
    logger.warn('  - video_lectures');
    logger.warn('');

    rl.question('Are you ABSOLUTELY SURE you want to continue? (yes/no): ', (answer) => {
      rl.close();

      if (answer.toLowerCase() === 'yes') {
        logger.info('✓ Confirmation received. Proceeding with reset...\n');
        resolve(true);
      } else {
        logger.info('✗ Reset cancelled by user\n');
        resolve(false);
      }
    });
  });
}

/**
 * DELETE COLLECTION DATA
 *
 * Deletes all documents from a specific collection and logs the result.
 *
 * @param model - The Mongoose model to delete from
 * @param collectionName - Human-readable collection name for logging
 */
async function deleteCollection(model: any, collectionName: string) {
  try {
    const result = await model.deleteMany({});
    logger.info(`   ✓ ${collectionName}: Deleted ${result.deletedCount} documents`);
    return result.deletedCount;
  } catch (error) {
    logger.error(`   ✗ ${collectionName}: Error during deletion`, error);
    throw error;
  }
}

/**
 * RESET DATABASE INDEXES
 *
 * Drops and recreates all indexes to ensure they're fresh.
 * This is useful if index definitions have changed.
 *
 * @param model - The Mongoose model to reset indexes for
 * @param collectionName - Human-readable collection name for logging
 */
async function resetIndexes(model: any, collectionName: string) {
  try {
    // Drop all indexes except _id (which cannot be dropped)
    await model.collection.dropIndexes();

    // Recreate indexes as defined in the schema
    await model.createIndexes();

    logger.info(`   ✓ ${collectionName}: Indexes reset successfully`);
  } catch (error) {
    // It's okay if this fails (e.g., collection doesn't exist yet)
    logger.warn(`   ⚠ ${collectionName}: Could not reset indexes (may not exist yet)`);
  }
}

/**
 * MAIN RESET FUNCTION
 *
 * Orchestrates the entire database reset process.
 */
async function resetDatabase() {
  try {
    // STEP 1: Safety checks
    logger.info('╔' + '═'.repeat(78) + '╗');
    logger.info('║' + ' '.repeat(22) + 'DATABASE RESET UTILITY' + ' '.repeat(35) + '║');
    logger.info('╚' + '═'.repeat(78) + '╝\n');

    safetyCheck();

    // STEP 2: Get confirmation
    const confirmed = await askForConfirmation();

    if (!confirmed) {
      logger.info('Database reset cancelled. No changes made.');
      return;
    }

    // STEP 3: Connect to database
    logger.info('Connecting to database...');
    await database.connect();
    logger.info('✓ Database connected\n');

    // Track start time
    const startTime = Date.now();

    // STEP 4: Delete all collections
    logger.info('🗑️  Deleting all collection data...');
    logger.info('─'.repeat(80));

    let totalDeleted = 0;

    totalDeleted += await deleteCollection(UserModel, 'Users');
    totalDeleted += await deleteCollection(QuestionModel, 'Questions');
    totalDeleted += await deleteCollection(UserProgressModel, 'User Progress');
    totalDeleted += await deleteCollection(SessionModel, 'Sessions');
    totalDeleted += await deleteCollection(VideoLectureModel, 'Video Lectures');

    logger.info('─'.repeat(80));
    logger.info(`📊 Total documents deleted: ${totalDeleted}\n`);

    // STEP 5: Reset indexes (optional but recommended)
    logger.info('🔄 Resetting indexes...');
    logger.info('─'.repeat(80));

    await resetIndexes(UserModel, 'Users');
    await resetIndexes(QuestionModel, 'Questions');
    await resetIndexes(UserProgressModel, 'User Progress');
    await resetIndexes(SessionModel, 'Sessions');
    await resetIndexes(VideoLectureModel, 'Video Lectures');

    logger.info('─'.repeat(80) + '\n');

    // STEP 6: Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('═'.repeat(80));
    logger.info('✅ DATABASE RESET COMPLETED SUCCESSFULLY');
    logger.info('═'.repeat(80));
    logger.info(`⏱️  Time taken: ${duration} seconds`);
    logger.info(`🗑️  Documents deleted: ${totalDeleted}`);
    logger.info('');
    logger.info('📌 NEXT STEPS:');
    logger.info('   1. Your database is now empty');
    logger.info('   2. Run: npm run db:seed to populate with test data');
    logger.info('   3. Or start fresh with your own data');
    logger.info('');
    logger.info('=' + '='.repeat(79));
  } catch (error) {
    logger.error('\n❌ DATABASE RESET FAILED:', error);
    logger.error('');
    logger.error('💡 TROUBLESHOOTING:');
    logger.error('   1. Ensure MongoDB is running');
    logger.error('   2. Check database connection settings in .env');
    logger.error('   3. Verify you have proper permissions');
    logger.error('');
    throw error;
  } finally {
    // ALWAYS disconnect from database
    await database.disconnect();
    logger.info('Database disconnected\n');
  }
}

/**
 * Execute the reset function
 */
if (require.main === module) {
  resetDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Reset process failed:', error);
      process.exit(1);
    });
}

// Export for programmatic use
export { resetDatabase };
