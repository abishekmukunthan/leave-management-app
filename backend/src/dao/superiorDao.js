import pool from "../config/db.js";
import bcrypt from "bcryptjs";

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
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      LEFT JOIN users creator ON u.created_by = creator.id
      ORDER BY u.created_at DESC;
    `;
    const res = await pool.query(query);
    return res.rows;
  },

  // 3. Create a new user with profile, default leave balance, and leave entitlements
  async createUser({ name, email, role, team_id, designation, department, employment_type, created_by }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check email collision
      const checkEmail = await client.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email.trim()]);
      if (checkEmail.rows.length > 0) {
        const err = new Error("User with this email already exists");
        err.statusCode = 400;
        throw err;
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

      const userRole = role || "employee";
      const teamIdVal = team_id || null;
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

      // Get team name if assigned
      let teamName = "Unassigned";
      if (teamIdVal) {
        const teamRes = await client.query("SELECT name FROM teams WHERE id = $1", [teamIdVal]);
        if (teamRes.rows.length > 0) teamName = teamRes.rows[0].name;
      }

      // Generate Employee Code
      const empCode = `EMP-${Date.now().toString().slice(-6)}`;

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
        designation || "Employee",
        department || teamName,
        teamName,
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
          team_name: teamName,
          designation: designation || "Employee",
          department: department || teamName,
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
      const updateUsers = await client.query(
        "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, username, email, is_active",
        [userId]
      );

      if (updateUsers.rows.length === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }

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
        COALESCE(t.is_active, true) AS is_active,
        COUNT(DISTINCT u.id) AS total_members,
        t.created_at,
        t.updated_at
      FROM teams t
      LEFT JOIN users admin_u ON t.team_admin_id = admin_u.id
      LEFT JOIN users u ON u.team_id = t.id
      GROUP BY t.id, t.name, t.team_admin_id, admin_u.name
      ORDER BY t.name ASC;
    `;
    const res = await pool.query(query);
    return res.rows;
  },

  async createTeam({ name, team_admin_id }) {
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

      const adminIdVal = team_admin_id || null;
      const insertQuery = `
        INSERT INTO teams (name, team_admin_id, is_active, created_at, updated_at)
        VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name, team_admin_id, is_active, created_at, updated_at;
      `;
      const res = await client.query(insertQuery, [name.trim(), adminIdVal]);
      const newTeam = res.rows[0];

      // If team_admin_id provided, assign user to this team and ensure team_admin role
      if (adminIdVal) {
        await client.query(
          "UPDATE users SET team_id = $1, role = CASE WHEN role = 'employee' THEN 'team_admin' ELSE role END, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [newTeam.id, adminIdVal]
        );
      }

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
    const res = await pool.query(
      "UPDATE teams SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_active",
      [teamId]
    );
    if (res.rows.length === 0) {
      const err = new Error("Team not found");
      err.statusCode = 404;
      throw err;
    }
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
};
