import { Router } from "express";
import { superiorController } from "../controllers/superiorController.js";

const router = Router();

// =========================================================================
// 1. DASHBOARD MONITORING & USER MANAGEMENT
// =========================================================================

// GET /api/superior/dashboard-summary - Superior admin monitoring overview
router.get("/dashboard-summary", superiorController.getDashboardSummary);

// GET /api/superior/users - Get all users with department & profile details
router.get("/users", superiorController.getUsers);

// POST /api/superior/users - Create new employee or team admin user account
router.post("/users", superiorController.createUser);

// PUT /api/superior/users/:id/reset-password - Reset password to a temporary password
router.put("/users/:id/reset-password", superiorController.resetPassword);

// PUT /api/superior/users/:id/deactivate - Deactivate a user account
router.put("/users/:id/deactivate", superiorController.deactivateUser);

// =========================================================================
// 2. LEAVE ENTITLEMENTS / QUOTAS
// =========================================================================

// GET /api/superior/users/:id/leave-entitlements - Get employee leave quota & entitlements
router.get("/users/:id/leave-entitlements", superiorController.getLeaveEntitlements);

// PUT /api/superior/users/:id/leave-entitlements - Update employee leave allocations
router.put("/users/:id/leave-entitlements", superiorController.updateLeaveEntitlements);

// =========================================================================
// 3. TEAMS MANAGEMENT
// =========================================================================

// GET /api/superior/teams - Get all teams with team admin details
router.get("/teams", superiorController.getTeams);

// POST /api/superior/teams - Create a new team
router.post("/teams", superiorController.createTeam);

// PUT /api/superior/teams/:id - Update team details and team admin assignment
router.put("/teams/:id", superiorController.updateTeam);

// PUT /api/superior/teams/:id/deactivate - Soft deactivate a team
router.put("/teams/:id/deactivate", superiorController.deactivateTeam);

// =========================================================================
// 4. LEAVE TYPES MANAGEMENT
// =========================================================================

// GET /api/superior/leave-types - Get all leave types
router.get("/leave-types", superiorController.getLeaveTypes);

// POST /api/superior/leave-types - Create a new leave type
router.post("/leave-types", superiorController.createLeaveType);

// PUT /api/superior/leave-types/:id - Update leave type details
router.put("/leave-types/:id", superiorController.updateLeaveType);

// PUT /api/superior/leave-types/:id/deactivate - Soft deactivate a leave type
router.put("/leave-types/:id/deactivate", superiorController.deactivateLeaveType);

export default router;
