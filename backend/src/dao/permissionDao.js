import pool from "../config/db.js";

// Normalization & generation rules for team approval permissions
export const normalizeTeamName = (teamName) => {
  if (!teamName) return "";
  return teamName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

export const generateTeamPermissionId = (teamName) => {
  const cleaned = normalizeTeamName(teamName);
  if (cleaned.endsWith("_TEAM") || cleaned === "TEAM") {
    return `${cleaned}_LEAVE_APPROVAL_PERMISSION`;
  }
  return `${cleaned}_TEAM_LEAVE_APPROVAL_PERMISSION`;
};

export const generateTeamPermissionDescription = (teamName) => {
  const formatted = teamName ? teamName.trim() : "";
  return `Permission for approving ${formatted} team leave`;
};

export const permissionDao = {
  // 1. Get all permissions
  async getAllPermissions() {
    const query = `
      SELECT id, description, permission_type, is_active, created_at, updated_at
      FROM permissions
      ORDER BY id ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  // 2. Get single permission by ID
  async getPermissionById(id) {
    const query = `
      SELECT id, description, permission_type, is_active, created_at, updated_at
      FROM permissions
      WHERE id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // 3. Create a new permission
  async createPermission({ id, description, permission_type = "LEAVE_APPROVAL" }) {
    const checkQuery = `SELECT id FROM permissions WHERE id = $1;`;
    const checkRes = await pool.query(checkQuery, [id]);
    if (checkRes.rows.length > 0) {
      const err = new Error("Permission ID already exists");
      err.statusCode = 400;
      throw err;
    }

    const insertQuery = `
      INSERT INTO permissions (id, description, permission_type, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, true, NOW(), NOW())
      RETURNING id, description, permission_type, is_active, created_at, updated_at;
    `;
    const result = await pool.query(insertQuery, [
      id,
      description.trim(),
      permission_type || "LEAVE_APPROVAL",
    ]);
    return result.rows[0];
  },

  // 4. Update permission description and/or is_active
  async updatePermission(id, { description, is_active }) {
    const existing = await this.getPermissionById(id);
    if (!existing) {
      const err = new Error("Permission not found");
      err.statusCode = 404;
      throw err;
    }

    const descVal = description !== undefined ? description.trim() : existing.description;
    const activeVal = is_active !== undefined ? Boolean(is_active) : existing.is_active;

    const updateQuery = `
      UPDATE permissions
      SET description = $1, is_active = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, description, permission_type, is_active, created_at, updated_at;
    `;
    const result = await pool.query(updateQuery, [descVal, activeVal, id]);
    return result.rows[0];
  },

  // 5. Get user assigned permissions
  async getUserPermissions(userId) {
    const query = `
      SELECT up.permission_id
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1 AND p.is_active = true
      ORDER BY up.permission_id ASC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.map((row) => row.permission_id);
  },

  // 6. Set/Replace user assigned permissions inside transaction
  async setUserPermissions(userId, permissionIds = [], assignedBy = null) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verify user exists
      const userRes = await client.query("SELECT id, name FROM users WHERE id = $1", [userId]);
      if (userRes.rows.length === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }

      // If permissions provided, verify each permission exists and is active
      if (permissionIds.length > 0) {
        const permRes = await client.query(
          "SELECT id FROM permissions WHERE id = ANY($1::text[]) AND is_active = true",
          [permissionIds]
        );
        const validIds = new Set(permRes.rows.map((r) => r.id));
        for (const pId of permissionIds) {
          if (!validIds.has(pId)) {
            const err = new Error(`Permission '${pId}' does not exist or is inactive`);
            err.statusCode = 400;
            throw err;
          }
        }
      }

      // Remove existing permissions
      await client.query("DELETE FROM user_permissions WHERE user_id = $1", [userId]);

      // Check if assignedBy is a valid user in DB, otherwise null
      let validAssignedBy = null;
      if (assignedBy) {
        const adminRes = await client.query("SELECT id FROM users WHERE id = $1", [assignedBy]);
        if (adminRes.rows.length > 0) {
          validAssignedBy = assignedBy;
        }
      }

      // Insert new permissions
      for (const pId of permissionIds) {
        await client.query(
          `INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id, permission_id) DO NOTHING`,
          [userId, pId, validAssignedBy]
        );
      }

      await client.query("COMMIT");
      return permissionIds;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // 7. Get team approval permission
  async getTeamApprovalPermission(teamId) {
    const query = `
      SELECT 
        tap.team_id,
        t.name AS team_name,
        tap.permission_id,
        p.description,
        p.is_active
      FROM team_approval_permissions tap
      JOIN teams t ON tap.team_id = t.id
      JOIN permissions p ON tap.permission_id = p.id
      WHERE tap.team_id = $1;
    `;
    const result = await pool.query(query, [teamId]);
    return result.rows[0] || null;
  },

  // 8. Update/Upsert team approval permission
  async setTeamApprovalPermission(teamId, permissionId, createdBy = null) {
    // Validate team exists
    const teamRes = await pool.query("SELECT id, name FROM teams WHERE id = $1", [teamId]);
    if (teamRes.rows.length === 0) {
      const err = new Error("Team not found");
      err.statusCode = 404;
      throw err;
    }
    const teamName = teamRes.rows[0].name;

    // Validate permission exists and is active
    const permRes = await pool.query("SELECT id, description, is_active FROM permissions WHERE id = $1", [
      permissionId,
    ]);
    if (permRes.rows.length === 0 || !permRes.rows[0].is_active) {
      const err = new Error("Permission does not exist or is inactive");
      err.statusCode = 400;
      throw err;
    }

    let validCreatedBy = null;
    if (createdBy) {
      const adminRes = await pool.query("SELECT id FROM users WHERE id = $1", [createdBy]);
      if (adminRes.rows.length > 0) {
        validCreatedBy = createdBy;
      }
    }

    const upsertQuery = `
      INSERT INTO team_approval_permissions (team_id, permission_id, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (team_id) DO UPDATE
      SET permission_id = EXCLUDED.permission_id, updated_at = NOW()
      RETURNING id, team_id, permission_id, created_by, updated_at;
    `;
    await pool.query(upsertQuery, [teamId, permissionId, validCreatedBy]);
    return {
      team_id: teamId,
      team_name: teamName,
      permission_id: permissionId,
      description: permRes.rows[0].description,
    };
  },

  // 9. Generate missing default leave approval permissions for all active teams
  async generateMissingTeamPermissions(superiorAdminId = null) {
    const teamsRes = await pool.query("SELECT id, name, team_admin_id FROM teams WHERE is_active = true");
    const teams = teamsRes.rows;

    let generatedPermissionsCount = 0;
    let mappedTeamsCount = 0;

    for (const team of teams) {
      const permId = generateTeamPermissionId(team.name);
      const permDesc = generateTeamPermissionDescription(team.name);

      // Create permission if missing
      const permInsert = await pool.query(
        `INSERT INTO permissions (id, description, permission_type, is_active, created_at, updated_at)
         VALUES ($1, $2, 'LEAVE_APPROVAL', true, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING
         RETURNING id;`,
        [permId, permDesc]
      );
      if (permInsert.rows.length > 0) {
        generatedPermissionsCount++;
      }

      // Map team to permission if missing
      const mapInsert = await pool.query(
        `INSERT INTO team_approval_permissions (team_id, permission_id, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (team_id) DO NOTHING
         RETURNING id;`,
        [team.id, permId, superiorAdminId || null]
      );
      if (mapInsert.rows.length > 0) {
        mappedTeamsCount++;
      }

      // If team has a team_admin_id, ensure they have this permission
      if (team.team_admin_id) {
        await pool.query(
          `INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id, permission_id) DO NOTHING;`,
          [team.team_admin_id, permId, superiorAdminId || null]
        );
      }
    }

    return {
      message: "Missing team approval permissions generated successfully.",
      generated_permissions: generatedPermissionsCount,
      mapped_teams: mappedTeamsCount,
      total_active_teams: teams.length,
    };
  },
};
