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

describe("Superior User Activate & Deactivate APIs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("PUT /api/superior/users/:id/activate", () => {
    it("should allow Superior Admin to activate an inactive user", async () => {
      // 1. Mock superior auth check
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

      // 2. Mock dao.activateUser
      vi.spyOn(superiorDao, "activateUser").mockResolvedValue({
        id: "emp-alex",
        name: "Alex Morgan",
        username: "alex",
        email: "alex@example.com",
        role: "employee",
        team_id: "team-eng",
        is_active: true,
      });

      const res = await request(app)
        .put("/api/superior/users/emp-alex/activate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User activated successfully.");
      expect(res.body.user.is_active).toBe(true);
      expect(superiorDao.activateUser).toHaveBeenCalledWith("emp-alex");
    });

    it("should block normal employee from activating a user (403)", async () => {
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
        .put("/api/superior/users/emp-kasun/activate")
        .send({ superior_admin_id: "emp-alex" });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Only authorized Superior Admins");
    });

    it("should return 404 when activating a non-existent user", async () => {
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

      const err = new Error("User not found.");
      err.statusCode = 404;
      vi.spyOn(superiorDao, "activateUser").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/users/non-existent-user/activate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("User not found.");
    });

    it("should return 400 when activating an already active user", async () => {
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

      const err = new Error("User is already active.");
      err.statusCode = 400;
      vi.spyOn(superiorDao, "activateUser").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/users/emp-alex/activate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("User is already active.");
    });
  });

  describe("PUT /api/superior/users/:id/deactivate", () => {
    it("should allow Superior Admin to deactivate an active user", async () => {
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

      vi.spyOn(superiorDao, "deactivateUser").mockResolvedValue({
        id: "emp-alex",
        name: "Alex Morgan",
        username: "alex",
        email: "alex@example.com",
        role: "employee",
        team_id: "team-eng",
        is_active: false,
      });

      const res = await request(app)
        .put("/api/superior/users/emp-alex/deactivate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User deactivated successfully.");
      expect(res.body.user.is_active).toBe(false);
      expect(superiorDao.deactivateUser).toHaveBeenCalledWith("emp-alex");
    });

    it("should block Superior Admin from deactivating when only one active Superior Admin remains (400)", async () => {
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

      const err = new Error("At least one active Superior Admin must remain in the system.");
      err.statusCode = 400;
      vi.spyOn(superiorDao, "deactivateUser").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/users/sup-nadia/deactivate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("At least one active Superior Admin must remain in the system.");
    });

    it("should block normal employee from deactivating a user (403)", async () => {
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
        .put("/api/superior/users/emp-kasun/deactivate")
        .send({ superior_admin_id: "emp-alex" });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Only authorized Superior Admins");
    });

    it("should return 400 when deactivating an already inactive user", async () => {
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

      const err = new Error("User is already inactive.");
      err.statusCode = 400;
      vi.spyOn(superiorDao, "deactivateUser").mockRejectedValue(err);

      const res = await request(app)
        .put("/api/superior/users/emp-alex/deactivate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("User is already inactive.");
    });
  });
});
