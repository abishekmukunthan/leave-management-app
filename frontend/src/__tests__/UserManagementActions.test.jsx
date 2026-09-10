import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserManagementPage } from "../pages/UserManagementPage";
import { LeaveProvider } from "../context/LeaveContext";
import * as api from "../services/api";
import * as auth from "../services/auth";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual("../services/api");
  return {
    ...actual,
    getSuperiorUsers: vi.fn(),
    getSuperiorPermissions: vi.fn(),
    getSuperiorTeams: vi.fn(),
    deactivateUser: vi.fn(),
    activateUser: vi.fn(),
    resetUserPassword: vi.fn(),
    createSuperiorUser: vi.fn(),
    updateSuperiorUserDetails: vi.fn(),
  };
});

describe("UserManagementPage Action Buttons & Activate/Deactivate Feature", () => {
  const mockSuperiorAdmin = {
    id: "sup-nadia",
    name: "Nadia Perera",
    role: "superior_admin",
  };

  const mockUsers = [
    {
      id: "u-active",
      name: "Alex Morgan",
      username: "alexm",
      email: "alex@example.com",
      role: "employee",
      team_name: "Engineering",
      designation: "Software Engineer",
      is_active: true,
      permissions: [],
    },
    {
      id: "u-inactive",
      name: "Kasun Silva",
      username: "kasuns",
      email: "kasun@example.com",
      role: "employee",
      team_name: "Support",
      designation: "Support Specialist",
      is_active: false,
      permissions: [],
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, "getStoredUser").mockReturnValue(mockSuperiorAdmin);
    vi.spyOn(auth, "isSuperiorAdmin").mockReturnValue(true);

    api.getSuperiorUsers.mockResolvedValue({ users: mockUsers });
    api.getSuperiorPermissions.mockResolvedValue({ data: [] });
    api.getSuperiorTeams.mockResolvedValue({ teams: [] });
    api.deactivateUser.mockResolvedValue({ message: "User deactivated successfully." });
    api.activateUser.mockResolvedValue({ message: "User activated successfully." });
  });

  it("should display action buttons in a vertical stack with correct buttons for active and inactive users", async () => {
    render(
      <LeaveProvider>
        <UserManagementPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      expect(screen.getByText("Kasun Silva")).toBeInTheDocument();
    });

    // Verify Active user status & actions
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();

    // Active user row: has Permissions, Reset Password, Deactivate User
    const deactivateBtns = screen.getAllByRole("button", { name: /^deactivate user$/i });
    expect(deactivateBtns).toHaveLength(1);

    // Inactive user row: has Permissions, Reset Password, Activate User
    const activateBtns = screen.getAllByRole("button", { name: /^activate user$/i });
    expect(activateBtns).toHaveLength(1);

    // Verify vertical layout wrapper exists
    const actionContainers = document.querySelectorAll(".user-action-buttons-vertical");
    expect(actionContainers.length).toBeGreaterThanOrEqual(2);
  });

  it("should open Deactivate modal and call deactivateUser on confirm", async () => {
    render(
      <LeaveProvider>
        <UserManagementPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    });

    const deactivateBtn = screen.getByRole("button", { name: /^deactivate user$/i });
    fireEvent.click(deactivateBtn);

    // Verify modal content
    expect(screen.getByRole("heading", { name: /deactivate user/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to deactivate this user\? The user will not be able to log in/i)
    ).toBeInTheDocument();

    // Confirm deactivation
    const confirmBtn = screen.getByRole("button", { name: /^deactivate$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.deactivateUser).toHaveBeenCalledWith("u-active", "sup-nadia");
    });
  });

  it("should open Activate modal and call activateUser on confirm", async () => {
    render(
      <LeaveProvider>
        <UserManagementPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Kasun Silva")).toBeInTheDocument();
    });

    const activateBtn = screen.getByRole("button", { name: /^activate user$/i });
    fireEvent.click(activateBtn);

    // Verify modal content
    expect(screen.getByRole("heading", { name: /activate user/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to activate this user again\?/i)
    ).toBeInTheDocument();

    // Confirm activation
    const confirmBtn = screen.getByRole("button", { name: /^activate$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.activateUser).toHaveBeenCalledWith("u-inactive", "sup-nadia");
    });
  });

  it("should allow creating a user without assigning a team and show 'No team assigned'", async () => {
    api.createSuperiorUser.mockResolvedValue({
      user: {
        id: "u-new",
        name: "Devon Lane",
        email: "devon@example.com",
        role: "employee",
        team_id: null,
      },
      temporaryPassword: "Temp@123456",
    });

    render(
      <LeaveProvider>
        <UserManagementPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    });

    // Open Add User Modal
    const addUserBtn = screen.getByRole("button", { name: /^add user$/i });
    fireEvent.click(addUserBtn);

    // Modal opens
    expect(screen.getByRole("heading", { name: /create new user account/i })).toBeInTheDocument();

    // Verify team dropdown default is "No team assigned"
    const teamSelect = screen.getByLabelText(/assigned team/i);
    expect(teamSelect.value).toBe("");
    expect(screen.getByRole("option", { name: /no team assigned/i })).toBeInTheDocument();

    // Fill in Name and Email
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Devon Lane" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "devon@example.com" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /create user account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createSuperiorUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Devon Lane",
          email: "devon@example.com",
          team_id: null,
          role: "employee",
        })
      );
    });
  });

  it("should display team_admin informational note when no team is selected", async () => {
    render(
      <LeaveProvider>
        <UserManagementPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    });

    // Open Add User Modal
    const addUserBtn = screen.getByRole("button", { name: /^add user$/i });
    fireEvent.click(addUserBtn);

    // Switch Role to Team Lead
    const roleSelect = screen.getByLabelText(/^role$/i);
    fireEvent.change(roleSelect, { target: { value: "team_admin" } });

    // Expect note about user created without a team
    expect(
      screen.getByText(/This user is created without a team\. Assign them as Team In-charge later if they need approval access\./i)
    ).toBeInTheDocument();
  });

  it("should support selecting Superior Admin in Create User modal, hide team select, and show system admin note", async () => {
    api.createSuperiorUser.mockResolvedValue({
      user: {
        id: "sup-2",
        name: "Second Admin",
        email: "second.admin@company.com",
        role: "superior_admin",
        team_id: null,
      },
      temporaryPassword: "Temp@654321",
    });

    render(
      <LeaveProvider>
        <UserManagementPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    });

    const addUserBtn = screen.getByRole("button", { name: /^add user$/i });
    fireEvent.click(addUserBtn);

    const roleSelect = screen.getByLabelText(/^role$/i);
    expect(screen.getByRole("option", { name: /superior admin/i })).toBeInTheDocument();

    // Select Superior Admin
    fireEvent.change(roleSelect, { target: { value: "superior_admin" } });

    // Team field should be hidden
    expect(screen.queryByLabelText(/assigned team/i)).not.toBeInTheDocument();

    // Explanatory note should be visible
    expect(
      screen.getByText(/Superior Admin users are not assigned to a team and will have system administration access\./i)
    ).toBeInTheDocument();

    // Fill in and submit
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Second Admin" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "second.admin@company.com" } });

    const submitBtn = screen.getByRole("button", { name: /create user account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createSuperiorUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Second Admin",
          email: "second.admin@company.com",
          role: "superior_admin",
          team_id: null,
        })
      );
    });
  });

  it("should show warning when deactivating Superior Admin and display backend error if blocked", async () => {
    const usersWithSuperior = [
      ...mockUsers,
      {
        id: "sup-target",
        name: "Elena Rostova",
        username: "elena",
        email: "elena@company.com",
        role: "superior_admin",
        team_name: "Executive Management",
        designation: "Superior Admin",
        is_active: true,
        permissions: [],
      },
    ];
    api.getSuperiorUsers.mockResolvedValue({ users: usersWithSuperior });

    render(
      <LeaveProvider>
        <UserManagementPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Elena Rostova")).toBeInTheDocument();
    });

    // Check Superior Admin badge
    expect(screen.getAllByText("Superior Admin").length).toBeGreaterThanOrEqual(1);

    // Find Deactivate User button for Elena
    const elenaRow = screen.getByText("Elena Rostova").closest("tr");
    const deactivateBtn = elenaRow.querySelector(".admin-reject-btn");
    expect(deactivateBtn).toBeInTheDocument();
    fireEvent.click(deactivateBtn);

    // Verify warning in modal
    expect(
      screen.getByText(/You are deactivating a Superior Admin account\. At least one active Superior Admin must remain in the system\./i)
    ).toBeInTheDocument();

    // Mock backend rejection
    api.deactivateUser.mockRejectedValueOnce(
      new Error("At least one active Superior Admin must remain in the system.")
    );

    const confirmBtn = screen.getByRole("button", { name: /^deactivate$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText("At least one active Superior Admin must remain in the system.")
      ).toBeInTheDocument();
    });
  });

  it("should open Edit modal, prefill user details, and save updates via API", async () => {
    api.updateSuperiorUserDetails.mockResolvedValue({
      message: "User details updated successfully.",
      user: { ...mockUsers[0], name: "Alex Morgan Updated" },
    });

    render(
      <LeaveProvider>
        <UserManagementPage />
      </LeaveProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    });

    // Click Edit on Alex's row
    const allEditBtns = screen.getAllByRole("button", { name: /^edit$/i });
    fireEvent.click(allEditBtns[0]);

    // Modal opens
    expect(screen.getByRole("heading", { name: /edit user details/i })).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/full name/i);
    expect(nameInput.value).toBe("Alex Morgan");

    // Change designation and submit
    fireEvent.change(nameInput, { target: { value: "Alex Morgan Updated" } });
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateSuperiorUserDetails).toHaveBeenCalledWith(
        "u-active",
        expect.objectContaining({
          name: "Alex Morgan Updated",
          email: "alex@example.com",
        }),
        "sup-nadia"
      );
    });
  });
});

