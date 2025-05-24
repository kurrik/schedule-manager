import type { Schedule } from '../models/schedule';
import type { ScheduleOverride, ModifyOverrideData, OneTimeOverrideData } from '../models/schedule-override';

export interface MaterializedEntry {
  id: string; // Either entry index or override ID
  name: string;
  dayOfWeek: number;
  startTimeMinutes: number;
  durationMinutes: number;
  date: string; // ISO date string (YYYY-MM-DD)
  isOverride: boolean;
  overrideType?: 'MODIFY' | 'SKIP' | 'ONE_TIME';
  baseEntryIndex?: number; // For MODIFY overrides
}

export class CalendarMaterializationService {
  /**
   * Materializes a schedule for a specific date, applying all relevant overrides
   */
  static materializeScheduleForDate(
    schedule: Schedule,
    date: Date,
    overrides: ScheduleOverride[]
  ): MaterializedEntry[] {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    
    // Start with recurring entries for this day of week
    const recurringEntries = schedule.entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.dayOfWeek === dayOfWeek);

    // Get overrides for this specific date
    const relevantOverrides = overrides.filter(override => override.overrideDate === dateStr);

    const materializedEntries: MaterializedEntry[] = [];

    // Process recurring entries, applying modifications and skips
    for (const { entry, index } of recurringEntries) {
      // Check if this entry is skipped
      const skipOverride = relevantOverrides.find(
        override => override.isSkipOverride() && override.baseEntryId === index.toString()
      );

      if (skipOverride) {
        // Skip this entry entirely
        continue;
      }

      // Check if this entry is modified
      const modifyOverride = relevantOverrides.find(
        override => override.isModifyOverride() && override.baseEntryId === index.toString()
      );

      if (modifyOverride) {
        // Apply modifications
        const modifyData = modifyOverride.overrideData as ModifyOverrideData;
        materializedEntries.push({
          id: modifyOverride.id,
          name: modifyData.name ?? entry.name,
          dayOfWeek: entry.dayOfWeek,
          startTimeMinutes: modifyData.startTimeMinutes ?? entry.startTimeMinutes,
          durationMinutes: modifyData.durationMinutes ?? entry.durationMinutes,
          date: dateStr,
          isOverride: true,
          overrideType: 'MODIFY',
          baseEntryIndex: index,
        });
      } else {
        // Use original recurring entry
        materializedEntries.push({
          id: index.toString(),
          name: entry.name,
          dayOfWeek: entry.dayOfWeek,
          startTimeMinutes: entry.startTimeMinutes,
          durationMinutes: entry.durationMinutes,
          date: dateStr,
          isOverride: false,
        });
      }
    }

    // Add one-time entries
    const oneTimeOverrides = relevantOverrides.filter(override => override.isOneTimeOverride());
    for (const override of oneTimeOverrides) {
      const oneTimeData = override.overrideData as OneTimeOverrideData;
      materializedEntries.push({
        id: override.id,
        name: oneTimeData.name,
        dayOfWeek: dayOfWeek,
        startTimeMinutes: oneTimeData.startTimeMinutes,
        durationMinutes: oneTimeData.durationMinutes,
        date: dateStr,
        isOverride: true,
        overrideType: 'ONE_TIME',
      });
    }

    // Sort by start time
    materializedEntries.sort((a, b) => a.startTimeMinutes - b.startTimeMinutes);

    return materializedEntries;
  }

  /**
   * Materializes a schedule for a date range (e.g., for monthly calendar view)
   */
  static materializeScheduleForDateRange(
    schedule: Schedule,
    startDate: Date,
    endDate: Date,
    overrides: ScheduleOverride[]
  ): Map<string, MaterializedEntry[]> {
    const materializedCalendar = new Map<string, MaterializedEntry[]>();
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const entriesForDate = this.materializeScheduleForDate(schedule, currentDate, overrides);
      materializedCalendar.set(dateStr, entriesForDate);
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return materializedCalendar;
  }

  /**
   * Check for conflicts in materialized entries (overlapping times)
   */
  static findConflicts(entries: MaterializedEntry[]): { entry1: MaterializedEntry; entry2: MaterializedEntry }[] {
    const conflicts: { entry1: MaterializedEntry; entry2: MaterializedEntry }[] = [];
    
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];
        
        const entry1End = entry1.startTimeMinutes + entry1.durationMinutes;
        const entry2End = entry2.startTimeMinutes + entry2.durationMinutes;
        
        // Check for overlap
        const hasOverlap = (
          (entry1.startTimeMinutes < entry2End && entry1End > entry2.startTimeMinutes)
        );
        
        if (hasOverlap) {
          conflicts.push({ entry1, entry2 });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Validate that a new override doesn't create conflicts
   */
  static validateOverrideForDate(
    schedule: Schedule,
    date: Date,
    newOverride: ScheduleOverride,
    existingOverrides: ScheduleOverride[]
  ): { valid: boolean; conflicts?: MaterializedEntry[] } {
    // Apply the new override
    const allOverrides = [...existingOverrides, newOverride];
    const newEntries = this.materializeScheduleForDate(schedule, date, allOverrides);
    
    // Check for conflicts
    const conflicts = this.findConflicts(newEntries);
    
    return {
      valid: conflicts.length === 0,
      conflicts: conflicts.flatMap(c => [c.entry1, c.entry2])
    };
  }
}