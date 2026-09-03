import pool from "../config/db.js";

export const calendarDao = {
  // Get user context for role and team filtering
  async getUserContext(userId) {
    if (!userId) return null;
    const query = `
      SELECT 
        u.id, 
        u.name, 
        u.role, 
        u.team_id, 
        t.name AS team_name,
        t_managed.id AS managed_team_id
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN teams t_managed ON t_managed.team_admin_id = u.id
      WHERE u.id = $1;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  },

  // Get month calendar summary (unique employee leave counts for each date in selected month)
  async getMonthSummary({ year, month, user_id }) {
    const user = await this.getUserContext(user_id);
    let teamIdFilter = null;

    if (user && user.role !== "superior_admin") {
      teamIdFilter = user.managed_team_id || user.team_id;
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    // Format start and end date of the month (YYYY-MM-DD)
    const startDateStr = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
    const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();
    const endDateStr = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

    let query = `
      SELECT 
        lr.id,
        lr.employee_id,
        lr.leave_type,
        lr.start_date::text AS start_date,
        lr.end_date::text AS end_date,
        lr.permission_date::text AS permission_date,
        lr.permission_hours,
        u.team_id
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      WHERE lr.status = 'Approved'
        AND (
          (lr.leave_type != 'Time Permission' AND lr.start_date <= $2 AND lr.end_date >= $1)
          OR
          (lr.leave_type = 'Time Permission' AND lr.permission_date >= $1 AND lr.permission_date <= $2)
        )
    `;

    const params = [startDateStr, endDateStr];
    if (teamIdFilter) {
      query += ` AND u.team_id = $3`;
      params.push(teamIdFilter);
    }

    const result = await pool.query(query, params);
    const approvedLeaves = result.rows;

    // Build array of summary objects for each date in month
    const days = [];
    for (let d = 1; d <= lastDayOfMonth; d++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      const onLeaveEmpSet = new Set();
      const timePermEmpSet = new Set();

      for (const leave of approvedLeaves) {
        if (leave.leave_type === "Time Permission") {
          if (leave.permission_date === dateStr) {
            timePermEmpSet.add(leave.employee_id);
          }
        } else {
          if (leave.start_date && leave.end_date) {
            if (dateStr >= leave.start_date && dateStr <= leave.end_date) {
              onLeaveEmpSet.add(leave.employee_id);
            }
          }
        }
      }

      const totalAwayEmpSet = new Set([...onLeaveEmpSet, ...timePermEmpSet]);

      days.push({
        date: dateStr,
        onLeaveCount: onLeaveEmpSet.size,
        timePermissionCount: timePermEmpSet.size,
        totalAwayCount: totalAwayEmpSet.size,
      });
    }

    return {
      year: yearNum,
      month: monthNum,
      user_id: user ? user.id : null,
      role: user ? user.role : "all",
      team_name: user ? (user.team_name || "All Teams") : "All Teams",
      days,
    };
  },

  // Get day details for one selected date
  async getDayDetails({ date, user_id }) {
    const user = await this.getUserContext(user_id);
    let teamIdFilter = null;

    if (user && user.role !== "superior_admin") {
      teamIdFilter = user.managed_team_id || user.team_id;
    }

    // 1. Get teams and total active members
    let teamsQuery = `
      SELECT 
        t.id AS team_id,
        t.name AS team_name,
        COUNT(u.id)::integer AS total_members
      FROM teams t
      LEFT JOIN users u ON u.team_id = t.id AND u.is_active = true
      WHERE t.is_active = true
    `;
    const teamParams = [];
    if (teamIdFilter) {
      teamsQuery += ` AND t.id = $1`;
      teamParams.push(teamIdFilter);
    }
    teamsQuery += ` GROUP BY t.id, t.name ORDER BY t.name;`;

    const teamsRes = await pool.query(teamsQuery, teamParams);
    const teamsList = teamsRes.rows;

    // 2. Get approved normal leaves for this date
    let leavesQuery = `
      SELECT DISTINCT ON (lr.id)
        lr.id,
        lr.employee_id,
        u.name AS employee_name,
        u.team_id,
        COALESCE(t.name, 'Unassigned') AS team_name,
        lr.leave_type,
        lr.start_date::text AS start_date,
        lr.end_date::text AS end_date,
        lr.reason,
        app_u.name AS approved_by,
        sub_u.name AS substitute_name,
        sr.assigned_work
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users app_u ON lr.approved_by = app_u.id
      LEFT JOIN substitute_requests sr ON lr.id = sr.leave_request_id
      LEFT JOIN users sub_u ON sr.substitute_employee_id = sub_u.id
      WHERE lr.status = 'Approved'
        AND lr.leave_type != 'Time Permission'
        AND $1 >= lr.start_date AND $1 <= lr.end_date
    `;
    const leaveParams = [date];
    if (teamIdFilter) {
      leavesQuery += ` AND u.team_id = $2`;
      leaveParams.push(teamIdFilter);
    }
    leavesQuery += ` ORDER BY lr.id, u.name;`;

    const leavesRes = await pool.query(leavesQuery, leaveParams);
    const normalLeaves = leavesRes.rows;

    // 3. Get approved time permissions for this date
    let permQuery = `
      SELECT DISTINCT ON (lr.id)
        lr.id,
        lr.employee_id,
        u.name AS employee_name,
        u.team_id,
        COALESCE(t.name, 'Unassigned') AS team_name,
        lr.leave_type,
        lr.permission_date::text AS permission_date,
        lr.permission_hours,
        lr.reason,
        app_u.name AS approved_by,
        sub_u.name AS substitute_name,
        sr.assigned_work
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users app_u ON lr.approved_by = app_u.id
      LEFT JOIN substitute_requests sr ON lr.id = sr.leave_request_id
      LEFT JOIN users sub_u ON sr.substitute_employee_id = sub_u.id
      WHERE lr.status = 'Approved'
        AND lr.leave_type = 'Time Permission'
        AND lr.permission_date = $1
    `;
    const permParams = [date];
    if (teamIdFilter) {
      permQuery += ` AND u.team_id = $2`;
      permParams.push(teamIdFilter);
    }
    permQuery += ` ORDER BY lr.id, u.name;`;

    const permRes = await pool.query(permQuery, permParams);
    const timePerms = permRes.rows;

    // Format peopleOnLeave list (detailed records)
    const peopleOnLeave = normalLeaves.map((l) => {
      let duration = "1 day";
      if (l.leave_type === "Half Day Leave") {
        duration = "0.5 days";
      } else if (l.start_date && l.end_date) {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        const diffDays = Math.round(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        duration = `${diffDays} ${diffDays === 1 ? "day" : "days"}`;
      }

      return {
        employee_name: l.employee_name,
        team_name: l.team_name,
        leave_type: l.leave_type,
        duration,
        substitute_name: l.substitute_name || null,
        assigned_work: l.assigned_work || null,
        approved_by: l.approved_by || "Team Lead",
      };
    });

    // Format timePermissions list (detailed records)
    const timePermissions = timePerms.map((p) => ({
      employee_name: p.employee_name,
      team_name: p.team_name,
      permission_hours: p.permission_hours || "Time Permission",
      substitute_name: p.substitute_name || null,
      assigned_work: p.assigned_work || null,
      approved_by: p.approved_by || "Team Lead",
    }));

    // Unique Employee sets for overall summary
    const onLeaveEmpSet = new Set(normalLeaves.map((l) => l.employee_id));
    const timePermEmpSet = new Set(timePerms.map((p) => p.employee_id));
    const totalAwayEmpSet = new Set([...onLeaveEmpSet, ...timePermEmpSet]);

    const totalEmployees = teamsList.reduce((acc, t) => acc + parseInt(t.total_members || 0, 10), 0);
    const onLeaveCount = onLeaveEmpSet.size;
    const timePermissionCount = timePermEmpSet.size;
    const totalAwayCount = totalAwayEmpSet.size;
    const availableEmployees = Math.max(0, totalEmployees - totalAwayCount);

    // Calculate team breakdown with unique employee counts
    const teamBreakdown = teamsList.map((t) => {
      const tMembers = parseInt(t.total_members || 0, 10);
      const tOnLeaveEmpSet = new Set(normalLeaves.filter((l) => l.team_id === t.team_id).map((l) => l.employee_id));
      const tTimePermEmpSet = new Set(timePerms.filter((p) => p.team_id === t.team_id).map((p) => p.employee_id));
      const tTotalAwayEmpSet = new Set([...tOnLeaveEmpSet, ...tTimePermEmpSet]);

      const tOnLeave = tOnLeaveEmpSet.size;
      const tTimePerm = tTimePermEmpSet.size;
      const tTotalAway = tTotalAwayEmpSet.size;
      const tAvailable = Math.max(0, tMembers - tTotalAway);

      return {
        teamName: t.team_name,
        totalMembers: tMembers,
        availableCount: tAvailable,
        onLeaveCount: tOnLeave,
        timePermissionCount: tTimePerm,
        totalAwayCount: tTotalAway,
      };
    });

    return {
      date,
      summary: {
        totalEmployees,
        availableEmployees,
        onLeaveCount,
        timePermissionCount,
        totalAwayCount,
      },
      teamBreakdown,
      peopleOnLeave,
      timePermissions,
    };
  },
};
