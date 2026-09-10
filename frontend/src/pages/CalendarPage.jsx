import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Palmtree,
  RefreshCw,
  X,
  AlertCircle,
} from "lucide-react";
import { useLeave } from "../context/useLeave";
import { getCalendarMonthSummary, getCalendarDayDetails, DEMO_USERS } from "../services/api";
import { getStoredUser, isSuperiorAdmin } from "../services/auth";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Helper to format date string to human-readable full date e.g. "Thursday, September 3, 2026"
const formatDisplayDate = (val) => {
  if (!val) return "";
  const parts = val.split("-").map(Number);
  if (parts.length < 3) return val;
  const [y, m, d] = parts;
  if (!y || !m || !d) return val;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

export const CalendarPage = () => {
  const { loggedInUser } = useLeave();
  const activeUser = loggedInUser || getStoredUser() || DEMO_USERS.EMPLOYEE_APPLICANT;
  const userId = activeUser?.id;
  const userIsSuperior = isSuperiorAdmin(activeUser);

  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [selectedDate, setSelectedDate] = useState(todayDateStr);

  const [monthSummary, setMonthSummary] = useState(null);
  const [dayDetails, setDayDetails] = useState(null);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState(null);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  // Date selection click handler - opens modal, NO page scrolling
  const handleDateClick = (dateStr) => {
    console.log("[CalendarPage] Date cell clicked:", dateStr, "| User ID:", userId);
    setSelectedDate(dateStr);
    setIsDateModalOpen(true);
  };

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    if (!userId) return;
    setLoadingMonth(true);
    setError(null);

    getCalendarMonthSummary(currentYear, currentMonth, userId)
      .then((mSummary) => {
        setMonthSummary(mSummary);
      })
      .catch((err) => {
        console.error("[CalendarPage] Error refreshing calendar data:", err);
        setError(err.message || "Failed to refresh calendar data");
      })
      .finally(() => {
        setLoadingMonth(false);
      });
  }, [currentYear, currentMonth, userId]);

  // Fetch month summary on year/month change
  useEffect(() => {
    let isMounted = true;
    if (!userId) return;

    getCalendarMonthSummary(currentYear, currentMonth, userId)
      .then((data) => {
        if (isMounted) {
          setMonthSummary(data);
          setLoadingMonth(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("[CalendarPage] Error fetching calendar month summary:", err);
          setError(err.message || "Failed to load monthly calendar data");
          setLoadingMonth(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentYear, currentMonth, userId]);

  // Fetch day details whenever selectedDate or isDateModalOpen changes
  useEffect(() => {
    let isMounted = true;
    if (!userId || !selectedDate || !isDateModalOpen) return;
    console.log("[CalendarPage] Fetching day details for modal date:", selectedDate, "| User ID:", userId);

    getCalendarDayDetails(selectedDate, userId)
      .then((data) => {
        if (isMounted) {
          console.log("[CalendarPage] Day details loaded for modal:", data);
          setDayDetails(data);
          setLoadingDay(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("[CalendarPage] Error fetching calendar day details for modal:", err);
          setLoadingDay(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, userId, isDateModalOpen]);

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setSelectedDate(todayDateStr);
  };

  // Build grid days calculation
  const daysInMonthCount = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0=Sun, 1=Mon, etc.

  // Map of date string -> day summary object
  const daySummaryMap = {};
  if (monthSummary?.days) {
    monthSummary.days.forEach((item) => {
      daySummaryMap[item.date] = item;
    });
  }

  // Subtitle based on role
  const subtitle = userIsSuperior
    ? "View company-wide leave availability and team attendance across all departments."
    : "View your team leave availability and planned member absences.";

  return (
    <div className="admin-page-container">
      {/* Header Banner */}
      <div className="admin-header-row">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 className="admin-title">Leave Calendar</h2>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.2rem 0.65rem",
                borderRadius: "9999px",
                background: userIsSuperior ? "#EEF2FF" : "#ECFDF5",
                color: userIsSuperior ? "#4F46E5" : "#065F46",
                border: userIsSuperior ? "1px solid #C7D2FE" : "1px solid #A7F3D0",
                textTransform: "uppercase",
              }}
            >
              {userIsSuperior ? "Organization-Wide" : "Team Availability"}
            </span>
          </div>
          <p className="admin-subtitle">{subtitle}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            className="secondary-btn"
            onClick={handleManualRefresh}
            title="Refresh Calendar"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="form-error-alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            className="secondary-btn"
            onClick={handleManualRefresh}
            style={{ marginLeft: "auto", padding: "0.25rem 0.75rem" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Month Navigation & Controls */}
      <div className="table-controls-bar" style={{ gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button className="secondary-btn" onClick={handlePrevMonth} title="Previous Month">
            <ChevronLeft size={16} />
          </button>
          <h3
            style={{
              fontSize: "1.15rem",
              fontWeight: 800,
              color: "#0F172A",
              minWidth: "180px",
              textAlign: "center",
            }}
          >
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h3>
          <button className="secondary-btn" onClick={handleNextMonth} title="Next Month">
            <ChevronRight size={16} />
          </button>
        </div>

        <button className="primary-btn" onClick={handleToday} style={{ padding: "0.45rem 0.9rem" }}>
          Today
        </button>
      </div>

      {/* Monthly Calendar Grid */}
      <div className="table-card" style={{ padding: "1.25rem" }}>
        {loadingMonth ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
            Loading calendar grid for {MONTH_NAMES[currentMonth - 1]} {currentYear}...
          </div>
        ) : (
          <div className="calendar-grid-container">
            {/* Weekday Headers */}
            <div className="calendar-weekday-header">
              {WEEKDAYS.map((day) => (
                <div key={day} className="calendar-weekday-cell">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Cells */}
            <div className="calendar-days-grid">
              {/* Empty leading padding slots */}
              {Array.from({ length: firstDayWeekday }).map((_, idx) => (
                <div key={`empty-${idx}`} className="calendar-day-cell cell-empty"></div>
              ))}

              {/* Month Day Cells */}
              {Array.from({ length: daysInMonthCount }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const daySummary = daySummaryMap[dateStr] || {
                  onLeaveCount: 0,
                  timePermissionCount: 0,
                  totalAwayCount: 0,
                };

                const isToday = dateStr === todayDateStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleDateClick(dateStr)}
                    className={`calendar-day-cell ${isSelected ? "cell-selected" : ""} ${
                      isToday ? "cell-today" : ""
                    }`}
                  >
                    <div className="day-cell-top">
                      <span className={`day-number ${isToday ? "day-number-today" : ""}`}>
                        {dayNum}
                      </span>
                      {isToday && <span className="today-chip">Today</span>}
                    </div>

                    <div className="day-cell-badges">
                      {daySummary.onLeaveCount > 0 && (
                        <span className="cal-badge badge-leave">
                          <Palmtree size={10} />
                          <span>Leave: {daySummary.onLeaveCount}</span>
                        </span>
                      )}
                      {daySummary.timePermissionCount > 0 && (
                        <span className="cal-badge badge-time">
                          <Clock size={10} />
                          <span>Perm: {daySummary.timePermissionCount}</span>
                        </span>
                      )}
                      {daySummary.totalAwayCount > 0 && (
                        <span className="cal-badge badge-away">
                          <span>Away: {daySummary.totalAwayCount}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Date Details Popup / Modal */}
      {isDateModalOpen && selectedDate && (
        <div className="modal-backdrop" onClick={() => setIsDateModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: "860px", maxHeight: "88vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <span className="cell-id">Selected Date: {selectedDate}</span>
                <h2>Leave Details for {selectedDate}</h2>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8125rem", color: "#64748B" }}>
                  {formatDisplayDate(selectedDate)}
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body with internal scrolling */}
            <div className="modal-body" style={{ overflowY: "auto", padding: "1.25rem 1.5rem" }}>
              {loadingDay ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
                  Fetching availability details for {selectedDate}...
                </div>
              ) : (
                <>
                  {/* 1. Total Leave on this day box */}
                  <div className="calendar-total-leave-box" data-testid="total-leave-box">
                    <span className="total-leave-label">Total Leave on this day</span>
                    <span className="total-leave-count" data-testid="total-leave-count">
                      {dayDetails?.totalLeaveCount ?? 0}
                    </span>
                  </div>

                  {/* 2. Scrollable table showing leave/time permission records */}
                  {(!dayDetails?.records || dayDetails.records.length === 0) ? (
                    <div className="calendar-records-empty">
                      No leave or time permission records found for this date.
                    </div>
                  ) : (
                    <div className="calendar-table-scroll-wrapper">
                      <table className="calendar-records-table">
                        <thead>
                          <tr>
                            <th>Employee Name</th>
                            <th>Department Name</th>
                            <th>Leave / Time Permission</th>
                            <th>Substitute</th>
                            <th>Leave Type</th>
                            <th>Assigned Work</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayDetails.records.map((record, idx) => {
                            const isLeave = record.record_type === "Leave";
                            return (
                              <tr key={record.id ? `${record.id}-${idx}` : idx}>
                                <td>
                                  <strong>{record.employee_name}</strong>
                                </td>
                                <td>
                                  <span>{record.department_name || "Unassigned"}</span>
                                </td>
                                <td>
                                  <div>
                                    <span className={isLeave ? "record-pill-leave" : "record-pill-time"}>
                                      {isLeave ? "Leave" : "Time Permission"}
                                    </span>
                                    {isLeave && record.start_date && record.end_date && (
                                      <div className="record-detail-subtext">
                                        {record.start_date === record.end_date
                                          ? record.start_date
                                          : `${record.start_date} to ${record.end_date}`}
                                      </div>
                                    )}
                                    {!isLeave && record.permission_hours && (
                                      <div className="record-detail-subtext">
                                        {record.permission_hours} {record.permission_hours === 1 ? "hour" : "hours"}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span>{record.substitute_name || "Not assigned"}</span>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 600 }}>{record.leave_type}</span>
                                </td>
                                <td>
                                  <span title={record.assigned_work || "No assigned work"}>
                                    {record.assigned_work || "No assigned work"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setIsDateModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
