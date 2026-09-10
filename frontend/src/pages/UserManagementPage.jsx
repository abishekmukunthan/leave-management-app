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
  Shield,
  Award,
  Info,
  Edit,
} from "lucide-react";
import { useLeave } from "../context/useLeave";
import {
  getSuperiorUsers,
  createSuperiorUser,
  resetUserPassword,
  deactivateUser,
  activateUser,
  updateSuperiorUserDetails,
  getSuperiorPermissions,
  updateUserPermissions,
  getSuperiorTeams,
  promoteUserToTeamLead,
  demoteTeamLead,
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
  const [teamsList, setTeamsList] = useState(DEMO_TEAMS_LIST);
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
  const [deactivateError, setDeactivateError] = useState("");

  // Activate Confirmation Modal
  const [activateTarget, setActivateTarget] = useState(null);
  const [activating, setActivating] = useState(false);

  // Edit User Modal State
  const [editTarget, setEditTarget] = useState(null);
  const [editingUser, setEditingUser] = useState(false);
  const [editFormError, setEditFormError] = useState("");
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    designation: "",
    department: "",
  });

  // Manage Permissions Modal State
  const [allPermissions, setAllPermissions] = useState([]);
  const [managePermUser, setManagePermUser] = useState(null);
  const [selectedPermIds, setSelectedPermIds] = useState([]);
  const [savingPerms, setSavingPerms] = useState(false);

  // Role Change Confirmation Modal State (Employee <-> Team Lead)
  const [roleModal, setRoleModal] = useState({
    isOpen: false,
    type: "", // "PROMOTE" | "DEMOTE"
    user: null,
    selectedTeamId: "",
    removePreviousLeadPermission: true,
    isSubmitting: false,
    error: "",
  });

  // Add User Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "employee",
    team_id: "",
    designation: "",
    department: "",
    employment_type: "Full-time",
  });

  const fetchUsersList = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    setError(null);
    try {
      const [uRes, pRes, tRes] = await Promise.all([
        getSuperiorUsers(),
        getSuperiorPermissions(),
        getSuperiorTeams().catch(() => ({ teams: DEMO_TEAMS_LIST })),
      ]);
      setUsers(uRes.users || []);
      setAllPermissions(pRes.data || []);
      if (tRes && tRes.teams && tRes.teams.length > 0) {
        setTeamsList(tRes.teams);
      } else if (Array.isArray(tRes) && tRes.length > 0) {
        setTeamsList(tRes);
      }
    } catch (err) {
      console.error("Error fetching user management list:", err);
      setError(err.message || "Failed to load user list from server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getSuperiorUsers(),
      getSuperiorPermissions(),
      getSuperiorTeams().catch(() => ({ teams: DEMO_TEAMS_LIST })),
    ])
      .then(([uRes, pRes, tRes]) => {
        if (isMounted) {
          setUsers(uRes.users || []);
          setAllPermissions(pRes.data || []);
          if (tRes && tRes.teams && tRes.teams.length > 0) {
            setTeamsList(tRes.teams);
          } else if (Array.isArray(tRes) && tRes.length > 0) {
            setTeamsList(tRes);
          }
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

  const handleOpenManagePermissions = (user) => {
    setManagePermUser(user);
    setSelectedPermIds(Array.isArray(user.permissions) ? [...user.permissions] : []);
  };

  const handleSavePermissions = async (e) => {
    e.preventDefault();
    if (!managePermUser) return;
    setSavingPerms(true);
    try {
      await updateUserPermissions(managePermUser.id, selectedPermIds, loggedInUser?.id);
      showToast(`Permissions updated for ${managePermUser.name}!`, "success");
      setManagePermUser(null);
      await fetchUsersList();
    } catch (err) {
      console.error("Error updating user permissions:", err);
      showToast(err.message || "Failed to update user permissions", "warning");
    } finally {
      setSavingPerms(false);
    }
  };

  // Role dropdown change triggered from table cell
  const handleRoleSelectChange = (user, newRole) => {
    if (user.role === newRole) return;

    if (user.role === "superior_admin") {
      showToast("Superior Admin accounts are permanently protected.", "warning");
      return;
    }

    if (loggedInUser && String(user.id) === String(loggedInUser.id)) {
      showToast("You cannot change your own role.", "warning");
      return;
    }

    if (newRole === "team_admin") {
      const defaultTeamId = user.team_id || (teamsList[0]?.id || "");
      setRoleModal({
        isOpen: true,
        type: "PROMOTE",
        user,
        selectedTeamId: defaultTeamId,
        removePreviousLeadPermission: true,
        isSubmitting: false,
        error: "",
      });
    } else if (newRole === "employee") {
      if (user.is_team_lead_of_team_id || user.incharge_of_team_id) {
        showToast(
          "This user is currently assigned as Team In-charge. Please remove or change the Team In-charge assignment before changing role.",
          "warning"
        );
        return;
      }
      setRoleModal({
        isOpen: true,
        type: "DEMOTE",
        user,
        selectedTeamId: "",
        removePreviousLeadPermission: true,
        isSubmitting: false,
        error: "",
      });
    }
  };

  const handleCloseRoleModal = () => {
    setRoleModal({
      isOpen: false,
      type: "",
      user: null,
      selectedTeamId: "",
      removePreviousLeadPermission: true,
      isSubmitting: false,
      error: "",
    });
  };

  const handleConfirmRoleChange = async (e) => {
    e.preventDefault();
    if (!roleModal.user) return;

    setRoleModal((prev) => ({ ...prev, isSubmitting: true, error: "" }));

    try {
      if (roleModal.type === "PROMOTE") {
        if (!roleModal.selectedTeamId) {
          setRoleModal((prev) => ({ ...prev, error: "Please select a team to lead.", isSubmitting: false }));
          return;
        }

        await promoteUserToTeamLead(roleModal.user.id, {
          team_id: roleModal.selectedTeamId,
          remove_previous_lead_permission: roleModal.removePreviousLeadPermission,
        });

        const teamObj = teamsList.find((t) => t.id === roleModal.selectedTeamId);
        showToast(
          `Successfully promoted ${roleModal.user.name} to Team Lead of ${teamObj ? teamObj.name : "the team"}!`,
          "success"
        );
      } else if (roleModal.type === "DEMOTE") {
        await demoteTeamLead(roleModal.user.id);
        showToast(
          `Successfully demoted ${roleModal.user.name} to Employee. Team lead assignment and approval permissions revoked.`,
          "info"
        );
      }

      handleCloseRoleModal();
      await fetchUsersList();
    } catch (err) {
      console.error("Error executing role change:", err);
      setRoleModal((prev) => ({ ...prev, error: err.message || "Failed to update role.", isSubmitting: false }));
    }
  };

  // Handle Team Change in Form to keep Department auto-synced
  const handleTeamChange = (e) => {
    const selectedTeamId = e.target.value;
    const teamObj = teamsList.find((t) => t.id === selectedTeamId) || DEMO_TEAMS_LIST.find((t) => t.id === selectedTeamId);
    setFormData((prev) => ({
      ...prev,
      team_id: selectedTeamId || "",
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
        team_id: formData.team_id || null,
        designation: formData.designation.trim() || (formData.role === "team_admin" ? "Team Lead" : "Employee"),
        department: formData.department.trim() || (formData.team_id ? "Engineering" : "General"),
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
        team_id: "",
        designation: "",
        department: "",
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

  // Open Edit User Modal
  const handleOpenEditModal = (user) => {
    setEditTarget(user);
    setEditFormError("");
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      designation: user.designation || "",
      department: user.department || "",
    });
  };

  // Submit Edit User
  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    if (!editFormData.name.trim()) {
      setEditFormError("Full Name is required.");
      return;
    }
    if (!editFormData.email.trim()) {
      setEditFormError("Email Address is required.");
      return;
    }

    setEditingUser(true);
    setEditFormError("");

    try {
      await updateSuperiorUserDetails(
        editTarget.id,
        {
          name: editFormData.name.trim(),
          email: editFormData.email.trim(),
          designation: editFormData.designation.trim(),
          department: editFormData.department.trim(),
        },
        loggedInUser?.id
      );

      showToast(`User details updated for ${editFormData.name.trim()}!`, "success");
      setEditTarget(null);
      fetchUsersList();
    } catch (err) {
      console.error("Failed to update user details:", err);
      setEditFormError(err.message || "Failed to update user details.");
      showToast(err.message || "Failed to update user details.", "warning");
    } finally {
      setEditingUser(false);
    }
  };

  // Submit Deactivate
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    setDeactivateError("");

    try {
      await deactivateUser(deactivateTarget.id, loggedInUser?.id);
      showToast("User deactivated successfully.", "info");
      setDeactivateTarget(null);
      setDeactivateError("");
      fetchUsersList();
    } catch (err) {
      console.error("Failed to deactivate user:", err);
      const errMsg = err.message || "Failed to deactivate user";
      setDeactivateError(errMsg);
      showToast(errMsg, "warning");
    } finally {
      setDeactivating(false);
    }
  };

  // Submit Activate
  const handleConfirmActivate = async () => {
    if (!activateTarget) return;
    setActivating(true);

    try {
      await activateUser(activateTarget.id, loggedInUser?.id);
      showToast("User activated successfully.", "success");
      setActivateTarget(null);
      fetchUsersList();
    } catch (err) {
      console.error("Failed to activate user:", err);
      showToast(err.message || "Failed to activate user", "warning");
    } finally {
      setActivating(false);
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
                    <th>In-charge of</th>
                    <th>Team</th>
                    <th>Designation</th>
                    <th>Permissions</th>
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
                    const isSelf = loggedInUser && String(user.id) === String(loggedInUser.id);
                    const permCount = user.approval_permissions_count !== undefined
                      ? user.approval_permissions_count
                      : Array.isArray(user.permissions)
                      ? user.permissions.length
                      : 0;

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
                                padding: "0.2rem 0.55rem",
                                borderRadius: "9999px",
                                background: "#fce7f3",
                                color: "#be185d",
                                border: "1px solid #fbcfe8",
                                textTransform: "uppercase",
                                display: "inline-block",
                              }}
                              title="Superior Admin accounts cannot be modified or demoted"
                            >
                              Superior Admin
                            </span>
                          ) : isSelf ? (
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                padding: "0.2rem 0.55rem",
                                borderRadius: "9999px",
                                background: isTeamLead ? "#f3e8ff" : "#e0f2fe",
                                color: isTeamLead ? "#7e22ce" : "#0369a1",
                                border: `1px solid ${isTeamLead ? "#e9d5ff" : "#bae6fd"}`,
                                textTransform: "uppercase",
                                display: "inline-block",
                              }}
                              title="You cannot change your own role"
                            >
                              {isTeamLead ? "Team Lead" : "Employee"} (You)
                            </span>
                          ) : (
                            <select
                              className={`editable-role-select ${isTeamLead ? "role-team-lead" : "role-employee"}`}
                              value={isTeamLead ? "team_admin" : "employee"}
                              onChange={(e) => handleRoleSelectChange(user, e.target.value)}
                              title="Change user role (opens confirmation modal)"
                            >
                              <option value="employee">Employee</option>
                              <option value="team_admin">Team Lead</option>
                            </select>
                          )}
                        </td>
                        <td>
                          {(user.is_team_lead_of_team_name || user.incharge_of_team_name) ? (
                            <span
                              style={{
                                fontSize: "0.725rem",
                                fontWeight: 700,
                                padding: "0.2rem 0.55rem",
                                borderRadius: "9999px",
                                background: "#f3e8ff",
                                color: "#6b21a8",
                                border: "1px solid #d8b4fe",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <Award size={11} />
                              <span>In-charge: {user.is_team_lead_of_team_name || user.incharge_of_team_name}</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                        <td>
                          {user.team_name && user.team_name !== "Unassigned" && user.team_id ? (
                            <div className="team-name-cell">
                              <span
                                className="team-dot"
                                style={{ backgroundColor: getTeamColor(user.team_name) }}
                              ></span>
                              <span className="font-medium" style={{ fontSize: "0.8125rem", color: "#0f172a" }}>
                                {user.team_name}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.8125rem", color: "#94a3b8", fontStyle: "italic" }}>
                              No team assigned
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: "0.8125rem", color: "#475569" }}>
                            {user.designation || "Employee"}
                          </span>
                        </td>
                        <td>
                          {permCount > 0 ? (
                            <span
                              style={{
                                fontSize: "0.725rem",
                                fontWeight: 600,
                                padding: "0.2rem 0.5rem",
                                borderRadius: "9999px",
                                background: "#e0e7ff",
                                color: "#4338ca",
                                border: "1px solid #c7d2fe",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                              title={user.permissions ? user.permissions.join("\n") : ""}
                            >
                              <Shield size={11} />
                              <span>{permCount} {permCount === 1 ? "Permission" : "Permissions"}</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>No permissions</span>
                          )}
                        </td>
                        <td>
                          {isActive ? (
                            <span className="status-pill status-pill-accepted">Active</span>
                          ) : (
                            <span className="status-pill status-pill-rejected">Inactive</span>
                          )}
                        </td>
                        <td>
                          <div className="user-action-buttons-vertical">
                            <button
                              type="button"
                              className="action-btn-vertical secondary-btn"
                              onClick={() => handleOpenManagePermissions(user)}
                              title="Manage leave approval permissions"
                            >
                              <Shield size={13} />
                              <span>Permissions</span>
                            </button>

                            <button
                              type="button"
                              className="action-btn-vertical secondary-btn"
                              onClick={() => handleConfirmResetPassword(user.id, user.name)}
                              title="Reset password for user"
                            >
                              <KeyRound size={13} />
                              <span>Reset Password</span>
                            </button>

                            <button
                              type="button"
                              className="action-btn-vertical secondary-btn"
                              onClick={() => handleOpenEditModal(user)}
                              title="Edit user details"
                            >
                              <Edit size={13} />
                              <span>Edit</span>
                            </button>

                            {isActive ? (
                              <button
                                type="button"
                                className="action-btn-vertical admin-reject-btn"
                                onClick={() => {
                                  setDeactivateError("");
                                  setDeactivateTarget(user);
                                }}
                                title="Deactivate user account"
                              >
                                <UserX size={13} />
                                <span>Deactivate User</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="action-btn-vertical admin-approve-btn"
                                onClick={() => setActivateTarget(user)}
                                title="Activate user account"
                              >
                                <CheckCircle2 size={13} />
                                <span>Activate User</span>
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
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setFormData({
                          ...formData,
                          role: newRole,
                          team_id: newRole === "superior_admin" ? "" : formData.team_id,
                        });
                      }}
                      required
                    >
                      <option value="employee">Employee</option>
                      <option value="team_admin">Team Lead (Team Admin)</option>
                      <option value="superior_admin">Superior Admin</option>
                    </select>
                  </div>

                  {formData.role !== "superior_admin" && (
                    <div className="form-group">
                      <label htmlFor="userTeam" className="form-label">
                        Assigned Team <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "normal" }}>(Optional)</span>
                      </label>
                      <select
                        id="userTeam"
                        className="form-select"
                        value={formData.team_id}
                        onChange={handleTeamChange}
                      >
                        <option value="">No team assigned</option>
                        {teamsList.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {formData.role === "superior_admin" && (
                  <div
                    style={{
                      padding: "0.65rem 0.85rem",
                      background: "#fdf2f8",
                      border: "1px solid #fbcfe8",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      color: "#9d174d",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.45rem",
                    }}
                  >
                    <Shield size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
                    <span>
                      Superior Admin users are not assigned to a team and will have system administration access.
                    </span>
                  </div>
                )}

                {formData.role === "team_admin" && (
                  formData.team_id ? (
                    <div
                      style={{
                        padding: "0.65rem 0.85rem",
                        background: "#f5f3ff",
                        border: "1px solid #ddd6fe",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        color: "#5b21b6",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.45rem",
                      }}
                    >
                      <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
                      <span>
                        Creating as <strong>Team Lead</strong> with an assigned team will automatically set this user to lead that team and grant them the configured team leave approval permission.
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "0.65rem 0.85rem",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        color: "#92400e",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.45rem",
                      }}
                    >
                      <Info size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
                      <span>
                        This user is created without a team. Assign them as Team In-charge later if they need approval access.
                      </span>
                    </div>
                  )
                )}

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
                  <span>Deactivate User</span>
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setDeactivateTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {deactivateTarget.role === "superior_admin" && (
                <div
                  style={{
                    padding: "0.75rem 0.9rem",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "8px",
                    color: "#92400e",
                    fontSize: "0.8125rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: "1px", color: "#d97706" }} />
                  <span>
                    <strong>Warning:</strong> You are deactivating a Superior Admin account. At least one active Superior Admin must remain in the system.
                  </span>
                </div>
              )}

              {deactivateError && (
                <div
                  style={{
                    padding: "0.75rem 0.9rem",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#b91c1c",
                    fontSize: "0.8125rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <AlertCircle size={17} style={{ flexShrink: 0, marginTop: "1px" }} />
                  <span>{deactivateError}</span>
                </div>
              )}

              <p style={{ fontSize: "0.875rem", color: "#0f172a", margin: 0 }}>
                Are you sure you want to deactivate this user? The user will not be able to log in, but their leave history will remain unchanged.
              </p>
              <p style={{ fontSize: "0.8125rem", color: "#475569", margin: "0.35rem 0 0 0" }}>
                Target user: <strong>{deactivateTarget.name}</strong> (<span className="font-mono">{deactivateTarget.username}</span>)
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
                {deactivating ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4C: EDIT USER DETAILS
         ========================================================================= */}
      {editTarget && (
        <div className="modal-backdrop" onClick={() => !editingUser && setEditTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div>
                <h2 style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <Edit size={18} className="text-blue" />
                  <span>Edit User Details</span>
                </h2>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                  Update user profile information. Role, permissions, and leave history remain safely preserved.
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setEditTarget(null)}
                disabled={editingUser}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser}>
              <div className="modal-body" style={{ gap: "1rem" }}>
                {editFormError && (
                  <div
                    style={{
                      padding: "0.65rem 0.85rem",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      color: "#b91c1c",
                      fontSize: "0.8125rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
                    <span>{editFormError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="editUserName" className="form-label required">
                    Full Name
                  </label>
                  <input
                    id="editUserName"
                    type="text"
                    className="form-input"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="editUserEmail" className="form-label required">
                    Email Address
                  </label>
                  <input
                    id="editUserEmail"
                    type="email"
                    className="form-input"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <input
                      type="text"
                      className="form-input"
                      value={
                        editTarget.role === "superior_admin"
                          ? "Superior Admin"
                          : editTarget.role === "team_admin"
                          ? "Team Lead"
                          : "Employee"
                      }
                      disabled
                      style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assigned Team</label>
                    <input
                      type="text"
                      className="form-input"
                      value={
                        editTarget.role === "superior_admin"
                          ? "No Team (System Admin)"
                          : editTarget.team_name || "Unassigned"
                      }
                      disabled
                      style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="editUserDesignation" className="form-label">
                      Designation / Job Title
                    </label>
                    <input
                      id="editUserDesignation"
                      type="text"
                      className="form-input"
                      value={editFormData.designation}
                      onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="editUserDepartment" className="form-label">
                      Department
                    </label>
                    <input
                      id="editUserDepartment"
                      type="text"
                      className="form-input"
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setEditTarget(null)}
                  disabled={editingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={editingUser}
                >
                  {editingUser ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4B: ACTIVATE CONFIRMATION
         ========================================================================= */}
      {activateTarget && (
        <div className="modal-backdrop" onClick={() => setActivateTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-header" style={{ background: "#ecfdf5", borderBottomColor: "#a7f3d0" }}>
              <div>
                <h2 style={{ color: "#065f46", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <CheckCircle2 size={18} style={{ color: "#10B981" }} />
                  <span>Activate User</span>
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setActivateTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: "0.875rem", color: "#0f172a", margin: 0 }}>
                Are you sure you want to activate this user again?
              </p>
              <p style={{ fontSize: "0.8125rem", color: "#475569", margin: "0.35rem 0 0 0" }}>
                Target user: <strong>{activateTarget.name}</strong> (<span className="font-mono">{activateTarget.username}</span>)
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setActivateTarget(null)}
                disabled={activating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-approve-btn"
                onClick={handleConfirmActivate}
                disabled={activating}
                style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
              >
                {activating ? "Activating..." : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: MANAGE USER PERMISSIONS
         ========================================================================= */}
      {managePermUser && (
        <div className="modal-backdrop" onClick={() => setManagePermUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "580px" }}>
            <div className="modal-header">
              <div>
                <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Shield size={18} className="text-purple" />
                  <span>Manage User Permissions</span>
                </h2>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                  Configure leave approval permissions assigned to this user.
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setManagePermUser(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePermissions}>
              <div className="modal-body" style={{ gap: "1rem" }}>
                {/* User profile summary strip */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "0.875rem", color: "#0f172a", display: "block" }}>
                      {managePermUser.name}
                    </strong>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{managePermUser.email}</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
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
                      {managePermUser.role.replace("_", " ")}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#475569",
                        background: "#f1f5f9",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "4px",
                      }}
                    >
                      Team: {managePermUser.team_name || "Unassigned"}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                      Approval Permissions
                    </label>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {selectedPermIds.length} of {allPermissions.filter((p) => p.is_active !== false).length} selected
                    </span>
                  </div>

                  {allPermissions.filter((p) => p.is_active !== false).length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: "8px" }}>
                      <p style={{ margin: 0, fontSize: "0.8125rem" }}>No active leave approval permissions configured.</p>
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem" }}>
                        Go to System Configuration &gt; Permissions to generate or create permissions first.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        maxHeight: "280px",
                        overflowY: "auto",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "0.5rem",
                        background: "#f8fafc",
                      }}
                    >
                      {allPermissions
                        .filter((p) => p.is_active !== false)
                        .map((perm) => {
                          const isChecked = selectedPermIds.includes(perm.id);
                          return (
                            <label
                              key={perm.id}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "0.65rem",
                                padding: "0.6rem 0.75rem",
                                borderRadius: "6px",
                                background: isChecked ? "#f0fdf4" : "#ffffff",
                                border: `1px solid ${isChecked ? "#86efac" : "#e2e8f0"}`,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPermIds([...selectedPermIds, perm.id]);
                                  } else {
                                    setSelectedPermIds(selectedPermIds.filter((id) => id !== perm.id));
                                  }
                                }}
                                style={{ width: "16px", height: "16px", marginTop: "0.15rem", cursor: "pointer" }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <code
                                    style={{
                                      fontFamily: "monospace",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      color: isChecked ? "#166534" : "#1e293b",
                                    }}
                                  >
                                    {perm.id}
                                  </code>
                                </div>
                                <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                                  {perm.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setManagePermUser(null)}
                  disabled={savingPerms}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={savingPerms}
                >
                  {savingPerms ? "Saving Permissions..." : `Save Permissions (${selectedPermIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: ROLE CHANGE CONFIRMATION (PROMOTE / DEMOTE)
         ========================================================================= */}
      {roleModal.isOpen && roleModal.user && (
        <div className="modal-backdrop" onClick={handleCloseRoleModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            {roleModal.type === "PROMOTE" ? (
              <>
                <div className="modal-header">
                  <div>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <Award size={18} className="text-purple" />
                      <span>Promote to Team Lead</span>
                    </h2>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                      Assign team leadership and grant leave approval permissions for {roleModal.user.name}.
                    </p>
                  </div>
                  <button className="modal-close-btn" onClick={handleCloseRoleModal}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleConfirmRoleChange}>
                  <div className="modal-body" style={{ gap: "1rem" }}>
                    {roleModal.error && (
                      <div className="form-error-alert" style={{ margin: 0 }}>
                        <AlertCircle size={16} />
                        <span>{roleModal.error}</span>
                      </div>
                    )}

                    {/* Target User Info */}
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "0.75rem 1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "0.875rem", color: "#0f172a", display: "block" }}>
                          {roleModal.user.name}
                        </strong>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{roleModal.user.email}</div>
                      </div>
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
                        Current: Employee
                      </span>
                    </div>

                    {/* Team Selection */}
                    <div className="form-group">
                      <label htmlFor="promoteTeamSelect" className="form-label required">
                        Select Team to Lead
                      </label>
                      <select
                        id="promoteTeamSelect"
                        className="form-select"
                        value={roleModal.selectedTeamId}
                        onChange={(e) => setRoleModal({ ...roleModal, selectedTeamId: e.target.value })}
                        required
                      >
                        <option value="">-- Choose a team --</option>
                        {teamsList.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name} {team.team_admin_name ? `(Current Lead: ${team.team_admin_name})` : "(Unassigned)"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Notice if team already has a lead */}
                    {(() => {
                      const selTeam = teamsList.find((t) => t.id === roleModal.selectedTeamId);
                      if (selTeam?.team_admin_name && selTeam.team_admin_name !== "Unassigned" && String(selTeam.team_admin_id) !== String(roleModal.user.id)) {
                        return (
                          <div
                            style={{
                              padding: "0.65rem 0.85rem",
                              background: "#fffbeb",
                              border: "1px solid #fde68a",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              color: "#92400e",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "0.45rem",
                            }}
                          >
                            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
                            <span>
                              <strong>{selTeam.team_admin_name}</strong> is currently assigned as the Team Lead of <strong>{selTeam.name}</strong>. Promoting {roleModal.user.name} will replace them as team lead.
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Checkbox: Remove permission from previous lead */}
                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.55rem",
                        padding: "0.6rem 0.75rem",
                        borderRadius: "6px",
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={roleModal.removePreviousLeadPermission}
                        onChange={(e) => setRoleModal({ ...roleModal, removePreviousLeadPermission: e.target.checked })}
                        style={{ marginTop: "2px", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "0.8125rem", color: "#334155", lineHeight: 1.4 }}>
                        <strong>Remove approval permission from previous team lead</strong>
                        <span style={{ display: "block", fontSize: "0.725rem", color: "#64748b" }}>
                          Revokes the team leave approval permission from the outgoing lead and demotes them to employee if they lead no other teams.
                        </span>
                      </span>
                    </label>

                    <div
                      style={{
                        padding: "0.65rem 0.85rem",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        color: "#166534",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.45rem",
                      }}
                    >
                      <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
                      <span>
                        Upon confirmation, <strong>{roleModal.user.name}</strong> will be promoted to <strong>Team Lead</strong> and automatically granted the configured leave approval permission for this team.
                      </span>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleCloseRoleModal}
                      disabled={roleModal.isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={roleModal.isSubmitting}
                    >
                      {roleModal.isSubmitting ? "Promoting..." : "Confirm Promotion to Team Lead"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="modal-header" style={{ background: "#fef3c7", borderBottomColor: "#fde68a" }}>
                  <div>
                    <h2 style={{ color: "#92400e", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <AlertTriangle size={18} className="text-amber" />
                      <span>Demote Team Lead to Employee</span>
                    </h2>
                  </div>
                  <button className="modal-close-btn" onClick={handleCloseRoleModal}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleConfirmRoleChange}>
                  <div className="modal-body" style={{ gap: "0.85rem" }}>
                    {roleModal.error && (
                      <div className="form-error-alert" style={{ margin: 0 }}>
                        <AlertCircle size={16} />
                        <span>{roleModal.error}</span>
                      </div>
                    )}

                    <p style={{ fontSize: "0.875rem", color: "#0f172a", margin: 0, lineHeight: 1.5 }}>
                      Are you sure you want to demote <strong>{roleModal.user.name}</strong> back to <strong>Employee</strong>?
                    </p>

                    <div
                      style={{
                        padding: "0.75rem 0.95rem",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: "6px",
                        fontSize: "0.8125rem",
                        color: "#78350f",
                      }}
                    >
                      <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.5 }}>
                        <li>Their Team Lead status will be removed from all led teams.</li>
                        <li>Configured team leave approval permissions will be revoked.</li>
                        <li><strong>Historical leave records and approvals are safely preserved.</strong></li>
                      </ul>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleCloseRoleModal}
                      disabled={roleModal.isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="admin-reject-btn"
                      disabled={roleModal.isSubmitting}
                      style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
                    >
                      {roleModal.isSubmitting ? "Demoting..." : "Yes, Demote to Employee"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

