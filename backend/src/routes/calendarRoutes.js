import { Router } from "express";
import { calendarController } from "../controllers/calendarController.js";

const router = Router();

// GET /api/calendar/month?year=2026&month=9&user_id=USER_ID
router.get("/month", calendarController.getMonthSummary);

// GET /api/calendar/day?date=2026-09-03&user_id=USER_ID
router.get("/day", calendarController.getDayDetails);

export default router;
