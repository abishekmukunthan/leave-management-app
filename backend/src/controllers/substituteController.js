import { substituteDao } from "../dao/substituteDao.js";

export const substituteController = {
  // GET /api/substitute-requests?employee_id=USER_ID
  async getSubstituteRequests(req, res) {
    try {
      const { employee_id } = req.query;

      if (!employee_id) {
        return res.status(400).json({
          error: "employee_id query parameter is required (e.g. ?employee_id=USER_UUID)",
        });
      }

      const requests = await substituteDao.getSubstituteRequestsByEmployeeId(employee_id);
      return res.status(200).json({
        count: requests.length,
        data: requests,
      });
    } catch (error) {
      console.error("Error fetching substitute requests:", error);
      return res.status(500).json({
        error: "Failed to fetch substitute requests",
        details: error.message,
      });
    }
  },

  // PUT /api/substitute-requests/:id/accept
  async acceptRequest(req, res) {
    try {
      const { id } = req.params;

      const existingRequest = await substituteDao.getSubstituteRequestById(id);
      if (!existingRequest) {
        return res.status(404).json({ error: "Substitute request not found" });
      }

      const result = await substituteDao.acceptSubstituteRequest(id);

      return res.status(200).json({
        message: "Substitute duty accepted successfully and forwarded for admin approval",
        data: result,
      });
    } catch (error) {
      console.error("Error accepting substitute request:", error);
      return res.status(500).json({
        error: "Failed to accept substitute request",
        details: error.message,
      });
    }
  },

  // PUT /api/substitute-requests/:id/reject
  async rejectRequest(req, res) {
    try {
      const { id } = req.params;
      const { substitute_remarks } = req.body;

      const existingRequest = await substituteDao.getSubstituteRequestById(id);
      if (!existingRequest) {
        return res.status(404).json({ error: "Substitute request not found" });
      }

      const updatedRequest = await substituteDao.rejectSubstituteRequest(
        id,
        substitute_remarks
      );

      return res.status(200).json({
        message: "Substitute duty request rejected",
        data: updatedRequest,
      });
    } catch (error) {
      console.error("Error rejecting substitute request:", error);
      return res.status(500).json({
        error: "Failed to reject substitute request",
        details: error.message,
      });
    }
  },
};
