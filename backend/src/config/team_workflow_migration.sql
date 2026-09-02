-- ============================================================================
-- Migration: Team-Based Workflow & Superior Admin Monitoring
-- File: src/config/team_workflow_migration.sql
-- ============================================================================

-- 1. Create teams table if it does not exist
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    team_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add team_id to users if it does not exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 3. Update role CHECK constraint in users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('employee', 'admin', 'team_admin', 'superior_admin'));

-- 4. Insert Demo Teams (Engineering, Sales, Marketing, HR)
INSERT INTO teams (id, name, created_at, updated_at)
VALUES 
    ('d0000000-0000-0000-0000-000000000001', 'Engineering', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d0000000-0000-0000-0000-000000000002', 'Sales', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d0000000-0000-0000-0000-000000000003', 'Marketing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d0000000-0000-0000-0000-000000000004', 'HR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;

-- 5. Update existing users with team assignments and new roles
-- Priya Fernando: team_admin in Engineering
UPDATE users 
SET role = 'team_admin', 
    team_id = 'd0000000-0000-0000-0000-000000000001', 
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'a0000000-0000-0000-0000-000000000001' OR email = 'priya.fernando@company.com';

-- Alex Morgan: employee in Engineering
UPDATE users 
SET role = 'employee', 
    team_id = 'd0000000-0000-0000-0000-000000000001', 
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'a0000000-0000-0000-0000-000000000002' OR email = 'alex.morgan@company.com';

-- Michael Chen: employee in Engineering
UPDATE users 
SET role = 'employee', 
    team_id = 'd0000000-0000-0000-0000-000000000001', 
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'a0000000-0000-0000-0000-000000000003' OR email = 'michael.chen@company.com';

-- Sarah Johnson: employee in Sales
UPDATE users 
SET role = 'employee', 
    team_id = 'd0000000-0000-0000-0000-000000000002', 
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'a0000000-0000-0000-0000-000000000004' OR email = 'sarah.johnson@company.com';

-- 6. Insert or update Superior Admin: Nadia Perera
INSERT INTO users (id, name, email, password, role, team_id, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000005',
    'Nadia Perera',
    'nadia.perera@company.com',
    '$2a$10$CwTycUXWue0Thq9StjUM0uJ0mP.g2CqJ6uO9J5j/0ZqXW8jJjUfGy',
    'superior_admin',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE 
SET role = 'superior_admin', name = 'Nadia Perera', updated_at = CURRENT_TIMESTAMP;

-- Insert employee profile for Nadia Perera if not existing
INSERT INTO employee_profiles (
    id,
    user_id,
    employee_id,
    phone_number,
    designation,
    department,
    team,
    reporting_manager_id,
    date_of_joining,
    employment_type,
    profile_picture,
    account_status,
    created_at,
    updated_at
)
VALUES (
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000005',
    'EMP-1000',
    '+1 (555) 100-9999',
    'Head of Operations & Superior Admin',
    'Executive Management',
    'Executive',
    NULL,
    '2019-01-01',
    'Full-time / Permanent',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (employee_id) DO NOTHING;

-- 7. Set Engineering team_admin_id to Priya Fernando
UPDATE teams 
SET team_admin_id = 'a0000000-0000-0000-0000-000000000001', 
    updated_at = CURRENT_TIMESTAMP 
WHERE name = 'Engineering';
