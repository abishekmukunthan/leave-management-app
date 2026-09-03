import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  X,
  RefreshCw,
  Plus,
  Calendar,
  Inbox,
  Check,
  AlertCircle,
} from "lucide-react";
import { useLeave } from "../context/useLeave";
import { StatusBadge } from "../components/StatusBadge";
import { getMyLeaves, DEMO_USERS } from "../services/api";
import {
  formatDateOnly,
  formatAppliedDate,
  formatDateTime,
  calculateInclusiveDays,
} from "../utils/dateUtils";

export const MyLeavesPage = () => {
  const { loggedInUser } = useLeave();
  // Use logged-in user's ID for fetching, fall back to default employee
  const applicantId = loggedInUser ? loggedInUser.id : DEMO_USERS.EMPLOYEE_APPLICANT.id;
  const applicantName = loggedInUser ? loggedInUser.name : DEMO_USERS.EMPLOYEE_APPLICANT.name;

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeave, setSelectedLeave] = useState(null);

  const fetchLeaves = (isManualRefresh = false) => {
    if (isManualRefresh) setLoading(true);
    setError(null);
    getMyLeaves(applicantId)
      .then((response) => {
        setLeaves(response.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading leaves:", err);
        setError(err.message || "Failed to fetch leave requests from backend");
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    getMyLeaves(applicantId)
      .then((response) => {
        if (isMounted) { setLeaves(response.data || []); setLoading(false); }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Error loading leaves:", err);
          setError(err.message || "Failed to fetch leave requests from backend");
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [applicantId]);

  const filteredLeaves = leaves.filter((leave) => {
    if (activeFilter === "PENDING") {
      if (leave.status !== "Waiting for Substitute Approval" && leave.status !== "Waiting for Admin Approval") return false;
    } else if (activeFilter === "APPROVED" && leave.status !== "Approved") return false;
    else if (activeFilter === "REJECTED" && leave.status !== "Rejected") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return leave.leave_type?.toLowerCase().includes(q) ||
        leave.reason?.toLowerCase().includes(q) ||
        leave.substitute_name?.toLowerCase().includes(q) ||
        leave.id?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="leaves-page-container">
      {/* Controls Bar */}
      <div className="table-controls-bar">
        <div className="filter-tabs">
          <button className={`filter-tab ${activeFilter === "ALL" ? "tab-active" : ""}`} onClick={() => setActiveFilter("ALL")}>
            All ({leaves.length})
          </button>
          <button className={`filter-tab ${activeFilter === "PENDING" ? "tab-active" : ""}`} onClick={() => setActiveFilter("PENDING")}>
            Pending ({leaves.filter((l) => l.status === "Waiting for Substitute Approval" || l.status === "Waiting for Admin Approval").length})
          </button>
          <button className={`filter-tab ${activeFilter === "APPROVED" ? "tab-active" : ""}`} onClick={() => setActiveFilter("APPROVED")}>
            Approved ({leaves.filter((l) => l.status === "Approved").length})
          </button>
          <button className={`filter-tab ${activeFilter === "REJECTED" ? "tab-active" : ""}`} onClick={() => setActiveFilter("REJECTED")}>
            Rejected ({leaves.filter((l) => l.status === "Rejected").length})
          </button>
        </div>

        <div className="controls-right">
          <div className="search-input-wrapper">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search leaves by type, reason..."
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
          <button className="secondary-btn" onClick={() => fetchLeaves(true)} title="Refresh Leaves">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <Link to="/apply-leave" className="primary-btn">
            <Plus size={14} strokeWidth={2.5} />
            <span>Apply Leave</span>
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Loading {applicantName}&apos;s leave requests...
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="form-error-alert" style={{ margin: "1rem 0" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button className="secondary-btn" onClick={() => fetchLeaves(true)} style={{ marginLeft: "auto", padding: "0.25rem 0.75rem" }}>
            Retry
          </button>
        </div>
      )}

      {/* Table Card */}
      {!loading && !error && (
        <div className="table-card">
          {filteredLeaves.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Inbox size={24} />
              </div>
              <h3>No Leave Applications Found</h3>
              <p>{searchQuery ? "No results matched your search." : "No leaves under this filter."}</p>
              <Link to="/apply-leave" className="primary-btn" style={{ marginTop: "0.5rem" }}>
                <Plus size={14} /> Apply for Leave
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Leave Type</th>
                    <th>Dates / Permission</th>
                    <th>Substitute</th>
                    <th>Reason</th>
                    <th>Applied Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map((leave) => {
                    const days = calculateInclusiveDays(leave.start_date, leave.end_date, leave.leave_type);
                    const shortId = leave.id ? `LV-${leave.id.slice(0, 8)}` : "N/A";
                    return (
                      <tr key={leave.id}>
                        <td><span className="cell-id" title={leave.id}>{shortId}</span></td>
                        <td>
                          <strong>{leave.leave_type}</strong>
                          {leave.is_paycut_leave && (
                            <span
                              style={{
                                display: "inline-block",
                                marginTop: "0.2rem",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "9999px",
                                background: "#fef2f2",
                                color: "#ef4444",
                                border: "1px solid #fecaca",
                              }}
                            >
                              Paycut / No-pay Leave
                            </span>
                          )}
                        </td>
                        <td>
                          {leave.leave_type === "Time Permission" ? (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <Calendar size={12} className="text-muted" />
                                <span>{formatDateOnly(leave.permission_date)}</span>
                              </div>
                              <span className="pill-duration">{leave.permission_hours}</span>
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <Calendar size={12} className="text-muted" />
                                <span>{formatDateOnly(leave.start_date)} to {formatDateOnly(leave.end_date)}</span>
                              </div>
                              {days !== null && <span className="pill-duration">{days} {days === 1 ? "Day" : "Days"}</span>}
                            </div>
                          )}
                        </td>
                        <td>
                          <div>
                            <span className="substitute-cell">{leave.substitute_name ? leave.substitute_name : "— None —"}</span>
                            {leave.substitute_status && (
                              <span className="text-muted" style={{ display: "block", fontSize: "0.75rem" }}>
                                ({leave.substitute_status})
                              </span>
                            )}
                            {leave.assigned_work && (
                              <div className="table-truncate-text" title={leave.assigned_work} style={{ marginTop: "0.2rem" }}>
                                Handover: {leave.assigned_work}
                              </div>
                            )}
                          </div>
                        </td>
                        <td><div className="reason-cell" title={leave.reason}>{leave.reason}</div></td>
                        <td><span className="text-muted">{formatAppliedDate(leave.created_at)}</span></td>
                        <td><StatusBadge status={leave.status} /></td>
                        <td>
                          <button className="table-action-link" onClick={() => setSelectedLeave(leave)}>
                            View Details
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
      )}

      {/* Leave Details Modal */}
      {selectedLeave && (
        <div className="modal-backdrop" onClick={() => setSelectedLeave(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="cell-id">{selectedLeave.id}</span>
                <h2>Leave Application Details</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedLeave(null)}>
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
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    marginBottom: "1rem",
                    fontSize: "0.8125rem",
                    color: "#991b1b",
                  }}
                >
                  <strong>⚠️ Paycut / No-pay Leave Alert:</strong>{" "}
                  {selectedLeave.quota_warning_message || "This leave exceeds your available quota and may be considered as no-pay leave."}{" "}
                  (Paycut units: <strong>{selectedLeave.paycut_units}</strong>)
                </div>
              )}

              <div className="modal-grid-2">
                <div className="modal-detail-item">
                  <span className="detail-label">Leave Type</span>
                  <span className="detail-value font-semibold">{selectedLeave.leave_type}</span>
                </div>
                <div className="modal-detail-item">
                  <span className="detail-label">Applied Date</span>
                  <span className="detail-value">{formatAppliedDate(selectedLeave.created_at)}</span>
                </div>
              </div>

              <div className="modal-detail-item">
                <span className="detail-label">Duration & Schedule</span>
                <span className="detail-value">
                  {selectedLeave.leave_type === "Time Permission"
                    ? `${formatDateOnly(selectedLeave.permission_date)} (${selectedLeave.permission_hours || "Time Permission"})`
                    : `${formatDateOnly(selectedLeave.start_date)} to ${formatDateOnly(selectedLeave.end_date)}`}
                </span>
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
                <span className="detail-label">Reason</span>
                <div className="detail-textbox">{selectedLeave.reason}</div>
              </div>

              {selectedLeave.assigned_work && (
                <div className="modal-detail-item">
                  <span className="detail-label">Assigned Work / Handover Notes</span>
                  <div className="detail-textbox">{selectedLeave.assigned_work}</div>
                </div>
              )}

              {/* Approval details */}
              {selectedLeave.status === "Approved" && (
                <div className="admin-decision-box approval-box">
                  <div className="modal-grid-2">
                    <div className="modal-detail-item">
                      <span className="detail-label">Approved By</span>
                      <span className="detail-value font-semibold text-green" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        <Check size={14} strokeWidth={2.5} /> {selectedLeave.approver_name || selectedLeave.approved_by || "Team Lead"}
                      </span>
                    </div>
                    <div className="modal-detail-item">
                      <span className="detail-label">Approved At</span>
                      <span className="detail-value">{formatDateTime(selectedLeave.approved_at)}</span>
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
                        <X size={14} strokeWidth={2.5} /> {selectedLeave.approver_name || "Admin / Team Lead"}
                      </span>
                    </div>
                    <div className="modal-detail-item">
                      <span className="detail-label">Rejected At</span>
                      <span className="detail-value">{formatDateTime(selectedLeave.rejected_at)}</span>
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
              <button className="secondary-btn" onClick={() => setSelectedLeave(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
