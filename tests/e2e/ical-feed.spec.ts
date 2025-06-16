import { test, expect } from '@playwright/test';
import {
  signInTestUser,
  testUsers,
  setupTestDatabase,
  createScheduleViaUI,
  navigateToScheduleDetail,
  addScheduleEntry,
  fetchICalFeed,
  ScheduleEntryDetails,
  scheduleSkipOverrideViaUI
} from './utils';
/**
 * TDD: iCal feed should reflect overrides
 */
test.describe('iCal Feed Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestDatabase();
    await signInTestUser(page, testUsers.user1);
  });

  test('should reflect SKIP override in iCal feed (TDD)', async ({ page, request }) => {
    // 1. Create a schedule
    const scheduleName = await createScheduleViaUI(page, 'iCal Override Schedule');
    await navigateToScheduleDetail(page, scheduleName);

    // 2. Add a Monday entry
    const entry: ScheduleEntryDetails = {
      name: 'Weekly Meeting',
      day: 'Monday',
      startTime: '10:00',
      duration: 60
    };
    await addScheduleEntry(page, entry);

    // 3. Get the schedule's iCal URL from the UI
    const icalInput = page.locator('input.input-bordered');
    await expect(icalInput).toBeVisible();
    const icalFullUrl = await icalInput.inputValue();
    // Extract just the icalUrl segment (after '/ical/')
    const icalUrlMatch = icalFullUrl.match(/\/ical\/(.+)$/);
    expect(icalUrlMatch).toBeTruthy();
    const icalUrl = icalUrlMatch![1];
    expect(icalUrl).toBeTruthy();

    // 4. Create a SKIP override for the next Monday
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7)); // Next Monday
    const dateStr = nextMonday.toISOString().slice(0, 10);

    // Use the UI to schedule a SKIP override for the entry
    await scheduleSkipOverrideViaUI(page, entry.name, entry.day, dateStr);

    // 5. Fetch iCal feed
    const icalFeed = await fetchICalFeed(request, icalUrl);

    // 6. Assert that an event still exists for the overridden date (this should FAIL until fixed)
    // Look for DTSTART on the overridden date
    const dtstartPattern = `DTSTART;TZID=America/New_York:${dateStr.replace(/-/g, '')}T100000`;
    const eventForSkippedDate = icalFeed.includes(dtstartPattern);
    expect(eventForSkippedDate).toBeFalsy(); // This will FAIL (event is still present)
  });
});
