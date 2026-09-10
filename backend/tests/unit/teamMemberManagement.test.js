import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { superiorDao } from "../../src/dao/superiorDao.js";
import pool from "../../src/config/db.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

describe("Superior Admin Team Member Management (/api/superior)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/superior/unassigned-employees", () => {
    it("should return active employees without any team assignment", async () => {
      vi.spyOn(superiorDao, "getUnassignedEmployees").mockResolvedValue([
        {
          id: "emp-1",
          name: "Michael Chen",
          username: "michael.chen",
          email: "michael.chen@company.com",
          role: "employee",
          team_id: null,
          team_name: null,
          designation: "Software Engineer",
          department: "Engineering",
          is_active: true,
        },
      ]);

      const res = await request(app).get("/api/superior/unassigned-employees?search=michael");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].name).toBe("Michael Chen");
      expect(res.body.data[0].team_id).toBeNull();
    });
  });

  describe("POST /api/superior/teams with initial members", () => {
    it("should successfully create team with initial unassigned members", async () => {
      vi.spyOn(pool, "query").mockResolvedValue({
        rows: [{ id: "sup-1", role: "superior_admin", is_active: true }],
      });
      vi.spyOn(superiorDao, "createTeam").mockResolvedValue({
        id: "team-fin",
        name: "Finance",
        team_admin_id: "lead-1",
        member_count: 2,
        total_members: 2,
        approval_permission_id: "FINANCE_TEAM_LEAVE_APPROVAL_PERMISSION",
      });

      const res = await request(app)
        .post("/api/superior/teams")
        .send({
          name: "Finance",
          team_admin_id: "lead-1",
          initial_member_ids: ["emp-1", "emp-2"],
          superior_admin_id: "sup-1",
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Team created successfully");
      expect(res.body.team.name).toBe("Finance");
      expect(res.body.team.member_count).toBe(2);
    });

    it("should reject creation if caller is not superior_admin", async () => {
      vi.spyOn(pool, "query").mockResolvedValue({
        rows: [{ id: "emp-not-admin", role: "employee", is_active: true }],
      });

      const res = await request(app)
        .post("/api/superior/teams")
        .send({
          name: "Finance",
          initial_member_ids: ["emp-1"],
          superior_admin_id: "emp-not-admin",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Only authorized Superior Admins");
    });

    it("should return 400 if initial member already belongs to another team", async () => {
      const error = new Error("One or more selected employees already belong to another team.");
      error.statusCode = 400;
      vi.spyOn(superiorDao, "createTeam").mockRejectedValue(error);

      const res = await request(app)
        .post("/api/superior/teams")
        .send({
          name: "Finance",
          initial_member_ids: ["emp-already-in-sales"],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("One or more selected employees already belong to another team.");
    });

    it("should return 400 if initial member is inactive", async () => {
      const error = new Error("Inactive users cannot be added to teams.");
      error.statusCode = 400;
      vi.spyOn(superiorDao, "createTeam").mockRejectedValue(error);

      const res = await request(app)
        .post("/api/superior/teams")
        .send({
          name: "Finance",
          initial_member_ids: ["emp-inactive"],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Inactive users cannot be added to teams.");
    });

    it("should return 400 if initial member is superior_admin", async () => {
      const error = new Error("Superior Admin users cannot be added as regular team members.");
      error.statusCode = 400;
      vi.spyOn(superiorDao, "createTeam").mockRejectedValue(error);

      const res = await request(app)
        .post("/api/superior/teams")
        .send({
          name: "Finance",
          initial_member_ids: ["sup-admin-id"],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Superior Admin users cannot be added as regular team members.");
    });
  });

  describe("GET /api/superior/teams/:id/members", () => {
    it("should return all current members of the team including team lead distinction", async () => {
      vi.spyOn(superiorDao, "getTeamMembers").mockResolvedValue({
        team: {
          id: "team-eng",
          name: "Engineering",
          team_admin_id: "lead-priya",
          team_admin_name: "Priya Fernando",
          approval_permission_id: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
        },
        count: 2,
        members: [
          {
            id: "lead-priya",
            name: "Priya Fernando",
            email: "priya.fernando@company.com",
            role: "team_admin",
            team_id: "team-eng",
            team_name: "Engineering",
            is_team_lead: true,
          },
          {
            id: "emp-alex",
            name: "Alex Morgan",
            email: "alex.morgan@company.com",
            role: "employee",
            team_id: "team-eng",
            team_name: "Engineering",
            is_team_lead: false,
          },
        ],
      });

      const res = await request(app).get("/api/superior/teams/team-eng/members");

      expect(res.status).toBe(200);
      expect(res.body.team.name).toBe("Engineering");
      expect(res.body.count).toBe(2);
      expect(res.body.members[0].is_team_lead).toBe(true);
      expect(res.body.members[1].is_team_lead).toBe(false);
    });
  });

  describe("GET /api/superior/team-member-candidates", () => {
    it("should return candidates with status flags and warnings", async () => {
      vi.spyOn(superiorDao, "searchTeamMemberCandidates").mockResolvedValue({
        count: 2,
        data: [
          {
            id: "emp-free",
            name: "David Lee",
            current_team_id: null,
            can_add: true,
            requires_move_confirmation: false,
          },
          {
            id: "emp-sales",
            name: "Sarah Johnson",
            current_team_id: "team-sales",
            current_team_name: "Sales",
            can_add: true,
            requires_move_confirmation: true,
            warning: "This employee currently belongs to Sales.",
          },
        ],
      });

      const res = await request(app).get(
        "/api/superior/team-member-candidates?team_id=team-eng&search=da"
      );

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.data[1].requires_move_confirmation).toBe(true);
    });
  });

  describe("PUT /api/superior/teams/:id/members/:userId", () => {
    it("should successfully add employee who has no current team directly", async () => {
      vi.spyOn(superiorDao, "addOrMoveTeamMember").mockResolvedValue({
        success: true,
        message: "Successfully added David Lee to Engineering.",
        team_id: "team-eng",
        member_count: 5,
      });

      const res = await request(app)
        .put("/api/superior/teams/team-eng/members/emp-free")
        .send({ confirm_move: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Successfully added");
    });

    it("should return 409 requiring confirmation when employee belongs to another team and confirm_move is false", async () => {
      const error = new Error("User already belongs to another team.");
      error.statusCode = 409;
      error.current_team_name = "Sales";
      error.requiresConfirmation = true;
      vi.spyOn(superiorDao, "addOrMoveTeamMember").mockRejectedValue(error);

      const res = await request(app)
        .put("/api/superior/teams/team-eng/members/emp-sales")
        .send({ confirm_move: false });

      expect(res.status).toBe(409);
      expect(res.body.requiresConfirmation).toBe(true);
      expect(res.body.current_team_name).toBe("Sales");
    });

    it("should successfully move employee from old team when confirm_move is true", async () => {
      vi.spyOn(superiorDao, "addOrMoveTeamMember").mockResolvedValue({
        success: true,
        message: "Successfully moved Sarah Johnson to Engineering.",
        team_id: "team-eng",
        member_count: 6,
      });

      const res = await request(app)
        .put("/api/superior/teams/team-eng/members/emp-sales")
        .send({ confirm_move: true });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Successfully moved");
      expect(res.body.member_count).toBe(6);
    });

    it("should reject adding user if already member of this team", async () => {
      const error = new Error("User is already a member of this team.");
      error.statusCode = 400;
      vi.spyOn(superiorDao, "addOrMoveTeamMember").mockRejectedValue(error);

      const res = await request(app)
        .put("/api/superior/teams/team-eng/members/emp-alex")
        .send({ confirm_move: false });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("User is already a member of this team.");
    });

    it("should reject adding user if user is superior_admin", async () => {
      const error = new Error("Superior Admin users cannot be added as regular team members.");
      error.statusCode = 400;
      vi.spyOn(superiorDao, "addOrMoveTeamMember").mockRejectedValue(error);

      const res = await request(app)
        .put("/api/superior/teams/team-eng/members/sup-nadia")
        .send({ confirm_move: false });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Superior Admin users cannot be added as regular team members.");
    });
  });

  describe("DELETE /api/superior/teams/:id/members/:userId", () => {
    it("should successfully remove regular member by setting team_id to null", async () => {
      vi.spyOn(superiorDao, "removeMemberFromTeam").mockResolvedValue({
        success: true,
        message: "Successfully removed Alex Morgan from Engineering.",
        team_id: "team-eng",
        member_count: 4,
      });

      const res = await request(app)
        .delete("/api/superior/teams/team-eng/members/emp-alex")
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Successfully removed");
    });

    it("should block removal if target user is current Team Lead", async () => {
      const error = new Error(
        "This user is the current Team Lead. Please remove or change the Team Lead before removing this user from the team."
      );
      error.statusCode = 400;
      vi.spyOn(superiorDao, "removeMemberFromTeam").mockRejectedValue(error);

      const res = await request(app)
        .delete("/api/superior/teams/team-eng/members/lead-priya")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "This user is the current Team Lead. Please remove or change the Team Lead before removing this user from the team."
      );
    });
  });
});
