-- Schedule Phases Migration Script
-- This script updates the database schema to support Schedule Phases

-- Step 1: Create schedule_phases table
CREATE TABLE schedule_phases (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  name TEXT, -- Optional phase name (e.g., "Summer Schedule")
  start_date DATE, -- NULL = infinite past
  end_date DATE,   -- NULL = infinite future
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);

-- Step 2: Add phase_id column to schedule_entries (initially nullable for migration)
ALTER TABLE schedule_entries ADD COLUMN phase_id TEXT;

-- Step 3: Create default phases for all existing schedules
INSERT INTO schedule_phases (id, schedule_id, name, start_date, end_date, created_at)
SELECT 
  'default-' || id as id,
  id as schedule_id, 
  'Default Phase' as name,
  NULL as start_date,
  NULL as end_date,
  CURRENT_TIMESTAMP as created_at
FROM schedules;

-- Step 4: Update all existing schedule_entries to reference their default phase
UPDATE schedule_entries 
SET phase_id = 'default-' || schedule_id
WHERE phase_id IS NULL;

-- Step 5: Add foreign key constraint for phase_id (now that all entries have phases)
-- Note: SQLite doesn't support adding foreign key constraints to existing tables
-- So we'll recreate the table with the constraint

-- Create new schedule_entries table with phase_id constraint
CREATE TABLE schedule_entries_new (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL, -- Keep for backwards compatibility queries
  phase_id TEXT NOT NULL,    -- New primary relationship
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time_minutes INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (phase_id) REFERENCES schedule_phases(id) ON DELETE CASCADE
);

-- Copy data from old table to new table
INSERT INTO schedule_entries_new 
SELECT id, schedule_id, phase_id, name, day_of_week, start_time_minutes, duration_minutes, created_at
FROM schedule_entries;

-- Drop old table and rename new table
DROP TABLE schedule_entries;
ALTER TABLE schedule_entries_new RENAME TO schedule_entries;

-- Step 6: Update schedule_overrides to handle both schedule_id and phase references
-- Add phase_id column for future phase-specific overrides
ALTER TABLE schedule_overrides ADD COLUMN phase_id TEXT;

-- Add foreign key constraint for phase_id in overrides (optional, for future use)
-- For now, keep existing behavior where overrides reference schedule_id

-- Step 7: Create performance indexes for phases
CREATE INDEX idx_schedule_phases_schedule_id ON schedule_phases(schedule_id);
CREATE INDEX idx_schedule_phases_dates ON schedule_phases(start_date, end_date);
CREATE INDEX idx_schedule_entries_phase_id ON schedule_entries(phase_id);

-- Step 8: Recreate existing indexes for schedule_entries
CREATE INDEX idx_schedule_entries_schedule_id ON schedule_entries(schedule_id);