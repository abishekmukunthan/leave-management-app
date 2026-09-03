import pool from "../config/db.js";

export const authDao = {
  // Find user by username or email for flexible login lookup
  async findUserByUsername(username) {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.username,
        u.password,
        u.role,
        u.team_id,
        COALESCE(t.name, 'Unassigned') AS team_name,
        COALESCE(u.is_active, true) AS is_active,
        COALESCE(u.must_change_password, false) AS must_change_password,
        ep.designation,
        ep.department
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1);
    `;
    const result = await pool.query(query, [username.trim()]);
    return result.rows[0] || null;
  },

  // Find user by ID without sensitive password field
  async findUserById(id) {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.username,
        u.role,
        u.team_id,
        COALESCE(t.name, 'Unassigned') AS team_name,
        COALESCE(u.is_active, true) AS is_active,
        COALESCE(u.must_change_password, false) AS must_change_password,
        ep.designation,
        ep.department
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE u.id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // Find user by ID including password field for verification
  async findUserWithPasswordById(id) {
    const query = `
      SELECT 
        id,
        username,
        password,
        COALESCE(is_active, true) AS is_active,
        COALESCE(must_change_password, false) AS must_change_password
      FROM users
      WHERE id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // Update user password and set must_change_password to false
  async updatePassword(userId, newPasswordHash) {
    const query = `
      UPDATE users
      SET 
        password = $2,
        must_change_password = false,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, username, role, must_change_password;
    `;
    const result = await pool.query(query, [userId, newPasswordHash]);
    return result.rows[0] || null;
  },
};
