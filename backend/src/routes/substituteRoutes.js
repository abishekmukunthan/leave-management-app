import { Router } from "express";
import { substituteController } from "../controllers/substituteController.js";

const router = Router();

// GET /api/substitute-requests?employee_id=USER_ID - Get substitute duty requests
router.get("/", substituteController.getSubstituteRequests);

// PUT /api/substitute-requests/:id/accept - Accept substitute duty
router.put("/:id/accept", substituteController.acceptRequest);

// PUT /api/substitute-requests/:id/reject - Reject substitute duty
router.put("/:id/reject", substituteController.rejectRequest);

export default router;
