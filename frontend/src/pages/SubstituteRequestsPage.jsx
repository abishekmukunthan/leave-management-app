import { useState, useEffect } from "react";
import { useLeave } from "../context/useLeave";
import {
  getSubstituteRequests,
  acceptSubstituteRequest,
  rejectSubstituteRequest,
  DEMO_USERS,
} from "../services/api";
import {
  formatDateOnly,
  formatAppliedDate,
} from "../utils/dateUtils";

export const SubstituteRequestsPage = () => {
  const { showToast, loggedInUser } = useLeave();

  // Use logged-in user's ID; fall back to default substitute employee
  const substituteId = loggedInUser ? loggedInUser.id : DEMO_USERS.SUBSTITUTE_EMPLOYEE.id;
  const substituteName = loggedInUser ? loggedInUser.name : DEMO_USERS.SUBSTITUTE_EMPLOYEE.name;
  const substituteRole = loggedInUser ? (loggedInUser.designation || loggedInUser.role) : DEMO_USERS.SUBSTITUTE_EMPLOYEE.role;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("PENDING");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [rejectingRequestId, setRejectingRequestId] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  const fetchRequests = (isManual = false) => {
    if (isManual) setLoading(true);
    setError(null);
    getSubstituteRequests(substituteId)
      .then((response) => { setRequests(response.data || []); setLoading(false); })
      .catch((err) => {
        console.error("Error loading substitute requests:", err);
        setError(err.message || "Failed to load substitute requests");
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getSubstituteRequests(substituteId)
      .then((response) => { if (isMounted) { setRequests(response.data || []); setLoading(false); } })
      .catch((err) => {
        if (isMounted) {
          console.error("Error loading substitute requests:", err);
          setError(err.message || "Failed to load substitute requests");
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [substituteId]);

  const handleAccept = async (requestId) => {
    setActionLoadingId(requestId);
    try {
      const res = await acceptSubstituteRequest(requestId);
      showToast(res.message || "Substitute duty accepted!", "success");
      fetchRequests();
    } catch (err) {
      showToast(err.message || "Failed to accept duty request", "warning");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectConfirm = async (e) => {
    e.preventDefault();
    if (!rejectingRequestId) return;
    setActionLoadingId(rejectingRequestId);
    try {
      const res = await rejectSubstituteRequest(rejectingRequestId, rejectRemarks.trim() || "Declined");
      showToast(res.message || "Substitute duty declined.", "info");
      setRejectingRequestId(null);
      setRejectRemarks("");
      fetchRequests();
    } catch (err) {
      showToast(err.message || "Failed to reject duty request", "warning");
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingRequests = requests.filter(
    (r) => r.substitute_status === "Waiting for Substitute Approval" || r.substitute_status === "Pending"
  );
  const respondedRequests = requests.filter(
    (r) => r.substitute_status !== "Waiting for Substitute Approval" && r.substitute_status !== "Pending"
  );
  const displayedRequests = filter === "PENDING" ? pendingRequests : filter === "RESOLVED" ? respondedRequests : requests;

  return (
    <div className="substitute-page-container">
      {/* Info Banner */}
      <div className="info-banner">
        <div className="banner-icon">🤝</div>
        <div className="banner-text">
          <h3>Substitute Duties & Responsibility Delegation</h3>
          <p>
            Logged in as <strong>{substituteName}</strong> ({substituteRole}).
            When a colleague designates you as their substitute, review and accept or reject their duty handover.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="table-controls-bar">
        <div className="filter-tabs">
          <button className={`filter-tab ${filter === "PENDING" ? "tab-active" : ""}`} onClick={() => setFilter("PENDING")}>
            Pending Requests ({pendingRequests.length})
          </button>
          <button className={`filter-tab ${filter === "RESOLVED" ? "tab-active" : ""}`} onClick={() => setFilter("RESOLVED")}>
            History ({respondedRequests.length})
          </button>
          <button className={`filter-tab ${filter === "ALL" ? "tab-active" : ""}`} onClick={() => setFilter("ALL")}>
            All Requests ({requests.length})
          </button>
        </div>
        <button className="secondary-btn" onClick={() => fetchRequests(true)} title="Refresh">🔄 Refresh</button>
      </div>

      {loading && <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}><p>⏳ Loading substitute duty requests...</p></div>}

      {!loading && error && (
        <div className="form-error-alert">
          <span>⚠️ {error}</span>
          <button className="secondary-btn" onClick={() => fetchRequests(true)} style={{ marginLeft: "auto", padding: "0.25rem 0.75rem" }}>Retry</button>
        </div>
      )}

      {!loading && !error && displayedRequests.length === 0 && (
        <div className="empty-state-card">
          <div className="empty-icon">✨</div>
          <h3>No Substitute Requests</h3>
          <p>{filter === "PENDING" ? "No pending substitute duties requiring review." : "No requests found in this view."}</p>
        </div>
      )}

      {!loading && !error && displayedRequests.length > 0 && (
        <div className="substitute-cards-grid">
          {displayedRequests.map((req) => {
            const isPending = req.substitute_status === "Waiting for Substitute Approval" || req.substitute_status === "Pending";
            const isAccepted = req.substitute_status === "Accepted";
            const isRejected = req.substitute_status === "Rejected";
            const datesStr =
              req.leave_type === "Time Permission"
                ? `${formatDateOnly(req.permission_date)} (${req.permission_hours || "Time Permission"})`
                : `${formatDateOnly(req.start_date)} to ${formatDateOnly(req.end_date)}`;
            const isCurrentAction = actionLoadingId === req.id;

            return (
              <div key={req.id} className={`substitute-card ${isPending ? "card-pending-duty" : "card-resolved-duty"}`}>
                <div className="substitute-card-header">
                  <div className="requester-profile">
                    <div className="requester-avatar">
                      {(req.requesting_employee_name || "Employee").split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="requester-name">{req.requesting_employee_name || "Employee"}</h4>
                      <span className="requester-id">
                        {req.requesting_employee_code ? `Code: ${req.requesting_employee_code}` : req.requesting_employee_email}
                      </span>
                    </div>
                  </div>
                  <div className="card-top-right">
                    <span className="leave-pill">{req.leave_type}</span>
                    <span className={`status-pill ${isPending ? "status-pill-pending" : isAccepted ? "status-pill-accepted" : isRejected ? "status-pill-rejected" : ""}`}>
                      {req.substitute_status}
                    </span>
                  </div>
                </div>

                <div className="substitute-card-body">
                  <div className="detail-row">
                    <span className="detail-icon">📅</span>
                    <div>
                      <strong className="detail-title">Leave Dates / Period:</strong>
                      <p className="detail-value-highlight">{datesStr}</p>
                    </div>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">💬</span>
                    <div>
                      <strong className="detail-title">Colleague's Reason:</strong>
                      <p className="detail-text">{req.reason}</p>
                    </div>
                  </div>
                  <div className="detail-row highlight-box">
                    <span className="detail-icon">📋</span>
                    <div>
                      <strong className="detail-title">Work Handover & Assigned Tasks:</strong>
                      <p className="detail-text work-text">{req.assigned_work}</p>
                    </div>
                  </div>
                  {req.substitute_remarks && (
                    <div className="detail-row">
                      <span className="detail-icon">📝</span>
                      <div>
                        <strong className="detail-title">Your Remarks:</strong>
                        <p className="detail-text">{req.substitute_remarks}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="substitute-card-footer">
                  <span className="applied-date-caption">Requested on {formatAppliedDate(req.created_at)}</span>
                  {isPending ? (
                    <div className="action-buttons-group">
                      <button type="button" className="reject-btn" disabled={isCurrentAction}
                        onClick={() => { setRejectingRequestId(req.id); setRejectRemarks(""); }}>
                        ✕ Reject
                      </button>
                      <button type="button" className="accept-btn" disabled={isCurrentAction} onClick={() => handleAccept(req.id)}>
                        {isCurrentAction ? "Processing..." : "✓ Accept Duty"}
                      </button>
                    </div>
                  ) : (
                    <div className="action-status-note">
                      {isAccepted
                        ? <span className="note-accepted">✓ You agreed to cover this shift. Forwarded to Admin.</span>
                        : <span className="note-rejected">✕ You declined this request.</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingRequestId && (
        <div className="modal-backdrop" onClick={() => setRejectingRequestId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Decline Substitute Duty</h2>
              <button className="modal-close-btn" onClick={() => setRejectingRequestId(null)}>✕</button>
            </div>
            <form onSubmit={handleRejectConfirm}>
              <div className="modal-body">
                <p style={{ fontSize: "0.875rem", color: "#475569" }}>Please state a reason for declining:</p>
                <div className="form-group">
                  <label htmlFor="subRemarks" className="form-label">Remarks / Reason</label>
                  <textarea
                    id="subRemarks"
                    className="form-textarea"
                    rows="3"
                    placeholder="e.g. I already have overlapping project deadlines..."
                    value={rejectRemarks}
                    onChange={(e) => setRejectRemarks(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setRejectingRequestId(null)}>Cancel</button>
                <button type="submit" className="reject-btn" disabled={actionLoadingId === rejectingRequestId}>
                  {actionLoadingId === rejectingRequestId ? "Submitting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
