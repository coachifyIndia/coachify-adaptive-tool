/**
 * GLOBAL SETUP
 *
 * Runs before all tests
 * - Verify server is running
 * - Verify test user exists
 * - Clean up any previous test data
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Global Setup: Starting...');

  const baseURL = config.use?.baseURL || 'http://localhost:5000';

  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Verify server is accessible
    console.log('📡 Verifying server is accessible...');
    const response = await page.request.get(`${baseURL}/api/v1/auth/login`);

    // Accept any response that indicates server is running (403, 404, 405 are all valid)
    if (response.status() >= 400 && response.status() < 500) {
      console.log('✅ Server is running');
    } else {
      throw new Error(`Unexpected response: ${response.status()}`);
    }

    // Verify test user can login
    console.log('👤 Verifying test user exists...');
    const loginResponse = await page.request.post(`${baseURL}/api/v1/auth/login`, {
      data: {
        email: 'rahul.sharma@testmail.com',
        password: 'Test@123',
      },
    });

    if (loginResponse.ok()) {
      console.log('✅ Test user authentication successful');

      // Clean up any active sessions for test user
      console.log('🧹 Cleaning up any active sessions...');
      const loginData = await loginResponse.json();
      const token = loginData.data?.access_token;

      if (token) {
        // Try to get active session and end it
        try {
          const historyResponse = await page.request.get(`${baseURL}/api/v1/practice/history?limit=1`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (historyResponse.ok()) {
            const historyData = await historyResponse.json();
            const sessions = historyData.data?.sessions || [];

            // End any active sessions
            for (const session of sessions) {
              if (session.status === 'active') {
                console.log(`   Ending active session: ${session.session_id}`);
                await page.request.post(`${baseURL}/api/v1/practice/end-session`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  data: {
                    session_id: session.session_id,
                  },
                });
              }
            }
          }
          console.log('✅ Cleanup complete');
        } catch (cleanupError) {
          console.warn('⚠️  Cleanup failed (non-critical):', cleanupError);
        }
      }
    } else {
      console.warn('⚠️  Test user authentication failed - tests may fail');
    }

    console.log('🎉 Global Setup: Complete');
  } catch (error) {
    console.error('❌ Global Setup Failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
