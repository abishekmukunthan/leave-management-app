import { superiorDao } from "../dao/superiorDao.js";

export const superiorController = {
  // GET /api/superior/dashboard-summary
  async getDashboardSummary(req, res) {
    try {
      const summary = await superiorDao.getDashboardSummary();
      return res.status(200).json(summary);
    } catch (error) {
      console.error("Error fetching superior dashboard summary:", error);
      return res.status(500).json({
        error: "Failed to fetch superior dashboard summary",
        details: error.message,
      });
    }
  },
};
