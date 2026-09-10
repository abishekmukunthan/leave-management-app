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

describe("Superior Admin Account Management Safety Rules", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/superior/users (Create Superior Admin)", () => {
    it("should allow active Superior Admin to create a new Superior Admin without team_id", async () => {
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

      vi.spyOn(superiorDao, "createUser").mockResolvedValue({
        user: {
          id: "sup-sarah",
          name: "Sarah Connor",
          email: "sarah.connor@company.com",
          username: "sarah.connor",
          role: "superior_admin",
          team_id: null,
          team_name: "Executive Management",
          designation: "Superior Admin",
          department: "Executive Management",
          is_active: true,
        },
        temporaryPassword: "Temp@123456",
      });

      const res = await request(app)
        .post("/api/superior/users")
        .send({
          superior_admin_id: "sup-nadia",
          name: "Sarah Connor",
          email: "sarah.connor@company.com",
          role: "superior_admin",
          team_id: "ignored-team-id", // should be set to null for superior_admin
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("User account created successfully");
      expect(res.body.user.role).toBe("superior_admin");
      expect(res.body.user.team_id).toBeNull();
      expect(superiorDao.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "superior_admin",
          team_id: null,
        })
      );
    });

    it("should block normal employee from creating a Superior Admin (403)", async () => {
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
        .post("/api/superior/users")
        .send({
          superior_admin_id: "emp-alex",
          name: "Hacker User",
          email: "hacker@company.com",
          role: "superior_admin",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Only authorized Superior Admins");
    });
  });

  describe("PUT /api/superior/users/:id/deactivate (Superior Admin Safety Guard)", () => {
    it("should block deactivating the only active Superior Admin (400)", async () => {
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

    it("should allow deactivating a Superior Admin when another active Superior Admin exists", async () => {
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
        id: "sup-sarah",
        name: "Sarah Connor",
        username: "sarah.connor",
        email: "sarah.connor@company.com",
        role: "superior_admin",
        team_id: null,
        is_active: false,
      });

      const res = await request(app)
        .put("/api/superior/users/sup-sarah/deactivate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User deactivated successfully.");
      expect(res.body.user.is_active).toBe(false);
      expect(superiorDao.deactivateUser).toHaveBeenCalledWith("sup-sarah");
    });
  });

  describe("PUT /api/superior/users/:id/activate (Reactivate Superior Admin)", () => {
    it("should allow reactivating an inactive Superior Admin", async () => {
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

      vi.spyOn(superiorDao, "activateUser").mockResolvedValue({
        id: "sup-sarah",
        name: "Sarah Connor",
        username: "sarah.connor",
        email: "sarah.connor@company.com",
        role: "superior_admin",
        team_id: null,
        is_active: true,
      });

      const res = await request(app)
        .put("/api/superior/users/sup-sarah/activate")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User activated successfully.");
      expect(res.body.user.is_active).toBe(true);
      expect(superiorDao.activateUser).toHaveBeenCalledWith("sup-sarah");
    });
  });

  describe("PUT /api/superior/users/:id (Edit User Details)", () => {
    it("should allow editing Superior Admin basic details without changing role", async () => {
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

      vi.spyOn(superiorDao, "editUser").mockResolvedValue({
        id: "sup-sarah",
        name: "Sarah Connor Updated",
        email: "sarah.updated@company.com",
        role: "superior_admin",
        team_id: null,
        designation: "Executive Director",
        department: "Executive Management",
        is_active: true,
      });

      const res = await request(app)
        .put("/api/superior/users/sup-sarah")
        .send({
          superior_admin_id: "sup-nadia",
          name: "Sarah Connor Updated",
          email: "sarah.updated@company.com",
          designation: "Executive Director",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User details updated successfully.");
      expect(res.body.user.name).toBe("Sarah Connor Updated");
      expect(res.body.user.role).toBe("superior_admin");
      expect(superiorDao.editUser).toHaveBeenCalledWith("sup-sarah", {
        name: "Sarah Connor Updated",
        email: "sarah.updated@company.com",
        designation: "Executive Director",
        department: undefined,
      });
    });
  });

  describe("DELETE /api/superior/users/:id (Delete Guard)", () => {
    it("should block permanent deletion of Superior Admin users (400)", async () => {
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

      const err = new Error(
        "Superior Admin users cannot be permanently deleted. Please deactivate the account instead."
      );
      err.statusCode = 400;
      vi.spyOn(superiorDao, "deleteUser").mockRejectedValue(err);

      const res = await request(app)
        .delete("/api/superior/users/sup-sarah")
        .send({ superior_admin_id: "sup-nadia" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Superior Admin users cannot be permanently deleted");
    });
  });
});
