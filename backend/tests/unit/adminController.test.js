import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { adminDao } from "../../src/dao/adminDao.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("Team Admin Controller (/api/admin)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("PUT /api/admin/leave-requests/:id/approve", () => {
    it("should return 404 if leave request does not exist", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue(null);

      const res = await request(app)
        .put("/api/admin/leave-requests/nonexistent-id/approve")
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Leave request not found");
    });

    it("should return 400 if leave request status is still Waiting for Substitute Approval", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-123",
        status: "Waiting for Substitute Approval",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-123/approve")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("waiting for substitute approval");
    });

    it("should return 403 if approving user lacks the required approval permission", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-123",
        status: "Waiting for Admin Approval",
        employee_team_id: "team-eng",
      });
      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: false,
        requiredPermission: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-123/approve")
        .send({ approved_by: "user-without-perm" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You do not have permission to approve leave for this team.");
      expect(res.body.requiredPermission).toBe("ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION");
    });

    it("should return 403 if team has no approval permission mapping configured", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-123",
        status: "Waiting for Admin Approval",
        employee_team_id: "team-unmapped",
      });
      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: false,
        requiredPermission: null,
        notConfigured: true,
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-123/approve")
        .send({ approved_by: "any-user" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Approval permission is not configured for this team.");
    });

    it("should approve leave request successfully and return 200 for user with required permission", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-123",
        status: "Waiting for Admin Approval",
        employee_team_id: "team-eng",
      });
      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: true,
        requiredPermission: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
      });
      vi.spyOn(adminDao, "approveLeaveRequest").mockResolvedValue({
        id: "leave-123",
        status: "Approved",
        approved_by: "admin-456",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-123/approve")
        .send({ approved_by: "admin-456" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Leave request approved successfully");
      expect(res.body.data.status).toBe("Approved");
    });
  });

  describe("PUT /api/admin/leave-requests/:id/reject", () => {
    it("should return 404 if leave request does not exist", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue(null);

      const res = await request(app)
        .put("/api/admin/leave-requests/nonexistent-id/reject")
        .send({ admin_remarks: "High workload" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Leave request not found");
    });

    it("should return 403 if rejecting user lacks the required approval permission", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-123",
        status: "Waiting for Admin Approval",
        employee_team_id: "team-eng",
      });
      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: false,
        requiredPermission: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-123/reject")
        .send({ rejected_by: "user-without-perm", admin_remarks: "High workload period" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You do not have permission to approve leave for this team.");
      expect(res.body.requiredPermission).toBe("ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION");
    });

    it("should return 403 if team has no approval permission mapping configured on reject", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-123",
        status: "Waiting for Admin Approval",
        employee_team_id: "team-unmapped",
      });
      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: false,
        requiredPermission: null,
        notConfigured: true,
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-123/reject")
        .send({ rejected_by: "any-user", admin_remarks: "High workload" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Approval permission is not configured for this team.");
    });

    it("should reject leave request and return 200 for user with required permission", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-123",
        status: "Waiting for Admin Approval",
        employee_team_id: "team-eng",
      });
      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: true,
        requiredPermission: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
      });
      vi.spyOn(adminDao, "rejectLeaveRequest").mockResolvedValue({
        id: "leave-123",
        status: "Rejected",
        admin_remarks: "High workload period",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-123/reject")
        .send({ rejected_by: "admin-456", admin_remarks: "High workload period" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Leave request rejected");
      expect(res.body.data.status).toBe("Rejected");
    });
  });
});
