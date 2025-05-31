import { Page } from '@playwright/test';

export interface TestUser {
  name: string;
  email: string;
}

export const testUsers = {
  user1: { name: 'Test User 1', email: 'test1@example.com' },
  user2: { name: 'Test User 2', email: 'test2@example.com' },
} as const;

/**
 * Sign in a test user using the test mode endpoint
 */
export async function signInTestUser(page: Page, user: TestUser) {
  // Navigate to the signin endpoint to ensure cookies are set properly in the browser context
  await page.goto('/auth/test/signin', { waitUntil: 'domcontentloaded' });
  
  const response = await page.request.post('/auth/test/signin', {
    data: {
      name: user.name,
      email: user.email,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to sign in test user: ${response.status()}`);
  }
  
  // Navigate to home page to complete the authentication flow
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

/**
 * Sign out the current user
 */
export async function signOut(page: Page) {
  // Navigate to schedules list with retry for Firefox
  try {
    await page.goto('/');
  } catch (error) {
    if (error.message.includes('NS_BINDING_ABORTED')) {
      await page.waitForTimeout(1000);
      await page.goto('/auth/signout');
    } else {
      throw error;
    }
  }
}

/**
 * Verify user is authenticated by checking the /api/me endpoint
 */
export async function verifyAuthenticated(page: Page, expectedUser: TestUser) {
  const response = await page.request.get('/api/me');

  if (!response.ok()) {
    throw new Error('User is not authenticated');
  }

  const userData = await response.json();
  if (userData.email !== expectedUser.email) {
    throw new Error(`Expected user ${expectedUser.email}, got ${userData.email}`);
  }

  return userData;
}