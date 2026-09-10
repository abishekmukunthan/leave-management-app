import { describe, it, expect, vi, beforeEach } from "vitest";
import pool from "../../src/config/db.js";
import { reportDao } from "../../src/dao/reportDao.js";
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

describe("Superior Admin Leave Summary Report APIs", () => {
  const mockReportData = {
    metadata: {
      report_title: "Leave Summary Report",
      from_date: "2026-09-01",
      to_date: "2026-09-15",
      generated_at: "2026-09-09T10:00:00.000Z",
      generated_by: "Nadia Perera",
    },
    summary: {
      total_requests: 2,
      total_employees_took_leave: 2,
      total_leave_days: 3,
      total_time_permission_hours: 2,
      approved_requests: 2,
      pending_requests: 0,
      rejected_requests: 0,
      paycut_leave_count: 0,
    },
    details: [
      {
        id: "leave-1",
        employee_id: "emp-1",
        employee_name: "Alice Smith",
        department_name: "Engineering",
        team_name: "Engineering",
        leave_type: "Annual Leave",
        record_type: "Leave",
        start_date: "2026-09-02",
        end_date: "2026-09-04",
        leave_days: 3,
        permission_hours: 0,
        substitute_name: "Bob Lee",
        assigned_work: "Project review",
        status: "Approved",
        approved_by: "Priya Fernando",
        applied_date: "2026-09-01",
        remarks: "Family event",
        is_paycut_leave: false,
        paycut_units: 0,
      },
      {
        id: "leave-2",
        employee_id: "emp-2",
        employee_name: "Charlie Brown",
        department_name: "Support",
        team_name: "Support",
        leave_type: "Time Permission",
        record_type: "Time Permission",
        start_date: "2026-09-05",
        end_date: "—",
        leave_days: 0,
        permission_hours: 2,
        substitute_name: "Not assigned",
        assigned_work: "No assigned work",
        status: "Approved",
        approved_by: "Alex Morgan",
        applied_date: "2026-09-03",
        remarks: "Doctor visit",
        is_paycut_leave: false,
        paycut_units: 0,
      },
    ],
    employee_summary: [
      {
        employee_id: "emp-1",
        employee_name: "Alice Smith",
        department_name: "Engineering",
        total_requests: 1,
        total_leave_days: 3,
        total_permission_hours: 0,
        approved_count: 1,
        pending_count: 0,
        rejected_count: 0,
        paycut_count: 0,
      },
      {
        employee_id: "emp-2",
        employee_name: "Charlie Brown",
        department_name: "Support",
        total_requests: 1,
        total_leave_days: 0,
        total_permission_hours: 2,
        approved_count: 1,
        pending_count: 0,
        rejected_count: 0,
        paycut_count: 0,
      },
    ],
    team_summary: [
      {
        team_name: "Engineering",
        employees_count: 1,
        total_requests: 1,
        total_leave_days: 3,
        total_permission_hours: 0,
        most_used_leave_type: "Annual Leave",
      },
      {
        team_name: "Support",
        employees_count: 1,
        total_requests: 1,
        total_leave_days: 0,
        total_permission_hours: 2,
        most_used_leave_type: "Time Permission",
      },
    ],
    leave_type_breakdown: [
      { leave_type: "Annual Leave", count: 1, total_days: 3, total_hours: 0 },
      { leave_type: "Time Permission", count: 1, total_days: 0, total_hours: 2 },
    ],
    exceptions: {
      paycut_leaves: [],
      pending_leaves: [],
      rejected_leaves: [],
      high_usage_employees: [
        {
          employee_id: "emp-1",
          employee_name: "Alice Smith",
          department_name: "Engineering",
          total_requests: 1,
          total_leave_days: 3,
          total_permission_hours: 0,
          approved_count: 1,
        },
      ],
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/superior/reports/leave-summary", () => {
    it("should return leave summary report data for authorized Superior Admin", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          if (params[0] === "sup-nadia") {
            return Promise.resolve({
              rows: [{ id: "sup-nadia", name: "Nadia Perera", role: "superior_admin" }],
            });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      vi.spyOn(reportDao, "getLeaveSummaryReportData").mockResolvedValue(mockReportData);

      const res = await request(app)
        .get("/api/superior/reports/leave-summary")
        .query({
          from_date: "2026-09-01",
          to_date: "2026-09-15",
          superior_admin_id: "sup-nadia",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Leave summary report generated successfully.");
      expect(res.body.report.summary.total_requests).toBe(2);
      expect(res.body.report.summary.total_leave_days).toBe(3);
      expect(res.body.report.summary.total_time_permission_hours).toBe(2);
      expect(res.body.report.details).toHaveLength(2);
      expect(reportDao.getLeaveSummaryReportData).toHaveBeenCalledWith({
        fromDate: "2026-09-01",
        toDate: "2026-09-15",
        superiorAdminId: "sup-nadia",
      });
    });

    it("should reject with 403 when called by non-superior admin", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          if (params[0] === "emp-alex") {
            return Promise.resolve({
              rows: [{ id: "emp-alex", name: "Alex Morgan", role: "employee" }],
            });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get("/api/superior/reports/leave-summary")
        .query({
          from_date: "2026-09-01",
          to_date: "2026-09-15",
          superior_admin_id: "emp-alex",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Only authorized Superior Admins/i);
    });

    it("should return 400 when from_date is missing", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: "sup-nadia", name: "Nadia Perera", role: "superior_admin" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get("/api/superior/reports/leave-summary")
        .query({
          to_date: "2026-09-15",
          superior_admin_id: "sup-nadia",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("From Date is required.");
    });

    it("should return 400 when from_date is after to_date", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: "sup-nadia", name: "Nadia Perera", role: "superior_admin" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get("/api/superior/reports/leave-summary")
        .query({
          from_date: "2026-09-20",
          to_date: "2026-09-10",
          superior_admin_id: "sup-nadia",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("From Date cannot be after To Date.");
    });
  });

  describe("GET /api/superior/reports/leave-summary/export/excel", () => {
    it("should export multi-sheet Excel file with proper headers and content", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: "sup-nadia", name: "Nadia Perera", role: "superior_admin" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.spyOn(reportDao, "getLeaveSummaryReportData").mockResolvedValue(mockReportData);

      const res = await request(app)
        .get("/api/superior/reports/leave-summary/export/excel")
        .query({
          from_date: "2026-09-01",
          to_date: "2026-09-15",
          superior_admin_id: "sup-nadia",
        });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(res.headers["content-disposition"]).toContain(
        'filename="leave-summary-report-2026-09-01-to-2026-09-15.xlsx"'
      );
      expect(res.body).toBeDefined();
    });

    it("should block non-superior admin from downloading Excel report", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: "emp-alex", name: "Alex Morgan", role: "employee" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get("/api/superior/reports/leave-summary/export/excel")
        .query({
          from_date: "2026-09-01",
          to_date: "2026-09-15",
          superior_admin_id: "emp-alex",
        });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/superior/reports/leave-summary/export/pdf", () => {
    it("should export printable PDF file with proper headers and content", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: "sup-nadia", name: "Nadia Perera", role: "superior_admin" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.spyOn(reportDao, "getLeaveSummaryReportData").mockResolvedValue(mockReportData);

      const res = await request(app)
        .get("/api/superior/reports/leave-summary/export/pdf")
        .query({
          from_date: "2026-09-01",
          to_date: "2026-09-15",
          superior_admin_id: "sup-nadia",
        });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.headers["content-disposition"]).toContain(
        'filename="leave-summary-report-2026-09-01-to-2026-09-15.pdf"'
      );
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("should block non-superior admin from downloading PDF report", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("FROM users WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: "emp-alex", name: "Alex Morgan", role: "employee" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get("/api/superior/reports/leave-summary/export/pdf")
        .query({
          from_date: "2026-09-01",
          to_date: "2026-09-15",
          superior_admin_id: "emp-alex",
        });

      expect(res.status).toBe(403);
    });
  });
});
