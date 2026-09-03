-- ============================================================================
-- Migration: Configuration Management (Teams, Leave Types, Entitlements)
-- File: src/config/configuration_management_migration.sql
-- ============================================================================

-- 1. Update teams table to add is_active column if it does not exist
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Create leave_types table if it does not exist
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    unit VARCHAR(50) NOT NULL CHECK (unit IN ('days', 'hours')),
    default_quota NUMERIC(5, 2) DEFAULT 0,
    requires_substitute BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial leave types if missing
INSERT INTO leave_types (id, name, code, unit, default_quota, requires_substitute, is_active)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'Annual Leave', 'ANNUAL', 'days', 14.00, true, true),
    ('e0000000-0000-0000-0000-000000000002', 'Sick Leave', 'SICK', 'days', 7.00, false, true),
    ('e0000000-0000-0000-0000-000000000003', 'Casual Leave', 'CASUAL', 'days', 5.00, true, true),
    ('e0000000-0000-0000-0000-000000000004', 'Emergency Leave', 'EMERGENCY', 'days', 3.00, false, true),
    ('e0000000-0000-0000-0000-000000000005', 'Half Day Leave', 'HALF_DAY', 'days', 5.00, true, true),
    ('e0000000-0000-0000-0000-000000000006', 'Time Permission', 'TIME_PERMISSION', 'hours', 12.00, false, true)
ON CONFLICT (code) DO NOTHING;

-- 3. Create employee_leave_entitlements table if it does not exist
CREATE TABLE IF NOT EXISTS employee_leave_entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    allocated NUMERIC(5, 2) DEFAULT 0,
    used NUMERIC(5, 2) DEFAULT 0,
    remaining NUMERIC(5, 2) DEFAULT 0,
    year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_leave_type_year UNIQUE (employee_id, leave_type_id, year)
);

-- 4. Create entitlements for existing users for active leave types
INSERT INTO employee_leave_entitlements (employee_id, leave_type_id, allocated, used, remaining, year)
SELECT 
    u.id AS employee_id,
    lt.id AS leave_type_id,
    lt.default_quota AS allocated,
    0.00 AS used,
    lt.default_quota AS remaining,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER AS year
FROM users u
CROSS JOIN leave_types lt
WHERE lt.is_active = true 
  AND (u.role = 'employee' OR u.role = 'team_admin' OR u.role = 'admin')
ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
