-- Migration number: 0001 	 2025-05-30T00:40:15.114Z
-- Schedule Phases Migration - Production Safe Implementation

-- Enable deferred foreign key constraints
PRAGMA defer_foreign_keys = true;

-- Step 1: Create schedule_phases table
CREATE TABLE IF NOT EXISTS schedule_phases (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  name TEXT,
  start_date DATE,
  end_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);

-- Step 2: Create default phases for existing schedules
INSERT OR IGNORE INTO schedule_phases (id, schedule_id, name, start_date, end_date, created_at)
SELECT 
  'default-' || id as id,
  id as schedule_id, 
  'Default Phase' as name,
  NULL as start_date,
  NULL as end_date,
  CURRENT_TIMESTAMP as created_at
FROM schedules;

-- Step 3: Create new schedule_entries table with phase support
CREATE TABLE IF NOT EXISTS schedule_entries_with_phases (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time_minutes INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (phase_id) REFERENCES schedule_phases(id) ON DELETE CASCADE
);

-- Step 4: Migrate existing entries to new table with phase references
INSERT OR IGNORE INTO schedule_entries_with_phases 
SELECT 
  se.id,
  se.schedule_id,
  'default-' || se.schedule_id as phase_id,
  se.name,
  se.day_of_week,
  se.start_time_minutes,
  se.duration_minutes,
  se.created_at
FROM schedule_entries se;

-- Step 5: Replace old table with new one
ALTER TABLE schedule_entries RENAME TO schedule_entries_backup;
ALTER TABLE schedule_entries_with_phases RENAME TO schedule_entries;

-- Step 6: Update schedule_overrides table to support phases
CREATE TABLE IF NOT EXISTS schedule_overrides_with_phases (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  override_date DATE NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN ('MODIFY', 'SKIP', 'ONE_TIME')),
  base_entry_id TEXT,
  override_data JSON,
  phase_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (base_entry_id) REFERENCES schedule_entries(id),
  FOREIGN KEY (phase_id) REFERENCES schedule_phases(id)
);

-- Migrate existing overrides
INSERT OR IGNORE INTO schedule_overrides_with_phases 
SELECT 
  id,
  schedule_id,
  override_date,
  override_type,
  base_entry_id,
  override_data,
  NULL as phase_id,
  created_at
FROM schedule_overrides;

-- Replace overrides table
ALTER TABLE schedule_overrides RENAME TO schedule_overrides_backup;
ALTER TABLE schedule_overrides_with_phases RENAME TO schedule_overrides;

-- Step 7: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_schedule_phases_schedule_id ON schedule_phases(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_phases_dates ON schedule_phases(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_phase_id ON schedule_entries(phase_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_schedule_id ON schedule_entries(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_schedule_date ON schedule_overrides(schedule_id, override_date);

-- Step 8: Optimize database
PRAGMA optimize;

-- Re-enable foreign key constraints
PRAGMA defer_foreign_keys = false;