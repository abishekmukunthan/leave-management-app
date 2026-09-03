import { superiorDao } from "../dao/superiorDao.js";

export const superiorController = {
  // GET /api/superior/dashboard-summary
  async getDashboardSummary(req, res) {
    try {
      const summary = await superiorDao.getDashboardSummary();
      return res.status(200).json(summary);
    } catch (error) {
      console.error("Error fetching superior dashboard summary:", error);
      return res.status(500).json({
        error: "Failed to fetch superior dashboard summary",
        details: error.message,
      });
    }
  },

  // GET /api/superior/users - Get all users with profile and department details
  async getUsers(req, res) {
    try {
      const users = await superiorDao.getAllUsers();
      return res.status(200).json({
        message: "Users retrieved successfully",
        count: users.length,
        users,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({
        error: "Failed to fetch users",
        details: error.message,
      });
    }
  },

  // POST /api/superior/users - Create new employee or team admin
  async createUser(req, res) {
    try {
      const { name, email, role, team_id, designation, department, employment_type, created_by } = req.body || {};

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      if (!email || !email.trim()) {
        return res.status(400).json({ error: "Email is required" });
      }

      const result = await superiorDao.createUser({
        name,
        email,
        role,
        team_id,
        designation,
        department,
        employment_type,
        created_by,
      });

      return res.status(201).json({
        message: "User account created successfully",
        user: result.user,
        temporaryPassword: result.temporaryPassword,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to create user account",
      });
    }
  },

  // PUT /api/superior/users/:id/reset-password - Reset password to a new temporary password
  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "User ID parameter is required" });
      }

      const result = await superiorDao.resetUserPassword(id);
      return res.status(200).json({
        message: "Password reset successfully",
        userId: id,
        user: result.user,
        temporaryPassword: result.temporaryPassword,
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to reset password",
      });
    }
  },

  // PUT /api/superior/users/:id/deactivate - Deactivate user account
  async deactivateUser(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "User ID parameter is required" });
      }

      const updatedUser = await superiorDao.deactivateUser(id);
      return res.status(200).json({
        message: "User account deactivated successfully",
        userId: id,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error deactivating user:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to deactivate user account",
      });
    }
  },

  // =========================================================================
  // TEAMS MANAGEMENT CONTROLLERS
  // =========================================================================

  // GET /api/superior/teams
  async getTeams(req, res) {
    try {
      const teams = await superiorDao.getAllTeams();
      return res.status(200).json({
        message: "Teams retrieved successfully",
        count: teams.length,
        teams,
      });
    } catch (error) {
      console.error("Error fetching teams:", error);
      return res.status(500).json({
        error: "Failed to fetch teams",
        details: error.message,
      });
    }
  },

  // POST /api/superior/teams
  async createTeam(req, res) {
    try {
      const { name, team_admin_id } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Team name is required" });
      }

      const team = await superiorDao.createTeam({ name, team_admin_id });
      return res.status(201).json({
        message: "Team created successfully",
        team,
      });
    } catch (error) {
      console.error("Error creating team:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to create team",
      });
    }
  },

  // PUT /api/superior/teams/:id
  async updateTeam(req, res) {
    try {
      const { id } = req.params;
      const { name, team_admin_id, is_active } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "Team ID is required" });
      }

      const team = await superiorDao.updateTeam(id, { name, team_admin_id, is_active });
      return res.status(200).json({
        message: "Team updated successfully",
        team,
      });
    } catch (error) {
      console.error("Error updating team:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to update team",
      });
    }
  },

  // PUT /api/superior/teams/:id/deactivate
  async deactivateTeam(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "Team ID is required" });
      }

      const team = await superiorDao.deactivateTeam(id);
      return res.status(200).json({
        message: "Team deactivated successfully",
        team,
      });
    } catch (error) {
      console.error("Error deactivating team:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to deactivate team",
      });
    }
  },

  // =========================================================================
  // LEAVE TYPES CONTROLLERS
  // =========================================================================

  // GET /api/superior/leave-types
  async getLeaveTypes(req, res) {
    try {
      const leaveTypes = await superiorDao.getAllLeaveTypes();
      return res.status(200).json({
        message: "Leave types retrieved successfully",
        count: leaveTypes.length,
        leaveTypes,
      });
    } catch (error) {
      console.error("Error fetching leave types:", error);
      return res.status(500).json({
        error: "Failed to fetch leave types",
        details: error.message,
      });
    }
  },

  // POST /api/superior/leave-types
  async createLeaveType(req, res) {
    try {
      const { name, code, unit, default_quota, requires_substitute } = req.body || {};

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Leave type name is required" });
      }
      if (!code || !code.trim()) {
        return res.status(400).json({ error: "Leave type code is required" });
      }

      const leaveType = await superiorDao.createLeaveType({
        name,
        code,
        unit,
        default_quota,
        requires_substitute,
      });

      return res.status(201).json({
        message: "Leave type created successfully",
        leaveType,
      });
    } catch (error) {
      console.error("Error creating leave type:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to create leave type",
      });
    }
  },

  // PUT /api/superior/leave-types/:id
  async updateLeaveType(req, res) {
    try {
      const { id } = req.params;
      const { name, code, unit, default_quota, requires_substitute, is_active } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "Leave type ID is required" });
      }

      const leaveType = await superiorDao.updateLeaveType(id, {
        name,
        code,
        unit,
        default_quota,
        requires_substitute,
        is_active,
      });

      return res.status(200).json({
        message: "Leave type updated successfully",
        leaveType,
      });
    } catch (error) {
      console.error("Error updating leave type:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to update leave type",
      });
    }
  },

  // PUT /api/superior/leave-types/:id/deactivate
  async deactivateLeaveType(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "Leave type ID is required" });
      }

      const leaveType = await superiorDao.deactivateLeaveType(id);
      return res.status(200).json({
        message: "Leave type deactivated successfully",
        leaveType,
      });
    } catch (error) {
      console.error("Error deactivating leave type:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to deactivate leave type",
      });
    }
  },

  // =========================================================================
  // LEAVE ENTITLEMENTS / QUOTAS CONTROLLERS
  // =========================================================================

  // GET /api/superior/users/:id/leave-entitlements
  async getLeaveEntitlements(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "Employee User ID is required" });
      }

      const result = await superiorDao.getEmployeeLeaveEntitlements(id);
      return res.status(200).json({
        message: "Leave entitlements retrieved successfully",
        employee: result.employee,
        entitlements: result.entitlements,
      });
    } catch (error) {
      console.error("Error fetching leave entitlements:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to fetch leave entitlements",
      });
    }
  },

  // PUT /api/superior/users/:id/leave-entitlements
  async updateLeaveEntitlements(req, res) {
    try {
      const { id } = req.params;
      const { entitlements } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "Employee User ID is required" });
      }

      if (!Array.isArray(entitlements)) {
        return res.status(400).json({ error: "Entitlements must be an array of objects" });
      }

      const updated = await superiorDao.updateEmployeeLeaveEntitlements(id, entitlements);
      return res.status(200).json({
        message: "Employee leave entitlements updated successfully",
        employeeId: id,
        entitlements: updated,
      });
    } catch (error) {
      console.error("Error updating leave entitlements:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to update leave entitlements",
      });
    }
  },
};
