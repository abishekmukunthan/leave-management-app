-- Seed Data for Leave Management System
-- Use explicit UUIDs to maintain referential integrity across seed records

-- Clear existing data if re-running seeds (reverse foreign key order)
DELETE FROM leave_balances;
DELETE FROM substitute_requests;
DELETE FROM leave_requests;
DELETE FROM employee_profiles;
UPDATE teams SET team_admin_id = NULL;
DELETE FROM users;
DELETE FROM teams;

-- 1. Insert Teams (Engineering, Sales, Marketing, HR)
INSERT INTO teams (id, name, created_at, updated_at)
VALUES 
    ('d0000000-0000-0000-0000-000000000001', 'Engineering', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d0000000-0000-0000-0000-000000000002', 'Sales', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d0000000-0000-0000-0000-000000000003', 'Marketing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d0000000-0000-0000-0000-000000000004', 'HR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. Insert Users (1 Team Admin, 3 Employees, 1 Superior Admin)
-- Passwords are encrypted with bcrypt (hash corresponds to 'password123')
INSERT INTO users (id, name, email, password, role, team_id, created_at, updated_at)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'Priya Fernando',
        'priya.fernando@company.com',
        '$2a$10$CwTycUXWue0Thq9StjUM0uJ0mP.g2CqJ6uO9J5j/0ZqXW8jJjUfGy',
        'team_admin',
        'd0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'Alex Morgan',
        'alex.morgan@company.com',
        '$2a$10$CwTycUXWue0Thq9StjUM0uJ0mP.g2CqJ6uO9J5j/0ZqXW8jJjUfGy',
        'employee',
        'd0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'Michael Chen',
        'michael.chen@company.com',
        '$2a$10$CwTycUXWue0Thq9StjUM0uJ0mP.g2CqJ6uO9J5j/0ZqXW8jJjUfGy',
        'employee',
        'd0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        'Sarah Johnson',
        'sarah.johnson@company.com',
        '$2a$10$CwTycUXWue0Thq9StjUM0uJ0mP.g2CqJ6uO9J5j/0ZqXW8jJjUfGy',
        'employee',
        'd0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'a0000000-0000-0000-0000-000000000005',
        'Nadia Perera',
        'nadia.perera@company.com',
        '$2a$10$CwTycUXWue0Thq9StjUM0uJ0mP.g2CqJ6uO9J5j/0ZqXW8jJjUfGy',
        'superior_admin',
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- Set team_admin_id for Engineering to Priya Fernando
UPDATE teams 
SET team_admin_id = 'a0000000-0000-0000-0000-000000000001', updated_at = CURRENT_TIMESTAMP 
WHERE id = 'd0000000-0000-0000-0000-000000000001';

-- 3. Insert Employee Profiles for all users
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
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'EMP-1001',
        '+1 (555) 100-2001',
        'Engineering Lead & Manager',
        'Engineering',
        'Core Platform',
        NULL,
        '2020-01-15',
        'Full-time / Permanent',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000002',
        'EMP-2024-8842',
        '+1 (555) 234-5678',
        'Senior Frontend Engineer',
        'Engineering',
        'Web Experience',
        'a0000000-0000-0000-0000-000000000001',
        '2022-03-15',
        'Full-time / Permanent',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'b0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000003',
        'EMP-2024-8843',
        '+1 (555) 345-6789',
        'Fullstack Developer',
        'Engineering',
        'Core Platform',
        'a0000000-0000-0000-0000-000000000001',
        '2022-08-01',
        'Full-time / Permanent',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'b0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000004',
        'EMP-2024-8844',
        '+1 (555) 456-7890',
        'Sales Representative',
        'Sales',
        'Enterprise Sales',
        NULL,
        '2023-02-10',
        'Full-time / Permanent',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
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
    );

-- 4. Insert Leave Balances for Employees
INSERT INTO leave_balances (
    id,
    employee_id,
    annual_leave_balance,
    sick_leave_balance,
    casual_leave_balance,
    time_permission_balance,
    used_leave_count,
    remaining_leave_count,
    updated_at
)
VALUES
    (
        'c0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        15.00,
        10.00,
        6.00,
        6.00,
        0.00,
        31.00,
        CURRENT_TIMESTAMP
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000002',
        12.00,
        8.00,
        4.00,
        4.00,
        7.00,
        24.00,
        CURRENT_TIMESTAMP
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000003',
        14.00,
        10.00,
        5.00,
        6.00,
        2.00,
        29.00,
        CURRENT_TIMESTAMP
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000004',
        10.00,
        7.00,
        3.00,
        5.00,
        8.00,
        20.00,
        CURRENT_TIMESTAMP
    );
