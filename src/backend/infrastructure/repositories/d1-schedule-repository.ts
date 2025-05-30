import type { D1Database } from '@cloudflare/workers-types';
import { Schedule } from '../../domain/models/schedule';
import { SchedulePhase } from '../../domain/models/schedule-phase';
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

interface SchedulePhaseRow {
  id: string;
  schedule_id: string;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface ScheduleEntryRow {
  id: string;
  schedule_id: string;
  phase_id: string;
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

    // Get phases and their entries
    const phasesResult = await this.db.prepare(
      'SELECT * FROM schedule_phases WHERE schedule_id = ? ORDER BY start_date ASC, created_at ASC'
    ).bind(id).all<SchedulePhaseRow>();

    const phases: SchedulePhase[] = [];
    for (const phaseRow of phasesResult.results || []) {
      const entriesResult = await this.db.prepare(
        'SELECT * FROM schedule_entries WHERE phase_id = ? ORDER BY day_of_week, start_time_minutes'
      ).bind(phaseRow.id).all<ScheduleEntryRow>();

      phases.push(this.mapToSchedulePhase(phaseRow, entriesResult.results || []));
    }

    // Handle legacy schedules that don't have phases yet (on-the-fly migration)
    if (phases.length === 0) {
      console.log('[DEBUG] No phases found for schedule, checking for legacy entries:', id);
      
      // Check if there are entries without phase_id (legacy entries)
      const legacyEntries = await this.db.prepare(
        'SELECT * FROM schedule_entries WHERE schedule_id = ? AND phase_id IS NULL ORDER BY day_of_week, start_time_minutes'
      ).bind(id).all<ScheduleEntryRow>();

      if (legacyEntries.results && legacyEntries.results.length > 0) {
        console.log('[DEBUG] Found legacy entries, creating default phase');
        
        // Create a default phase for this schedule
        const defaultPhaseId = `default-${id}`;
        await this.db.prepare(`
          INSERT INTO schedule_phases (id, schedule_id, name, start_date, end_date, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(defaultPhaseId, id, 'Default Phase', null, null).run();

        // Update legacy entries to reference the new default phase
        await this.db.prepare(`
          UPDATE schedule_entries 
          SET phase_id = ? 
          WHERE schedule_id = ? AND phase_id IS NULL
        `).bind(defaultPhaseId, id).run();

        // Create the phase object with the migrated entries
        const migratedEntries = legacyEntries.results.map(row => ({
          ...row,
          phase_id: defaultPhaseId
        }));

        const defaultPhase = this.mapToSchedulePhase({
          id: defaultPhaseId,
          schedule_id: id,
          name: 'Default Phase',
          start_date: null,
          end_date: null,
          created_at: new Date().toISOString()
        }, migratedEntries);

        phases.push(defaultPhase);
      }
    }

    // Get shared users
    const sharesResult = await this.db.prepare(
      'SELECT user_id FROM schedule_shares WHERE schedule_id = ?'
    ).bind(id).all<ScheduleShareRow>();

    return this.mapToSchedule(
      scheduleResult,
      phases,
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

    // For each schedule, get phases and shares
    for (const scheduleRow of schedulesResult.results || []) {
      const phasesResult = await this.db.prepare(
        'SELECT * FROM schedule_phases WHERE schedule_id = ? ORDER BY start_date ASC, created_at ASC'
      ).bind(scheduleRow.id).all<SchedulePhaseRow>();

      const phases: SchedulePhase[] = [];
      for (const phaseRow of phasesResult.results || []) {
        const entriesResult = await this.db.prepare(
          'SELECT * FROM schedule_entries WHERE phase_id = ? ORDER BY day_of_week, start_time_minutes'
        ).bind(phaseRow.id).all<ScheduleEntryRow>();

        phases.push(this.mapToSchedulePhase(phaseRow, entriesResult.results || []));
      }

      const sharesResult = await this.db.prepare(
        'SELECT user_id FROM schedule_shares WHERE schedule_id = ?'
      ).bind(scheduleRow.id).all<ScheduleShareRow>();

      schedules.push(this.mapToSchedule(
        scheduleRow,
        phases,
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

    // Get phases and their entries
    const phasesResult = await this.db.prepare(
      'SELECT * FROM schedule_phases WHERE schedule_id = ? ORDER BY start_date ASC, created_at ASC'
    ).bind(scheduleResult.id).all<SchedulePhaseRow>();

    const phases: SchedulePhase[] = [];
    for (const phaseRow of phasesResult.results || []) {
      const entriesResult = await this.db.prepare(
        'SELECT * FROM schedule_entries WHERE phase_id = ? ORDER BY day_of_week, start_time_minutes'
      ).bind(phaseRow.id).all<ScheduleEntryRow>();

      phases.push(this.mapToSchedulePhase(phaseRow, entriesResult.results || []));
    }

    // Get shared users
    const sharesResult = await this.db.prepare(
      'SELECT user_id FROM schedule_shares WHERE schedule_id = ?'
    ).bind(scheduleResult.id).all<ScheduleShareRow>();

    return this.mapToSchedule(
      scheduleResult,
      phases,
      sharesResult.results || []
    );
  }

  async create(schedule: Schedule): Promise<void> {
    console.log('[DEBUG] Creating new schedule:', schedule.id);
    
    // Prepare batch operations
    const batch = [];

    // Insert schedule
    batch.push(
      this.db.prepare(`
        INSERT INTO schedules (id, owner_id, name, timezone, ical_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        schedule.id,
        schedule.ownerId,
        schedule.name,
        schedule.timeZone,
        schedule.icalUrl
      )
    );

    // Insert phases and their entries
    for (const phase of schedule.phases) {
      // Insert phase
      batch.push(
        this.db.prepare(`
          INSERT INTO schedule_phases (id, schedule_id, name, start_date, end_date, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
          phase.id,
          phase.scheduleId,
          phase.name || null,
          phase.startDate || null,
          phase.endDate || null
        )
      );

      // Insert entries for this phase
      for (const entry of phase.entries) {
        const entryId = entry.id || crypto.randomUUID();
        batch.push(
          this.db.prepare(`
            INSERT INTO schedule_entries 
            (id, schedule_id, phase_id, name, day_of_week, start_time_minutes, duration_minutes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            entryId,
            schedule.id,
            phase.id,
            entry.name,
            entry.dayOfWeek,
            entry.startTimeMinutes,
            entry.durationMinutes
          )
        );
      }
    }

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
    console.log('[DEBUG] Executing create batch with', batch.length, 'operations');
    await this.db.batch(batch);
  }

  async update(schedule: Schedule): Promise<void> {
    console.log('[DEBUG] Updating existing schedule:', schedule.id);
    
    // Update schedule metadata only - phases will be handled separately
    const batch = [];

    // Update schedule metadata
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

    // Handle phase updates
    await this.updatePhasesAndEntries(schedule, batch);


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
    console.log('[DEBUG] Executing update batch with', batch.length, 'operations');
    await this.db.batch(batch);
  }

  private async updatePhasesAndEntries(schedule: Schedule, batch: any[]): Promise<void> {
    // Get existing phases
    const existingPhases = await this.db.prepare(
      'SELECT id FROM schedule_phases WHERE schedule_id = ?'
    ).bind(schedule.id).all<{id: string}>();
    
    const existingPhaseIds = new Set(existingPhases.results?.map(row => row.id) || []);
    const newPhaseIds = new Set<string>();

    // Process each phase
    for (const phase of schedule.phases) {
      newPhaseIds.add(phase.id);
      
      if (existingPhaseIds.has(phase.id)) {
        // Update existing phase
        batch.push(
          this.db.prepare(`
            UPDATE schedule_phases 
            SET name = ?, start_date = ?, end_date = ?
            WHERE id = ?
          `).bind(
            phase.name || null,
            phase.startDate || null,
            phase.endDate || null,
            phase.id
          )
        );
      } else {
        // Insert new phase
        batch.push(
          this.db.prepare(`
            INSERT INTO schedule_phases (id, schedule_id, name, start_date, end_date, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).bind(
            phase.id,
            phase.scheduleId,
            phase.name || null,
            phase.startDate || null,
            phase.endDate || null
          )
        );
      }

      // Handle entries for this phase
      await this.updateEntriesForPhase(phase, batch);
    }

    // Delete phases that are no longer in the schedule
    for (const existingPhaseId of existingPhaseIds) {
      if (!newPhaseIds.has(existingPhaseId)) {
        console.log('[DEBUG] Deleting phase:', existingPhaseId);
        batch.push(
          this.db.prepare('DELETE FROM schedule_phases WHERE id = ?').bind(existingPhaseId)
        );
      }
    }
  }

  private async updateEntriesForPhase(phase: SchedulePhase, batch: any[]): Promise<void> {
    // Get existing entries for this phase
    const existingEntries = await this.db.prepare(
      'SELECT id FROM schedule_entries WHERE phase_id = ?'
    ).bind(phase.id).all<{id: string}>();
    
    const existingIds = new Set(existingEntries.results?.map(row => row.id) || []);
    const newIds = new Set<string>();

    // Process each entry in the phase
    for (const entry of phase.entries) {
      const entryId = entry.id || crypto.randomUUID();
      newIds.add(entryId);
      
      if (existingIds.has(entryId)) {
        // Update existing entry
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
        batch.push(
          this.db.prepare(`
            INSERT INTO schedule_entries 
            (id, schedule_id, phase_id, name, day_of_week, start_time_minutes, duration_minutes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            entryId,
            phase.scheduleId,
            phase.id,
            entry.name,
            entry.dayOfWeek,
            entry.startTimeMinutes,
            entry.durationMinutes
          )
        );
      }
    }

    // Delete entries that are no longer in this phase
    for (const existingId of existingIds) {
      if (!newIds.has(existingId)) {
        // Check if this entry is referenced by overrides before deleting
        const overrideCount = await this.db.prepare(
          'SELECT COUNT(*) as count FROM schedule_overrides WHERE base_entry_id = ?'
        ).bind(existingId).first<{count: number}>();
        
        if (!overrideCount || overrideCount.count === 0) {
          batch.push(
            this.db.prepare('DELETE FROM schedule_entries WHERE id = ?').bind(existingId)
          );
        }
      }
    }
  }

  async delete(id: string): Promise<void> {
    // Foreign key constraints will handle cascade deletes
    await this.db.prepare('DELETE FROM schedules WHERE id = ?').bind(id).run();
  }

  private mapToSchedule(
    scheduleRow: ScheduleRow,
    phases: SchedulePhase[],
    shareRows: ScheduleShareRow[]
  ): Schedule {
    const sharedUserIds = shareRows.map(row => row.user_id);

    return new Schedule({
      id: scheduleRow.id,
      ownerId: scheduleRow.owner_id,
      name: scheduleRow.name,
      timeZone: scheduleRow.timezone,
      icalUrl: scheduleRow.ical_url,
      sharedUserIds,
      phases,
    });
  }

  private mapToSchedulePhase(
    phaseRow: SchedulePhaseRow,
    entryRows: ScheduleEntryRow[]
  ): SchedulePhase {
    const entries = entryRows.map(row => new ScheduleEntry({
      id: row.id,
      name: row.name,
      dayOfWeek: row.day_of_week,
      startTimeMinutes: row.start_time_minutes,
      durationMinutes: row.duration_minutes,
    }));

    return new SchedulePhase({
      id: phaseRow.id,
      scheduleId: phaseRow.schedule_id,
      name: phaseRow.name || undefined,
      startDate: phaseRow.start_date || undefined,
      endDate: phaseRow.end_date || undefined,
      entries,
    });
  }
}