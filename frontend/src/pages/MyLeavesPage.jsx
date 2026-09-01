import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
    setLoading(true);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="table-controls-bar">
        <div className="filter-tabs">
          <button className={`filter-tab ${activeFilter === "ALL" ? "tab-active" : ""}`} onClick={() => setActiveFilter("ALL")}>
            All Leaves ({leaves.length})
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
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search leaves..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && <button className="search-clear" onClick={() => setSearchQuery("")}>✕</button>}
          </div>
          <button className="secondary-btn" onClick={() => fetchLeaves(true)} title="Refresh">🔄 Refresh</button>
          <Link to="/apply-leave" className="primary-btn">+ Apply Leave</Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p>⏳ Loading {applicantName}&apos;s leave requests...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="form-error-alert" style={{ margin: "1rem 0" }}>
          <span>⚠️ {error}</span>
          <button className="secondary-btn" onClick={() => fetchLeaves(true)} style={{ marginLeft: "auto", padding: "0.25rem 0.75rem" }}>Retry</button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="table-card">
          {filteredLeaves.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3>No Leave Applications Found</h3>
              <p>{searchQuery ? "No results matched your search." : "No leaves under this filter."}</p>
              <Link to="/apply-leave" className="secondary-btn">Apply for Leave Now</Link>
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
                        <td><strong>{leave.leave_type}</strong></td>
                        <td>
                          {leave.leave_type === "Time Permission" ? (
                            <div>
                              <div>📅 {formatDateOnly(leave.permission_date)}</div>
                              <span className="pill-duration">{leave.permission_hours}</span>
                            </div>
                          ) : (
                            <div>
                              <div>📅 {formatDateOnly(leave.start_date)} to {formatDateOnly(leave.end_date)}</div>
                              {days !== null && <span className="pill-duration">{days} {days === 1 ? "Day" : "Days"}</span>}
                            </div>
                          )}
                        </td>
                        <td>
                          <div>
                            <span>{leave.substitute_name ? `👤 ${leave.substitute_name}` : "— None —"}</span>
                            {leave.substitute_status && <span className="text-muted" style={{ display: "block", fontSize: "0.75rem" }}>({leave.substitute_status})</span>}
                          </div>
                        </td>
                        <td><div className="reason-cell" title={leave.reason}>{leave.reason}</div></td>
                        <td><span className="text-muted">{formatAppliedDate(leave.created_at)}</span></td>
                        <td><StatusBadge status={leave.status} /></td>
                        <td><button className="table-action-link" onClick={() => setSelectedLeave(leave)}>View Details</button></td>
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
              <button className="modal-close-btn" onClick={() => setSelectedLeave(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-detail-row">
                <span className="detail-label">Status</span>
                <StatusBadge status={selectedLeave.status} />
              </div>

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
                      <span className="detail-value font-semibold text-green">
                        ✓ {selectedLeave.approver_name || selectedLeave.approved_by || "Priya Fernando"}
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
                      <span className="detail-value font-semibold text-red">
                        ✕ {selectedLeave.approver_name || "Admin / Team Lead"}
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
