# Leave Management Web Application — Product Requirements Document (PRD)

## 1. Overview & Purpose

The **Leave Management Web Application** is a modern, enterprise-grade SaaS web portal built to streamline leave management, substitute handover, team availability tracking, and executive oversight for organizations.

### Problem Statement
In traditional workplace environments, leave tracking is plagued by:
- Manual emails, lost paper applications, and uncoordinated leave approvals.
- Work disruption due to unassigned handovers or lack of substitute verification.
- Overlapping absence requests leading to critical team understaffing.
- Lack of real-time visibility into workforce availability for department heads and executive leaders.
- Mismanagement of leave balances, quota overdrafts, and unmonitored unpaid leave (paycuts).

### Solution Statement
Leave Management Application provides an end-to-end digital workflow that enforces substitute approval, team-scoped approval, real-time leave entitlement tracking, duplicate/overlapping absence prevention, organization-wide availability calendar views, and executive dashboard analytics.

---

## 2. User Roles & System Permissions

| Role | Scope | Key Capabilities & Responsibilities |
| :--- | :--- | :--- |
| **Employee** | Personal / Own Team | Applies for leaves and time permissions, selects substitute employees with mandatory assigned work, tracks personal request statuses, accepts/rejects incoming substitute requests, views team availability calendar. |
| **Substitute Employee** | Peer Handover | Reviews assigned handover duties, accepts or rejects substitute requests with remarks prior to manager review. |
| **Team Admin (Team Lead)** | Department / Team | Approves or rejects leave applications submitted by team members, reviews substitute handover notes, monitors team availability, views team calendar. |
| **Superior Admin (Executive Head)** | Organization-Wide | Full administrative control: user provisioning with temporary passwords, force password resets, deactivate accounts, configure company teams, configure leave types and quotas, monitor executive dashboard metrics and organization-wide calendar. |

---

## 3. Core Features

### 3.1 Authentication & Security
- Username and password authentication with `bcryptjs` password hashing (salt factor 10).
- Stateless **JSON Web Tokens (JWT)** for session authorization via `Authorization: Bearer <token>`.
- **Force Password Change Flow**: New users created with temporary passwords or users whose passwords were reset by Superior Admin must change their password on first login before accessing any portal features.

### 3.2 Superior Admin User Management
- Provision new employees and team admins with Full Name, Email, Role, Team, Designation, Department, and Employment Type.
- Automated generation of unique usernames (e.g. `alex.morgan`) and 10-character secure temporary passwords (e.g. `Temp@842744`).
- Reset user password with temporary password generation.
- Soft deactivation of user accounts (`is_active = false`) preventing login while preserving historical audit logs.

### 3.3 Configuration Management
- **Teams**: Create new teams, assign/change Team Admins, track member counts, deactivate teams without hard-deleting historical records.
- **Leave Types**: Manage company leave types (e.g. Annual Leave, Sick Leave, Casual Leave, Emergency Leave, Half Day Leave, Time Permission), configure units (`days` or `hours`), set default quotas, and toggle substitute requirement.
- **Leave Entitlements / Quotas**: View and update allocated, used, and remaining quota balances for any employee.

### 3.4 Leave Application & Substitute Handover
- Support for standard full-day/multi-day leaves, half-day leaves, and short duration Time Permissions (1, 2, or 3 hours).
- **Mandatory Substitute Handover**: If a substitute is selected, the applicant must describe assigned work notes. The request enters `Waiting for Substitute Approval` status.
- Direct submission to `Waiting for Admin Approval` if no substitute is required or selected.

### 3.5 Duplicate & Overlapping Leave Prevention
- Prevents employees from submitting multiple active leave requests or time permissions covering the same date.
- Checks active statuses (`Waiting for Substitute Approval`, `Waiting for Admin Approval`, `Approved`, `Pending`) while ignoring `Rejected` or `Cancelled` requests.
- Validates all 4 overlap combinations: Normal vs Normal, Time Perm vs Time Perm, Normal vs Time Perm, and Time Perm vs Normal.

### 3.6 Paycut / No-Pay Leave Warning System
- Calculates requested units against employee's remaining quota balance.
- If requested leave exceeds remaining quota, the system returns `requiresConfirmation: true` with detailed quota breakdown (*Allocated, Used, Remaining, Requested, Paycut Units*).
- Form presents **Continue Anyway** (`confirm_paycut: true`) or **Cancel** options. Continued requests are flagged as `is_paycut_leave = true` with calculated `paycut_units`.

### 3.7 Team & Company Availability Calendar
- 7-column monthly calendar grid showing daily counts for *On Leave*, *Time Permission*, and *Total Away*.
- Unique employee counting logic ensuring `totalAwayCount` never exceeds total staff and `availableEmployees` never drops below 0.
- Date cell click opens a centered popup modal showing selected date attendance summary, department breakdown table, people on leave, and time permissions with scrollable handover details.

### 3.8 Superior Admin Executive Dashboard
- Real-time snapshot grid featuring 4 top metrics:
  1. **Total Away Right Now** (Featured Indigo Card)
  2. **On Leave Today** (Emerald Card)
  3. **Time Permission Today** (Cyan Card)
  4. **Leave Calendar** (Shortcut card to `/calendar`)
- Request Summary analytics grid (*Total, Approved, Rejected, Pending Lead, Pending Substitute*).
- Rejected Leaves audit table.

---

## 4. Functional Requirements

- **FR-1**: The system MUST authenticate users via `username` or `email` and password.
- **FR-2**: The system MUST force users with `must_change_password = true` to update their password before granting access to application routes.
- **FR-3**: The system MUST enforce substitute acceptance before presenting a leave request to the Team Admin for approval.
- **FR-4**: The system MUST reject overlapping active leave requests with HTTP 400 and return existing request details.
- **FR-5**: The system MUST calculate paycut units automatically when a user exceeds their allocated leave quota.
- **FR-6**: Superior Admin MUST be able to manage users, teams, leave types, and individual leave entitlements.
- **FR-7**: Calendar summaries MUST count unique employees on leave per day.

---

## 5. Non-Functional Requirements

- **Security**: Passwords hashed with bcrypt (cost factor 10); Bearer tokens for API endpoints; role-based access control (RBAC).
- **Performance**: Calendar month summary API response time $< 150\text{ ms}$; frontend build bundle footprint $< 500\text{ KB}$ gzipped.
- **Usability**: Responsive modern 2026 SaaS aesthetic (`#0F172A`, `#4F46E5`, `#10B981`); accessible color contrasts and micro-animations.
- **Data Integrity**: Atomic database transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) for substitute request creation and approval updates.

---

## 6. Future Enhancements
1. Email and push notifications for substitute assignments and approval decisions.
2. Export leave reports and department schedules to CSV/PDF formats.
3. Multi-level hierarchical approval workflows for multi-week extended leaves.
4. Native mobile applications (iOS / Android) using React Native.
