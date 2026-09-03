import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  RefreshCw,
  FileText,
  Users,
  Palmtree,
  Clock,
  Hourglass,
  UserCheck,
  CheckCircle2,
  XCircle,
  Building2,
  History,
  X,
  Check,
  Inbox,
  Sparkles,
  AlertTriangle,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { useLeave } from "../context/useLeave";
import { StatusBadge } from "../components/StatusBadge";
import { getSuperiorDashboardSummary } from "../services/api";
import {
  formatDateOnly,
  formatDateTime,
  formatAppliedDate,
  calculateInclusiveDays,
} from "../utils/dateUtils";

// Color mapping for department indicators
const getTeamColor = (teamName) => {
  if (!teamName) return "#64748B";
  const name = teamName.toLowerCase();
  if (name.includes("eng")) return "#4F46E5"; // Indigo
  if (name.includes("sale")) return "#F59E0B"; // Amber
  if (name.includes("mark")) return "#EC4899"; // Pink
  if (name.includes("hr") || name.includes("human")) return "#06B6D4"; // Cyan
  if (name.includes("prod") || name.includes("design")) return "#10B981"; // Emerald
  return "#6366F1";
};

export const SuperiorDashboard = () => {
  const { showToast } = useLeave();
  const navigate = useNavigate();

  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isManual) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getSuperiorDashboardSummary();
      setSummaryData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error loading superior dashboard summary:", err);
      setError(err.message || "Failed to load cross-team dashboard summary from backend");
      if (isManual) {
        showToast("Failed to refresh dashboard summary", "warning");
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Initial fetch + Auto-refresh every 10 seconds
  useEffect(() => {
    let isMounted = true;

    getSuperiorDashboardSummary()
      .then((data) => {
        if (isMounted) {
          setSummaryData(data);
          setLastUpdated(new Date());
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Error loading superior dashboard summary:", err);
          setError(err.message || "Failed to load cross-team dashboard summary from backend");
          setLoading(false);
        }
      });

    const intervalId = setInterval(() => {
      getSuperiorDashboardSummary()
        .then((data) => {
          if (isMounted) {
            setSummaryData(data);
            setLastUpdated(new Date());
          }
        })
        .catch((err) => {
          console.error("Auto-refresh error:", err);
        });
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

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

  const overview = summaryData?.overview || {
    totalRequests: 0,
    totalAwayToday: 0,
    onLeaveToday: 0,
    timePermissionToday: 0,
    pendingTeamAdminApprovals: 0,
    pendingSubstituteApprovals: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
  };

  const teamSummary = summaryData?.teamSummary || [];
  const peopleOnLeaveToday = summaryData?.peopleOnLeaveToday || [];
  const timePermissionsToday = summaryData?.timePermissionsToday || [];
  const pendingTeamAdminApprovals = summaryData?.pendingTeamAdminApprovals || [];
  const pendingSubstituteApprovals = summaryData?.pendingSubstituteApprovals || [];
  const approvalActivity = summaryData?.approvalActivity || [];

  // Derive rejected leaves list from approvalActivity
  const rejectedLeavesList = approvalActivity.filter((l) => l.status === "Rejected");

  // Generate dynamic company insight from teamSummary data
  const getCompanyInsight = () => {
    if (!teamSummary || teamSummary.length === 0) return null;

    const teamsWithAway = [...teamSummary].filter((t) => Number(t.total_away_today) > 0);
    if (teamsWithAway.length > 0) {
      teamsWithAway.sort((a, b) => Number(b.total_away_today) - Number(a.total_away_today));
      const top = teamsWithAway[0];
      const awayCount = Number(top.total_away_today);
      const leaveCount = Number(top.on_leave_today);
      const timeCount = Number(top.time_permission_today);

      let details = "";
      if (leaveCount > 0 && timeCount > 0) {
        details = ` (${leaveCount} on leave, ${timeCount} on time permission)`;
      } else if (leaveCount > 0) {
        details = ` (${leaveCount} full/half-day leave)`;
      } else if (timeCount > 0) {
        details = ` (${timeCount} time permission)`;
      }

      return {
        title: "Daily Absence Activity",
        message: `${top.team_name} has the highest leave activity today with ${awayCount} ${awayCount === 1 ? "member" : "members"} away${details}.`,
        badge: `${top.team_name}: ${awayCount} Away`,
      };
    }

    const teamsWithPending = [...teamSummary].filter((t) => Number(t.pending_team_admin) > 0);
    if (teamsWithPending.length > 0) {
      teamsWithPending.sort((a, b) => Number(b.pending_team_admin) - Number(a.pending_team_admin));
      const top = teamsWithPending[0];
      const pendingCount = Number(top.pending_team_admin);
      return {
        title: "Review Backlog",
        message: `${top.team_name} has ${pendingCount} pending leave ${pendingCount === 1 ? "request" : "requests"} awaiting Team Lead review.`,
        badge: `${pendingCount} Pending Review`,
      };
    }

    return {
      title: "Company Attendance Snapshot",
      message: "All departments are operating at full capacity today with zero active leave or time permission requests.",
      badge: "100% Present",
    };
  };

  const insight = summaryData ? getCompanyInsight() : null;

  return (
    <div className="admin-page-container">
      {/* 1. Page Header */}
      <div className="admin-header-row">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 className="admin-title">Superior Admin Dashboard</h2>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.2rem 0.65rem",
                borderRadius: "9999px",
                background: "#FEF2F2",
                color: "#991B1B",
                border: "1px solid #FECACA",
                textTransform: "uppercase",
              }}
            >
              Organization-Wide
            </span>
          </div>
          <p className="admin-subtitle">
            Monitor company-wide leave availability and team activity.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {lastUpdated && (
            <span style={{ fontSize: "0.8125rem", color: "#64748B", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <Clock size={13} />
              <span>Last updated: <strong>{lastUpdated.toLocaleTimeString()}</strong></span>
            </span>
          )}
          <button
            className="secondary-btn"
            onClick={() => fetchDashboardData(true)}
            title="Refresh All Records"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && !summaryData && (
        <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "#64748B", fontSize: "0.875rem" }}>
            Loading live organization-wide leave summary from backend...
          </p>
        </div>
      )}

      {/* Error */}
      {error && !summaryData && (
        <div className="form-error-alert">
          <span>⚠️ {error}</span>
          <button
            className="secondary-btn"
            onClick={() => fetchDashboardData(true)}
            style={{ marginLeft: "auto", padding: "0.25rem 0.75rem" }}
          >
            Retry
          </button>
        </div>
      )}

      {summaryData && (
        <>
          {/* =========================================================================
              2. MAIN AVAILABILITY SNAPSHOT (TOP 3 PROMINENT REAL-TIME CARDS)
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header-compact">
              <h3 className="section-title-sm">
                <BarChart3 size={16} className="text-blue" />
                <span>Real-Time Availability Snapshot</span>
              </h3>
              <span className="text-muted text-sm">Auto-refreshes live</span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {/* Card 1: Total Away Right Now */}
              <div
                className="overview-card"
                style={{
                  padding: "1.5rem",
                  background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                  color: "#ffffff",
                  border: "none",
                  boxShadow: "0 10px 20px -3px rgba(79, 70, 229, 0.35)",
                }}
              >
                <div className="overview-card-header">
                  <div
                    className="overview-icon"
                    style={{
                      width: "46px",
                      height: "46px",
                      background: "rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                    }}
                  >
                    <Users size={24} />
                  </div>
                  <span className="overview-count" style={{ fontSize: "2.2rem", color: "#ffffff" }}>
                    {overview.totalAwayToday}
                  </span>
                </div>
                <div className="overview-card-body" style={{ marginTop: "0.5rem" }}>
                  <h4 className="overview-title" style={{ fontSize: "1rem", color: "#ffffff" }}>
                    Total Away Right Now
                  </h4>
                  <p className="overview-subtitle" style={{ color: "#c7d2fe" }}>
                    Combined leaves & active time permissions
                  </p>
                </div>
              </div>

              {/* Card 2: On Leave Today */}
              <div
                className="overview-card"
                style={{
                  padding: "1.5rem",
                  background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
                  border: "1.5px solid #a7f3d0",
                }}
              >
                <div className="overview-card-header">
                  <div className="overview-icon icon-teal" style={{ width: "46px", height: "46px" }}>
                    <Palmtree size={24} />
                  </div>
                  <span className="overview-count text-green" style={{ fontSize: "2.2rem" }}>
                    {overview.onLeaveToday}
                  </span>
                </div>
                <div className="overview-card-body" style={{ marginTop: "0.5rem" }}>
                  <h4 className="overview-title" style={{ fontSize: "1rem", color: "#0f172a" }}>
                    On Leave Today
                  </h4>
                  <p className="overview-subtitle">Approved full & half-day leaves</p>
                </div>
              </div>

              {/* Card 3: Time Permission Today */}
              <div
                className="overview-card"
                style={{
                  padding: "1.5rem",
                  background: "linear-gradient(135deg, #ffffff 0%, #ecfeff 100%)",
                  border: "1.5px solid #a5f3fc",
                }}
              >
                <div className="overview-card-header">
                  <div className="overview-icon icon-cyan" style={{ width: "46px", height: "46px" }}>
                    <Clock size={24} />
                  </div>
                  <span className="overview-count text-teal" style={{ fontSize: "2.2rem" }}>
                    {overview.timePermissionToday}
                  </span>
                </div>
                <div className="overview-card-body" style={{ marginTop: "0.5rem" }}>
                  <h4 className="overview-title" style={{ fontSize: "1rem", color: "#0f172a" }}>
                    Time Permission Today
                  </h4>
                  <p className="overview-subtitle">Active short duration permissions</p>
                </div>
              </div>

              {/* Card 4: Compact Eye-Catching Leave Calendar Shortcut Card */}
              <div
                className="overview-card"
                onClick={() => navigate("/calendar")}
                style={{
                  padding: "1.5rem",
                  background: "linear-gradient(135deg, #ffffff 0%, #f4f4ff 100%)",
                  border: "1.5px solid #c7d2fe",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#4f46e5";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 16px -2px rgba(79, 70, 229, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#c7d2fe";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(15, 23, 42, 0.05)";
                }}
              >
                <div className="overview-card-header">
                  <div
                    className="overview-icon"
                    style={{
                      width: "46px",
                      height: "46px",
                      borderRadius: "12px",
                      backgroundColor: "#eef2ff",
                      color: "#4f46e5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CalendarDays size={24} />
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#4f46e5",
                      backgroundColor: "#eef2ff",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "9999px",
                    }}
                  >
                    Calendar
                  </span>
                </div>
                <div className="overview-card-body" style={{ marginTop: "0.5rem" }}>
                  <h4 className="overview-title" style={{ fontSize: "1rem", color: "#0f172a" }}>
                    Leave Calendar
                  </h4>
                  <p className="overview-subtitle">
                    View monthly company-wide leave availability
                  </p>
                </div>
                <div
                  style={{
                    marginTop: "0.75rem",
                    paddingTop: "0.5rem",
                    borderTop: "1px dashed #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    color: "#4f46e5",
                  }}
                >
                  <span>Open Calendar</span>
                  <ArrowRight size={15} />
                </div>
              </div>
            </div>

            {/* Dynamic Insight Banner */}
            {insight && (
              <div className="insight-banner" style={{ marginTop: "1.25rem" }}>
                <div className="insight-content">
                  <div className="insight-icon-container">
                    <Sparkles size={18} />
                  </div>
                  <div className="insight-text-wrapper">
                    <span className="insight-heading">{insight.title}</span>
                    <p className="insight-message">{insight.message}</p>
                  </div>
                </div>
                <span className="insight-badge">{insight.badge}</span>
              </div>
            )}
          </section>

          {/* =========================================================================
              3. REQUEST SUMMARY (COMPACT GRID SECTION)
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header-compact">
              <h3 className="section-title-sm">
                <FileText size={16} className="text-blue" />
                <span>Request Summary</span>
              </h3>
              <span className="text-muted text-sm">Overall application statistics</span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "1rem",
              }}
            >
              {/* Total Requests */}
              <div className="overview-card" style={{ padding: "1rem" }}>
                <div className="overview-card-header" style={{ marginBottom: "0.35rem" }}>
                  <div className="overview-icon icon-blue">
                    <FileText size={16} />
                  </div>
                  <span className="overview-count text-blue" style={{ fontSize: "1.35rem" }}>
                    {overview.totalRequests}
                  </span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title" style={{ fontSize: "0.8125rem" }}>Total Requests</h4>
                  <p className="overview-subtitle">All submitted</p>
                </div>
              </div>

              {/* Approved Requests */}
              <div className="overview-card" style={{ padding: "1rem" }}>
                <div className="overview-card-header" style={{ marginBottom: "0.35rem" }}>
                  <div className="overview-icon icon-green">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="overview-count text-green" style={{ fontSize: "1.35rem" }}>
                    {overview.approvedRequests}
                  </span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title" style={{ fontSize: "0.8125rem" }}>Approved Requests</h4>
                  <p className="overview-subtitle">Fully approved</p>
                </div>
              </div>

              {/* Rejected Requests */}
              <div className="overview-card" style={{ padding: "1rem" }}>
                <div className="overview-card-header" style={{ marginBottom: "0.35rem" }}>
                  <div className="overview-icon icon-red">
                    <XCircle size={16} />
                  </div>
                  <span className="overview-count text-red" style={{ fontSize: "1.35rem" }}>
                    {overview.rejectedRequests}
                  </span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title" style={{ fontSize: "0.8125rem" }}>Rejected Requests</h4>
                  <p className="overview-subtitle">Declined by leads</p>
                </div>
              </div>

              {/* Pending Team Lead */}
              <div className="overview-card" style={{ padding: "1rem" }}>
                <div className="overview-card-header" style={{ marginBottom: "0.35rem" }}>
                  <div className="overview-icon icon-amber">
                    <Hourglass size={16} />
                  </div>
                  <span className="overview-count text-amber" style={{ fontSize: "1.35rem" }}>
                    {overview.pendingTeamAdminApprovals}
                  </span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title" style={{ fontSize: "0.8125rem" }}>Pending Team Lead</h4>
                  <p className="overview-subtitle">Awaiting decision</p>
                </div>
              </div>

              {/* Pending Substitute */}
              <div className="overview-card" style={{ padding: "1rem" }}>
                <div className="overview-card-header" style={{ marginBottom: "0.35rem" }}>
                  <div className="overview-icon icon-blue">
                    <UserCheck size={16} />
                  </div>
                  <span className="overview-count text-blue" style={{ fontSize: "1.35rem" }}>
                    {overview.pendingSubstituteApprovals}
                  </span>
                </div>
                <div className="overview-card-body">
                  <h4 className="overview-title" style={{ fontSize: "0.8125rem" }}>Pending Substitute</h4>
                  <p className="overview-subtitle">Awaiting peer handover</p>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================================
              4. DEPARTMENT AVAILABILITY OVERVIEW (TEAM SUMMARY TABLE)
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <Building2 size={18} className="text-blue" />
                  <span>Department Availability Overview</span>
                </h3>
                <p className="section-subtitle">Real-time attendance, quota utilization, and backlog metrics across departments</p>
              </div>
              <span className="counter-pill">{teamSummary.length} Departments</span>
            </div>

            <div className="table-card">
              {teamSummary.length === 0 ? (
                <div className="empty-state-compact">
                  <Inbox size={24} style={{ color: "#94A3B8" }} />
                  <p>No department records found.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Team Lead</th>
                        <th style={{ textAlign: "center" }}>Headcount</th>
                        <th style={{ textAlign: "center" }}>Total Requests</th>
                        <th style={{ textAlign: "center" }}>On Leave Today</th>
                        <th style={{ textAlign: "center" }}>Time Perm.</th>
                        <th style={{ textAlign: "center" }}>Total Away</th>
                        <th style={{ textAlign: "center" }}>Pending Lead</th>
                        <th style={{ textAlign: "center" }}>Pending Peer</th>
                        <th style={{ textAlign: "center" }}>Approved</th>
                        <th style={{ textAlign: "center" }}>Rejected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamSummary.map((t) => (
                        <tr key={t.team_id}>
                          <td>
                            <div className="team-name-cell">
                              <span
                                className="team-dot"
                                style={{ backgroundColor: getTeamColor(t.team_name) }}
                                title={`${t.team_name} team indicator`}
                              ></span>
                              <strong style={{ color: "#0F172A", fontSize: "0.875rem" }}>
                                {t.team_name}
                              </strong>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.8125rem", color: "#475569", fontWeight: 500 }}>
                              {t.team_admin_name || "Unassigned"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="font-semibold">{t.total_members}</span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="font-semibold">{t.total_requests}</span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={t.on_leave_today > 0 ? "count-badge count-badge-amber" : "count-badge count-badge-zero"}>
                              {t.on_leave_today}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={t.time_permission_today > 0 ? "count-badge count-badge-teal" : "count-badge count-badge-zero"}>
                              {t.time_permission_today}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={t.total_away_today > 0 ? "count-badge count-badge-amber font-bold" : "count-badge count-badge-zero"}>
                              {t.total_away_today}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={t.pending_team_admin > 0 ? "count-badge count-badge-amber" : "count-badge count-badge-zero"}>
                              {t.pending_team_admin}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={t.pending_substitute > 0 ? "count-badge count-badge-blue" : "count-badge count-badge-zero"}>
                              {t.pending_substitute}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={t.approved > 0 ? "count-badge count-badge-green" : "count-badge count-badge-zero"}>
                              {t.approved}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={t.rejected > 0 ? "count-badge count-badge-red" : "count-badge count-badge-zero"}>
                              {t.rejected}
                            </span>
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
              5. PEOPLE ON LEAVE TODAY
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <Palmtree size={18} className="text-teal" />
                  <span>People on Leave Today (Full/Half Day)</span>
                </h3>
                <p className="section-subtitle">Employees currently on approved full-day or half-day leave</p>
              </div>
              <span className="counter-pill">{peopleOnLeaveToday.length} Active</span>
            </div>

            <div className="table-card">
              {peopleOnLeaveToday.length === 0 ? (
                <div className="empty-state-compact">
                  <Building2 size={24} style={{ color: "#94A3B8" }} />
                  <p>No employees are on full/half-day leave today.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Department</th>
                        <th>Leave Type</th>
                        <th>Duration</th>
                        <th>Substitute</th>
                        <th>Assigned Work</th>
                        <th>Approved By</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {peopleOnLeaveToday.map((leave) => (
                        <tr key={`leave-today-${leave.id}`}>
                          <td>
                            <div className="employee-info-cell">
                              <strong className="employee-name">{leave.employee_name}</strong>
                              <span className="employee-id-sub">
                                {leave.employee_code || leave.employee_email}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="team-name-cell">
                              <span
                                className="team-dot"
                                style={{ backgroundColor: getTeamColor(leave.team_name) }}
                              ></span>
                              <span className="badge-default" style={{ fontSize: "0.75rem" }}>
                                {leave.team_name}
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
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "9999px",
                                  background: "#fef2f2",
                                  color: "#ef4444",
                                  border: "1px solid #fecaca",
                                  width: "fit-content",
                                }}
                              >
                                Paycut / No-pay
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
                          </td>
                          <td>
                            <div className="table-truncate-text" title={leave.assigned_work || "No work assigned"}>
                              {leave.assigned_work || "—"}
                            </div>
                          </td>
                          <td>
                            <span className="text-green font-medium" style={{ fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              <Check size={12} strokeWidth={2.5} /> {leave.approver_name || "Team Lead"}
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
              6. TIME PERMISSIONS TODAY
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <Clock size={18} className="text-cyan" />
                  <span>Time Permissions Today</span>
                </h3>
                <p className="section-subtitle">Employees on approved short duration permissions today</p>
              </div>
              <span className="counter-pill pill-blue">{timePermissionsToday.length} Active</span>
            </div>

            <div className="table-card">
              {timePermissionsToday.length === 0 ? (
                <div className="empty-state-compact">
                  <Sparkles size={24} style={{ color: "#10B981" }} />
                  <p>No active time permissions scheduled for today.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Department</th>
                        <th>Permission Hours</th>
                        <th>Substitute</th>
                        <th>Assigned Work</th>
                        <th>Approved By</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timePermissionsToday.map((leave) => (
                        <tr key={`perm-today-${leave.id}`}>
                          <td>
                            <div className="employee-info-cell">
                              <strong className="employee-name">{leave.employee_name}</strong>
                              <span className="employee-id-sub">
                                {leave.employee_code || leave.employee_email}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="team-name-cell">
                              <span
                                className="team-dot"
                                style={{ backgroundColor: getTeamColor(leave.team_name) }}
                              ></span>
                              <span className="badge-default" style={{ fontSize: "0.75rem" }}>
                                {leave.team_name}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="pill-duration">{leave.permission_hours || "Time Permission"}</span>
                          </td>
                          <td>
                            <span className="substitute-cell">
                              {leave.substitute_name ? leave.substitute_name : "— None —"}
                            </span>
                          </td>
                          <td>
                            <div className="table-truncate-text" title={leave.assigned_work || "No work assigned"}>
                              {leave.assigned_work || "—"}
                            </div>
                          </td>
                          <td>
                            <span className="text-green font-medium" style={{ fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              <Check size={12} strokeWidth={2.5} /> {leave.approver_name || "Team Lead"}
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
              7. PENDING TEAM LEAD APPROVALS
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <Hourglass size={18} className="text-amber" />
                  <span>Pending Team Lead Approvals</span>
                </h3>
                <p className="section-subtitle">
                  Applications accepted by substitutes awaiting decision by designated team leads
                </p>
              </div>
              <span className="counter-pill pill-amber">
                {pendingTeamAdminApprovals.length} Awaiting Leads
              </span>
            </div>

            <div className="table-card">
              {pendingTeamAdminApprovals.length === 0 ? (
                <div className="empty-state-compact">
                  <CheckCircle2 size={24} style={{ color: "#10B981" }} />
                  <p>No leave requests pending team lead review across all departments.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Department</th>
                        <th>Leave Type</th>
                        <th>Duration</th>
                        <th>Substitute</th>
                        <th>Assigned Work</th>
                        <th>Status</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTeamAdminApprovals.map((leave) => (
                        <tr key={`team-admin-pending-${leave.id}`}>
                          <td>
                            <div className="employee-info-cell">
                              <strong className="employee-name">{leave.employee_name}</strong>
                              <span className="employee-id-sub">
                                {leave.employee_code || leave.employee_email}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="team-name-cell">
                              <span
                                className="team-dot"
                                style={{ backgroundColor: getTeamColor(leave.team_name) }}
                              ></span>
                              <span className="badge-default" style={{ fontSize: "0.75rem" }}>
                                {leave.team_name}
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
                            <div className="table-truncate-text" title={leave.assigned_work || "No work assigned"}>
                              {leave.assigned_work || "—"}
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={leave.status} />
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
              8. PENDING SUBSTITUTE APPROVALS
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <UserCheck size={18} className="text-blue" />
                  <span>Pending Substitute Approvals</span>
                </h3>
                <p className="section-subtitle">
                  Applications currently awaiting duty acceptance from designated colleague substitutes
                </p>
              </div>
              <span className="counter-pill pill-blue">
                {pendingSubstituteApprovals.length} Awaiting Peers
              </span>
            </div>

            <div className="table-card">
              {pendingSubstituteApprovals.length === 0 ? (
                <div className="empty-state-compact">
                  <CheckCircle2 size={24} style={{ color: "#10B981" }} />
                  <p>No leave applications currently waiting for substitute handover.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Department</th>
                        <th>Leave Type</th>
                        <th>Duration</th>
                        <th>Requested Substitute</th>
                        <th>Assigned Work</th>
                        <th>Substitute Status</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingSubstituteApprovals.map((leave) => (
                        <tr key={`sub-pending-${leave.id}`}>
                          <td>
                            <div className="employee-info-cell">
                              <strong className="employee-name">{leave.employee_name}</strong>
                              <span className="employee-id-sub">
                                {leave.employee_code || leave.employee_email}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="team-name-cell">
                              <span
                                className="team-dot"
                                style={{ backgroundColor: getTeamColor(leave.team_name) }}
                              ></span>
                              <span className="badge-default" style={{ fontSize: "0.75rem" }}>
                                {leave.team_name}
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
                            <div className="table-truncate-text" title={leave.assigned_work || "No work assigned"}>
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
              9. REJECTED LEAVES SECTION
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <XCircle size={18} className="text-red" />
                  <span>Rejected Leaves</span>
                </h3>
                <p className="section-subtitle">
                  Applications declined by team leads or rejected during review
                </p>
              </div>
              <span className="counter-pill pill-red">{rejectedLeavesList.length} Rejected</span>
            </div>

            <div className="table-card">
              {rejectedLeavesList.length === 0 ? (
                <div className="empty-state-compact">
                  <CheckCircle2 size={24} style={{ color: "#10B981" }} />
                  <p>No rejected leave applications recorded.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Team / Department</th>
                        <th>Leave Type</th>
                        <th>Duration</th>
                        <th>Rejected By / Admin</th>
                        <th>Rejected At</th>
                        <th>Admin Remarks</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejectedLeavesList.map((leave) => (
                        <tr key={`rejected-${leave.id}`}>
                          <td>
                            <div className="employee-info-cell">
                              <strong className="employee-name">{leave.employee_name}</strong>
                              <span className="employee-id-sub">
                                {leave.employee_code || leave.employee_email}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="team-name-cell">
                              <span
                                className="team-dot"
                                style={{ backgroundColor: getTeamColor(leave.team_name) }}
                              ></span>
                              <span className="badge-default" style={{ fontSize: "0.75rem" }}>
                                {leave.team_name}
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
                            <span className="text-red font-medium" style={{ fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              <X size={12} strokeWidth={2.5} /> {leave.approver_name || "Team Lead"}
                            </span>
                          </td>
                          <td>
                            <span className="text-muted" style={{ fontSize: "0.8125rem" }}>
                              {formatDateTime(leave.rejected_at) !== "N/A"
                                ? formatDateTime(leave.rejected_at)
                                : formatAppliedDate(leave.updated_at)}
                            </span>
                          </td>
                          <td>
                            <div className="table-truncate-text" title={leave.admin_remarks || "No remarks provided"}>
                              {leave.admin_remarks || "—"}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* =========================================================================
              10. APPROVAL ACTIVITY
             ========================================================================= */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <History size={18} className="text-blue" />
                  <span>Approval Activity History</span>
                </h3>
                <p className="section-subtitle">
                  Audit trail of recently approved and rejected leave applications
                </p>
              </div>
              <span className="counter-pill">{approvalActivity.length} Recent</span>
            </div>

            <div className="table-card">
              {approvalActivity.length === 0 ? (
                <div className="empty-state-compact">
                  <Inbox size={24} style={{ color: "#94A3B8" }} />
                  <p>No recent approval or rejection activity recorded.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Department</th>
                        <th>Leave Type</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Decision By</th>
                        <th>Decision Date & Time</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvalActivity.map((leave) => {
                        const isApproved = leave.status === "Approved";
                        const decisionBy = leave.approver_name || "Team Lead";
                        const decisionTime = isApproved
                          ? formatDateTime(leave.approved_at)
                          : formatDateTime(leave.rejected_at);

                        return (
                          <tr key={`activity-${leave.id}`}>
                            <td>
                              <div className="employee-info-cell">
                                <strong className="employee-name">{leave.employee_name}</strong>
                                <span className="employee-id-sub">
                                  {leave.employee_code || leave.employee_email}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="team-name-cell">
                                <span
                                  className="team-dot"
                                  style={{ backgroundColor: getTeamColor(leave.team_name) }}
                                ></span>
                                <span className="badge-default" style={{ fontSize: "0.75rem" }}>
                                  {leave.team_name}
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
                              <StatusBadge status={leave.status} />
                            </td>
                            <td>
                              <span
                                className={isApproved ? "text-green font-medium" : "text-red font-medium"}
                                style={{ fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                              >
                                {isApproved ? <><Check size={12} strokeWidth={2.5} /> {decisionBy}</> : <><X size={12} strokeWidth={2.5} /> {decisionBy}</>}
                              </span>
                            </td>
                            <td>
                              <span className="text-muted" style={{ fontSize: "0.8125rem" }}>
                                {decisionTime !== "N/A" ? decisionTime : formatAppliedDate(leave.updated_at)}
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

      {/* Details Modal (Read-Only for Superior Admin) */}
      {selectedLeave && (
        <div className="modal-backdrop" onClick={() => setSelectedLeave(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="cell-id">{selectedLeave.id}</span>
                <h2>Leave Application Review: {selectedLeave.employee_name}</h2>
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
                    {selectedLeave.employee_name}
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="detail-label">Department / Team</span>
                  <div className="team-name-cell" style={{ marginTop: "0.2rem" }}>
                    <span
                      className="team-dot"
                      style={{ backgroundColor: getTeamColor(selectedLeave.team_name) }}
                    ></span>
                    <span className="detail-value font-semibold">
                      {selectedLeave.team_name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="modal-detail-item">
                  <span className="detail-label">Leave Type</span>
                  <span className="detail-value font-semibold">
                    {selectedLeave.leave_type}
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="detail-label">Applied Date</span>
                  <span className="detail-value">
                    {formatAppliedDate(selectedLeave.created_at)}
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
                  <span className="detail-label">Calculated Duration</span>
                  <span className="detail-value font-semibold text-blue">
                    {getDurationText(selectedLeave)}
                  </span>
                </div>
              </div>

              <div className="modal-detail-item">
                <span className="detail-label">Designated Substitute</span>
                <span className="detail-value font-medium">
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

              {/* Approval details */}
              {selectedLeave.status === "Approved" && (
                <div className="admin-decision-box approval-box">
                  <div className="modal-grid-2">
                    <div className="modal-detail-item">
                      <span className="detail-label">Approved By</span>
                      <span className="detail-value font-semibold text-green" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        <Check size={14} strokeWidth={2.5} /> {selectedLeave.approver_name || "Team Lead"}
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

              {/* Rejection details */}
              {selectedLeave.status === "Rejected" && (
                <div className="admin-decision-box rejection-box">
                  <div className="modal-grid-2">
                    <div className="modal-detail-item">
                      <span className="detail-label">Rejected By</span>
                      <span className="detail-value font-semibold text-red" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        <X size={14} strokeWidth={2.5} /> {selectedLeave.approver_name || "Team Lead"}
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
            </div>

            <div className="modal-footer">
              <button
                className="secondary-btn"
                onClick={() => setSelectedLeave(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
