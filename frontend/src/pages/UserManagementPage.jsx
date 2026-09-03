import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Search,
  X,
  RefreshCw,
  KeyRound,
  UserX,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useLeave } from "../context/useLeave";
import {
  getSuperiorUsers,
  createSuperiorUser,
  resetUserPassword,
  deactivateUser,
} from "../services/api";

const DEMO_TEAMS_LIST = [
  { id: "d0000000-0000-0000-0000-000000000001", name: "Engineering" },
  { id: "d0000000-0000-0000-0000-000000000002", name: "Sales" },
  { id: "d0000000-0000-0000-0000-000000000003", name: "Marketing" },
  { id: "d0000000-0000-0000-0000-000000000004", name: "HR" },
];

const getTeamColor = (teamName) => {
  if (!teamName) return "#64748B";
  const name = teamName.toLowerCase();
  if (name.includes("eng")) return "#4F46E5";
  if (name.includes("sale")) return "#F59E0B";
  if (name.includes("mark")) return "#EC4899";
  if (name.includes("hr") || name.includes("human")) return "#06B6D4";
  return "#6366F1";
};

export const UserManagementPage = () => {
  const { showToast, loggedInUser } = useLeave();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Modals & Action States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [formError, setFormError] = useState("");

  // New User Result Modal
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);

  // Reset Password Result Modal
  const [resetResult, setResetResult] = useState(null);
  const [resetCopiedPass, setResetCopiedPass] = useState(false);

  // Deactivate Confirmation Modal
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // Add User Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "employee",
    team_id: "d0000000-0000-0000-0000-000000000001",
    designation: "",
    department: "Engineering",
    employment_type: "Full-time",
  });

  const fetchUsersList = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    setError(null);
    try {
      const res = await getSuperiorUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error("Error fetching user management list:", err);
      setError(err.message || "Failed to load user list from server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getSuperiorUsers()
      .then((res) => {
        if (isMounted) {
          setUsers(res.users || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Error fetching users list:", err);
          setError(err.message || "Failed to load user list from server");
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Team Change in Form to keep Department auto-synced
  const handleTeamChange = (e) => {
    const selectedTeamId = e.target.value;
    const teamObj = DEMO_TEAMS_LIST.find((t) => t.id === selectedTeamId);
    setFormData((prev) => ({
      ...prev,
      team_id: selectedTeamId,
      department: teamObj ? teamObj.name : prev.department,
    }));
  };

  // Submit Add User
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Full Name is required.");
      return;
    }
    if (!formData.email.trim()) {
      setFormError("Email address is required.");
      return;
    }

    setSubmittingUser(true);

    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        designation: formData.designation.trim() || "Employee",
        department: formData.department.trim() || "Engineering",
        created_by: loggedInUser?.id || null,
      };

      const res = await createSuperiorUser(payload);
      setShowAddModal(false);
      setCreatedResult({
        user: res.user,
        temporaryPassword: res.temporaryPassword,
      });

      // Reset form defaults
      setFormData({
        name: "",
        email: "",
        role: "employee",
        team_id: "d0000000-0000-0000-0000-000000000001",
        designation: "",
        department: "Engineering",
        employment_type: "Full-time",
      });

      showToast(`User account created for ${res.user.name}!`, "success");
      fetchUsersList();
    } catch (err) {
      console.error("Failed to create user:", err);
      setFormError(err.message || "Failed to create user account.");
    } finally {
      setSubmittingUser(false);
    }
  };

  // Submit Reset Password
  const handleConfirmResetPassword = async (userId, userName) => {
    try {
      const res = await resetUserPassword(userId);
      setResetResult({
        user: { ...res.user, name: userName },
        temporaryPassword: res.temporaryPassword,
      });
      showToast(`Password reset for ${userName}!`, "success");
    } catch (err) {
      console.error("Failed to reset password:", err);
      showToast(err.message || "Failed to reset password", "warning");
    }
  };

  // Submit Deactivate
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);

    try {
      await deactivateUser(deactivateTarget.id);
      showToast(`Deactivated ${deactivateTarget.name}'s account.`, "info");
      setDeactivateTarget(null);
      fetchUsersList();
    } catch (err) {
      console.error("Failed to deactivate user:", err);
      showToast(err.message || "Failed to deactivate user", "warning");
    } finally {
      setDeactivating(false);
    }
  };

  // Clipboard copy helpers
  const handleCopyText = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "user") {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else if (type === "pass") {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    } else if (type === "resetPass") {
      setResetCopiedPass(true);
      setTimeout(() => setResetCopiedPass(false), 2000);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    if (roleFilter === "EMPLOYEE" && u.role !== "employee") return false;
    if (roleFilter === "TEAM_ADMIN" && u.role !== "team_admin" && u.role !== "admin") return false;
    if (roleFilter === "SUPERIOR_ADMIN" && u.role !== "superior_admin") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.team_name?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="admin-page-container">
      {/* Header Row */}
      <div className="admin-header-row">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 className="admin-title">User Management</h2>
            <span className="counter-pill pill-blue">{users.length} Total Users</span>
          </div>
          <p className="admin-subtitle">
            Add employees, assign teams, and manage account access.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            className="secondary-btn"
            onClick={() => fetchUsersList(true)}
            title="Refresh Users"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            className="primary-btn"
            onClick={() => {
              setFormError("");
              setShowAddModal(true);
            }}
          >
            <UserPlus size={15} strokeWidth={2.5} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="table-controls-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${roleFilter === "ALL" ? "tab-active" : ""}`}
            onClick={() => setRoleFilter("ALL")}
          >
            All Accounts ({users.length})
          </button>
          <button
            className={`filter-tab ${roleFilter === "EMPLOYEE" ? "tab-active" : ""}`}
            onClick={() => setRoleFilter("EMPLOYEE")}
          >
            Employees ({users.filter((u) => u.role === "employee").length})
          </button>
          <button
            className={`filter-tab ${roleFilter === "TEAM_ADMIN" ? "tab-active" : ""}`}
            onClick={() => setRoleFilter("TEAM_ADMIN")}
          >
            Team Leads ({users.filter((u) => u.role === "team_admin" || u.role === "admin").length})
          </button>
          <button
            className={`filter-tab ${roleFilter === "SUPERIOR_ADMIN" ? "tab-active" : ""}`}
            onClick={() => setRoleFilter("SUPERIOR_ADMIN")}
          >
            Superior Admins ({users.filter((u) => u.role === "superior_admin").length})
          </button>
        </div>

        <div className="controls-right">
          <div className="search-input-wrapper">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, username, team..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery("")}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Loading user accounts...
          </p>
        </div>
      )}

      {/* Error Alert */}
      {!loading && error && (
        <div className="form-error-alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            className="secondary-btn"
            onClick={() => fetchUsersList(true)}
            style={{ marginLeft: "auto", padding: "0.25rem 0.75rem" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Users Table */}
      {!loading && !error && (
        <div className="table-card">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Users size={24} />
              </div>
              <h3>No User Accounts Found</h3>
              <p>{searchQuery ? "No accounts matched your search criteria." : "No users under this view."}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Team</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const initials = (user.name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("");
                    const isSuperior = user.role === "superior_admin";
                    const isTeamLead = user.role === "team_admin" || user.role === "admin";
                    const isActive = user.is_active !== false;

                    return (
                      <tr key={user.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                backgroundColor: isSuperior ? "#be185d" : isTeamLead ? "#7e22ce" : "#4f46e5",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div className="employee-info-cell">
                              <strong className="employee-name">{user.name}</strong>
                              <span className="employee-id-sub">
                                {user.employee_code || user.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="cell-id">{user.username || "—"}</span>
                        </td>
                        <td>
                          <span className="font-mono text-muted" style={{ fontSize: "0.8125rem" }}>
                            {user.email}
                          </span>
                        </td>
                        <td>
                          {isSuperior ? (
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "9999px",
                                background: "#fce7f3",
                                color: "#be185d",
                                border: "1px solid #fbcfe8",
                                textTransform: "uppercase",
                              }}
                            >
                              Superior Admin
                            </span>
                          ) : isTeamLead ? (
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "9999px",
                                background: "#f3e8ff",
                                color: "#7e22ce",
                                border: "1px solid #e9d5ff",
                                textTransform: "uppercase",
                              }}
                            >
                              Team Lead
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "9999px",
                                background: "#e0f2fe",
                                color: "#0369a1",
                                border: "1px solid #bae6fd",
                                textTransform: "uppercase",
                              }}
                            >
                              Employee
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="team-name-cell">
                            <span
                              className="team-dot"
                              style={{ backgroundColor: getTeamColor(user.team_name) }}
                            ></span>
                            <span className="font-medium" style={{ fontSize: "0.8125rem", color: "#0f172a" }}>
                              {user.team_name}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.8125rem", color: "#475569" }}>
                            {user.designation || "Employee"}
                          </span>
                        </td>
                        <td>
                          {isActive ? (
                            <span className="status-pill status-pill-accepted">Active</span>
                          ) : (
                            <span className="status-pill status-pill-rejected">Inactive</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-action-buttons">
                            <button
                              type="button"
                              className="secondary-btn"
                              style={{ padding: "0.25rem 0.55rem", fontSize: "0.75rem" }}
                              onClick={() => handleConfirmResetPassword(user.id, user.name)}
                              title="Reset password for user"
                            >
                              <KeyRound size={13} />
                              <span>Reset Password</span>
                            </button>

                            {isActive && !isSuperior && (
                              <button
                                type="button"
                                className="admin-reject-btn"
                                style={{ padding: "0.25rem 0.55rem", fontSize: "0.75rem" }}
                                onClick={() => setDeactivateTarget(user)}
                                title="Deactivate user account"
                              >
                                <UserX size={13} />
                                <span>Deactivate</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD USER FORM
         ========================================================================= */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <div>
                <h2 style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <UserPlus size={18} className="text-blue" />
                  <span>Create New User Account</span>
                </h2>
                <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
                  Account credentials and temporary password will be generated automatically.
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit}>
              <div className="modal-body" style={{ gap: "1.1rem" }}>
                {formError && (
                  <div className="form-error-alert" style={{ margin: 0 }}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Full Name & Email */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="fullName" className="form-label required">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      className="form-input"
                      placeholder="e.g. John Smith"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="userEmail" className="form-label required">
                      Email Address
                    </label>
                    <input
                      id="userEmail"
                      type="email"
                      className="form-input"
                      placeholder="e.g. john.smith@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* 2. Role & Team */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="userRole" className="form-label required">
                      Role
                    </label>
                    <select
                      id="userRole"
                      className="form-select"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      required
                    >
                      <option value="employee">Employee</option>
                      <option value="team_admin">Team Lead (Team Admin)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="userTeam" className="form-label required">
                      Assigned Team
                    </label>
                    <select
                      id="userTeam"
                      className="form-select"
                      value={formData.team_id}
                      onChange={handleTeamChange}
                      required
                    >
                      {DEMO_TEAMS_LIST.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Designation & Department */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="userDesignation" className="form-label">
                      Designation / Job Title
                    </label>
                    <input
                      id="userDesignation"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Senior Developer"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="userDepartment" className="form-label">
                      Department
                    </label>
                    <input
                      id="userDepartment"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Engineering"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>

                {/* 4. Employment Type */}
                <div className="form-group">
                  <label htmlFor="empType" className="form-label">
                    Employment Type
                  </label>
                  <select
                    id="empType"
                    className="form-select"
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  >
                    <option value="Full-time">Full-time / Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowAddModal(false)}
                  disabled={submittingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submittingUser}
                >
                  {submittingUser ? "Creating Account..." : "Create User Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: USER CREATED - SHOW TEMPORARY CREDENTIALS (ONCE ONLY)
         ========================================================================= */}
      {createdResult && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: "500px" }}>
            <div className="modal-header" style={{ background: "#ecfdf5", borderBottomColor: "#a7f3d0" }}>
              <div>
                <h2 style={{ color: "#065f46", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <CheckCircle2 size={20} className="text-green" />
                  <span>User Account Created Successfully!</span>
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setCreatedResult(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ gap: "1rem" }}>
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  color: "#92400e",
                  fontSize: "0.8125rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  <strong>IMPORTANT:</strong> This temporary password will be shown <strong>ONLY ONCE</strong>.
                  Please copy and share it securely with the user.
                </span>
              </div>

              <div className="modal-detail-item">
                <span className="detail-label">Full Name</span>
                <span className="detail-value font-semibold">{createdResult.user.name}</span>
              </div>

              <div className="modal-detail-item">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">{createdResult.user.email}</span>
              </div>

              {/* Username with Copy */}
              <div className="modal-detail-item">
                <span className="detail-label">Generated Username</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div className="cell-id" style={{ fontSize: "0.9375rem", padding: "0.35rem 0.75rem", flex: 1 }}>
                    {createdResult.user.username}
                  </div>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                    onClick={() => handleCopyText(createdResult.user.username, "user")}
                  >
                    {copiedUser ? <><Check size={13} className="text-green" /> Copied</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
              </div>

              {/* Temporary Password with Copy */}
              <div className="modal-detail-item">
                <span className="detail-label">Temporary Password</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "#4f46e5",
                      background: "#eef2ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: "8px",
                      padding: "0.45rem 0.85rem",
                      flex: 1,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {createdResult.temporaryPassword}
                  </div>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ padding: "0.45rem 0.85rem", fontSize: "0.75rem" }}
                    onClick={() => handleCopyText(createdResult.temporaryPassword, "pass")}
                  >
                    {copiedPass ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Password</>}
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="primary-btn" onClick={() => setCreatedResult(null)}>
                Done & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: PASSWORD RESET RESULT (ONCE ONLY)
         ========================================================================= */}
      {resetResult && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div>
                <h2 style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <KeyRound size={18} className="text-blue" />
                  <span>Password Reset Generated</span>
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setResetResult(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ gap: "1rem" }}>
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  color: "#92400e",
                  fontSize: "0.8125rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  <strong>IMPORTANT:</strong> This new temporary password will be shown <strong>ONLY ONCE</strong>.
                </span>
              </div>

              <div className="modal-detail-item">
                <span className="detail-label">User Account</span>
                <span className="detail-value font-semibold">
                  {resetResult.user.name} ({resetResult.user.username})
                </span>
              </div>

              {/* Temporary Password with Copy */}
              <div className="modal-detail-item">
                <span className="detail-label">New Temporary Password</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "#4f46e5",
                      background: "#eef2ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: "8px",
                      padding: "0.45rem 0.85rem",
                      flex: 1,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {resetResult.temporaryPassword}
                  </div>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ padding: "0.45rem 0.85rem", fontSize: "0.75rem" }}
                    onClick={() => handleCopyText(resetResult.temporaryPassword, "resetPass")}
                  >
                    {resetCopiedPass ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Password</>}
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="primary-btn" onClick={() => setResetResult(null)}>
                Done & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: DEACTIVATE CONFIRMATION
         ========================================================================= */}
      {deactivateTarget && (
        <div className="modal-backdrop" onClick={() => setDeactivateTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-header" style={{ background: "#fef2f2", borderBottomColor: "#fecaca" }}>
              <div>
                <h2 style={{ color: "#991b1b", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <UserX size={18} className="text-red" />
                  <span>Deactivate User Account</span>
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setDeactivateTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: "0.875rem", color: "#0f172a", margin: 0 }}>
                Are you sure you want to deactivate <strong>{deactivateTarget.name}</strong> (
                <span className="font-mono">{deactivateTarget.username}</span>)?
              </p>
              <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
                This will prevent the user from logging in to LeaveEase and mark their profile as inactive.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setDeactivateTarget(null)}
                disabled={deactivating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-reject-btn"
                onClick={handleConfirmDeactivate}
                disabled={deactivating}
                style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
              >
                {deactivating ? "Deactivating..." : "Yes, Deactivate Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
