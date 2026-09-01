const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const DEMO_USERS = {
  ADMIN: {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Priya Fernando",
    role: "Admin / Team Lead",
    email: "priya.fernando@company.com",
  },
  EMPLOYEE_APPLICANT: {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "Alex Morgan",
    role: "Senior Frontend Engineer",
    email: "alex.morgan@company.com",
  },
  SUBSTITUTE_EMPLOYEE: {
    id: "a0000000-0000-0000-0000-000000000003",
    name: "Michael Chen",
    role: "Fullstack Developer",
    email: "michael.chen@company.com",
  },
  ANOTHER_EMPLOYEE: {
    id: "a0000000-0000-0000-0000-000000000004",
    name: "Sarah Johnson",
    role: "UI/UX Designer",
    email: "sarah.johnson@company.com",
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

// 6. GET /api/admin/leave-requests
export const getAdminLeaveRequests = async () => {
  return await fetchJson("/api/admin/leave-requests");
};

// 7. PUT /api/admin/leave-requests/:id/approve
export const approveLeaveRequest = async (
  leaveRequestId,
  approved_by = DEMO_USERS.ADMIN.id
) => {
  return await fetchJson(`/api/admin/leave-requests/${encodeURIComponent(leaveRequestId)}/approve`, {
    method: "PUT",
    body: JSON.stringify({ approved_by }),
  });
};

// 8. PUT /api/admin/leave-requests/:id/reject
export const rejectLeaveRequest = async (leaveRequestId, admin_remarks) => {
  return await fetchJson(`/api/admin/leave-requests/${encodeURIComponent(leaveRequestId)}/reject`, {
    method: "PUT",
    body: JSON.stringify({ admin_remarks }),
  });
};
