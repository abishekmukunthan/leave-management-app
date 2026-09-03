import pool from "../config/db.js";

// Helper to calculate requested units based on leave type and dates/hours
export const calculateRequestedUnits = ({ leave_type, start_date, end_date, permission_hours }) => {
  if (leave_type === "Time Permission") {
    let hours = 1;
    if (typeof permission_hours === "number") {
      hours = permission_hours;
    } else if (typeof permission_hours === "string") {
      const match = permission_hours.match(/(\d+)/);
      if (match) {
        hours = parseInt(match[1], 10);
      }
    }
    return Math.max(1, hours);
  }

  // Standard leaves or Half Day Leave
  if (!start_date || !end_date) return 1;

  const start = new Date(start_date);
  const end = new Date(end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;

  // Calculate inclusive calendar days
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (leave_type === "Half Day Leave") {
    return Math.max(0.5, diffDays * 0.5);
  }

  return Math.max(1, diffDays);
};

// Quota Checker function
export const checkLeaveQuota = async (clientOrPool, { employee_id, leave_type, start_date, end_date, permission_hours }) => {
  const executor = clientOrPool || pool;

  const requested_units = calculateRequestedUnits({
    leave_type,
    start_date,
    end_date,
    permission_hours,
  });

  // 1. Get leave type details
  const ltQuery = `
    SELECT id, name, code, unit, default_quota, requires_substitute 
    FROM leave_types 
    WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1)
    LIMIT 1;
  `;
  const ltRes = await executor.query(ltQuery, [leave_type.trim()]);
  const leaveTypeObj = ltRes.rows[0] || null;
  const leave_type_id = leaveTypeObj ? leaveTypeObj.id : null;
  const unit = leaveTypeObj ? leaveTypeObj.unit : (leave_type === "Time Permission" ? "hours" : "days");

  // 2. Get employee leave entitlement for current year
  const currentYear = new Date().getFullYear();
  let entitlement = null;
  let remaining = 0;
  let allocated = leaveTypeObj ? parseFloat(leaveTypeObj.default_quota) : 0;
  let used = 0;

  if (leave_type_id) {
    const entQuery = `
      SELECT id, allocated, used, remaining 
      FROM employee_leave_entitlements 
      WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3;
    `;
    const entRes = await executor.query(entQuery, [employee_id, leave_type_id, currentYear]);
    if (entRes.rows.length > 0) {
      entitlement = entRes.rows[0];
      allocated = parseFloat(entitlement.allocated) || 0;
      used = parseFloat(entitlement.used) || 0;
      remaining = parseFloat(entitlement.remaining) || 0;
    } else {
      remaining = allocated;
    }
  }

  // 3. Compare requested_units vs remaining
  let is_paycut_leave = false;
  let paycut_units = 0;
  let quota_warning_message = null;

  if (requested_units > remaining) {
    is_paycut_leave = true;
    paycut_units = requested_units - Math.max(0, remaining);
    quota_warning_message = "Your leave balance is not enough. This leave may be considered as no-pay / paycut leave.";
  }

  return {
    leave_type_id,
    requested_units,
    is_paycut_leave,
    paycut_units,
    quota_warning_message,
    quotaDetails: {
      leaveType: leaveTypeObj ? leaveTypeObj.name : leave_type,
      allocated,
      used,
      remaining,
      requested: requested_units,
      paycutUnits: paycut_units,
      unit,
    },
  };
};
