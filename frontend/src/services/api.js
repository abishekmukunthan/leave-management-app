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

// Generic helper for fetch requests with standardized error handling
const fetchJson = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

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
