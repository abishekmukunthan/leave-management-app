-- ============================================================================
-- Migration: Time Permission Time Range (From Time & To Time)
-- File: src/config/time_permission_time_range_migration.sql
-- ============================================================================

-- 1. Drop restrictive check constraint on permission_hours to allow calculated durations (e.g. 0.5, 1.5, 2.0)
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_permission_hours_check;

-- 2. Add From and To time columns (nullable for backward compatibility with historical records)
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS permission_from_time TIME;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS permission_to_time TIME;
