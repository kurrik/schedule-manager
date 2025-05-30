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
  const response = await page.request.post('/auth/test/signin', {
    data: {
      name: user.name,
      email: user.email,
    },
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to sign in test user: ${response.status()}`);
  }
}

/**
 * Sign out the current user
 */
export async function signOut(page: Page) {
  await page.goto('/auth/signout');
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