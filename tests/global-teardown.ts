/**
 * GLOBAL TEARDOWN
 *
 * Runs after all tests complete
 * - Clean up test data
 * - Generate summary
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Global Teardown: Starting cleanup...');

  // Add any cleanup logic here
  // For example: delete test sessions, reset test user data, etc.

  console.log('✅ Global Teardown: Complete');
}

export default globalTeardown;
