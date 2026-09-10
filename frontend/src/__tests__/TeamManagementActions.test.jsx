import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConfigurationPage } from "../pages/ConfigurationPage";
import { LeaveProvider } from "../context/LeaveContext";
import * as api from "../services/api";
import * as auth from "../services/auth";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual("../services/api");
  return {
    ...actual,
    getSuperiorTeams: vi.fn(),
    getSuperiorLeaveTypes: vi.fn(),
    getSuperiorUsers: vi.fn(),
    getSuperiorPermissions: vi.fn(),
    activateTeam: vi.fn(),
    deactivateTeam: vi.fn(),
    getTeamMembers: vi.fn(),
    getUnassignedEmployees: vi.fn(),
  };
});

describe("ConfigurationPage Teams Action Buttons & Activate/Deactivate Feature", () => {
  const mockSuperiorAdmin = {
    id: "sup-nadia",
    name: "Nadia Perera",
    role: "superior_admin",
  };

  const mockTeams = [
    {
      id: "team-1",
      name: "Engineering Team",
      team_admin_id: "u-1",
      team_admin_name: "Alice Lead",
      team_admin_email: "alice@example.com",
      approval_permission_id: "ENG_LEAVE_APPROVER",
      total_members: 5,
      is_active: true,
    },
    {
      id: "team-2",
      name: "Legacy Operations",
      team_admin_id: null,
      team_admin_name: null,
      team_admin_email: null,
      approval_permission_id: null,
      total_members: 2,
      is_active: false,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, "getStoredUser").mockReturnValue(mockSuperiorAdmin);
    vi.spyOn(auth, "isSuperiorAdmin").mockReturnValue(true);

    api.getSuperiorTeams.mockResolvedValue({ teams: mockTeams });
    api.getSuperiorLeaveTypes.mockResolvedValue({ leaveTypes: [] });
    api.getSuperiorUsers.mockResolvedValue({ users: [] });
    api.getSuperiorPermissions.mockResolvedValue({ data: [] });
    api.getTeamMembers.mockResolvedValue({ members: [] });
    api.getUnassignedEmployees.mockResolvedValue({ employees: [] });
    api.deactivateTeam.mockResolvedValue({ message: "Team deactivated successfully.", team: { ...mockTeams[0], is_active: false } });
    api.activateTeam.mockResolvedValue({ message: "Team activated successfully.", team: { ...mockTeams[1], is_active: true } });
  });

  it("should render action buttons vertically in the required order for active and inactive teams", async () => {
    render(
      <LeaveProvider>
        <ConfigurationPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Engineering Team")).toBeInTheDocument();
      expect(screen.getByText("Legacy Operations")).toBeInTheDocument();
    });

    // Verify vertical layout wrapper exists
    const actionContainers = document.querySelectorAll(".team-action-buttons-vertical");
    expect(actionContainers.length).toBeGreaterThanOrEqual(2);

    // Verify status badges
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();

    // Active team shows Deactivate Team button
    const deactivateBtn = screen.getByRole("button", { name: /^deactivate team$/i });
    expect(deactivateBtn).toBeInTheDocument();

    // Inactive team shows Activate Team button
    const activateBtn = screen.getByRole("button", { name: /^activate team$/i });
    expect(activateBtn).toBeInTheDocument();

    // Verify button orders in both rows
    const firstRowButtons = Array.from(actionContainers[0].querySelectorAll("button")).map((b) => b.textContent.trim());
    expect(firstRowButtons).toEqual(["Assign In-charge", "Permission", "Edit", "Deactivate Team"]);

    const secondRowButtons = Array.from(actionContainers[1].querySelectorAll("button")).map((b) => b.textContent.trim());
    expect(secondRowButtons).toEqual(["Assign In-charge", "Permission", "Edit", "Activate Team"]);
  });

  it("should open Deactivate Team confirmation modal and call deactivateTeam API on confirm", async () => {
    render(
      <LeaveProvider>
        <ConfigurationPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Engineering Team")).toBeInTheDocument();
    });

    const deactivateBtn = screen.getByRole("button", { name: /^deactivate team$/i });
    fireEvent.click(deactivateBtn);

    // Modal should be open with title and description
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^deactivate team$/i })).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to deactivate this team\? Existing users and leave history will remain unchanged\./i)
      ).toBeInTheDocument();
    });

    // Confirm deactivation
    const confirmBtn = screen.getAllByRole("button", { name: /^deactivate$/i })[0];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.deactivateTeam).toHaveBeenCalledWith("team-1", "sup-nadia");
    });
  });

  it("should open Activate Team confirmation modal and call activateTeam API on confirm", async () => {
    render(
      <LeaveProvider>
        <ConfigurationPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Legacy Operations")).toBeInTheDocument();
    });

    const activateBtn = screen.getByRole("button", { name: /^activate team$/i });
    fireEvent.click(activateBtn);

    // Modal should be open with title and description
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^activate team$/i })).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to activate this team again\?/i)
      ).toBeInTheDocument();
    });

    // Confirm activation
    const confirmBtn = screen.getAllByRole("button", { name: /^activate$/i })[0];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.activateTeam).toHaveBeenCalledWith("team-2", "sup-nadia");
    });
  });
});
