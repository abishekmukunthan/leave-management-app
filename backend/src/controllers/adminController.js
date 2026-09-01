import { adminDao } from "../dao/adminDao.js";

export const adminController = {
  // GET /api/admin/leave-requests
  async getAllLeaveRequests(req, res) {
    try {
      const requests = await adminDao.getAllLeaveRequests();
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

      const leave = await adminDao.getLeaveRequestById(id);
      if (!leave) {
        return res.status(404).json({ error: "Leave request not found" });
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
