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
        ep.department,
        COALESCE(
          (
            SELECT json_agg(up.permission_id ORDER BY up.permission_id)
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = u.id AND p.is_active = true
          ),
          '[]'::json
        ) AS permissions,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', t_lead.id, 'name', t_lead.name) ORDER BY t_lead.name)
            FROM teams t_lead
            WHERE t_lead.team_admin_id = u.id AND COALESCE(t_lead.is_active, true) = true
          ),
          '[]'::json
        ) AS incharge_teams
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1);
    `;
    const result = await pool.query(query, [username.trim()]);
    const user = result.rows[0] || null;
    if (user) {
      user.permissions = Array.isArray(user.permissions)
        ? user.permissions
        : typeof user.permissions === "string"
        ? JSON.parse(user.permissions)
        : [];
      user.incharge_teams = Array.isArray(user.incharge_teams)
        ? user.incharge_teams
        : typeof user.incharge_teams === "string"
        ? JSON.parse(user.incharge_teams)
        : [];
      user.approval_permissions_count = user.permissions.length;
      user.can_approve_leaves = Boolean(
        user.approval_permissions_count > 0 ||
        user.incharge_teams.length > 0 ||
        user.role === "team_admin" ||
        user.role === "admin" ||
        user.role === "superior_admin"
      );
    }
    return user;
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
        ep.department,
        COALESCE(
          (
            SELECT json_agg(up.permission_id ORDER BY up.permission_id)
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = u.id AND p.is_active = true
          ),
          '[]'::json
        ) AS permissions,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', t_lead.id, 'name', t_lead.name) ORDER BY t_lead.name)
            FROM teams t_lead
            WHERE t_lead.team_admin_id = u.id AND COALESCE(t_lead.is_active, true) = true
          ),
          '[]'::json
        ) AS incharge_teams
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE u.id = $1;
    `;
    const result = await pool.query(query, [id]);
    const user = result.rows[0] || null;
    if (user) {
      user.permissions = Array.isArray(user.permissions)
        ? user.permissions
        : typeof user.permissions === "string"
        ? JSON.parse(user.permissions)
        : [];
      user.incharge_teams = Array.isArray(user.incharge_teams)
        ? user.incharge_teams
        : typeof user.incharge_teams === "string"
        ? JSON.parse(user.incharge_teams)
        : [];
      user.approval_permissions_count = user.permissions.length;
      user.can_approve_leaves = Boolean(
        user.approval_permissions_count > 0 ||
        user.incharge_teams.length > 0 ||
        user.role === "team_admin" ||
        user.role === "admin" ||
        user.role === "superior_admin"
      );
    }
    return user;
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
