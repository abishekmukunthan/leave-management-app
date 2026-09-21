/**
 * Date and Time utilities for Leave Management
 * Ensures leave dates are treated as plain YYYY-MM-DD date-only strings,
 * preventing UTC timezone shifts.
 */

/**
 * Returns today's local date formatted as YYYY-MM-DD
 */
export const getLocalTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Formats a date value into YYYY-MM-DD string without UTC conversion.
 * If already in YYYY-MM-DD, returns it as is.
 */
export const formatDateOnly = (val) => {
  if (!val) return "";
  if (typeof val === "string") {
    // If it starts with YYYY-MM-DD, return first 10 characters directly
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, "0");
    const day = String(val.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(val).split("T")[0];
};

/**
 * Calculates number of days between two YYYY-MM-DD strings inclusive of start and end date.
 * Uses integer math to completely avoid timezone & DST shifts.
 */
export const calculateInclusiveDays = (startDateStr, endDateStr, leaveType = "") => {
  const start = formatDateOnly(startDateStr);
  const end = formatDateOnly(endDateStr);
  if (!start || !end) return null;

  if (leaveType === "Half Day Leave") return 0.5;

  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);

  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return null;

  // Use UTC year/month/date purely for clean 86,400,000 day calculation
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);

  if (utc2 < utc1) return null;

  const diffDays = Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

/**
 * Formats applied timestamps (like created_at) into readable localized date
 */
export const formatAppliedDate = (val) => {
  if (!val) return "N/A";
  const d = new Date(val);
  return isNaN(d.getTime()) ? formatDateOnly(val) : d.toLocaleDateString();
};

/**
 * Formats full timestamps (like approved_at, rejected_at) into readable localized datetime
 */
export const formatDateTime = (val) => {
  if (!val) return "N/A";
  const d = new Date(val);
  return isNaN(d.getTime())
    ? String(val)
    : d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
};

// =========================================================================
// Time Permission Utilities
// =========================================================================

const WORK_START_MINUTES = 8 * 60;   // 08:00 AM -> 480
const WORK_END_MINUTES = 17 * 60;    // 05:00 PM -> 1020
const MIN_PERMISSION_MINUTES = 30;
const MAX_PERMISSION_MINUTES = 120;

/**
 * Converts various time formats (24h or 12h) to total minutes from midnight.
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return null;
  const clean = timeStr.trim();

  // 12-hour format with AM/PM (e.g., "10:00 AM", "1:30 PM")
  const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[4].toUpperCase();
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours < 12) hours += 12;
    return hours * 60 + minutes;
  }

  // 24-hour format (e.g., "08:00", "08:30:00", "17:00")
  const match24 = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  return null;
};

/**
 * Formats a time string or total minutes into 12-hour representation (e.g., "10:00 AM", "1:30 PM").
 */
export const formatTime12Hour = (timeVal) => {
  if (!timeVal && timeVal !== 0) return "";
  const totalMinutes = typeof timeVal === "number" ? timeVal : parseTimeToMinutes(timeVal);
  if (totalMinutes === null) return typeof timeVal === "string" ? timeVal : "";

  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
};

/**
 * Formats total minutes into 24-hour "HH:mm" representation.
 */
