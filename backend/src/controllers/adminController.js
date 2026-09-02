import { adminDao } from "../dao/adminDao.js";

export const adminController = {
  // GET /api/admin/leave-requests
  async getAllLeaveRequests(req, res) {
    try {
      const { admin_id } = req.query;
      const requests = await adminDao.getAllLeaveRequests(admin_id || null);
      return res.status(200).json({
        count: requests.length,
        data: requests,
      });
    } catch (error) {
      console.error("Error fetching admin leave requests:", error);
      return res.status(500).json({
        error: "Failed to fetch leave requests",
        details: error.message,
      });
    }
  },

  // PUT /api/admin/leave-requests/:id/approve
  async approveLeaveRequest(req, res) {
    try {
      const { id } = req.params;
      const { approved_by } = req.body;

      const leave = await adminDao.getLeaveRequestById(id);
      if (!leave) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      // Rule: Admin cannot approve if status is still "Waiting for Substitute Approval"
      if (leave.status === "Waiting for Substitute Approval") {
        return res.status(400).json({
          error: "Admin cannot approve leave while it is still waiting for substitute approval",
        });
      }

      // Role and Team check for approver
      if (approved_by) {
        const approver = await adminDao.getUserById(approved_by);
        if (!approver) {
          return res.status(404).json({ error: "Approver user not found" });
        }

        // Rule: Superior admin can monitor but cannot approve
        if (approver.role === "superior_admin") {
          return res.status(403).json({
            error: "Superior admin can monitor but team admin must approve leave.",
          });
        }

        // Rule: Team admin can only approve requests for their own team
        if (approver.role === "team_admin") {
          const adminTeamId = approver.managed_team_id || approver.team_id;
          if (!adminTeamId || adminTeamId !== leave.employee_team_id) {
            return res.status(403).json({
              error: "Team admin can only approve leave requests for their own team members.",
            });
          }
        }
      }

      const updatedLeave = await adminDao.approveLeaveRequest(id, approved_by);

      return res.status(200).json({
        message: "Leave request approved successfully",
        data: updatedLeave,
      });
    } catch (error) {
      console.error("Error approving leave request:", error);
      return res.status(500).json({
        error: "Failed to approve leave request",
        details: error.message,
      });
    }
  },

  // PUT /api/admin/leave-requests/:id/reject
  async rejectLeaveRequest(req, res) {
    try {
      const { id } = req.params;
      const { admin_remarks } = req.body;
      const rejected_by =
        req.body.rejected_by ||
        req.body.admin_id ||
        req.body.approved_by ||
        req.query.admin_id;

      const leave = await adminDao.getLeaveRequestById(id);
      if (!leave) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      // Role and Team check for rejector
      if (rejected_by) {
        const rejector = await adminDao.getUserById(rejected_by);
        if (!rejector) {
          return res.status(404).json({ error: "Admin user not found" });
        }

        // Rule: Superior admin can monitor but team admin must act
        if (rejector.role === "superior_admin") {
          return res.status(403).json({
            error: "Superior admin can monitor but team admin must approve leave.",
          });
        }

        // Rule: Team admin can only reject requests for their own team
        if (rejector.role === "team_admin") {
          const adminTeamId = rejector.managed_team_id || rejector.team_id;
          if (!adminTeamId || adminTeamId !== leave.employee_team_id) {
            return res.status(403).json({
              error: "Team admin can only reject leave requests for their own team members.",
            });
          }
        }
      }

      const updatedLeave = await adminDao.rejectLeaveRequest(id, admin_remarks);

      return res.status(200).json({
        message: "Leave request rejected",
        data: updatedLeave,
      });
    } catch (error) {
      console.error("Error rejecting leave request:", error);
      return res.status(500).json({
        error: "Failed to reject leave request",
        details: error.message,
      });
    }
  },
};
