import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { authDao } from "../../src/dao/authDao.js";
import bcrypt from "bcryptjs";

// Mock DB pool to prevent real database queries
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("POST /api/auth/login and POST /api/auth/change-password", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("should return 400 if username or password is missing", async () => {
      const res = await request(app).post("/api/auth/login").send({ username: "alex.morgan" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Username and password are required");
    });

    it("should return 401 if user is not found", async () => {
      vi.spyOn(authDao, "findUserByUsername").mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "nonexistent.user", password: "Password@123" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid username or password");
    });

    it("should return 403 if user account is inactive", async () => {
      vi.spyOn(authDao, "findUserByUsername").mockResolvedValue({
        id: "user-inactive",
        username: "inactive.user",
        password: bcrypt.hashSync("Password@123", 10),
        is_active: false,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "inactive.user", password: "Password@123" });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("User account is inactive");
    });

    it("should return 401 if password is incorrect", async () => {
      vi.spyOn(authDao, "findUserByUsername").mockResolvedValue({
        id: "user-123",
        username: "alex.morgan",
        password: bcrypt.hashSync("CorrectPassword@123", 10),
        is_active: true,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "alex.morgan", password: "WrongPassword" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid username or password");
    });

    it("should return 200 with JWT token and safe user data on valid login", async () => {
      const hashedPassword = bcrypt.hashSync("Password@123", 10);
      vi.spyOn(authDao, "findUserByUsername").mockResolvedValue({
        id: "user-123",
        name: "Alex Morgan",
        username: "alex.morgan",
        email: "alex@company.com",
        password: hashedPassword,
        role: "employee",
        must_change_password: false,
        is_active: true,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "alex.morgan", password: "Password@123" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Login successful");
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined(); // Sensitive password field excluded
      expect(res.body.user.username).toBe("alex.morgan");
    });
  });

  describe("POST /api/auth/change-password", () => {
    it("should return 400 if user_id, current_password, or new_password is missing", async () => {
      const res = await request(app)
        .post("/api/auth/change-password")
        .send({ user_id: "user-123", current_password: "OldPassword" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("required");
    });

    it("should return 400 if current password is wrong", async () => {
      vi.spyOn(authDao, "findUserWithPasswordById").mockResolvedValue({
        id: "user-123",
        password: bcrypt.hashSync("ActualOldPassword@123", 10),
        is_active: true,
      });

      const res = await request(app).post("/api/auth/change-password").send({
        user_id: "user-123",
        current_password: "WrongOldPassword",
        new_password: "NewPassword@123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Current password is incorrect");
    });

    it("should return 400 if new password is less than 8 characters", async () => {
      vi.spyOn(authDao, "findUserWithPasswordById").mockResolvedValue({
        id: "user-123",
        password: bcrypt.hashSync("Temp@123456", 10),
        is_active: true,
      });

      const res = await request(app).post("/api/auth/change-password").send({
        user_id: "user-123",
        current_password: "Temp@123456",
        new_password: "short",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Password must be at least 8 characters");
    });

    it("should return 400 if new password is identical to current password", async () => {
      vi.spyOn(authDao, "findUserWithPasswordById").mockResolvedValue({
        id: "user-123",
        password: bcrypt.hashSync("SamePassword@123", 10),
        is_active: true,
      });

      const res = await request(app).post("/api/auth/change-password").send({
        user_id: "user-123",
        current_password: "SamePassword@123",
        new_password: "SamePassword@123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("New password cannot be the same as current password");
    });

    it("should return 200 and update password when current password is valid", async () => {
      vi.spyOn(authDao, "findUserWithPasswordById").mockResolvedValue({
        id: "user-123",
        password: bcrypt.hashSync("Temp@123456", 10),
        is_active: true,
      });
      vi.spyOn(authDao, "updatePassword").mockResolvedValue({
        id: "user-123",
        username: "alex.morgan",
        must_change_password: false,
      });

      const res = await request(app).post("/api/auth/change-password").send({
        user_id: "user-123",
        current_password: "Temp@123456",
        new_password: "NewSecurePassword@2026",
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password changed successfully");
      expect(authDao.updatePassword).toHaveBeenCalledTimes(1);
    });
  });
});
