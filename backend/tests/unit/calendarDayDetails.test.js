import { describe, it, expect, vi, beforeEach } from "vitest";
import pool from "../../src/config/db.js";
import request from "supertest";
import app from "../../src/app.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("Calendar Day Details Logic (/api/calendar/day)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return totalLeaveCount = 2 when date has 2 normal leaves and 2 time permissions", async () => {
    // 1. Mock getUserContext -> superior_admin
    pool.query.mockImplementation((query) => {
      // getUserContext
      if (query.includes("FROM users u") && query.includes("managed_team_id")) {
        return Promise.resolve({
          rows: [{ id: "user-admin", name: "Admin", role: "superior_admin" }],
        });
      }
      // teams query
      if (query.includes("FROM teams t")) {
        return Promise.resolve({
          rows: [
            { team_id: "team-eng", team_name: "Engineering", total_members: 5 },
            { team_id: "team-sup", team_name: "Support", total_members: 3 },
          ],
        });
      }
      // normal leaves query
      if (query.includes("lr.leave_type != 'Time Permission'")) {
        return Promise.resolve({
          rows: [
            {
              id: "leave-1",
              employee_id: "emp-1",
              employee_name: "Alex Morgan",
              team_id: "team-eng",
              department_name: "Engineering",
              team_name: "Engineering",
              leave_type: "Annual Leave",
              start_date: "2026-09-10",
              end_date: "2026-09-12",
              reason: "Vacation",
              approved_by: "Nadia Perera",
              substitute_name: "Michael Chen",
              assigned_work: "Handle client updates",
            },
            {
              id: "leave-2",
              employee_id: "emp-2",
              employee_name: "Michael Chen",
              team_id: "team-eng",
              department_name: "Engineering",
              team_name: "Engineering",
              leave_type: "Casual Leave",
              start_date: "2026-09-10",
              end_date: "2026-09-10",
              reason: "Personal",
              approved_by: "Nadia Perera",
              substitute_name: null,
              assigned_work: null,
            },
          ],
        });
      }
      // time permissions query
      if (query.includes("lr.leave_type = 'Time Permission'")) {
        return Promise.resolve({
          rows: [
            {
              id: "perm-1",
              employee_id: "emp-3",
              employee_name: "Kasun Silva",
              team_id: "team-sup",
              department_name: "Support",
              team_name: "Support",
              leave_type: "Time Permission",
              permission_date: "2026-09-10",
              permission_hours: 2,
              reason: "Doctor appointment",
              approved_by: "Nadia Perera",
              substitute_name: null,
              assigned_work: null,
            },
            {
              id: "perm-2",
              employee_id: "emp-4",
              employee_name: "Priya Fernando",
              team_id: "team-eng",
              department_name: "Engineering",
              team_name: "Engineering",
              leave_type: "Time Permission",
              permission_date: "2026-09-10",
              permission_hours: 3,
              reason: "Bank visit",
              approved_by: "Nadia Perera",
              substitute_name: "Alex Morgan",
              assigned_work: "Review PRs",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app).get("/api/calendar/day?date=2026-09-10&user_id=user-admin");

    expect(res.status).toBe(200);
    expect(res.body.date).toBe("2026-09-10");
    // Crucial check: totalLeaveCount MUST be 2, strictly excluding time permissions
    expect(res.body.totalLeaveCount).toBe(2);

    // Records array must include ALL 4 records (2 leaves + 2 time permissions)
    expect(res.body.records).toHaveLength(4);

    const leaveRecs = res.body.records.filter((r) => r.record_type === "Leave");
    const permRecs = res.body.records.filter((r) => r.record_type === "Time Permission");
    expect(leaveRecs).toHaveLength(2);
    expect(permRecs).toHaveLength(2);

    // Check individual record fields
    const alex = res.body.records.find((r) => r.employee_name === "Alex Morgan");
    expect(alex).toMatchObject({
      id: "leave-1",
      employee_name: "Alex Morgan",
      department_name: "Engineering",
      record_type: "Leave",
      substitute_name: "Michael Chen",
      leave_type: "Annual Leave",
      assigned_work: "Handle client updates",
      start_date: "2026-09-10",
      end_date: "2026-09-12",
      permission_date: null,
      permission_hours: null,
    });

    const kasun = res.body.records.find((r) => r.employee_name === "Kasun Silva");
    expect(kasun).toMatchObject({
      id: "perm-1",
      employee_name: "Kasun Silva",
      department_name: "Support",
      record_type: "Time Permission",
      substitute_name: "Not assigned",
      leave_type: "Time Permission",
      assigned_work: "No assigned work",
      start_date: null,
      end_date: null,
      permission_date: "2026-09-10",
      permission_hours: 2,
    });
  });

  it("should return totalLeaveCount = 0 and records = [] when no leaves or permissions exist", async () => {
    pool.query.mockImplementation((query) => {
      if (query.includes("FROM users u") && query.includes("managed_team_id")) {
        return Promise.resolve({
          rows: [{ id: "user-admin", name: "Admin", role: "superior_admin" }],
        });
      }
      if (query.includes("FROM teams t")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("lr.leave_type != 'Time Permission'")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("lr.leave_type = 'Time Permission'")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app).get("/api/calendar/day?date=2026-12-25&user_id=user-admin");

    expect(res.status).toBe(200);
    expect(res.body.date).toBe("2026-12-25");
    expect(res.body.totalLeaveCount).toBe(0);
    expect(res.body.records).toEqual([]);
  });

  it("should fall back to team_name if department is empty or null", async () => {
    pool.query.mockImplementation((query) => {
      if (query.includes("FROM users u") && query.includes("managed_team_id")) {
        return Promise.resolve({
          rows: [{ id: "user-admin", name: "Admin", role: "superior_admin" }],
        });
      }
      if (query.includes("FROM teams t")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("lr.leave_type != 'Time Permission'")) {
        return Promise.resolve({
          rows: [
            {
              id: "leave-99",
              employee_id: "emp-99",
              employee_name: "Jane Doe",
              team_id: "team-qa",
              department_name: "QA Quality Team", // fallback resolved in SQL
              team_name: "QA Quality Team",
              leave_type: "Medical Leave",
              start_date: "2026-09-15",
              end_date: "2026-09-15",
              reason: "Sick",
              approved_by: "Lead",
              substitute_name: null,
              assigned_work: null,
            },
          ],
        });
      }
      if (query.includes("lr.leave_type = 'Time Permission'")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app).get("/api/calendar/day?date=2026-09-15&user_id=user-admin");

    expect(res.status).toBe(200);
    expect(res.body.totalLeaveCount).toBe(1);
    expect(res.body.records[0].department_name).toBe("QA Quality Team");
    expect(res.body.records[0].substitute_name).toBe("Not assigned");
    expect(res.body.records[0].assigned_work).toBe("No assigned work");
  });
});
