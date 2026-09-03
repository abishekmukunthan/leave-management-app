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

  // Admin approves leave request and deducts leave quota
  async approveLeaveRequest(id, approved_by) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Get leave request details
      const leaveRes = await client.query("SELECT * FROM leave_requests WHERE id = $1 FOR UPDATE", [id]);
      if (leaveRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      const leave = leaveRes.rows[0];

      // 2. Update status to Approved
      const updateQuery = `
        UPDATE leave_requests
        SET 
          status = 'Approved',
          approved_by = $2,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
      `;
      const updatedRes = await client.query(updateQuery, [id, approved_by || null]);
      const approvedLeave = updatedRes.rows[0];

      // 3. Deduct Quota from employee_leave_entitlements
      const employeeId = leave.employee_id;
      const reqUnits = parseFloat(leave.requested_units) || 0;
      const paycutUnits = parseFloat(leave.paycut_units) || 0;
      // Amount to deduct from quota (only up to available remaining balance)
      const deductFromQuota = Math.max(0, reqUnits - paycutUnits);

      let leaveTypeId = leave.leave_type_id;
      if (!leaveTypeId && leave.leave_type) {
        const ltRes = await client.query(
          "SELECT id FROM leave_types WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1) LIMIT 1",
          [leave.leave_type.trim()]
        );
        if (ltRes.rows.length > 0) leaveTypeId = ltRes.rows[0].id;
      }

      if (employeeId && leaveTypeId && deductFromQuota > 0) {
        const currentYear = new Date().getFullYear();
        const entRes = await client.query(
          "SELECT id, allocated, used, remaining FROM employee_leave_entitlements WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3",
          [employeeId, leaveTypeId, currentYear]
        );

        if (entRes.rows.length > 0) {
          const currentEnt = entRes.rows[0];
          const newUsed = (parseFloat(currentEnt.used) || 0) + deductFromQuota;
          const newRemaining = Math.max(0, (parseFloat(currentEnt.allocated) || 0) - newUsed);

          await client.query(
            "UPDATE employee_leave_entitlements SET used = $1, remaining = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
            [newUsed, newRemaining, currentEnt.id]
          );
        }
      }

      // 4. Update legacy leave_balances table for backward compatibility
      if (employeeId && deductFromQuota > 0) {
        const leaveTypeStr = (leave.leave_type || "").toLowerCase();
        let columnToUpdate = "casual_leave_balance";
        if (leaveTypeStr.includes("annual")) columnToUpdate = "annual_leave_balance";
        else if (leaveTypeStr.includes("sick")) columnToUpdate = "sick_leave_balance";
        else if (leaveTypeStr.includes("time") || leaveTypeStr.includes("permission")) columnToUpdate = "time_permission_balance";

        await client.query(
          `UPDATE leave_balances 
           SET 
             ${columnToUpdate} = GREATEST(0, ${columnToUpdate} - $1),
             used_leave_count = used_leave_count + $1,
             remaining_leave_count = GREATEST(0, remaining_leave_count - $1),
             updated_at = CURRENT_TIMESTAMP
           WHERE employee_id = $2`,
          [deductFromQuota, employeeId]
        );
      }

      await client.query("COMMIT");
      return approvedLeave;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
