import { describe, it, expect, vi, beforeEach } from "vitest";
import { leaveDao } from "../../src/dao/leaveDao.js";
import pool from "../../src/config/db.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("leaveDao.findOverlappingLeave SQL overlap detection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return existing leave record if overlapping active leave exists", async () => {
    const mockOverlappingRow = {
      id: "leave-overlap-1",
      employee_id: "user-123",
      leave_type: "Annual Leave",
      start_date: "2026-10-10",
      end_date: "2026-10-15",
      status: "Approved",
    };

    vi.spyOn(pool, "query").mockResolvedValue({
      rows: [mockOverlappingRow],
    });

    const result = await leaveDao.findOverlappingLeave("user-123", "2026-10-12", "2026-10-14");

    expect(result).not.toBeNull();
    expect(result.id).toBe("leave-overlap-1");
    expect(result.status).toBe("Approved");
    expect(pool.query).toHaveBeenCalledTimes(1);

    const queryArg = pool.query.mock.calls[0][0];
    // Verify query ignores rejected and cancelled statuses
    expect(queryArg).toContain("LOWER(status) NOT IN ('rejected', 'cancelled', 'canceled')");
  });

  it("should return null if no overlapping active leave exists", async () => {
    vi.spyOn(pool, "query").mockResolvedValue({
      rows: [],
    });

    const result = await leaveDao.findOverlappingLeave("user-123", "2026-11-01", "2026-11-05");

    expect(result).toBeNull();
  });
});
