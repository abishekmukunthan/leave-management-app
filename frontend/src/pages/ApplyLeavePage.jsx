import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLeave } from "../context/useLeave";
import { applyLeave as submitLeaveApi, DEMO_USERS } from "../services/api";
import { calculateInclusiveDays, formatDateOnly } from "../utils/dateUtils";

export const ApplyLeavePage = () => {
  const navigate = useNavigate();
  const { showToast, loggedInUser } = useLeave();

  // Use logged-in user as applicant; fall back to default demo employee
  const applicant = loggedInUser || DEMO_USERS.EMPLOYEE_APPLICANT;

  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [permissionDate, setPermissionDate] = useState("");
  const [permissionHours, setPermissionHours] = useState("1 hour");
  const [reason, setReason] = useState("");
  const [substituteId, setSubstituteId] = useState("");
  const [assignedWork, setAssignedWork] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isTimePermission = leaveType === "Time Permission";

  // Build substitute list: all demo users except current applicant
  const allSubstitutes = [
    { id: DEMO_USERS.EMPLOYEE_APPLICANT.id, name: DEMO_USERS.EMPLOYEE_APPLICANT.name, role: DEMO_USERS.EMPLOYEE_APPLICANT.role },
    { id: DEMO_USERS.SUBSTITUTE_EMPLOYEE.id, name: DEMO_USERS.SUBSTITUTE_EMPLOYEE.name, role: DEMO_USERS.SUBSTITUTE_EMPLOYEE.role },
    { id: DEMO_USERS.ANOTHER_EMPLOYEE.id, name: DEMO_USERS.ANOTHER_EMPLOYEE.name, role: DEMO_USERS.ANOTHER_EMPLOYEE.role },
  ];
  const availableSubstitutes = allSubstitutes.filter((s) => s.id !== applicant.id);

  const daysCount = isTimePermission ? null : calculateInclusiveDays(startDate, endDate, leaveType);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (isTimePermission) {
      if (!permissionDate) { setErrorMsg("Please select the permission date."); return; }
      if (!permissionHours) { setErrorMsg("Please select the permission hours."); return; }
    } else {
      if (!startDate || !endDate) { setErrorMsg("Please select both start and end dates."); return; }
      const cleanStart = formatDateOnly(startDate);
      const cleanEnd = formatDateOnly(endDate);
      if (cleanEnd < cleanStart) { setErrorMsg("End date cannot be earlier than start date."); return; }
    }

    if (!reason.trim()) { setErrorMsg("Please provide a reason for the leave application."); return; }
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
        permission_hours: isTimePermission ? permissionHours : null,
        reason: reason.trim(),
        substitute_employee_id: substituteId || null,
        assigned_work: assignedWork.trim() || null,
      };

      const response = await submitLeaveApi(leavePayload);

      showToast(response.message || "Leave application submitted successfully!", "success");
      navigate("/my-leaves");
    } catch (error) {
      console.error("Failed to submit leave:", error);
      setErrorMsg(error.message || "Failed to submit leave request. Please check backend connection.");
      showToast(error.message || "Submission failed", "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-page-container">
      <div className="form-layout-grid">
        {/* Main Application Form Card */}
        <div className="form-main-card">
          <div className="form-card-header">
            <div className="form-badge-icon">📝</div>
            <div>
              <h2 className="form-title">Leave Application Form</h2>
              <p className="form-subtitle">
                Submitting as <strong>{applicant.name}</strong> ({applicant.designation || applicant.role})
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="form-error-alert">
              <span className="error-icon">⚠️</span>
              <span>{errorMsg}</span>
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
              <div className="form-row-2">
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
                </div>
                <div className="form-group">
                  <label htmlFor="permissionHours" className="form-label required">
                    Permission Hours
                  </label>
                  <select
                    id="permissionHours"
                    className="form-select"
                    value={permissionHours}
                    onChange={(e) => setPermissionHours(e.target.value)}
                    required
                  >
                    <option value="1 hour">1 hour</option>
                    <option value="2 hours">2 hours</option>
                    <option value="3 hours">3 hours</option>
                  </select>
                </div>
              </div>
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
                <span>⏱️ Total Duration:</span>
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
              <select
                id="substitute"
                className="form-select"
                value={substituteId}
                onChange={(e) => setSubstituteId(e.target.value)}
                required
              >
                <option value="">-- Choose a team member as substitute --</option>
                {availableSubstitutes.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
              <span className="form-hint">
                The chosen substitute must accept the delegation before admin approval.
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
                {isSubmitting ? "Submitting Application..." : "Submit Leave Application"}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Information Card */}
        <div className="form-side-info">
          <div className="info-card">
            <h3>📌 Leave Policy Guidelines</h3>
            <ul className="policy-list">
              <li>
                <strong>Substitute Approval:</strong> Requests will first be routed to your chosen substitute.
              </li>
              <li>
                <strong>Admin Approval:</strong> Once substitute accepts, management reviews for final decision.
              </li>
              <li>
                <strong>Time Permission:</strong> Limited to a maximum of 3 hours per request session.
              </li>
              <li>
                <strong>Emergency Leaves:</strong> Require documentation submission upon return to duty.
              </li>
            </ul>
          </div>

          <div className="info-card info-card-highlight">
            <h3>💡 Applicant Account Info</h3>
            <p>
              Applying as <strong>{applicant.name}</strong> ({applicant.email}).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
