import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { superiorDao } from "../../src/dao/superiorDao.js";
import { adminDao } from "../../src/dao/adminDao.js";
import pool from "../../src/config/db.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

describe("Employee as Team In-charge & Leave Approval Management", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("PUT /api/superior/teams/:id/team-lead (Assign Team In-charge)", () => {
    it("should assign an employee as Team In-charge without changing their role from employee", async () => {
      vi.spyOn(superiorDao, "assignTeamLeadToTeam").mockResolvedValue({
        success: true,
        message: "Successfully assigned Kasun Silva as Team In-charge of Support Team",
        user_id: "emp-kasun",
        role: "employee",
        team_id: "team-support",
        team_name: "Support Team",
        permission_id: "SUPPORT_TEAM_LEAVE_APPROVAL_PERMISSION",
        previous_lead_id: null,
        team: {
          id: "team-support",
          name: "Support Team",
          team_admin_id: "emp-kasun",
          team_admin_name: "Kasun Silva",
          approval_permission_id: "SUPPORT_TEAM_LEAVE_APPROVAL_PERMISSION",
        },
      });

      const res = await request(app)
        .put("/api/superior/teams/team-support/team-lead")
        .send({
          team_lead_user_id: "emp-kasun",
          superior_admin_id: "sup-nadia",
          remove_previous_lead_permission: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.role).toBe("employee");
      expect(res.body.team.team_admin_id).toBe("emp-kasun");
      expect(res.body.permission_id).toBe("SUPPORT_TEAM_LEAVE_APPROVAL_PERMISSION");
    });

    it("should reject assigning superior_admin as Team In-charge", async () => {
      const err = new Error("Superior Admin users cannot be assigned as Team In-charge.");
      err.statusCode = 400;
      vi.spyOn(superiorDao, "assignTeamLeadToTeam").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/teams/team-support/team-lead")
        .send({
          user_id: "sup-nadia",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Superior Admin users cannot be assigned as Team In-charge.");
    });

    it("should reject assigning inactive user as Team In-charge", async () => {
      const err = new Error("Inactive users cannot be assigned as Team In-charge.");
      err.statusCode = 400;
      vi.spyOn(superiorDao, "assignTeamLeadToTeam").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/teams/team-support/team-lead")
        .send({
          user_id: "user-inactive",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Inactive users cannot be assigned as Team In-charge.");
    });

    it("should reject assigning a user who already leads another team", async () => {
      const err = new Error("This user is already assigned as Team In-charge of another team. Please remove that assignment first.");
      err.statusCode = 400;
      vi.spyOn(superiorDao, "assignTeamLeadToTeam").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/teams/team-support/team-lead")
        .send({
          user_id: "lead-priya",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("This user is already assigned as Team In-charge of another team. Please remove that assignment first.");
    });
  });

  describe("DELETE /api/superior/teams/:id/team-lead (Remove Team In-charge)", () => {
    it("should remove Team In-charge and revoke permission while keeping role intact", async () => {
      vi.spyOn(superiorDao, "removeTeamLeadFromTeam").mockResolvedValue({
        success: true,
        message: "Successfully removed Team In-charge from team Support Team. Leave approval permission revoked.",
        team_id: "team-support",
        team_name: "Support Team",
        previous_lead_id: "emp-kasun",
      });

      const res = await request(app)
        .delete("/api/superior/teams/team-support/team-lead")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Successfully removed Team In-charge");
    });
  });

  describe("GET /api/superior/team-incharge-candidates", () => {
    it("should return candidates eligible for Team In-charge with other team status", async () => {
      vi.spyOn(superiorDao, "searchTeamInchargeCandidates").mockResolvedValue({
        count: 2,
        data: [
          {
            id: "emp-kasun",
            name: "Kasun Silva",
            role: "employee",
            current_team_id: "team-support",
            current_team_name: "Support Team",
            incharge_team_id: null,
            incharge_team_name: null,
            is_current_incharge: false,
            is_incharge_of_other_team: false,
          },
          {
            id: "lead-priya",
            name: "Priya Fernando",
            role: "team_admin",
            current_team_id: "team-eng",
            current_team_name: "Engineering",
            incharge_team_id: "team-eng",
            incharge_team_name: "Engineering",
            is_current_incharge: false,
            is_incharge_of_other_team: true,
          },
        ],
      });

      const res = await request(app).get("/api/superior/team-incharge-candidates?team_id=team-support&search=ka");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.data[0].name).toBe("Kasun Silva");
      expect(res.body.data[1].is_incharge_of_other_team).toBe(true);
    });
  });

  describe("PUT /api/superior/users/:id/demote-team-lead (Demotion protection for in-charge)", () => {
    it("should block demoting user if they are currently assigned as Team In-charge of a team", async () => {
      const err = new Error("This user is currently assigned as Team In-charge. Please remove or change the Team In-charge assignment before changing role.");
      err.statusCode = 400;
      vi.spyOn(superiorDao, "demoteTeamLead").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/users/lead-priya/demote-team-lead")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("This user is currently assigned as Team In-charge. Please remove or change the Team In-charge assignment before changing role.");
    });
  });

  describe("Admin / In-Charge Leave Approvals (/api/admin/leave-requests)", () => {
    it("should allow employee with approval permission to fetch team leave requests and exclude own requests", async () => {
      vi.spyOn(adminDao, "getAllLeaveRequests").mockResolvedValue({
        noPermissions: false,
        rows: [
          {
            id: "lr-1",
            employee_id: "emp-2",
            employee_name: "Team Member 2",
            team_name: "Support Team",
            status: "Waiting for Admin Approval",
          },
        ],
      });

      const res = await request(app).get("/api/admin/leave-requests?admin_id=emp-kasun");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].employee_id).toBe("emp-2");
    });

    it("should allow employee with team approval permission to approve a team member's leave", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "lr-1",
        employee_id: "emp-2",
        team_id: "team-support",
        employee_team_id: "team-support",
        status: "Waiting for Admin Approval",
      });
      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: true,
        requiredPermission: "SUPPORT_TEAM_LEAVE_APPROVAL_PERMISSION",
        notConfigured: false,
      });
      vi.spyOn(adminDao, "approveLeaveRequest").mockResolvedValue({
        id: "lr-1",
        status: "Approved",
        approved_by: "emp-kasun",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/lr-1/approve")
        .send({ admin_id: "emp-kasun" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Leave request approved successfully");
      expect(res.body.data.status).toBe("Approved");
    });

    it("should block self-approval by employee in-charge with exact required message", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "lr-kasun-leave",
        employee_id: "emp-kasun",
        team_id: "team-support",
        employee_team_id: "team-support",
        status: "Waiting for Admin Approval",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/lr-kasun-leave/approve")
        .send({ admin_id: "emp-kasun" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "You cannot approve your own leave request. This leave must be approved by another authorized approver or Superior Admin."
      );
    });

    it("should block approval if user lacks required team permission", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "lr-1",
        employee_id: "emp-2",
        team_id: "team-support",
        employee_team_id: "team-support",
        status: "Waiting for Admin Approval",
      });
      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: false,
        requiredPermission: "SUPPORT_TEAM_LEAVE_APPROVAL_PERMISSION",
        notConfigured: false,
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/lr-1/approve")
        .send({ admin_id: "emp-unauthorized" });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("do not have permission to approve leave for this team");
    });
  });
});
