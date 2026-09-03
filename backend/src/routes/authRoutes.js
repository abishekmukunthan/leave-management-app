import { Router } from "express";
import { authController } from "../controllers/authController.js";

const router = Router();

// POST /api/auth/login - Authenticate user with username and password
router.post("/login", authController.login);

// POST /api/auth/change-password - Change temporary or current password
router.post("/change-password", authController.changePassword);

export default router;
