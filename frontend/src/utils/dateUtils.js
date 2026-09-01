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
