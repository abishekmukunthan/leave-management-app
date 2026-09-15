import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import pool from "../../src/config/db.js";
import { leaveDao } from "../../src/dao/leaveDao.js";
import { substituteDao } from "../../src/dao/substituteDao.js";
import * as quotaHelper from "../../src/utils/quotaHelper.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

describe("Substitute Selection & Validation Rules", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("leaveDao.getSubstituteEmployees query construction and results", () => {
    it("should query for all active users regardless of role (employee, team_admin, superior_admin) and exclude applicant", async () => {
      const mockRows = [
        {
          id: "sup-1",
          name: "Nadia Perera",
          username: "nadia.p",
          email: "nadia@example.com",
          role: "superior_admin",
          team_name: "Executive Team",
          department: "Executive",
          designation: "Executive Director",
        },
        {
          id: "ta-1",
          name: "Priyadharshini T",
          username: "priya.t",
          email: "priya@example.com",
          role: "team_admin",
          team_name: "Executive Team",
          department: "Executive",
          designation: "Tech Lead",
        },
        {
          id: "emp-2",
          name: "Gamshan",
          username: "gamshan.k",
          email: "gamshan@example.com",
          role: "employee",
          team_name: "EMR Engineering",
          department: "Engineering",
          designation: "Software Engineer",
        },
      ];

      vi.spyOn(pool, "query").mockImplementation((query, params) => {
        // Verify that u.role != 'superior_admin' is NOT present in the SQL query
        expect(query).not.toContain("u.role != 'superior_admin'");
        expect(query).not.toContain("u.role !=");
        // Verify active filter and self-exclusion
        expect(query).toContain("u.is_active = true");
        expect(query).toContain("u.id != $1");
        expect(params[0]).toBe("applicant-user-id");
        return Promise.resolve({ rows: mockRows });
      });

      const results = await leaveDao.getSubstituteEmployees({
        employee_id: "applicant-user-id",
        search: "Perera",
      });

      expect(results).toHaveLength(3);
      expect(results.some((u) => u.role === "superior_admin")).toBe(true);
      expect(results.some((u) => u.role === "team_admin")).toBe(true);
      expect(results.some((u) => u.role === "employee")).toBe(true);
    });

    it("should include search filter for name, email, username, and role", async () => {
      vi.spyOn(pool, "query").mockImplementation((query, params) => {
        expect(query).toContain("u.role ILIKE $2");
        expect(params).toContain("%superior%");
        return Promise.resolve({ rows: [] });
      });

      await leaveDao.getSubstituteEmployees({
        employee_id: "emp-1",
        search: "superior",
      });
    });
  });

  describe("POST /api/leaves - Substitute Validation in Apply Leave", () => {
    it("CASE 1: Employee applies for leave and selects Superior Admin as substitute -> Allowed", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);
      vi.spyOn(quotaHelper, "checkLeaveQuota").mockResolvedValue({
        leave_type_id: "lt-001",
        requested_units: 1,
        is_paycut_leave: false,
        paycut_units: 0,
        quota_warning_message: null,
        quotaDetails: { remaining: 10 },
      });
      vi.spyOn(leaveDao, "getSubstituteUserById").mockResolvedValue({
        id: "sup-nadia",
        name: "Nadia Perera",
        role: "superior_admin",
        is_active: true,
      });
      vi.spyOn(leaveDao, "createLeaveWithSubstitute").mockResolvedValue({
        id: "leave-101",
        employee_id: "emp-gamshan",
        substitute_employee_id: "sup-nadia",
        leave_type: "Annual Leave",
        status: "Waiting for Substitute Approval",
      });

      const res = await request(app).post("/api/leaves").send({
        employee_id: "emp-gamshan",
        leave_type: "Annual Leave",
        start_date: "2026-10-15",
        end_date: "2026-10-15",
        reason: "Personal matter",
        substitute_employee_id: "sup-nadia",
        assigned_work: "Review production pull requests",
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain("waiting for substitute approval");
      expect(res.body.data.substitute_employee_id).toBe("sup-nadia");
    });

    it("CASE 2: Team In-charge applies for leave and selects Superior Admin as substitute -> Allowed", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);
      vi.spyOn(quotaHelper, "checkLeaveQuota").mockResolvedValue({
        leave_type_id: "lt-001",
        requested_units: 2,
        is_paycut_leave: false,
        paycut_units: 0,
        quota_warning_message: null,
        quotaDetails: { remaining: 8 },
      });
      vi.spyOn(leaveDao, "getSubstituteUserById").mockResolvedValue({
        id: "sup-nadia",
        name: "Nadia Perera",
        role: "superior_admin",
        is_active: true,
      });
      vi.spyOn(leaveDao, "createLeaveWithSubstitute").mockResolvedValue({
        id: "leave-102",
        employee_id: "ti-priya",
        substitute_employee_id: "sup-nadia",
        leave_type: "Casual Leave",
        status: "Waiting for Substitute Approval",
      });

      const res = await request(app).post("/api/leaves").send({
        employee_id: "ti-priya",
        leave_type: "Casual Leave",
        start_date: "2026-10-20",
        end_date: "2026-10-21",
        reason: "Family gathering",
        substitute_employee_id: "sup-nadia",
        assigned_work: "Attend daily standup and unblock devs",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.substitute_employee_id).toBe("sup-nadia");
    });

    it("CASE 3: Superior Admin applies for leave and selects another Superior Admin as substitute -> Allowed", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);
      vi.spyOn(quotaHelper, "checkLeaveQuota").mockResolvedValue({
        leave_type_id: "lt-001",
        requested_units: 1,
        is_paycut_leave: false,
        paycut_units: 0,
        quota_warning_message: null,
        quotaDetails: { remaining: 15 },
      });
      vi.spyOn(leaveDao, "getSubstituteUserById").mockResolvedValue({
        id: "sup-2",
        name: "Another Superior",
        role: "superior_admin",
        is_active: true,
      });
      vi.spyOn(leaveDao, "createLeaveWithSubstitute").mockResolvedValue({
        id: "leave-103",
        employee_id: "sup-1",
        substitute_employee_id: "sup-2",
        leave_type: "Annual Leave",
        status: "Waiting for Substitute Approval",
      });

      const res = await request(app).post("/api/leaves").send({
        employee_id: "sup-1",
        leave_type: "Annual Leave",
        start_date: "2026-11-01",
        end_date: "2026-11-01",
        reason: "Executive conference",
        substitute_employee_id: "sup-2",
        assigned_work: "Executive oversight of operations",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.substitute_employee_id).toBe("sup-2");
    });

    it("CASE 4: Applicant attempts to select themselves as substitute -> Rejection 400", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);
      vi.spyOn(quotaHelper, "checkLeaveQuota").mockResolvedValue({
        leave_type_id: "lt-001",
        requested_units: 1,
        is_paycut_leave: false,
      });

      const res = await request(app).post("/api/leaves").send({
        employee_id: "sup-nadia",
        leave_type: "Annual Leave",
        start_date: "2026-11-01",
        end_date: "2026-11-01",
        reason: "Vacation",
        substitute_employee_id: "sup-nadia", // Same person
        assigned_work: "Self handover",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("cannot be the same person");
    });

    it("CASE 5: Inactive substitute user -> Rejection 400", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);
      vi.spyOn(quotaHelper, "checkLeaveQuota").mockResolvedValue({
        leave_type_id: "lt-001",
        requested_units: 1,
        is_paycut_leave: false,
      });
      vi.spyOn(leaveDao, "getSubstituteUserById").mockResolvedValue({
        id: "inactive-user",
        name: "Inactive Admin",
        role: "superior_admin",
        is_active: false,
      });

      const res = await request(app).post("/api/leaves").send({
        employee_id: "emp-1",
        leave_type: "Annual Leave",
        start_date: "2026-11-01",
        end_date: "2026-11-01",
        reason: "Vacation",
        substitute_employee_id: "inactive-user",
        assigned_work: "Coverage",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("inactive");
    });

    it("Non-existent substitute user -> Rejection 400", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);
      vi.spyOn(quotaHelper, "checkLeaveQuota").mockResolvedValue({
        leave_type_id: "lt-001",
        requested_units: 1,
        is_paycut_leave: false,
      });
      vi.spyOn(leaveDao, "getSubstituteUserById").mockResolvedValue(null);

      const res = await request(app).post("/api/leaves").send({
        employee_id: "emp-1",
        leave_type: "Annual Leave",
        start_date: "2026-11-01",
        end_date: "2026-11-01",
        reason: "Vacation",
        substitute_employee_id: "unknown-uuid",
        assigned_work: "Coverage",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Substitute employee not found");
    });

    it("Time Permission submission with Superior Admin substitute works consistently", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);
      vi.spyOn(quotaHelper, "checkLeaveQuota").mockResolvedValue({
        leave_type_id: "lt-006",
        requested_units: 2,
        is_paycut_leave: false,
        paycut_units: 0,
        quota_warning_message: null,
        quotaDetails: { remaining: 6, unit: "hours" },
      });
      vi.spyOn(leaveDao, "getSubstituteUserById").mockResolvedValue({
        id: "sup-nadia",
        name: "Nadia Perera",
        role: "superior_admin",
        is_active: true,
      });
      vi.spyOn(leaveDao, "createLeaveWithSubstitute").mockResolvedValue({
        id: "leave-104",
        employee_id: "emp-1",
        substitute_employee_id: "sup-nadia",
        leave_type: "Time Permission",
        permission_date: "2026-10-15",
        permission_hours: "2 hours",
        status: "Waiting for Substitute Approval",
      });

      const res = await request(app).post("/api/leaves").send({
        employee_id: "emp-1",
        leave_type: "Time Permission",
        permission_date: "2026-10-15",
        permission_hours: "2 hours",
        reason: "Doctor appointment",
        substitute_employee_id: "sup-nadia",
        assigned_work: "Monitor critical alert channel for 2 hours",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.leave_type).toBe("Time Permission");
      expect(res.body.data.substitute_employee_id).toBe("sup-nadia");
    });
  });

  describe("Substitute Confirmation Workflow for Superior Admin", () => {
    it("should allow substitute duty confirmation regardless of substitute user role", async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, "connect").mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ command: "BEGIN" })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "sub-req-1",
              leave_request_id: "leave-1",
              substitute_employee_id: "sup-nadia",
              substitute_status: "Accepted",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "leave-1",
              status: "Waiting for Admin Approval",
            },
          ],
        })
        .mockResolvedValueOnce({ command: "COMMIT" });

      const result = await substituteDao.acceptSubstituteRequest("sub-req-1");

      expect(result).toBeDefined();
      expect(result.substitute_request.substitute_status).toBe("Accepted");
      expect(result.leave_request.status).toBe("Waiting for Admin Approval");
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
