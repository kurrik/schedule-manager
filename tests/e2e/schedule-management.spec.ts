import { test, expect } from '@playwright/test';
import { 
  signInTestUser, 
  testUsers, 
  setupTestDatabase,
  createScheduleViaUI,
  navigateToScheduleDetail,
  addScheduleEntry,
  editScheduleEntry,
  deleteScheduleEntry,
  editScheduleInfo,
  type ScheduleEntryDetails
} from './utils';

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
    // Create a schedule via UI
    const originalName = await createScheduleViaUI(page, 'Original Schedule');
    
    // Navigate to schedule detail
    await navigateToScheduleDetail(page, originalName);
    
    // Edit schedule name
    const updatedName = `Updated Schedule ${Math.random().toString(36).substring(7)}`;
    await editScheduleInfo(page, updatedName);
    
    // Verify updated name appears in the main heading
    await expect(page.getByRole('heading', { name: updatedName })).toBeVisible();
  });

  test('should add schedule entry', async ({ page }) => {
    // Create a schedule via UI
    const scheduleName = await createScheduleViaUI(page, 'Test Schedule');
    
    // Navigate to schedule detail
    await navigateToScheduleDetail(page, scheduleName);
    
    // Add an entry
    const entry: ScheduleEntryDetails = {
      name: 'Morning Meeting',
      day: 'Monday',
      startTime: '09:00',
      duration: 60
    };
    await addScheduleEntry(page, entry);
    
    // Verify entry appears in weekly view
    await expect(page.locator('text=Monday').locator('..').getByText('Morning Meeting')).toBeVisible();
  });

  test('should delete schedule entry', async ({ page }) => {
    // Create a schedule via UI
    const scheduleName = await createScheduleViaUI(page, 'Test Schedule');
    
    // Navigate to schedule detail
    await navigateToScheduleDetail(page, scheduleName);
    
    // Add an entry first
    const entry: ScheduleEntryDetails = {
      name: 'Test Entry',
      day: 'Tuesday',
      startTime: '10:00',
      duration: 30
    };
    await addScheduleEntry(page, entry);
    
    // Verify entry was added in the weekly grid
    await expect(page.locator('text=Tuesday').locator('..').getByText('Test Entry')).toBeVisible();
    
    // Delete the entry
    await deleteScheduleEntry(page, 'Test Entry');
    
    // Verify entry is removed from the weekly grid
    await expect(page.locator('text=Tuesday').locator('..').getByText('Test Entry')).not.toBeVisible();
  });

  test('should edit schedule entry', async ({ page }) => {
    // Create a schedule via UI
    const scheduleName = await createScheduleViaUI(page, 'Test Schedule');
    
    // Navigate to schedule detail
    await navigateToScheduleDetail(page, scheduleName);
    
    // Add an entry first
    const originalEntry: ScheduleEntryDetails = {
      name: 'Original Entry',
      day: 'Wednesday',
      startTime: '14:00',
      duration: 45
    };
    await addScheduleEntry(page, originalEntry);
    
    // Edit the entry
    await editScheduleEntry(page, 'Original Entry', {
      name: 'Updated Entry',
      startTime: '15:30',
      duration: 90
    });
    
    // Verify the entry was updated in the weekly grid
    await expect(page.locator('text=Wednesday').locator('..').getByText('Updated Entry')).toBeVisible();
    await expect(page.locator('text=Wednesday').locator('..').getByText('Original Entry')).not.toBeVisible();
  });
});