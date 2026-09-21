import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import pool from "../../src/config/db.js";
import { leaveDao } from "../../src/dao/leaveDao.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("Employee Leave Balances & Zero Consumption Rules (All Employees)", () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthStr = String(currentMonth).padStart(2, "0");
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const prevMonthStr = String(prevMonth).padStart(2, "0");

  const mockLeaveTypes = [
    { id: "lt-annual", name: "Annual Leave", code: "ANNUAL", unit: "days", default_quota: "15.00" },
    { id: "lt-sick", name: "Sick Leave", code: "SICK", unit: "days", default_quota: "10.00" },
    { id: "lt-casual", name: "Casual Leave", code: "CASUAL", unit: "days", default_quota: "6.00" },
    { id: "lt-time", name: "Time Permission", code: "TIME_PERMISSION", unit: "hours", default_quota: "6.00" },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("CASE 1: Existing employee (e.g. Abishek Mukunthan) with no leave history starts with zero consumed leave and full quota", async () => {
    pool.query.mockImplementation((query) => {
      if (query.includes("FROM leave_types")) {
        return Promise.resolve({ rows: mockLeaveTypes });
      }
      if (query.includes("FROM employee_leave_entitlements")) {
        return Promise.resolve({ rows: [] }); // No custom entitlements, uses default_quota
      }
      if (query.includes("FROM leave_requests")) {
        return Promise.resolve({ rows: [] }); // No approved requests
      }
      return Promise.resolve({ rows: [] });
    });

    const balances = await leaveDao.getEmployeeLeaveBalances("existing-emp-abishek");

    expect(balances.annual.used).toBe(0);
    expect(balances.annual.quota).toBe(15);
    expect(balances.annual.remaining).toBe(15);

    expect(balances.sick.used).toBe(0);
    expect(balances.sick.quota).toBe(10);
    expect(balances.sick.remaining).toBe(10);

    expect(balances.casual.used).toBe(0);
    expect(balances.casual.quota).toBe(6);
    expect(balances.casual.remaining).toBe(6);

    expect(balances.timePermission.used).toBe(0);
    expect(balances.timePermission.quota).toBe(6);
    expect(balances.timePermission.remaining).toBe(6);
  });

  it("CASE 2: Existing employee with pending leave only shows 0 consumed leave", async () => {
    pool.query.mockImplementation((query) => {
      if (query.includes("FROM leave_types")) {
        return Promise.resolve({ rows: mockLeaveTypes });
      }
      if (query.includes("FROM employee_leave_entitlements")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("FROM leave_requests")) {
        // Query filters status = 'Approved', so pending returns empty
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const balances = await leaveDao.getEmployeeLeaveBalances("existing-emp-pending");

    expect(balances.annual.used).toBe(0);
    expect(balances.annual.remaining).toBe(15);
    expect(balances.casual.used).toBe(0);
    expect(balances.sick.used).toBe(0);
    expect(balances.timePermission.used).toBe(0);
  });

  it("CASE 3: Existing employee with rejected leave only shows 0 consumed leave", async () => {
    pool.query.mockImplementation((query) => {
      if (query.includes("FROM leave_types")) {
        return Promise.resolve({ rows: mockLeaveTypes });
      }
      if (query.includes("FROM employee_leave_entitlements")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("FROM leave_requests")) {
        // Rejected requests are filtered out
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const balances = await leaveDao.getEmployeeLeaveBalances("existing-emp-rejected");

    expect(balances.annual.used).toBe(0);
    expect(balances.annual.remaining).toBe(15);
  });

  it("CASE 4: Existing employee with approved leave shows correct approved amount", async () => {
    pool.query.mockImplementation((query, params) => {
      if (query.includes("FROM leave_types")) {
        return Promise.resolve({ rows: mockLeaveTypes });
      }
      if (query.includes("FROM employee_leave_entitlements")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("FROM leave_requests")) {
        return Promise.resolve({
          rows: [
            {
              id: "req-001",
              employee_id: params[0],
              leave_type: "Annual Leave",
              leave_type_id: "lt-annual",
              start_date: `${currentYear}-06-10`,
              end_date: `${currentYear}-06-11`,
              requested_units: "2.00",
              status: "Approved",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const balances = await leaveDao.getEmployeeLeaveBalances("approved-emp-123");

    expect(balances.annual.used).toBe(2);
    expect(balances.annual.quota).toBe(15);
    expect(balances.annual.remaining).toBe(13);
  });

  it("CASE 5: Existing employee with approved 1.5-hour Time Permission in current month shows 1.5 hours used", async () => {
    pool.query.mockImplementation((query, params) => {
      if (query.includes("FROM leave_types")) {
        return Promise.resolve({ rows: mockLeaveTypes });
      }
      if (query.includes("FROM employee_leave_entitlements")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("FROM leave_requests")) {
        return Promise.resolve({
          rows: [
            {
              id: "tp-001",
              employee_id: params[0],
              leave_type: "Time Permission",
              leave_type_id: "lt-time",
              permission_date: `${currentYear}-${currentMonthStr}-15`,
              permission_from_time: "10:00:00",
              permission_to_time: "11:30:00",
              permission_hours: "1.5",
              requested_units: "1.50",
              status: "Approved",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const balances = await leaveDao.getEmployeeLeaveBalances("tp-emp-123");

    expect(balances.timePermission.used).toBe(1.5);
    expect(balances.timePermission.quota).toBe(6);
    expect(balances.timePermission.remaining).toBe(4.5);
  });

  it("CASE 6: Time Permission from previous month is excluded from current month's usage", async () => {
    pool.query.mockImplementation((query, params) => {
      if (query.includes("FROM leave_types")) {
        return Promise.resolve({ rows: mockLeaveTypes });
      }
      if (query.includes("FROM employee_leave_entitlements")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("FROM leave_requests")) {
        return Promise.resolve({
          rows: [
            {
              id: "tp-old",
              employee_id: params[0],
              leave_type: "Time Permission",
              leave_type_id: "lt-time",
              permission_date: `${prevYear}-${prevMonthStr}-10`,
              permission_from_time: "14:00:00",
              permission_to_time: "16:00:00",
              permission_hours: "2",
              requested_units: "2.00",
              status: "Approved",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const balances = await leaveDao.getEmployeeLeaveBalances("prev-month-emp");

    expect(balances.timePermission.used).toBe(0);
    expect(balances.timePermission.remaining).toBe(6);
  });

  it("CASE 7: One employee's approved leave does NOT affect another employee's balance", async () => {
    pool.query.mockImplementation((query, params) => {
      if (query.includes("FROM leave_types")) {
        return Promise.resolve({ rows: mockLeaveTypes });
      }
      if (query.includes("FROM employee_leave_entitlements")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("FROM leave_requests")) {
        const targetEmp = params[0];
        if (targetEmp === "emp-A") {
          return Promise.resolve({
            rows: [
              {
                id: "req-A",
                employee_id: "emp-A",
                leave_type: "Annual Leave",
                leave_type_id: "lt-annual",
                start_date: `${currentYear}-04-01`,
                end_date: `${currentYear}-04-03`,
                requested_units: "3.00",
                status: "Approved",
              },
            ],
          });
        } else if (targetEmp === "emp-B") {
          // Employee B has no leave
          return Promise.resolve({ rows: [] });
        }
      }
      return Promise.resolve({ rows: [] });
    });

    const balancesA = await leaveDao.getEmployeeLeaveBalances("emp-A");
    const balancesB = await leaveDao.getEmployeeLeaveBalances("emp-B");

    // Employee A has 3 used
    expect(balancesA.annual.used).toBe(3);
    expect(balancesA.annual.remaining).toBe(12);

    // Employee B remains at 0 used and full quota
    expect(balancesB.annual.used).toBe(0);
    expect(balancesB.annual.remaining).toBe(15);
  });

  describe("API Endpoint: GET /api/leaves/balances", () => {
    it("should return 400 if employee_id query param and authenticated user are missing", async () => {
      const res = await request(app).get("/api/leaves/balances");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("employee_id query parameter is required");
    });

    it("should return 200 with structured leave balances matching recommended shape", async () => {
      vi.spyOn(leaveDao, "getEmployeeLeaveBalances").mockResolvedValue({
        annual: { quota: 15, used: 0, remaining: 15, name: "Annual Leave", unit: "days" },
        sick: { quota: 10, used: 0, remaining: 10, name: "Sick Leave", unit: "days" },
        casual: { quota: 6, used: 0, remaining: 6, name: "Casual Leave", unit: "days" },
        timePermission: { quota: 6, used: 0, remaining: 6, name: "Time Permission", unit: "hours" },
        balancesList: [],
      });

      const res = await request(app).get("/api/leaves/balances?employee_id=user-uuid-123");

      expect(res.status).toBe(200);
      expect(res.body.annual).toEqual({ quota: 15, used: 0, remaining: 15, name: "Annual Leave", unit: "days" });
      expect(res.body.sick).toEqual({ quota: 10, used: 0, remaining: 10, name: "Sick Leave", unit: "days" });
      expect(res.body.casual).toEqual({ quota: 6, used: 0, remaining: 6, name: "Casual Leave", unit: "days" });
      expect(res.body.timePermission).toEqual({ quota: 6, used: 0, remaining: 6, name: "Time Permission", unit: "hours" });
    });
  });
});
