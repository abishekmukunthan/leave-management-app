import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  AlertCircle,
  Send,
  BookOpen,
  User,
  AlertTriangle,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import { useLeave } from "../context/useLeave";
import {
  applyLeave as submitLeaveApi,
  getSubstituteEmployees,
  DEMO_USERS,
} from "../services/api";
import {
  calculateInclusiveDays,
  formatDateOnly,
  parseTimeToMinutes,
  getFromTimeOptions,
  getToTimeOptions,
  calculateTimePermissionDuration,
} from "../utils/dateUtils";

export const ApplyLeavePage = () => {
  const navigate = useNavigate();
  const { showToast, loggedInUser } = useLeave();

  // Use logged-in user as applicant; fall back to default demo employee
  const applicant = loggedInUser || DEMO_USERS.EMPLOYEE_APPLICANT;

  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [permissionDate, setPermissionDate] = useState("");
  const [permissionFromTime, setPermissionFromTime] = useState("10:00");
  const [permissionToTime, setPermissionToTime] = useState("11:30");
  const [reason, setReason] = useState("");
  const [substituteId, setSubstituteId] = useState("");
  const [selectedSubstitute, setSelectedSubstitute] = useState(null);
  const [substituteSearch, setSubstituteSearch] = useState("");
  const [substitutesList, setSubstitutesList] = useState([]);
  const [loadingSubstitutes, setLoadingSubstitutes] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [assignedWork, setAssignedWork] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Paycut / Quota warning state from backend response
  const [paycutWarning, setPaycutWarning] = useState(null);

  const isTimePermission = leaveType === "Time Permission";

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch eligible active substitutes excluding self from backend
  useEffect(() => {
    let isMounted = true;
    const fetchSubstitutes = async () => {
      try {
        setLoadingSubstitutes(true);
        const res = await getSubstituteEmployees(applicant?.id, substituteSearch);
        if (isMounted) {
          setSubstitutesList(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load substitute employees:", err);
      } finally {
        if (isMounted) {
          setLoadingSubstitutes(false);
        }
      }
    };

    const timer = setTimeout(() => {
      fetchSubstitutes();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [applicant?.id, substituteSearch]);

  const formatRoleName = (role) => {
    if (role === "superior_admin") return "Superior Admin";
    if (role === "team_admin") return "Team In-charge";
    return "Employee";
  };

  // Client-side search filtering across multiple fields
  const filteredSubstitutes = substitutesList.filter((emp) => {
    if (emp.id === applicant?.id) return false;
    if (!substituteSearch.trim()) return true;
    const q = substituteSearch.toLowerCase();
    const matchName = emp.name?.toLowerCase().includes(q);
    const matchUsername = emp.username?.toLowerCase().includes(q);
    const matchEmail = emp.email?.toLowerCase().includes(q);
    const matchTeam = emp.team_name?.toLowerCase().includes(q);
    const matchDept = emp.department?.toLowerCase().includes(q);
    const matchDesig = emp.designation?.toLowerCase().includes(q);
    const roleFormatted = formatRoleName(emp.role).toLowerCase();
    const matchRole = roleFormatted.includes(q) || (emp.role || "").toLowerCase().includes(q);
    return matchName || matchUsername || matchEmail || matchTeam || matchDept || matchDesig || matchRole;
  });

  const handleSelectSubstitute = (emp) => {
    setSubstituteId(emp.id);
    setSelectedSubstitute(emp);
    setSubstituteSearch("");
    setIsDropdownOpen(false);
  };

  const handleClearSubstitute = () => {
    setSubstituteId("");
    setSelectedSubstitute(null);
    setSubstituteSearch("");
    setIsDropdownOpen(false);
  };

  const fromTimeOptions = getFromTimeOptions();
  const toTimeOptions = getToTimeOptions(permissionFromTime);
  const durationInfo = calculateTimePermissionDuration(permissionFromTime, permissionToTime);

  const handleFromTimeChange = (newFrom) => {
    setPermissionFromTime(newFrom);
    const validToOptions = getToTimeOptions(newFrom);
    if (!validToOptions.some((opt) => opt.value === permissionToTime)) {
      const fromMin = parseTimeToMinutes(newFrom) || 0;
      const defaultTo =
        validToOptions.find((opt) => opt.minutes === fromMin + 60) ||
        validToOptions[0];
      setPermissionToTime(defaultTo ? defaultTo.value : "");
    }
  };

  const daysCount = isTimePermission ? null : calculateInclusiveDays(startDate, endDate, leaveType);

  const submitApplication = async (confirmPaycut = false) => {
    setErrorMsg("");

    if (isTimePermission) {
      if (!permissionDate) {
        setErrorMsg("Please select the permission date.");
        return;
      }
      const durCheck = calculateTimePermissionDuration(permissionFromTime, permissionToTime);
      if (!durCheck.isValid) {
        setErrorMsg(durCheck.error || "Please select valid From and To times.");
        return;
      }
    } else {
      if (!startDate || !endDate) { setErrorMsg("Please select both start and end dates."); return; }
      const cleanStart = formatDateOnly(startDate);
      const cleanEnd = formatDateOnly(endDate);
      if (cleanEnd < cleanStart) { setErrorMsg("End date cannot be earlier than start date."); return; }
    }

    if (!reason.trim()) { setErrorMsg("Please provide a reason for the leave application."); return; }
    if (!substituteId) {
      setErrorMsg("Please select a substitute employee.");
      return;
    }
    if (substituteId && (!assignedWork || !assignedWork.trim())) {
      setErrorMsg("Please describe the work assigned to your substitute.");
      return;
    }

    setIsSubmitting(true);

    try {
      const leavePayload = {
        employee_id: applicant.id,
        leave_type: leaveType,
        start_date: isTimePermission ? null : formatDateOnly(startDate),
        end_date: isTimePermission ? null : formatDateOnly(endDate),
        permission_date: isTimePermission ? formatDateOnly(permissionDate) : null,
        permission_from_time: isTimePermission ? permissionFromTime : null,
        permission_to_time: isTimePermission ? permissionToTime : null,
        permission_hours: isTimePermission ? String(durationInfo.hoursFloat) : null,
        reason: reason.trim(),
        substitute_employee_id: substituteId || null,
        assigned_work: assignedWork.trim() || null,
        confirm_paycut: confirmPaycut,
      };

      const response = await submitLeaveApi(leavePayload);

      // Backend quota check exceeded -> requires confirmation
      if (response.requiresConfirmation) {
        setPaycutWarning(response);
        setIsSubmitting(false);
        return;
      }

      setPaycutWarning(null);
      showToast(response.message || "Leave application submitted successfully!", "success");
      navigate("/my-leaves");
    } catch (error) {
      console.error("Failed to submit leave:", error);
      let message = error.message || "Failed to submit leave request. Please check backend connection.";
      if (error.data?.existingRequest) {
        const req = error.data.existingRequest;
        const range = req.start_date === req.end_date ? req.start_date : `${req.start_date} to ${req.end_date}`;
        message = `You already have an active leave request for this date. (Existing: ${req.leave_type} [${range}] - ${req.status})`;
      }
      setErrorMsg(message);
      showToast(message, "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitApplication(false);
  };

  const handleConfirmPaycut = () => {
    submitApplication(true);
  };

  return (
    <div className="form-page-container">
      <div className="form-layout-grid">
        {/* Main Application Form Card */}
        <div className="form-main-card">
          <div className="form-card-header">
            <div className="form-badge-icon">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="form-title">Leave Application Form</h2>
              <p className="form-subtitle">
                Submitting as <strong>{applicant.name}</strong> ({applicant.designation || applicant.role})
              </p>
            </div>
          </div>

          {/* Standard Form Error */}
          {errorMsg && (
            <div className="form-error-alert">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quota Exceeded Paycut Warning Card */}
          {paycutWarning && (
            <div
              style={{
                padding: "1.25rem",
                borderRadius: "12px",
                background: "#fef2f2",
                border: "2px solid #fecaca",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#991b1b", margin: 0 }}>
                    Leave Quota Exceeded — Paycut Warning
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "#7f1d1d", margin: "0.35rem 0 0 0", lineHeight: 1.5 }}>
                    {paycutWarning.warning || "Your leave balance is not enough. This leave may be considered as no-pay / paycut leave."}
                  </p>
                </div>
              </div>

              {paycutWarning.quotaDetails && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                    gap: "0.65rem",
                    padding: "0.85rem",
                    background: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #fee2e2",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Leave Type</span>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a" }}>{paycutWarning.quotaDetails.leaveType}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Allocated</span>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155" }}>{paycutWarning.quotaDetails.allocated} {paycutWarning.quotaDetails.unit}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Used</span>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155" }}>{paycutWarning.quotaDetails.used} {paycutWarning.quotaDetails.unit}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Remaining</span>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: paycutWarning.quotaDetails.remaining > 0 ? "#10b981" : "#ef4444" }}>{paycutWarning.quotaDetails.remaining} {paycutWarning.quotaDetails.unit}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Requested</span>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#4f46e5" }}>{paycutWarning.quotaDetails.requested} {paycutWarning.quotaDetails.unit}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Paycut Units</span>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#ef4444" }}>{paycutWarning.quotaDetails.paycutUnits} {paycutWarning.quotaDetails.unit}</div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setPaycutWarning(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-reject-btn"
                  style={{ backgroundColor: "#ef4444", color: "#ffffff", borderColor: "#dc2626" }}
                  onClick={handleConfirmPaycut}
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? "Submitting..." : "Continue Anyway"}</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="leave-form">
            {/* 1. Leave Type */}
            <div className="form-group">
              <label htmlFor="leaveType" className="form-label required">
                Leave Type
              </label>
              <select
                id="leaveType"
                className="form-select"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                required
              >
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Half Day Leave">Half Day Leave</option>
                <option value="Time Permission">Time Permission</option>
              </select>
              <span className="form-hint">
                Select standard full/half day leave or short duration time permission.
              </span>
            </div>

            {/* 2. Conditional Date / Time Fields */}
            {isTimePermission ? (
              <>
                <div className="form-group">
                  <label htmlFor="permissionDate" className="form-label required">
                    Permission Date
                  </label>
                  <input
                    id="permissionDate"
                    type="date"
                    className="form-input"
                    value={permissionDate}
                    onChange={(e) => setPermissionDate(e.target.value)}
                    required
                  />
                  <span className="form-hint">Select the date for time permission.</span>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="permissionFromTime" className="form-label required">
                      From Time
                    </label>
                    <select
                      id="permissionFromTime"
                      className="form-select"
                      value={permissionFromTime}
                      onChange={(e) => handleFromTimeChange(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select From Time</option>
                      {fromTimeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="form-hint">Available from 8:00 AM to 4:30 PM</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="permissionToTime" className="form-label required">
                      To Time
                    </label>
                    <select
                      id="permissionToTime"
                      className="form-select"
                      value={permissionToTime}
                      onChange={(e) => setPermissionToTime(e.target.value)}
                      disabled={!permissionFromTime}
                      required
                    >
                      <option value="" disabled>
                        {permissionFromTime ? "Select To Time" : "Select From Time first"}
                      </option>
                      {toTimeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="form-hint">Min 30 mins, max 2 hrs (latest 5:00 PM)</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Calculated Duration</label>
                  <div
                    id="permissionDurationDisplay"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.625rem 0.875rem",
                      backgroundColor: durationInfo.isValid ? "#F0FDF4" : "#FEF2F2",
                      border: `1px solid ${durationInfo.isValid ? "#86EFAC" : "#FECACA"}`,
                      borderRadius: "6px",
                      color: durationInfo.isValid ? "#15803D" : "#DC2626",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                    }}
                  >
                    <Clock size={16} color={durationInfo.isValid ? "#16A34A" : "#EF4444"} />
                    <span>
                      {durationInfo.isValid
                        ? `Duration: ${durationInfo.durationText}`
                        : (durationInfo.error || "Select From and To times")}
                    </span>
                  </div>
                  <span className="form-hint">
                    Duration is automatically calculated and cannot be edited manually.
                  </span>
                </div>
              </>
            ) : (
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="startDate" className="form-label required">
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate" className="form-label required">
                    End Date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    className="form-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {!isTimePermission && daysCount !== null && (
              <div className="duration-summary-pill">
                <Clock size={15} />
                <span>Total Duration:</span>
                <strong>{daysCount} {daysCount === 1 ? "day" : "days"}</strong>
              </div>
            )}

            {/* 3. Reason */}
            <div className="form-group">
              <label htmlFor="reason" className="form-label required">
                Reason for Leave
              </label>
              <textarea
                id="reason"
                className="form-textarea"
                rows="3"
                placeholder="Please provide a clear and brief explanation for your leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              ></textarea>
            </div>

            {/* 4. Substitute Colleague */}
            <div className="form-group">
              <label htmlFor="substitute" className="form-label required">
                Substitute Employee
              </label>

              <div className="substitute-selector-container" ref={dropdownRef}>
                {selectedSubstitute ? (
                  <div className="substitute-selected-card">
                    <div className="substitute-selected-avatar">
                      {(selectedSubstitute.name || "EM").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="substitute-selected-info">
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className="substitute-selected-name">{selectedSubstitute.name}</span>
                        {selectedSubstitute.role === "superior_admin" && (
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              backgroundColor: "#fef3c7",
                              color: "#92400e",
                              border: "1px solid #fde68a",
                            }}
                          >
                            Superior Admin
                          </span>
                        )}
                        {selectedSubstitute.role === "team_admin" && (
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              backgroundColor: "#ede9fe",
                              color: "#5b21b6",
                              border: "1px solid #ddd6fe",
                            }}
                          >
                            Team In-charge
                          </span>
                        )}
                      </div>
                      <span className="substitute-selected-meta">
                        {selectedSubstitute.team_name || selectedSubstitute.department || "Unassigned"}
                        {` • ${formatRoleName(selectedSubstitute.role)}`}
                        {selectedSubstitute.designation &&
                        selectedSubstitute.designation.toLowerCase() !== formatRoleName(selectedSubstitute.role).toLowerCase()
                          ? ` • ${selectedSubstitute.designation}`
                          : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="substitute-clear-btn"
                      onClick={handleClearSubstitute}
                      title="Clear selected substitute"
                      aria-label="Clear selected substitute"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="substitute-search-box">
                    <div className="substitute-input-wrapper">
                      <Search size={16} className="substitute-search-icon" />
                      <input
                        type="text"
                        id="substitute"
                        className="substitute-search-input"
                        placeholder="Search substitute employee..."
                        value={substituteSearch}
                        onChange={(e) => {
                          setSubstituteSearch(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        autoComplete="off"
                      />
                      <ChevronDown
                        size={16}
                        className={`substitute-chevron-icon ${isDropdownOpen ? "open" : ""}`}
                      />
                    </div>

                    {isDropdownOpen && (
                      <div className="substitute-dropdown-menu">
                        {loadingSubstitutes && filteredSubstitutes.length === 0 ? (
                          <div className="substitute-empty-state">
                            Loading employees...
                          </div>
                        ) : filteredSubstitutes.length === 0 ? (
                          <div className="substitute-empty-state">
                            No employees found
                          </div>
                        ) : (
                          filteredSubstitutes.map((emp) => (
                            <div
                              key={emp.id}
                              className={`substitute-option-row ${substituteId === emp.id ? "active" : ""}`}
                              onClick={() => handleSelectSubstitute(emp)}
                            >
                              <div className="substitute-avatar">
                                {(emp.name || "EM").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="substitute-option-info">
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <span className="substitute-option-name">{emp.name}</span>
                                  {emp.role === "superior_admin" && (
                                    <span
                                      style={{
                                        fontSize: "0.6875rem",
                                        fontWeight: 700,
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        backgroundColor: "#fef3c7",
                                        color: "#92400e",
                                        border: "1px solid #fde68a",
                                      }}
                                    >
                                      Superior Admin
                                    </span>
                                  )}
                                  {emp.role === "team_admin" && (
                                    <span
                                      style={{
                                        fontSize: "0.6875rem",
                                        fontWeight: 600,
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        backgroundColor: "#ede9fe",
                                        color: "#5b21b6",
                                        border: "1px solid #ddd6fe",
                                      }}
                                    >
                                      Team In-charge
                                    </span>
                                  )}
                                </div>
                                <span className="substitute-option-meta">
                                  {emp.team_name || emp.department || "Unassigned"}
                                  {` • ${formatRoleName(emp.role)}`}
                                  {emp.designation && emp.designation.toLowerCase() !== formatRoleName(emp.role).toLowerCase()
                                    ? ` • ${emp.designation}`
                                    : ""}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <span className="form-hint">
                The chosen substitute must accept the delegation before team lead approval.
              </span>
            </div>

            {/* 5. Assigned Work */}
            <div className="form-group">
              <label htmlFor="assignedWork" className="form-label required">
                Assigned Work / Handover Notes
              </label>
              <textarea
                id="assignedWork"
                className="form-textarea"
                rows="3"
                placeholder="List specific tasks, tickets, or responsibilities handed over to your substitute..."
                value={assignedWork}
                onChange={(e) => setAssignedWork(e.target.value)}
                required
              ></textarea>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => navigate("/my-leaves")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-btn submit-leave-btn"
                disabled={isSubmitting}
              >
                <Send size={14} />
                <span>{isSubmitting ? "Submitting Application..." : "Submit Application"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Information Card */}
        <div className="form-side-info">
          <div className="info-card">
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <BookOpen size={16} className="text-blue" />
              <span>Leave Policy Guidelines</span>
            </h3>
            <ul className="policy-list">
              <li>
                <strong>Substitute Approval:</strong> Requests will first be routed to your chosen substitute.
              </li>
              <li>
                <strong>Team Lead Approval:</strong> Once substitute accepts, your team lead reviews for decision.
              </li>
              <li>
                <strong>Quota Limits:</strong> Exceeding your available quota will trigger a paycut / no-pay warning.
              </li>
              <li>
                <strong>Time Permission:</strong> Between 8:00 AM and 5:00 PM (min 30 mins, max 2 hours).
              </li>
            </ul>
          </div>

          <div className="info-card info-card-highlight">
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <User size={16} className="text-blue" />
              <span>Applicant Information</span>
            </h3>
            <p>
              Applying as <strong>{applicant.name}</strong> ({applicant.email}).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
