import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { adminDao } from "../../src/dao/adminDao.js";
import { superiorDao } from "../../src/dao/superiorDao.js";
import pool from "../../src/config/db.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("Team Lead Leave Approval & Self-Approval Prevention", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Self-Approval Prevention (/api/admin/leave-requests/:id/approve)", () => {
    it("should return 403 if a Team Lead attempts to approve their own leave request", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-tl-101",
        employee_id: "lead-priya",
        employee_role: "team_admin",
        status: "Waiting for Admin Approval",
        employee_team_id: "team-eng-1",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-tl-101/approve")
        .send({ approved_by: "lead-priya" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "You cannot approve your own leave request. This leave must be approved by another authorized approver or Superior Admin."
      );
    });

    it("should return 403 if a Team Lead attempts to reject their own leave request", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-tl-101",
        employee_id: "lead-priya",
        employee_role: "team_admin",
        status: "Waiting for Admin Approval",
        employee_team_id: "team-eng-1",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-tl-101/reject")
        .send({ rejected_by: "lead-priya", admin_remarks: "Rejecting myself" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "You cannot approve your own leave request. This leave must be approved by another authorized approver or Superior Admin."
      );
    });

    it("should allow another Team Lead who has the required team approval permission to approve", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-tl-101",
        employee_id: "lead-priya",
        employee_role: "team_admin",
        status: "Waiting for Admin Approval",
        employee_team_id: "team-eng-1",
      });
      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: true,
        requiredPermission: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
      });
      vi.spyOn(adminDao, "approveLeaveRequest").mockResolvedValue({
        id: "leave-tl-101",
        status: "Approved",
        approved_by: "lead-other",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-tl-101/approve")
        .send({ approved_by: "lead-other" });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("approved");
      expect(res.body.data.status).toBe("Approved");
    });

    it("should allow a Superior Admin who has the required approval permission to approve", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-tl-101",
        employee_id: "lead-priya",
        employee_role: "team_admin",
        status: "Waiting for Admin Approval",
        employee_team_id: "team-eng-1",
      });
      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: true,
        requiredPermission: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
      });
      vi.spyOn(adminDao, "approveLeaveRequest").mockResolvedValue({
        id: "leave-tl-101",
        status: "Approved",
        approved_by: "superior-nadia",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-tl-101/approve")
        .send({ approved_by: "superior-nadia" });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("approved");
      expect(res.body.data.status).toBe("Approved");
    });

    it("should reject approval with 403 if the user does not possess the required approval permission", async () => {
      vi.spyOn(adminDao, "getLeaveRequestById").mockResolvedValue({
        id: "leave-tl-101",
        employee_id: "lead-priya",
        employee_role: "team_admin",
        status: "Waiting for Admin Approval",
        employee_team_id: "team-eng-1",
      });
      vi.spyOn(adminDao, "checkUserHasTeamApprovalPermission").mockResolvedValue({
        hasPermission: false,
        requiredPermission: "ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION",
      });

      const res = await request(app)
        .put("/api/admin/leave-requests/leave-tl-101/approve")
        .send({ approved_by: "lead-unauthorized" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You do not have permission to approve leave for this team.");
    });
  });

  describe("Admin Leave Requests Queue Filter", () => {
    it("should query database excluding admin's own employee_id when admin_id is provided", async () => {
      const mockQuery = vi
        .spyOn(pool, "query")
        .mockResolvedValueOnce({
          rows: [{ team_id: "team-eng" }],
        })
        .mockResolvedValueOnce({
          rows: [
            { id: "leave-emp-1", employee_id: "emp-alex", employee_name: "Alex Morgan" },
          ],
        });

      const result = await adminDao.getAllLeaveRequests("admin-lead-priya");

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const leaveQuerySql = mockQuery.mock.calls[1][0];
      const leaveQueryParams = mockQuery.mock.calls[1][1];

      expect(leaveQuerySql).toContain("lr.employee_id != $");
      expect(leaveQueryParams).toContain("admin-lead-priya");
      expect(result.rows).toHaveLength(1);
    });
  });

  describe("Superior Admin Team Lead Leave Requests Queue (/api/superior/team-lead-leave-requests)", () => {
    it("should return leave requests belonging to Team Leads", async () => {
      vi.spyOn(superiorDao, "getTeamLeadLeaveRequests").mockResolvedValue([
        {
          id: "leave-tl-101",
          employee_id: "lead-priya",
          employee_name: "Priya Fernando",
          employee_role: "team_admin",
          team_name: "Engineering",
          leave_type: "Annual Leave",
          status: "Waiting for Admin Approval",
        },
      ]);

      const res = await request(app)
        .get("/api/superior/team-lead-leave-requests?superior_admin_id=superior-nadia");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].employee_name).toBe("Priya Fernando");
      expect(res.body.data[0].employee_role).toBe("team_admin");
    });
  });
});
