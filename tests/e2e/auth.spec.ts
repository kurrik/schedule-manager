import { test, expect } from '@playwright/test';
import { signInTestUser, signOut, verifyAuthenticated, testUsers } from './utils';

test.describe('Authentication', () => {
  test('should sign in test user successfully', async ({ page }) => {
    // Sign in using test mode
    await signInTestUser(page, testUsers.user1);

    // Verify user is authenticated via API
    await verifyAuthenticated(page, testUsers.user1);

    // Verify UI shows authenticated state
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });

  test('should sign out user successfully', async ({ page }) => {
    // Sign in first
    await signInTestUser(page, testUsers.user1);

    // Sign out
    await signOut(page);

    // Verify user is redirected and not authenticated
    const response = await page.request.get('/api/me');
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Not authenticated');
  });
});