import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { leaveDao } from "../../src/dao/leaveDao.js";
import * as quotaHelper from "../../src/utils/quotaHelper.js";
import {
  validateTimePermission,
  parseTimeToMinutes,
  formatTime12Hour,
  normalizeTo24Hour,
  formatDurationText,
} from "../../src/utils/timePermissionHelper.js";
import { excelReportService } from "../../src/services/excelReportService.js";
import { pdfReportService } from "../../src/services/pdfReportService.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("Time Permission Flow - Backend Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1-8: Core Business Rules Validation
  // -------------------------------------------------------------------------
  describe("timePermissionHelper - Core Business Rules", () => {
    it("1. 30-minute permission is accepted (minimum duration)", () => {
      const res = validateTimePermission("08:00", "08:30");
      expect(res.isValid).toBe(true);
      expect(res.durationMinutes).toBe(30);
      expect(res.hoursFloat).toBe(0.5);
      expect(res.permissionHours).toBe("0.5");
      expect(res.formattedDuration).toBe("30 minutes");
    });

    it("2. 2-hour permission is accepted (maximum duration)", () => {
      const res = validateTimePermission("08:00", "10:00");
      expect(res.isValid).toBe(true);
      expect(res.durationMinutes).toBe(120);
      expect(res.hoursFloat).toBe(2);
      expect(res.permissionHours).toBe("2");
      expect(res.formattedDuration).toBe("2 hours");
    });

    it("Accepts 1 hour 30 minutes permission (90 mins)", () => {
      const res = validateTimePermission("10:00 AM", "11:30 AM");
      expect(res.isValid).toBe(true);
      expect(res.durationMinutes).toBe(90);
      expect(res.hoursFloat).toBe(1.5);
      expect(res.permissionHours).toBe("1.5");
      expect(res.formattedDuration).toBe("1 hour 30 minutes");
      expect(res.fromTimeNormalized).toBe("10:00:00");
      expect(res.toTimeNormalized).toBe("11:30:00");
    });

    it("3. Less than 30 minutes is rejected", () => {
      const res = validateTimePermission("10:00 AM", "10:15 AM");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Time Permission must be at least 30 minutes.");
    });

    it("4. More than 2 hours is rejected", () => {
      const res = validateTimePermission("09:00", "11:30");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Time Permission cannot exceed 2 hours.");
    });

    it("5. Start time before 8:00 AM is rejected", () => {
      const res = validateTimePermission("07:30", "08:30");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Time Permission must be between 8:00 AM and 5:00 PM.");
    });

    it("6. End time after 5:00 PM is rejected", () => {
      const res = validateTimePermission("16:30", "17:30");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Time Permission must be between 8:00 AM and 5:00 PM.");
    });

    it("7. End time earlier than start time is rejected", () => {
      const res = validateTimePermission("14:00", "13:00");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("End time must be later than start time.");
    });

    it("8. Same From and To time is rejected", () => {
      const res = validateTimePermission("10:00", "10:00");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("End time must be later than start time.");
    });

    it("Missing From or To time is rejected", () => {
      expect(validateTimePermission("", "10:00").isValid).toBe(false);
      expect(validateTimePermission("10:00", "").isValid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 9-11: Backend Controller Independent Duration & Quota Handling
  // -------------------------------------------------------------------------
  describe("Leave Controller - Time Permission Application & Backend Duration Calculation", () => {
    it("10. Backend independently calculates duration from From/To times and ignores frontend-supplied hours", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);
      vi.spyOn(quotaHelper, "checkLeaveQuota").mockResolvedValue({
        leave_type_id: "lt-perm-001",
        requested_units: 1.5,
        is_paycut_leave: false,
        paycut_units: 0,
        quota_warning_message: null,
        quotaDetails: { remaining: 10 },
      });
      vi.spyOn(leaveDao, "createLeaveDirect").mockResolvedValue({
        id: "perm-req-001",
        leave_type: "Time Permission",
        permission_date: "2026-09-21",
        permission_from_time: "10:00:00",
        permission_to_time: "11:30:00",
        permission_hours: "1.5",
        status: "Waiting for Admin Approval",
      });

      const res = await request(app).post("/api/leaves").send({
        employee_id: "user-123",
        leave_type: "Time Permission",
        permission_date: "2026-09-21",
        permission_from_time: "10:00",
        permission_to_time: "11:30",
        // Deliberately wrong frontend duration to test independent backend calculation
        permission_hours: "99",
        reason: "Dentist appointment",
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain("Leave application submitted successfully");
      expect(res.body.data).toBeDefined();

      // Verify createLeaveDirect was called with backend-calculated duration 1.5, not 99
      expect(leaveDao.createLeaveDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          permission_from_time: "10:00:00",
          permission_to_time: "11:30:00",
          permission_hours: "1.5",
        })
      );
    });

    it("Rejects Time Permission if backend validation fails (outside working hours)", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);

      const res = await request(app).post("/api/leaves").send({
        employee_id: "user-123",
        leave_type: "Time Permission",
        permission_date: "2026-09-21",
        permission_from_time: "07:30",
        permission_to_time: "08:30",
        reason: "Early morning errand",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Time Permission must be between 8:00 AM and 5:00 PM.");
    });

    it("Rejects Time Permission if duration is less than 30 minutes", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);

      const res = await request(app).post("/api/leaves").send({
        employee_id: "user-123",
        leave_type: "Time Permission",
        permission_date: "2026-09-21",
        permission_from_time: "10:00",
        permission_to_time: "10:15",
        reason: "Quick errand",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Time Permission must be at least 30 minutes.");
    });

    it("Rejects Time Permission if duration exceeds 2 hours", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);

      const res = await request(app).post("/api/leaves").send({
        employee_id: "user-123",
        leave_type: "Time Permission",
        permission_date: "2026-09-21",
        permission_from_time: "10:00",
        permission_to_time: "12:30",
        reason: "Long meeting",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Time Permission cannot exceed 2 hours.");
    });

    it("11. Quota helper correctly parses decimal hours (0.5, 1.5, 2.0)", () => {
      expect(quotaHelper.calculateRequestedUnits({ leave_type: "Time Permission", permission_hours: "0.5" })).toBe(0.5);
      expect(quotaHelper.calculateRequestedUnits({ leave_type: "Time Permission", permission_hours: "1.5" })).toBe(1.5);
      expect(quotaHelper.calculateRequestedUnits({ leave_type: "Time Permission", permission_hours: "2.0" })).toBe(2);
      expect(quotaHelper.calculateRequestedUnits({ leave_type: "Time Permission", permission_hours: "1 hour" })).toBe(1);
    });

    it("17. Substitute workflow functions for Time Permission", async () => {
      vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);
      vi.spyOn(quotaHelper, "checkLeaveQuota").mockResolvedValue({
        leave_type_id: "lt-perm-001",
        requested_units: 1,
        is_paycut_leave: false,
        paycut_units: 0,
        quota_warning_message: null,
        quotaDetails: { remaining: 10 },
      });
      vi.spyOn(leaveDao, "getSubstituteUserById").mockResolvedValue({
        id: "sub-999",
        name: "Sub User",
        is_active: true,
        role: "superior_admin",
      });
      vi.spyOn(leaveDao, "createLeaveWithSubstitute").mockResolvedValue({
        id: "perm-sub-001",
        leave_type: "Time Permission",
        status: "Waiting for Substitute Approval",
        substitute_employee_id: "sub-999",
      });

      const res = await request(app).post("/api/leaves").send({
        employee_id: "user-123",
        leave_type: "Time Permission",
        permission_date: "2026-09-21",
        permission_from_time: "14:00",
        permission_to_time: "15:00",
        reason: "Doctor visit",
        substitute_employee_id: "sub-999",
        assigned_work: "Cover phone calls",
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain("Leave application submitted successfully");
      expect(res.body.data).toBeDefined();
      expect(leaveDao.createLeaveWithSubstitute).toHaveBeenCalledWith(
        expect.objectContaining({
          substitute_employee_id: "sub-999",
          permission_from_time: "14:00:00",
          permission_to_time: "15:00:00",
          permission_hours: "1",
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // 12, 16: Reports (Excel & PDF) Backward Compatibility & From/To Display
  // -------------------------------------------------------------------------
  describe("Reports Generation - Excel & PDF Time Range Display", () => {
    const mockReportData = {
      metadata: {
        report_title: "Leave Summary Report",
        from_date: "2026-09-01",
        to_date: "2026-09-30",
        generated_at: new Date().toISOString(),
        generated_by: "Superior Admin",
      },
      summary: {
        total_requests: 3,
        total_employees_took_leave: 2,
        total_leave_days: 5,
        total_time_permission_hours: 3.5,
        approved_requests: 2,
        pending_requests: 1,
        rejected_requests: 0,
        paycut_leave_count: 0,
      },
      details: [
        // 1. Normal Leave
        {
          id: "req-1",
          employee_id: "u-1",
          employee_name: "Alice Smith",
          department_name: "Engineering",
          leave_type: "Annual Leave",
          record_type: "Leave",
          start_date: "2026-09-10",
          end_date: "2026-09-12",
          leave_days: 3,
          permission_hours: 0,
          permission_from_time: null,
          permission_to_time: null,
          substitute_name: "Bob",
          assigned_work: "Sprint coverage",
          status: "Approved",
          approved_by: "Lead Admin",
          applied_date: "2026-09-01",
          remarks: "Vacation",
        },
        // 2. New Time Permission with From/To times
        {
          id: "req-2",
          employee_id: "u-2",
          employee_name: "Priyadharshini T",
          department_name: "EMR Engineering",
          leave_type: "Time Permission",
          record_type: "Time Permission",
          start_date: "2026-09-21",
          end_date: "—",
          leave_days: 0,
          permission_hours: 1.5,
          permission_from_time: "10:00:00",
          permission_to_time: "11:30:00",
          substitute_name: "Gamshan",
          assigned_work: "Standup lead",
          status: "Approved",
          approved_by: "Superior Admin",
          applied_date: "2026-09-20",
          remarks: "Personal",
        },
        // 3. 12. Historical Time Permission without From/To times (backward compatibility)
        {
          id: "req-3",
          employee_id: "u-3",
          employee_name: "Historical Employee",
          department_name: "Operations",
          leave_type: "Time Permission",
          record_type: "Time Permission",
          start_date: "2026-09-05",
          end_date: "—",
          leave_days: 0,
          permission_hours: 2,
          permission_from_time: null,
          permission_to_time: null,
          substitute_name: "None",
          assigned_work: "None",
          status: "Approved",
          approved_by: "Admin",
          applied_date: "2026-09-04",
          remarks: "Old record",
        },
      ],
      employee_summary: [
        {
          employee_id: "u-1",
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
      ],
      leave_type_breakdown: [
        { leave_type: "Annual Leave", count: 1, total_days: 3, total_hours: 0 },
        { leave_type: "Time Permission", count: 2, total_days: 0, total_hours: 3.5 },
      ],
      exceptions: {
        paycut_leaves: [],
        pending_leaves: [],
        rejected_leaves: [],
        high_usage_employees: [],
      },
    };

    it("16. Generates Excel workbook containing From Time and To Time columns", async () => {
      const workbook = await excelReportService.generateLeaveSummaryWorkbook(mockReportData);
      expect(workbook).toBeDefined();

      const detailsSheet = workbook.getWorksheet("Employee Leave Details");
      expect(detailsSheet).toBeDefined();

      // Check header row has From Time and To Time
      const headers = detailsSheet.getRow(1).values;
      expect(headers).toContain("From Time");
      expect(headers).toContain("To Time");
      expect(headers).toContain("Time Permission Hours");

      // Row 2 is Alice (Leave): From Time should be "—"
      const rowAlice = detailsSheet.getRow(2);
      expect(rowAlice.getCell(6).value).toBe("—"); // From Time
      expect(rowAlice.getCell(7).value).toBe("—"); // To Time

      // Row 3 is Priyadharshini (New Time Permission): From Time is "10:00 AM", To Time is "11:30 AM"
      const rowPriya = detailsSheet.getRow(3);
      expect(rowPriya.getCell(6).value).toBe("10:00 AM");
      expect(rowPriya.getCell(7).value).toBe("11:30 AM");
      expect(rowPriya.getCell(9).value).toBe("1.5 hrs");

      // Row 4 is Historical Employee: From Time is "Not recorded", To Time is "Not recorded"
      const rowHist = detailsSheet.getRow(4);
      expect(rowHist.getCell(6).value).toBe("Not recorded");
      expect(rowHist.getCell(7).value).toBe("Not recorded");
      expect(rowHist.getCell(9).value).toBe("2 hrs");
    });

    it("16. Generates PDF buffer without error and handles both new and historical records", async () => {
      const pdfBuffer = await pdfReportService.generateLeaveSummaryPdf(mockReportData);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(500);
    });
  });
});
