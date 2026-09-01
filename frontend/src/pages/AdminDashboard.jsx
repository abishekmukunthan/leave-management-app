import { useState, useEffect, useCallback } from "react";
import { useLeave } from "../context/useLeave";
import { StatusBadge } from "../components/StatusBadge";
import {
  getAdminLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  DEMO_USERS,
} from "../services/api";
import {
  getLocalTodayString,
  formatDateOnly,
  formatDateTime,
  calculateInclusiveDays,
} from "../utils/dateUtils";

export const AdminDashboard = () => {
  const { showToast } = useLeave();

  const [leaves, setLeaves] = useState([]);
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

  const fetchAdminLeaves = useCallback(async (isManual = false) => {
    if (isManual) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await getAdminLeaveRequests();
      setLeaves(response.data || []);
    } catch (err) {
      console.error("Error loading admin leaves:", err);
      setError(err.message || "Failed to load leave requests from backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getAdminLeaveRequests()
      .then((response) => {
        if (isMounted) {
          setLeaves(response.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Error loading admin leaves:", err);
          setError(err.message || "Failed to load leave requests from backend");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleApprove = async (leaveId) => {
    setActionLoadingId(leaveId);
    try {
      const res = await approveLeaveRequest(leaveId, DEMO_USERS.ADMIN.id);
      showToast(res.message || "Leave request approved successfully!", "success");
      await fetchAdminLeaves(false);
    } catch (err) {
      console.error("Error approving leave:", err);
      showToast(err.message || "Failed to approve leave", "warning");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectConfirm = async (e) => {
    e.preventDefault();
    if (!rejectingLeaveId) return;

    setActionLoadingId(rejectingLeaveId);
    try {
      const res = await rejectLeaveRequest(
        rejectingLeaveId,
        adminRemarks.trim() || "Leave request rejected by management"
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
  // On Leave Today: status="Approved", leave_type != "Time Permission", todayStr between start_date and end_date
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
    (l) => l.status === "Waiting for Substitute Approval"
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
      const matchType = l.leave_type?.toLowerCase().includes(q);
      const matchSub = l.substitute_name?.toLowerCase().includes(q);
      const matchId = l.id?.toLowerCase().includes(q);
      return matchName || matchType || matchSub || matchId;
    }

    return true;
  });

  return (
    <div className="admin-page-container">
      {/* Header Refresh & Title Bar */}
      <div className="admin-header-row">
        <div>
          <h2 className="admin-title">Admin Management Dashboard</h2>
          <p className="admin-subtitle">
            Real-time tracking of team leave requests, approvals, and daily presence
          </p>
        </div>
        <button
          className="secondary-btn"
          onClick={() => fetchAdminLeaves(true)}
          title="Refresh All Records"
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p>⏳ Loading live admin leave data from backend...</p>
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
              <h3 className="section-title-sm">📊 Today&apos;s Overview</h3>
              <span className="text-muted text-sm">
                Date: {todayDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <div className="admin-overview-grid">
              {/* Card 1: On Leave Today */}
              <div className="overview-card card-leave-today">
                <div className="overview-card-header">
                  <div className="overview-icon icon-teal">🌴</div>
                  <span className="overview-count">{onLeaveTodayCount}</span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title">On Leave Today</h4>
                  <p className="overview-subtitle">Employees currently away</p>
                </div>
              </div>

              {/* Card 2: Time Permission Today */}
              <div className="overview-card card-permission-today">
                <div className="overview-card-header">
                  <div className="overview-icon icon-cyan">⏱️</div>
                  <span className="overview-count">{timePermissionTodayCount}</span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title">Time Permission Today</h4>
                  <p className="overview-subtitle">Short permissions active</p>
                </div>
              </div>

              {/* Card 3: Pending Admin Approvals */}
              <div className="overview-card card-pending-admin">
                <div className="overview-card-header">
                  <div className="overview-icon icon-amber">⏳</div>
                  <span className="overview-count text-amber">{pendingAdminCount}</span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title">Pending Admin Approvals</h4>
                  <p className="overview-subtitle">Awaiting your final review</p>
                </div>
              </div>

              {/* Card 4: Pending Substitute Approvals */}
              <div className="overview-card card-pending-sub">
                <div className="overview-card-header">
                  <div className="overview-icon icon-blue">👥</div>
                  <span className="overview-count text-blue">{pendingSubstituteCount}</span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title">Pending Substitute Approvals</h4>
                  <p className="overview-subtitle">Awaiting peer handover</p>
                </div>
              </div>

              {/* Card 5: Approved Requests */}
              <div className="overview-card card-approved">
                <div className="overview-card-header">
                  <div className="overview-icon icon-green">✓</div>
                  <span className="overview-count text-green">{approvedCount}</span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title">Approved Requests</h4>
                  <p className="overview-subtitle">Total approved applications</p>
                </div>
              </div>

              {/* Card 6: Rejected Requests */}
              <div className="overview-card card-rejected">
                <div className="overview-card-header">
                  <div className="overview-icon icon-red">✕</div>
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
                <h3 className="section-title">🏖️ People on Leave Today</h3>
                <p className="section-subtitle">
                  Employees with approved leave or time permission active today
                </p>
              </div>
              <span className="counter-pill">{onLeaveTodayList.length} Active</span>
            </div>

            <div className="table-card">
              {onLeaveTodayList.length === 0 ? (
                <div className="empty-state-compact">
                  <span className="empty-icon-sm">🏢</span>
                  <p>No employees are on leave or time permission today. Full attendance!</p>
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
                              {leave.substitute_name ? `👤 ${leave.substitute_name}` : "— None —"}
                            </span>
                          </td>
                          <td>
                            <div className="table-truncate-text" title={leave.assigned_work || "No assigned work"}>
                              {leave.assigned_work || "—"}
                            </div>
                          </td>
                          <td>
                            <span className="text-green font-medium" style={{ fontSize: "0.8125rem" }}>
                              ✓ {leave.approver_name || "Priya Fernando"}
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
              3. PENDING ADMIN APPROVALS
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">⏳ Pending Admin Approvals</h3>
                <p className="section-subtitle">
                  Applications accepted by substitutes requiring your administrative decision
                </p>
              </div>
              <span className="counter-pill pill-amber">{pendingAdminList.length} Action Needed</span>
            </div>

            <div className="table-card">
              {pendingAdminList.length === 0 ? (
                <div className="empty-state-compact">
                  <span className="empty-icon-sm">✨</span>
                  <p>All caught up! There are no leave requests pending admin approval.</p>
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
                        <th>Admin Decision</th>
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
                            </td>
                            <td>
                              <span className="pill-duration">{getDurationText(leave)}</span>
                            </td>
                            <td>
                              <span className="substitute-cell">
                                {leave.substitute_name ? `👤 ${leave.substitute_name}` : "— None —"}
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
                                  ✕ Reject
                                </button>
                                <button
                                  type="button"
                                  className="admin-approve-btn"
                                  disabled={isActionLoading}
                                  onClick={() => handleApprove(leave.id)}
                                  title="Approve Application"
                                >
                                  {isActionLoading ? "..." : "✓ Approve"}
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
                <h3 className="section-title">👥 Pending Substitute Approvals</h3>
                <p className="section-subtitle">
                  Applications currently awaiting duty acceptance from designated substitutes
                </p>
              </div>
              <span className="counter-pill pill-blue">{pendingSubstituteList.length} Awaiting Peer</span>
            </div>

            <div className="table-card">
              {pendingSubstituteList.length === 0 ? (
                <div className="empty-state-compact">
                  <span className="empty-icon-sm">✓</span>
                  <p>No leave applications are currently waiting for substitute review.</p>
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
                              {leave.substitute_name ? `👤 ${leave.substitute_name}` : "— None —"}
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
                <h3 className="section-title">📋 All Leave Applications History</h3>
                <p className="section-subtitle">
                  Browse, search, and filter all historical and incoming leave applications
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
                  Pending Admin ({pendingAdminCount})
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
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by employee, leave type, substitute..."
                    className="search-input"
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                  />
                  {searchEmployee && (
                    <button
                      className="search-clear"
                      onClick={() => setSearchEmployee("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table Card */}
            <div className="table-card">
              {filteredAllLeaves.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🛡️</div>
                  <h3>No Leave Applications</h3>
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
                        <th>Leave Type</th>
                        <th>Dates / Permission</th>
                        <th>Duration</th>
                        <th>Substitute</th>
                        <th>Status</th>
                        <th>Admin Decision</th>
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
                              <span className="font-semibold">{leave.leave_type}</span>
                            </td>
                            <td>
                              {leave.leave_type === "Time Permission" ? (
                                <div>📅 {formatDateOnly(leave.permission_date)}</div>
                              ) : (
                                <div>
                                  📅 {formatDateOnly(leave.start_date)} to {formatDateOnly(leave.end_date)}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className="pill-duration">{getDurationText(leave)}</span>
                            </td>
                            <td>
                              <span className="substitute-cell">
                                {leave.substitute_name
                                  ? `👤 ${leave.substitute_name}`
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
                                    ✕ Reject
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
                                    {isActionLoading ? "..." : "✓ Approve"}
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
                <h2>Admin Review: {selectedLeave.employee_name}</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedLeave(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-detail-row">
                <span className="detail-label">Status</span>
                <StatusBadge status={selectedLeave.status} />
              </div>

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

              {/* Admin Approval Details */}
              {selectedLeave.status === "Approved" && (
                <div className="admin-decision-box approval-box">
                  <div className="modal-grid-2">
                    <div className="modal-detail-item">
                      <span className="detail-label">Approved By</span>
                      <span className="detail-value font-semibold text-green">
                        ✓ {selectedLeave.approver_name || selectedLeave.approved_by || "Priya Fernando (Admin)"}
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

              {/* Admin Rejection Details */}
              {selectedLeave.status === "Rejected" && (
                <div className="admin-decision-box rejection-box">
                  <div className="modal-grid-2">
                    <div className="modal-detail-item">
                      <span className="detail-label">Rejected By</span>
                      <span className="detail-value font-semibold text-red">
                        ✕ {selectedLeave.approver_name || "Admin (Priya Fernando)"}
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
                    <span className="detail-label">Admin Remarks</span>
                    <div className="detail-textbox rejection-remarks-box">
                      {selectedLeave.admin_remarks || "No remarks provided"}
                    </div>
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

              {selectedLeave.status === "Waiting for Admin Approval" && (
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
                ✕
              </button>
            </div>
            <form onSubmit={handleRejectConfirm}>
              <div className="modal-body">
                <p style={{ fontSize: "0.875rem", color: "#475569" }}>
                  Please provide the management justification for rejecting this leave request:
                </p>
                <div className="form-group">
                  <label htmlFor="adminRemarks" className="form-label">
                    Admin Remarks / Justification
                  </label>
                  <textarea
                    id="adminRemarks"
                    className="form-textarea"
                    rows="3"
                    placeholder="e.g. Leave cannot be approved due to critical release schedule..."
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
