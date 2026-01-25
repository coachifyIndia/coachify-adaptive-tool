/**
 * PLAYWRIGHT CONFIGURATION
 *
 * Configuration for API testing of Coachify Adaptive Learning Engine
 * Focuses on backend API endpoints, especially Adaptive Drill functionality
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Maximum time one test can run
  timeout: 60000,

  // Test execution settings
  fullyParallel: false, // Run tests sequentially for adaptive drill (order matters)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Single worker for predictable test data

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
  ],

  // Global API request settings
  use: {
    // Base URL for API requests
    baseURL: process.env.API_BASE_URL || 'http://localhost:5001',

    // Default headers
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },

    // Request timeout
    actionTimeout: 15000,

    // Trace on failure
    trace: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Projects (only API testing for backend)
  projects: [
    {
      name: 'API Tests',
      testMatch: '**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Global setup/teardown
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  // Web server (start backend before tests)
  webServer: {
    command: 'PORT=5001 npm run dev',
    url: 'http://localhost:5001/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
