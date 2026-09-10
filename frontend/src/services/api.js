import { getToken, logoutUser } from "./auth";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const buildApiUrl = (endpoint) => {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // If base ends with /api and endpoint starts with /api/, avoid duplicate /api/api
  if (normalizedBase.endsWith("/api") && normalizedEndpoint.startsWith("/api/")) {
    return `${normalizedBase}${normalizedEndpoint.slice(4)}`;
  }
  // If base does not end with /api and endpoint does not start with /api/, append /api
  if (!normalizedBase.endsWith("/api") && !normalizedEndpoint.startsWith("/api/")) {
    return `${normalizedBase}/api${normalizedEndpoint}`;
  }
  return `${normalizedBase}${normalizedEndpoint}`;
};

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
  const url = buildApiUrl(endpoint);
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
    if (response.status === 401 && !endpoint.includes("/api/auth/login")) {
      logoutUser({ broadcast: true });
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(
            "leaveease_session_expired_message",
            data.message || data.error || "Your session has expired or is no longer valid. Please sign in again."
          );
        } catch {
          // Ignore
        }
        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
      }
    }

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

// 2b. GET /api/leaves/substitute-employees?employee_id=USER_ID&search=SEARCH_TEXT
export const getSubstituteEmployees = async (employeeId = null, search = "") => {
  const params = new URLSearchParams();
  if (employeeId) params.append("employee_id", employeeId);
  if (search) params.append("search", search);
  const qs = params.toString();
  return await fetchJson(`/api/leaves/substitute-employees${qs ? `?${qs}` : ""}`);
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

export const deactivateUser = async (userId, superiorAdminId) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}/deactivate`, {
    method: "PUT",
    body: superiorAdminId ? JSON.stringify({ superior_admin_id: superiorAdminId }) : undefined,
  });
};

export const activateUser = async (userId, superiorAdminId) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}/activate`, {
    method: "PUT",
    body: superiorAdminId ? JSON.stringify({ superior_admin_id: superiorAdminId }) : undefined,
  });
};

export const updateSuperiorUserDetails = async (userId, userData, superiorAdminId) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify({
      ...userData,
      superior_admin_id: superiorAdminId,
    }),
  });
};

export const deleteSuperiorUser = async (userId, superiorAdminId) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    body: superiorAdminId ? JSON.stringify({ superior_admin_id: superiorAdminId }) : undefined,
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

export const deactivateTeam = async (teamId, superiorAdminId) => {
  return await fetchJson(`/api/superior/teams/${encodeURIComponent(teamId)}/deactivate`, {
    method: "PUT",
    body: superiorAdminId ? JSON.stringify({ superior_admin_id: superiorAdminId }) : undefined,
  });
};
export const deactivateSuperiorTeam = deactivateTeam;

export const activateTeam = async (teamId, superiorAdminId) => {
  return await fetchJson(`/api/superior/teams/${encodeURIComponent(teamId)}/activate`, {
    method: "PUT",
    body: superiorAdminId ? JSON.stringify({ superior_admin_id: superiorAdminId }) : undefined,
  });
};
export const activateSuperiorTeam = activateTeam;

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

// 15. Permission Management API Functions
export const getSuperiorPermissions = async () => {
  return await fetchJson("/api/superior/permissions");
};

export const createSuperiorPermission = async (permData) => {
  return await fetchJson("/api/superior/permissions", {
    method: "POST",
    body: JSON.stringify(permData),
  });
};

export const updateSuperiorPermission = async (id, permData) => {
  return await fetchJson(`/api/superior/permissions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(permData),
  });
};

export const generateTeamPermissions = async (superiorAdminId) => {
  return await fetchJson("/api/superior/permissions/generate-team-permissions", {
    method: "POST",
    body: JSON.stringify({ user_id: superiorAdminId }),
  });
};

export const getUserPermissions = async (userId) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}/permissions`);
};

