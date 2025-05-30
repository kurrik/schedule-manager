import { test, expect } from '@playwright/test';
import { signInTestUser, testUsers, setupTestDatabase } from './utils';

test.describe('Schedule Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestDatabase();
    await signInTestUser(page, testUsers.user1);
    await page.goto('/');
  });

  test('should create a new schedule', async ({ page }) => {
    // Click create schedule button
    await page.getByTestId('new-schedule-button').click();
    
    // Wait for modal to appear
    await expect(page.getByTestId('create-schedule-modal')).toBeVisible();
    
    // Fill in schedule details using test IDs
    await page.getByTestId('schedule-name-input').fill('Test Schedule');
    await page.getByTestId('schedule-timezone-input').fill('America/New_York');
    
    // Submit form
    await page.getByTestId('create-schedule-submit-button').click();
    
    // Wait for modal to close and schedule to appear in list
    await expect(page.getByTestId('create-schedule-modal')).not.toBeVisible();
    await expect(page.getByText('Test Schedule')).toBeVisible();
  });

  test('should update schedule name', async ({ page }) => {
    // First create a schedule
    const response = await page.request.post('/api/schedules', {
      data: {
        name: 'Original Schedule',
        timeZone: 'America/New_York'
      }
    });
    expect(response.ok()).toBeTruthy();
    const schedule = await response.json();
    expect(schedule.id).toBeDefined();
    
    // Navigate to schedule detail
    await page.goto(`/schedules/${schedule.id}`);
    
    // Edit schedule name using test IDs
    await page.getByTestId('edit-schedule-button').click();
    await expect(page.getByTestId('edit-schedule-modal')).toBeVisible();
    
    await page.getByTestId('edit-schedule-name-input').fill('Updated Schedule');
    await page.getByTestId('edit-schedule-save-button').click();
    
    // Wait for modal to close and verify updated name
    await expect(page.getByTestId('edit-schedule-modal')).not.toBeVisible();
    await expect(page.getByText('Updated Schedule')).toBeVisible();
  });

  test('should add schedule entry', async ({ page }) => {
    // Create a schedule first
    const response = await page.request.post('/api/schedules', {
      data: {
        name: 'Test Schedule',
        timeZone: 'America/New_York'
      }
    });
    expect(response.ok()).toBeTruthy();
    const schedule = await response.json();
    expect(schedule.id).toBeDefined();
    
    // Navigate to schedule detail
    await page.goto(`/schedules/${schedule.id}`);
    
    // Add an entry by clicking the dashed "Add entry" area for Monday
    await page.locator('text=Monday').locator('..').locator('text=+ Add entry').click();
    await expect(page.getByTestId('add-entry-modal')).toBeVisible();
    
    // Fill in entry details using test IDs
    await page.getByTestId('add-entry-name-input').fill('Morning Meeting');
    await page.getByTestId('add-entry-starttime-input').fill('09:00');
    await page.getByTestId('add-entry-duration-input').fill('60');
    await page.getByTestId('add-entry-day-select').selectOption('1'); // Monday = 1
    
    // Submit entry
    await page.getByTestId('add-entry-submit-button').click();
    
    // Wait for modal to close and verify entry appears in weekly view
    await expect(page.getByTestId('add-entry-modal')).not.toBeVisible();
    await expect(page.getByText('Morning Meeting')).toBeVisible();
  });

  test('should delete schedule entry', async ({ page }) => {
    // Create schedule with entry via API
    const scheduleResponse = await page.request.post('/api/schedules', {
      data: {
        name: 'Test Schedule',
        timeZone: 'America/New_York'
      }
    });
    expect(scheduleResponse.ok()).toBeTruthy();
    const schedule = await scheduleResponse.json();
    expect(schedule.id).toBeDefined();
    
    // Add entry via UI to ensure proper phase association
    await page.goto(`/schedules/${schedule.id}`);
    
    // Add an entry first
    await page.locator('text=Tuesday').locator('..').locator('text=+ Add entry').click();
    await expect(page.getByTestId('add-entry-modal')).toBeVisible();
    
    await page.getByTestId('add-entry-name-input').fill('Test Entry');
    await page.getByTestId('add-entry-starttime-input').fill('10:00');
    await page.getByTestId('add-entry-duration-input').fill('30');
    await page.getByTestId('add-entry-day-select').selectOption('2'); // Tuesday = 2
    await page.getByTestId('add-entry-submit-button').click();
    
    await expect(page.getByTestId('add-entry-modal')).not.toBeVisible();
    await expect(page.getByText('Test Entry')).toBeVisible();
    
    // Now delete the entry by clicking on it
    await page.getByText('Test Entry').click();
    await expect(page.getByTestId('edit-entry-modal')).toBeVisible();
    
    // Delete the entry
    await page.getByTestId('edit-entry-delete-button').click();
    
    // Verify entry is removed
    await expect(page.getByTestId('edit-entry-modal')).not.toBeVisible();
    await expect(page.getByText('Test Entry')).not.toBeVisible();
  });
});