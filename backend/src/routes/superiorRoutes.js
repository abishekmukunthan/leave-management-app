import { Router } from "express";
import { superiorController } from "../controllers/superiorController.js";

const router = Router();

// GET /api/superior/dashboard-summary - Get superior admin overview, team breakdown, and activity
router.get("/dashboard-summary", superiorController.getDashboardSummary);

export default router;
