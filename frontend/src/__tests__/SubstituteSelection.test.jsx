import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApplyLeavePage } from "../pages/ApplyLeavePage";
import { LeaveProvider } from "../context/LeaveContext";
import * as api from "../services/api";
import * as auth from "../services/auth";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual("../services/api");
  return {
    ...actual,
    getSubstituteEmployees: vi.fn(),
    applyLeave: vi.fn(),
  };
});

describe("Substitute Selection Rules & UI in ApplyLeavePage", () => {
  const mockApplicant = {
    id: "emp-gamshan",
    name: "Gamshan K",
    role: "employee",
    team_name: "EMR Engineering",
    email: "gamshan@example.com",
  };

  const mockSubstituteCandidates = [
    {
      id: "sup-nadia",
      name: "Nadia Perera",
      username: "nadia.p",
      email: "nadia@company.com",
      role: "superior_admin",
      team_name: "Executive Team",
      department: "Executive",
      designation: "Executive Director",
      is_active: true,
    },
    {
      id: "ti-priya",
      name: "Priyadharshini T",
      username: "priya.t",
      email: "priya@company.com",
      role: "team_admin",
      team_name: "Executive Team",
      department: "Executive",
      designation: "Tech Lead",
      is_active: true,
    },
    {
      id: "emp-thanu",
      name: "Thanushiya",
      username: "thanu.k",
      email: "thanu@company.com",
      role: "employee",
      team_name: "EMR Engineering",
      department: "Engineering",
      designation: "Software Engineer",
      is_active: true,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    auth.storeUser(mockApplicant);
    api.getSubstituteEmployees.mockResolvedValue({
      data: mockSubstituteCandidates,
    });
    api.applyLeave.mockResolvedValue({
      message: "Leave application submitted successfully!",
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <LeaveProvider>
          <ApplyLeavePage />
        </LeaveProvider>
      </MemoryRouter>
    );

  it("should show Superior Admin, Team In-charge, and Employee candidates in the substitute dropdown", async () => {
    renderComponent();

    const searchInput = screen.getByPlaceholderText(/search substitute employee/i);
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(screen.getByText("Nadia Perera")).toBeInTheDocument();
      expect(screen.getByText("Priyadharshini T")).toBeInTheDocument();
      expect(screen.getByText("Thanushiya")).toBeInTheDocument();
    });

    // Check Role Badges
    expect(screen.getByText("Superior Admin")).toBeInTheDocument();
    expect(screen.getByText("Team In-charge")).toBeInTheDocument();
    expect(screen.getByText(/Executive Team • Superior Admin/i)).toBeInTheDocument();
  });

  it("should filter candidates by role when typing 'superior'", async () => {
    renderComponent();

    const searchInput = screen.getByPlaceholderText(/search substitute employee/i);
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "superior" } });

    await waitFor(() => {
      expect(screen.getByText("Nadia Perera")).toBeInTheDocument();
      expect(screen.queryByText("Thanushiya")).not.toBeInTheDocument();
    });
  });

  it("should exclude the applicant from candidate list even if present in returned data", async () => {
    api.getSubstituteEmployees.mockResolvedValue({
      data: [
        ...mockSubstituteCandidates,
        {
          id: "emp-gamshan", // Same as applicant
          name: "Gamshan K",
          role: "employee",
          team_name: "EMR Engineering",
          is_active: true,
        },
      ],
    });

    renderComponent();

    const searchInput = screen.getByPlaceholderText(/search substitute employee/i);
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(screen.getByText("Nadia Perera")).toBeInTheDocument();
    });

    // Gamshan should be excluded client-side from the dropdown menu
    const dropdownMenu = document.querySelector(".substitute-dropdown-menu");
    expect(dropdownMenu).toBeInTheDocument();
    expect(dropdownMenu.textContent).not.toContain("Gamshan K");
  });

  it("should allow selecting a Superior Admin as substitute and display their details in the selected card", async () => {
    renderComponent();

    const searchInput = screen.getByPlaceholderText(/search substitute employee/i);
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(screen.getByText("Nadia Perera")).toBeInTheDocument();
    });

    // Click on Nadia Perera
    fireEvent.click(screen.getByText("Nadia Perera"));

    // Check that selected card is shown with role badge
    expect(screen.getByText("Nadia Perera")).toBeInTheDocument();
    expect(screen.getByTitle("Clear selected substitute")).toBeInTheDocument();
    expect(screen.getByText(/Executive Team • Superior Admin/i)).toBeInTheDocument();
  });

  it("should submit leave with Superior Admin substitute correctly", async () => {
    renderComponent();

    // Fill start and end dates
    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(startDateInput, { target: { value: "2026-10-15" } });
    fireEvent.change(endDateInput, { target: { value: "2026-10-16" } });

    // Fill reason
    const reasonInput = screen.getByLabelText(/reason for leave/i);
    fireEvent.change(reasonInput, { target: { value: "Annual leave" } });

    // Select Nadia Perera as substitute
    const searchInput = screen.getByPlaceholderText(/search substitute employee/i);
    fireEvent.focus(searchInput);
    await waitFor(() => {
      expect(screen.getByText("Nadia Perera")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Nadia Perera"));

    // Fill assigned work
    const workInput = screen.getByLabelText(/assigned work/i);
    fireEvent.change(workInput, { target: { value: "Handle project reviews" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /submit application/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.applyLeave).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: "emp-gamshan",
          substitute_employee_id: "sup-nadia",
          leave_type: "Annual Leave",
          assigned_work: "Handle project reviews",
        })
      );
    });
  });

  it("should work identically for Time Permission with Superior Admin substitute", async () => {
    renderComponent();

    // Change leave type to Time Permission
    const leaveTypeSelect = screen.getByLabelText(/leave type/i);
    fireEvent.change(leaveTypeSelect, { target: { value: "Time Permission" } });

    // Fill permission date
    const permDateInput = screen.getByLabelText(/permission date/i);
    fireEvent.change(permDateInput, { target: { value: "2026-10-20" } });

    // Fill reason
    const reasonInput = screen.getByLabelText(/reason for leave/i);
    fireEvent.change(reasonInput, { target: { value: "Medical appointment" } });

    // Select Nadia Perera as substitute
    const searchInput = screen.getByPlaceholderText(/search substitute employee/i);
    fireEvent.focus(searchInput);
    await waitFor(() => {
      expect(screen.getByText("Nadia Perera")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Nadia Perera"));

    // Fill assigned work
    const workInput = screen.getByLabelText(/assigned work/i);
    fireEvent.change(workInput, { target: { value: "Coverage for 1 hour" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /submit application/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.applyLeave).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: "emp-gamshan",
          substitute_employee_id: "sup-nadia",
          leave_type: "Time Permission",
          permission_date: "2026-10-20",
          permission_from_time: "10:00",
          permission_to_time: "11:30",
          permission_hours: "1.5",
          assigned_work: "Coverage for 1 hour",
        })
      );
    });
  });
});
