import { adminDao } from "../dao/adminDao.js";

export const adminController = {
  // GET /api/admin/leave-requests
  async getAllLeaveRequests(req, res) {
    try {
      const { admin_id } = req.query;
      const result = await adminDao.getAllLeaveRequests(admin_id || null);

      if (result.noPermissions) {
        return res.status(200).json({
          count: 0,
          summary: {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
          },
          data: [],
          message: "No leave approval permissions assigned.",
        });
      }

      const requests = result.rows || [];
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
      const approved_by = req.body.approved_by || req.body.admin_id || req.query.admin_id;

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

      if (!approved_by) {
        return res.status(400).json({ error: "Approver user ID is required." });
      }

      // Self-Approval Block: A user cannot approve their own leave request
      if (String(approved_by) === String(leave.employee_id)) {
        return res.status(403).json({
          message: "You cannot approve your own leave request. This leave must be approved by another authorized approver or Superior Admin.",
        });
      }

      // Permission Enforcement: Check user has leave approval permission for applicant's team
      const applicantTeamId = leave.employee_team_id || leave.team_id;
      const { hasPermission, requiredPermission, notConfigured } = await adminDao.checkUserHasTeamApprovalPermission(
        approved_by,
        applicantTeamId
      );

      if (notConfigured || !requiredPermission) {
        return res.status(403).json({
          message: "Approval permission is not configured for this team.",
        });
      }

      if (!hasPermission) {
        return res.status(403).json({
          message: "You do not have permission to approve leave for this team.",
          requiredPermission,
        });
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

      if (!rejected_by) {
        return res.status(400).json({ error: "Admin user ID is required." });
      }

      // Self-Rejection Block: A user cannot reject their own leave request
      if (String(rejected_by) === String(leave.employee_id)) {
        return res.status(403).json({
          message: "You cannot approve your own leave request. This leave must be approved by another authorized approver or Superior Admin.",
        });
      }

      // Permission Enforcement: Check user has leave approval permission for applicant's team
      const applicantTeamId = leave.employee_team_id || leave.team_id;
      const { hasPermission, requiredPermission, notConfigured } = await adminDao.checkUserHasTeamApprovalPermission(
        rejected_by,
        applicantTeamId
      );

      if (notConfigured || !requiredPermission) {
        return res.status(403).json({
          message: "Approval permission is not configured for this team.",
        });
      }

      if (!hasPermission) {
        return res.status(403).json({
          message: "You do not have permission to approve leave for this team.",
          requiredPermission,
        });
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
