-- ============================================================================
-- Migration: Paycut Leave & Quota Warning Support
-- File: src/config/paycut_leave_migration.sql
-- ============================================================================

ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_type_id UUID REFERENCES leave_types(id) ON DELETE SET NULL;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS requested_units NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS is_paycut_leave BOOLEAN DEFAULT false;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS paycut_units NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS quota_warning_message TEXT;
