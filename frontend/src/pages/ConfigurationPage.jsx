import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Edit2,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Layers,
  Save,
  CheckCircle2,
  Power,
  Shield,
} from "lucide-react";
import { useLeave } from "../context/useLeave";
import {
  getSuperiorTeams,
  createSuperiorTeam,
  updateSuperiorTeam,
  deactivateSuperiorTeam,
  getSuperiorLeaveTypes,
  createSuperiorLeaveType,
  updateSuperiorLeaveType,
  deactivateSuperiorLeaveType,
  getSuperiorUsers,
  getSuperiorUserLeaveEntitlements,
  updateSuperiorUserLeaveEntitlements,
} from "../services/api";

const getTeamColor = (teamName) => {
  if (!teamName) return "#64748B";
  const name = teamName.toLowerCase();
  if (name.includes("eng")) return "#4F46E5";
  if (name.includes("sale")) return "#F59E0B";
  if (name.includes("mark")) return "#EC4899";
  if (name.includes("hr") || name.includes("human")) return "#06B6D4";
  return "#6366F1";
};

export const ConfigurationPage = () => {
  const { showToast } = useLeave();

  // Navigation Tab State: 'teams' | 'leave-types' | 'quotas'
  const [activeTab, setActiveTab] = useState("teams");

  // General Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Teams State
  const [teams, setTeams] = useState([]);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm, setTeamForm] = useState({ name: "", team_admin_id: "" });
  const [teamFormError, setTeamFormError] = useState("");
  const [submittingTeam, setSubmittingTeam] = useState(false);

  // Leave Types State
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [ltModalOpen, setLtModalOpen] = useState(false);
  const [editingLt, setEditingLt] = useState(null);
  const [ltForm, setLtForm] = useState({
    name: "",
    code: "",
    unit: "days",
    default_quota: 5,
    requires_substitute: true,
  });
  const [ltFormError, setLtFormError] = useState("");
  const [submittingLt, setSubmittingLt] = useState(false);

  // Quotas / Entitlements State
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserObj, setSelectedUserObj] = useState(null);
  const [entitlements, setEntitlements] = useState([]);
  const [quotasLoading, setQuotasLoading] = useState(false);
  const [savingQuotas, setSavingQuotas] = useState(false);

  // Fetch Teams
  // Load All Configuration Data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, ltRes, uRes] = await Promise.all([
        getSuperiorTeams(),
        getSuperiorLeaveTypes(),
        getSuperiorUsers(),
      ]);
      setTeams(tRes.teams || []);
      setLeaveTypes(ltRes.leaveTypes || []);
      setAllUsers(uRes.users || []);
    } catch (err) {
      console.error("Error loading config data:", err);
      setError(err.message || "Failed to load configuration data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getSuperiorTeams(), getSuperiorLeaveTypes(), getSuperiorUsers()])
      .then(([tRes, ltRes, uRes]) => {
        if (isMounted) {
          setTeams(tRes.teams || []);
          setLeaveTypes(ltRes.leaveTypes || []);
          setAllUsers(uRes.users || []);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load configuration data");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Fetching Employee Entitlements when Selected User Changes
  useEffect(() => {
    let isMounted = true;
    if (!selectedUserId) {
      return;
    }
    getSuperiorUserLeaveEntitlements(selectedUserId)
      .then((res) => {
        if (isMounted) {
          setSelectedUserObj(res.employee || null);
          setEntitlements(res.entitlements || []);
        }
      })
      .catch((err) => {
        if (isMounted) showToast(err.message || "Failed to load user leave quotas", "warning");
      })
      .finally(() => {
        if (isMounted) setQuotasLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedUserId, showToast]);

  // Handle User Change in Quotas Tab
  const handleSelectUserForQuotas = (userId) => {
    setSelectedUserId(userId);
    if (!userId) {
      setSelectedUserObj(null);
      setEntitlements([]);
    } else {
      setQuotasLoading(true);
    }
  };

  // =========================================================================
  // TEAM HANDLERS
  // =========================================================================
  const handleOpenAddTeam = () => {
    setEditingTeam(null);
    setTeamForm({ name: "", team_admin_id: "" });
    setTeamFormError("");
    setTeamModalOpen(true);
  };

  const handleOpenEditTeam = (team) => {
    setEditingTeam(team);
    setTeamForm({
      name: team.name || "",
      team_admin_id: team.team_admin_id || "",
    });
    setTeamFormError("");
    setTeamModalOpen(true);
  };

  const handleTeamFormSubmit = async (e) => {
    e.preventDefault();
    setTeamFormError("");

    if (!teamForm.name.trim()) {
      setTeamFormError("Team Name is required.");
      return;
    }

    setSubmittingTeam(true);
    try {
      if (editingTeam) {
        await updateSuperiorTeam(editingTeam.id, {
          name: teamForm.name.trim(),
          team_admin_id: teamForm.team_admin_id || null,
        });
        showToast(`Team "${teamForm.name}" updated successfully!`, "success");
      } else {
        await createSuperiorTeam({
          name: teamForm.name.trim(),
          team_admin_id: teamForm.team_admin_id || null,
        });
        showToast(`Team "${teamForm.name}" created successfully!`, "success");
      }
      setTeamModalOpen(false);
      fetchTeams();
    } catch (err) {
      console.error("Error submitting team:", err);
      setTeamFormError(err.message || "Failed to save team");
    } finally {
      setSubmittingTeam(false);
    }
  };

  const handleDeactivateTeam = async (team) => {
    if (!window.confirm(`Are you sure you want to deactivate the "${team.name}" team?`)) {
      return;
    }
    try {
      await deactivateSuperiorTeam(team.id);
      showToast(`Team "${team.name}" deactivated.`, "info");
      fetchTeams();
    } catch (err) {
      console.error("Error deactivating team:", err);
      showToast(err.message || "Failed to deactivate team", "warning");
    }
  };

  // =========================================================================
  // LEAVE TYPE HANDLERS
  // =========================================================================
  const handleOpenAddLt = () => {
    setEditingLt(null);
    setLtForm({
      name: "",
      code: "",
      unit: "days",
      default_quota: 5,
      requires_substitute: true,
    });
    setLtFormError("");
    setLtModalOpen(true);
  };

  const handleOpenEditLt = (lt) => {
    setEditingLt(lt);
    setLtForm({
      name: lt.name || "",
      code: lt.code || "",
      unit: lt.unit || "days",
      default_quota: parseFloat(lt.default_quota) || 0,
      requires_substitute: lt.requires_substitute !== false,
    });
    setLtFormError("");
    setLtModalOpen(true);
  };

  const handleLtFormSubmit = async (e) => {
    e.preventDefault();
    setLtFormError("");

    if (!ltForm.name.trim()) {
      setLtFormError("Leave Type Name is required.");
      return;
    }
    if (!ltForm.code.trim()) {
      setLtFormError("Leave Type Code is required.");
      return;
    }

    setSubmittingLt(true);
    try {
      if (editingLt) {
        await updateSuperiorLeaveType(editingLt.id, {
          name: ltForm.name.trim(),
          code: ltForm.code.trim().toUpperCase(),
          unit: ltForm.unit,
          default_quota: parseFloat(ltForm.default_quota) || 0,
          requires_substitute: Boolean(ltForm.requires_substitute),
        });
        showToast(`Leave Type "${ltForm.name}" updated successfully!`, "success");
      } else {
        await createSuperiorLeaveType({
          name: ltForm.name.trim(),
          code: ltForm.code.trim().toUpperCase(),
          unit: ltForm.unit,
          default_quota: parseFloat(ltForm.default_quota) || 0,
          requires_substitute: Boolean(ltForm.requires_substitute),
        });
        showToast(`Leave Type "${ltForm.name}" created successfully!`, "success");
      }
      setLtModalOpen(false);
      fetchLeaveTypes();
    } catch (err) {
      console.error("Error submitting leave type:", err);
      setLtFormError(err.message || "Failed to save leave type");
    } finally {
      setSubmittingLt(false);
    }
  };

  const handleDeactivateLt = async (lt) => {
    if (!window.confirm(`Are you sure you want to deactivate "${lt.name}"?`)) {
      return;
    }
    try {
      await deactivateSuperiorLeaveType(lt.id);
      showToast(`Leave Type "${lt.name}" deactivated.`, "info");
      fetchLeaveTypes();
    } catch (err) {
      console.error("Error deactivating leave type:", err);
      showToast(err.message || "Failed to deactivate leave type", "warning");
    }
  };

  // =========================================================================
  // QUOTA / ENTITLEMENT HANDLERS
  // =========================================================================
  const handleAllocatedChange = (leaveTypeId, val) => {
    const parsedVal = parseFloat(val);
    const newAlloc = isNaN(parsedVal) ? 0 : parsedVal;

    setEntitlements((prev) =>
      prev.map((item) => {
        if (item.leave_type_id === leaveTypeId) {
          const usedVal = parseFloat(item.used) || 0;
          const remainingVal = Math.max(0, newAlloc - usedVal);
          return {
            ...item,
            allocated: newAlloc,
            remaining: remainingVal,
          };
        }
        return item;
      })
    );
  };

  const handleSaveQuotas = async () => {
    if (!selectedUserId) return;
    setSavingQuotas(true);

    try {
      const payload = entitlements.map((item) => ({
        leave_type_id: item.leave_type_id,
        allocated: parseFloat(item.allocated) || 0,
      }));

      await updateSuperiorUserLeaveEntitlements(selectedUserId, payload);
      showToast("Employee leave quotas updated successfully!", "success");
      const res = await getSuperiorUserLeaveEntitlements(selectedUserId);
      setEntitlements(res.entitlements || []);
    } catch (err) {
      console.error("Error updating leave quotas:", err);
      showToast(err.message || "Failed to update leave quotas", "warning");
    } finally {
      setSavingQuotas(false);
    }
  };

  // Filter team admin candidates from allUsers
  const teamAdminCandidates = allUsers.filter(
    (u) => u.is_active !== false && u.role !== "superior_admin"
  );

  return (
    <div className="admin-page-container">
      {/* Header Row */}
      <div className="admin-header-row">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 className="admin-title">System Configuration</h2>
            <span className="counter-pill pill-blue">Master Controls</span>
          </div>
          <p className="admin-subtitle">
            Manage teams, leave policies, and employee leave quotas.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            className="secondary-btn"
            onClick={loadAllData}
            title="Refresh All Configurations"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="table-controls-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === "teams" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("teams")}
          >
            <Users size={14} style={{ marginRight: "0.35rem" }} />
            Teams ({teams.length})
          </button>
          <button
            className={`filter-tab ${activeTab === "leave-types" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("leave-types")}
          >
            <Clock size={14} style={{ marginRight: "0.35rem" }} />
            Leave Types ({leaveTypes.length})
          </button>
          <button
            className={`filter-tab ${activeTab === "quotas" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("quotas")}
          >
            <Layers size={14} style={{ marginRight: "0.35rem" }} />
            Leave Quotas
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="form-error-alert" style={{ marginBottom: "1.25rem" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Loading configuration data...
          </p>
        </div>
      )}

      {/* =========================================================================
          TAB 1: TEAMS MANAGEMENT
         ========================================================================= */}
      {!loading && activeTab === "teams" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>
              Active & Configured Organization Teams
            </span>
            <button className="primary-btn" onClick={handleOpenAddTeam}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Team</span>
            </button>
          </div>

          <div className="table-card">
            {teams.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Users size={24} />
                </div>
                <h3>No Teams Found</h3>
                <p>Create your first team to assign employees and team leads.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Team Name</th>
                      <th>Team Lead / Admin</th>
                      <th>Total Members</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => {
                      const isActive = team.is_active !== false;

                      return (
                        <tr key={team.id}>
                          <td>
                            <div className="team-name-cell">
                              <span
                                className="team-dot"
                                style={{ backgroundColor: getTeamColor(team.name) }}
                              ></span>
                              <strong className="font-semibold" style={{ color: "#0f172a" }}>
                                {team.name}
                              </strong>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                              <Shield size={14} className="text-purple" />
                              <span className="font-medium" style={{ fontSize: "0.8125rem", color: "#334155" }}>
                                {team.team_admin_name || "Unassigned"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="counter-pill pill-blue">
                              {team.total_members || 0} Members
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
                                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                                onClick={() => handleOpenEditTeam(team)}
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              {isActive && (
                                <button
                                  type="button"
                                  className="admin-reject-btn"
                                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                                  onClick={() => handleDeactivateTeam(team)}
                                >
                                  <Power size={13} />
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
        </div>
      )}

      {/* =========================================================================
          TAB 2: LEAVE TYPES MANAGEMENT
         ========================================================================= */}
      {!loading && activeTab === "leave-types" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>
              Leave Policies & Calculation Rules
            </span>
            <button className="primary-btn" onClick={handleOpenAddLt}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Leave Type</span>
            </button>
          </div>

          <div className="table-card">
            {leaveTypes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Clock size={24} />
                </div>
                <h3>No Leave Types Configured</h3>
                <p>Add leave types to define company leave policies.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Code</th>
                      <th>Unit</th>
                      <th>Default Quota</th>
                      <th>Requires Substitute</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveTypes.map((lt) => {
                      const isActive = lt.is_active !== false;

                      return (
                        <tr key={lt.id}>
                          <td>
                            <strong className="font-semibold" style={{ color: "#0f172a" }}>
                              {lt.name}
                            </strong>
                          </td>
                          <td>
                            <span className="cell-id">{lt.code}</span>
                          </td>
                          <td>
                            <span
                              style={{
                                textTransform: "capitalize",
                                fontWeight: 600,
                                fontSize: "0.8125rem",
                                color: lt.unit === "hours" ? "#06b6d4" : "#4f46e5",
                              }}
                            >
                              {lt.unit}
                            </span>
                          </td>
                          <td>
                            <span className="font-mono font-semibold" style={{ fontSize: "0.875rem" }}>
                              {parseFloat(lt.default_quota)} {lt.unit}
                            </span>
                          </td>
                          <td>
                            {lt.requires_substitute ? (
                              <span className="badge badge-substitute-assigned">
                                <Check size={11} style={{ marginRight: "3px" }} /> Required
                              </span>
                            ) : (
                              <span className="badge badge-substitute-not-assigned">Not Required</span>
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
                            <div className="admin-action-buttons">
                              <button
                                type="button"
                                className="secondary-btn"
                                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                                onClick={() => handleOpenEditLt(lt)}
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              {isActive && (
                                <button
                                  type="button"
                                  className="admin-reject-btn"
                                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                                  onClick={() => handleDeactivateLt(lt)}
                                >
                                  <Power size={13} />
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
        </div>
      )}

      {/* =========================================================================
          TAB 3: LEAVE QUOTAS / ENTITLEMENTS
         ========================================================================= */}
      {!loading && activeTab === "quotas" && (
        <div>
          {/* Employee Selection Section */}
          <div
            className="table-card"
            style={{
              padding: "1.25rem",
              marginBottom: "1.25rem",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flex: 1, minWidth: "280px" }}>
              <Users size={20} className="text-blue" />
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="quotaUserSelect"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#64748b",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Select Employee Account
                </label>
                <select
                  id="quotaUserSelect"
                  className="form-select"
                  value={selectedUserId}
                  onChange={(e) => handleSelectUserForQuotas(e.target.value)}
                  style={{ maxWidth: "420px" }}
                >
                  <option value="">-- Choose Employee --</option>
                  {allUsers
                    .filter((u) => u.is_active !== false)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role}) — {u.team_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {selectedUserId && entitlements.length > 0 && (
              <button
                className="primary-btn"
                onClick={handleSaveQuotas}
                disabled={savingQuotas}
                style={{ padding: "0.6rem 1.25rem" }}
              >
                <Save size={15} />
                <span>{savingQuotas ? "Saving Changes..." : "Save Quota Changes"}</span>
              </button>
            )}
          </div>

          {/* Entitlements Table */}
          {!selectedUserId ? (
            <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
              <div className="empty-icon" style={{ margin: "0 auto 1rem auto" }}>
                <Layers size={24} />
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                Select an Employee Above
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: 0 }}>
                Choose an employee account from the dropdown to view and customize their leave quotas.
              </p>
            </div>
          ) : quotasLoading ? (
            <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
                Loading leave entitlements...
              </p>
            </div>
          ) : (
            <div className="table-card">
              {selectedUserObj && (
                <div
                  style={{
                    padding: "1rem 1.25rem",
                    borderBottom: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a" }}>
                      {selectedUserObj.name}
                    </span>
                    <span style={{ fontSize: "0.8125rem", color: "#64748b", marginLeft: "0.5rem" }}>
                      ({selectedUserObj.username || selectedUserObj.email})
                    </span>
                  </div>
                  <span className="badge badge-info">Current Year Allocations</span>
                </div>
              )}

              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Unit</th>
                      <th>Allocated Quota</th>
                      <th>Used</th>
                      <th>Remaining Balance</th>
                      <th>Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entitlements.map((item) => (
                      <tr key={item.leave_type_id}>
                        <td>
                          <strong className="font-semibold" style={{ color: "#0f172a" }}>
                            {item.leave_type_name}
                          </strong>
                          <span className="cell-id" style={{ marginLeft: "0.5rem" }}>
                            {item.leave_type_code}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              textTransform: "capitalize",
                              fontWeight: 600,
                              fontSize: "0.8125rem",
                              color: item.leave_type_unit === "hours" ? "#06b6d4" : "#4f46e5",
                            }}
                          >
                            {item.leave_type_unit}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", maxWidth: "140px" }}>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="form-input"
                              style={{
                                padding: "0.35rem 0.5rem",
                                fontSize: "0.875rem",
                                fontWeight: 700,
                                color: "#4f46e5",
                              }}
                              value={item.allocated}
                              onChange={(e) =>
                                handleAllocatedChange(item.leave_type_id, e.target.value)
                              }
                            />
                          </div>
                        </td>
                        <td>
                          <span className="font-mono font-medium" style={{ color: "#64748b" }}>
                            {parseFloat(item.used)}
                          </span>
                        </td>
                        <td>
                          <span
                            className="font-mono font-bold"
                            style={{
                              fontSize: "0.9375rem",
                              color: item.remaining > 0 ? "#10b981" : "#ef4444",
                            }}
                          >
                            {parseFloat(item.remaining)}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted" style={{ fontSize: "0.8125rem" }}>
                            {item.year}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "flex-end",
                  background: "#ffffff",
                }}
              >
                <button
                  className="primary-btn"
                  onClick={handleSaveQuotas}
                  disabled={savingQuotas}
                >
                  <CheckCircle2 size={15} />
                  <span>{savingQuotas ? "Saving..." : "Save Quotas"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT TEAM
         ========================================================================= */}
      {teamModalOpen && (
        <div className="modal-backdrop" onClick={() => setTeamModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div>
                <h2>{editingTeam ? "Edit Team Details" : "Create New Team"}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setTeamModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTeamFormSubmit}>
              <div className="modal-body" style={{ gap: "1rem" }}>
                {teamFormError && (
                  <div className="form-error-alert">
                    <AlertCircle size={16} />
                    <span>{teamFormError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="teamName" className="form-label required">
                    Team Name
                  </label>
                  <input
                    id="teamName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Quality Assurance"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="teamAdminSelect" className="form-label">
                    Team Lead / Manager (Team Admin)
                  </label>
                  <select
                    id="teamAdminSelect"
                    className="form-select"
                    value={teamForm.team_admin_id}
                    onChange={(e) => setTeamForm({ ...teamForm, team_admin_id: e.target.value })}
                  >
                    <option value="">-- Select Team Lead --</option>
                    {teamAdminCandidates.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setTeamModalOpen(false)}
                  disabled={submittingTeam}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submittingTeam}
                >
                  {submittingTeam ? "Saving..." : editingTeam ? "Update Team" : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT LEAVE TYPE
         ========================================================================= */}
      {ltModalOpen && (
        <div className="modal-backdrop" onClick={() => setLtModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div>
                <h2>{editingLt ? "Edit Leave Policy" : "Create New Leave Type"}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setLtModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLtFormSubmit}>
              <div className="modal-body" style={{ gap: "1rem" }}>
                {ltFormError && (
                  <div className="form-error-alert">
                    <AlertCircle size={16} />
                    <span>{ltFormError}</span>
                  </div>
                )}

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="ltName" className="form-label required">
                      Leave Type Name
                    </label>
                    <input
                      id="ltName"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Study Leave"
                      value={ltForm.name}
                      onChange={(e) => setLtForm({ ...ltForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ltCode" className="form-label required">
                      System Code
                    </label>
                    <input
                      id="ltCode"
                      type="text"
                      className="form-input font-mono"
                      placeholder="e.g. STUDY"
                      value={ltForm.code}
                      onChange={(e) => setLtForm({ ...ltForm, code: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="ltUnit" className="form-label required">
                      Calculation Unit
                    </label>
                    <select
                      id="ltUnit"
                      className="form-select"
                      value={ltForm.unit}
                      onChange={(e) => setLtForm({ ...ltForm, unit: e.target.value })}
                    >
                      <option value="days">Days</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="ltQuota" className="form-label required">
                      Default Annual Quota
                    </label>
                    <input
                      id="ltQuota"
                      type="number"
                      min="0"
                      step="0.5"
                      className="form-input"
                      value={ltForm.default_quota}
                      onChange={(e) => setLtForm({ ...ltForm, default_quota: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    id="ltSubCheck"
                    type="checkbox"
                    checked={ltForm.requires_substitute}
                    onChange={(e) => setLtForm({ ...ltForm, requires_substitute: e.target.checked })}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label htmlFor="ltSubCheck" className="form-label" style={{ margin: 0, cursor: "pointer" }}>
                    Requires Substitute Employee Approval
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setLtModalOpen(false)}
                  disabled={submittingLt}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submittingLt}
                >
                  {submittingLt ? "Saving..." : editingLt ? "Update Leave Policy" : "Create Leave Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
