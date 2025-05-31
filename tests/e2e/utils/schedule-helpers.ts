import { Page, expect } from '@playwright/test';
import { getUniqueName } from './index';

/**
 * Creates a schedule via UI interaction
 * @param page - Playwright page object
 * @param baseName - Base name for the schedule (will have random suffix added)
 * @returns The unique schedule name that was created
 */
export async function createScheduleViaUI(page: Page, baseName: string = 'Test Schedule'): Promise<string> {
  // Generate unique name to avoid conflicts
  const uniqueName = getUniqueName(baseName);

  // Navigate to schedules list if not already there
  try {
    await page.goto('/');
  } catch (error) {
    if (error.message.includes('NS_BINDING_ABORTED')) {
      await page.waitForTimeout(1000);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
    } else {
      throw error;
    }
  }

  // Click create schedule button
  await page.getByTestId('new-schedule-button').click();
  await expect(page.getByTestId('create-schedule-modal')).toBeVisible();

  // Fill in schedule details
  await page.getByTestId('schedule-name-input').fill(uniqueName);
  await page.getByTestId('schedule-timezone-input').fill('America/New_York');

  // Submit form and wait for completion
  await page.getByTestId('create-schedule-submit-button').click();
  await expect(page.getByTestId('create-schedule-modal')).not.toBeVisible();

  // Verify schedule appears in the schedule list specifically
  await expect(page.locator(`[data-testid*="schedule-item-"]`).filter({ hasText: uniqueName })).toBeVisible();

  return uniqueName;
}

/**
 * Navigates to schedule detail page by finding and clicking the View button
 * @param page - Playwright page object
 * @param scheduleName - Name of the schedule to navigate to
 */
export async function navigateToScheduleDetail(page: Page, scheduleName: string): Promise<void> {
  // Navigate to schedules list if not already there
  await page.goto('/');

  // Wait for schedule list to load
  await expect(page.getByRole('heading', { name: 'Schedules' })).toBeVisible();

  // Find the schedule item and wait for it to be visible
  const scheduleItem = page.locator(`[data-testid*="schedule-item-"]`).filter({ hasText: scheduleName });
  await expect(scheduleItem).toBeVisible();

  // Add some debugging if the schedule is not found after waiting
  const scheduleCount = await page.locator(`[data-testid*="schedule-item-"]`).count();
  if (scheduleCount === 0) {
    throw new Error(`No schedules found in list. Expected to find "${scheduleName}"`);
  }

  const viewButton = scheduleItem.locator(`[data-testid*="schedule-view-button-"]`);
  await viewButton.click();

  // Wait for schedule detail page to load
  await expect(page.getByRole('heading', { name: scheduleName })).toBeVisible();
  await expect(page.getByText('Monday')).toBeVisible(); // Weekly grid loaded
}

export interface ScheduleEntryDetails {
  name: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string; // Format: "HH:MM" (24-hour)
  duration: number; // Duration in minutes
}

/**
 * Adds a schedule entry via UI interaction
 * @param page - Playwright page object
 * @param entry - Entry details
 */
export async function addScheduleEntry(page: Page, entry: ScheduleEntryDetails): Promise<void> {
  // Click the "+ Add entry" area for the specified day
  await page.locator('text=' + entry.day).locator('..').locator('text=+ Add entry').click();
  await expect(page.getByTestId('add-entry-modal')).toBeVisible();

  // Fill in entry details
  await page.getByTestId('add-entry-name-input').fill(entry.name);
  await page.getByTestId('add-entry-starttime-input').fill(entry.startTime);
  await page.getByTestId('add-entry-duration-input').fill(entry.duration.toString());

  // Select the correct day (convert day name to index)
  const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(entry.day);
  await page.getByTestId('add-entry-day-select').selectOption(dayIndex.toString());

  // Submit entry and wait for completion
  await page.getByTestId('add-entry-submit-button').click();
  await expect(page.getByTestId('add-entry-modal')).not.toBeVisible();

  // Verify entry appears in the weekly grid (not calendar view)
  await expect(page.locator('text=' + entry.day).locator('..').getByText(entry.name)).toBeVisible();
}

/**
 * Edits an existing schedule entry
 * @param page - Playwright page object
 * @param entryName - Name of the entry to edit
 * @param newDetails - New entry details
 */
export async function editScheduleEntry(page: Page, entryName: string, newDetails: Partial<ScheduleEntryDetails>): Promise<void> {
  // Click on the entry in the weekly grid to open edit modal
  await page.locator('.bg-primary').getByText(entryName).first().click();
  await expect(page.getByTestId('edit-entry-modal')).toBeVisible();

  // Update fields if provided
  if (newDetails.name) {
    await page.getByTestId('edit-entry-name-input').fill(newDetails.name);
  }
  if (newDetails.startTime) {
    await page.getByTestId('edit-entry-starttime-input').fill(newDetails.startTime);
  }
  if (newDetails.duration) {
    await page.getByTestId('edit-entry-duration-input').fill(newDetails.duration.toString());
  }
  if (newDetails.day) {
    const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(newDetails.day);
    await page.getByTestId('edit-entry-day-select').selectOption(dayIndex.toString());
  }

  // Save changes
  await page.getByTestId('edit-entry-save-button').click();
  await expect(page.getByTestId('edit-entry-modal')).not.toBeVisible();

  // Verify updated entry appears in the weekly grid
  const expectedName = newDetails.name || entryName;
  const targetDay = newDetails.day || 'Wednesday'; // Default to Wednesday since we don't track original day
  await expect(page.locator('text=' + targetDay).locator('..').getByText(expectedName)).toBeVisible();
}

/**
 * Deletes a schedule entry
 * @param page - Playwright page object
 * @param entryName - Name of the entry to delete
 */
export async function deleteScheduleEntry(page: Page, entryName: string): Promise<void> {
  // Click on the entry in the weekly grid to open edit modal
  await page.locator('.bg-primary').getByText(entryName).first().click();
  await expect(page.getByTestId('edit-entry-modal')).toBeVisible();

  // Click delete button and handle potential confirmation dialog
  page.on('dialog', dialog => dialog.accept()); // Auto-accept any confirmation dialogs
  await page.getByTestId('edit-entry-delete-button').click();

  // Wait for modal to close or entry to be removed from the page
  await expect(page.getByTestId('edit-entry-modal')).not.toBeVisible();
}

/**
 * Edits a schedule's basic information (name, timezone)
 * @param page - Playwright page object
 * @param newName - New schedule name (optional)
 * @param newTimezone - New timezone (optional)
 */
export async function editScheduleInfo(page: Page, newName?: string, newTimezone?: string): Promise<void> {
  // Click edit schedule button
  await page.getByTestId('edit-schedule-button').click();
  await expect(page.getByTestId('edit-schedule-modal')).toBeVisible();

  // Update fields if provided
  if (newName) {
    await page.getByTestId('edit-schedule-name-input').fill(newName);
  }
  if (newTimezone) {
    await page.getByTestId('edit-schedule-timezone-input').fill(newTimezone);
  }

  // Save changes
  await page.getByTestId('edit-schedule-save-button').click();
  await expect(page.getByTestId('edit-schedule-modal')).not.toBeVisible();

  // Verify updated name appears if changed
  if (newName) {
    await expect(page.getByRole('heading', { name: newName })).toBeVisible();
  }
}