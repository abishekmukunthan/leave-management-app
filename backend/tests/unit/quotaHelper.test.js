import { describe, it, expect, vi } from "vitest";
import { calculateRequestedUnits, checkLeaveQuota } from "../../src/utils/quotaHelper.js";

describe("backend/src/utils/quotaHelper.js", () => {
  describe("calculateRequestedUnits", () => {
    it("should calculate hours correctly for Time Permission with string format", () => {
      expect(calculateRequestedUnits({ leave_type: "Time Permission", permission_hours: "2 hours" })).toBe(2);
      expect(calculateRequestedUnits({ leave_type: "Time Permission", permission_hours: "3 hours" })).toBe(3);
    });

    it("should calculate hours correctly for Time Permission with number format", () => {
      expect(calculateRequestedUnits({ leave_type: "Time Permission", permission_hours: 1 })).toBe(1);
      expect(calculateRequestedUnits({ leave_type: "Time Permission", permission_hours: 3 })).toBe(3);
    });

    it("should default to 1 hour for Time Permission if permission_hours is missing or invalid", () => {
      expect(calculateRequestedUnits({ leave_type: "Time Permission" })).toBe(1);
    });

    it("should calculate inclusive calendar days for standard full-day leave", () => {
      expect(
        calculateRequestedUnits({
          leave_type: "Annual Leave",
          start_date: "2026-10-15",
          end_date: "2026-10-17",
        })
      ).toBe(3);

      expect(
        calculateRequestedUnits({
          leave_type: "Casual Leave",
          start_date: "2026-10-15",
          end_date: "2026-10-15",
        })
      ).toBe(1);
    });

    it("should calculate half day units correctly for Half Day Leave", () => {
      expect(
        calculateRequestedUnits({
          leave_type: "Half Day Leave",
          start_date: "2026-10-15",
          end_date: "2026-10-15",
        })
      ).toBe(0.5);

      expect(
        calculateRequestedUnits({
          leave_type: "Half Day Leave",
          start_date: "2026-10-15",
          end_date: "2026-10-16",
        })
      ).toBe(1.0);
    });

    it("should fallback to 1 if start_date or end_date is missing or invalid", () => {
      expect(calculateRequestedUnits({ leave_type: "Annual Leave" })).toBe(1);
      expect(calculateRequestedUnits({ leave_type: "Annual Leave", start_date: "invalid-date", end_date: "2026-10-15" })).toBe(1);
    });
  });

  describe("checkLeaveQuota", () => {
    it("should return is_paycut_leave = false when remaining quota is sufficient", async () => {
      const mockQuery = vi.fn()
        // 1. leave_types query
        .mockResolvedValueOnce({
          rows: [
            {
              id: "lt-001",
              name: "Annual Leave",
              code: "ANNUAL",
              unit: "days",
              default_quota: "14.00",
              requires_substitute: true,
            },
          ],
        })
        // 2. employee_leave_entitlements query
        .mockResolvedValueOnce({
          rows: [
            {
              id: "ent-001",
              allocated: "14.00",
              used: "2.00",
              remaining: "12.00",
            },
          ],
        });

      const mockExecutor = { query: mockQuery };

      const result = await checkLeaveQuota(mockExecutor, {
        employee_id: "user-123",
        leave_type: "Annual Leave",
        start_date: "2026-10-15",
        end_date: "2026-10-16", // 2 requested units
      });

      expect(result.requested_units).toBe(2);
      expect(result.is_paycut_leave).toBe(false);
      expect(result.paycut_units).toBe(0);
      expect(result.quota_warning_message).toBeNull();
      expect(result.quotaDetails.remaining).toBe(12);
    });

    it("should return is_paycut_leave = true and calculate paycut_units when requested units exceed remaining quota", async () => {
      const mockQuery = vi.fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: "lt-001",
              name: "Annual Leave",
              code: "ANNUAL",
              unit: "days",
              default_quota: "14.00",
              requires_substitute: true,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "ent-001",
              allocated: "14.00",
              used: "13.00",
              remaining: "1.00", // Only 1 day remaining
            },
          ],
        });

      const mockExecutor = { query: mockQuery };

      const result = await checkLeaveQuota(mockExecutor, {
        employee_id: "user-123",
        leave_type: "Annual Leave",
        start_date: "2026-10-15",
        end_date: "2026-10-17", // 3 requested units
      });

      expect(result.requested_units).toBe(3);
      expect(result.is_paycut_leave).toBe(true);
      expect(result.paycut_units).toBe(2); // 3 requested - 1 remaining = 2 paycut units
      expect(result.quota_warning_message).toContain("leave balance is not enough");
      expect(result.quotaDetails.paycutUnits).toBe(2);
    });

    it("should handle zero remaining quota correctly", async () => {
      const mockQuery = vi.fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: "lt-002",
              name: "Sick Leave",
              code: "SICK",
              unit: "days",
              default_quota: "7.00",
              requires_substitute: false,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "ent-002",
              allocated: "7.00",
              used: "7.00",
              remaining: "0.00",
            },
          ],
        });

      const mockExecutor = { query: mockQuery };

      const result = await checkLeaveQuota(mockExecutor, {
        employee_id: "user-123",
        leave_type: "Sick Leave",
        start_date: "2026-10-15",
        end_date: "2026-10-16", // 2 requested units
      });

      expect(result.is_paycut_leave).toBe(true);
      expect(result.paycut_units).toBe(2);
    });
  });
});
