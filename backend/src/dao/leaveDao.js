import pool from "../config/db.js";

export const leaveDao = {
  // Create leave with a designated substitute (Atomic Transaction)
  async createLeaveWithSubstitute({
    employee_id,
    leave_type,
    leave_type_id,
    start_date,
    end_date,
    permission_date,
    permission_from_time,
    permission_to_time,
    permission_hours,
    reason,
    requested_units,
    is_paycut_leave,
    paycut_units,
    quota_warning_message,
    substitute_employee_id,
    assigned_work,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Insert leave request with status 'Waiting for Substitute Approval'
      const leaveInsertQuery = `
        INSERT INTO leave_requests (
          employee_id,
          leave_type,
          leave_type_id,
          start_date,
          end_date,
          permission_date,
          permission_from_time,
          permission_to_time,
          permission_hours,
          reason,
          requested_units,
          is_paycut_leave,
          paycut_units,
          quota_warning_message,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Waiting for Substitute Approval')
        RETURNING *;
      `;
      const leaveRes = await client.query(leaveInsertQuery, [
        employee_id,
        leave_type,
        leave_type_id || null,
        start_date,
        end_date,
        permission_date,
        permission_from_time || null,
        permission_to_time || null,
        permission_hours,
        reason,
        requested_units || 0,
        Boolean(is_paycut_leave),
        paycut_units || 0,
        quota_warning_message || null,
      ]);
      const leave = leaveRes.rows[0];

      // 2. Insert substitute request linked to the leave request
      const substituteInsertQuery = `
        INSERT INTO substitute_requests (
          leave_request_id,
          substitute_employee_id,
          assigned_work,
          substitute_status
        )
        VALUES ($1, $2, $3, 'Pending')
        RETURNING *;
      `;
      const subRes = await client.query(substituteInsertQuery, [
        leave.id,
        substitute_employee_id,
        assigned_work,
      ]);
      const substituteRequest = subRes.rows[0];

      await client.query("COMMIT");
      return { ...leave, substitute_request: substituteRequest };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Create leave without a substitute (Direct to Admin Approval)
  async createLeaveDirect({
    employee_id,
    leave_type,
    leave_type_id,
    start_date,
    end_date,
    permission_date,
    permission_from_time,
    permission_to_time,
    permission_hours,
    reason,
    requested_units,
    is_paycut_leave,
    paycut_units,
    quota_warning_message,
  }) {
    const query = `
      INSERT INTO leave_requests (
        employee_id,
        leave_type,
        leave_type_id,
        start_date,
        end_date,
        permission_date,
        permission_from_time,
        permission_to_time,
        permission_hours,
        reason,
        requested_units,
        is_paycut_leave,
        paycut_units,
        quota_warning_message,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Waiting for Admin Approval')
      RETURNING *;
    `;
    const result = await pool.query(query, [
      employee_id,
      leave_type,
      leave_type_id || null,
      start_date,
      end_date,
      permission_date,
      permission_from_time || null,
      permission_to_time || null,
      permission_hours,
      reason,
      requested_units || 0,
      Boolean(is_paycut_leave),
      paycut_units || 0,
      quota_warning_message || null,
    ]);
    return result.rows[0];
  },

  // Fetch all leaves applied by a specific employee
  async getLeavesByEmployeeId(employee_id) {
    const query = `
      SELECT 
        lr.id,
        lr.employee_id,
        lr.leave_type,
        lr.leave_type_id,
        lr.requested_units,
        lr.is_paycut_leave,
        lr.paycut_units,
        lr.quota_warning_message,
        lr.start_date,
        lr.end_date,
        lr.permission_date,
        lr.permission_from_time,
        lr.permission_to_time,
        lr.permission_hours,
        lr.reason,
        lr.status,
        lr.admin_remarks,
        lr.approved_by,
        app_u.name AS approver_name,
        lr.approved_at,
        lr.rejected_at,
        lr.created_at,
        lr.updated_at,
        sr.id AS substitute_request_id,
        sr.substitute_employee_id,
        sub_u.name AS substitute_name,
        sr.assigned_work,
        sr.substitute_status,
        sr.substitute_remarks
      FROM leave_requests lr
      LEFT JOIN substitute_requests sr ON lr.id = sr.leave_request_id
      LEFT JOIN users sub_u ON sr.substitute_employee_id = sub_u.id
      LEFT JOIN users app_u ON lr.approved_by = app_u.id
      WHERE lr.employee_id = $1
      ORDER BY lr.created_at DESC;
    `;
    const result = await pool.query(query, [employee_id]);
    return result.rows;
  },

  // Fetch a single leave request by ID
  async getLeaveById(id) {
    const query = `SELECT * FROM leave_requests WHERE id = $1;`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // Check for an existing active (non-rejected, non-cancelled) overlapping leave request for an employee
  async findOverlappingLeave(employee_id, startDate, endDate) {
    const query = `
      SELECT 
        id,
        employee_id,
        leave_type,
        start_date,
        end_date,
        permission_date,
        status,
        created_at
      FROM leave_requests
      WHERE employee_id = $1
        AND LOWER(status) NOT IN ('rejected', 'cancelled', 'canceled')
        AND COALESCE(start_date, permission_date)::date <= $3::date
        AND COALESCE(end_date, permission_date)::date >= $2::date
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const result = await pool.query(query, [employee_id, startDate, endDate]);
    return result.rows[0] || null;
  },

  // Get active employees eligible to act as substitute (all active roles: employee, team_admin, superior_admin)
  async getSubstituteEmployees({ employee_id = null, search = null, limit = 50 }) {
    const conditions = ["u.is_active = true"];
    const params = [];

    if (employee_id) {
      params.push(employee_id);
      conditions.push(`u.id != $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      conditions.push(`(
        u.name ILIKE $${idx} OR
        u.username ILIKE $${idx} OR
        u.email ILIKE $${idx} OR
        u.role ILIKE $${idx} OR
        t.name ILIKE $${idx} OR
        ep.department ILIKE $${idx} OR
        ep.designation ILIKE $${idx}
      )`);
    }

    const maxLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    params.push(maxLimit);

    const query = `
      SELECT 
        u.id, 
        u.name, 
        u.username, 
        u.email, 
        u.role, 
        t.name AS team_name, 
        COALESCE(ep.department, t.name) AS department, 
        ep.designation
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY u.name ASC
      LIMIT $${params.length};
    `;

    const result = await pool.query(query, params);
    return result.rows;
  },

  // Get user details by ID for substitute validation
  async getSubstituteUserById(id) {
    const query = `
      SELECT id, name, username, email, role, is_active, team_id
      FROM users
      WHERE id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // Calculate real leave balances for an employee based on configured quotas and approved requests only
  async getEmployeeLeaveBalances(employeeId) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // 1. Fetch active leave types
    const ltRes = await pool.query(`
      SELECT id, name, code, unit, default_quota, requires_substitute
      FROM leave_types
      WHERE is_active = true
      ORDER BY name ASC;
    `);
    const leaveTypes = ltRes.rows;

    // 2. Fetch employee entitlements for current year
    const entRes = await pool.query(`
      SELECT leave_type_id, allocated, used, remaining, year
      FROM employee_leave_entitlements
      WHERE employee_id = $1 AND year = $2;
    `, [employeeId, currentYear]);
    const entitlementsMap = new Map();
    entRes.rows.forEach((ent) => {
      entitlementsMap.set(ent.leave_type_id, ent);
    });

    // 3. Fetch ONLY Approved leave requests for this employee
    const reqRes = await pool.query(`
      SELECT 
        id,
        leave_type,
        leave_type_id,
        start_date,
        end_date,
        permission_date,
        permission_from_time,
        permission_to_time,
        permission_hours,
        requested_units,
        status,
        created_at
      FROM leave_requests
      WHERE employee_id = $1 AND status = 'Approved';
    `, [employeeId]);
    const approvedRequests = reqRes.rows;

    // Helper to parse time strings to minutes
    const parseMinutes = (timeVal) => {
      if (!timeVal) return null;
      const s = String(timeVal).trim();
      const m24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
      const m12 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
      if (m12) {
        let h = parseInt(m12[1], 10);
        const m = parseInt(m12[2], 10);
        const p = m12[4].toUpperCase();
        if (p === "AM" && h === 12) h = 0;
        if (p === "PM" && h < 12) h += 12;
        return h * 60 + m;
      }
      return null;
    };

    // Calculate approved usage by leave type
    const usedByTypeId = new Map();
    const usedByTypeName = new Map();

    for (const req of approvedRequests) {
      const isTimePerm = req.leave_type === "Time Permission" || (req.permission_date !== null && req.permission_date !== undefined);

      if (isTimePerm) {
        // Time Permission: calculate for CURRENT MONTH only
        let reqYear = currentYear;
        let reqMonth = currentMonth;

        if (req.permission_date) {
          const d = new Date(req.permission_date);
          if (!isNaN(d.getTime())) {
            reqYear = d.getFullYear();
            reqMonth = d.getMonth() + 1;
          }
        } else if (req.created_at) {
          const d = new Date(req.created_at);
          if (!isNaN(d.getTime())) {
            reqYear = d.getFullYear();
            reqMonth = d.getMonth() + 1;
          }
        }

        // Exclude if not in current calendar month and year
        if (reqYear !== currentYear || reqMonth !== currentMonth) {
          continue;
        }

        let hours = 0;
        if (req.permission_from_time && req.permission_to_time) {
          const fromM = parseMinutes(req.permission_from_time);
          const toM = parseMinutes(req.permission_to_time);
          if (fromM !== null && toM !== null && toM > fromM) {
            hours = (toM - fromM) / 60;
          }
        }
        
        if (hours <= 0 && req.requested_units !== null && req.requested_units !== undefined && parseFloat(req.requested_units) > 0) {
          hours = parseFloat(req.requested_units);
        } else if (hours <= 0 && req.permission_hours) {
          const match = String(req.permission_hours).match(/([\d.]+)/);
          hours = match ? parseFloat(match[1]) : 1;
        }

        if (req.leave_type_id) {
          usedByTypeId.set(req.leave_type_id, (usedByTypeId.get(req.leave_type_id) || 0) + hours);
        }
        const lowerName = (req.leave_type || "Time Permission").toLowerCase().trim();
        usedByTypeName.set(lowerName, (usedByTypeName.get(lowerName) || 0) + hours);
      } else {
        // Standard Leave: calculate for CURRENT YEAR
        let reqYear = currentYear;
        if (req.start_date) {
          const d = new Date(req.start_date);
          if (!isNaN(d.getTime())) {
            reqYear = d.getFullYear();
          }
        } else if (req.created_at) {
          const d = new Date(req.created_at);
          if (!isNaN(d.getTime())) {
            reqYear = d.getFullYear();
          }
        }

        // Exclude if not in current calendar year
        if (reqYear !== currentYear) {
          continue;
        }

        let days = 0;
        if (req.requested_units !== null && req.requested_units !== undefined && parseFloat(req.requested_units) > 0) {
          days = parseFloat(req.requested_units);
        } else if (req.start_date && req.end_date) {
          const start = new Date(req.start_date);
          const end = new Date(req.end_date);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
          days = req.leave_type === "Half Day Leave" ? Math.max(0.5, diffDays * 0.5) : Math.max(1, diffDays);
        } else {
          days = 1;
        }

        if (req.leave_type_id) {
          usedByTypeId.set(req.leave_type_id, (usedByTypeId.get(req.leave_type_id) || 0) + days);
        }
        const lowerName = (req.leave_type || "").toLowerCase().trim();
        usedByTypeName.set(lowerName, (usedByTypeName.get(lowerName) || 0) + days);
      }
    }

    // Build balances list and mapped response
    const balancesList = [];
    const responseMap = {};

    for (const lt of leaveTypes) {
      const ent = entitlementsMap.get(lt.id);
      const quota = ent ? (parseFloat(ent.allocated) || 0) : (parseFloat(lt.default_quota) || 0);
      const used = (usedByTypeId.get(lt.id) !== undefined)
        ? usedByTypeId.get(lt.id)
        : (usedByTypeName.get(lt.name.toLowerCase().trim()) || 0);
      const remaining = Math.max(0, Math.round((quota - used) * 100) / 100);

      const item = {
        id: lt.id,
        code: lt.code,
        name: lt.name,
        unit: lt.unit,
        quota,
        total: quota,
        used: Math.round(used * 100) / 100,
        remaining,
      };

      balancesList.push(item);

      // Key mappings for easy frontend consumption
      const lower = lt.name.toLowerCase();
      if (lower.includes("annual")) {
        responseMap.annual = item;
        responseMap.annualLeave = item;
      } else if (lower.includes("sick")) {
        responseMap.sick = item;
        responseMap.sickLeave = item;
      } else if (lower.includes("casual")) {
        responseMap.casual = item;
        responseMap.casualLeave = item;
      } else if (lower.includes("time") || lower.includes("permission")) {
        responseMap.timePermission = item;
      } else if (lower.includes("emergency")) {
        responseMap.emergency = item;
        responseMap.emergencyLeave = item;
      } else if (lower.includes("half")) {
        responseMap.halfDay = item;
        responseMap.halfDayLeave = item;
      }
    }

    // Fallbacks if specific types are not configured in DB
    if (!responseMap.annual) {
      responseMap.annual = { quota: 15, total: 15, used: 0, remaining: 15, name: "Annual Leave", unit: "days" };
      responseMap.annualLeave = responseMap.annual;
    }
    if (!responseMap.sick) {
      responseMap.sick = { quota: 10, total: 10, used: 0, remaining: 10, name: "Sick Leave", unit: "days" };
      responseMap.sickLeave = responseMap.sick;
    }
    if (!responseMap.casual) {
      responseMap.casual = { quota: 6, total: 6, used: 0, remaining: 6, name: "Casual Leave", unit: "days" };
      responseMap.casualLeave = responseMap.casual;
    }
    if (!responseMap.timePermission) {
      responseMap.timePermission = { quota: 6, total: 6, used: 0, remaining: 6, name: "Time Permission", unit: "hours" };
    }

    return {
      ...responseMap,
      balancesList,
    };
  },
};
