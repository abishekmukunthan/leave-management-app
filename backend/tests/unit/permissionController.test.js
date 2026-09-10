import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  permissionDao,
  normalizeTeamName,
  generateTeamPermissionId,
  generateTeamPermissionDescription,
} from "../../src/dao/permissionDao.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("Permission ID and Description Generation Helpers", () => {
  it("should normalize team names accurately", () => {
    expect(normalizeTeamName("Engineering")).toBe("ENGINEERING");
    expect(normalizeTeamName("Sales & Support")).toBe("SALES_SUPPORT");
    expect(normalizeTeamName("  HR  ")).toBe("HR");
  });

  it("should generate team permission IDs according to specifications", () => {
    expect(generateTeamPermissionId("Engineering")).toBe("ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION");
    expect(generateTeamPermissionId("Engineering Team")).toBe("ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION");
    expect(generateTeamPermissionId("Sales")).toBe("SALES_TEAM_LEAVE_APPROVAL_PERMISSION");
    expect(generateTeamPermissionId("HR")).toBe("HR_TEAM_LEAVE_APPROVAL_PERMISSION");
    expect(generateTeamPermissionId("finance")).toBe("FINANCE_TEAM_LEAVE_APPROVAL_PERMISSION");
  });

  it("should generate friendly permission descriptions", () => {
    expect(generateTeamPermissionDescription("Engineering")).toBe("Permission for approving Engineering team leave");
    expect(generateTeamPermissionDescription("Sales")).toBe("Permission for approving Sales team leave");
  });
});

describe("Permission Controller (/api/superior/permissions)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/superior/permissions", () => {
    it("should return all permissions", async () => {
      vi.spyOn(permissionDao, "getAllPermissions").mockResolvedValue([
        {
          id: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
          description: "Permission for approving Engineering team leave",
          permission_type: "LEAVE_APPROVAL",
          is_active: true,
        },
      ]);

      const res = await request(app).get("/api/superior/permissions");
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].id).toBe("ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION");
    });
  });

  describe("POST /api/superior/permissions", () => {
    it("should reject invalid permission ID format (lowercase or spaces)", async () => {
      const res = await request(app)
        .post("/api/superior/permissions")
        .send({
          id: "invalid-permission-id",
          description: "Some description",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("must be uppercase");
    });

    it("should reject missing description", async () => {
      const res = await request(app)
        .post("/api/superior/permissions")
        .send({
          id: "VALID_PERMISSION_ID",
          description: "",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("description is required");
    });

    it("should successfully create permission with valid data", async () => {
      vi.spyOn(permissionDao, "createPermission").mockResolvedValue({
        id: "FINANCE_TEAM_LEAVE_APPROVAL_PERMISSION",
        description: "Permission for approving Finance team leave",
        permission_type: "LEAVE_APPROVAL",
        is_active: true,
      });

      const res = await request(app)
        .post("/api/superior/permissions")
        .send({
          id: "FINANCE_TEAM_LEAVE_APPROVAL_PERMISSION",
          description: "Permission for approving Finance team leave",
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Permission created successfully");
      expect(res.body.data.id).toBe("FINANCE_TEAM_LEAVE_APPROVAL_PERMISSION");
    });
  });

  describe("User Permissions", () => {
    it("GET /api/superior/users/:id/permissions should return user permissions array", async () => {
      vi.spyOn(permissionDao, "getUserPermissions").mockResolvedValue([
        "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
      ]);

      const res = await request(app).get("/api/superior/users/user-123/permissions");
      expect(res.status).toBe(200);
      expect(res.body.user_id).toBe("user-123");
      expect(res.body.permissions).toEqual(["ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION"]);
    });

    it("PUT /api/superior/users/:id/permissions should update user permissions", async () => {
      vi.spyOn(permissionDao, "setUserPermissions").mockResolvedValue([
        "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
        "SALES_TEAM_LEAVE_APPROVAL_PERMISSION",
      ]);

      const res = await request(app)
        .put("/api/superior/users/user-123/permissions")
        .send({
          permission_ids: [
            "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
            "SALES_TEAM_LEAVE_APPROVAL_PERMISSION",
          ],
          assigned_by: "superior-admin-id",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User permissions updated successfully");
      expect(res.body.permissions).toHaveLength(2);
    });
  });

  describe("Team Approval Permissions", () => {
    it("GET /api/superior/teams/:id/approval-permission should return team approval permission", async () => {
      vi.spyOn(permissionDao, "getTeamApprovalPermission").mockResolvedValue({
        team_id: "team-eng-id",
        team_name: "Engineering",
        permission_id: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
        description: "Permission for approving Engineering team leave",
      });

      const res = await request(app).get("/api/superior/teams/team-eng-id/approval-permission");
      expect(res.status).toBe(200);
      expect(res.body.permission_id).toBe("ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION");
    });

    it("PUT /api/superior/teams/:id/approval-permission should update mapping", async () => {
      vi.spyOn(permissionDao, "setTeamApprovalPermission").mockResolvedValue({
        team_id: "team-eng-id",
        team_name: "Engineering",
        permission_id: "NEW_ENGINEERING_PERMISSION",
        description: "Updated permission",
      });

      const res = await request(app)
        .put("/api/superior/teams/team-eng-id/approval-permission")
        .send({
          permission_id: "NEW_ENGINEERING_PERMISSION",
          created_by: "superior-admin-id",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Team approval permission updated successfully");
      expect(res.body.data.permission_id).toBe("NEW_ENGINEERING_PERMISSION");
    });
  });
});
