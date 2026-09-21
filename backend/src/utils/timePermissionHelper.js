/**
 * Time Permission Helper Utilities
 * Enforces business rules:
 * - Working hours: 8:00 AM (08:00) to 5:00 PM (17:00)
 * - Minimum duration: 30 minutes
 * - Maximum duration: 2 hours (120 minutes)
 * - From Time must be before To Time
 */

const WORK_START_MINUTES = 8 * 60;   // 08:00 AM -> 480
const WORK_END_MINUTES = 17 * 60;    // 05:00 PM -> 1020
const MIN_DURATION_MINUTES = 30;
const MAX_DURATION_MINUTES = 120;

/**
 * Converts various time formats (24h or 12h) to total minutes from midnight.
 * Examples:
 *   "08:00" -> 480
 *   "08:30:00" -> 510
 *   "10:00 AM" -> 600
 *   "1:30 PM" -> 810
 *   "17:00" -> 1020
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
 * Formats total minutes or a time string to normalized 24-hour HH:mm:ss string for PostgreSQL TIME.
 */
export const normalizeTo24Hour = (timeVal) => {
  let minutes = typeof timeVal === "number" ? timeVal : parseTimeToMinutes(timeVal);
  if (minutes === null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};

/**
 * Formats a time string or total minutes into 12-hour representation (e.g., "10:00 AM", "1:30 PM").
 */
export const formatTime12Hour = (timeVal) => {
  if (!timeVal && timeVal !== 0) return null;
  const totalMinutes = typeof timeVal === "number" ? timeVal : parseTimeToMinutes(timeVal);
  if (totalMinutes === null) return typeof timeVal === "string" ? timeVal : null;

  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
};

/**
 * Formats duration in minutes into friendly human-readable text.
 * e.g., 30 -> "30 minutes"
 *       60 -> "1 hour"
 *       90 -> "1 hour 30 minutes"
 *       120 -> "2 hours"
 */
export const formatDurationText = (minutes) => {
  if (!minutes || minutes <= 0) return "0 minutes";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  const parts = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  if (m > 0) parts.push(`${m} minutes`);
  return parts.join(" ");
};

/**
 * Validates Time Permission From & To times against business rules.
 */
export const validateTimePermission = (fromTime, toTime) => {
  if (!fromTime || !fromTime.trim()) {
    return { isValid: false, error: "From Time is required." };
  }
  if (!toTime || !toTime.trim()) {
    return { isValid: false, error: "To Time is required." };
  }

  const fromMinutes = parseTimeToMinutes(fromTime);
  const toMinutes = parseTimeToMinutes(toTime);

  if (fromMinutes === null || toMinutes === null) {
    return { isValid: false, error: "Invalid time format provided." };
  }

  // 1. Working hours check: 8:00 AM to 5:00 PM
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

  // 2. Order check: End time must be later than start time
  if (toMinutes <= fromMinutes) {
    return {
      isValid: false,
      error: "End time must be later than start time.",
    };
  }

  // 3. Minimum duration: 30 minutes
  const durationMinutes = toMinutes - fromMinutes;
  if (durationMinutes < MIN_DURATION_MINUTES) {
    return {
      isValid: false,
      error: "Time Permission must be at least 30 minutes.",
    };
  }

  // 4. Maximum duration: 120 minutes (2 hours)
  if (durationMinutes > MAX_DURATION_MINUTES) {
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
    permissionHours: String(hoursFloat),
    formattedDuration: formatDurationText(durationMinutes),
    fromTimeNormalized: normalizeTo24Hour(fromMinutes),
    toTimeNormalized: normalizeTo24Hour(toMinutes),
    fromTime12: formatTime12Hour(fromMinutes),
    toTime12: formatTime12Hour(toMinutes),
  };
};
