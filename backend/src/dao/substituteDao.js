import pool from "../config/db.js";

export const substituteDao = {
  // Fetch all substitute duty requests assigned to a substitute employee
  async getSubstituteRequestsByEmployeeId(substitute_employee_id) {
    const query = `
      SELECT 
        sr.id,
        sr.leave_request_id,
        sr.substitute_employee_id,
        sr.assigned_work,
        sr.substitute_status,
        sr.substitute_remarks,
        sr.accepted_at,
        sr.rejected_at,
        sr.created_at,
        sr.updated_at,
        lr.employee_id AS requesting_employee_id,
        req_u.name AS requesting_employee_name,
        req_u.email AS requesting_employee_email,
        req_ep.employee_id AS requesting_employee_code,
        req_ep.designation AS requesting_employee_designation,
        req_ep.department AS requesting_employee_department,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.permission_date,
        lr.permission_hours,
        lr.reason,
        lr.status AS leave_request_status
      FROM substitute_requests sr
      JOIN leave_requests lr ON sr.leave_request_id = lr.id
      JOIN users req_u ON lr.employee_id = req_u.id
      LEFT JOIN employee_profiles req_ep ON req_u.id = req_ep.user_id
      WHERE sr.substitute_employee_id = $1
      ORDER BY sr.created_at DESC;
    `;
    const result = await pool.query(query, [substitute_employee_id]);
    return result.rows;
  },

  // Fetch substitute request by ID
  async getSubstituteRequestById(id) {
    const query = `
      SELECT * FROM substitute_requests WHERE id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // Substitute accepts request -> update substitute request and move leave request to Waiting for Admin Approval
  async acceptSubstituteRequest(id) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Update substitute request
      const updateSubQuery = `
        UPDATE substitute_requests
        SET 
          substitute_status = 'Accepted',
          accepted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
      `;
      const subRes = await client.query(updateSubQuery, [id]);
      if (subRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      const updatedSubRequest = subRes.rows[0];

      // 2. Update associated leave request status to 'Waiting for Admin Approval'
      const updateLeaveQuery = `
        UPDATE leave_requests
        SET 
          status = 'Waiting for Admin Approval',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
      `;
      const leaveRes = await client.query(updateLeaveQuery, [
        updatedSubRequest.leave_request_id,
      ]);
      const updatedLeaveRequest = leaveRes.rows[0];

      await client.query("COMMIT");
      return {
        substitute_request: updatedSubRequest,
        leave_request: updatedLeaveRequest,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Substitute rejects request -> update substitute request with remarks; leave remains Waiting for Substitute Approval
  async rejectSubstituteRequest(id, substitute_remarks) {
    const query = `
      UPDATE substitute_requests
      SET 
        substitute_status = 'Rejected',
        substitute_remarks = $2,
        rejected_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [id, substitute_remarks || null]);
    return result.rows[0] || null;
  },
};
