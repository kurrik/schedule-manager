import ical from 'ical-generator';
import type { Schedule } from '../models/schedule';
import type { ScheduleOverride } from '../models/schedule-override';
import { CalendarMaterializationService } from './calendar-materialization-service';

/**
 * Service to generate iCal feeds for a schedule, applying overrides.
 */
export class ICalService {
  /**
   * Generate an iCal feed for a schedule, applying overrides for SKIP, MODIFY, ONE_TIME.
   * @param schedule The schedule object
   * @param baseUrl The base URL for links
   * @param overrides The list of schedule overrides (optional; if not provided, no overrides are applied)
   * @returns iCal feed as string
   */
  generateFeed(schedule: Schedule, baseUrl: string, overrides?: ScheduleOverride[]): string {
    const calendar = ical({
      name: schedule.name,
      description: `Weekly schedule: ${schedule.name}`,
      timezone: schedule.timeZone,
      url: `${baseUrl}/schedule/${schedule.id}`,
    });

    // If no overrides provided, fallback to legacy recurring events
    if (!overrides) {
      for (const phase of schedule.phases) {
        for (const entry of phase.entries) {
          this.addRecurringEventWithPhase(calendar, entry, phase, schedule, baseUrl);
        }
      }
      return calendar.toString();
    }

    // Determine date range for materialization
    const { startDate, endDate } = this.getScheduleDateRange(schedule);

    // For each date in the range, materialize entries and create events
    let current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const entries = CalendarMaterializationService.materializeScheduleForDate(schedule, current, overrides);
      for (const entry of entries) {
        this.addSingleEvent(calendar, entry, schedule, baseUrl);
      }
      current.setDate(current.getDate() + 1);
    }

    return calendar.toString();
  }

  /**
   * Add a non-recurring event to the calendar for a materialized entry.
   */
  private addSingleEvent(
    calendar: any,
    entry: {
      id: string;
      name: string;
      startTimeMinutes: number;
      durationMinutes: number;
      date: string;
      phaseId?: string;
    },
    schedule: Schedule,
    baseUrl: string
  ): void {
    // Compute start/end datetime in schedule timezone
    const [year, month, day] = entry.date.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    startDate.setUTCMinutes(startDate.getUTCMinutes() + entry.startTimeMinutes);
    const endDate = new Date(startDate.getTime() + entry.durationMinutes * 60000);

    // Find phase name if available
    const phase = entry.phaseId ? schedule.phases.find(p => p.id === entry.phaseId) : undefined;
    const description = [
      `${entry.name}`,
      `Schedule: ${schedule.name}`,
      phase?.name ? `Phase: ${phase.name}` : '',
      `Duration: ${entry.durationMinutes} minutes`,
      '',
      `View and edit this schedule at: ${baseUrl}/schedule/${schedule.id}`,
    ].filter(Boolean).join('\n');

    calendar.createEvent({
      start: startDate,
      end: endDate,
      summary: entry.name,
      description,
      timezone: schedule.timeZone,
    });
  }

  /**
   * For legacy fallback: add recurring event for a schedule entry.
   */
  private addRecurringEventWithPhase(
    calendar: any,
    entry: any,
    phase: any,
    schedule: Schedule,
    baseUrl: string
  ): void {
    // (Unchanged legacy logic)
    const today = new Date();
    let effectiveStartDate = today;
    if (phase.startDate) {
      const phaseStart = new Date(phase.startDate + 'T00:00:00Z');
      if (phaseStart > today) {
        effectiveStartDate = phaseStart;
      }
    }
    const startDate = this.getNextOccurrenceOfDay(effectiveStartDate, entry.dayOfWeek);
    const startHours = Math.floor(entry.startTimeMinutes / 60);
    const startMinutes = entry.startTimeMinutes % 60;
    startDate.setHours(startHours, startMinutes, 0, 0);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + entry.durationMinutes);
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
    const repeatingRule: any = { freq: 'WEEKLY', interval: 1 };
    if (phase.endDate) {
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

  /**
   * Get the earliest start and latest end date from all phases.
   */
  private getScheduleDateRange(schedule: Schedule): { startDate: Date; endDate: Date } {
    let min: Date | undefined;
    let max: Date | undefined;
    for (const phase of schedule.phases) {
      if (phase.startDate) {
        const d = new Date(phase.startDate + 'T00:00:00Z');
        if (!min || d < min) min = d;
      }
      if (phase.endDate) {
        const d = new Date(phase.endDate + 'T00:00:00Z');
        if (!max || d > max) max = d;
      }
    }
    // Fallback: if no phase dates, use today for both
    const today = new Date();
    return {
      startDate: min || today,
      endDate: max || today,
    };
  }

  private getNextOccurrenceOfDay(fromDate: Date, dayOfWeek: number): Date {
    const result = new Date(fromDate);
    const currentDay = result.getDay();
    let daysUntilTarget = dayOfWeek - currentDay;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    result.setDate(result.getDate() + daysUntilTarget);
    return result;
  }
}