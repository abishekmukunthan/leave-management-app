import { Router } from "express";
import { adminController } from "../controllers/adminController.js";

const router = Router();

// GET /api/admin/leave-requests - Get all leave requests for admin dashboard
router.get("/leave-requests", adminController.getAllLeaveRequests);

// PUT /api/admin/leave-requests/:id/approve - Approve leave request
router.put("/leave-requests/:id/approve", adminController.approveLeaveRequest);

// PUT /api/admin/leave-requests/:id/reject - Reject leave request
router.put("/leave-requests/:id/reject", adminController.rejectLeaveRequest);

export default router;
