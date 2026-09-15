import { describe, it, expect, vi, beforeEach } from "vitest";
import pool from "../../src/config/db.js";
import { superiorDao } from "../../src/dao/superiorDao.js";
import request from "supertest";
import app from "../../src/app.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => {
  const mClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  return {
    default: {
      query: vi.fn(),
      connect: vi.fn(() => Promise.resolve(mClient)),
    },
  };
});

describe("Permanent Team Deletion API & DAO (/api/superior/teams/:id)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("API Endpoint Security & Validation (DELETE /api/superior/teams/:id)", () => {
    // 1. Active team cannot be deleted
    it("should block deleting an active team with 409 Conflict", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          if (params[0] === "sup-nadia") {
            return Promise.resolve({
              rows: [{ id: "sup-nadia", role: "superior_admin", is_active: true }],
            });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const err = new Error("Active teams cannot be deleted. Deactivate the team first.");
      err.statusCode = 409;
      vi.spyOn(superiorDao, "deleteTeam").mockRejectedValue(err);

      const res = await request(app)
        .delete("/api/superior/teams/team-active")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Active teams cannot be deleted. Deactivate the team first.");
      expect(superiorDao.deleteTeam).toHaveBeenCalledWith("team-active");
    });

    // 2. Inactive safe team can be deleted
    it("should allow Superior Admin to permanently delete an inactive team", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          if (params[0] === "sup-nadia") {
            return Promise.resolve({
              rows: [{ id: "sup-nadia", role: "superior_admin", is_active: true }],
            });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      vi.spyOn(superiorDao, "deleteTeam").mockResolvedValue({
        success: true,
        message: "Team deleted successfully.",
        team_id: "team-inactive",
        team_name: "Old Team",
        unassigned_members_count: 0,
      });

      const res = await request(app)
        .delete("/api/superior/teams/team-inactive")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Team deleted successfully.");
      expect(res.body.team_id).toBe("team-inactive");
      expect(superiorDao.deleteTeam).toHaveBeenCalledWith("team-inactive");
    });

    // 3. Non-Superior Admin cannot delete team
    it("should reject non-superior admin users with 403 Forbidden", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          if (params[0] === "emp-alex") {
            return Promise.resolve({
              rows: [{ id: "emp-alex", role: "employee", is_active: true }],
            });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const spy = vi.spyOn(superiorDao, "deleteTeam");

      const res = await request(app)
        .delete("/api/superior/teams/team-inactive")
        .send({ superior_admin_id: "emp-alex" });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Only authorized Superior Admins");
      expect(spy).not.toHaveBeenCalled();
    });

    // 4. Unknown team returns 404
    it("should return 404 if the team does not exist", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          if (params[0] === "sup-nadia") {
            return Promise.resolve({
              rows: [{ id: "sup-nadia", role: "superior_admin", is_active: true }],
            });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const err = new Error("Team not found.");
      err.statusCode = 404;
      vi.spyOn(superiorDao, "deleteTeam").mockRejectedValue(err);

      const res = await request(app)
        .delete("/api/superior/teams/team-non-existent")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Team not found.");
    });
  });

  describe("DAO Implementation Details & Safety Rules (superiorDao.deleteTeam)", () => {
    it("should unassign current members to team_id = NULL and team = 'Unassigned' without deleting users (Rule 9)", async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      // Mock sequence of queries inside transaction
      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes("SELECT id, name, team_admin_id")) {
          return Promise.resolve({
            rows: [{ id: "team-emr", name: "EMR Engineering", team_admin_id: "u-lead", is_active: false }],
          });
        }
        if (sql.includes("SELECT id FROM users WHERE team_id = $1")) {
          return Promise.resolve({
            rows: [{ id: "u-mem1" }, { id: "u-mem2" }],
          });
        }
        if (sql.includes("SELECT permission_id FROM team_approval_permissions")) {
          return Promise.resolve({
            rows: [{ permission_id: "EMR_PERM" }],
          });
        }
        if (sql.includes("SELECT COUNT(*)::INTEGER AS count FROM team_approval_permissions WHERE permission_id")) {
          return Promise.resolve({
            rows: [{ count: 0 }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await superiorDao.deleteTeam("team-emr");

      expect(result.success).toBe(true);
      expect(result.unassigned_members_count).toBe(2);

      // Verify transaction boundary
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");

      // Verify members were unassigned safely
      const updateUserQuery = mockClient.query.mock.calls.find(([sql]) =>
        sql.includes("UPDATE users SET team_id = NULL")
      );
      expect(updateUserQuery).toBeDefined();
      expect(updateUserQuery[1]).toEqual(["team-emr"]);

      const updateProfileQuery = mockClient.query.mock.calls.find(([sql]) =>
        sql.includes("UPDATE employee_profiles SET team = 'Unassigned'")
      );
      expect(updateProfileQuery).toBeDefined();
      expect(updateProfileQuery[1]).toEqual([["u-mem1", "u-mem2"]]);

      // Verify team was deleted
      const deleteTeamCall = mockClient.query.mock.calls.find(([sql]) =>
        sql.includes("DELETE FROM teams WHERE id = $1")
      );
      expect(deleteTeamCall).toBeDefined();
      expect(deleteTeamCall[1]).toEqual(["team-emr"]);

      // Verify leave_requests was NEVER touched or deleted
      const deleteLeavesCall = mockClient.query.mock.calls.find(([sql]) =>
        sql.toLowerCase().includes("delete from leave_requests")
      );
      expect(deleteLeavesCall).toBeUndefined();
    });

    it("should preserve user membership in another team when supervised team is deleted (Rule 5 & 6)", async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      // Priyadharshini leads EMR Engineering, but her team_id is Executive Team
      mockClient.query.mockImplementation((sql) => {
        if (sql.includes("SELECT id, name, team_admin_id")) {
          return Promise.resolve({
            rows: [{ id: "team-emr", name: "EMR Engineering", team_admin_id: "priya-id", is_active: false }],
          });
        }
        if (sql.includes("SELECT id FROM users WHERE team_id = $1")) {
          // Normal members do not include Priyadharshini because her team_id is Executive
          return Promise.resolve({ rows: [{ id: "gamshan-id" }] });
        }
        if (sql.includes("SELECT permission_id FROM team_approval_permissions")) {
          return Promise.resolve({ rows: [{ permission_id: "EMR_PERM" }] });
        }
        if (sql.includes("SELECT COUNT(*)::INTEGER AS count FROM team_approval_permissions WHERE permission_id")) {
          return Promise.resolve({ rows: [{ count: 0 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await superiorDao.deleteTeam("team-emr");
      expect(result.success).toBe(true);

      // Verify that users with team_id = Executive (such as Priyadharshini) were NOT modified
      const updateCalls = mockClient.query.mock.calls.filter(([sql]) =>
        sql.includes("UPDATE users SET team_id = NULL")
      );
      // Only users with team_id = 'team-emr' are updated
      expect(updateCalls.length).toBe(1);
      expect(updateCalls[0][1]).toEqual(["team-emr"]);
    });

    it("should preserve permissions and in-charge status for other supervised teams (Rule 7)", async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      mockClient.query.mockImplementation((sql) => {
        if (sql.includes("SELECT id, name, team_admin_id")) {
          return Promise.resolve({
            rows: [{ id: "team-emr", name: "EMR Engineering", team_admin_id: "priya-id", is_active: false }],
          });
        }
        if (sql.includes("SELECT id FROM users WHERE team_id = $1")) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes("SELECT permission_id FROM team_approval_permissions")) {
          return Promise.resolve({ rows: [{ permission_id: "EMR_PERM" }] });
        }
        // Pretend another team ALSO uses this permission
        if (sql.includes("SELECT COUNT(*)::INTEGER AS count FROM team_approval_permissions WHERE permission_id")) {
          return Promise.resolve({ rows: [{ count: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await superiorDao.deleteTeam("team-emr");
      expect(result.success).toBe(true);

      // Because count was 1 (another team uses it), user_permissions and permissions are NOT deleted!
      const deleteUserPermsCall = mockClient.query.mock.calls.find(([sql]) =>
        sql.includes("DELETE FROM user_permissions WHERE permission_id")
      );
      expect(deleteUserPermsCall).toBeUndefined();
    });

    it("should guarantee historical leave records are never deleted (Rule 8)", async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      mockClient.query.mockImplementation((sql) => {
        if (sql.includes("SELECT id, name, team_admin_id")) {
          return Promise.resolve({
            rows: [{ id: "team-eng", name: "Engineering", team_admin_id: "lead-1", is_active: false }],
          });
        }
        if (sql.includes("SELECT id FROM users WHERE team_id = $1")) {
          return Promise.resolve({ rows: [{ id: "u-1" }] });
        }
        if (sql.includes("SELECT permission_id FROM team_approval_permissions")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await superiorDao.deleteTeam("team-eng");

      const allExecutedSql = mockClient.query.mock.calls.map(([sql]) => sql.toLowerCase());
      for (const sql of allExecutedSql) {
        expect(sql).not.toContain("delete from leave_requests");
        expect(sql).not.toContain("delete from substitute_requests");
      }
    });

    it("should rollback transaction if any step fails", async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      mockClient.query.mockImplementation((sql) => {
        if (sql.includes("SELECT id, name, team_admin_id")) {
          return Promise.resolve({
            rows: [{ id: "team-fail", name: "Fail Team", team_admin_id: null, is_active: false }],
          });
        }
        if (sql.includes("SELECT id FROM users WHERE team_id = $1")) {
          throw new Error("Database unexpected disk error");
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(superiorDao.deleteTeam("team-fail")).rejects.toThrow("Database unexpected disk error");
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
