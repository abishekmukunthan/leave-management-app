import { Router } from "express";
import { superiorController } from "../controllers/superiorController.js";
import { permissionController } from "../controllers/permissionController.js";
import { reportController } from "../controllers/reportController.js";
import permissionRoutes from "./permissionRoutes.js";

const router = Router();

// =========================================================================
// 1. DASHBOARD MONITORING & USER MANAGEMENT
// =========================================================================

// GET /api/superior/dashboard-summary - Superior admin monitoring overview
router.get("/dashboard-summary", superiorController.getDashboardSummary);

// GET /api/superior/team-lead-leave-requests - Leave requests submitted by Team Leads
router.get("/team-lead-leave-requests", superiorController.getTeamLeadLeaveRequests);

// GET /api/superior/users - Get all users with department & profile details
router.get("/users", superiorController.getUsers);

// POST /api/superior/users - Create new employee or team admin user account
router.post("/users", superiorController.createUser);

// PUT /api/superior/users/:id - Edit user basic details
router.put("/users/:id", superiorController.editUser);

// DELETE /api/superior/users/:id - Permanent deletion safety guard
router.delete("/users/:id", superiorController.deleteUser);

// PUT /api/superior/users/:id/reset-password - Reset password to a temporary password
router.put("/users/:id/reset-password", superiorController.resetPassword);

// PUT /api/superior/users/:id/deactivate - Deactivate a user account
router.put("/users/:id/deactivate", superiorController.deactivateUser);

// PUT /api/superior/users/:id/activate - Activate a user account
router.put("/users/:id/activate", superiorController.activateUser);

// PUT /api/superior/users/:id/promote-team-lead - Promote user to Team Lead of a team
router.put("/users/:id/promote-team-lead", superiorController.promoteTeamLead);

// PUT /api/superior/users/:id/demote-team-lead - Demote Team Lead to Employee
router.put("/users/:id/demote-team-lead", superiorController.demoteTeamLead);

// PUT /api/superior/users/:id/role - Update user role
router.put("/users/:id/role", superiorController.changeUserRole);

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

// GET /api/superior/unassigned-employees - Active unassigned employees for team creation
router.get("/unassigned-employees", superiorController.getUnassignedEmployees);

// GET /api/superior/team-member-candidates - Search candidates to add/move to a team
router.get("/team-member-candidates", superiorController.getTeamMemberCandidates);

// GET /api/superior/team-incharge-candidates - Search candidates for Team In-charge
router.get("/team-incharge-candidates", superiorController.getTeamInchargeCandidates);

// GET /api/superior/teams - Get all teams with team admin details
router.get("/teams", superiorController.getTeams);

// POST /api/superior/teams - Create a new team
router.post("/teams", superiorController.createTeam);

// GET /api/superior/teams/:id/members - Get all members of a team
router.get("/teams/:id/members", superiorController.getTeamMembers);

// PUT /api/superior/teams/:id/members/:userId - Add or move member to team
router.put("/teams/:id/members/:userId", superiorController.addOrMoveTeamMember);

// DELETE /api/superior/teams/:id/members/:userId - Remove member from team
router.delete("/teams/:id/members/:userId", superiorController.removeTeamMember);

// PUT /api/superior/teams/:id - Update team details and team admin assignment
router.put("/teams/:id", superiorController.updateTeam);

// PUT /api/superior/teams/:id/deactivate - Soft deactivate a team
router.put("/teams/:id/deactivate", superiorController.deactivateTeam);

// PUT /api/superior/teams/:id/activate - Activate a team
router.put("/teams/:id/activate", superiorController.activateTeam);

// PUT /api/superior/teams/:id/team-lead - Assign or change Team Lead for a team
router.put("/teams/:id/team-lead", superiorController.assignTeamLead);

// DELETE /api/superior/teams/:id/team-lead - Remove Team Lead from a team
router.delete("/teams/:id/team-lead", superiorController.removeTeamLead);

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

// =========================================================================
// 5. PERMISSION MANAGEMENT & USER / TEAM PERMISSION MAPPINGS
// =========================================================================

// GET & PUT /api/superior/users/:id/permissions
router.get("/users/:id/permissions", permissionController.getUserPermissions);
router.put("/users/:id/permissions", permissionController.updateUserPermissions);

// GET & PUT /api/superior/teams/:id/approval-permission
router.get("/teams/:id/approval-permission", permissionController.getTeamApprovalPermission);
router.put("/teams/:id/approval-permission", permissionController.updateTeamApprovalPermission);

// Sub-router for /api/superior/permissions
router.use("/permissions", permissionRoutes);

// =========================================================================
// 6. REPORTS & EXPORTS
// =========================================================================

// GET /api/superior/reports/leave-summary - Generate leave summary report JSON
router.get("/reports/leave-summary", reportController.getLeaveSummaryReport);

// GET /api/superior/reports/leave-summary/export/excel - Export leave summary report as Excel workbook (.xlsx)
router.get("/reports/leave-summary/export/excel", reportController.exportLeaveSummaryExcel);

// GET /api/superior/reports/leave-summary/export/pdf - Export leave summary report as printable PDF (.pdf)
router.get("/reports/leave-summary/export/pdf", reportController.exportLeaveSummaryPdf);

export default router;
