-- Migration number: 0002 	 2025-05-30T01:30:00.000Z
-- Cleanup backup tables from phase migration

-- Defer foreign key constraint checking
PRAGMA defer_foreign_keys = true;

-- Clear data from backup tables first
DELETE FROM schedule_entries_backup;
DELETE FROM schedule_overrides_backup;

-- Now drop the empty backup tables
DROP TABLE IF EXISTS schedule_entries_backup;
DROP TABLE IF EXISTS schedule_overrides_backup;

-- Re-enable foreign key constraint checking
PRAGMA defer_foreign_keys = false;

-- Optimize database after cleanup
PRAGMA optimize;