export const updateUserPermissions = async (userId, permissionIds, assignedBy) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}/permissions`, {
    method: "PUT",
    body: JSON.stringify({
      permission_ids: permissionIds,
      assigned_by: assignedBy,
    }),
  });
};

export const getTeamApprovalPermission = async (teamId) => {
  return await fetchJson(`/api/superior/teams/${encodeURIComponent(teamId)}/approval-permission`);
};

export const updateTeamApprovalPermission = async (teamId, permissionId, createdBy) => {
  return await fetchJson(`/api/superior/teams/${encodeURIComponent(teamId)}/approval-permission`, {
    method: "PUT",
    body: JSON.stringify({
      permission_id: permissionId,
      created_by: createdBy,
    }),
  });
};

// 16. Team Lead & Editable Role Management API Functions
export const promoteUserToTeamLead = async (userId, payload) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}/promote-team-lead`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const demoteTeamLead = async (userId) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}/demote-team-lead`, {
    method: "PUT",
  });
};

export const changeUserRole = async (userId, payload) => {
  return await fetchJson(`/api/superior/users/${encodeURIComponent(userId)}/role`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const assignTeamLead = async (teamId, payload) => {
  return await fetchJson(`/api/superior/teams/${encodeURIComponent(teamId)}/team-lead`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const removeTeamLead = async (teamId) => {
  return await fetchJson(`/api/superior/teams/${encodeURIComponent(teamId)}/team-lead`, {
    method: "DELETE",
  });
};

// 17. Team Lead Leave Requests for Superior Admin
export const getTeamLeadLeaveRequests = async (superiorAdminId = null) => {
  const query = superiorAdminId ? `?superior_admin_id=${encodeURIComponent(superiorAdminId)}` : "";
  return await fetchJson(`/api/superior/team-lead-leave-requests${query}`);
};

// 18. Superior Team Member Management API Functions
export const getUnassignedEmployees = async (search = "") => {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return await fetchJson(`/api/superior/unassigned-employees${query}`);
};

export const getTeamMembers = async (teamId) => {
  return await fetchJson(`/api/superior/teams/${encodeURIComponent(teamId)}/members`);
};

export const getTeamMemberCandidates = async (teamId, search = "") => {
  const params = new URLSearchParams();
  if (teamId) params.append("team_id", teamId);
  if (search) params.append("search", search);
  return await fetchJson(`/api/superior/team-member-candidates?${params.toString()}`);
};

export const addOrMoveTeamMember = async (teamId, userId, payload = {}) => {
  return await fetchJson(
    `/api/superior/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
};

export const removeTeamMember = async (teamId, userId, payload = {}) => {
  return await fetchJson(
    `/api/superior/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      body: JSON.stringify(payload),
    }
  );
};

// 19. Team In-charge Candidates API Function
export const getTeamInchargeCandidates = async (teamId = "", search = "") => {
  const params = new URLSearchParams();
  if (teamId) params.append("team_id", teamId);
  if (search) params.append("search", search);
  return await fetchJson(`/api/superior/team-incharge-candidates?${params.toString()}`);
};

// 20. Superior Admin Leave Summary Report & Export Functions
export const getLeaveSummaryReport = async (fromDate, toDate, superiorAdminId) => {
  const params = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
  });
  if (superiorAdminId) params.append("superior_admin_id", superiorAdminId);
  return await fetchJson(`/api/superior/reports/leave-summary?${params.toString()}`);
};

const triggerBrowserDownload = async (endpoint, defaultFilename) => {
  const url = buildApiUrl(endpoint);
  const headers = {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      logoutUser({ broadcast: true });
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(
            "leaveease_session_expired_message",
            errorData.message || errorData.error || "Your session has expired or is no longer valid. Please sign in again."
          );
        } catch {
          // Ignore
        }
        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
      }
    }
    throw new Error(errorData.error || errorData.message || "Failed to download report");
  }

  let filename = defaultFilename;
  const disposition = response.headers.get("Content-Disposition");
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100);
  return { success: true, filename };
};

export const downloadLeaveSummaryExcel = async (fromDate, toDate, superiorAdminId) => {
  const params = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
  });
  if (superiorAdminId) params.append("superior_admin_id", superiorAdminId);
  const defaultFilename = `leave-summary-report-${fromDate}-to-${toDate}.xlsx`;
  return await triggerBrowserDownload(
    `/api/superior/reports/leave-summary/export/excel?${params.toString()}`,
    defaultFilename
  );
};

export const downloadLeaveSummaryPdf = async (fromDate, toDate, superiorAdminId) => {
  const params = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
  });
  if (superiorAdminId) params.append("superior_admin_id", superiorAdminId);
  const defaultFilename = `leave-summary-report-${fromDate}-to-${toDate}.pdf`;
  return await triggerBrowserDownload(
    `/api/superior/reports/leave-summary/export/pdf?${params.toString()}`,
    defaultFilename
  );
};



