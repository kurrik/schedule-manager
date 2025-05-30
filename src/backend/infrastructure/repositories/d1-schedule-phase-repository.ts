import type { D1Database } from '@cloudflare/workers-types';
import { SchedulePhase } from '../../domain/models/schedule-phase';
import { ScheduleEntry } from '../../domain/models/schedule-entry';
import type { ISchedulePhaseRepository } from '../../domain/repositories';

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

export class D1SchedulePhaseRepository implements ISchedulePhaseRepository {
  private readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async findById(id: string): Promise<SchedulePhase | null> {
    // Get phase
    const phaseResult = await this.db.prepare(
      'SELECT * FROM schedule_phases WHERE id = ?'
    ).bind(id).first<SchedulePhaseRow>();

    if (!phaseResult) {
      return null;
    }

    // Get entries for this phase
    const entriesResult = await this.db.prepare(
      'SELECT * FROM schedule_entries WHERE phase_id = ? ORDER BY day_of_week, start_time_minutes'
    ).bind(id).all<ScheduleEntryRow>();

    return this.mapToSchedulePhase(phaseResult, entriesResult.results || []);
  }

  async findByScheduleId(scheduleId: string): Promise<SchedulePhase[]> {
    // Get all phases for this schedule
    const phasesResult = await this.db.prepare(
      'SELECT * FROM schedule_phases WHERE schedule_id = ? ORDER BY start_date ASC, created_at ASC'
    ).bind(scheduleId).all<SchedulePhaseRow>();

    const phases: SchedulePhase[] = [];

    // For each phase, get its entries
    for (const phaseRow of phasesResult.results || []) {
      const entriesResult = await this.db.prepare(
        'SELECT * FROM schedule_entries WHERE phase_id = ? ORDER BY day_of_week, start_time_minutes'
      ).bind(phaseRow.id).all<ScheduleEntryRow>();

      phases.push(this.mapToSchedulePhase(phaseRow, entriesResult.results || []));
    }

    return phases;
  }

  async create(phase: SchedulePhase): Promise<void> {
    console.log('[DEBUG] Creating new schedule phase:', phase.id);
    
    // Prepare batch operations
    const batch = [];

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

    // Insert entries
    for (const entry of phase.entries) {
      const entryId = entry.id || crypto.randomUUID();
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

    // Execute all operations
    console.log('[DEBUG] Executing create batch with', batch.length, 'operations');
    await this.db.batch(batch);
  }

  async update(phase: SchedulePhase): Promise<void> {
    console.log('[DEBUG] Updating existing schedule phase:', phase.id);
    
    // Get existing entry IDs to know which ones to delete later
    const existingEntries = await this.db.prepare(
      'SELECT id FROM schedule_entries WHERE phase_id = ?'
    ).bind(phase.id).all<{id: string}>();
    
    const existingIds = new Set(existingEntries.results?.map(row => row.id) || []);
    const newIds = new Set<string>();
    
    console.log('[DEBUG] Existing entries:', Array.from(existingIds));
    console.log('[DEBUG] Phase entries to save:', phase.entries.map(e => ({ id: e.id, name: e.name })));

    // Prepare batch operations
    const batch = [];

    // Update phase metadata
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

    // Insert or update entries (preserving IDs to maintain override references)
    for (const entry of phase.entries) {
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
    
    console.log('[DEBUG] New entry IDs:', Array.from(newIds));

    // For entries that are no longer in the phase, check if they're referenced by overrides
    for (const existingId of existingIds) {
      if (!newIds.has(existingId)) {
        console.log('[DEBUG] Entry no longer in phase:', existingId);
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

    // Execute all operations
    console.log('[DEBUG] Executing update batch with', batch.length, 'operations');
    await this.db.batch(batch);
  }

  async delete(id: string): Promise<void> {
    // Foreign key constraints will handle cascade deletes for entries
    await this.db.prepare('DELETE FROM schedule_phases WHERE id = ?').bind(id).run();
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