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
    // Use a transaction-like approach with batch operations
    const batch = [];

    // Update schedule
    batch.push(
      this.db.prepare(`
        INSERT OR REPLACE INTO schedules 
        (id, owner_id, name, timezone, ical_url, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        schedule.id,
        schedule.ownerId,
        schedule.name,
        schedule.timeZone,
        schedule.icalUrl
      )
    );

    // Delete existing entries
    batch.push(
      this.db.prepare('DELETE FROM schedule_entries WHERE schedule_id = ?')
        .bind(schedule.id)
    );

    // Insert entries
    for (const entry of schedule.entries) {
      batch.push(
        this.db.prepare(`
          INSERT INTO schedule_entries 
          (id, schedule_id, name, day_of_week, start_time_minutes, duration_minutes)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          schedule.id,
          entry.name,
          entry.dayOfWeek,
          entry.startTimeMinutes,
          entry.durationMinutes
        )
      );
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
    await this.db.batch(batch);
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