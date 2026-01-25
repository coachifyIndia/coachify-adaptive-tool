/**
 * AUTHENTICATION FIXTURE
 *
 * Reusable authentication logic for Playwright tests
 * Provides authenticated API context for all tests
 */

import { test as base, APIRequestContext } from '@playwright/test';

// Test user credentials
export const TEST_USER = {
  email: 'rahul.sharma@testmail.com',
  password: 'Test@123',
  userId: 'USR_8370962',
};

// Authentication response type
export type AuthResponse = {
  token: string;
  refreshToken: string;
  user: {
    user_id: string;
    email: string;
    full_name: string;
  };
};

/**
 * Authenticate and get JWT token
 */
export async function authenticate(request: APIRequestContext): Promise<AuthResponse> {
  const response = await request.post('/api/v1/auth/login', {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });

  if (!response.ok()) {
    throw new Error(`Authentication failed: ${response.status()} ${await response.text()}`);
  }

  const data = await response.json();

  if (!data.success || !data.data?.access_token) {
    throw new Error('Invalid authentication response format');
  }

  return {
    token: data.data.access_token,
    refreshToken: data.data.refresh_token,
    user: data.data.user,
  };
}

/**
 * Create authenticated request context
 */
export async function getAuthenticatedContext(
  request: APIRequestContext
): Promise<{ request: APIRequestContext; auth: AuthResponse }> {
  const auth = await authenticate(request);

  return {
    request,
    auth,
  };
}

/**
 * Get authorization header
 */
export function getAuthHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

// Extended test fixture with authentication
type AuthFixture = {
  authenticatedRequest: APIRequestContext;
  authToken: string;
  authUser: AuthResponse['user'];
};

export const test = base.extend<AuthFixture>({
  // Authenticated request context
  authenticatedRequest: async ({ request }, use) => {
    const auth = await authenticate(request);

    // Add auth header to all requests
    const authContext = await request.newContext({
      extraHTTPHeaders: getAuthHeader(auth.token),
    });

    await use(authContext);
  },

  // Auth token (for manual header construction)
  authToken: async ({ request }, use) => {
    const auth = await authenticate(request);
    await use(auth.token);
  },

  // Authenticated user info
  authUser: async ({ request }, use) => {
    const auth = await authenticate(request);
    await use(auth.user);
  },
});

export { expect } from '@playwright/test';
