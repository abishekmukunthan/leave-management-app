# Backend API Documentation

All API endpoints reside under the base path `/api`. Protected routes require a Bearer token via HTTP header:
`Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication Module (`/api/auth`)

### 1.1 `POST /api/auth/login`
- **Purpose**: Authenticates user via username or email and password. Returns user profile and JWT token.
- **Request Body**:
  ```json
  {
    "username": "alex.morgan",
    "password": "Password@123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a0000000-0000-0000-0000-000000000002",
      "name": "Alex Morgan",
      "email": "alex.morgan@company.com",
      "username": "alex.morgan",
      "role": "employee",
      "team_id": "t0000000-0000-0000-0000-000000000001",
      "team_name": "Engineering",
      "is_active": true,
      "must_change_password": false,
      "designation": "Senior Frontend Engineer",
      "department": "Engineering"
    }
  }
  ```
- **Error Response (401 Unauthorized)**:
  ```json
  { "error": "Invalid username or password" }
  ```

### 1.2 `POST /api/auth/change-password`
- **Purpose**: Changes user password and sets `must_change_password` to `false`.
- **Request Body**:
  ```json
  {
    "user_id": "a0000000-0000-0000-0000-000000000002",
    "current_password": "Temp@842744",
    "new_password": "NewSecurePassword@2026"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  { "message": "Password changed successfully" }
  ```
- **Error Response (400 Bad Request)**:
  ```json
  { "message": "Password must be at least 8 characters" }
  ```

---

## 2. Employee Leaves Module (`/api/leaves`)

### 2.1 `POST /api/leaves`
- **Purpose**: Submits a new leave request or time permission request.
- **Request Body**:
  ```json
  {
    "employee_id": "a0000000-0000-0000-0000-000000000002",
    "leave_type": "Annual Leave",
    "start_date": "2026-10-15",
    "end_date": "2026-10-16",
    "reason": "Family function",
    "substitute_employee_id": "a0000000-0000-0000-0000-000000000003",
    "assigned_work": "Handle daily frontend client updates",
    "confirm_paycut": false
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "message": "Leave application submitted successfully, waiting for substitute approval",
    "data": {
      "id": "110c0d29-0b12-49b9-8afa-e631ae1092c0",
      "employee_id": "a0000000-0000-0000-0000-000000000002",
      "leave_type": "Annual Leave",
      "start_date": "2026-10-15",
      "end_date": "2026-10-16",
      "status": "Waiting for Substitute Approval"
    }
  }
  ```
- **Paycut Quota Warning Response (200 OK)**:
  ```json
  {
    "requiresConfirmation": true,
    "message": "Leave quota exceeded",
    "warning": "Your leave balance is not enough. This leave may be considered as no-pay / paycut leave.",
    "quotaDetails": {
      "leaveType": "Annual Leave",
      "allocated": 14,
      "used": 14,
      "remaining": 0,
      "requested": 2,
      "paycutUnits": 2,
      "unit": "days"
    }
  }
  ```
- **Overlapping Request Error Response (400 Bad Request)**:
  ```json
  {
    "message": "You already have an active leave request for this date.",
    "existingRequest": {
      "leave_type": "Annual Leave",
      "start_date": "2026-10-15",
      "end_date": "2026-10-16",
      "status": "Approved"
    }
  }
  ```

### 2.2 `GET /api/leaves/my-leaves?employee_id=USER_ID`
- **Purpose**: Fetches request history and substitute handover statuses for an employee.
- **Success Response (200 OK)**:
  ```json
  {
    "count": 1,
    "data": [
      {
        "id": "110c0d29-0b12-49b9-8afa-e631ae1092c0",
        "leave_type": "Annual Leave",
        "start_date": "2026-10-15",
        "end_date": "2026-10-16",
        "status": "Approved",
        "substitute_name": "Michael Chen",
        "assigned_work": "Handle daily frontend client updates",
        "substitute_status": "Accepted"
      }
    ]
  }
  ```

---

## 3. Substitute Module (`/api/substitute-requests`)

### 3.1 `GET /api/substitute-requests?employee_id=USER_ID`
- **Purpose**: Fetches incoming substitute requests assigned to the specified user.
- **Success Response (200 OK)**:
  ```json
  {
    "count": 1,
    "data": [
      {
        "id": "sr000000-0000-0000-0000-000000000001",
        "applicant_name": "Alex Morgan",
        "leave_type": "Annual Leave",
        "start_date": "2026-10-15",
        "end_date": "2026-10-16",
        "assigned_work": "Handle daily frontend client updates",
        "substitute_status": "Pending"
      }
    ]
  }
  ```

### 3.2 `PUT /api/substitute-requests/:id/accept`
- **Purpose**: Substitute accepts assigned handover duties. Transitions leave request status to `Waiting for Admin Approval`.
- **Success Response (200 OK)**:
  ```json
  { "message": "Substitute request accepted successfully" }
  ```

### 3.3 `PUT /api/substitute-requests/:id/reject`
- **Purpose**: Substitute rejects assigned handover duties with optional remarks. Updates status to `Rejected`.
- **Request Body**: `{ "substitute_remarks": "Busy with critical project release" }`
- **Success Response (200 OK)**:
  ```json
  { "message": "Substitute request rejected" }
  ```

---

## 4. Team Admin Module (`/api/admin`)

### 4.1 `GET /api/admin/leave-requests?admin_id=USER_ID`
- **Purpose**: Fetches leave applications for employees in the Team Admin's assigned team.
- **Success Response (200 OK)**:
  ```json
  {
    "count": 2,
    "summary": { "total": 2, "pending": 1, "approved": 1, "rejected": 0 },
    "data": [ ... ]
  }
  ```

### 4.2 `PUT /api/admin/leave-requests/:id/approve`
- **Purpose**: Team Admin approves a leave request. Automatically updates quota entitlement balances.
- **Request Body**: `{ "admin_id": "USER_ID" }`
- **Success Response (200 OK)**:
  ```json
  { "message": "Leave request approved successfully" }
  ```

### 4.3 `PUT /api/admin/leave-requests/:id/reject`
- **Purpose**: Team Admin rejects a leave request.
- **Request Body**: `{ "admin_id": "USER_ID", "admin_remarks": "High workload period" }`
- **Success Response (200 OK)**:
  ```json
  { "message": "Leave request rejected successfully" }
  ```

---

## 5. Superior Admin Module (`/api/superior`)

### 5.1 `GET /api/superior/dashboard-summary`
- **Purpose**: Executive dashboard real-time statistics, request summary, and rejected leave activity.
- **Success Response (200 OK)**:
  ```json
  {
    "overview": {
      "totalEmployees": 6,
      "onLeaveToday": 1,
      "timePermissionToday": 0,
      "totalAwayToday": 1
    },
    "requestSummary": {
      "totalRequests": 12,
      "approvedRequests": 8,
      "rejectedRequests": 2,
      "pendingTeamLead": 1,
      "pendingSubstitute": 1
    },
    "rejectedLeaves": [ ... ]
  }
  ```

### 5.2 User Management Endpoints
- `GET /api/superior/users` — List all company employees.
- `POST /api/superior/users` — Provision new user (Returns username and temporary password).
- `PUT /api/superior/users/:id/reset-password` — Resets user password to temporary password.
- `PUT /api/superior/users/:id/deactivate` — Soft deactivates user account.

### 5.3 Configuration Endpoints
- `GET /api/superior/teams` & `POST /api/superior/teams` & `PUT /api/superior/teams/:id` — Team management.
- `GET /api/superior/leave-types` & `POST /api/superior/leave-types` & `PUT /api/superior/leave-types/:id` — Leave policies.
- `GET /api/superior/users/:id/leave-entitlements` & `PUT /api/superior/users/:id/leave-entitlements` — Individual quota allocations.

---

## 6. Calendar Module (`/api/calendar`)

### 6.1 `GET /api/calendar/month?year=2026&month=9&user_id=USER_ID`
- **Purpose**: Returns leave and time permission summary counts per day for the specified month.
- **Success Response (200 OK)**:
  ```json
  {
    "year": 2026,
    "month": 9,
    "days": [
      { "date": "2026-09-01", "onLeaveCount": 1, "timePermissionCount": 0, "totalAwayCount": 1 },
      { "date": "2026-09-02", "onLeaveCount": 2, "timePermissionCount": 1, "totalAwayCount": 3 }
    ]
  }
  ```

### 6.2 `GET /api/calendar/day?date=2026-09-01&user_id=USER_ID`
- **Purpose**: Returns attendance breakdown, team availability, people on leave, and time permissions for the clicked date.
- **Success Response (200 OK)**:
  ```json
  {
    "date": "2026-09-01",
    "summary": {
      "totalEmployees": 6,
      "availableEmployees": 5,
      "onLeaveCount": 1,
      "timePermissionCount": 0,
      "totalAwayCount": 1
    },
    "teamBreakdown": [
      { "teamName": "Engineering", "totalMembers": 4, "availableCount": 3, "onLeaveCount": 1, "timePermissionCount": 0, "totalAwayCount": 1 }
    ],
    "peopleOnLeave": [
      {
        "employee_name": "Alex Morgan",
        "team_name": "Engineering",
        "leave_type": "Annual Leave",
        "duration": "2 days",
        "substitute_name": "Michael Chen",
        "assigned_work": "Handle daily frontend client updates",
        "approved_by": "Priya Fernando"
      }
    ],
    "timePermissions": []
  }
  ```
