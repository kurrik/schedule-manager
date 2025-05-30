import ical from 'ical-generator';
import type { Schedule } from '../models/schedule';
import type { SchedulePhase } from '../models/schedule-phase';
import type { ScheduleEntry } from '../models/schedule-entry';

export class ICalService {
  generateFeed(schedule: Schedule, baseUrl: string): string {
    const calendar = ical({
      name: schedule.name,
      description: `Weekly schedule: ${schedule.name}`,
      timezone: schedule.timeZone,
      url: `${baseUrl}/schedule/${schedule.id}`,
    });

    // Add entries from all phases, respecting phase date boundaries
    for (const phase of schedule.phases) {
      for (const entry of phase.entries) {
        this.addRecurringEventWithPhase(calendar, entry, phase, schedule, baseUrl);
      }
    }

    return calendar.toString();
  }

  private addRecurringEventWithPhase(
    calendar: any, 
    entry: ScheduleEntry, 
    phase: SchedulePhase,
    schedule: Schedule, 
    baseUrl: string
  ): void {
    // Determine the effective start date based on phase boundaries
    const today = new Date();
    let effectiveStartDate = today;
    
    // If phase has a start date, use the later of today or phase start
    if (phase.startDate) {
      const phaseStart = new Date(phase.startDate + 'T00:00:00Z');
      if (phaseStart > today) {
        effectiveStartDate = phaseStart;
      }
    }
    
    const startDate = this.getNextOccurrenceOfDay(effectiveStartDate, entry.dayOfWeek);
    
    // Convert start time minutes to hours and minutes
    const startHours = Math.floor(entry.startTimeMinutes / 60);
    const startMinutes = entry.startTimeMinutes % 60;
    
    // Set the start time
    startDate.setHours(startHours, startMinutes, 0, 0);
    
    // Calculate end time
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + entry.durationMinutes);

    // Create description with link back to schedule and phase info
    const description = [
      `Weekly recurring task: ${entry.name}`,
      `Schedule: ${schedule.name}`,
      phase.name ? `Phase: ${phase.name}` : '',
      phase.startDate ? `Phase starts: ${phase.startDate}` : '',
      phase.endDate ? `Phase ends: ${phase.endDate}` : '',
      `Duration: ${entry.durationMinutes} minutes`,
      '',
      `View and edit this schedule at: ${baseUrl}/schedule/${schedule.id}`,
    ].filter(line => line).join('\n');

    // Build repeating rule with phase end date if specified
    const repeatingRule: any = {
      freq: 'WEEKLY',
      interval: 1,
    };
    
    // If phase has an end date, set UNTIL parameter
    if (phase.endDate) {
      // Set to end of day on the phase end date
      const untilDate = new Date(phase.endDate + 'T23:59:59Z');
      repeatingRule.until = untilDate;
    }

    calendar.createEvent({
      start: startDate,
      end: endDate,
      summary: entry.name,
      description: description,
      timezone: schedule.timeZone,
      repeating: repeatingRule,
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