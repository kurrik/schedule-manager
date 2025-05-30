-- Migration number: 0001 	 2025-05-30T21:45:06.674Z
-- Initial schema setup

-- Defer foreign key constraint checking
PRAGMA defer_foreign_keys = true;

-- Create tables
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  profile_image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  ical_url TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE schedule_shares (
  schedule_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (schedule_id, user_id),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_schedules_owner_id ON schedules(owner_id);
CREATE INDEX idx_schedule_shares_user_id ON schedule_shares(user_id);
CREATE INDEX idx_schedules_ical_url ON schedules(ical_url);

CREATE TABLE schedule_phases (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  name TEXT,
  start_date DATE,
  end_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);
CREATE INDEX idx_schedule_phases_schedule_id ON schedule_phases(schedule_id);
CREATE INDEX idx_schedule_phases_dates ON schedule_phases(start_date, end_date);

CREATE TABLE IF NOT EXISTS "schedule_entries" (
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

CREATE TABLE IF NOT EXISTS "schedule_overrides" (
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

-- Re-enable foreign key constraint checking
PRAGMA defer_foreign_keys = false;

-- Optimize database after cleanup
PRAGMA optimize;
