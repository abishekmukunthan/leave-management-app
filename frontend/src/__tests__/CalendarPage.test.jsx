import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CalendarPage } from "../pages/CalendarPage";
import { LeaveProvider } from "../context/LeaveContext";
import * as api from "../services/api";
import * as auth from "../services/auth";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual("../services/api");
  return {
    ...actual,
    getCalendarMonthSummary: vi.fn(),
    getCalendarDayDetails: vi.fn(),
  };
});

describe("CalendarPage Date Details Modal", () => {
  const mockUser = {
    id: "user-123",
    name: "Nadia Perera",
    role: "superior_admin",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, "getStoredUser").mockReturnValue(mockUser);
    vi.spyOn(auth, "isSuperiorAdmin").mockReturnValue(true);

    api.getCalendarMonthSummary.mockResolvedValue({
      year: 2026,
      month: 9,
      days: [
        {
          date: "2026-09-10",
          onLeaveCount: 2,
          timePermissionCount: 2,
          totalAwayCount: 4,
        },
      ],
    });
  });

  it("should open modal on date click and display ONLY total leave box and scrollable table", async () => {
    api.getCalendarDayDetails.mockResolvedValue({
      date: "2026-09-10",
      totalLeaveCount: 2,
      records: [
        {
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
        },
        {
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
        },
      ],
    });

    render(
      <LeaveProvider>
        <CalendarPage />
      </LeaveProvider>
    );

    // Wait for calendar month to load
    await waitFor(() => {
      expect(screen.getByText("Leave Calendar")).toBeInTheDocument();
    });

    // Click on date 10
    const day10Cell = screen.getByText("10");
    fireEvent.click(day10Cell);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText(/Selected Date: 2026-09-10/i)).toBeInTheDocument();
    });

    // 1. Check Total Leave Box
    expect(screen.getByText("Total Leave on this day")).toBeInTheDocument();
    const countEl = screen.getByTestId("total-leave-count");
    expect(countEl).toHaveTextContent("2");

    // 2. Check Table columns exactly
    expect(screen.getByRole("columnheader", { name: "Employee Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Department Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Leave / Time Permission" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Substitute" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Leave Type" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Assigned Work" })).toBeInTheDocument();

    // 3. Check records inside table
    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Michael Chen")).toBeInTheDocument();
    expect(screen.getByText("Annual Leave")).toBeInTheDocument();
    expect(screen.getByText("Handle client updates")).toBeInTheDocument();

    expect(screen.getByText("Kasun Silva")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
    expect(screen.getByText("Not assigned")).toBeInTheDocument();
    expect(screen.getByText("No assigned work")).toBeInTheDocument();

    // 4. Time Permission is in table (appears in both Leave/Time Perm column and Leave Type column), but NOT in total leave count
    expect(screen.getAllByText("Time Permission")).toHaveLength(2);
    expect(countEl).toHaveTextContent("2");

    // 5. Verify old summary cards & charts do NOT exist in the modal
    expect(screen.queryByText("Total Employees")).not.toBeInTheDocument();
    expect(screen.queryByText("Available Employees")).not.toBeInTheDocument();
    expect(screen.queryByText("Department Availability Breakdown")).not.toBeInTheDocument();
    expect(screen.queryByText(/People on Leave \(/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Time Permissions \(/)).not.toBeInTheDocument();
  });

  it("should display empty state with Total Leave: 0 when no records exist", async () => {
    api.getCalendarDayDetails.mockResolvedValue({
      date: "2026-09-25",
      totalLeaveCount: 0,
      records: [],
    });

    render(
      <LeaveProvider>
        <CalendarPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Leave Calendar")).toBeInTheDocument();
    });

    const day25Cell = screen.getByText("25");
    fireEvent.click(day25Cell);

    await waitFor(() => {
      expect(screen.getByText(/Selected Date: 2026-09-25/i)).toBeInTheDocument();
    });

    // Total Leave box should show 0
    expect(screen.getByText("Total Leave on this day")).toBeInTheDocument();
    expect(screen.getByTestId("total-leave-count")).toHaveTextContent("0");

    // Empty state message
    expect(
      screen.getByText("No leave or time permission records found for this date.")
    ).toBeInTheDocument();
  });
});