export const formatTime24Hour = (timeVal) => {
  const totalMinutes = typeof timeVal === "number" ? timeVal : parseTimeToMinutes(timeVal);
  if (totalMinutes === null) return "";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Formats duration in minutes into friendly human-readable text.
 * e.g., 90 -> "1 hour 30 minutes" (or "1 hr 30 mins" if short)
 */
export const formatDurationText = (minutes, isShort = false) => {
  if (!minutes || minutes <= 0) return isShort ? "0 mins" : "0 minutes";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  const parts = [];
  if (h > 0) {
    parts.push(isShort ? `${h} hr${h > 1 ? "s" : ""}` : `${h} ${h === 1 ? "hour" : "hours"}`);
  }
  if (m > 0) {
    parts.push(isShort ? `${m} mins` : `${m} minutes`);
  }
  return parts.join(" ");
};

/**
 * Formats a Time Permission range for display, e.g., "10:00 AM - 11:30 AM"
 * If times are missing, returns fallbackText (default: "Not recorded").
 */
export const formatTimeRange = (fromTime, toTime, fallbackText = "Not recorded") => {
  if (!fromTime || !toTime) return fallbackText;
  const fromStr = formatTime12Hour(fromTime);
  const toStr = formatTime12Hour(toTime);
  if (!fromStr || !toStr) return fallbackText;
  return `${fromStr} - ${toStr}`;
};

/**
 * Generates options for From Time dropdown in 30-minute intervals.
 * Office hours start at 8:00 AM; latest From Time is 4:30 PM (since minimum duration is 30m).
 */
export const getFromTimeOptions = () => {
  const options = [];
  // 8:00 AM (480 mins) to 4:30 PM (990 mins)
  for (let m = WORK_START_MINUTES; m <= WORK_END_MINUTES - MIN_PERMISSION_MINUTES; m += 30) {
    options.push({
      value: formatTime24Hour(m),
      label: formatTime12Hour(m),
      minutes: m,
    });
  }
  return options;
};

/**
 * Generates valid To Time options given a selected From Time.
 * Rules:
 * - Must be strictly greater than From Time
 * - Minimum duration = 30 minutes
 * - Maximum duration = 120 minutes
 * - Cannot exceed 5:00 PM (1020 mins)
 */
export const getToTimeOptions = (fromTimeVal) => {
  if (!fromTimeVal) return [];
  const fromMinutes = parseTimeToMinutes(fromTimeVal);
  if (fromMinutes === null) return [];

  const minToMinutes = fromMinutes + MIN_PERMISSION_MINUTES;
  const maxToMinutes = Math.min(fromMinutes + MAX_PERMISSION_MINUTES, WORK_END_MINUTES);

  const options = [];
  for (let m = minToMinutes; m <= maxToMinutes; m += 30) {
    options.push({
      value: formatTime24Hour(m),
      label: formatTime12Hour(m),
      minutes: m,
    });
  }
  return options;
};

/**
 * Validates From and To times and calculates duration.
 */
export const calculateTimePermissionDuration = (fromTimeVal, toTimeVal) => {
  if (!fromTimeVal) {
    return { isValid: false, error: "From Time is required." };
  }
  if (!toTimeVal) {
    return { isValid: false, error: "To Time is required." };
  }

  const fromMinutes = parseTimeToMinutes(fromTimeVal);
  const toMinutes = parseTimeToMinutes(toTimeVal);

  if (fromMinutes === null || toMinutes === null) {
    return { isValid: false, error: "Invalid time format provided." };
  }

  // Working hours check
  if (
    fromMinutes < WORK_START_MINUTES ||
    fromMinutes > WORK_END_MINUTES ||
    toMinutes < WORK_START_MINUTES ||
    toMinutes > WORK_END_MINUTES
  ) {
    return {
      isValid: false,
      error: "Time Permission must be between 8:00 AM and 5:00 PM.",
    };
  }

  // Sequence check
  if (toMinutes <= fromMinutes) {
    return {
      isValid: false,
      error: "End time must be later than start time.",
    };
  }

  const durationMinutes = toMinutes - fromMinutes;

  // Minimum duration check
  if (durationMinutes < MIN_PERMISSION_MINUTES) {
    return {
      isValid: false,
      error: "Time Permission must be at least 30 minutes.",
    };
  }

  // Maximum duration check
  if (durationMinutes > MAX_PERMISSION_MINUTES) {
    return {
      isValid: false,
      error: "Time Permission cannot exceed 2 hours.",
    };
  }

  const hoursFloat = durationMinutes / 60;

  return {
    isValid: true,
    durationMinutes,
    hoursFloat,
    durationText: formatDurationText(durationMinutes),
    shortDurationText: formatDurationText(durationMinutes, true),
    fromTime24: formatTime24Hour(fromMinutes),
    toTime24: formatTime24Hour(toMinutes),
    fromTime12: formatTime12Hour(fromMinutes),
    toTime12: formatTime12Hour(toMinutes),
    error: null,
  };
};

