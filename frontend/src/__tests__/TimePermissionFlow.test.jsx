import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  formatTimeRange,
  getToTimeOptions,
  calculateTimePermissionDuration,
} from "../utils/dateUtils";
import { ApplyLeavePage } from "../pages/ApplyLeavePage";
import { MyLeavesPage } from "../pages/MyLeavesPage";
import * as api from "../services/api";

// Mock LeaveContext
vi.mock("../context/useLeave", () => ({
  useLeave: () => ({
    loggedInUser: {
      id: "usr-emp-001",
      name: "Priyadharshini T",
      email: "priya@example.com",
      role: "employee",
      designation: "Software Engineer",
      team_name: "Executive",
    },
    showToast: vi.fn(),
  }),
}));

describe("Time Permission Flow - Frontend Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1-8: dateUtils Time Permission calculations & validations
  // -------------------------------------------------------------------------
  describe("dateUtils Time Permission helpers", () => {
    it("1. 30-minute duration is accepted", () => {
      const res = calculateTimePermissionDuration("08:00", "08:30");
      expect(res.isValid).toBe(true);
      expect(res.durationMinutes).toBe(30);
      expect(res.hoursFloat).toBe(0.5);
      expect(res.durationText).toBe("30 minutes");
      expect(res.shortDurationText).toBe("30 mins");
    });

    it("2. 2-hour duration is accepted", () => {
      const res = calculateTimePermissionDuration("08:00", "10:00");
      expect(res.isValid).toBe(true);
      expect(res.durationMinutes).toBe(120);
      expect(res.hoursFloat).toBe(2);
      expect(res.durationText).toBe("2 hours");
      expect(res.shortDurationText).toBe("2 hrs");
    });

    it("9. Duration is automatically calculated for 1 hour 30 minutes (90 mins)", () => {
      const res = calculateTimePermissionDuration("10:00", "11:30");
      expect(res.isValid).toBe(true);
      expect(res.durationMinutes).toBe(90);
      expect(res.hoursFloat).toBe(1.5);
      expect(res.durationText).toBe("1 hour 30 minutes");
      expect(res.shortDurationText).toBe("1 hr 30 mins");
    });

    it("3. Less than 30 minutes is rejected", () => {
      const res = calculateTimePermissionDuration("10:00", "10:15");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Time Permission must be at least 30 minutes.");
    });

    it("4. More than 2 hours is rejected", () => {
      const res = calculateTimePermissionDuration("09:00", "11:30");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Time Permission cannot exceed 2 hours.");
    });

    it("5. Start time before 8:00 AM is rejected", () => {
      const res = calculateTimePermissionDuration("07:30", "08:30");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Time Permission must be between 8:00 AM and 5:00 PM.");
    });

    it("6. End time after 5:00 PM is rejected", () => {
      const res = calculateTimePermissionDuration("16:00", "17:30");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Time Permission must be between 8:00 AM and 5:00 PM.");
    });

    it("7. End time earlier than start time is rejected", () => {
      const res = calculateTimePermissionDuration("14:00", "13:00");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("End time must be later than start time.");
    });

    it("8. Same From and To time is rejected", () => {
      const res = calculateTimePermissionDuration("10:00", "10:00");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("End time must be later than start time.");
    });

    it("Smart To-Time Options: restricts options based on 30m min, 2h max, and 5:00 PM boundary", () => {
      // From 10:00 AM -> To options: 10:30, 11:00, 11:30, 12:00
      const toOptions10 = getToTimeOptions("10:00");
      const values10 = toOptions10.map((o) => o.value);
      expect(values10).toEqual(["10:30", "11:00", "11:30", "12:00"]);

      // From 4:00 PM (16:00) -> To options: 16:30, 17:00 (capped at 5:00 PM)
      const toOptions16 = getToTimeOptions("16:00");
      const values16 = toOptions16.map((o) => o.value);
      expect(values16).toEqual(["16:30", "17:00"]);
    });

    it("12. formatTimeRange formats valid times to 12-hour and falls back to 'Not recorded' for old records", () => {
      expect(formatTimeRange("10:00:00", "11:30:00")).toBe("10:00 AM - 11:30 AM");
      expect(formatTimeRange("14:00", "15:30")).toBe("2:00 PM - 3:30 PM");
      expect(formatTimeRange(null, null)).toBe("Not recorded");
      expect(formatTimeRange("", "")).toBe("Not recorded");
    });
  });

  // -------------------------------------------------------------------------
  // ApplyLeavePage: UI Behavior, Automatic Duration, Payload
  // -------------------------------------------------------------------------
  describe("ApplyLeavePage Component", () => {
    beforeEach(() => {
      vi.spyOn(api, "getSubstituteEmployees").mockResolvedValue({
        data: [
          {
            id: "sub-101",
            name: "Gamshan",
            email: "gamshan@example.com",
            role: "employee",
          },
        ],
      });
      vi.spyOn(api, "applyLeave").mockResolvedValue({
        message: "Leave application submitted successfully, waiting for admin approval",
        data: { id: "lv-new-001" },
      });
    });

    it("Displays Permission Date, From Time, To Time, and calculated non-editable duration when Time Permission is selected", async () => {
      render(
        <BrowserRouter>
          <ApplyLeavePage />
        </BrowserRouter>
      );

      // Switch leave type to Time Permission
      const leaveTypeSelect = screen.getByLabelText(/leave type/i);
      fireEvent.change(leaveTypeSelect, { target: { value: "Time Permission" } });

      // Check fields
      expect(screen.getByLabelText(/permission date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/from time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/to time/i)).toBeInTheDocument();

      // Duration should be displayed and non-editable
      const durationDisplay = screen.getByText(/duration: 1 hour 30 minutes/i);
      expect(durationDisplay).toBeInTheDocument();

      // Should NOT show manual hours dropdown
      expect(screen.queryByLabelText(/^permission hours$/i)).not.toBeInTheDocument();
    });

    it("Automatically recalculates duration when From Time or To Time changes", async () => {
      render(
        <BrowserRouter>
          <ApplyLeavePage />
        </BrowserRouter>
      );

      const leaveTypeSelect = screen.getByLabelText(/leave type/i);
      fireEvent.change(leaveTypeSelect, { target: { value: "Time Permission" } });

      const fromTimeSelect = screen.getByLabelText(/from time/i);
      const toTimeSelect = screen.getByLabelText(/to time/i);

      // Change From to 08:00 AM and To to 10:00 AM (2 hours)
      fireEvent.change(fromTimeSelect, { target: { value: "08:00" } });
      fireEvent.change(toTimeSelect, { target: { value: "10:00" } });

      expect(screen.getByText(/duration: 2 hours/i)).toBeInTheDocument();
    });

    it("Submits payload with permission_date, permission_from_time, and permission_to_time", async () => {
      render(
        <BrowserRouter>
          <ApplyLeavePage />
        </BrowserRouter>
      );

      const leaveTypeSelect = screen.getByLabelText(/leave type/i);
      fireEvent.change(leaveTypeSelect, { target: { value: "Time Permission" } });

      const dateInput = screen.getByLabelText(/permission date/i);
      fireEvent.change(dateInput, { target: { value: "2026-09-21" } });

      const fromTimeSelect = screen.getByLabelText(/from time/i);
      fireEvent.change(fromTimeSelect, { target: { value: "10:00" } });

      const toTimeSelect = screen.getByLabelText(/to time/i);
      fireEvent.change(toTimeSelect, { target: { value: "11:30" } });

      // Set reason
      const reasonInput = screen.getByLabelText(/reason/i);
      fireEvent.change(reasonInput, { target: { value: "Hospital appointment" } });

      // Wait for substitute list and select Gamshan
      await waitFor(() => {
        expect(api.getSubstituteEmployees).toHaveBeenCalled();
      });

      // Select Gamshan
      const searchBox = screen.getByPlaceholderText(/search substitute employee/i);
      fireEvent.focus(searchBox);

      await waitFor(() => {
        const substituteOption = screen.getByText("Gamshan");
        fireEvent.click(substituteOption);
      });

      // Fill assigned work
      const workInput = screen.getByLabelText(/assigned work/i);
      fireEvent.change(workInput, { target: { value: "Monitor queue" } });

      // Submit form
      const submitBtn = screen.getByRole("button", { name: /submit application/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.applyLeave).toHaveBeenCalledWith(
          expect.objectContaining({
            leave_type: "Time Permission",
            permission_date: "2026-09-21",
            permission_from_time: "10:00",
            permission_to_time: "11:30",
            permission_hours: "1.5",
          })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // 13. MyLeavesPage: Displays From/To and Duration
  // -------------------------------------------------------------------------
  describe("13. MyLeavesPage - Displays Time Range and Duration", () => {
    it("Renders Time Permission with From - To range and short duration in table and modal", async () => {
      vi.spyOn(api, "getMyLeaves").mockResolvedValue({
        data: [
          {
            id: "lv-perm-100",
            leave_type: "Time Permission",
            permission_date: "2026-09-21",
            permission_from_time: "10:00:00",
            permission_to_time: "11:30:00",
            permission_hours: "1.5",
            substitute_name: "Gamshan",
            substitute_status: "Accepted",
            reason: "Doctor appointment",
            status: "Pending",
            created_at: "2026-09-20T08:00:00Z",
          },
          {
            id: "lv-perm-old",
            leave_type: "Time Permission",
            permission_date: "2026-09-05",
            permission_from_time: null,
            permission_to_time: null,
            permission_hours: "2",
            substitute_name: "None",
            reason: "Historical request",
            status: "Approved",
            created_at: "2026-09-04T08:00:00Z",
          },
        ],
      });

      render(
        <BrowserRouter>
          <MyLeavesPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        // New record should display "10:00 AM - 11:30 AM" and "1 hr 30 mins"
        expect(screen.getByText("10:00 AM - 11:30 AM")).toBeInTheDocument();
        expect(screen.getByText("1 hr 30 mins")).toBeInTheDocument();

        // Old historical record should display "Not recorded" and "2 hrs"
        expect(screen.getByText("Not recorded")).toBeInTheDocument();
        expect(screen.getByText("2 hrs")).toBeInTheDocument();
      });

      // Click "View Details" on the new request to check modal
      const viewDetailsButtons = screen.getAllByText("View Details");
      fireEvent.click(viewDetailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Leave Application Details")).toBeInTheDocument();
        expect(screen.getByText("Time Range:")).toBeInTheDocument();
        expect(screen.getByText("1 hour 30 minutes")).toBeInTheDocument();
      });
    });
  });
});
