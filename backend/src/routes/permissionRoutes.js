import { Router } from "express";
import { permissionController } from "../controllers/permissionController.js";

const router = Router();

// =========================================================================
// PERMISSIONS CRUD & HELPERS
// =========================================================================

// GET /api/superior/permissions - List all permissions
router.get("/", permissionController.getAllPermissions);

// POST /api/superior/permissions - Create a new permission
router.post("/", permissionController.createPermission);

// POST /api/superior/permissions/generate-team-permissions - Generate missing default team approval permissions
router.post("/generate-team-permissions", permissionController.generateTeamPermissions);

// PUT /api/superior/permissions/:id - Update permission description or status
router.put("/:id", permissionController.updatePermission);

// =========================================================================
// USER PERMISSION ASSIGNMENTS (Also directly routable via /api/superior/permissions/users/...)
// =========================================================================
router.get("/users/:id/permissions", permissionController.getUserPermissions);
router.put("/users/:id/permissions", permissionController.updateUserPermissions);

// =========================================================================
// TEAM APPROVAL PERMISSIONS MAPPING (Also directly routable via /api/superior/permissions/teams/...)
// =========================================================================
router.get("/teams/:id/approval-permission", permissionController.getTeamApprovalPermission);
router.put("/teams/:id/approval-permission", permissionController.updateTeamApprovalPermission);

export default router;
