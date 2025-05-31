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
  // Generate a unique session ID for test isolation
  const sessionID = `test-session-${Math.random().toString(36).substring(2, 15)}`;

  // Navigate to the signin endpoint to ensure cookies are set properly in the browser context
  await page.goto('/auth/signout');
  await page.waitForLoadState('networkidle');
  await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });

  // Fill in the form
  await page.getByRole('textbox', { name: 'Name' }).fill(user.name);
  await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
  await page.getByRole('textbox', { name: 'Session ID' }).fill(sessionID);

  // Submit the form
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForLoadState('networkidle');
}

/**
 * Sign out the current user
 */
export async function signOut(page: Page) {
  // Navigate to schedules list with retry for Firefox
  await page.goto('/auth/signout');
  await page.waitForLoadState('networkidle');
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