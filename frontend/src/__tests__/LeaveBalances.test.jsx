import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { EmployeeDashboard } from "../pages/EmployeeDashboard";
import { EmployeeProfilePage } from "../pages/EmployeeProfilePage";
import * as api from "../services/api";

// Mock LeaveContext
const mockLoggedInUser = {
  id: "usr-new-emp-001",
  name: "John Doe",
  email: "john.doe@company.com",
  role: "employee",
  designation: "Junior Engineer",
  team: "Engineering",
};

vi.mock("../context/useLeave", () => ({
  useLeave: () => ({
    currentUser: {
      id: "usr-new-emp-001",
      fullName: "John Doe",
      email: "john.doe@company.com",
      leaveBalances: {
        annualLeave: { used: 0, total: 15, name: "Annual Leave" },
        sickLeave: { used: 0, total: 10, name: "Sick Leave" },
        casualLeave: { used: 0, total: 6, name: "Casual Leave" },
        emergencyLeave: { used: 0, total: 3, name: "Emergency Leave" },
        halfDayLeave: { used: 0, total: 4, name: "Half Day Leave" },
        timePermission: { used: 0, total: 6, name: "Time Permission (Hrs)" },
      },
    },
    loggedInUser: mockLoggedInUser,
    showToast: vi.fn(),
  }),
}));

describe("Leave Balance Dashboard Zero-State & Live Balances", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should display 0 days consumed and full quota left for new employees with zero leave history", async () => {
    vi.spyOn(api, "getMyLeaves").mockResolvedValue({ data: [] });
    vi.spyOn(api, "getSubstituteRequests").mockResolvedValue({ data: [] });
    vi.spyOn(api, "getLeaveBalances").mockResolvedValue({
      data: {
        annual: { quota: 15, used: 0, remaining: 15, name: "Annual Leave", unit: "days" },
        sick: { quota: 10, used: 0, remaining: 10, name: "Sick Leave", unit: "days" },
        casual: { quota: 6, used: 0, remaining: 6, name: "Casual Leave", unit: "days" },
        timePermission: { quota: 6, used: 0, remaining: 6, name: "Time Permission", unit: "hours" },
      },
    });

    const { container } = render(
      <BrowserRouter>
        <EmployeeDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Captions show zero consumption (3 normal leave cards show 0 days consumed)
      expect(screen.getAllByText("0 days consumed")).toHaveLength(3);
      expect(screen.getByText("0 hours used this month")).toBeInTheDocument();

      // Check balance totals inside .balance-total spans
      const totalSpans = Array.from(container.querySelectorAll(".balance-total")).map((el) => el.textContent.trim());
      expect(totalSpans).toContain("/ 15 Days Left");
      expect(totalSpans).toContain("/ 10 Days Left");
      expect(totalSpans).toContain("/ 6 Days Left");
      expect(totalSpans).toContain("/ 6 Hours Left");

      // Check available amounts inside .balance-available spans
      const availSpans = Array.from(container.querySelectorAll(".balance-available")).map((el) => el.textContent.trim());
      expect(availSpans).toContain("15");
      expect(availSpans).toContain("10");
      expect(availSpans).toContain("6");
    });

    // Verify hardcoded fake values are NOT in the document
    expect(screen.queryByText("3 days consumed")).not.toBeInTheDocument();
    expect(screen.queryByText("2 days consumed")).not.toBeInTheDocument();
    expect(screen.queryByText("2 hours used this month")).not.toBeInTheDocument();
  });

  it("should display actual approved consumption and reduced remaining days for employees with approved leave", async () => {
    vi.spyOn(api, "getMyLeaves").mockResolvedValue({
      data: [
        {
          id: "lv-1",
          leave_type: "Annual Leave",
          start_date: "2026-06-10",
          end_date: "2026-06-11",
          status: "Approved",
        },
      ],
    });
    vi.spyOn(api, "getSubstituteRequests").mockResolvedValue({ data: [] });
    vi.spyOn(api, "getLeaveBalances").mockResolvedValue({
      data: {
        annual: { quota: 15, used: 2, remaining: 13, name: "Annual Leave", unit: "days" },
        sick: { quota: 10, used: 0, remaining: 10, name: "Sick Leave", unit: "days" },
        casual: { quota: 6, used: 0, remaining: 6, name: "Casual Leave", unit: "days" },
        timePermission: { quota: 6, used: 1.5, remaining: 4.5, name: "Time Permission", unit: "hours" },
      },
    });

    const { container } = render(
      <BrowserRouter>
        <EmployeeDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Annual Leave Card shows 2 days consumed and 13 available
      expect(screen.getByText("2 days consumed")).toBeInTheDocument();
      // Time Permission Card shows 1.5 hours used
      expect(screen.getByText("1.5 hours used this month")).toBeInTheDocument();

      const availSpans = Array.from(container.querySelectorAll(".balance-available")).map((el) => el.textContent.trim());
      expect(availSpans).toContain("13");
      expect(availSpans).toContain("4.5");

      const totalSpans = Array.from(container.querySelectorAll(".balance-total")).map((el) => el.textContent.trim());
      expect(totalSpans).toContain("/ 15 Days Left");
      expect(totalSpans).toContain("/ 6 Hours Left");
    });
  });

  it("should render live balances on EmployeeProfilePage", async () => {
    vi.spyOn(api, "getLeaveBalances").mockResolvedValue({
      data: {
        balancesList: [
          { name: "Annual Leave", quota: 15, used: 0, remaining: 15, unit: "days" },
          { name: "Sick Leave", quota: 10, used: 0, remaining: 10, unit: "days" },
          { name: "Casual Leave", quota: 6, used: 0, remaining: 6, unit: "days" },
          { name: "Time Permission", quota: 6, used: 0, remaining: 6, unit: "hours" },
        ],
      },
    });

    render(
      <BrowserRouter>
        <EmployeeProfilePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/15 days left/i)).toBeInTheDocument();
      expect(screen.getByText(/10 days left/i)).toBeInTheDocument();
      expect(screen.getByText(/6 days left/i)).toBeInTheDocument();
      expect(screen.getByText(/6 hrs left/i)).toBeInTheDocument();
      expect(screen.getByText(/0 hrs used/i)).toBeInTheDocument();
    });
  });
});
