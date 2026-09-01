import pool from "../config/db.js";

export const leaveDao = {
  // Create leave with a designated substitute (Atomic Transaction)
  async createLeaveWithSubstitute({
    employee_id,
    leave_type,
    start_date,
    end_date,
    permission_date,
    permission_hours,
    reason,
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
          start_date,
          end_date,
          permission_date,
          permission_hours,
          reason,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'Waiting for Substitute Approval')
        RETURNING *;
      `;
      const leaveRes = await client.query(leaveInsertQuery, [
        employee_id,
        leave_type,
        start_date,
        end_date,
        permission_date,
        permission_hours,
        reason,
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
    start_date,
    end_date,
    permission_date,
    permission_hours,
    reason,
  }) {
    const query = `
      INSERT INTO leave_requests (
        employee_id,
        leave_type,
        start_date,
        end_date,
        permission_date,
        permission_hours,
        reason,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Waiting for Admin Approval')
      RETURNING *;
    `;
    const result = await pool.query(query, [
      employee_id,
      leave_type,
      start_date,
      end_date,
      permission_date,
      permission_hours,
      reason,
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
};
