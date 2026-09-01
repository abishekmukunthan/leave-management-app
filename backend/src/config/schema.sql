-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if needed in reverse dependency order
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS substitute_requests CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS employee_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('employee', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Employee Profiles Table
CREATE TABLE employee_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    designation VARCHAR(100),
    department VARCHAR(100),
    team VARCHAR(100),
    reporting_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date_of_joining DATE,
    employment_type VARCHAR(100),
    profile_picture TEXT,
    account_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Leave Requests Table
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN (
        'Annual Leave',
        'Sick Leave',
        'Casual Leave',
        'Emergency Leave',
        'Half Day Leave',
        'Time Permission'
    )),
    start_date DATE,
    end_date DATE,
    permission_date DATE,
    permission_hours VARCHAR(50) CHECK (
        permission_hours IS NULL OR
        permission_hours IN ('1 hour', '2 hours', '3 hours')
    ),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Waiting for Substitute Approval' CHECK (status IN (
        'Waiting for Substitute Approval',
        'Waiting for Admin Approval',
        'Approved',
        'Rejected'
    )),
    admin_remarks TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Substitute Requests Table
CREATE TABLE substitute_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    substitute_employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_work TEXT NOT NULL,
    substitute_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (substitute_status IN (
        'Waiting for Substitute Approval',
        'Pending',
        'Accepted',
        'Rejected'
    )),
    substitute_remarks TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Leave Balances Table
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    annual_leave_balance NUMERIC(5, 2) DEFAULT 0,
    sick_leave_balance NUMERIC(5, 2) DEFAULT 0,
    casual_leave_balance NUMERIC(5, 2) DEFAULT 0,
    time_permission_balance NUMERIC(5, 2) DEFAULT 0,
    used_leave_count NUMERIC(5, 2) DEFAULT 0,
    remaining_leave_count NUMERIC(5, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
