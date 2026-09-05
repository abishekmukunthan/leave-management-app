import { describe, it, expect } from "vitest";
import {
  calculateInclusiveDays,
  formatDateOnly,
  formatAppliedDate,
  formatDateTime,
  getLocalTodayString,
} from "../utils/dateUtils";

describe("frontend/src/utils/dateUtils.js", () => {
  describe("calculateInclusiveDays", () => {
    it("should calculate correct inclusive calendar days for valid date strings", () => {
      expect(calculateInclusiveDays("2026-09-01", "2026-09-05")).toBe(5);
      expect(calculateInclusiveDays("2026-09-01", "2026-09-01")).toBe(1);
    });

    it("should return 0.5 for Half Day Leave regardless of date range length", () => {
      expect(calculateInclusiveDays("2026-09-01", "2026-09-05", "Half Day Leave")).toBe(0.5);
    });

    it("should return null if end date is prior to start date", () => {
      expect(calculateInclusiveDays("2026-09-05", "2026-09-01")).toBeNull();
    });

    it("should return null if start or end date is malformed or invalid", () => {
      expect(calculateInclusiveDays("invalid-date", "2026-09-05")).toBeNull();
      expect(calculateInclusiveDays("", "2026-09-05")).toBeNull();
    });
  });

  describe("formatDateOnly", () => {
    it("should extract YYYY-MM-DD from ISO date strings", () => {
      expect(formatDateOnly("2026-09-01T14:30:00.000Z")).toBe("2026-09-01");
      expect(formatDateOnly("2026-09-01")).toBe("2026-09-01");
    });

    it("should format JavaScript Date instance into YYYY-MM-DD string", () => {
      const d = new Date(2026, 8, 1); // Month 8 is September (0-indexed)
      expect(formatDateOnly(d)).toBe("2026-09-01");
    });

    it("should return empty string for null, undefined, or empty input", () => {
      expect(formatDateOnly(null)).toBe("");
      expect(formatDateOnly(undefined)).toBe("");
    });
  });

  describe("formatAppliedDate & formatDateTime", () => {
    it("should return 'N/A' for null or empty values", () => {
      expect(formatAppliedDate(null)).toBe("N/A");
      expect(formatDateTime(null)).toBe("N/A");
    });

    it("should format valid timestamps into localized date/datetime strings", () => {
      const ts = "2026-09-01T10:00:00.000Z";
      expect(formatAppliedDate(ts)).not.toBe("N/A");
      expect(formatDateTime(ts)).not.toBe("N/A");
    });
  });

  describe("getLocalTodayString", () => {
    it("should return today's local date matching YYYY-MM-DD pattern", () => {
      const todayStr = getLocalTodayString();
      expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
