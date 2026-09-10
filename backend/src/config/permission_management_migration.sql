-- ============================================================================
-- Migration: Configurable Permission-Based Leave Approval System
-- File: backend/src/config/permission_management_migration.sql
-- ============================================================================

-- Ensure uuid extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(150) PRIMARY KEY,
    description TEXT NOT NULL,
    permission_type VARCHAR(100) DEFAULT 'LEAVE_APPROVAL',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id VARCHAR(150) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, permission_id)
);

-- 3. Create team_approval_permissions table
CREATE TABLE IF NOT EXISTS team_approval_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    permission_id VARCHAR(150) NOT NULL REFERENCES permissions(id) ON DELETE RESTRICT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id)
);

-- Helper function to generate standardized permission ID from team name
CREATE OR REPLACE FUNCTION generate_team_permission_id(t_name TEXT) RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
BEGIN
    cleaned := TRIM(BOTH '_' FROM regexp_replace(UPPER(t_name), '[^A-Z0-9]+', '_', 'g'));
    IF cleaned LIKE '%_TEAM' OR cleaned = 'TEAM' THEN
        RETURN cleaned || '_LEAVE_APPROVAL_PERMISSION';
    ELSE
        RETURN cleaned || '_TEAM_LEAVE_APPROVAL_PERMISSION';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Seed/Migrate permissions for all existing teams
DO $$
DECLARE
    t RECORD;
    perm_id TEXT;
    perm_desc TEXT;
    superior_admin_id UUID;
    priya_id UUID;
    alex_id UUID;
BEGIN
    -- Ensure Alex Morgan is explicitly role 'employee' (not team_admin)
    UPDATE users 
    SET role = 'employee' 
    WHERE email = 'alex.morgan@company.com' OR id = 'a0000000-0000-0000-0000-000000000002';

    -- Ensure Priya Fernando is explicitly role 'team_admin'
    UPDATE users 
    SET role = 'team_admin' 
    WHERE email = 'priya.fernando@company.com' OR id = 'a0000000-0000-0000-0000-000000000001';

    -- Ensure Engineering team lead is Priya Fernando
    UPDATE teams 
    SET team_admin_id = (
        SELECT id FROM users 
        WHERE email = 'priya.fernando@company.com' OR id = 'a0000000-0000-0000-0000-000000000001' 
        LIMIT 1
    )
    WHERE name = 'Engineering';

    -- Find superior admin (Nadia Perera or first superior_admin)
    SELECT id INTO superior_admin_id FROM users WHERE role = 'superior_admin' LIMIT 1;
    IF superior_admin_id IS NULL THEN
        SELECT id INTO superior_admin_id FROM users WHERE id = 'a0000000-0000-0000-0000-000000000005';
    END IF;

    -- Find Priya Fernando
    SELECT id INTO priya_id FROM users WHERE email = 'priya.fernando@company.com' OR id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1;

    -- Find Alex Morgan
    SELECT id INTO alex_id FROM users WHERE email = 'alex.morgan@company.com' OR id = 'a0000000-0000-0000-0000-000000000002' LIMIT 1;

    -- Iterate through each team
    FOR t IN SELECT id, name, team_admin_id FROM teams LOOP
        perm_id := generate_team_permission_id(t.name);
        perm_desc := 'Permission for approving ' || TRIM(t.name) || ' team leave';

        -- Insert into permissions table if not exists
        INSERT INTO permissions (id, description, permission_type, is_active, created_at, updated_at)
        VALUES (perm_id, perm_desc, 'LEAVE_APPROVAL', true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE 
        SET description = EXCLUDED.description, is_active = true, updated_at = NOW();

        -- Insert into team_approval_permissions mapping
        INSERT INTO team_approval_permissions (team_id, permission_id, created_by, created_at, updated_at)
        VALUES (t.id, perm_id, superior_admin_id, NOW(), NOW())
        ON CONFLICT (team_id) DO UPDATE
        SET permission_id = EXCLUDED.permission_id, updated_at = NOW();

        -- If superior admin exists, assign this team permission to superior admin
        IF superior_admin_id IS NOT NULL THEN
            INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
            VALUES (superior_admin_id, perm_id, superior_admin_id, NOW())
            ON CONFLICT (user_id, permission_id) DO NOTHING;
        END IF;

        -- If team has team_admin_id and that user is not a normal employee, assign permission to that admin
        IF t.team_admin_id IS NOT NULL THEN
            INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
            SELECT t.team_admin_id, perm_id, superior_admin_id, NOW()
            FROM users u
            WHERE u.id = t.team_admin_id 
              AND u.role IN ('team_admin', 'admin')
              AND u.role != 'employee'
              AND u.id != COALESCE(alex_id, '00000000-0000-0000-0000-000000000000'::uuid)
            ON CONFLICT (user_id, permission_id) DO NOTHING;
        END IF;
    END LOOP;

    -- Ensure Priya Fernando has Engineering leave approval permission specifically
    IF priya_id IS NOT NULL THEN
        INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
        VALUES (priya_id, 'ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION', superior_admin_id, NOW())
        ON CONFLICT (user_id, permission_id) DO NOTHING;
    END IF;

    -- Also check any users with role 'team_admin' / 'admin' and team_id set, grant their team's permission
    -- Never grant to normal employees or Alex Morgan
    FOR t IN 
        SELECT u.id AS admin_user_id, tap.permission_id 
        FROM users u 
        JOIN team_approval_permissions tap ON u.team_id = tap.team_id 
        WHERE u.role IN ('team_admin', 'admin')
          AND u.role != 'employee'
          AND u.id != COALESCE(alex_id, '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
        INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
        VALUES (t.admin_user_id, t.permission_id, superior_admin_id, NOW())
        ON CONFLICT (user_id, permission_id) DO NOTHING;
    END LOOP;

    -- Remove any permissions mistakenly assigned to normal employees or Alex Morgan
    DELETE FROM user_permissions 
    WHERE user_id IN (
        SELECT id FROM users WHERE role = 'employee' OR email = 'alex.morgan@company.com' OR id = 'a0000000-0000-0000-0000-000000000002'
    );
END $$;
