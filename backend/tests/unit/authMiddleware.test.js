import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import pool from "../../src/config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "leave_management_jwt_secret_2026";

describe("Backend Auth Middleware & Inactive User Security", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should block inactive user from logging in (403)", async () => {
    // Mock user lookup returning an inactive user
    const mockUser = {
      id: "u-inactive-1",
      username: "inactive.user",
      password: "$2a$10$dummyhash",
      role: "employee",
      is_active: false,
    };

    vi.spyOn(pool, "query").mockResolvedValueOnce({ rows: [mockUser] });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "inactive.user", password: "Password@123" });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("inactive");
  });

  it("should return 401 when accessing protected API with an invalid token", async () => {
    const res = await request(app)
      .get("/api/leaves/my-leaves?employee_id=test-id")
      .set("Authorization", "Bearer invalid-garbage-token-here");

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Invalid");
  });

  it("should return 401 when accessing protected API with an expired token", async () => {
    // Sign an already expired token
    const expiredToken = jwt.sign(
      { id: "u-active-1", username: "alex.morgan", role: "employee" },
      JWT_SECRET,
      { expiresIn: "-10s" } // Expired 10 seconds ago
    );

    const res = await request(app)
      .get("/api/leaves/my-leaves?employee_id=test-id")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Token expired");
    expect(res.body.expired).toBe(true);
  });

  it("should return 401 when an authenticated user has been deactivated in database", async () => {
    // Valid unexpired token
    const validToken = jwt.sign(
      { id: "u-deactivated-user", username: "deactivated.user", role: "employee" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Mock DB returning is_active = false
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [
        {
          id: "u-deactivated-user",
          username: "deactivated.user",
          role: "employee",
          is_active: false,
        },
      ],
    });

    const res = await request(app)
      .get("/api/leaves/my-leaves?employee_id=u-deactivated-user")
      .set("Authorization", `Bearer ${validToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("inactive");
    expect(res.body.inactive).toBe(true);
  });

  it("should return 401 when authentication is strictly enforced and token is missing", async () => {
    const res = await request(app)
      .get("/api/leaves/my-leaves?employee_id=test-id")
      .set("x-enforce-auth", "true");

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Authentication token is required");
  });

  it("should allow request through when valid token and active user are provided", async () => {
    const validToken = jwt.sign(
      { id: "u-active-user", username: "active.user", role: "employee" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Mock DB user lookup in middleware
    vi.spyOn(pool, "query").mockImplementation(async (sql) => {
      if (sql.includes("FROM users WHERE id = $1")) {
        return {
          rows: [
            {
              id: "u-active-user",
              username: "active.user",
              role: "employee",
              is_active: true,
            },
          ],
        };
      }
      // Return empty leaves
      return { rows: [] };
    });

    const res = await request(app)
      .get("/api/leaves/my-leaves?employee_id=u-active-user")
      .set("Authorization", `Bearer ${validToken}`);

    expect(res.status).toBe(200);
  });
});
