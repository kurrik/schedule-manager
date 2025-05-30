-- Clear all test data from database tables
-- Clear tables in reverse dependency order to avoid foreign key conflicts

DELETE FROM schedule_overrides;
DELETE FROM schedule_entries;
DELETE FROM schedule_shares;
DELETE FROM schedules;
DELETE FROM users;