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
    await page.getByRole('button', { name: '+ New Schedule' }).click();
    
    // Wait for modal to appear
    await expect(page.getByRole('heading', { name: 'Create New Schedule' })).toBeVisible();
    
    // Fill in schedule details - there are only 2 textboxes in the modal
    const textboxes = page.getByRole('textbox');
    await expect(textboxes).toHaveCount(2);
    
    // First textbox is name, second is timezone
    await textboxes.nth(0).fill('Test Schedule');
    await textboxes.nth(1).fill('America/New_York');
    
    // Submit form
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Wait for modal to close and schedule to appear
    await expect(page.getByRole('heading', { name: 'Create New Schedule' })).not.toBeVisible();
    await expect(page.getByText('Test Schedule')).toBeVisible();
  });

  test('should update schedule name', async ({ page }) => {
    // First create a schedule
    const response = await page.request.post('/api/schedules', {
      data: {
        name: 'Original Schedule',
        timezone: 'America/New_York'
      }
    });
    expect(response.ok()).toBeTruthy();
    const schedule = await response.json();
    expect(schedule.id).toBeDefined();
    
    // Navigate to schedule detail
    await page.goto(`/schedules/${schedule.id}`);
    
    // Edit schedule name
    await page.click('button:has-text("Edit")');
    await page.fill('input[name="name"]', 'Updated Schedule');
    await page.click('button:has-text("Save")');
    
    // Verify updated name
    await expect(page.locator('text=Updated Schedule')).toBeVisible();
  });

  test('should add schedule entry', async ({ page }) => {
    // Create a schedule first
    const response = await page.request.post('/api/schedules', {
      data: {
        name: 'Test Schedule',
        timezone: 'America/New_York'
      }
    });
    expect(response.ok()).toBeTruthy();
    const schedule = await response.json();
    expect(schedule.id).toBeDefined();
    
    // Navigate to schedule detail
    await page.goto(`/schedules/${schedule.id}`);
    
    // Add an entry
    await page.click('text=Add Entry');
    await page.fill('input[name="name"]', 'Morning Meeting');
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="duration"]', '60');
    await page.selectOption('select[name="day"]', 'Monday');
    
    // Submit entry
    await page.click('button:has-text("Add Entry")');
    
    // Verify entry appears in weekly view
    await expect(page.locator('text=Morning Meeting')).toBeVisible();
  });

  test('should delete schedule entry', async ({ page }) => {
    // Create schedule with entry
    const scheduleResponse = await page.request.post('/api/schedules', {
      data: {
        name: 'Test Schedule',
        timezone: 'America/New_York'
      }
    });
    expect(scheduleResponse.ok()).toBeTruthy();
    const schedule = await scheduleResponse.json();
    expect(schedule.id).toBeDefined();
    
    const entryResponse = await page.request.post(`/api/schedules/${schedule.id}/entries`, {
      data: {
        name: 'Test Entry',
        startTime: '10:00',
        duration: 30,
        day: 'Tuesday'
      }
    });
    expect(entryResponse.ok()).toBeTruthy();
    
    // Navigate to schedule
    await page.goto(`/schedules/${schedule.id}`);
    
    // Delete the entry
    await page.locator('text=Test Entry').locator('..').locator('button:has-text("Delete")').click();
    
    // Confirm deletion
    await page.click('button:has-text("Confirm")');
    
    // Verify entry is removed
    await expect(page.locator('text=Test Entry')).not.toBeVisible();
  });
});