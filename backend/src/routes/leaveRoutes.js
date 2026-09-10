import { Router } from "express";
import { leaveController } from "../controllers/leaveController.js";

const router = Router();

// POST /api/leaves - Apply for leave
router.post("/", leaveController.applyLeave);

// GET /api/leaves/my-leaves?employee_id=USER_ID - Get employee leaves
router.get("/my-leaves", leaveController.getMyLeaves);

// GET /api/leaves/substitute-employees?employee_id=USER_ID&search=SEARCH_TEXT - Get eligible substitute employees
router.get("/substitute-employees", leaveController.getSubstituteEmployees);

export default router;
