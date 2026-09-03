import { calendarDao } from "../dao/calendarDao.js";

export const calendarController = {
  // GET /api/calendar/month?year=2026&month=9&user_id=USER_ID
  async getMonthSummary(req, res) {
    try {
      const now = new Date();
      const year = req.query.year || now.getFullYear();
      const month = req.query.month || (now.getMonth() + 1);
      const user_id = req.query.user_id || null;

      const summary = await calendarDao.getMonthSummary({
        year,
        month,
        user_id,
      });

      return res.status(200).json(summary);
    } catch (error) {
      console.error("Error fetching month calendar summary:", error);
      return res.status(500).json({
        error: "Failed to fetch month calendar summary",
        details: error.message,
      });
    }
  },

  // GET /api/calendar/day?date=2026-09-03&user_id=USER_ID
  async getDayDetails(req, res) {
    try {
      const { date, user_id } = req.query;

      if (!date) {
        return res.status(400).json({
          error: "date query parameter is required (e.g. ?date=2026-09-03)",
        });
      }

      const dayDetails = await calendarDao.getDayDetails({
        date,
        user_id: user_id || null,
      });

      return res.status(200).json(dayDetails);
    } catch (error) {
      console.error("Error fetching day calendar details:", error);
      return res.status(500).json({
        error: "Failed to fetch day calendar details",
        details: error.message,
      });
    }
  },
};
