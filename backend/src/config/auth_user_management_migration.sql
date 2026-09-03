-- ============================================================================
-- Migration: Auth & User Management Support
-- File: src/config/auth_user_management_migration.sql
-- ============================================================================

-- 1. Add auth and user management columns to users table if they do not exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Update role CHECK constraint in users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('employee', 'admin', 'team_admin', 'superior_admin'));

-- 3. Update existing demo users with usernames, active status, and hashed passwords
-- Password for all demo users is: Password@123
-- Hash: $2b$10$glc/nu3a5pVhJPINaKhyKOmy4qHw/n664pt9OTZdKTOd56X/JdoJa

-- Priya Fernando (Team Admin)
UPDATE users 
SET username = 'priya.fernando',
    password = '$2b$10$glc/nu3a5pVhJPINaKhyKOmy4qHw/n664pt9OTZdKTOd56X/JdoJa',
    is_active = true,
    must_change_password = false,
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'priya.fernando@company.com' OR id = 'a0000000-0000-0000-0000-000000000001';

-- Alex Morgan (Employee)
UPDATE users 
SET username = 'alex.morgan',
    password = '$2b$10$glc/nu3a5pVhJPINaKhyKOmy4qHw/n664pt9OTZdKTOd56X/JdoJa',
    is_active = true,
    must_change_password = false,
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'alex.morgan@company.com' OR id = 'a0000000-0000-0000-0000-000000000002';

-- Michael Chen (Employee)
UPDATE users 
SET username = 'michael.chen',
    password = '$2b$10$glc/nu3a5pVhJPINaKhyKOmy4qHw/n664pt9OTZdKTOd56X/JdoJa',
    is_active = true,
    must_change_password = false,
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'michael.chen@company.com' OR id = 'a0000000-0000-0000-0000-000000000003';

-- Sarah Johnson (Employee)
UPDATE users 
SET username = 'sarah.johnson',
    password = '$2b$10$glc/nu3a5pVhJPINaKhyKOmy4qHw/n664pt9OTZdKTOd56X/JdoJa',
    is_active = true,
    must_change_password = false,
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'sarah.johnson@company.com' OR id = 'a0000000-0000-0000-0000-000000000004';

-- Nadia Perera (Superior Admin)
UPDATE users 
SET username = 'nadia.perera',
    password = '$2b$10$glc/nu3a5pVhJPINaKhyKOmy4qHw/n664pt9OTZdKTOd56X/JdoJa',
    is_active = true,
    must_change_password = false,
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'nadia.perera@company.com' OR id = 'a0000000-0000-0000-0000-000000000005';

-- Fallback for any other existing users without username
UPDATE users 
SET username = LOWER(SPLIT_PART(email, '@', 1)) 
WHERE username IS NULL OR username = '';

-- 4. Add unique constraint on username
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
