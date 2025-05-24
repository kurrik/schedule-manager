import type { D1Database } from '@cloudflare/workers-types';
import { Schedule } from '../../domain/models/schedule';
import { ScheduleEntry } from '../../domain/models/schedule-entry';
import type { IScheduleRepository } from '../../domain/repositories';

interface ScheduleRow {
  id: string;
  owner_id: string;
  name: string;
  timezone: string;
  ical_url: string;
  created_at: string;
  updated_at: string;
}

interface ScheduleEntryRow {
  id: string;
  schedule_id: string;
  name: string;
  day_of_week: number;
  start_time_minutes: number;
  duration_minutes: number;
  created_at: string;
}

interface ScheduleShareRow {
  schedule_id: string;
  user_id: string;
}

export class D1ScheduleRepository implements IScheduleRepository {
  private readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async findById(id: string): Promise<Schedule | null> {
    // Get schedule
    const scheduleResult = await this.db.prepare(
      'SELECT * FROM schedules WHERE id = ?'
    ).bind(id).first<ScheduleRow>();

    if (!scheduleResult) {
      return null;
    }

    // Get entries
    const entriesResult = await this.db.prepare(
      'SELECT * FROM schedule_entries WHERE schedule_id = ? ORDER BY day_of_week, start_time_minutes'
    ).bind(id).all<ScheduleEntryRow>();

    // Get shared users
    const sharesResult = await this.db.prepare(
      'SELECT user_id FROM schedule_shares WHERE schedule_id = ?'
    ).bind(id).all<ScheduleShareRow>();

    return this.mapToSchedule(
      scheduleResult,
      entriesResult.results || [],
      sharesResult.results || []
    );
  }

  async findByUserId(userId: string): Promise<Schedule[]> {
    // Get schedules where user is owner OR shared with user
    const schedulesResult = await this.db.prepare(`
      SELECT DISTINCT s.* FROM schedules s
      LEFT JOIN schedule_shares ss ON s.id = ss.schedule_id  
      WHERE s.owner_id = ? OR ss.user_id = ?
      ORDER BY s.updated_at DESC
    `).bind(userId, userId).all<ScheduleRow>();

    const schedules: Schedule[] = [];

    // For each schedule, get entries and shares
    for (const scheduleRow of schedulesResult.results || []) {
      const entriesResult = await this.db.prepare(
        'SELECT * FROM schedule_entries WHERE schedule_id = ? ORDER BY day_of_week, start_time_minutes'
      ).bind(scheduleRow.id).all<ScheduleEntryRow>();

      const sharesResult = await this.db.prepare(
        'SELECT user_id FROM schedule_shares WHERE schedule_id = ?'
      ).bind(scheduleRow.id).all<ScheduleShareRow>();

      schedules.push(this.mapToSchedule(
        scheduleRow,
        entriesResult.results || [],
        sharesResult.results || []
      ));
    }

    return schedules;
  }

  async findByICalUrl(icalUrl: string): Promise<Schedule | null> {
    const scheduleResult = await this.db.prepare(
      'SELECT * FROM schedules WHERE ical_url = ?'
    ).bind(icalUrl).first<ScheduleRow>();

    if (!scheduleResult) {
      return null;
    }

    // Get entries
    const entriesResult = await this.db.prepare(
      'SELECT * FROM schedule_entries WHERE schedule_id = ? ORDER BY day_of_week, start_time_minutes'
    ).bind(scheduleResult.id).all<ScheduleEntryRow>();

    // Get shared users
    const sharesResult = await this.db.prepare(
      'SELECT user_id FROM schedule_shares WHERE schedule_id = ?'
    ).bind(scheduleResult.id).all<ScheduleShareRow>();

    return this.mapToSchedule(
      scheduleResult,
      entriesResult.results || [],
      sharesResult.results || []
    );
  }

