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
          permission_hours,
          reason,
          requested_units,
          is_paycut_leave,
          paycut_units,
          quota_warning_message,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Waiting for Substitute Approval')
        RETURNING *;
      `;
      const leaveRes = await client.query(leaveInsertQuery, [
        employee_id,
        leave_type,
        leave_type_id || null,
        start_date,
        end_date,
        permission_date,
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
        permission_hours,
        reason,
        requested_units,
        is_paycut_leave,
        paycut_units,
        quota_warning_message,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Waiting for Admin Approval')
      RETURNING *;
    `;
    const result = await pool.query(query, [
      employee_id,
      leave_type,
      leave_type_id || null,
      start_date,
      end_date,
      permission_date,
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

  // Get active employees eligible to act as substitute
  async getSubstituteEmployees({ employee_id = null, search = null, limit = 50 }) {
    const conditions = ["u.is_active = true", "u.role != 'superior_admin'"];
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
};
