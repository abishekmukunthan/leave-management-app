import pool from "../config/db.js";

export const reportDao = {
  // Query all leaves within [fromDate, toDate] and build full report metrics
  async getLeaveSummaryReportData({ fromDate, toDate, superiorAdminId }) {
    // 1. Fetch Superior Admin details for generation metadata
    let generatedByName = "Superior Admin";
    if (superiorAdminId) {
      const adminRes = await pool.query("SELECT name FROM users WHERE id = $1", [superiorAdminId]);
      if (adminRes.rows.length > 0) {
        generatedByName = adminRes.rows[0].name;
      }
    }

    // 2. Query leave requests intersecting date range
    const query = `
      SELECT DISTINCT ON (lr.id)
        lr.id,
        lr.employee_id,
        u.name AS employee_name,
        u.email AS employee_email,
        u.team_id,
        COALESCE(NULLIF(TRIM(ep.department), ''), t.name, 'Unassigned') AS department_name,
        COALESCE(t.name, 'Unassigned') AS team_name,
        lr.leave_type,
        lr.start_date::text AS start_date,
        lr.end_date::text AS end_date,
        lr.permission_date::text AS permission_date,
        lr.permission_hours,
        lr.reason,
        lr.status,
        COALESCE(lr.is_paycut_leave, false) AS is_paycut_leave,
        COALESCE(lr.paycut_units, 0) AS paycut_units,
        COALESCE(lr.requested_units, 0) AS requested_units,
        lr.quota_warning_message,
        lr.admin_remarks,
        lr.created_at::text AS created_at,
        lr.approved_at::text AS approved_at,
        app_u.name AS approved_by,
        sub_u.name AS substitute_name,
        sr.assigned_work
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users app_u ON lr.approved_by = app_u.id
      LEFT JOIN substitute_requests sr ON lr.id = sr.leave_request_id
      LEFT JOIN users sub_u ON sr.substitute_employee_id = sub_u.id
      WHERE (
        (lr.leave_type != 'Time Permission' AND lr.start_date <= $2 AND lr.end_date >= $1)
        OR
        (lr.leave_type = 'Time Permission' AND lr.permission_date >= $1 AND lr.permission_date <= $2)
      )
      ORDER BY lr.id, lr.created_at DESC;
    `;

    const res = await pool.query(query, [fromDate, toDate]);
    const rawRows = res.rows;

    // Process rows with parsed metrics
    const details = rawRows.map((row) => {
      const isTimePerm = row.leave_type === "Time Permission";
      let leaveDays = 0;
      let permHours = 0;

      if (isTimePerm) {
        let hours = 1;
        if (typeof row.permission_hours === "number") {
          hours = row.permission_hours;
        } else if (typeof row.permission_hours === "string") {
          const m = row.permission_hours.match(/(\d+)/);
          if (m) hours = parseInt(m[1], 10);
        }
        permHours = Math.max(1, hours);
        leaveDays = 0;
      } else {
        if (row.requested_units && Number(row.requested_units) > 0) {
          leaveDays = Number(row.requested_units);
        } else if (row.start_date && row.end_date) {
          const s = new Date(row.start_date);
          const e = new Date(row.end_date);
          const diff = Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
          leaveDays = row.leave_type === "Half Day Leave" ? Math.max(0.5, diff * 0.5) : Math.max(1, diff);
        } else {
          leaveDays = 1;
        }
        permHours = 0;
      }

      // Applied date display
      const appliedDate = row.created_at ? row.created_at.split("T")[0] : "—";
      const startDate = isTimePerm ? row.permission_date : row.start_date;

      return {
        id: row.id,
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        department_name: row.department_name,
        team_name: row.team_name,
        leave_type: row.leave_type,
        record_type: isTimePerm ? "Time Permission" : "Leave",
        start_date: startDate || "—",
        end_date: isTimePerm ? "—" : (row.end_date || "—"),
        leave_days: leaveDays,
        permission_hours: permHours,
        substitute_name: row.substitute_name || "Not assigned",
        assigned_work: row.assigned_work || "No assigned work",
        status: row.status,
        approved_by: row.approved_by || "—",
        applied_date: appliedDate,
        remarks: row.admin_remarks || row.reason || "—",
        is_paycut_leave: Boolean(row.is_paycut_leave || Number(row.paycut_units) > 0),
        paycut_units: Number(row.paycut_units) || 0,
      };
    });

    // Sort details chronologically
    details.sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));

    // 3. Compute Executive Summary
    const totalRequests = details.length;
    const uniqueEmployees = new Set(details.map((d) => d.employee_id));
    const totalEmployeesTookLeave = uniqueEmployees.size;
    const totalLeaveDays = details.reduce((sum, d) => sum + d.leave_days, 0);
    const totalTimePermissionHours = details.reduce((sum, d) => sum + d.permission_hours, 0);

    let approvedRequests = 0;
    let pendingRequests = 0;
    let rejectedRequests = 0;
    let paycutLeaveCount = 0;

    for (const d of details) {
      if (d.status === "Approved") {
        approvedRequests++;
      } else if (d.status === "Rejected" || d.status === "Substitute Rejected") {
        rejectedRequests++;
      } else {
        pendingRequests++;
      }

      if (d.is_paycut_leave) {
        paycutLeaveCount++;
      }
    }

    // 4. Employee-wise Summary
    const empMap = new Map();
    for (const d of details) {
      if (!empMap.has(d.employee_id)) {
        empMap.set(d.employee_id, {
          employee_id: d.employee_id,
          employee_name: d.employee_name,
          department_name: d.department_name,
          team_name: d.team_name,
          total_requests: 0,
          total_leave_days: 0,
          total_permission_hours: 0,
          approved_count: 0,
          pending_count: 0,
          rejected_count: 0,
          paycut_count: 0,
        });
      }
      const emp = empMap.get(d.employee_id);
      emp.total_requests++;
      emp.total_leave_days += d.leave_days;
      emp.total_permission_hours += d.permission_hours;
      if (d.status === "Approved") {
        emp.approved_count++;
      } else if (d.status === "Rejected" || d.status === "Substitute Rejected") {
        emp.rejected_count++;
      } else {
        emp.pending_count++;
      }
      if (d.is_paycut_leave) {
        emp.paycut_count++;
      }
    }
    const employeeSummary = Array.from(empMap.values()).sort((a, b) =>
      b.total_leave_days - a.total_leave_days || a.employee_name.localeCompare(b.employee_name)
    );

    // 5. Team-wise Summary
    const teamMap = new Map();
    for (const d of details) {
      const teamKey = d.department_name || d.team_name || "Unassigned";
      if (!teamMap.has(teamKey)) {
        teamMap.set(teamKey, {
          team_name: teamKey,
          employees_set: new Set(),
          total_requests: 0,
          total_leave_days: 0,
          total_permission_hours: 0,
          leave_type_counts: {},
        });
      }
      const t = teamMap.get(teamKey);
      t.employees_set.add(d.employee_id);
      t.total_requests++;
      t.total_leave_days += d.leave_days;
      t.total_permission_hours += d.permission_hours;
      t.leave_type_counts[d.leave_type] = (t.leave_type_counts[d.leave_type] || 0) + 1;
    }

    const teamSummary = Array.from(teamMap.values()).map((t) => {
      // Find most used leave type
      let mostUsedType = "N/A";
      let maxCount = 0;
      for (const [type, count] of Object.entries(t.leave_type_counts)) {
        if (count > maxCount) {
          maxCount = count;
          mostUsedType = type;
        }
      }
      return {
        team_name: t.team_name,
        employees_count: t.employees_set.size,
        total_requests: t.total_requests,
        total_leave_days: t.total_leave_days,
        total_permission_hours: t.total_permission_hours,
        most_used_leave_type: mostUsedType,
      };
    }).sort((a, b) => b.total_requests - a.total_requests || a.team_name.localeCompare(b.team_name));

    // 6. Leave Type Breakdown
    const ltMap = {};
    for (const d of details) {
      if (!ltMap[d.leave_type]) {
        ltMap[d.leave_type] = {
          leave_type: d.leave_type,
          count: 0,
          total_days: 0,
          total_hours: 0,
        };
      }
      ltMap[d.leave_type].count++;
      ltMap[d.leave_type].total_days += d.leave_days;
      ltMap[d.leave_type].total_hours += d.permission_hours;
    }
    const leaveTypeBreakdown = Object.values(ltMap).sort((a, b) => b.count - a.count);

    // 7. Exceptions / Important Notes
    const paycutLeaves = details.filter((d) => d.is_paycut_leave);
    const pendingLeaveDetails = details.filter((d) => d.status !== "Approved" && d.status !== "Rejected" && d.status !== "Substitute Rejected");
    const rejectedLeaveDetails = details.filter((d) => d.status === "Rejected" || d.status === "Substitute Rejected");
    const highUsageEmployees = employeeSummary.filter((e) => e.total_leave_days >= 3 || e.total_permission_hours >= 4);

    return {
      metadata: {
        report_title: "Leave Summary Report",
        from_date: fromDate,
        to_date: toDate,
        generated_at: new Date().toISOString(),
        generated_by: generatedByName,
      },
      summary: {
        total_requests: totalRequests,
        total_employees_took_leave: totalEmployeesTookLeave,
        total_leave_days: Number(totalLeaveDays.toFixed(1)),
        total_time_permission_hours: totalTimePermissionHours,
        approved_requests: approvedRequests,
        pending_requests: pendingRequests,
        rejected_requests: rejectedRequests,
        paycut_leave_count: paycutLeaveCount,
      },
      details,
      employee_summary: employeeSummary,
      team_summary: teamSummary,
      leave_type_breakdown: leaveTypeBreakdown,
      exceptions: {
        paycut_leaves: paycutLeaves,
        pending_leaves: pendingLeaveDetails,
        rejected_leaves: rejectedLeaveDetails,
        high_usage_employees: highUsageEmployees,
      },
    };
  },
};
