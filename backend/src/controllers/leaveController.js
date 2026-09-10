import { leaveDao } from "../dao/leaveDao.js";
import { checkLeaveQuota } from "../utils/quotaHelper.js";

const VALID_LEAVE_TYPES = [
  "Annual Leave",
  "Sick Leave",
  "Casual Leave",
  "Emergency Leave",
  "Half Day Leave",
  "Time Permission",
];

const VALID_PERMISSION_HOURS = {
  1: "1 hour",
  2: "2 hours",
  3: "3 hours",
  "1": "1 hour",
  "2": "2 hours",
  "3": "3 hours",
  "1 hour": "1 hour",
  "2 hours": "2 hours",
  "3 hours": "3 hours",
};

export const leaveController = {
  // POST /api/leaves
  async applyLeave(req, res) {
    try {
      const {
        employee_id,
        leave_type,
        start_date,
        end_date,
        permission_date,
        permission_hours,
        reason,
        substitute_employee_id,
        assigned_work,
        confirm_paycut,
      } = req.body;

      // 1. Basic validation
      if (!employee_id) {
        return res.status(400).json({ error: "employee_id is required" });
      }

      if (!leave_type || !VALID_LEAVE_TYPES.includes(leave_type)) {
        return res.status(400).json({
          error: `Invalid leave_type. Must be one of: ${VALID_LEAVE_TYPES.join(", ")}`,
        });
      }

      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: "reason is required" });
      }

      // 2. Validate leave type specifics
      let normalizedPermissionHours = null;
      if (leave_type === "Time Permission") {
        if (!permission_date) {
          return res.status(400).json({
            error: "permission_date is required for Time Permission",
          });
        }
        if (
          permission_hours === undefined ||
          permission_hours === null ||
          !VALID_PERMISSION_HOURS[permission_hours]
        ) {
          return res.status(400).json({
            error: "permission_hours can only be 1, 2, or 3 (e.g. '1 hour', '2 hours', '3 hours')",
          });
        }
        normalizedPermissionHours = VALID_PERMISSION_HOURS[permission_hours];
      } else {
        // Normal leave
        if (!start_date || !end_date) {
          return res.status(400).json({
            error: "start_date and end_date are required for standard leave requests",
          });
        }
        if (new Date(end_date) < new Date(start_date)) {
          return res.status(400).json({
            error: "end_date cannot be earlier than start_date",
          });
        }
      }

      // 3. Overlapping leave validation
      const checkStart = leave_type === "Time Permission" ? permission_date : start_date;
      const checkEnd = leave_type === "Time Permission" ? permission_date : end_date;

      const existingRequest = await leaveDao.findOverlappingLeave(
        employee_id,
        checkStart,
        checkEnd
      );

      if (existingRequest) {
        const formatReqDate = (val) => {
          if (!val) return null;
          if (val instanceof Date) return val.toISOString().split("T")[0];
          return String(val).split("T")[0];
        };

        const existStart = formatReqDate(existingRequest.start_date) || existingRequest.permission_date;
        const existEnd = formatReqDate(existingRequest.end_date) || existingRequest.permission_date;

        return res.status(400).json({
          message: "You already have an active leave request for this date.",
          existingRequest: {
            leave_type: existingRequest.leave_type,
            start_date: existStart,
            end_date: existEnd,
            status: existingRequest.status,
          },
        });
      }

      // 4. Perform Quota Check
      const quotaCheck = await checkLeaveQuota(null, {
        employee_id,
        leave_type,
        start_date,
        end_date,
        permission_hours: normalizedPermissionHours || permission_hours,
      });

      // Requirement 3: If quota is exceeded and confirm_paycut !== true, return confirmation requirement
      if (quotaCheck.is_paycut_leave && confirm_paycut !== true) {
        return res.status(200).json({
          requiresConfirmation: true,
          message: "Leave quota exceeded",
          warning: quotaCheck.quota_warning_message,
          quotaDetails: quotaCheck.quotaDetails,
        });
      }

      // 4. Substitute validation & Leave creation
      const leavePayload = {
        employee_id,
        leave_type,
        leave_type_id: quotaCheck.leave_type_id,
        start_date: leave_type === "Time Permission" ? null : start_date,
        end_date: leave_type === "Time Permission" ? null : end_date,
        permission_date: leave_type === "Time Permission" ? permission_date : null,
        permission_hours: normalizedPermissionHours,
        reason: reason.trim(),
        requested_units: quotaCheck.requested_units,
        is_paycut_leave: quotaCheck.is_paycut_leave,
        paycut_units: quotaCheck.paycut_units,
        quota_warning_message: quotaCheck.quota_warning_message,
      };

      if (substitute_employee_id) {
        if (employee_id === substitute_employee_id) {
          return res.status(400).json({
            error: "employee_id and substitute_employee_id cannot be the same person",
          });
        }
        if (!assigned_work || !assigned_work.trim()) {
          return res.status(400).json({
            error: "assigned_work is required when specifying a substitute employee",
          });
        }

        const newLeave = await leaveDao.createLeaveWithSubstitute({
          ...leavePayload,
          substitute_employee_id,
          assigned_work: assigned_work.trim(),
        });

        return res.status(201).json({
          message: "Leave application submitted successfully, waiting for substitute approval",
          data: newLeave,
        });
      } else {
        // No substitute provided -> directly moves to Waiting for Admin Approval
        const newLeave = await leaveDao.createLeaveDirect(leavePayload);

        return res.status(201).json({
          message: "Leave application submitted successfully, waiting for admin approval",
          data: newLeave,
        });
      }
    } catch (error) {
      console.error("Error applying for leave:", error);
      return res.status(500).json({
        error: "Failed to submit leave request",
        details: error.message,
      });
    }
  },

  // GET /api/leaves/my-leaves?employee_id=USER_ID
  async getMyLeaves(req, res) {
    try {
      const { employee_id } = req.query;

      if (!employee_id) {
        return res.status(400).json({
          error: "employee_id query parameter is required (e.g. ?employee_id=USER_UUID)",
        });
      }

      const leaves = await leaveDao.getLeavesByEmployeeId(employee_id);
      return res.status(200).json({
        count: leaves.length,
        data: leaves,
      });
    } catch (error) {
      console.error("Error fetching my leaves:", error);
      return res.status(500).json({
        error: "Failed to fetch leave requests",
        details: error.message,
      });
    }
  },

  // GET /api/leaves/substitute-employees?employee_id=USER_ID&search=SEARCH_TEXT
  async getSubstituteEmployees(req, res) {
    try {
      const { employee_id, search, limit } = req.query;

      const employees = await leaveDao.getSubstituteEmployees({
        employee_id,
        search,
        limit,
      });

      return res.status(200).json({
        count: employees.length,
        data: employees,
      });
    } catch (error) {
      console.error("Error fetching substitute employees:", error);
      return res.status(500).json({
        error: "Failed to fetch substitute employees",
        details: error.message,
      });
    }
  },
};
