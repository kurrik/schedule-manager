-- Schedule Manager D1 Database Schema

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  profile_image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Schedules table  
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

-- Schedule sharing (many-to-many)
CREATE TABLE schedule_shares (
  schedule_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (schedule_id, user_id),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Recurring schedule entries
CREATE TABLE schedule_entries (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time_minutes INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);

-- Override system (ready for future expansion)
CREATE TABLE schedule_overrides (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  override_date DATE NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN ('MODIFY', 'SKIP', 'ONE_TIME')),
  base_entry_id TEXT, -- For MODIFY/SKIP (references schedule_entries.id)
  override_data JSON, -- Flexible override details
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (base_entry_id) REFERENCES schedule_entries(id)
);

-- Performance indexes
CREATE INDEX idx_schedules_owner_id ON schedules(owner_id);
CREATE INDEX idx_schedule_shares_user_id ON schedule_shares(user_id);
CREATE INDEX idx_schedule_entries_schedule_id ON schedule_entries(schedule_id);
CREATE INDEX idx_schedule_overrides_schedule_date ON schedule_overrides(schedule_id, override_date);
CREATE INDEX idx_schedules_ical_url ON schedules(ical_url);