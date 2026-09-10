import { useState } from "react";
import {
  Calendar,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Users,
  Building,
  TrendingUp,
  Search,
} from "lucide-react";
import { useLeave } from "../context/useLeave";
import {
  getLeaveSummaryReport,
  downloadLeaveSummaryExcel,
  downloadLeaveSummaryPdf,
} from "../services/api";

export const ReportsPage = () => {
  const { loggedInUser, showToast } = useLeave();

  // Helper for current month default dates (YYYY-MM-DD)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const firstDayOfMonth = `${year}-${month}-01`;
  const todayStr = now.toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(todayStr);

  const [loading, setLoading] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState("details"); // 'details' | 'employee' | 'team' | 'exceptions'
  const [searchTerm, setSearchTerm] = useState("");

  const isDateRangeValid = Boolean(fromDate && toDate && fromDate <= toDate);

  // Quick Date Range Helpers
  const handleSetQuickRange = (rangeType) => {
    const current = new Date();
    if (rangeType === "this_month") {
      const start = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-01`;
      setFromDate(start);
      setToDate(current.toISOString().split("T")[0]);
    } else if (rangeType === "last_30_days") {
      const past = new Date(current.getTime() - 30 * 24 * 60 * 60 * 1000);
      setFromDate(past.toISOString().split("T")[0]);
      setToDate(current.toISOString().split("T")[0]);
    } else if (rangeType === "year_to_date") {
      setFromDate(`${current.getFullYear()}-01-01`);
      setToDate(current.toISOString().split("T")[0]);
    }
  };

  // Generate Report Handler
  const handleGenerateReport = async (e) => {
    if (e) e.preventDefault();

    if (!fromDate) {
      showToast("From Date is required.", "warning");
      return;
    }
    if (!toDate) {
      showToast("To Date is required.", "warning");
      return;
    }
    if (fromDate > toDate) {
      showToast("From Date cannot be after To Date.", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await getLeaveSummaryReport(fromDate, toDate, loggedInUser?.id);
      setReportData(res.report);
      showToast("Leave summary report generated successfully.", "success");
    } catch (err) {
      console.error("Failed to generate report:", err);
      showToast(err.message || "Failed to generate report", "warning");
    } finally {
      setLoading(false);
    }
  };

  // Download Excel Handler
  const handleDownloadExcel = async () => {
    if (!isDateRangeValid) {
      showToast("Please select a valid date range before downloading.", "warning");
      return;
    }
    setDownloadingExcel(true);
    try {
      await downloadLeaveSummaryExcel(fromDate, toDate, loggedInUser?.id);
      showToast("Excel report downloaded successfully.", "success");
    } catch (err) {
      console.error("Excel download failed:", err);
      showToast(err.message || "Failed to download Excel report.", "warning");
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    if (!isDateRangeValid) {
      showToast("Please select a valid date range before downloading.", "warning");
      return;
    }
    setDownloadingPdf(true);
    try {
      await downloadLeaveSummaryPdf(fromDate, toDate, loggedInUser?.id);
      showToast("PDF report downloaded successfully.", "success");
    } catch (err) {
      console.error("PDF download failed:", err);
      showToast(err.message || "Failed to download PDF report.", "warning");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Filtered details
  const filteredDetails = (reportData?.details || []).filter((d) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (d.employee_name || "").toLowerCase().includes(term) ||
      (d.department_name || "").toLowerCase().includes(term) ||
      (d.leave_type || "").toLowerCase().includes(term) ||
      (d.status || "").toLowerCase().includes(term) ||
      (d.substitute_name || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-header-row">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 className="admin-title">Reports & Analytics</h2>
            <span className="counter-pill pill-blue">Leave Summary Report</span>
          </div>
          <p className="admin-subtitle">
            Generate executive leave analytics, review company-wide time-off metrics, and export reports in Excel or PDF format.
          </p>
        </div>
      </div>

      {/* Date Range Selection & Action Bar */}
      <div
        className="card"
        style={{
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <form onSubmit={handleGenerateReport}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: "1rem",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "1rem" }}>
              {/* From Date */}
              <div className="form-group" style={{ marginBottom: 0, minWidth: "160px" }}>
                <label htmlFor="reportFromDate" className="form-label required">
                  From Date
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="reportFromDate"
                    type="date"
                    className="form-input"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* To Date */}
              <div className="form-group" style={{ marginBottom: 0, minWidth: "160px" }}>
                <label htmlFor="reportToDate" className="form-label required">
                  To Date
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="reportToDate"
                    type="date"
                    className="form-input"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Generate Report Button */}
              <button
                type="submit"
                onClick={handleGenerateReport}
                className="primary-btn"
                disabled={loading || !isDateRangeValid}
                style={{
                  height: "38px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0 1.25rem",
                }}
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} />
                <span>{loading ? "Generating..." : "Generate Report"}</span>
              </button>

              {/* Quick Preset Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ fontSize: "0.75rem", padding: "0.35rem 0.65rem", height: "36px" }}
                  onClick={() => handleSetQuickRange("this_month")}
                >
                  This Month
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ fontSize: "0.75rem", padding: "0.35rem 0.65rem", height: "36px" }}
                  onClick={() => handleSetQuickRange("last_30_days")}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* Export Buttons (Always Visible, Disabled Until Date Range Selected) */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleDownloadExcel}
                disabled={downloadingExcel || !isDateRangeValid}
                style={{
                  height: "38px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0 1rem",
                  borderColor: "#10b981",
                  color: "#047857",
                  background: "#ecfdf5",
                }}
                title={
                  !isDateRangeValid
                    ? "Select a valid date range to enable Excel export"
                    : "Download complete 5-sheet Leave Summary Excel (.xlsx)"
                }
              >
                <FileSpreadsheet size={16} />
                <span>{downloadingExcel ? "Exporting Excel..." : "Download Excel"}</span>
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || !isDateRangeValid}
                style={{
                  height: "38px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0 1rem",
                  borderColor: "#ef4444",
                  color: "#b91c1c",
                  background: "#fef2f2",
                }}
                title={
                  !isDateRangeValid
                    ? "Select a valid date range to enable PDF export"
                    : "Download printable Leave Summary PDF (.pdf)"
                }
              >
                <FileText size={16} />
                <span>{downloadingPdf ? "Exporting PDF..." : "Download PDF"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* When Report Data is Available */}
      {reportData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Section 1: Executive KPI Metrics Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "0.9rem",
            }}
          >
            {/* Card 1: Total Requests */}
            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="metric-label">Total Requests</span>
                <Calendar size={18} className="text-blue" />
              </div>
              <div className="metric-value">{reportData.summary.total_requests}</div>
              <span className="metric-subtext">Within selected range</span>
            </div>

            {/* Card 2: Employees Took Leave */}
            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="metric-label">Employees on Leave</span>
                <Users size={18} className="text-purple" />
              </div>
              <div className="metric-value">{reportData.summary.total_employees_took_leave}</div>
              <span className="metric-subtext">Unique individuals</span>
            </div>

            {/* Card 3: Total Leave Days */}
            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="metric-label">Total Leave Days</span>
                <TrendingUp size={18} className="text-green" />
              </div>
              <div className="metric-value">{reportData.summary.total_leave_days}</div>
              <span className="metric-subtext">Excludes Time Permission</span>
            </div>

            {/* Card 4: Permission Hours */}
            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="metric-label">Permission Hours</span>
                <Clock size={18} className="text-amber" />
              </div>
              <div className="metric-value">{reportData.summary.total_time_permission_hours} hrs</div>
              <span className="metric-subtext">Time permission total</span>
            </div>

            {/* Card 5: Approved */}
            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="metric-label">Approved</span>
                <CheckCircle2 size={18} className="text-green" />
              </div>
              <div className="metric-value text-green">{reportData.summary.approved_requests}</div>
              <span className="metric-subtext">Successfully approved</span>
            </div>

            {/* Card 6: Pending */}
            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="metric-label">Pending</span>
                <AlertCircle size={18} className="text-amber" />
              </div>
              <div className="metric-value text-amber">{reportData.summary.pending_requests}</div>
              <span className="metric-subtext">Awaiting approvals</span>
            </div>

            {/* Card 7: Rejected */}
            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="metric-label">Rejected</span>
                <XCircle size={18} className="text-red" />
              </div>
              <div className="metric-value text-red">{reportData.summary.rejected_requests}</div>
              <span className="metric-subtext">Declined / canceled</span>
            </div>

            {/* Card 8: No Pay / Paycut */}
            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="metric-label">No Pay / Paycut</span>
                <AlertTriangle size={18} style={{ color: "#7c3aed" }} />
              </div>
              <div className="metric-value" style={{ color: "#7c3aed" }}>
                {reportData.summary.paycut_leave_count}
              </div>
              <span className="metric-subtext">Salary deductions</span>
            </div>
          </div>

          {/* Section 2: Tabbed Details & Tables */}
          <div className="table-card">
            <div
              className="table-controls-bar"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "0.85rem 1.25rem",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              {/* Tab Navigation */}
              <div className="filter-tabs" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`filter-tab ${activeTab === "details" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("details")}
                >
                  Employee Leave Details ({reportData.details.length})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${activeTab === "employee" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("employee")}
                >
                  Employee-wise Total ({reportData.employee_summary.length})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${activeTab === "team" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("team")}
                >
                  Team-wise Summary ({reportData.team_summary.length})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${activeTab === "exceptions" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("exceptions")}
                >
                  Exceptions & Notes
                </button>
              </div>

              {/* Search in details */}
              {activeTab === "details" && (
                <div className="search-input-wrapper" style={{ maxWidth: "260px" }}>
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* TAB 1: EMPLOYEE LEAVE DETAILS */}
            {activeTab === "details" && (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Department / Team</th>
                      <th>Leave Type</th>
                      <th>Type</th>
                      <th>Start Date</th>
                      <th>Days</th>
                      <th>Hours</th>
                      <th>Substitute</th>
                      <th>Status</th>
                      <th>Approved By</th>
                      <th>Applied Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDetails.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="empty-table-cell" style={{ textAlign: "center", padding: "2rem" }}>
                          No leave records found matching the criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredDetails.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <strong className="font-semibold" style={{ color: "#0f172a" }}>
                              {d.employee_name}
                            </strong>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.8125rem", color: "#475569" }}>
                              {d.department_name || d.team_name}
                            </span>
                          </td>
                          <td>
                            <span className="font-medium" style={{ fontSize: "0.8125rem" }}>
                              {d.leave_type}
                            </span>
                            {d.is_paycut_leave && (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginLeft: "0.4rem",
                                  fontSize: "0.68rem",
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  padding: "0.1rem 0.35rem",
                                  borderRadius: "4px",
                                  border: "1px solid #fde68a",
                                }}
                              >
                                Paycut
                              </span>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: "0.725rem",
                                fontWeight: 600,
                                padding: "0.15rem 0.45rem",
                                borderRadius: "4px",
                                background: d.record_type === "Time Permission" ? "#fef3c7" : "#e0e7ff",
                                color: d.record_type === "Time Permission" ? "#92400e" : "#3730a3",
                              }}
                            >
                              {d.record_type}
                            </span>
                          </td>
                          <td>
                            <span className="font-mono" style={{ fontSize: "0.8125rem" }}>
                              {d.start_date}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                              {d.record_type === "Time Permission" ? "—" : d.leave_days}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#d97706" }}>
                              {d.record_type === "Time Permission" ? `${d.permission_hours} hrs` : "—"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.8125rem", color: "#475569" }}>
                              {d.substitute_name}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status-pill ${
                                d.status === "Approved"
                                  ? "status-pill-accepted"
                                  : d.status === "Rejected" || d.status === "Substitute Rejected"
                                  ? "status-pill-rejected"
                                  : "status-pill-pending"
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                              {d.approved_by}
                            </span>
                          </td>
                          <td>
                            <span className="font-mono" style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {d.applied_date}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: EMPLOYEE-WISE TOTAL SUMMARY */}
            {activeTab === "employee" && (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Department / Team</th>
                      <th>Total Requests</th>
                      <th>Total Leave Days</th>
                      <th>Permission Hours</th>
                      <th>Approved</th>
                      <th>Pending</th>
                      <th>Rejected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.employee_summary.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="empty-table-cell" style={{ textAlign: "center", padding: "2rem" }}>
                          No employee records in this date range.
                        </td>
                      </tr>
                    ) : (
                      reportData.employee_summary.map((e) => (
                        <tr key={e.employee_id}>
                          <td>
                            <strong className="font-semibold" style={{ color: "#0f172a" }}>
                              {e.employee_name}
                            </strong>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.8125rem", color: "#475569" }}>
                              {e.department_name}
                            </span>
                          </td>
                          <td>
                            <span className="font-semibold">{e.total_requests}</span>
                          </td>
                          <td>
                            <span className="counter-pill pill-blue">{e.total_leave_days} Days</span>
                          </td>
                          <td>
                            <span className="counter-pill pill-amber">{e.total_permission_hours} hrs</span>
                          </td>
                          <td>
                            <span className="status-pill status-pill-accepted">{e.approved_count}</span>
                          </td>
                          <td>
                            <span className="status-pill status-pill-pending">{e.pending_count}</span>
                          </td>
                          <td>
                            <span className="status-pill status-pill-rejected">{e.rejected_count}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: TEAM-WISE SUMMARY */}
            {activeTab === "team" && (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Department / Team</th>
                      <th>Employees Took Leave</th>
                      <th>Total Requests</th>
                      <th>Total Leave Days</th>
                      <th>Permission Hours</th>
                      <th>Most Used Leave Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.team_summary.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-table-cell" style={{ textAlign: "center", padding: "2rem" }}>
                          No team summary records in this date range.
                        </td>
                      </tr>
                    ) : (
                      reportData.team_summary.map((t) => (
                        <tr key={t.team_name}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                              <Building size={14} className="text-purple" />
                              <strong className="font-semibold" style={{ color: "#0f172a" }}>
                                {t.team_name}
                              </strong>
                            </div>
                          </td>
                          <td>
                            <span className="counter-pill pill-purple">{t.employees_count} Employees</span>
                          </td>
                          <td>
                            <span className="font-semibold">{t.total_requests}</span>
                          </td>
                          <td>
                            <span className="counter-pill pill-blue">{t.total_leave_days} Days</span>
                          </td>
                          <td>
                            <span className="counter-pill pill-amber">{t.total_permission_hours} hrs</span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
                                background: "#f1f5f9",
                                padding: "0.15rem 0.45rem",
                                borderRadius: "4px",
                              }}
                            >
                              {t.most_used_leave_type}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: EXCEPTIONS & IMPORTANT NOTES */}
            {activeTab === "exceptions" && (
              <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* 1. Paycut Leaves */}
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#991b1b", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <AlertTriangle size={16} />
                    <span>Employees with No Pay / Paycut Leave ({reportData.exceptions.paycut_leaves.length})</span>
                  </h4>
                  {reportData.exceptions.paycut_leaves.length === 0 ? (
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", fontStyle: "italic", margin: 0 }}>
                      No paycut or no-pay leave records found in selected range.
                    </p>
                  ) : (
                    <div className="table-responsive" style={{ border: "1px solid #fee2e2", borderRadius: "8px" }}>
                      <table className="custom-table">
                        <thead>
                          <tr style={{ background: "#fef2f2" }}>
                            <th>Employee Name</th>
                            <th>Department</th>
                            <th>Leave Type</th>
                            <th>Start Date</th>
                            <th>Paycut Units</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.exceptions.paycut_leaves.map((p) => (
                            <tr key={p.id}>
                              <td><strong>{p.employee_name}</strong></td>
                              <td>{p.department_name}</td>
                              <td>{p.leave_type}</td>
                              <td>{p.start_date}</td>
                              <td><span className="counter-pill pill-amber">{p.paycut_units}</span></td>
                              <td>{p.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 2. Pending Requests */}
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#d97706", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <AlertCircle size={16} />
                    <span>Pending Leave Requests (Action Required) ({reportData.exceptions.pending_leaves.length})</span>
                  </h4>
                  {reportData.exceptions.pending_leaves.length === 0 ? (
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", fontStyle: "italic", margin: 0 }}>
                      No pending requests in this range.
                    </p>
                  ) : (
                    <div className="table-responsive" style={{ border: "1px solid #fef3c7", borderRadius: "8px" }}>
                      <table className="custom-table">
                        <thead>
                          <tr style={{ background: "#fffbeb" }}>
                            <th>Employee Name</th>
                            <th>Department</th>
                            <th>Leave Type</th>
                            <th>Start Date</th>
                            <th>Duration</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.exceptions.pending_leaves.map((p) => (
                            <tr key={p.id}>
                              <td><strong>{p.employee_name}</strong></td>
                              <td>{p.department_name}</td>
                              <td>{p.leave_type}</td>
                              <td>{p.start_date}</td>
                              <td>{p.record_type === "Time Permission" ? `${p.permission_hours} hrs` : `${p.leave_days} days`}</td>
                              <td><span className="status-pill status-pill-pending">{p.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. Rejected Requests */}
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#dc2626", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <XCircle size={16} />
                    <span>Rejected Leave Requests ({reportData.exceptions.rejected_leaves.length})</span>
                  </h4>
                  {reportData.exceptions.rejected_leaves.length === 0 ? (
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", fontStyle: "italic", margin: 0 }}>
                      No rejected requests in this range.
                    </p>
                  ) : (
                    <div className="table-responsive" style={{ border: "1px solid #fee2e2", borderRadius: "8px" }}>
                      <table className="custom-table">
                        <thead>
                          <tr style={{ background: "#fef2f2" }}>
                            <th>Employee Name</th>
                            <th>Department</th>
                            <th>Leave Type</th>
                            <th>Start Date</th>
                            <th>Remarks / Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.exceptions.rejected_leaves.map((p) => (
                            <tr key={p.id}>
                              <td><strong>{p.employee_name}</strong></td>
                              <td>{p.department_name}</td>
                              <td>{p.leave_type}</td>
                              <td>{p.start_date}</td>
                              <td style={{ color: "#b91c1c" }}>{p.remarks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initial Empty State Before Generation */}
      {!reportData && !loading && (
        <div
          style={{
            padding: "3.5rem 1.5rem",
            textAlign: "center",
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
            borderRadius: "12px",
            color: "#64748b",
          }}
        >
          <Calendar size={44} style={{ color: "#94a3b8", margin: "0 auto 0.75rem auto", strokeWidth: 1.5 }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
            Select Date Range & Click Generate Report
          </h3>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.35rem", maxWidth: "440px", marginLeft: "auto", marginRight: "auto" }}>
            Choose a valid date range above and click <strong>Generate Report</strong> to analyze leave metrics, view employee summaries, and download the full Excel or PDF report.
          </p>
        </div>
      )}
    </div>
  );
};
