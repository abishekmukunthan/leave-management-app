import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLeave } from "../context/useLeave";
import { StatusBadge } from "../components/StatusBadge";
import { getMyLeaves, getSubstituteRequests, DEMO_USERS } from "../services/api";
import {
  formatDateOnly,
  formatAppliedDate,
} from "../utils/dateUtils";

export const EmployeeDashboard = () => {
  const { currentUser, loggedInUser } = useLeave();

  // Determine which user's data to show
  const applicantId = loggedInUser ? loggedInUser.id : DEMO_USERS.EMPLOYEE_APPLICANT.id;
  const applicantName = loggedInUser ? loggedInUser.name : DEMO_USERS.EMPLOYEE_APPLICANT.name;

  const [leaves, setLeaves] = useState([]);
  const [substituteRequests, setSubstituteRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      getMyLeaves(applicantId),
      getSubstituteRequests(applicantId),
    ]).then(([leavesRes, subRes]) => {
      if (isMounted) {
        if (leavesRes.status === "fulfilled") setLeaves(leavesRes.value.data || []);
        if (subRes.status === "fulfilled") setSubstituteRequests(subRes.value.data || []);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicantId]);

  const pendingRequests = leaves.filter(
    (l) => l.status === "Waiting for Substitute Approval" || l.status === "Waiting for Admin Approval"
  );
  const approvedRequests = leaves.filter((l) => l.status === "Approved");
  const pendingSubstituteRequests = substituteRequests.filter(
    (r) => r.substitute_status === "Waiting for Substitute Approval" || r.substitute_status === "Pending"
  );

  return (
    <div className="dashboard-page">
      {/* Pending Substitute Alert */}
      {pendingSubstituteRequests.length > 0 && (
        <div className="alert-card alert-warning">
          <div className="alert-content">
            <span className="alert-icon">🔔</span>
            <div>
              <strong>Substitute Duty Action Needed!</strong>
              <p>
                You have {pendingSubstituteRequests.length} incoming substitute request
                {pendingSubstituteRequests.length > 1 ? "s" : ""} waiting for review.
              </p>
            </div>
          </div>
          <Link to="/substitute-requests" className="alert-action-btn">Review Requests →</Link>
        </div>
      )}

      {/* Leave Balance Cards */}
      <section className="dashboard-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Leave Balances</h2>
            <p className="section-subtitle">Your available leave quotas for the current calendar year</p>
          </div>
          <Link to="/profile" className="section-link">View All Balances →</Link>
        </div>

        <div className="balance-grid">
          <div className="balance-card">
            <div className="balance-header"><span className="balance-icon icon-annual">🌴</span><span className="balance-type">Annual Leave</span></div>
            <div className="balance-values">
              <span className="balance-available">{currentUser.leaveBalances.annualLeave.total - currentUser.leaveBalances.annualLeave.used}</span>
              <span className="balance-total">/ {currentUser.leaveBalances.annualLeave.total} Days Left</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill fill-annual" style={{ width: `${(currentUser.leaveBalances.annualLeave.used / currentUser.leaveBalances.annualLeave.total) * 100}%` }}></div>
            </div>
            <span className="balance-caption">{currentUser.leaveBalances.annualLeave.used} days consumed</span>
          </div>

          <div className="balance-card">
            <div className="balance-header"><span className="balance-icon icon-sick">🩹</span><span className="balance-type">Sick Leave</span></div>
            <div className="balance-values">
              <span className="balance-available">{currentUser.leaveBalances.sickLeave.total - currentUser.leaveBalances.sickLeave.used}</span>
              <span className="balance-total">/ {currentUser.leaveBalances.sickLeave.total} Days Left</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill fill-sick" style={{ width: `${(currentUser.leaveBalances.sickLeave.used / currentUser.leaveBalances.sickLeave.total) * 100}%` }}></div>
            </div>
            <span className="balance-caption">{currentUser.leaveBalances.sickLeave.used} days consumed</span>
          </div>

          <div className="balance-card">
            <div className="balance-header"><span className="balance-icon icon-casual">☕</span><span className="balance-type">Casual Leave</span></div>
            <div className="balance-values">
              <span className="balance-available">{currentUser.leaveBalances.casualLeave.total - currentUser.leaveBalances.casualLeave.used}</span>
              <span className="balance-total">/ {currentUser.leaveBalances.casualLeave.total} Days Left</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill fill-casual" style={{ width: `${(currentUser.leaveBalances.casualLeave.used / currentUser.leaveBalances.casualLeave.total) * 100}%` }}></div>
            </div>
            <span className="balance-caption">{currentUser.leaveBalances.casualLeave.used} days consumed</span>
          </div>

          <div className="balance-card">
            <div className="balance-header"><span className="balance-icon icon-time">⏱️</span><span className="balance-type">Time Permission</span></div>
            <div className="balance-values">
              <span className="balance-available">{currentUser.leaveBalances.timePermission.total - currentUser.leaveBalances.timePermission.used}</span>
              <span className="balance-total">/ {currentUser.leaveBalances.timePermission.total} Hours Left</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill fill-time" style={{ width: `${(currentUser.leaveBalances.timePermission.used / currentUser.leaveBalances.timePermission.total) * 100}%` }}></div>
            </div>
            <span className="balance-caption">{currentUser.leaveBalances.timePermission.used} hours used this month</span>
          </div>
        </div>
      </section>

      {/* Summary Metrics */}
      <section className="summary-banner">
        <div className="summary-metric">
          <span className="metric-label">Total Applied</span>
          <span className="metric-number">{leaves.length}</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-metric">
          <span className="metric-label">Pending Approval</span>
          <span className="metric-number text-amber">{pendingRequests.length}</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-metric">
          <span className="metric-label">Approved Leaves</span>
          <span className="metric-number text-green">{approvedRequests.length}</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-action">
          <Link to="/apply-leave" className="primary-btn pulse-glow">+ New Leave Application</Link>
        </div>
      </section>

      {/* Recent Leave Requests */}
      <section className="dashboard-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Recent Leave Applications</h2>
            <p className="section-subtitle">Latest leave requests submitted by {applicantName}</p>
          </div>
          <Link to="/my-leaves" className="section-link">View All ({leaves.length}) →</Link>
        </div>

        <div className="table-card">
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center" }}><p>⏳ Loading recent leave records...</p></div>
          ) : leaves.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
              <p>No leave requests found yet. Apply for your first leave above!</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Leave Type</th>
                    <th>Duration / Schedule</th>
                    <th>Substitute</th>
                    <th>Applied On</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.slice(0, 4).map((leave) => {
                    const shortId = leave.id ? `LV-${leave.id.slice(0, 8)}` : "N/A";
                    return (
                      <tr key={leave.id}>
                        <td><span className="cell-id" title={leave.id}>{shortId}</span></td>
                        <td><span className="font-semibold">{leave.leave_type}</span></td>
                        <td>
                          {leave.leave_type === "Time Permission" ? (
                            <span>📅 {formatDateOnly(leave.permission_date)} <span className="pill-duration">{leave.permission_hours}</span></span>
                          ) : (
                            <span>📅 {formatDateOnly(leave.start_date)} to {formatDateOnly(leave.end_date)}</span>
                          )}
                        </td>
                        <td>
                          <span className="substitute-cell">
                            {leave.substitute_name ? `👤 ${leave.substitute_name}` : "— None —"}
                          </span>
                        </td>
                        <td>{formatAppliedDate(leave.created_at)}</td>
                        <td><StatusBadge status={leave.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
