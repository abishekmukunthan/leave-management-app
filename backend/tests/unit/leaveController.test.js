import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { leaveDao } from "../../src/dao/leaveDao.js";
import * as quotaHelper from "../../src/utils/quotaHelper.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("POST /api/leaves - Apply Leave Controller", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 400 if leave_type is missing or invalid", async () => {
    const res = await request(app).post("/api/leaves").send({
      employee_id: "user-123",
      reason: "Sick day",
      // missing leave_type
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid leave_type");
  });

  it("should return 400 if employee already has an active overlapping leave request", async () => {
    vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue({
      id: "existing-req-001",
      leave_type: "Annual Leave",
      start_date: "2026-10-15",
      end_date: "2026-10-16",
      status: "Approved",
    });

    const res = await request(app).post("/api/leaves").send({
      employee_id: "user-123",
      leave_type: "Annual Leave",
      start_date: "2026-10-15",
      end_date: "2026-10-16",
      reason: "Vacation",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("already have an active leave request");
    expect(res.body.existingRequest).toBeDefined();
    expect(res.body.existingRequest.status).toBe("Approved");
  });

  it("should return 200 with requiresConfirmation = true if quota is exceeded and confirm_paycut is false", async () => {
    vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);
    vi.spyOn(quotaHelper, "checkLeaveQuota").mockResolvedValue({
      leave_type_id: "lt-001",
      requested_units: 3,
      is_paycut_leave: true,
      paycut_units: 2,
      quota_warning_message: "Your leave balance is not enough...",
      quotaDetails: {
        leaveType: "Annual Leave",
        allocated: 14,
        used: 13,
        remaining: 1,
        requested: 3,
        paycutUnits: 2,
        unit: "days",
      },
    });

    const res = await request(app).post("/api/leaves").send({
      employee_id: "user-123",
      leave_type: "Annual Leave",
      start_date: "2026-10-15",
      end_date: "2026-10-17",
      reason: "Vacation",
      confirm_paycut: false,
    });

    expect(res.status).toBe(200);
    expect(res.body.requiresConfirmation).toBe(true);
    expect(res.body.warning).toContain("leave balance is not enough");
    expect(res.body.quotaDetails.paycutUnits).toBe(2);
  });

  it("should create leave request when confirm_paycut is true or quota is sufficient", async () => {
    vi.spyOn(leaveDao, "findOverlappingLeave").mockResolvedValue(null);
    vi.spyOn(quotaHelper, "checkLeaveQuota").mockResolvedValue({
      leave_type_id: "lt-001",
      requested_units: 2,
      is_paycut_leave: false,
      paycut_units: 0,
      quota_warning_message: null,
      quotaDetails: { remaining: 10 },
    });
    vi.spyOn(leaveDao, "createLeaveWithSubstitute").mockResolvedValue({
      id: "leave-999",
      employee_id: "user-123",
      leave_type: "Annual Leave",
      status: "Waiting for Substitute Approval",
    });

    const res = await request(app).post("/api/leaves").send({
      employee_id: "user-123",
      leave_type: "Annual Leave",
      start_date: "2026-10-15",
      end_date: "2026-10-16",
      reason: "Family event",
      substitute_employee_id: "sub-456",
      assigned_work: "Handover tasks",
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain("submitted successfully");
    expect(res.body.data.id).toBe("leave-999");
  });
});
