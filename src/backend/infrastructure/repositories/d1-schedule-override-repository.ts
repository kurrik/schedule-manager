import type { D1Database } from '@cloudflare/workers-types';
import { ScheduleOverride, type OverrideType } from '../../domain/models/schedule-override';
import type { IScheduleOverrideRepository } from '../../domain/repositories';

interface ScheduleOverrideRow {
  id: string;
  schedule_id: string;
  override_date: string;
  override_type: OverrideType;
  base_entry_id: string | null;
  override_data: string | null; // JSON string
  created_at: string;
}

export class D1ScheduleOverrideRepository implements IScheduleOverrideRepository {
  private readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async findById(id: string): Promise<ScheduleOverride | null> {
    const result = await this.db.prepare(
      'SELECT * FROM schedule_overrides WHERE id = ?'
    ).bind(id).first<ScheduleOverrideRow>();

    return result ? this.mapToOverride(result) : null;
  }

  async findByScheduleId(scheduleId: string): Promise<ScheduleOverride[]> {
    const results = await this.db.prepare(
      'SELECT * FROM schedule_overrides WHERE schedule_id = ? ORDER BY override_date'
    ).bind(scheduleId).all<ScheduleOverrideRow>();

    return (results.results || []).map(row => this.mapToOverride(row));
  }

  async findByScheduleIdAndDateRange(
    scheduleId: string, 
    startDate: string, 
    endDate: string
  ): Promise<ScheduleOverride[]> {
    const results = await this.db.prepare(`
      SELECT * FROM schedule_overrides 
      WHERE schedule_id = ? 
        AND override_date >= ? 
        AND override_date <= ?
      ORDER BY override_date
    `).bind(scheduleId, startDate, endDate).all<ScheduleOverrideRow>();

    return (results.results || []).map(row => this.mapToOverride(row));
  }

  async save(override: ScheduleOverride): Promise<void> {
    const overrideDataJson = override.overrideData ? JSON.stringify(override.overrideData) : null;

    await this.db.prepare(`
      INSERT OR REPLACE INTO schedule_overrides 
      (id, schedule_id, override_date, override_type, base_entry_id, override_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      override.id,
      override.scheduleId,
      override.overrideDate,
      override.overrideType,
      override.baseEntryId || null,
      overrideDataJson
    ).run();
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM schedule_overrides WHERE id = ?').bind(id).run();
  }

  private mapToOverride(row: ScheduleOverrideRow): ScheduleOverride {
    const overrideData = row.override_data ? JSON.parse(row.override_data) : undefined;

    return new ScheduleOverride({
      id: row.id,
      scheduleId: row.schedule_id,
      overrideDate: row.override_date,
      overrideType: row.override_type,
      baseEntryId: row.base_entry_id || undefined,
      overrideData,
    });
  }
}