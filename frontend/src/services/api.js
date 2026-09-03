import { getToken } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const DEMO_USERS = {
  TEAM_ADMIN: {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Priya Fernando",
    role: "team_admin",
    designation: "Engineering Lead & Manager",
    email: "priya.fernando@company.com",
    department: "Engineering",
  },
  SUPERIOR_ADMIN: {
    id: "a0000000-0000-0000-0000-000000000005",
    name: "Nadia Perera",
    role: "superior_admin",
    designation: "Head of Operations & Superior Admin",
    email: "nadia.perera@company.com",
    department: "Executive Management",
  },
  EMPLOYEE_APPLICANT: {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "Alex Morgan",
    role: "employee",
    designation: "Senior Frontend Engineer",
    email: "alex.morgan@company.com",
    department: "Engineering",
  },
  SUBSTITUTE_EMPLOYEE: {
    id: "a0000000-0000-0000-0000-000000000003",
    name: "Michael Chen",
    role: "employee",
    designation: "Fullstack Developer",
    email: "michael.chen@company.com",
    department: "Engineering",
  },
  SALES_EMPLOYEE: {
    id: "a0000000-0000-0000-0000-000000000004",
    name: "Sarah Johnson",
    role: "employee",
    designation: "Sales Representative",
    email: "sarah.johnson@company.com",
    department: "Sales",
  },
};

// Generic helper for fetch requests with standardized error handling & Bearer token
const fetchJson = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage =
      data.error || data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

// 0. POST /api/auth/login - Authenticate with username/password
export const loginUser = async (username, password) => {
  return await fetchJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
};

// 0b. POST /api/auth/change-password - Change temporary or existing password
export const changePassword = async (userId, currentPassword, newPassword) => {
  return await fetchJson("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
};

// 1. POST /api/leaves - Apply for leave
export const applyLeave = async (leaveData) => {
  return await fetchJson("/api/leaves", {
    method: "POST",
    body: JSON.stringify(leaveData),
  });
};

// 2. GET /api/leaves/my-leaves?employee_id=USER_ID
export const getMyLeaves = async (employeeId) => {
  return await fetchJson(`/api/leaves/my-leaves?employee_id=${encodeURIComponent(employeeId)}`);
};

// 3. GET /api/substitute-requests?employee_id=USER_ID
export const getSubstituteRequests = async (employeeId) => {
  return await fetchJson(
    `/api/substitute-requests?employee_id=${encodeURIComponent(employeeId)}`
  );
};

// 4. PUT /api/substitute-requests/:id/accept
export const acceptSubstituteRequest = async (requestId) => {
  return await fetchJson(`/api/substitute-requests/${encodeURIComponent(requestId)}/accept`, {
    method: "PUT",
  });
};

// 5. PUT /api/substitute-requests/:id/reject
export const rejectSubstituteRequest = async (requestId, substitute_remarks) => {
  return await fetchJson(`/api/substitute-requests/${encodeURIComponent(requestId)}/reject`, {
    method: "PUT",
    body: JSON.stringify({ substitute_remarks }),
  });
};

// 6. GET /api/admin/leave-requests?admin_id=USER_ID
export const getAdminLeaveRequests = async (adminId = null) => {
  const query = adminId ? `?admin_id=${encodeURIComponent(adminId)}` : "";
  return await fetchJson(`/api/admin/leave-requests${query}`);
};

// 7. PUT /api/admin/leave-requests/:id/approve
export const approveLeaveRequest = async (leaveRequestId, approved_by) => {
  return await fetchJson(`/api/admin/leave-requests/${encodeURIComponent(leaveRequestId)}/approve`, {
    method: "PUT",
    body: JSON.stringify({ approved_by }),
  });
};

// 8. PUT /api/admin/leave-requests/:id/reject
export const rejectLeaveRequest = async (leaveRequestId, admin_remarks, rejected_by = null) => {
  return await fetchJson(`/api/admin/leave-requests/${encodeURIComponent(leaveRequestId)}/reject`, {
    method: "PUT",
    body: JSON.stringify({ admin_remarks, rejected_by }),
  });
};

// 9. GET /api/superior/dashboard-summary
export const getSuperiorDashboardSummary = async () => {
  return await fetchJson("/api/superior/dashboard-summary");
};

// 10. Superior User Management API Functions
export const getSuperiorUsers = async () => {
  return await fetchJson("/api/superior/users");
};

export const createSuperiorUser = async (userData) => {
  return await fetchJson("/api/superior/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
};

export const resetUserPassword = async (userId) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}/reset-password`, {
    method: "PUT",
  });
};

export const deactivateUser = async (userId) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}/deactivate`, {
    method: "PUT",
  });
};

// 11. Superior Teams Configuration API Functions
export const getSuperiorTeams = async () => {
  return await fetchJson("/api/superior/teams");
};

export const createSuperiorTeam = async (teamData) => {
  return await fetchJson("/api/superior/teams", {
    method: "POST",
    body: JSON.stringify(teamData),
  });
};

export const updateSuperiorTeam = async (teamId, teamData) => {
  return await fetchJson(`/api/superior/teams/${encodeURIComponent(teamId)}`, {
    method: "PUT",
    body: JSON.stringify(teamData),
  });
};

export const deactivateSuperiorTeam = async (teamId) => {
  return await fetchJson(`/api/superior/teams/${encodeURIComponent(teamId)}/deactivate`, {
    method: "PUT",
  });
};

// 12. Superior Leave Types Configuration API Functions
export const getSuperiorLeaveTypes = async () => {
  return await fetchJson("/api/superior/leave-types");
};

export const createSuperiorLeaveType = async (leaveTypeData) => {
  return await fetchJson("/api/superior/leave-types", {
    method: "POST",
    body: JSON.stringify(leaveTypeData),
  });
};

export const updateSuperiorLeaveType = async (leaveTypeId, leaveTypeData) => {
  return await fetchJson(`/api/superior/leave-types/${encodeURIComponent(leaveTypeId)}`, {
    method: "PUT",
    body: JSON.stringify(leaveTypeData),
  });
};

export const deactivateSuperiorLeaveType = async (leaveTypeId) => {
  return await fetchJson(`/api/superior/leave-types/${encodeURIComponent(leaveTypeId)}/deactivate`, {
    method: "PUT",
  });
};

// 13. Superior User Leave Entitlements / Quotas API Functions
export const getSuperiorUserLeaveEntitlements = async (userId) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}/leave-entitlements`);
};

export const updateSuperiorUserLeaveEntitlements = async (userId, entitlements) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}/leave-entitlements`, {
    method: "PUT",
    body: JSON.stringify({ entitlements }),
  });
};

// 14. Calendar API Functions
export const getCalendarMonthSummary = async (year, month, userId) => {
  return await fetchJson(
    `/api/calendar/month?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}&user_id=${encodeURIComponent(userId)}`
  );
};

export const getCalendarDayDetails = async (dateStr, userId) => {
  return await fetchJson(
    `/api/calendar/day?date=${encodeURIComponent(dateStr)}&user_id=${encodeURIComponent(userId)}`
  );
};

