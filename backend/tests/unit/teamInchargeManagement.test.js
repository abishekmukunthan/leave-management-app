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

describe("Independent Team In-charge Architecture (/api/superior)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("PUT /api/superior/teams/:id/team-lead (Assign Team In-charge)", () => {
    it("should assign an employee as Team In-charge without modifying their role or home team_id (CASE 1)", async () => {
      vi.spyOn(superiorDao, "assignTeamLeadToTeam").mockResolvedValue({
        success: true,
        message: "Successfully assigned John Perera as Team In-charge of EMR Engineering",
        user_id: "user-john",
        role: "employee",
        team_id: "team-exec", // Home membership remains Executive Team!
        team_name: "EMR Engineering",
        permission_id: "EMR_ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
        previous_lead_id: null,
        team: {
          id: "team-emr",
          name: "EMR Engineering",
          team_admin_id: "user-john",
          team_admin_name: "John Perera",
          approval_permission_id: "EMR_ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
        },
      });

      const res = await request(app)
        .put("/api/superior/teams/team-emr/team-lead")
        .send({
          team_lead_user_id: "user-john",
          superior_admin_id: "sup-nadia",
          remove_previous_lead_permission: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.role).toBe("employee");
      expect(res.body.team_id).toBe("team-exec");
      expect(res.body.team.team_admin_id).toBe("user-john");
      expect(res.body.permission_id).toBe("EMR_ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION");
    });

    it("should allow assigning a user as Team In-charge of multiple teams simultaneously (CASE 2)", async () => {
      vi.spyOn(superiorDao, "assignTeamLeadToTeam").mockResolvedValue({
        success: true,
        message: "Successfully assigned John Perera as Team In-charge of Support Team",
        user_id: "user-john",
        role: "employee",
        team_id: "team-exec",
        team_name: "Support Team",
        permission_id: "SUPPORT_TEAM_LEAVE_APPROVAL_PERMISSION",
        previous_lead_id: null,
        team: {
          id: "team-support",
          name: "Support Team",
          team_admin_id: "user-john",
          team_admin_name: "John Perera",
          approval_permission_id: "SUPPORT_TEAM_LEAVE_APPROVAL_PERMISSION",
        },
      });

      const res = await request(app)
        .put("/api/superior/teams/team-support/team-lead")
        .send({
          team_lead_user_id: "user-john",
          superior_admin_id: "sup-nadia",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.team.team_admin_id).toBe("user-john");
    });

    it("should allow assigning superior_admin as Team In-charge while retaining superior_admin role and home team (CASE 3)", async () => {
      vi.spyOn(superiorDao, "assignTeamLeadToTeam").mockResolvedValue({
        success: true,
        message: "Successfully assigned Nadia Perera as Team In-charge of Management Team",
        user_id: "sup-nadia",
        role: "superior_admin",
        team_id: "team-exec",
        team_name: "Management Team",
        permission_id: "MANAGEMENT_TEAM_LEAVE_APPROVAL_PERMISSION",
        previous_lead_id: null,
        team: {
          id: "team-mgmt",
          name: "Management Team",
          team_admin_id: "sup-nadia",
          team_admin_name: "Nadia Perera",
          approval_permission_id: "MANAGEMENT_TEAM_LEAVE_APPROVAL_PERMISSION",
        },
      });

      const res = await request(app)
        .put("/api/superior/teams/team-mgmt/team-lead")
        .send({
          team_lead_user_id: "sup-nadia",
          superior_admin_id: "sup-nadia",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.role).toBe("superior_admin");
      expect(res.body.team_id).toBe("team-exec");
      expect(res.body.team.team_admin_id).toBe("sup-nadia");
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
  });

  describe("DELETE /api/superior/teams/:id/team-lead (Remove Team In-charge)", () => {
    it("should remove Team In-charge and revoke permission without removing user from their membership team", async () => {
      vi.spyOn(superiorDao, "removeTeamLeadFromTeam").mockResolvedValue({
        success: true,
        message: "Successfully removed Team In-charge from team EMR Engineering. Leave approval permission revoked.",
        team_id: "team-emr",
        team_name: "EMR Engineering",
        previous_lead_id: "user-john",
      });

      const res = await request(app)
        .delete("/api/superior/teams/team-emr/team-lead")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Successfully removed Team In-charge");
    });
  });

  describe("GET /api/superior/team-incharge-candidates", () => {
    it("should return all active candidates including employees, team_admins, and superior_admins", async () => {
      vi.spyOn(superiorDao, "searchTeamInchargeCandidates").mockResolvedValue({
        count: 3,
        data: [
          {
            id: "user-john",
            name: "John Perera",
            role: "employee",
            current_team_id: "team-exec",
            current_team_name: "Executive Team",
            incharge_teams: [{ id: "team-emr", name: "EMR Engineering" }],
            is_current_incharge: false,
            is_incharge_of_other_team: true,
          },
          {
            id: "sup-nadia",
            name: "Nadia Perera",
            role: "superior_admin",
            current_team_id: "team-exec",
            current_team_name: "Executive Team",
            incharge_teams: [],
            is_current_incharge: false,
            is_incharge_of_other_team: false,
          },
          {
            id: "lead-priya",
            name: "Priya Fernando",
            role: "team_admin",
            current_team_id: "team-eng",
            current_team_name: "Engineering",
            incharge_teams: [{ id: "team-eng", name: "Engineering" }],
            is_current_incharge: false,
            is_incharge_of_other_team: true,
          },
        ],
      });

      const res = await request(app).get("/api/superior/team-incharge-candidates?team_id=team-support&search=pe");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
      expect(res.body.data.some((u) => u.role === "superior_admin")).toBe(true);
      expect(res.body.data.some((u) => u.role === "employee")).toBe(true);
    });
  });

  describe("DAO Unit Level: superiorDao.assignTeamLeadToTeam DB operations", () => {
    it("does NOT mutate users.team_id when assigning in-charge", async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, "connect").mockResolvedValue(mockClient);

      // 1. SELECT user
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: "user-john",
              name: "John Perera",
              email: "john@company.com",
              role: "employee",
              team_id: "team-exec", // Home membership: Executive Team
              is_active: true,
            },
          ],
        })
        // 2. SELECT team
        .mockResolvedValueOnce({
          rows: [
            {
              id: "team-emr",
              name: "EMR Engineering",
              team_admin_id: null,
            },
          ],
        })
        // 3. _ensureTeamPermission: check permission exists
        .mockResolvedValueOnce({
          rows: [{ permission_id: "EMR_ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION" }],
        })
        // 4. UPDATE teams SET team_admin_id
        .mockResolvedValueOnce({ rows: [] })
        // 5. INSERT INTO user_permissions
        .mockResolvedValueOnce({ rows: [] })
        // 6. COMMIT
        .mockResolvedValueOnce({ rows: [] });

      // Fetch updated team via pool.query
      vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: [
          {
            id: "team-emr",
            name: "EMR Engineering",
            team_admin_id: "user-john",
            team_admin_name: "John Perera",
            approval_permission_id: "EMR_ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
          },
        ],
      });

      const result = await superiorDao.assignTeamLeadToTeam({
        teamId: "team-emr",
        userId: "user-john",
      });

      expect(result.success).toBe(true);
      expect(result.team_id).toBe("team-exec"); // Home team remained unchanged!
      expect(result.role).toBe("employee");

      // Verify that NO query updating users SET team_id was executed!
      const calls = mockClient.query.mock.calls.map((c) => c[0]);
      const userTeamUpdateCalls = calls.filter(
        (sql) => typeof sql === "string" && sql.includes("UPDATE users SET team_id")
      );
      expect(userTeamUpdateCalls.length).toBe(0);
    });
  });

  describe("Admin / In-Charge Leave Approvals (/api/admin/leave-requests)", () => {
    it("should allow employee with approval permission to fetch team leave requests across multiple teams", async () => {
      vi.spyOn(adminDao, "getAllLeaveRequests").mockResolvedValue({
        noPermissions: false,
        rows: [
          {
            id: "lr-1",
            employee_id: "emp-2",
            employee_name: "Team Member 2",
            team_name: "EMR Engineering",
            status: "Waiting for Admin Approval",
          },
          {
            id: "lr-2",
            employee_id: "emp-3",
            employee_name: "Team Member 3",
            team_name: "Support Team",
            status: "Waiting for Admin Approval",
          },
        ],
      });

      const res = await request(app).get("/api/admin/leave-requests?admin_id=user-john");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.data[0].team_name).toBe("EMR Engineering");
      expect(res.body.data[1].team_name).toBe("Support Team");
    });

    it("should block self-approval by in-charge even if they have approval permission", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "lr-john-leave",
        employee_id: "user-john",
        team_id: "team-exec",
        employee_team_id: "team-exec",
        status: "Waiting for Admin Approval",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/lr-john-leave/approve")
        .send({ admin_id: "user-john" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "You cannot approve your own leave request. This leave must be approved by another authorized approver or Superior Admin."
      );
    });
  });
});
