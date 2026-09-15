import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import pool from "../../src/config/db.js";
import { superiorDao } from "../../src/dao/superiorDao.js";
import { adminDao } from "../../src/dao/adminDao.js";

vi.mock("../../src/config/db.js", () => {
  const query = vi.fn();
  const connect = vi.fn();
  return {
    default: {
      query,
      connect,
    },
  };
});

describe("Superior Admin Team Membership & Safety Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pool.query.mockReset();
    pool.connect.mockReset();
    // Default authorized caller
    pool.query.mockResolvedValue({
      rows: [{ id: "sup-caller", role: "superior_admin", is_active: true }],
    });
  });

  describe("GET /api/superior/team-member-candidates", () => {
    it("should include active superior_admin in team member candidates", async () => {
      vi.spyOn(superiorDao, "searchTeamMemberCandidates").mockResolvedValue({
        count: 2,
        data: [
          {
            id: "sup-nadia",
            name: "Nadia Perera",
            email: "nadia@company.com",
            role: "superior_admin",
            current_team_id: null,
            current_team_name: null,
            can_add: true,
            requires_move_confirmation: false,
          },
          {
            id: "sup-2",
            name: "Second Admin",
            email: "second.admin@company.com",
            role: "superior_admin",
            current_team_id: "team-hr",
            current_team_name: "HR Team",
            can_add: true,
            requires_move_confirmation: true,
          },
        ],
      });

      const res = await request(app)
        .get("/api/superior/team-member-candidates?team_id=team-exec")
        .send();

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.data[0].role).toBe("superior_admin");
      expect(res.body.data[0].name).toBe("Nadia Perera");
      expect(res.body.data[1].role).toBe("superior_admin");
      expect(res.body.data[1].requires_move_confirmation).toBe(true);
    });
  });

  describe("PUT /api/superior/teams/:id/members/:userId", () => {
    it("should add a Superior Admin to Executive Team while strictly preserving role = superior_admin", async () => {
      vi.spyOn(superiorDao, "addOrMoveTeamMember").mockResolvedValue({
        success: true,
        message: "Successfully added Nadia Perera to Executive Team.",
        user: {
          id: "sup-nadia",
          name: "Nadia Perera",
          email: "nadia@company.com",
          role: "superior_admin",
          team_id: "team-exec",
          team_name: "Executive Team",
        },
        team_id: "team-exec",
        team_name: "Executive Team",
        member_count: 3,
      });

      const res = await request(app)
        .put("/api/superior/teams/team-exec/members/sup-nadia")
        .send({ superior_admin_id: "sup-caller" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe("superior_admin");
      expect(res.body.user.team_id).toBe("team-exec");
      expect(res.body.team_name).toBe("Executive Team");
    });

    it("should allow moving a Superior Admin from HR Team to Executive Team with confirmation", async () => {
      vi.spyOn(superiorDao, "addOrMoveTeamMember").mockResolvedValue({
        success: true,
        message: "Successfully moved Nadia Perera to Executive Team.",
        user: {
          id: "sup-nadia",
          name: "Nadia Perera",
          email: "nadia@company.com",
          role: "superior_admin",
          team_id: "team-exec",
          team_name: "Executive Team",
        },
        team_id: "team-exec",
        team_name: "Executive Team",
        member_count: 4,
      });

      const res = await request(app)
        .put("/api/superior/teams/team-exec/members/sup-nadia")
        .send({ superior_admin_id: "sup-caller", confirm_move: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe("superior_admin");
      expect(res.body.user.team_id).toBe("team-exec");
    });
  });

  describe("PUT /api/superior/users/:id (edit user with team_id)", () => {
    it("should allow assigning or moving a Superior Admin to Executive Team via edit user", async () => {
      vi.spyOn(superiorDao, "editUser").mockResolvedValue({
        id: "sup-nadia",
        name: "Nadia Perera",
        email: "nadia@company.com",
        role: "superior_admin",
        team_id: "team-exec",
        team_name: "Executive Team",
        designation: "Superior Admin",
        department: "Executive Team",
        is_active: true,
      });

      const res = await request(app)
        .put("/api/superior/users/sup-nadia")
        .send({
          superior_admin_id: "sup-caller",
          team_id: "team-exec",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe("superior_admin");
      expect(res.body.user.team_id).toBe("team-exec");
      expect(res.body.user.team_name).toBe("Executive Team");
    });
  });

  describe("Leave Approval & Self-Approval Prevention for Superior Admin", () => {
    it("should block Superior Admin from self-approving their own leave request (403)", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-sup-1",
        employee_id: "sup-nadia",
        employee_team_id: "team-exec",
        status: "Waiting for Admin Approval",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-sup-1/approve")
        .send({ approved_by: "sup-nadia" });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/cannot approve your own leave/i);
    });

    it("should allow another Superior Admin to approve the leave request", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-sup-1",
        employee_id: "sup-nadia",
        employee_team_id: "team-exec",
        status: "Waiting for Admin Approval",
      });

      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: true,
        requiredPermission: "LEAVE_APPROVAL_EXEC",
        notConfigured: false,
      });

      vi.spyOn(adminDao, "approveLeaveRequest").mockResolvedValue({
        id: "leave-sup-1",
        status: "Approved",
        approved_by: "sup-second",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-sup-1/approve")
        .send({ approved_by: "sup-second" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Leave request approved successfully");
    });
  });
});
