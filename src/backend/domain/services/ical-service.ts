import ical from 'ical-generator';
import type { Schedule } from '../models/schedule';
import type { ScheduleEntry } from '../models/schedule-entry';

export class ICalService {
  generateFeed(schedule: Schedule, baseUrl: string): string {
    const calendar = ical({
      name: schedule.name,
      description: `Weekly schedule: ${schedule.name}`,
      timezone: schedule.timeZone,
      url: `${baseUrl}/schedule/${schedule.id}`,
    });

    // Add each schedule entry as a recurring weekly event
    for (const entry of schedule.entries) {
      this.addRecurringEvent(calendar, entry, schedule, baseUrl);
    }

    return calendar.toString();
  }

  private addRecurringEvent(
    calendar: any, 
    entry: ScheduleEntry, 
    schedule: Schedule, 
    baseUrl: string
  ): void {
    // Calculate the next occurrence of this day of week
    // Start from today to ensure we don't create events in the past
    const today = new Date();
    const startDate = this.getNextOccurrenceOfDay(today, entry.dayOfWeek);
    
    // Convert start time minutes to hours and minutes
    const startHours = Math.floor(entry.startTimeMinutes / 60);
    const startMinutes = entry.startTimeMinutes % 60;
    
    // Set the start time
    startDate.setHours(startHours, startMinutes, 0, 0);
    
    // Calculate end time
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + entry.durationMinutes);

    // Create description with link back to schedule
    const description = [
      `Weekly recurring task: ${entry.name}`,
      `Schedule: ${schedule.name}`,
      `Duration: ${entry.durationMinutes} minutes`,
      '',
      `View and edit this schedule at: ${baseUrl}/schedule/${schedule.id}`,
    ].join('\n');

    calendar.createEvent({
      start: startDate,
      end: endDate,
      summary: entry.name,
      description: description,
      timezone: schedule.timeZone,
      repeating: {
        freq: 'WEEKLY', // Repeat weekly
        interval: 1,    // Every week
        // No end date - repeats forever as requested
      },
    });
  }

  private getNextOccurrenceOfDay(fromDate: Date, dayOfWeek: number): Date {
    const result = new Date(fromDate);
    const currentDay = result.getDay();
    
    // Calculate days until target day (0 = Sunday, 1 = Monday, etc.)
    let daysUntilTarget = dayOfWeek - currentDay;
    
    // If target day is today or in the past this week, move to next week
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    result.setDate(result.getDate() + daysUntilTarget);
    return result;
  }
}