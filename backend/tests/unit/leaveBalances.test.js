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

describe("Employee Leave Balances & Zero Consumption Rules", () => {
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

  it("CASE 1: New employee with no leave history starts with zero consumed leave and full quota remaining", async () => {
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

    const balances = await leaveDao.getEmployeeLeaveBalances("new-emp-123");

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

  it("CASE 2: Pending leave requests do NOT count as consumed leave", async () => {
    pool.query.mockImplementation((query) => {
      if (query.includes("FROM leave_types")) {
        return Promise.resolve({ rows: mockLeaveTypes });
      }
      if (query.includes("FROM employee_leave_entitlements")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("FROM leave_requests")) {
        // Query asks for status = 'Approved', so pending is not returned by the DB query
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const balances = await leaveDao.getEmployeeLeaveBalances("pending-emp-123");

    expect(balances.annual.used).toBe(0);
    expect(balances.annual.remaining).toBe(15);
  });

  it("CASE 3: Employee with approved 2-day Annual Leave shows 2 consumed and remaining reduced", async () => {
    pool.query.mockImplementation((query) => {
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

  it("CASE 4: Employee with rejected 2-day Annual Leave shows 0 consumed leave", async () => {
    pool.query.mockImplementation((query) => {
      if (query.includes("FROM leave_types")) {
        return Promise.resolve({ rows: mockLeaveTypes });
      }
      if (query.includes("FROM employee_leave_entitlements")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("FROM leave_requests")) {
        // Rejected requests are filtered out by DB query WHERE status = 'Approved'
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const balances = await leaveDao.getEmployeeLeaveBalances("rejected-emp-123");

    expect(balances.annual.used).toBe(0);
    expect(balances.annual.remaining).toBe(15);
  });

  it("CASE 5: Employee with approved 1.5-hour Time Permission in current month shows 1.5 hours used", async () => {
    pool.query.mockImplementation((query) => {
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
    pool.query.mockImplementation((query) => {
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

  it("CASE 7: Existing employee with real approved history preserves their exact usage", async () => {
    pool.query.mockImplementation((query) => {
      if (query.includes("FROM leave_types")) {
        return Promise.resolve({ rows: mockLeaveTypes });
      }
      if (query.includes("FROM employee_leave_entitlements")) {
        return Promise.resolve({
          rows: [
            { leave_type_id: "lt-annual", allocated: "20.00", used: "4.00", remaining: "16.00", year: currentYear },
          ],
        });
      }
      if (query.includes("FROM leave_requests")) {
        return Promise.resolve({
          rows: [
            {
              id: "req-ann-1",
              leave_type: "Annual Leave",
              leave_type_id: "lt-annual",
              start_date: `${currentYear}-02-01`,
              end_date: `${currentYear}-02-03`,
              requested_units: "3.00",
              status: "Approved",
            },
            {
              id: "req-ann-2",
              leave_type: "Annual Leave",
              leave_type_id: "lt-annual",
              start_date: `${currentYear}-05-10`,
              end_date: `${currentYear}-05-10`,
              requested_units: "1.00",
              status: "Approved",
            },
            {
              id: "req-sick-1",
              leave_type: "Sick Leave",
              leave_type_id: "lt-sick",
              start_date: `${currentYear}-03-12`,
              end_date: `${currentYear}-03-13`,
              requested_units: "2.00",
              status: "Approved",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const balances = await leaveDao.getEmployeeLeaveBalances("existing-emp-real");

    // Annual: custom allocated 20, used = 3 + 1 = 4, remaining = 16
    expect(balances.annual.quota).toBe(20);
    expect(balances.annual.used).toBe(4);
    expect(balances.annual.remaining).toBe(16);

    // Sick: default allocated 10, used = 2, remaining = 8
    expect(balances.sick.quota).toBe(10);
    expect(balances.sick.used).toBe(2);
    expect(balances.sick.remaining).toBe(8);

    // Casual: no usage
    expect(balances.casual.quota).toBe(6);
    expect(balances.casual.used).toBe(0);
    expect(balances.casual.remaining).toBe(6);
  });

  describe("API Endpoint: GET /api/leaves/balances", () => {
    it("should return 400 if employee_id query param is missing", async () => {
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
