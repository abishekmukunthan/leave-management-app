import pool from "../config/db.js";

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

    // 1. Filter lists
    // People on normal leave today
    const peopleOnLeaveToday = leaves.filter(isNormalLeaveToday);

    // People on time permission today
    const timePermissionsToday = leaves.filter(isTimePermissionToday);

    // Pending team admin approvals
    const pendingTeamAdminApprovals = leaves.filter(
      (l) => l.status === "Waiting for Admin Approval"
    );

    // Pending substitute approvals (excluding rejected)
    const pendingSubstituteApprovals = leaves.filter(isPendingSubstitute);

    // Rejected substitute requests
    const rejectedSubstituteRequests = leaves.filter(
      (l) => l.substitute_status === "Rejected"
    );

    // Approved and Rejected totals
    const approvedRequests = leaves.filter((l) => l.status === "Approved");
    const rejectedRequests = leaves.filter((l) => l.status === "Rejected");

    // Recent activity
    const approvalActivity = leaves
      .filter((l) => l.status === "Approved" || l.status === "Rejected")
      .slice(0, 15);

    // 2. Overview metrics
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

    // 3. Team Summary using exact matching logic
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
};
