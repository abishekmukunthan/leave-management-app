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

describe("Superior Team Activate & Deactivate APIs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("PUT /api/superior/teams/:id/activate", () => {
    it("should allow Superior Admin to activate an inactive team", async () => {
      // Mock superior auth check
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

      // Mock dao.activateTeam
      vi.spyOn(superiorDao, "activateTeam").mockResolvedValue({
        id: "team-sales",
        name: "Sales",
        is_active: true,
      });

      const res = await request(app)
        .put("/api/superior/teams/team-sales/activate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Team activated successfully.");
      expect(res.body.team.is_active).toBe(true);
      expect(superiorDao.activateTeam).toHaveBeenCalledWith("team-sales");
    });

    it("should block normal employee from activating a team (403)", async () => {
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

      const res = await request(app)
        .put("/api/superior/teams/team-sales/activate")
        .send({ superior_admin_id: "emp-alex" });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Only authorized Superior Admins");
    });

    it("should block team_admin from activating a team (403)", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          if (params[0] === "admin-priya") {
            return Promise.resolve({
              rows: [{ id: "admin-priya", role: "team_admin", is_active: true }],
            });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put("/api/superior/teams/team-sales/activate")
        .send({ superior_admin_id: "admin-priya" });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Only authorized Superior Admins");
    });

    it("should return 404 when activating a non-existent team", async () => {
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
      vi.spyOn(superiorDao, "activateTeam").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/teams/non-existent-team/activate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Team not found.");
    });

    it("should return 400 when activating an already active team", async () => {
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

      const err = new Error("Team is already active.");
      err.statusCode = 400;
      vi.spyOn(superiorDao, "activateTeam").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/teams/team-eng/activate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Team is already active.");
    });
  });

  describe("PUT /api/superior/teams/:id/deactivate", () => {
    it("should allow Superior Admin to deactivate an active team", async () => {
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

      vi.spyOn(superiorDao, "deactivateTeam").mockResolvedValue({
        id: "team-eng",
        name: "Engineering",
        is_active: false,
      });

      const res = await request(app)
        .put("/api/superior/teams/team-eng/deactivate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Team deactivated successfully.");
      expect(res.body.team.is_active).toBe(false);
      expect(superiorDao.deactivateTeam).toHaveBeenCalledWith("team-eng");
    });

    it("should block normal employee from deactivating a team (403)", async () => {
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

      const res = await request(app)
        .put("/api/superior/teams/team-eng/deactivate")
        .send({ superior_admin_id: "emp-alex" });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Only authorized Superior Admins");
    });

    it("should return 400 when deactivating an already inactive team", async () => {
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

      const err = new Error("Team is already inactive.");
      err.statusCode = 400;
      vi.spyOn(superiorDao, "deactivateTeam").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/teams/team-eng/deactivate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Team is already inactive.");
    });

    it("should return 404 when deactivating a non-existent team", async () => {
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
      vi.spyOn(superiorDao, "deactivateTeam").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/teams/non-existent-team/deactivate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Team not found.");
    });
  });
});
