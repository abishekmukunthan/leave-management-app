import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { superiorDao } from "../../src/dao/superiorDao.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("Team Lead Management Controller (/api/superior)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("PUT /api/superior/users/:id/promote-team-lead", () => {
    it("should reject promotion if team_id is missing", async () => {
      const res = await request(app)
        .put("/api/superior/users/12/promote-team-lead")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/team_id is required/i);
    });

    it("should successfully promote an employee to team lead", async () => {
      vi.spyOn(superiorDao, "promoteUserToTeamLead").mockResolvedValue({
        success: true,
        message: "Successfully promoted Alex Morgan to Team Lead of Engineering",
        user_id: 12,
        new_role: "team_admin",
        team_id: 1,
        team_name: "Engineering",
        permission_id: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
        previous_lead_id: null,
      });

      const res = await request(app)
        .put("/api/superior/users/12/promote-team-lead")
        .send({ team_id: 1, remove_previous_lead_permission: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.new_role).toBe("team_admin");
      expect(res.body.permission_id).toBe("ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION");
    });

    it("should reject modification if target user is superior_admin", async () => {
      const err = new Error("Superior Admin role cannot be modified or demoted");
      err.statusCode = 400;
      vi.spyOn(superiorDao, "promoteUserToTeamLead").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/users/1/promote-team-lead")
        .send({ team_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Superior Admin/i);
    });
  });

  describe("PUT /api/superior/users/:id/demote-team-lead", () => {
    it("should demote a team lead back to employee", async () => {
      vi.spyOn(superiorDao, "demoteTeamLead").mockResolvedValue({
        success: true,
        message: "Successfully demoted Priya Fernando to Employee. Team lead assignment and approval permissions revoked. Historical leave records preserved.",
        user_id: 2,
        new_role: "employee",
        affected_teams: [{ id: 1, name: "Engineering" }],
      });

      const res = await request(app)
        .put("/api/superior/users/2/demote-team-lead")
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.new_role).toBe("employee");
    });
  });

  describe("PUT /api/superior/users/:id/role", () => {
    it("should reject if role is not supplied", async () => {
      const res = await request(app)
        .put("/api/superior/users/12/role")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Role is required/i);
    });

    it("should change user role to team_admin when team_id is provided", async () => {
      vi.spyOn(superiorDao, "changeUserRole").mockResolvedValue({
        success: true,
        message: "Successfully promoted Alex Morgan to Team Lead of Engineering",
        user_id: 12,
        new_role: "team_admin",
        team_id: 1,
        team_name: "Engineering",
        permission_id: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
      });

      const res = await request(app)
        .put("/api/superior/users/12/role")
        .send({ role: "team_admin", team_id: 1 });

      expect(res.status).toBe(200);
      expect(res.body.new_role).toBe("team_admin");
    });
  });

  describe("PUT /api/superior/teams/:id/team-lead", () => {
    it("should reject if user_id is missing", async () => {
      const res = await request(app)
        .put("/api/superior/teams/1/team-lead")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/User ID/i);
    });

    it("should assign team lead to team", async () => {
      vi.spyOn(superiorDao, "assignTeamLeadToTeam").mockResolvedValue({
        success: true,
        message: "Successfully promoted Alex Morgan to Team Lead of Engineering",
        user_id: 12,
        team: {
          id: 1,
          name: "Engineering",
          team_admin_id: 12,
          team_admin_name: "Alex Morgan",
          team_admin_email: "alex@example.com",
          approval_permission_id: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
        },
      });

      const res = await request(app)
        .put("/api/superior/teams/1/team-lead")
        .send({ user_id: 12 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.team.team_admin_id).toBe(12);
    });
  });

  describe("DELETE /api/superior/teams/:id/team-lead", () => {
    it("should remove team lead from team", async () => {
      vi.spyOn(superiorDao, "removeTeamLeadFromTeam").mockResolvedValue({
        success: true,
        message: "Successfully removed Team Lead from team Engineering. Leave approval permission revoked.",
        team_id: 1,
        team_name: "Engineering",
        previous_lead_id: 2,
        demoted_to_employee: true,
      });

      const res = await request(app)
        .delete("/api/superior/teams/1/team-lead");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.demoted_to_employee).toBe(true);
    });
  });
});
