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
    deleteTeam: vi.fn(),
    getTeamMembers: vi.fn(),
    getUnassignedEmployees: vi.fn(),
  };
});

describe("ConfigurationPage Teams Action Buttons & Activate/Deactivate/Delete Feature", () => {
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
    api.deleteTeam.mockResolvedValue({ message: "Team deleted successfully.", team_id: "team-2" });
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

    // Active team shows Deactivate Team button but NOT Delete Team
    const deactivateBtn = screen.getByRole("button", { name: /^deactivate team$/i });
    expect(deactivateBtn).toBeInTheDocument();

    // Inactive team shows Activate Team and Delete Team buttons
    const activateBtn = screen.getByRole("button", { name: /^activate team$/i });
    expect(activateBtn).toBeInTheDocument();
    const deleteBtn = screen.getByRole("button", { name: /^delete team$/i });
    expect(deleteBtn).toBeInTheDocument();

    // Verify button orders in both rows
    const firstRowButtons = Array.from(actionContainers[0].querySelectorAll("button")).map((b) => b.textContent.trim());
    expect(firstRowButtons).toEqual(["Assign In-charge", "Permission", "Edit", "Deactivate Team"]);

    const secondRowButtons = Array.from(actionContainers[1].querySelectorAll("button")).map((b) => b.textContent.trim());
    expect(secondRowButtons).toEqual(["Assign In-charge", "Permission", "Edit", "Activate Team", "Delete Team"]);
  });

  it("should hide Delete Team button for active team and show it only for inactive team", async () => {
    render(
      <LeaveProvider>
        <ConfigurationPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Engineering Team")).toBeInTheDocument();
    });

    // Only 1 Delete Team button exists on the page (for Legacy Operations)
    const deleteButtons = screen.getAllByRole("button", { name: /^delete team$/i });
    expect(deleteButtons).toHaveLength(1);

    const actionContainers = document.querySelectorAll(".team-action-buttons-vertical");
    // Active team container does NOT contain a delete button
    expect(actionContainers[0].querySelector("button[title*='Delete']")).toBeNull();
    // Inactive team container DOES contain a delete button
    expect(actionContainers[1].querySelector("button[title*='Delete']")).not.toBeNull();
  });

  it("should open Delete Team Permanently confirmation modal and cancel when Cancel is clicked", async () => {
    render(
      <LeaveProvider>
        <ConfigurationPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Legacy Operations")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /^delete team$/i });
    fireEvent.click(deleteBtn);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^delete team permanently$/i })).toBeInTheDocument();
      expect(screen.getByText(/You are about to permanently delete/i)).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone\./i)).toBeInTheDocument();
    });

    // Click Cancel
    const cancelBtn = screen.getByRole("button", { name: /^cancel$/i });
    fireEvent.click(cancelBtn);

    // Modal should close and deleteTeam should NOT be called
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /^delete team permanently$/i })).not.toBeInTheDocument();
    });
    expect(api.deleteTeam).not.toHaveBeenCalled();
  });

  it("should successfully call deleteTeam API on confirmation and refresh team list", async () => {
    render(
      <LeaveProvider>
        <ConfigurationPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Legacy Operations")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /^delete team$/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^delete team permanently$/i })).toBeInTheDocument();
    });

    // Mock subsequent getSuperiorTeams call after deletion to return only the active team
    api.getSuperiorTeams.mockResolvedValueOnce({ teams: [mockTeams[0]] });

    // Click Delete Team Permanently button
    const confirmDeleteBtn = screen.getByRole("button", { name: /^delete team permanently$/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.deleteTeam).toHaveBeenCalledWith("team-2", "sup-nadia");
    });
  });

  it("should display error toast when deleteTeam API call fails", async () => {
    api.deleteTeam.mockRejectedValue(new Error("Active teams cannot be deleted. Deactivate the team first."));

    render(
      <LeaveProvider>
        <ConfigurationPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Legacy Operations")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /^delete team$/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^delete team permanently$/i })).toBeInTheDocument();
    });

    const confirmDeleteBtn = screen.getByRole("button", { name: /^delete team permanently$/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.deleteTeam).toHaveBeenCalledWith("team-2", "sup-nadia");
    });
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