  async save(schedule: Schedule): Promise<void> {
    console.log('[DEBUG] Starting save for schedule:', schedule.id);
    
    // Check overrides before save
    const overridesBefore = await this.db.prepare(
      'SELECT id, base_entry_id FROM schedule_overrides WHERE schedule_id = ?'
    ).bind(schedule.id).all();
    console.log('[DEBUG] Overrides before save:', overridesBefore.results);
    
    // Get existing entry IDs to know which ones to delete later
    const existingEntries = await this.db.prepare(
      'SELECT id FROM schedule_entries WHERE schedule_id = ?'
    ).bind(schedule.id).all<{id: string}>();
    
    const existingIds = new Set(existingEntries.results?.map(row => row.id) || []);
    const newIds = new Set<string>();
    
    console.log('[DEBUG] Existing entries:', Array.from(existingIds));
    console.log('[DEBUG] Schedule entries to save:', schedule.entries.map(e => ({ id: e.id, name: e.name })));

    // Prepare batch operations
    const batch = [];

    // Update schedule (use UPDATE to avoid triggering CASCADE DELETE on overrides)
    batch.push(
      this.db.prepare(`
        UPDATE schedules 
        SET owner_id = ?, name = ?, timezone = ?, ical_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        schedule.ownerId,
        schedule.name,
        schedule.timeZone,
        schedule.icalUrl,
        schedule.id
      )
    );

    // Insert or update entries (preserving IDs to maintain override references)
    for (const entry of schedule.entries) {
      const entryId = entry.id || crypto.randomUUID();
      console.log('[DEBUG] Processing entry:', { entryId, name: entry.name });
      newIds.add(entryId);
      
      if (existingIds.has(entryId)) {
        // Update existing entry (preserves foreign key references)
        console.log('[DEBUG] Updating existing entry:', entryId);
        batch.push(
          this.db.prepare(`
            UPDATE schedule_entries 
            SET name = ?, day_of_week = ?, start_time_minutes = ?, duration_minutes = ?
            WHERE id = ?
          `).bind(
            entry.name,
            entry.dayOfWeek,
            entry.startTimeMinutes,
            entry.durationMinutes,
            entryId
          )
        );
      } else {
        // Insert new entry
        console.log('[DEBUG] Inserting new entry:', entryId);
        batch.push(
          this.db.prepare(`
            INSERT INTO schedule_entries 
            (id, schedule_id, name, day_of_week, start_time_minutes, duration_minutes)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            entryId,
            schedule.id,
            entry.name,
            entry.dayOfWeek,
            entry.startTimeMinutes,
            entry.durationMinutes
          )
        );
      }
    }
    
    console.log('[DEBUG] New entry IDs:', Array.from(newIds));

    // For entries that are no longer in the schedule, check if they're referenced by overrides
    for (const existingId of existingIds) {
      if (!newIds.has(existingId)) {
        console.log('[DEBUG] Entry no longer in schedule:', existingId);
        // Check if this entry is referenced by any overrides
        const overrideCount = await this.db.prepare(
          'SELECT COUNT(*) as count FROM schedule_overrides WHERE base_entry_id = ?'
        ).bind(existingId).first<{count: number}>();
        
        console.log('[DEBUG] Override count for entry', existingId, ':', overrideCount?.count);
        
        // Only delete if no overrides reference this entry
        if (!overrideCount || overrideCount.count === 0) {
          console.log('[DEBUG] Deleting entry:', existingId);
          batch.push(
            this.db.prepare('DELETE FROM schedule_entries WHERE id = ?').bind(existingId)
          );
        } else {
          console.log('[DEBUG] Keeping entry', existingId, 'due to override references');
        }
      }
    }

    // Delete existing shares
    batch.push(
      this.db.prepare('DELETE FROM schedule_shares WHERE schedule_id = ?')
        .bind(schedule.id)
    );

    // Insert shares
    for (const userId of schedule.sharedUserIds) {
      batch.push(
        this.db.prepare(`
          INSERT INTO schedule_shares (schedule_id, user_id)
          VALUES (?, ?)
        `).bind(schedule.id, userId)
      );
    }

    // Execute all operations
    console.log('[DEBUG] Executing batch with', batch.length, 'operations');
    await this.db.batch(batch);
    
    // Check overrides after save
    const overridesAfter = await this.db.prepare(
      'SELECT id, base_entry_id FROM schedule_overrides WHERE schedule_id = ?'
    ).bind(schedule.id).all();
    console.log('[DEBUG] Overrides after save:', overridesAfter.results);
  }

  async delete(id: string): Promise<void> {
    // Foreign key constraints will handle cascade deletes
    await this.db.prepare('DELETE FROM schedules WHERE id = ?').bind(id).run();
  }

  private mapToSchedule(
    scheduleRow: ScheduleRow,
    entryRows: ScheduleEntryRow[],
    shareRows: ScheduleShareRow[]
  ): Schedule {
    const entries = entryRows.map(row => new ScheduleEntry({
      id: row.id,
      name: row.name,
      dayOfWeek: row.day_of_week,
      startTimeMinutes: row.start_time_minutes,
      durationMinutes: row.duration_minutes,
    }));

    const sharedUserIds = shareRows.map(row => row.user_id);

    return new Schedule({
      id: scheduleRow.id,
      ownerId: scheduleRow.owner_id,
      name: scheduleRow.name,
      timeZone: scheduleRow.timezone,
      icalUrl: scheduleRow.ical_url,
      sharedUserIds,
      entries,
    });
  }
}