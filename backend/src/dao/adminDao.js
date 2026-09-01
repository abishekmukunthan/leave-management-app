import pool from "../config/db.js";

export const adminDao = {
  // Fetch all leave requests for admin dashboard
  async getAllLeaveRequests() {
    const query = `
      SELECT 
        lr.id,
        lr.employee_id,
        u.name AS employee_name,
        u.email AS employee_email,
        ep.employee_id AS employee_code,
        ep.designation AS employee_designation,
        ep.department AS employee_department,
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
        sub_u.email AS substitute_email,
        sr.assigned_work,
        sr.substitute_status,
        sr.substitute_remarks,
        sr.accepted_at AS substitute_accepted_at,
        sr.rejected_at AS substitute_rejected_at
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      LEFT JOIN substitute_requests sr ON lr.id = sr.leave_request_id
      LEFT JOIN users sub_u ON sr.substitute_employee_id = sub_u.id
      LEFT JOIN users app_u ON lr.approved_by = app_u.id
      ORDER BY lr.created_at DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  // Fetch leave request by ID
  async getLeaveRequestById(id) {
    const query = `
      SELECT * FROM leave_requests WHERE id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // Admin approves leave request
  async approveLeaveRequest(id, approved_by) {
    const query = `
      UPDATE leave_requests
      SET 
        status = 'Approved',
        approved_by = $2,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [id, approved_by || null]);
    return result.rows[0] || null;
  },

  // Admin rejects leave request
  async rejectLeaveRequest(id, admin_remarks) {
    const query = `
      UPDATE leave_requests
      SET 
        status = 'Rejected',
        admin_remarks = $2,
        rejected_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [id, admin_remarks || null]);
    return result.rows[0] || null;
  },
};
