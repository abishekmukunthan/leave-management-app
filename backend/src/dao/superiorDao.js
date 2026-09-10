import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { generateTeamPermissionId, generateTeamPermissionDescription } from "./permissionDao.js";

// Helper to safely format YYYY-MM-DD date string
const formatDateStr = (val) => {
  if (!val) return null;
  if (typeof val === "string") {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).split("T")[0];
};

export const superiorDao = {
  // 1. Get complete superior dashboard summary with overview, teams, and lists
  async getDashboardSummary() {
    // A. Base Leave Requests with all joined fields
    const allLeavesQuery = `
      SELECT 
        lr.id,
        lr.employee_id,
        u.name AS employee_name,
        u.email AS employee_email,
        ep.employee_id AS employee_code,
        ep.designation AS employee_designation,
        ep.department AS employee_department,
        u.team_id,
        COALESCE(t.name, 'Unassigned') AS team_name,
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
      ORDER BY lr.created_at DESC;
    `;
    const leavesRes = await pool.query(allLeavesQuery);
    const leaves = leavesRes.rows;

    // B. Base Teams list with team admin & member counts
    const teamsQuery = `
      SELECT 
        t.id AS team_id,
        t.name AS team_name,
        t.team_admin_id,
        admin_u.name AS team_admin_name,
        COUNT(DISTINCT u.id) AS total_members
      FROM teams t
      LEFT JOIN users admin_u ON t.team_admin_id = admin_u.id
      LEFT JOIN users u ON u.team_id = t.id
      GROUP BY t.id, t.name, t.team_admin_id, admin_u.name
      ORDER BY t.name ASC;
    `;
    const teamsRes = await pool.query(teamsQuery);
    const teams = teamsRes.rows;

    // C. Today's date string in local YYYY-MM-DD
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Helper to test if a normal leave is active today
    const isNormalLeaveToday = (leave) => {
      if (leave.status !== "Approved") return false;
      if (leave.leave_type === "Time Permission") return false;
      const start = formatDateStr(leave.start_date);
      const end = formatDateStr(leave.end_date);
      return Boolean(start && end && todayStr >= start && todayStr <= end);
    };

    // Helper to test if a time permission is active today
    const isTimePermissionToday = (leave) => {
      if (leave.status !== "Approved") return false;
      if (leave.leave_type !== "Time Permission") return false;
      const permDate = formatDateStr(leave.permission_date);
      return Boolean(permDate && permDate === todayStr);
    };

    // Helper to test if a request is pending substitute approval
    const isPendingSubstitute = (leave) => {
      return (
        leave.status === "Waiting for Substitute Approval" &&
        (leave.substitute_status === "Pending" ||
          leave.substitute_status === "Waiting for Substitute Approval")
      );
    };

    // Filter lists
    const peopleOnLeaveToday = leaves.filter(isNormalLeaveToday);
    const timePermissionsToday = leaves.filter(isTimePermissionToday);
    const pendingTeamAdminApprovals = leaves.filter(
      (l) => l.status === "Waiting for Admin Approval"
    );
    const pendingSubstituteApprovals = leaves.filter(isPendingSubstitute);
    const rejectedSubstituteRequests = leaves.filter(
      (l) => l.substitute_status === "Rejected"
    );
    const approvedRequests = leaves.filter((l) => l.status === "Approved");
    const rejectedRequests = leaves.filter((l) => l.status === "Rejected");
    const approvalActivity = leaves
      .filter((l) => l.status === "Approved" || l.status === "Rejected")
      .slice(0, 15);

    // Overview metrics
    const onLeaveTodayCount = peopleOnLeaveToday.length;
    const timePermissionTodayCount = timePermissionsToday.length;
    const totalAwayTodayCount = onLeaveTodayCount + timePermissionTodayCount;

    const overview = {
      totalRequests: leaves.length,
      onLeaveToday: onLeaveTodayCount,
      timePermissionToday: timePermissionTodayCount,
      totalAwayToday: totalAwayTodayCount,
      pendingTeamAdminApprovals: pendingTeamAdminApprovals.length,
      pendingSubstituteApprovals: pendingSubstituteApprovals.length,
      approvedRequests: approvedRequests.length,
      rejectedRequests: rejectedRequests.length,
    };

    // Team Summary using exact matching logic
    const teamSummary = teams.map((team) => {
      const teamLeaves = leaves.filter((l) => l.team_id === team.team_id);
      const teamOnLeaveToday = teamLeaves.filter(isNormalLeaveToday).length;
      const teamTimePermissionToday = teamLeaves.filter(isTimePermissionToday).length;
      const teamTotalAwayToday = teamOnLeaveToday + teamTimePermissionToday;

      return {
        team_id: team.team_id,
        team_name: team.team_name,
        team_admin_id: team.team_admin_id,
        team_admin_name: team.team_admin_name || "Unassigned",
        total_members: parseInt(team.total_members, 10) || 0,
        total_requests: teamLeaves.length,
        pending_team_admin: teamLeaves.filter(
          (l) => l.status === "Waiting for Admin Approval"
        ).length,
        pending_substitute: teamLeaves.filter(isPendingSubstitute).length,
        approved: teamLeaves.filter((l) => l.status === "Approved").length,
        rejected: teamLeaves.filter((l) => l.status === "Rejected").length,
        on_leave_today: teamOnLeaveToday,
        time_permission_today: teamTimePermissionToday,
        total_away_today: teamTotalAwayToday,
      };
    });

    return {
      overview,
      teamSummary,
      peopleOnLeaveToday,
      timePermissionsToday,
      pendingTeamAdminApprovals,
      pendingSubstituteApprovals,
      rejectedSubstituteRequests,
      approvalActivity,
    };
  },

  // 2. Get all users with profile and team details
  async getAllUsers() {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.username,
        u.role,
        u.team_id,
        COALESCE(t.name, 'Unassigned') AS team_name,
        (SELECT id FROM teams WHERE team_admin_id = u.id LIMIT 1) AS is_team_lead_of_team_id,
        (SELECT name FROM teams WHERE team_admin_id = u.id LIMIT 1) AS is_team_lead_of_team_name,
        (SELECT id FROM teams WHERE team_admin_id = u.id LIMIT 1) AS incharge_of_team_id,
        (SELECT name FROM teams WHERE team_admin_id = u.id LIMIT 1) AS incharge_of_team_name,
        COALESCE(u.is_active, true) AS is_active,
        COALESCE(u.must_change_password, false) AS must_change_password,
        u.created_by,
        creator.name AS created_by_name,
        ep.employee_id AS employee_code,
        ep.phone_number,
        ep.designation,
        ep.department,
        ep.employment_type,
        ep.date_of_joining,
        COALESCE(
          (
            SELECT json_agg(up.permission_id ORDER BY up.permission_id)
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = u.id AND p.is_active = true
          ),
          '[]'::json
        ) AS permissions,
        (
          SELECT COUNT(DISTINCT up.permission_id)::INTEGER
          FROM user_permissions up
          JOIN permissions p ON up.permission_id = p.id
          WHERE up.user_id = u.id AND p.is_active = true
        ) AS approval_permissions_count,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      LEFT JOIN users creator ON u.created_by = creator.id
      ORDER BY u.created_at DESC;
    `;
    const res = await pool.query(query);
    const users = res.rows.map((u) => {
      u.permissions = Array.isArray(u.permissions)
        ? u.permissions
        : typeof u.permissions === "string"
        ? JSON.parse(u.permissions)
        : [];
      u.approval_permissions_count = parseInt(u.approval_permissions_count, 10) || 0;
      return u;
    });
    return users;
  },

  // 3. Create a new user with profile, default leave balance, and leave entitlements
  async createUser({ name, email, role, team_id, designation, department, employment_type, created_by }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const userRole = role || "employee";
      const isSuperior = userRole === "superior_admin";
      // Superior Admin users are not assigned to a team
      const effectiveTeamId = isSuperior ? null : (team_id || null);

      // Check email collision
      const checkEmail = await client.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email.trim()]);
      if (checkEmail.rows.length > 0) {
        const err = new Error("User with this email already exists");
        err.statusCode = 400;
        throw err;
      }

      // Check team if provided (not applicable to superior_admin)
      let teamName = isSuperior ? "Executive Management" : "Unassigned";
      let previousLeadId = null;
      if (effectiveTeamId) {
        const teamRes = await client.query("SELECT id, name, team_admin_id, is_active FROM teams WHERE id = $1", [effectiveTeamId]);
        if (teamRes.rows.length === 0) {
          const err = new Error("Selected team does not exist");
          err.statusCode = 400;
          throw err;
        }
        if (teamRes.rows[0].is_active === false) {
          const err = new Error("Selected team is inactive");
          err.statusCode = 400;
          throw err;
        }
        teamName = teamRes.rows[0].name;
        previousLeadId = teamRes.rows[0].team_admin_id;
      }

      // Generate base username from email before @
      let baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "");
      if (!baseUsername) baseUsername = "user";

      let finalUsername = baseUsername;
      let counter = 1;
      while (true) {
        const checkUser = await client.query("SELECT id FROM users WHERE LOWER(username) = LOWER($1)", [finalUsername]);
        if (checkUser.rows.length === 0) break;
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }

      // Generate random temporary password
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      const temporaryPassword = `Temp@${randomDigits}`;
      const hashedPassword = bcrypt.hashSync(temporaryPassword, 10);

      const teamIdVal = effectiveTeamId;
      const createdByVal = created_by || null;

      // Insert User
      const insertUserQuery = `
        INSERT INTO users (
          name, email, username, password, role, team_id, is_active, must_change_password, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, true, true, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id, name, email, username, role, team_id, is_active, must_change_password, created_by, created_at;
      `;
      const userRes = await client.query(insertUserQuery, [
        name.trim(),
        email.trim(),
        finalUsername,
        hashedPassword,
        userRole,
        teamIdVal,
        createdByVal,
      ]);
      const newUser = userRes.rows[0];

      // If creating as team lead, update team and permissions
      if (userRole === "team_admin" && teamIdVal) {
        // Ensure team approval permission exists
        let permRes = await client.query(
          "SELECT permission_id FROM team_approval_permissions WHERE team_id = $1",
          [teamIdVal]
        );
        let permId;
        if (permRes.rows.length > 0) {
          permId = permRes.rows[0].permission_id;
        } else {
          permId = generateTeamPermissionId(teamName);
          const permDesc = generateTeamPermissionDescription(teamName);
          await client.query(
            `INSERT INTO permissions (id, description, permission_type, is_active, created_at, updated_at)
             VALUES ($1, $2, 'LEAVE_APPROVAL', true, NOW(), NOW())
             ON CONFLICT (id) DO NOTHING`,
            [permId, permDesc]
          );
          await client.query(
            `INSERT INTO team_approval_permissions (team_id, permission_id, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             ON CONFLICT (team_id) DO UPDATE SET permission_id = EXCLUDED.permission_id, updated_at = NOW()`,
            [teamIdVal, permId, createdByVal]
          );
        }

        // If previous lead exists, remove previous lead permission and demote if no other teams led
        if (previousLeadId && previousLeadId !== newUser.id) {
          await client.query(
            "DELETE FROM user_permissions WHERE user_id = $1 AND permission_id = $2",
            [previousLeadId, permId]
          );
          const otherTeams = await client.query(
            "SELECT COUNT(*) FROM teams WHERE team_admin_id = $1 AND id != $2",
            [previousLeadId, teamIdVal]
          );
          if (parseInt(otherTeams.rows[0].count, 10) === 0) {
            await client.query(
              "UPDATE users SET role = 'employee', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
              [previousLeadId]
            );
            await client.query(
              "UPDATE employee_profiles SET designation = 'Employee', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND designation = 'Team Lead'",
              [previousLeadId]
            );
          }
        }

        // Update team's team_admin_id
        await client.query(
          "UPDATE teams SET team_admin_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [newUser.id, teamIdVal]
        );

        // Grant team approval permission to newUser
        await client.query(
          `INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id, permission_id) DO NOTHING`,
          [newUser.id, permId, createdByVal]
        );
      }

      // Generate Employee Code & Defaults
      const empCode = isSuperior ? `SUP-${Date.now().toString().slice(-6)}` : `EMP-${Date.now().toString().slice(-6)}`;
      const defaultDesignation = isSuperior ? "Superior Admin" : (userRole === "team_admin" ? "Team Lead" : "Employee");
      const defaultDepartment = isSuperior ? "Executive Management" : teamName;

      // Insert Employee Profile
      const insertProfileQuery = `
        INSERT INTO employee_profiles (
          user_id, employee_id, designation, department, team, employment_type, account_status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
      `;
      await client.query(insertProfileQuery, [
        newUser.id,
        empCode,
        designation || defaultDesignation,
        department || defaultDepartment,
        isSuperior ? "Executive Management" : teamName,
        employment_type || "Full-time",
      ]);

      // Insert Default Legacy Leave Balances for backward compatibility
      const insertBalanceQuery = `
        INSERT INTO leave_balances (
          employee_id, annual_leave_balance, sick_leave_balance, casual_leave_balance, time_permission_balance, used_leave_count, remaining_leave_count, updated_at
        ) VALUES (
          $1, 14.00, 10.00, 5.00, 6.00, 0.00, 29.00, CURRENT_TIMESTAMP
        );
      `;
      await client.query(insertBalanceQuery, [newUser.id]);

      // Insert Employee Leave Entitlements for all active leave types
      const insertEntitlementsQuery = `
        INSERT INTO employee_leave_entitlements (employee_id, leave_type_id, allocated, used, remaining, year)
        SELECT 
          $1, id, default_quota, 0.00, default_quota, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
        FROM leave_types
        WHERE is_active = true
        ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
      `;
      await client.query(insertEntitlementsQuery, [newUser.id]);

      await client.query("COMMIT");

      return {
        user: {
          ...newUser,
          team_name: isSuperior ? "Executive Management" : teamName,
          designation: designation || defaultDesignation,
          department: department || defaultDepartment,
          employee_code: empCode,
        },
        temporaryPassword,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // 4. Reset user password
  async resetUserPassword(userId) {
    const checkUser = await pool.query("SELECT id, name, username, email FROM users WHERE id = $1", [userId]);
    if (checkUser.rows.length === 0) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const temporaryPassword = `Reset@${randomDigits}`;
    const hashedPassword = bcrypt.hashSync(temporaryPassword, 10);

    const updateQuery = `
      UPDATE users 
      SET password = $1, must_change_password = true, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, name, username, email, role, must_change_password;
    `;
    const res = await pool.query(updateQuery, [hashedPassword, userId]);
    return {
      user: res.rows[0],
      temporaryPassword,
    };
  },

  // 5. Deactivate user
  async deactivateUser(userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userRes = await client.query(
        "SELECT id, name, username, email, role, team_id, is_active FROM users WHERE id = $1",
        [userId]
      );

      if (userRes.rows.length === 0) {
        const err = new Error("User not found.");
        err.statusCode = 404;
        throw err;
      }

      const user = userRes.rows[0];

      if (user.is_active === false) {
        const err = new Error("User is already inactive.");
        err.statusCode = 400;
        throw err;
      }

      if (user.role === "superior_admin") {
        const countRes = await client.query(
          "SELECT COUNT(*) FROM users WHERE role = 'superior_admin' AND is_active = true"
        );
        const activeCount = parseInt(countRes.rows[0].count, 10);
        if (activeCount <= 1) {
          const err = new Error("At least one active Superior Admin must remain in the system.");
          err.statusCode = 400;
          throw err;
        }
      }

      const updateUsers = await client.query(
        "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, username, email, role, team_id, is_active",
        [userId]
      );

      await client.query(
        "UPDATE employee_profiles SET account_status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
        [userId]
      );

      await client.query("COMMIT");
      return updateUsers.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // 5b. Activate user
  async activateUser(userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userRes = await client.query(
        "SELECT id, name, username, email, role, team_id, is_active FROM users WHERE id = $1",
        [userId]
      );

      if (userRes.rows.length === 0) {
        const err = new Error("User not found.");
        err.statusCode = 404;
        throw err;
      }

      const user = userRes.rows[0];

      if (user.is_active === true) {
        const err = new Error("User is already active.");
        err.statusCode = 400;
        throw err;
      }

      const updateUsers = await client.query(
        "UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, username, email, role, team_id, is_active",
        [userId]
      );

      await client.query(
        "UPDATE employee_profiles SET account_status = 'active', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
        [userId]
      );

      await client.query("COMMIT");
      return updateUsers.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // 5c. Edit user basic details
  async editUser(userId, { name, email, designation, department }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userRes = await client.query(
        "SELECT id, name, username, email, role, team_id, is_active FROM users WHERE id = $1",
        [userId]
      );

      if (userRes.rows.length === 0) {
        const err = new Error("User not found.");
        err.statusCode = 404;
        throw err;
      }

      const existingUser = userRes.rows[0];

      // Validate email uniqueness if changed
      if (email && email.trim().toLowerCase() !== existingUser.email.toLowerCase()) {
        const checkEmail = await client.query(
          "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2",
          [email.trim(), userId]
        );
        if (checkEmail.rows.length > 0) {
          const err = new Error("User with this email already exists");
          err.statusCode = 400;
          throw err;
        }
      }

      const updatedName = name && name.trim() ? name.trim() : existingUser.name;
      const updatedEmail = email && email.trim() ? email.trim() : existingUser.email;

      const userUpdateRes = await client.query(
        `UPDATE users 
         SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING id, name, username, email, role, team_id, is_active, updated_at`,
        [updatedName, updatedEmail, userId]
      );

      // Update employee profile if provided
      if (designation !== undefined || department !== undefined) {
        await client.query(
          `UPDATE employee_profiles 
           SET designation = COALESCE($1, designation), 
               department = COALESCE($2, department), 
               updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $3`,
          [designation ? designation.trim() : null, department ? department.trim() : null, userId]
        );
      }

      await client.query("COMMIT");

      // Fetch profile details
      const profileRes = await pool.query(
        "SELECT designation, department, team, employee_id AS employee_code FROM employee_profiles WHERE user_id = $1",
        [userId]
      );
      const profile = profileRes.rows[0] || {};

      return {
        ...userUpdateRes.rows[0],
        designation: profile.designation,
        department: profile.department,
        team_name: profile.team,
        employee_code: profile.employee_code,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // 5d. Delete user safety guard
  async deleteUser(userId) {
    const userRes = await pool.query("SELECT id, role FROM users WHERE id = $1", [userId]);
    if (userRes.rows.length === 0) {
      const err = new Error("User not found.");
      err.statusCode = 404;
      throw err;
    }

    const user = userRes.rows[0];
    if (user.role === "superior_admin") {
      const err = new Error("Superior Admin users cannot be permanently deleted. Please deactivate the account instead.");
      err.statusCode = 400;
      throw err;
    }

    const err = new Error("Users cannot be permanently deleted. Please deactivate the account instead.");
    err.statusCode = 400;
    throw err;
  },

  // =========================================================================
  // TEAMS MANAGEMENT DAOs
  // =========================================================================
  async getAllTeams() {
    const query = `
      SELECT 
        t.id,
        t.name,
        t.team_admin_id,
        admin_u.name AS team_admin_name,
        admin_u.email AS team_admin_email,
        COALESCE(t.is_active, true) AS is_active,
        tap.permission_id AS approval_permission_id,
        p.description AS approval_permission_description,
        COUNT(DISTINCT u.id) AS total_members,
        COUNT(DISTINCT u.id) AS member_count,
        t.created_at,
        t.updated_at
      FROM teams t
      LEFT JOIN users admin_u ON t.team_admin_id = admin_u.id
      LEFT JOIN users u ON u.team_id = t.id
      LEFT JOIN team_approval_permissions tap ON t.id = tap.team_id
      LEFT JOIN permissions p ON tap.permission_id = p.id
      GROUP BY t.id, t.name, t.team_admin_id, admin_u.name, admin_u.email, tap.permission_id, p.description
      ORDER BY t.name ASC;
    `;
    const res = await pool.query(query);
    return res.rows;
  },

  async createTeam({ name, team_admin_id, initial_member_ids }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check name uniqueness
      const checkTeam = await client.query("SELECT id FROM teams WHERE LOWER(name) = LOWER($1)", [name.trim()]);
      if (checkTeam.rows.length > 0) {
        const err = new Error("A team with this name already exists");
        err.statusCode = 400;
        throw err;
      }

      // If initial_member_ids provided, validate every candidate
      let uniqueMemberIds = [];
      if (initial_member_ids && Array.isArray(initial_member_ids) && initial_member_ids.length > 0) {
        uniqueMemberIds = [...new Set(initial_member_ids.filter(Boolean))];
      }

      if (uniqueMemberIds.length > 0) {
        const memRes = await client.query(
          `SELECT u.id, u.name, u.role, u.team_id, COALESCE(u.is_active, true) AS is_active
           FROM users u
           WHERE u.id = ANY($1)`,
          [uniqueMemberIds]
        );

        if (memRes.rows.length !== uniqueMemberIds.length) {
          const err = new Error("One or more selected initial team members do not exist.");
          err.statusCode = 400;
          throw err;
        }

        for (const u of memRes.rows) {
          if (u.role === "superior_admin") {
            const err = new Error("Superior Admin users cannot be added as regular team members.");
            err.statusCode = 400;
            throw err;
          }
          if (!u.is_active) {
            const err = new Error("Inactive users cannot be added to teams.");
            err.statusCode = 400;
            throw err;
          }
          if (u.team_id) {
            const err = new Error("One or more selected employees already belong to another team.");
            err.statusCode = 400;
            throw err;
          }
          if (u.role !== "employee") {
            const err = new Error("Initial team members must be active employees who are not assigned to any team.");
            err.statusCode = 400;
            throw err;
          }
        }
      }

      const adminIdVal = team_admin_id || null;

      // Validate Team In-charge candidate if provided
      if (adminIdVal) {
        const leadUserRes = await client.query(
          "SELECT id, name, role, is_active FROM users WHERE id = $1",
          [adminIdVal]
        );
        if (leadUserRes.rows.length === 0) {
          const err = new Error("Selected Team In-charge user was not found.");
          err.statusCode = 400;
          throw err;
        }
        const leadUser = leadUserRes.rows[0];
        if (!leadUser.is_active) {
          const err = new Error("Inactive users cannot be assigned as Team In-charge.");
          err.statusCode = 400;
          throw err;
        }
        if (leadUser.role === "superior_admin") {
          const err = new Error("Superior Admin users cannot be assigned as Team In-charge.");
          err.statusCode = 400;
          throw err;
        }
        // Check if already in-charge of another team
        const otherLead = await client.query(
          "SELECT id, name FROM teams WHERE team_admin_id = $1",
          [adminIdVal]
        );
        if (otherLead.rows.length > 0) {
          const err = new Error("This user is already assigned as Team In-charge of another team. Please remove that assignment first.");
          err.statusCode = 400;
          throw err;
        }
      }

      const insertQuery = `
        INSERT INTO teams (name, team_admin_id, is_active, created_at, updated_at)
        VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name, team_admin_id, is_active, created_at, updated_at;
      `;
      const res = await client.query(insertQuery, [name.trim(), adminIdVal]);
      const newTeam = res.rows[0];

      // Auto-generate default leave approval permission for the new team
      const permId = generateTeamPermissionId(name);
      const permDesc = generateTeamPermissionDescription(name);

      // Insert permission if not exists
      await client.query(
        `INSERT INTO permissions (id, description, permission_type, is_active, created_at, updated_at)
         VALUES ($1, $2, 'LEAVE_APPROVAL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING;`,
        [permId, permDesc]
      );

      // Insert team_approval_permissions mapping
      await client.query(
        `INSERT INTO team_approval_permissions (team_id, permission_id, created_by, created_at, updated_at)
         VALUES ($1, $2, (SELECT id FROM users WHERE role = 'superior_admin' LIMIT 1), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (team_id) DO UPDATE SET permission_id = EXCLUDED.permission_id, updated_at = CURRENT_TIMESTAMP;`,
        [newTeam.id, permId]
      );

      // Grant to all active superior admins so demo and management work seamlessly
      await client.query(
        `INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
         SELECT id, $1, id, CURRENT_TIMESTAMP FROM users WHERE role = 'superior_admin'
         ON CONFLICT (user_id, permission_id) DO NOTHING;`,
        [permId]
      );

      // If team_admin_id provided, assign user to this team and grant team approval permission without modifying role
      if (adminIdVal) {
        await client.query(
          "UPDATE users SET team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [newTeam.id, adminIdVal]
        );
        await client.query(
          `INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
           VALUES ($1, $2, (SELECT id FROM users WHERE role = 'superior_admin' LIMIT 1), CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, permission_id) DO NOTHING;`,
          [adminIdVal, permId]
        );
      }

      // Assign initial members to the new team
      if (uniqueMemberIds.length > 0) {
        await client.query(
          "UPDATE users SET team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2)",
          [newTeam.id, uniqueMemberIds]
        );
      }

      newTeam.approval_permission_id = permId;
      newTeam.approval_permission_description = permDesc;
      newTeam.member_count = uniqueMemberIds.length + (adminIdVal && !uniqueMemberIds.includes(adminIdVal) ? 1 : 0);
      newTeam.total_members = newTeam.member_count;

      await client.query("COMMIT");
      return newTeam;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async updateTeam(teamId, { name, team_admin_id, is_active }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check existence
      const checkTeam = await client.query("SELECT id, name, team_admin_id FROM teams WHERE id = $1", [teamId]);
      if (checkTeam.rows.length === 0) {
        const err = new Error("Team not found");
        err.statusCode = 404;
        throw err;
      }

      // Check name uniqueness if changed
      if (name && name.trim().toLowerCase() !== checkTeam.rows[0].name.toLowerCase()) {
        const checkName = await client.query("SELECT id FROM teams WHERE LOWER(name) = LOWER($1) AND id != $2", [
          name.trim(),
          teamId,
        ]);
        if (checkName.rows.length > 0) {
          const err = new Error("A team with this name already exists");
          err.statusCode = 400;
          throw err;
        }
      }

      const teamNameVal = name ? name.trim() : checkTeam.rows[0].name;
      const adminIdVal = team_admin_id !== undefined ? (team_admin_id || null) : checkTeam.rows[0].team_admin_id;
      const isActiveVal = is_active !== undefined ? Boolean(is_active) : true;

      const updateQuery = `
        UPDATE teams 
        SET name = $1, team_admin_id = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $4 
        RETURNING id, name, team_admin_id, is_active, updated_at;
      `;
      const res = await client.query(updateQuery, [teamNameVal, adminIdVal, isActiveVal, teamId]);
      const updatedTeam = res.rows[0];

      if (adminIdVal) {
        await client.query(
          "UPDATE users SET team_id = $1, role = CASE WHEN role = 'employee' THEN 'team_admin' ELSE role END, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [updatedTeam.id, adminIdVal]
        );
      }

      await client.query("COMMIT");
      return updatedTeam;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async deactivateTeam(teamId) {
    const checkTeam = await pool.query("SELECT id, name, is_active FROM teams WHERE id = $1", [teamId]);
    if (checkTeam.rows.length === 0) {
      const err = new Error("Team not found.");
      err.statusCode = 404;
      throw err;
    }
    if (checkTeam.rows[0].is_active === false) {
      const err = new Error("Team is already inactive.");
      err.statusCode = 400;
      throw err;
    }

    const res = await pool.query(
      "UPDATE teams SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_active",
      [teamId]
    );
    return res.rows[0];
  },

  async activateTeam(teamId) {
    const checkTeam = await pool.query("SELECT id, name, is_active FROM teams WHERE id = $1", [teamId]);
    if (checkTeam.rows.length === 0) {
      const err = new Error("Team not found.");
      err.statusCode = 404;
      throw err;
    }
    if (checkTeam.rows[0].is_active === true) {
      const err = new Error("Team is already active.");
      err.statusCode = 400;
      throw err;
    }

    const res = await pool.query(
      "UPDATE teams SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_active",
      [teamId]
    );
    return res.rows[0];
  },

  // =========================================================================
  // LEAVE TYPES MANAGEMENT DAOs
  // =========================================================================
  async getAllLeaveTypes() {
    const query = `
      SELECT 
        id, 
        name, 
        code, 
        unit, 
        default_quota, 
        requires_substitute, 
        COALESCE(is_active, true) AS is_active, 
        created_at, 
        updated_at
      FROM leave_types
      ORDER BY name ASC;
    `;
    const res = await pool.query(query);
    return res.rows;
  },

  async createLeaveType({ name, code, unit, default_quota, requires_substitute }) {
    const checkQuery = `
      SELECT id FROM leave_types 
      WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($2);
    `;
    const checkRes = await pool.query(checkQuery, [name.trim(), code.trim()]);
    if (checkRes.rows.length > 0) {
      const err = new Error("A leave type with this name or code already exists");
      err.statusCode = 400;
      throw err;
    }

    const unitVal = unit && unit.toLowerCase() === "hours" ? "hours" : "days";
    const quotaVal = parseFloat(default_quota) || 0;
    const reqSub = requires_substitute !== undefined ? Boolean(requires_substitute) : true;

    const insertQuery = `
      INSERT INTO leave_types (
        name, code, unit, default_quota, requires_substitute, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id, name, code, unit, default_quota, requires_substitute, is_active, created_at, updated_at;
    `;
    const res = await pool.query(insertQuery, [
      name.trim(),
      code.trim().toUpperCase(),
      unitVal,
      quotaVal,
      reqSub,
    ]);
    return res.rows[0];
  },

  async updateLeaveType(id, { name, code, unit, default_quota, requires_substitute, is_active }) {
    const checkRes = await pool.query("SELECT id FROM leave_types WHERE id = $1", [id]);
    if (checkRes.rows.length === 0) {
      const err = new Error("Leave type not found");
      err.statusCode = 404;
      throw err;
    }

    const unitVal = unit && unit.toLowerCase() === "hours" ? "hours" : "days";
    const quotaVal = parseFloat(default_quota) || 0;
    const reqSub = requires_substitute !== undefined ? Boolean(requires_substitute) : true;
    const isActiveVal = is_active !== undefined ? Boolean(is_active) : true;

    const updateQuery = `
      UPDATE leave_types 
      SET 
        name = $1,
        code = $2,
        unit = $3,
        default_quota = $4,
        requires_substitute = $5,
        is_active = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, name, code, unit, default_quota, requires_substitute, is_active, updated_at;
    `;
    const res = await pool.query(updateQuery, [
      name.trim(),
      code.trim().toUpperCase(),
      unitVal,
      quotaVal,
      reqSub,
      isActiveVal,
      id,
    ]);
    return res.rows[0];
  },

  async deactivateLeaveType(id) {
    const res = await pool.query(
      "UPDATE leave_types SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, code, is_active",
      [id]
    );
    if (res.rows.length === 0) {
      const err = new Error("Leave type not found");
      err.statusCode = 404;
      throw err;
    }
    return res.rows[0];
  },

  // =========================================================================
  // LEAVE ENTITLEMENTS / QUOTAS DAOs
  // =========================================================================
  async getEmployeeLeaveEntitlements(employeeId) {
    // Check if user exists
    const userRes = await pool.query("SELECT id, name, username, email FROM users WHERE id = $1", [employeeId]);
    if (userRes.rows.length === 0) {
      const err = new Error("Employee not found");
      err.statusCode = 404;
      throw err;
    }

    const query = `
      SELECT 
        lt.id AS leave_type_id,
        lt.name AS leave_type_name,
        lt.code AS leave_type_code,
        lt.unit AS leave_type_unit,
        lt.requires_substitute,
        COALESCE(ele.id, null) AS entitlement_id,
        COALESCE(ele.allocated, lt.default_quota) AS allocated,
        COALESCE(ele.used, 0.00) AS used,
        COALESCE(ele.remaining, (COALESCE(ele.allocated, lt.default_quota) - COALESCE(ele.used, 0.00))) AS remaining,
        COALESCE(ele.year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) AS year
      FROM leave_types lt
      LEFT JOIN employee_leave_entitlements ele 
        ON lt.id = ele.leave_type_id 
       AND ele.employee_id = $1 
       AND ele.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
      WHERE lt.is_active = true
      ORDER BY lt.name ASC;
    `;
    const res = await pool.query(query, [employeeId]);
    return {
      employee: userRes.rows[0],
      entitlements: res.rows,
    };
  },

  async updateEmployeeLeaveEntitlements(employeeId, entitlementsArray) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check employee exists
      const userRes = await client.query("SELECT id, name FROM users WHERE id = $1", [employeeId]);
      if (userRes.rows.length === 0) {
        const err = new Error("Employee not found");
        err.statusCode = 404;
        throw err;
      }

      const updatedResults = [];
      const currentYear = new Date().getFullYear();

      for (const item of entitlementsArray) {
        const { leave_type_id, allocated } = item;
        if (!leave_type_id) continue;

        const allocVal = parseFloat(allocated) || 0;

        // Upsert entitlement
        const upsertQuery = `
          INSERT INTO employee_leave_entitlements (
            employee_id, leave_type_id, allocated, used, remaining, year, updated_at
          ) VALUES (
            $1, $2, $3, 0.00, $3, $4, CURRENT_TIMESTAMP
          )
          ON CONFLICT (employee_id, leave_type_id, year)
          DO UPDATE SET 
            allocated = EXCLUDED.allocated,
            remaining = EXCLUDED.allocated - employee_leave_entitlements.used,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, employee_id, leave_type_id, allocated, used, remaining, year;
        `;
        const res = await client.query(upsertQuery, [employeeId, leave_type_id, allocVal, currentYear]);
        updatedResults.push(res.rows[0]);
      }

      await client.query("COMMIT");
      return updatedResults;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // =========================================================================
  // TEAM LEAD & ROLE MANAGEMENT DAOs
  // =========================================================================

  // Helper to ensure team permission exists and get ID
  async _ensureTeamPermission(client, teamId, createdBy = null) {
    let permRes = await client.query(
      "SELECT permission_id FROM team_approval_permissions WHERE team_id = $1",
      [teamId]
    );
    if (permRes.rows.length > 0) {
      return permRes.rows[0].permission_id;
    }
    const teamRes = await client.query("SELECT name FROM teams WHERE id = $1", [teamId]);
    const teamName = teamRes.rows.length > 0 ? teamRes.rows[0].name : "Team";
    const permId = generateTeamPermissionId(teamName);
    const permDesc = generateTeamPermissionDescription(teamName);

    await client.query(
      `INSERT INTO permissions (id, description, permission_type, is_active, created_at, updated_at)
       VALUES ($1, $2, 'LEAVE_APPROVAL', true, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [permId, permDesc]
    );
    await client.query(
      `INSERT INTO team_approval_permissions (team_id, permission_id, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (team_id) DO UPDATE SET permission_id = EXCLUDED.permission_id, updated_at = NOW()`,
      [teamId, permId, createdBy]
    );
    return permId;
  },

  // Promote User to Team Lead
  async promoteUserToTeamLead({ userId, teamId, removePreviousLeadPermission = true, performedBy = null }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Verify user
      const userRes = await client.query(
        "SELECT id, name, email, role, team_id FROM users WHERE id = $1",
        [userId]
      );
      if (userRes.rows.length === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }
      const targetUser = userRes.rows[0];
      if (targetUser.role === "superior_admin") {
        const err = new Error("Superior Admin role cannot be modified or demoted");
        err.statusCode = 400;
        throw err;
      }

      // 2. Verify team
      const teamRes = await client.query(
        "SELECT id, name, team_admin_id FROM teams WHERE id = $1",
        [teamId]
      );
      if (teamRes.rows.length === 0) {
        const err = new Error("Team not found");
        err.statusCode = 404;
        throw err;
      }
      const targetTeam = teamRes.rows[0];
      const previousLeadId = targetTeam.team_admin_id;

      // 3. Ensure team approval permission exists
      const permId = await this._ensureTeamPermission(client, teamId, performedBy);

      // 4. Handle previous lead if different
      if (previousLeadId && String(previousLeadId) !== String(userId)) {
        if (removePreviousLeadPermission) {
          await client.query(
            "DELETE FROM user_permissions WHERE user_id = $1 AND permission_id = $2",
            [previousLeadId, permId]
          );
        }

        // Check if previous lead leads any other team
        const otherTeamsRes = await client.query(
          "SELECT COUNT(*) FROM teams WHERE team_admin_id = $1 AND id != $2",
          [previousLeadId, teamId]
        );
        const leadsOther = parseInt(otherTeamsRes.rows[0].count, 10) > 0;
        if (!leadsOther) {
          await client.query(
            "UPDATE users SET role = 'employee', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [previousLeadId]
          );
          await client.query(
            "UPDATE employee_profiles SET designation = 'Employee', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND designation = 'Team Lead'",
            [previousLeadId]
          );
        }
      }

      // 5. Update target user role and team
      await client.query(
        "UPDATE users SET role = 'team_admin', team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [teamId, userId]
      );
      await client.query(
        "UPDATE employee_profiles SET designation = 'Team Lead', department = $1, team = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND designation IN ('Employee', 'Staff', '')",
        [targetTeam.name, userId]
      );

      // 6. Update team's team_admin_id
      await client.query(
        "UPDATE teams SET team_admin_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [userId, teamId]
      );

      // 7. Grant leave approval permission to target user
      await client.query(
        `INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, permission_id) DO NOTHING`,
        [userId, permId, performedBy]
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: `Successfully promoted ${targetUser.name} to Team Lead of ${targetTeam.name}`,
        user_id: userId,
        new_role: "team_admin",
        team_id: teamId,
        team_name: targetTeam.name,
        permission_id: permId,
        previous_lead_id: previousLeadId,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Demote Team Lead back to Employee
  async demoteTeamLead({ userId, performedBy = null }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Verify user
      const userRes = await client.query(
        "SELECT id, name, email, role FROM users WHERE id = $1",
        [userId]
      );
      if (userRes.rows.length === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }
      const targetUser = userRes.rows[0];
      if (targetUser.role === "superior_admin") {
        const err = new Error("Superior Admin role cannot be modified or demoted");
        err.statusCode = 400;
        throw err;
      }

      // Find teams led by this user
      const teamsLedRes = await client.query(
        "SELECT id, name FROM teams WHERE team_admin_id = $1",
        [userId]
      );
      const teamsLed = teamsLedRes.rows;

      // If user is currently assigned as Team In-charge, block demotion
      if (teamsLed.length > 0) {
        const err = new Error(
          "This user is currently assigned as Team In-charge. Please remove or change the Team In-charge assignment before changing role."
        );
        err.statusCode = 400;
        throw err;
      }

      // Also revoke any remaining leave approval permissions assigned to this user
      await client.query(
        `DELETE FROM user_permissions 
         WHERE user_id = $1 
           AND permission_id IN (SELECT id FROM permissions WHERE permission_type = 'LEAVE_APPROVAL')`,
        [userId]
      );

      // Update user role to employee
      await client.query(
        "UPDATE users SET role = 'employee', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [userId]
      );
      await client.query(
        "UPDATE employee_profiles SET designation = 'Employee', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND designation = 'Team Lead'",
        [userId]
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: `Successfully demoted ${targetUser.name} to Employee. Approval permissions revoked. Historical leave records preserved.`,
        user_id: userId,
        new_role: "employee",
        affected_teams: teamsLed,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // General Change User Role router
  async changeUserRole({ userId, newRole, teamId = null, removePreviousLeadPermission = true, performedBy = null }) {
    if (!["employee", "team_admin", "superior_admin"].includes(newRole)) {
      const err = new Error("Invalid role specified. Must be 'employee', 'team_admin', or 'superior_admin'");
      err.statusCode = 400;
      throw err;
    }

    const checkRes = await pool.query("SELECT id, name, role FROM users WHERE id = $1", [userId]);
    if (checkRes.rows.length === 0) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    const currentRole = checkRes.rows[0].role;
    if (currentRole === "superior_admin") {
      const err = new Error("Superior Admin role cannot be modified or demoted");
      err.statusCode = 400;
      throw err;
    }

    if (newRole === "team_admin") {
      if (!teamId) {
        const err = new Error("Team selection is required when changing role to Team Lead");
        err.statusCode = 400;
        throw err;
      }
      return await this.promoteUserToTeamLead({ userId, teamId, removePreviousLeadPermission, performedBy });
    }

    if (newRole === "employee") {
      if (currentRole === "team_admin" || currentRole === "admin") {
        return await this.demoteTeamLead({ userId, performedBy });
      }
      await pool.query("UPDATE users SET role = 'employee', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [userId]);
      return {
        success: true,
        message: "User role updated to employee",
        user_id: userId,
        new_role: "employee",
      };
    }

    if (newRole === "superior_admin") {
      await pool.query("UPDATE users SET role = 'superior_admin', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [userId]);
      return {
        success: true,
        message: "User role updated to superior_admin",
        user_id: userId,
        new_role: "superior_admin",
      };
    }
  },

  // Assign Team In-charge to Team (Accepts employee or team_admin, preserves user role)
  async assignTeamLeadToTeam({ teamId, userId, removePreviousLeadPermission = true, performedBy = null }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Verify user
      const userRes = await client.query(
        "SELECT id, name, email, role, team_id, COALESCE(is_active, true) AS is_active FROM users WHERE id = $1",
        [userId]
      );
      if (userRes.rows.length === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }
      const targetUser = userRes.rows[0];
      if (!targetUser.is_active) {
        const err = new Error("Inactive users cannot be assigned as Team In-charge.");
        err.statusCode = 400;
        throw err;
      }
      if (targetUser.role === "superior_admin") {
        const err = new Error("Superior Admin users cannot be assigned as Team In-charge.");
        err.statusCode = 400;
        throw err;
      }

      // 2. Verify team
      const teamRes = await client.query(
        "SELECT id, name, team_admin_id FROM teams WHERE id = $1",
        [teamId]
      );
      if (teamRes.rows.length === 0) {
        const err = new Error("Team not found");
        err.statusCode = 404;
        throw err;
      }
      const targetTeam = teamRes.rows[0];
      const previousLeadId = targetTeam.team_admin_id;

      // 3. Check if target user is already in-charge of another team
      const otherTeamsRes = await client.query(
        "SELECT id, name FROM teams WHERE team_admin_id = $1 AND id != $2",
        [userId, teamId]
      );
      if (otherTeamsRes.rows.length > 0) {
        const err = new Error("This user is already assigned as Team In-charge of another team. Please remove that assignment first.");
        err.statusCode = 400;
        throw err;
      }

      // 4. Ensure team approval permission exists
      const permId = await this._ensureTeamPermission(client, teamId, performedBy);

      // 5. Handle previous in-charge if different
      if (previousLeadId && String(previousLeadId) !== String(userId)) {
        if (removePreviousLeadPermission) {
          await client.query(
            "DELETE FROM user_permissions WHERE user_id = $1 AND permission_id = $2",
            [previousLeadId, permId]
          );
        }
      }

      // 6. Update target user team_id (DO NOT change role, role remains employee or team_admin)
      await client.query(
        "UPDATE users SET team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [teamId, userId]
      );

      // 7. Update team's team_admin_id
      await client.query(
        "UPDATE teams SET team_admin_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [userId, teamId]
      );

      // 8. Grant leave approval permission to target user
      await client.query(
        `INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, permission_id) DO NOTHING`,
        [userId, permId, performedBy]
      );

      await client.query("COMMIT");

      // Fetch updated team
      const updatedTeamRes = await pool.query(
        `SELECT 
          t.id,
          t.name,
          t.team_admin_id,
          u.name AS team_admin_name,
          u.email AS team_admin_email,
          tap.permission_id AS approval_permission_id
         FROM teams t
         LEFT JOIN users u ON t.team_admin_id = u.id
         LEFT JOIN team_approval_permissions tap ON t.id = tap.team_id
         WHERE t.id = $1`,
        [teamId]
      );

      return {
        success: true,
        message: `Successfully assigned ${targetUser.name} as Team In-charge of ${targetTeam.name}`,
        user_id: userId,
        role: targetUser.role,
        team_id: teamId,
        team_name: targetTeam.name,
        permission_id: permId,
        previous_lead_id: previousLeadId,
        team: updatedTeamRes.rows[0],
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Remove Team In-charge from Team (revokes approval permission without altering user role)
  async removeTeamLeadFromTeam({ teamId, performedBy = null }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const teamRes = await client.query(
        "SELECT id, name, team_admin_id FROM teams WHERE id = $1",
        [teamId]
      );
      if (teamRes.rows.length === 0) {
        const err = new Error("Team not found");
        err.statusCode = 404;
        throw err;
      }
      const team = teamRes.rows[0];
      const previousLeadId = team.team_admin_id;
      if (!previousLeadId) {
        const err = new Error("Team does not currently have an assigned Team In-charge");
        err.statusCode = 400;
        throw err;
      }

      // 1. Clear team_admin_id
      await client.query(
        "UPDATE teams SET team_admin_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [teamId]
      );

      // 2. Remove team approval permission from previous in-charge
      const permRes = await client.query(
        "SELECT permission_id FROM team_approval_permissions WHERE team_id = $1",
        [teamId]
      );
      if (permRes.rows.length > 0) {
        const permId = permRes.rows[0].permission_id;
        await client.query(
          "DELETE FROM user_permissions WHERE user_id = $1 AND permission_id = $2",
          [previousLeadId, permId]
        );
      }

      await client.query("COMMIT");

      return {
        success: true,
        message: `Successfully removed Team In-charge from team ${team.name}. Leave approval permission revoked.`,
        team_id: teamId,
        team_name: team.name,
        previous_lead_id: previousLeadId,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Search Team In-charge Candidates (allows active employees and team_admin, excludes superior_admin)
  async searchTeamInchargeCandidates(teamId = null, searchText = "") {
    let query = `
      SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        u.role,
        u.team_id AS current_team_id,
        t.name AS current_team_name,
        (SELECT id FROM teams WHERE team_admin_id = u.id LIMIT 1) AS incharge_team_id,
        (SELECT name FROM teams WHERE team_admin_id = u.id LIMIT 1) AS incharge_team_name,
        ep.designation,
        ep.department,
        COALESCE(u.is_active, true) AS is_active
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE COALESCE(u.is_active, true) = true
        AND u.role IN ('employee', 'team_admin', 'admin')
    `;
    const params = [];
    if (searchText && searchText.trim()) {
      params.push(`%${searchText.trim()}%`);
      query += `
        AND (
          u.name ILIKE $1 
          OR u.username ILIKE $1 
          OR u.email ILIKE $1 
          OR t.name ILIKE $1 
          OR u.role ILIKE $1 
          OR ep.designation ILIKE $1 
          OR ep.department ILIKE $1
        )
      `;
    }
    query += ` ORDER BY u.name ASC;`;
    const res = await pool.query(query, params);

    const candidates = res.rows.map((u) => {
      const isCurrentIncharge = Boolean(teamId && u.incharge_team_id === teamId);
      const isInchargeOfOther = Boolean(u.incharge_team_id && (!teamId || u.incharge_team_id !== teamId));
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,
        current_team_id: u.current_team_id,
        current_team_name: u.current_team_name,
        incharge_team_id: u.incharge_team_id,
        incharge_team_name: u.incharge_team_name,
        designation: u.designation,
        department: u.department,
        is_active: u.is_active,
        is_current_incharge: isCurrentIncharge,
        is_incharge_of_other_team: isInchargeOfOther,
      };
    });

    return {
      count: candidates.length,
      data: candidates,
      candidates: candidates,
    };
  },

  // 13. Get Team Lead leave requests for Superior Admin review & approval
  async getTeamLeadLeaveRequests(superiorAdminId = null) {
    const query = `
      SELECT 
        lr.id,
        lr.employee_id,
        u.name AS employee_name,
        u.email AS employee_email,
        u.role AS employee_role,
        u.team_id,
        COALESCE(t.name, 'Unassigned') AS team_name,
        tap.permission_id AS required_approval_permission,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.permission_date,
        lr.permission_hours,
        lr.reason,
        lr.status,
        lr.requested_units,
        lr.is_paycut_leave,
        lr.paycut_units,
        lr.quota_warning_message,
        sr.id AS substitute_request_id,
        sub_u.name AS substitute_name,
        sr.substitute_status,
        sr.assigned_work,
        lr.created_at,
        lr.updated_at
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN team_approval_permissions tap ON u.team_id = tap.team_id
      LEFT JOIN substitute_requests sr ON lr.id = sr.leave_request_id
      LEFT JOIN users sub_u ON sr.substitute_employee_id = sub_u.id
      WHERE u.role IN ('team_admin', 'admin')
      ORDER BY 
        CASE WHEN lr.status = 'Waiting for Admin Approval' THEN 0 ELSE 1 END,
        lr.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  // 14. Get active unassigned employees for team creation initial members
  async getUnassignedEmployees(searchText = "") {
    let query = `
      SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        u.role,
        u.team_id,
        NULL AS team_name,
        ep.designation,
        ep.department,
        COALESCE(u.is_active, true) AS is_active
      FROM users u
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE COALESCE(u.is_active, true) = true
        AND u.role = 'employee'
        AND u.team_id IS NULL
    `;
    const params = [];
    if (searchText && searchText.trim()) {
      params.push(`%${searchText.trim()}%`);
      query += `
        AND (
          u.name ILIKE $1 
          OR u.username ILIKE $1 
          OR u.email ILIKE $1 
          OR ep.designation ILIKE $1 
          OR ep.department ILIKE $1
        )
      `;
    }
    query += ` ORDER BY u.name ASC;`;
    const res = await pool.query(query, params);
    return res.rows;
  },

  // 15. Get all current members of a team
  async getTeamMembers(teamId) {
    const teamRes = await pool.query(
      `SELECT 
         t.id,
         t.name,
         t.team_admin_id,
         admin_u.name AS team_admin_name,
         tap.permission_id AS approval_permission_id
       FROM teams t
       LEFT JOIN users admin_u ON t.team_admin_id = admin_u.id
       LEFT JOIN team_approval_permissions tap ON t.id = tap.team_id
       WHERE t.id = $1`,
      [teamId]
    );
    if (teamRes.rows.length === 0) {
      const err = new Error("Team not found");
      err.statusCode = 404;
      throw err;
    }
    const team = teamRes.rows[0];

    const membersRes = await pool.query(
      `SELECT 
         u.id,
         u.name,
         u.username,
         u.email,
         u.role,
         u.team_id,
         t.name AS team_name,
         ep.designation,
         ep.department,
         COALESCE(u.is_active, true) AS is_active,
         (u.id = $2) AS is_team_lead
       FROM users u
       JOIN teams t ON u.team_id = t.id
       LEFT JOIN employee_profiles ep ON u.id = ep.user_id
       WHERE u.team_id = $1
       ORDER BY (u.id = $2) DESC, u.name ASC;`,
      [teamId, team.team_admin_id]
    );

    return {
      team,
      count: membersRes.rows.length,
      members: membersRes.rows,
    };
  },

  // 16. Search candidates to add or move to an existing team
  async searchTeamMemberCandidates(teamId, searchText = "") {
    let query = `
      SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        u.role,
        u.team_id AS current_team_id,
        t.name AS current_team_name,
        (SELECT id FROM teams WHERE team_admin_id = u.id LIMIT 1) AS leads_team_id,
        (SELECT name FROM teams WHERE team_admin_id = u.id LIMIT 1) AS leads_team_name,
        ep.designation,
        ep.department,
        COALESCE(u.is_active, true) AS is_active
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE COALESCE(u.is_active, true) = true
        AND u.role != 'superior_admin'
    `;
    const params = [];
    if (searchText && searchText.trim()) {
      params.push(`%${searchText.trim()}%`);
      query += `
        AND (
          u.name ILIKE $1 
          OR u.username ILIKE $1 
          OR u.email ILIKE $1 
          OR t.name ILIKE $1 
          OR u.role ILIKE $1 
          OR ep.designation ILIKE $1 
          OR ep.department ILIKE $1
        )
      `;
    }
    query += ` ORDER BY u.name ASC;`;
    const res = await pool.query(query, params);

    const candidates = res.rows.map((u) => {
      const isAlreadyMember = u.current_team_id === teamId;
      const isLeadingOtherTeam = Boolean(u.leads_team_id && u.leads_team_id !== teamId);
      let can_add = true;
      let requires_move_confirmation = false;
      let warning = null;

      if (isAlreadyMember) {
        can_add = false;
        warning = "User is already a member of this team.";
      } else if (isLeadingOtherTeam) {
        can_add = false;
        warning = `This user is currently a Team Lead of ${u.leads_team_name || "another team"}. Please change their Team Lead assignment first.`;
      } else if (u.current_team_id) {
        requires_move_confirmation = true;
        warning = `This employee currently belongs to ${u.current_team_name || "another team"}.`;
      }

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,
        current_team_id: u.current_team_id,
        current_team_name: u.current_team_name,
        designation: u.designation,
        department: u.department,
        is_active: u.is_active,
        is_already_member: isAlreadyMember,
        can_add,
        requires_move_confirmation,
        warning,
      };
    });

    return {
      count: candidates.length,
      data: candidates,
    };
  },

  // 17. Add or move an employee to a team
  async addOrMoveTeamMember({ teamId, userId, superiorAdminId, confirmMove }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Validate team exists and is active
      const teamRes = await client.query(
        "SELECT id, name, team_admin_id, COALESCE(is_active, true) AS is_active FROM teams WHERE id = $1",
        [teamId]
      );
      if (teamRes.rows.length === 0) {
        const err = new Error("Team not found");
        err.statusCode = 404;
        throw err;
      }
      const team = teamRes.rows[0];

      // Validate user exists
      const userRes = await client.query(
        `SELECT 
           u.id, 
           u.name, 
           u.email, 
           u.role, 
           u.team_id, 
           COALESCE(u.is_active, true) AS is_active, 
           t.name AS current_team_name,
           (SELECT id FROM teams WHERE team_admin_id = u.id LIMIT 1) AS leads_team_id,
           (SELECT name FROM teams WHERE team_admin_id = u.id LIMIT 1) AS leads_team_name
         FROM users u 
         LEFT JOIN teams t ON u.team_id = t.id 
         WHERE u.id = $1`,
        [userId]
      );
      if (userRes.rows.length === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }
      const user = userRes.rows[0];

      if (!user.is_active) {
        const err = new Error("Inactive users cannot be added to teams.");
        err.statusCode = 400;
        throw err;
      }

      if (user.role === "superior_admin") {
        const err = new Error("Superior Admin users cannot be added as regular team members.");
        err.statusCode = 400;
        throw err;
      }

      if (user.team_id === teamId) {
        const err = new Error("User is already a member of this team.");
        err.statusCode = 400;
        throw err;
      }

      // If user is team_admin leading another team
      if (user.leads_team_id && user.leads_team_id !== teamId) {
        const err = new Error("This user is currently a Team Lead of another team. Please change their Team Lead assignment first.");
        err.statusCode = 400;
        throw err;
      }

      // If user belongs to another team and confirmMove is not true -> 409
      if (user.team_id && user.team_id !== teamId && !confirmMove) {
        const err = new Error("User already belongs to another team.");
        err.statusCode = 409;
        err.current_team_name = user.current_team_name || "another team";
        err.requiresConfirmation = true;
        throw err;
      }

      // Update team_id
      await client.query(
        "UPDATE users SET team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [teamId, userId]
      );

      // Fetch new team member count
      const countRes = await client.query(
        "SELECT COUNT(*)::INTEGER AS member_count FROM users WHERE team_id = $1",
        [teamId]
      );
      const memberCount = countRes.rows[0]?.member_count || 0;

      await client.query("COMMIT");

      return {
        success: true,
        message: user.team_id
          ? `Successfully moved ${user.name} to ${team.name}.`
          : `Successfully added ${user.name} to ${team.name}.`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          team_id: teamId,
          team_name: team.name,
        },
        team_id: teamId,
        team_name: team.name,
        member_count: memberCount,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // 18. Remove a member from a team
  async removeMemberFromTeam({ teamId, userId, superiorAdminId }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Validate team
      const teamRes = await client.query(
        "SELECT id, name, team_admin_id FROM teams WHERE id = $1",
        [teamId]
      );
      if (teamRes.rows.length === 0) {
        const err = new Error("Team not found");
        err.statusCode = 404;
        throw err;
      }
      const team = teamRes.rows[0];

      // If user is current team lead, block removal
      if (String(team.team_admin_id) === String(userId)) {
        const err = new Error("This user is the current Team Lead. Please remove or change the Team Lead before removing this user from the team.");
        err.statusCode = 400;
        throw err;
      }

      // Validate user
      const userRes = await client.query(
        "SELECT id, name, team_id FROM users WHERE id = $1",
        [userId]
      );
      if (userRes.rows.length === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }
      const user = userRes.rows[0];

      if (String(user.team_id) !== String(teamId)) {
        const err = new Error("User is not a member of this team.");
        err.statusCode = 400;
        throw err;
      }

      // Set user team_id to null
      await client.query(
        "UPDATE users SET team_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [userId]
      );

      // Fetch new team member count
      const countRes = await client.query(
        "SELECT COUNT(*)::INTEGER AS member_count FROM users WHERE team_id = $1",
        [teamId]
      );
      const memberCount = countRes.rows[0]?.member_count || 0;

      await client.query("COMMIT");

      return {
        success: true,
        message: `Successfully removed ${user.name} from ${team.name}.`,
        user_id: userId,
        team_id: teamId,
        member_count: memberCount,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
