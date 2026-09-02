import pool from "../config/db.js";

export const adminDao = {
  // Fetch leave requests for admin dashboard (filtered by team if admin_id is a team_admin)
  async getAllLeaveRequests(admin_id = null) {
    let teamIdFilter = null;

    if (admin_id) {
      const userRes = await pool.query(
        `SELECT u.id, u.role, u.team_id, t.id AS managed_team_id 
         FROM users u 
         LEFT JOIN teams t ON t.team_admin_id = u.id 
         WHERE u.id = $1`,
        [admin_id]
      );

      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        if (user.role === "team_admin") {
          teamIdFilter = user.managed_team_id || user.team_id;
        }
        // If superior_admin or admin, teamIdFilter stays null to return all requests
      }
    }

    let query = `
      SELECT 
        lr.id,
        lr.employee_id,
        u.name AS employee_name,
        u.email AS employee_email,
        u.team_id,
        t.name AS team_name,
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
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      LEFT JOIN substitute_requests sr ON lr.id = sr.leave_request_id
      LEFT JOIN users sub_u ON sr.substitute_employee_id = sub_u.id
      LEFT JOIN users app_u ON lr.approved_by = app_u.id
    `;

    const params = [];
    if (teamIdFilter) {
      query += ` WHERE u.team_id = $1`;
      params.push(teamIdFilter);
    }

    query += ` ORDER BY lr.created_at DESC;`;

    const result = await pool.query(query, params);
    return result.rows;
  },

  // Fetch leave request with employee team info by ID
  async getLeaveRequestById(id) {
    const query = `
      SELECT 
        lr.*,
        u.team_id AS employee_team_id,
        u.name AS employee_name,
        u.email AS employee_email
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      WHERE lr.id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // Get user details including team role and managed team ID
  async getUserById(userId) {
    const query = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.team_id, 
        t.id AS managed_team_id,
        t.name AS managed_team_name
      FROM users u
      LEFT JOIN teams t ON t.team_admin_id = u.id
      WHERE u.id = $1;
    `;
    const result = await pool.query(query, [userId]);
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
