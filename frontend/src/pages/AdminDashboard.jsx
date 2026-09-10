import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Palmtree,
  Clock,
  Hourglass,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  X,
  Check,
  Inbox,
  Sparkles,
  Calendar,
  Building2,
  FileText,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { useLeave } from "../context/useLeave";
import { StatusBadge } from "../components/StatusBadge";
import {
  getAdminLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "../services/api";
import {
  getLocalTodayString,
  formatDateOnly,
  formatDateTime,
  calculateInclusiveDays,
} from "../utils/dateUtils";

export const AdminDashboard = () => {
  const { showToast, loggedInUser } = useLeave();

  const [leaves, setLeaves] = useState([]);
  const [noPermMessage, setNoPermMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filter & search for All Requests section
  const [allFilterStatus, setAllFilterStatus] = useState("ALL");
  const [searchEmployee, setSearchEmployee] = useState("");

  // Reject modal state
  const [rejectingLeaveId, setRejectingLeaveId] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState("");

  const currentAdminId = loggedInUser?.id || null;
  const adminName = loggedInUser?.name || "Team Lead";
  const adminTeam = loggedInUser?.department || loggedInUser?.team || "Engineering";

  const fetchAdminLeaves = useCallback(async (isManual = false) => {
    if (isManual) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await getAdminLeaveRequests(currentAdminId);
      const allRows = response.data || [];
      // Defensive client-side exclusion of current admin's own leave requests
      const filtered = currentAdminId ? allRows.filter((l) => l.employee_id !== currentAdminId) : allRows;
      setLeaves(filtered);
      if (response.message && response.message.includes("No leave approval permissions")) {
        setNoPermMessage(response.message);
      } else {
        setNoPermMessage(null);
      }
    } catch (err) {
      console.error("Error loading team leaves:", err);
      setError(err.message || "Failed to load team leave requests from backend");
    } finally {
      setLoading(false);
    }
  }, [currentAdminId]);

  useEffect(() => {
    let isMounted = true;
    getAdminLeaveRequests(currentAdminId)
      .then((response) => {
        if (isMounted) {
          const allRows = response.data || [];
          const filtered = currentAdminId ? allRows.filter((l) => l.employee_id !== currentAdminId) : allRows;
          setLeaves(filtered);
          if (response.message && response.message.includes("No leave approval permissions")) {
            setNoPermMessage(response.message);
          } else {
            setNoPermMessage(null);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Error loading team leaves:", err);
          setError(err.message || "Failed to load team leave requests from backend");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentAdminId]);

  const handleApprove = async (leaveId) => {
    if (!currentAdminId) {
      showToast("Please log in with an authorized account to approve leaves.", "warning");
      return;
    }
    const targetLeave = leaves.find((l) => l.id === leaveId) || selectedLeave;
    if (targetLeave && targetLeave.employee_id === currentAdminId) {
      showToast(
        "You cannot approve your own leave request. This leave must be approved by another authorized approver or Superior Admin.",
        "error"
      );
      return;
    }
    setActionLoadingId(leaveId);
    try {
      const res = await approveLeaveRequest(leaveId, currentAdminId);
      showToast(res.message || "Leave request approved successfully!", "success");
      await fetchAdminLeaves(false);
    } catch (err) {
      console.error("Error approving leave:", err);
      showToast(err.message || "Failed to approve leave", "warning");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectClick = (leaveId) => {
    setRejectingLeaveId(leaveId);
    setAdminRemarks("");
  };

  const handleRejectConfirm = async (e) => {
    e.preventDefault();
    if (!rejectingLeaveId) return;

    const targetLeave = leaves.find((l) => l.id === rejectingLeaveId) || selectedLeave;
    if (targetLeave && targetLeave.employee_id === currentAdminId) {
      showToast(
        "You cannot approve your own leave request. This leave must be approved by another authorized approver or Superior Admin.",
        "error"
      );
      setRejectingLeaveId(null);
      return;
    }

    setActionLoadingId(rejectingLeaveId);
    try {
      const res = await rejectLeaveRequest(
        rejectingLeaveId,
        adminRemarks.trim() || "Leave request rejected by team lead",
        currentAdminId
      );
      showToast(res.message || "Leave request rejected.", "info");
      setRejectingLeaveId(null);
      setAdminRemarks("");
      await fetchAdminLeaves(false);
    } catch (err) {
      console.error("Error rejecting leave:", err);
      showToast(err.message || "Failed to reject leave", "warning");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Duration text helper
  const getDurationText = (leave) => {
    if (leave.leave_type === "Time Permission") {
      return leave.permission_hours
        ? `${leave.permission_hours} hours`
        : "Time Permission";
    }
    const days = calculateInclusiveDays(leave.start_date, leave.end_date, leave.leave_type);
    if (days === null) {
      const startStr = formatDateOnly(leave.start_date);
      const endStr = formatDateOnly(leave.end_date);
      return startStr && endStr ? `${startStr} to ${endStr}` : "—";
    }
    if (leave.leave_type === "Half Day Leave") {
      return "0.5 days (Half Day)";
    }
    return `${days} ${days === 1 ? "day" : "days"}`;
  };

  // Today string formatted as local YYYY-MM-DD
  const todayStr = getLocalTodayString();
  const todayDateObj = new Date();

  // 1. Calculations
  const onLeaveTodayList = leaves.filter((l) => {
    if (l.status !== "Approved") return false;
    if (l.leave_type === "Time Permission") {
      const permDate = formatDateOnly(l.permission_date);
      return permDate === todayStr;
    }
    const start = formatDateOnly(l.start_date);
    const end = formatDateOnly(l.end_date);
    if (!start || !end) return false;
    return todayStr >= start && todayStr <= end;
  });

  const onLeaveTodayCount = leaves.filter((l) => {
    if (l.status !== "Approved") return false;
    if (l.leave_type === "Time Permission") return false;
    const start = formatDateOnly(l.start_date);
    const end = formatDateOnly(l.end_date);
    if (!start || !end) return false;
    return todayStr >= start && todayStr <= end;
  }).length;

  const timePermissionTodayCount = leaves.filter((l) => {
    if (l.status !== "Approved") return false;
    if (l.leave_type !== "Time Permission") return false;
    const permDate = formatDateOnly(l.permission_date);
    return permDate === todayStr;
  }).length;

  const pendingAdminList = leaves.filter(
    (l) => l.status === "Waiting for Admin Approval"
  );
  const pendingAdminCount = pendingAdminList.length;

  const pendingSubstituteList = leaves.filter(
    (l) =>
      l.status === "Waiting for Substitute Approval" &&
      l.substitute_status !== "Rejected"
  );
  const pendingSubstituteCount = pendingSubstituteList.length;

  const approvedCount = leaves.filter((l) => l.status === "Approved").length;
  const rejectedCount = leaves.filter((l) => l.status === "Rejected").length;

  // 5. All Requests / Recent Requests Filtering
  const filteredAllLeaves = leaves.filter((l) => {
    if (allFilterStatus === "PENDING_ADMIN") {
      if (l.status !== "Waiting for Admin Approval") return false;
    } else if (allFilterStatus === "WAITING_SUB") {
      if (l.status !== "Waiting for Substitute Approval") return false;
    } else if (allFilterStatus === "APPROVED") {
      if (l.status !== "Approved") return false;
    } else if (allFilterStatus === "REJECTED") {
      if (l.status !== "Rejected") return false;
    }

    if (searchEmployee.trim()) {
      const q = searchEmployee.toLowerCase();
      const matchName = l.employee_name?.toLowerCase().includes(q);
      const matchTeam = l.team_name?.toLowerCase().includes(q);
      const matchType = l.leave_type?.toLowerCase().includes(q);
      const matchSub = l.substitute_name?.toLowerCase().includes(q);
      const matchId = l.id?.toLowerCase().includes(q);
      return matchName || matchTeam || matchType || matchSub || matchId;
    }

    return true;
  });

  return (
    <div className="admin-page-container">
      {/* Header Banner */}
      <div className="admin-header-row">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 className="admin-title">Team Approvals</h2>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.2rem 0.65rem",
                borderRadius: "9999px",
                background: "#f3e8ff",
                color: "#7e22ce",
                border: "1px solid #e9d5ff",
                textTransform: "uppercase",
              }}
            >
              Approval Portal
            </span>
          </div>
          <p className="admin-subtitle">
            Managing leave applications and presence under your authorized approval permissions ({adminName})
          </p>
        </div>
        <button
          className="secondary-btn"
          onClick={() => fetchAdminLeaves(true)}
          title="Refresh Team Records"
        >
          <RefreshCw size={14} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Loading live team leave data from backend...
          </p>
        </div>
      )}

      {/* No Permissions Banner */}
      {!loading && noPermMessage && (
        <div
          className="table-card"
          style={{
            padding: "3.5rem 2rem",
            textAlign: "center",
            marginBottom: "1.5rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#fef3c7",
              color: "#d97706",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <Shield size={26} />
          </div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
            No Leave Approval Permissions Assigned
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.875rem", maxWidth: "480px", margin: "0 auto 1.25rem auto", lineHeight: 1.5 }}>
            No leave approval permissions have been assigned to your account. You need designated team approval permissions configured by Superior Admin to view and approve team leave requests.
          </p>
          <button
            className="secondary-btn"
            onClick={() => fetchAdminLeaves(true)}
            style={{ margin: "0 auto" }}
          >
            <RefreshCw size={13} />
            <span>Check Again</span>
          </button>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="form-error-alert">
          <span>⚠️ {error}</span>
          <button
            className="secondary-btn"
            onClick={() => fetchAdminLeaves(true)}
            style={{ marginLeft: "auto", padding: "0.25rem 0.75rem" }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* =========================================================================
              1. TODAY'S OVERVIEW CARDS
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header-compact">
              <h3 className="section-title-sm">
                <Building2 size={16} className="text-blue" />
                <span>{adminTeam} Team Overview</span>
              </h3>
              <span className="text-muted text-sm">
                Date: {todayDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <div className="admin-overview-grid">
              {/* Card 1: On Leave Today */}
              <div className="overview-card card-leave-today">
                <div className="overview-card-header">
                  <div className="overview-icon icon-teal">
                    <Palmtree size={18} />
                  </div>
                  <span className="overview-count">{onLeaveTodayCount}</span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title">On Leave Today</h4>
                  <p className="overview-subtitle">Members away today</p>
                </div>
              </div>

              {/* Card 2: Time Permission Today */}
              <div className="overview-card card-permission-today">
                <div className="overview-card-header">
                  <div className="overview-icon icon-cyan">
                    <Clock size={18} />
                  </div>
                  <span className="overview-count">{timePermissionTodayCount}</span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title">Time Permission Today</h4>
                  <p className="overview-subtitle">Short permissions</p>
                </div>
              </div>

              {/* Card 3: Pending Team Lead Approvals */}
              <div className="overview-card card-pending-admin">
                <div className="overview-card-header">
                  <div className="overview-icon icon-amber">
                    <Hourglass size={18} />
                  </div>
                  <span className="overview-count text-amber">{pendingAdminCount}</span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title">Pending Team Lead</h4>
                  <p className="overview-subtitle">Awaiting your review</p>
                </div>
              </div>

              {/* Card 4: Pending Substitute Approvals */}
              <div className="overview-card card-pending-sub">
                <div className="overview-card-header">
                  <div className="overview-icon icon-blue">
                    <Users size={18} />
                  </div>
                  <span className="overview-count text-blue">{pendingSubstituteCount}</span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title">Pending Substitute</h4>
                  <p className="overview-subtitle">Awaiting handover</p>
                </div>
              </div>

              {/* Card 5: Approved Requests */}
              <div className="overview-card card-approved">
                <div className="overview-card-header">
                  <div className="overview-icon icon-green">
                    <CheckCircle2 size={18} />
                  </div>
                  <span className="overview-count text-green">{approvedCount}</span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title">Approved Requests</h4>
                  <p className="overview-subtitle">Total approved in team</p>
                </div>
              </div>

              {/* Card 6: Rejected Requests */}
              <div className="overview-card card-rejected">
                <div className="overview-card-header">
                  <div className="overview-icon icon-red">
                    <XCircle size={18} />
                  </div>
                  <span className="overview-count text-red">{rejectedCount}</span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title">Rejected Requests</h4>
                  <p className="overview-subtitle">Declined applications</p>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================================
              2. PEOPLE ON LEAVE TODAY
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <Palmtree size={18} className="text-teal" />
                  <span>People on Leave Today ({adminTeam})</span>
                </h3>
                <p className="section-subtitle">
                  Team members with approved leave or time permission active today
                </p>
              </div>
              <span className="counter-pill">{onLeaveTodayList.length} Active</span>
            </div>

            <div className="table-card">
              {onLeaveTodayList.length === 0 ? (
                <div className="empty-state-compact">
                  <div className="empty-icon-sm">
                    <Building2 size={24} style={{ color: "#94a3b8" }} />
                  </div>
                  <p>No team members are on leave or time permission today. Full attendance!</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Leave Type</th>
                        <th>Duration</th>
                        <th>Substitute</th>
                        <th>Assigned Work</th>
                        <th>Approved By</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onLeaveTodayList.map((leave) => (
                        <tr key={`today-${leave.id}`}>
                          <td>
                            <div className="employee-info-cell">
                              <strong className="employee-name">
                                {leave.employee_name || "Employee"}
                              </strong>
                              <span className="employee-id-sub">
                                {leave.employee_code || leave.employee_email}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="font-semibold">{leave.leave_type}</span>
                          </td>
                          <td>
                            <span className="pill-duration">{getDurationText(leave)}</span>
                          </td>
                          <td>
                            <span className="substitute-cell">
                              {leave.substitute_name ? leave.substitute_name : "— None —"}
                            </span>
                          </td>
                          <td>
                            <div className="table-truncate-text" title={leave.assigned_work || "No assigned work"}>
                              {leave.assigned_work || "—"}
                            </div>
                          </td>
                          <td>
                            <span className="text-green font-medium" style={{ fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              <Check size={12} strokeWidth={2.5} /> {leave.approver_name || adminName}
                            </span>
                          </td>
                          <td>
                            <button
                              className="table-action-link"
                              onClick={() => setSelectedLeave(leave)}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* =========================================================================
              3. PENDING TEAM LEAD APPROVALS
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <Hourglass size={18} className="text-amber" />
                  <span>Pending Team Lead Approvals</span>
                </h3>
                <p className="section-subtitle">
                  Applications accepted by substitutes requiring your team lead decision
                </p>
              </div>
              <span className="counter-pill pill-amber">{pendingAdminList.length} Action Needed</span>
            </div>

            <div className="table-card">
              {pendingAdminList.length === 0 ? (
                <div className="empty-state-compact">
                  <div className="empty-icon-sm">
                    <Sparkles size={24} style={{ color: "#10b981" }} />
                  </div>
                  <p>All caught up! There are no leave requests pending team lead approval.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Leave Type</th>
                        <th>Duration</th>
                        <th>Substitute</th>
                        <th>Assigned Work</th>
                        <th>Team Lead Decision</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingAdminList.map((leave) => {
                        const isActionLoading = actionLoadingId === leave.id;
                        return (
                          <tr key={`admin-pending-${leave.id}`}>
                            <td>
                              <div className="employee-info-cell">
                                <strong className="employee-name">
                                  {leave.employee_name || "Employee"}
                                </strong>
                                <span className="employee-id-sub">
                                  {leave.employee_code || leave.employee_email}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="font-semibold">{leave.leave_type}</span>
                              {leave.is_paycut_leave && (
                                <span
                                  style={{
                                    display: "block",
                                    marginTop: "0.2rem",
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    padding: "0.15rem 0.5rem",
                                    borderRadius: "9999px",
                                    background: "#fef2f2",
                                    color: "#ef4444",
                                    border: "1px solid #fecaca",
                                    width: "fit-content",
                                  }}
                                >
                                  ⚠️ Exceeds Quota (Paycut)
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="pill-duration">{getDurationText(leave)}</span>
                            </td>
                            <td>
                              <span className="substitute-cell">
                                {leave.substitute_name ? leave.substitute_name : "— None —"}
                              </span>
                              {leave.substitute_status && (
                                <span className="text-muted" style={{ display: "block", fontSize: "0.75rem" }}>
                                  ({leave.substitute_status})
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="table-truncate-text" title={leave.assigned_work || "No assigned work"}>
                                {leave.assigned_work || "—"}
                              </div>
                            </td>
                            <td>
                              <div className="admin-action-buttons">
                                <button
                                  type="button"
                                  className="admin-reject-btn"
                                  disabled={isActionLoading}
                                  onClick={() => {
                                    setRejectingLeaveId(leave.id);
                                    setAdminRemarks("");
                                  }}
                                  title="Reject Application"
                                >
                                  <X size={12} strokeWidth={2.5} /> Reject
                                </button>
                                <button
                                  type="button"
                                  className="admin-approve-btn"
                                  disabled={isActionLoading}
                                  onClick={() => handleApprove(leave.id)}
                                  title="Approve Application"
                                >
                                  {isActionLoading ? "..." : <><Check size={12} strokeWidth={2.5} /> Approve</>}
                                </button>
                              </div>
                            </td>
                            <td>
                              <button
                                className="table-action-link"
                                onClick={() => setSelectedLeave(leave)}
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* =========================================================================
              4. PENDING SUBSTITUTE APPROVALS
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <Users size={18} className="text-blue" />
                  <span>Pending Substitute Approvals</span>
                </h3>
                <p className="section-subtitle">
                  Applications currently awaiting duty acceptance from designated substitutes
                </p>
              </div>
              <span className="counter-pill pill-blue">{pendingSubstituteList.length} Awaiting Peer</span>
            </div>

            <div className="table-card">
              {pendingSubstituteList.length === 0 ? (
                <div className="empty-state-compact">
                  <div className="empty-icon-sm">
                    <CheckCircle2 size={24} style={{ color: "#10b981" }} />
                  </div>
                  <p>No leave applications are currently waiting for substitute review in your team.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Leave Type</th>
                        <th>Duration</th>
                        <th>Requested Substitute</th>
                        <th>Assigned Work</th>
                        <th>Substitute Status</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingSubstituteList.map((leave) => (
                        <tr key={`sub-pending-${leave.id}`}>
                          <td>
                            <div className="employee-info-cell">
                              <strong className="employee-name">
                                {leave.employee_name || "Employee"}
                              </strong>
                              <span className="employee-id-sub">
                                {leave.employee_code || leave.employee_email}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="font-semibold">{leave.leave_type}</span>
                          </td>
                          <td>
                            <span className="pill-duration">{getDurationText(leave)}</span>
                          </td>
                          <td>
                            <span className="substitute-cell">
                              {leave.substitute_name ? leave.substitute_name : "— None —"}
                            </span>
                          </td>
                          <td>
                            <div className="table-truncate-text" title={leave.assigned_work || "No assigned work"}>
                              {leave.assigned_work || "—"}
                            </div>
                          </td>
                          <td>
                            <span className="status-pill status-pill-pending">
                              {leave.substitute_status || "Waiting for Substitute Approval"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="table-action-link"
                              onClick={() => setSelectedLeave(leave)}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* =========================================================================
              5. ALL REQUESTS / RECENT REQUESTS
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <FileText size={18} className="text-blue" />
                  <span>{adminTeam} Leave Applications History</span>
                </h3>
                <p className="section-subtitle">
                  Browse, search, and filter all historical and incoming leave applications in your team
                </p>
              </div>
            </div>

            {/* Control Bar: Filter Tabs and Search */}
            <div className="table-controls-bar">
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${allFilterStatus === "ALL" ? "tab-active" : ""}`}
                  onClick={() => setAllFilterStatus("ALL")}
                >
                  All ({leaves.length})
                </button>
                <button
                  className={`filter-tab ${allFilterStatus === "PENDING_ADMIN" ? "tab-active" : ""}`}
                  onClick={() => setAllFilterStatus("PENDING_ADMIN")}
                >
                  Pending Team Lead ({pendingAdminCount})
                </button>
                <button
                  className={`filter-tab ${allFilterStatus === "WAITING_SUB" ? "tab-active" : ""}`}
                  onClick={() => setAllFilterStatus("WAITING_SUB")}
                >
                  Waiting Substitute ({pendingSubstituteCount})
                </button>
                <button
                  className={`filter-tab ${allFilterStatus === "APPROVED" ? "tab-active" : ""}`}
                  onClick={() => setAllFilterStatus("APPROVED")}
                >
                  Approved ({approvedCount})
                </button>
                <button
                  className={`filter-tab ${allFilterStatus === "REJECTED" ? "tab-active" : ""}`}
                  onClick={() => setAllFilterStatus("REJECTED")}
                >
                  Rejected ({rejectedCount})
                </button>
              </div>

              <div className="controls-right">
                <div className="search-input-wrapper">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search employee, leave type..."
                    className="search-input"
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                  />
                  {searchEmployee && (
                    <button
                      className="search-clear"
                      onClick={() => setSearchEmployee("")}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table Card */}
            <div className="table-card">
              {filteredAllLeaves.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Inbox size={24} />
                  </div>
                  <h3>No Leave Applications Found</h3>
                  <p>
                    {searchEmployee
                      ? "No matching requests found for your search query."
                      : "No applications found under this status filter."}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Request ID</th>
                        <th>Employee Name</th>
                        <th>Team</th>
                        <th>Leave Type</th>
                        <th>Dates / Permission</th>
                        <th>Duration</th>
                        <th>Substitute</th>
                        <th>Status</th>
                        <th>Team Lead Decision</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllLeaves.map((leave) => {
                        const isAwaitingSubstitute =
                          leave.status === "Waiting for Substitute Approval";
                        const isPendingAdmin =
                          leave.status === "Waiting for Admin Approval";
                        const canDecide = isPendingAdmin || isAwaitingSubstitute;
                        const isActionLoading = actionLoadingId === leave.id;
                        const shortId = leave.id ? `LV-${leave.id.slice(0, 8)}` : "N/A";

                        return (
                          <tr key={leave.id}>
                            <td>
                              <span className="cell-id" title={leave.id}>
                                {shortId}
                              </span>
                            </td>
                            <td>
                              <div className="employee-info-cell">
                                <strong className="employee-name">
                                  {leave.employee_name || "Employee"}
                                </strong>
                                <span className="employee-id-sub">
                                  {leave.employee_code || leave.employee_email}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  padding: "0.2rem 0.55rem",
                                  borderRadius: "6px",
                                  background: "#f1f5f9",
                                  color: "#334155",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                {leave.team_name || "—"}
                              </span>
                            </td>
                            <td>
                              <span className="font-semibold">{leave.leave_type}</span>
                            </td>
                            <td>
                              {leave.leave_type === "Time Permission" ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                  <Calendar size={12} className="text-muted" />
                                  <span>{formatDateOnly(leave.permission_date)}</span>
                                </div>
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                  <Calendar size={12} className="text-muted" />
                                  <span>{formatDateOnly(leave.start_date)} to {formatDateOnly(leave.end_date)}</span>
                                </div>
                              )}
                            </td>
                            <td>
                              <span className="pill-duration">{getDurationText(leave)}</span>
                            </td>
                            <td>
                              <span className="substitute-cell">
                                {leave.substitute_name
                                  ? leave.substitute_name
                                  : "— None —"}
                              </span>
                            </td>
                            <td>
                              <StatusBadge status={leave.status} />
                            </td>
                            <td>
                              {canDecide ? (
                                <div className="admin-action-buttons">
                                  <button
                                    type="button"
                                    className="admin-reject-btn"
                                    disabled={isActionLoading}
                                    onClick={() => {
                                      setRejectingLeaveId(leave.id);
                                      setAdminRemarks("");
                                    }}
                                    title="Reject Application"
                                  >
                                    <X size={12} strokeWidth={2.5} /> Reject
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-approve-btn"
                                    disabled={isAwaitingSubstitute || isActionLoading}
                                    onClick={() => handleApprove(leave.id)}
                                    title={
                                      isAwaitingSubstitute
                                        ? "Cannot approve while awaiting substitute approval"
                                        : "Approve Application"
                                    }
                                    style={{
                                      opacity: isAwaitingSubstitute ? 0.45 : 1,
                                      cursor: isAwaitingSubstitute ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    {isActionLoading ? "..." : <><Check size={12} strokeWidth={2.5} /> Approve</>}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted text-sm">Decision Finalized</span>
                              )}
                            </td>
                            <td>
                              <button
                                className="table-action-link"
                                onClick={() => setSelectedLeave(leave)}
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* =========================================================================
          REVIEW MODAL
         ========================================================================= */}
      {selectedLeave && (
        <div className="modal-backdrop" onClick={() => setSelectedLeave(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="cell-id">{selectedLeave.id}</span>
                <h2>Team Lead Review: {selectedLeave.employee_name}</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedLeave(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-detail-row">
                <span className="detail-label">Status</span>
                <StatusBadge status={selectedLeave.status} />
              </div>

              {selectedLeave.is_paycut_leave && (
                <div
                  style={{
                    padding: "0.85rem 1.1rem",
                    borderRadius: "10px",
                    background: "#fef2f2",
                    border: "1.5px solid #fecaca",
                    marginBottom: "1.25rem",
                    color: "#991b1b",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.9375rem" }}>
                    <AlertTriangle size={18} color="#ef4444" />
                    <span>Paycut / No-pay Leave Application</span>
                  </div>
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.8125rem", color: "#7f1d1d", lineHeight: 1.4 }}>
                    {selectedLeave.quota_warning_message || "This leave application exceeds the employee's available quota."}
                  </p>
                  <div style={{ marginTop: "0.5rem", fontSize: "0.8125rem", fontWeight: 600 }}>
                    Paycut Exceeded Units: <span style={{ color: "#ef4444", fontWeight: 700 }}>{selectedLeave.paycut_units}</span> (Requested: {selectedLeave.requested_units})
                  </div>
                </div>
              )}

              <div className="modal-grid-2">
                <div className="modal-detail-item">
                  <span className="detail-label">Employee</span>
                  <span className="detail-value font-semibold">
                    {selectedLeave.employee_name} ({selectedLeave.employee_email})
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="detail-label">Leave Type</span>
                  <span className="detail-value font-semibold">
                    {selectedLeave.leave_type}
                  </span>
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="modal-detail-item">
                  <span className="detail-label">Team / Department</span>
                  <span className="detail-value font-semibold" style={{ color: "#4f46e5" }}>
                    {selectedLeave.team_name || "Unassigned"}
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="detail-label">Required Approval Permission</span>
                  <span
                    className="detail-value"
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#0f172a",
                      background: "#f8fafc",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px",
                      border: "1px solid #e2e8f0",
                      display: "inline-block",
                      wordBreak: "break-all",
                    }}
                  >
                    {selectedLeave.approval_permission_id || "None configured"}
                  </span>
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="modal-detail-item">
                  <span className="detail-label">Dates / Schedule</span>
                  <span className="detail-value">
                    {selectedLeave.leave_type === "Time Permission"
                      ? `${formatDateOnly(selectedLeave.permission_date)} (${selectedLeave.permission_hours || "Time Permission"})`
                      : `${formatDateOnly(selectedLeave.start_date)} to ${formatDateOnly(selectedLeave.end_date)}`}
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value font-semibold">
                    {getDurationText(selectedLeave)}
                  </span>
                </div>
              </div>

              <div className="modal-detail-item">
                <span className="detail-label">Designated Substitute</span>
                <span className="detail-value">
                  {selectedLeave.substitute_name
                    ? `${selectedLeave.substitute_name} (Status: ${selectedLeave.substitute_status || "Pending"})`
                    : "No substitute assigned"}
                </span>
              </div>

              <div className="modal-detail-item">
                <span className="detail-label">Employee's Reason</span>
                <div className="detail-textbox">{selectedLeave.reason}</div>
              </div>

              {selectedLeave.assigned_work && (
                <div className="modal-detail-item">
                  <span className="detail-label">Substitute Handover Tasks</span>
                  <div className="detail-textbox">{selectedLeave.assigned_work}</div>
                </div>
              )}

              {selectedLeave.substitute_remarks && (
                <div className="modal-detail-item">
                  <span className="detail-label">Substitute Remarks</span>
                  <div className="detail-textbox">{selectedLeave.substitute_remarks}</div>
                </div>
              )}

              {/* Approval Details */}
              {selectedLeave.status === "Approved" && (
                <div className="admin-decision-box approval-box">
                  <div className="modal-grid-2">
                    <div className="modal-detail-item">
                      <span className="detail-label">Approved By</span>
                      <span className="detail-value font-semibold text-green" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        <Check size={14} strokeWidth={2.5} /> {selectedLeave.approver_name || selectedLeave.approved_by || adminName}
                      </span>
                    </div>
                    <div className="modal-detail-item">
                      <span className="detail-label">Approved At</span>
                      <span className="detail-value">
                        {formatDateTime(selectedLeave.approved_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejection Details */}
              {selectedLeave.status === "Rejected" && (
                <div className="admin-decision-box rejection-box">
                  <div className="modal-grid-2">
                    <div className="modal-detail-item">
                      <span className="detail-label">Rejected By</span>
                      <span className="detail-value font-semibold text-red" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        <X size={14} strokeWidth={2.5} /> {selectedLeave.approver_name || adminName}
                      </span>
                    </div>
                    <div className="modal-detail-item">
                      <span className="detail-label">Rejected At</span>
                      <span className="detail-value">
                        {formatDateTime(selectedLeave.rejected_at)}
                      </span>
                    </div>
                  </div>

                  <div className="modal-detail-item" style={{ marginTop: "0.75rem" }}>
                    <span className="detail-label">Team Lead Remarks</span>
                    <div className="detail-textbox rejection-remarks-box">
                      {selectedLeave.admin_remarks || "No remarks provided"}
                    </div>
                  </div>
                </div>
              )}

              {/* Self-approval notice for Team Lead */}
              {selectedLeave.employee_id === currentAdminId && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "14px 16px",
                    borderRadius: "8px",
                    backgroundColor: "#fffbeb",
                    border: "1px solid #f59e0b",
                    color: "#92400e",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                  }}
                >
                  <AlertTriangle size={20} style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", color: "#b45309", marginBottom: "2px" }}>
                      Self-Approval Not Permitted
                    </strong>
                    You cannot approve your own leave request. Team Lead leave must be approved by another Team Lead or Superior Admin.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="secondary-btn"
                onClick={() => setSelectedLeave(null)}
              >
                Close
              </button>

              {selectedLeave.status === "Waiting for Admin Approval" && selectedLeave.employee_id !== currentAdminId && (
                <>
                  <button
                    type="button"
                    className="reject-btn"
                    onClick={() => {
                      const id = selectedLeave.id;
                      setSelectedLeave(null);
                      setRejectingLeaveId(id);
                      setAdminRemarks("");
                    }}
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={async () => {
                      const id = selectedLeave.id;
                      setSelectedLeave(null);
                      await handleApprove(id);
                    }}
                  >
                    Approve Application
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REJECT MODAL
         ========================================================================= */}
      {rejectingLeaveId && (
        <div className="modal-backdrop" onClick={() => setRejectingLeaveId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reject Leave Application</h2>
              <button
                className="modal-close-btn"
                onClick={() => setRejectingLeaveId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRejectConfirm}>
              <div className="modal-body">
                <p style={{ fontSize: "0.875rem", color: "#475569" }}>
                  Please provide the justification for rejecting this leave request:
                </p>
                <div className="form-group">
                  <label htmlFor="adminRemarks" className="form-label">
                    Team Lead Remarks / Justification
                  </label>
                  <textarea
                    id="adminRemarks"
                    className="form-textarea"
                    rows="3"
                    placeholder="e.g. Leave cannot be approved due to sprint release dependencies..."
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setRejectingLeaveId(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="reject-btn"
                  disabled={actionLoadingId === rejectingLeaveId}
                >
                  {actionLoadingId === rejectingLeaveId
                    ? "Rejecting..."
                    : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
