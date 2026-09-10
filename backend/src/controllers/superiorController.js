import { superiorDao } from "../dao/superiorDao.js";
import pool from "../config/db.js";

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

  // POST /api/superior/users - Create new employee, team admin, or superior admin user account
  async createUser(req, res) {
    try {
      const { name, email, role, team_id, designation, department, employment_type, created_by, superior_admin_id } = req.body || {};
      const requesterId = superior_admin_id || created_by || req.user?.id;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Name is required", message: "Name is required" });
      }

      if (!email || !email.trim()) {
        return res.status(400).json({ error: "Email is required", message: "Email is required" });
      }

      if (requesterId) {
        const check = await pool.query(
          "SELECT id, role, is_active FROM users WHERE id = $1",
          [requesterId]
        );
        if (check.rows.length === 0 || check.rows[0].role !== "superior_admin" || !check.rows[0].is_active) {
          return res.status(403).json({
            error: "Only authorized Superior Admins can perform this action.",
            message: "Only authorized Superior Admins can perform this action.",
          });
        }
      }

      const result = await superiorDao.createUser({
        name,
        email,
        role,
        team_id: role === "superior_admin" ? null : team_id,
        designation,
        department,
        employment_type,
        created_by: requesterId,
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
        message: error.message || "Failed to create user account",
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
      const { superior_admin_id } = req.body || {};
      const requesterId = superior_admin_id || req.user?.id;

      if (!id) {
        return res.status(400).json({ error: "User ID parameter is required", message: "User ID parameter is required" });
      }

      if (requesterId) {
        const check = await pool.query(
          "SELECT id, role, is_active FROM users WHERE id = $1",
          [requesterId]
        );
        if (check.rows.length === 0 || check.rows[0].role !== "superior_admin" || !check.rows[0].is_active) {
          return res.status(403).json({
            error: "Only authorized Superior Admins can perform this action.",
            message: "Only authorized Superior Admins can perform this action.",
          });
        }
      }

      const updatedUser = await superiorDao.deactivateUser(id);
      return res.status(200).json({
        message: "User deactivated successfully.",
        userId: id,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error deactivating user:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to deactivate user account",
        message: error.message || "Failed to deactivate user account",
      });
    }
  },

  // PUT /api/superior/users/:id/activate - Activate user account
  async activateUser(req, res) {
    try {
      const { id } = req.params;
      const { superior_admin_id } = req.body || {};
      const requesterId = superior_admin_id || req.user?.id;

      if (!id) {
        return res.status(400).json({ error: "User ID parameter is required", message: "User ID parameter is required" });
      }

      if (requesterId) {
        const check = await pool.query(
          "SELECT id, role, is_active FROM users WHERE id = $1",
          [requesterId]
        );
        if (check.rows.length === 0 || check.rows[0].role !== "superior_admin" || !check.rows[0].is_active) {
          return res.status(403).json({
            error: "Only authorized Superior Admins can perform this action.",
            message: "Only authorized Superior Admins can perform this action.",
          });
        }
      }

      const updatedUser = await superiorDao.activateUser(id);
      return res.status(200).json({
        message: "User activated successfully.",
        userId: id,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error activating user:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to activate user account",
        message: error.message || "Failed to activate user account",
      });
    }
  },

  // PUT /api/superior/users/:id - Edit user basic details
  async editUser(req, res) {
    try {
      const { id } = req.params;
      const { superior_admin_id, name, email, designation, department } = req.body || {};
      const requesterId = superior_admin_id || req.user?.id;

      if (!id) {
        return res.status(400).json({ error: "User ID parameter is required", message: "User ID parameter is required" });
      }

      if (requesterId) {
        const check = await pool.query(
          "SELECT id, role, is_active FROM users WHERE id = $1",
          [requesterId]
        );
        if (check.rows.length === 0 || check.rows[0].role !== "superior_admin" || !check.rows[0].is_active) {
          return res.status(403).json({
            error: "Only authorized Superior Admins can perform this action.",
            message: "Only authorized Superior Admins can perform this action.",
          });
        }
      }

      if (name !== undefined && !name.trim()) {
        return res.status(400).json({ error: "Name cannot be empty", message: "Name cannot be empty" });
      }

      if (email !== undefined && !email.trim()) {
        return res.status(400).json({ error: "Email cannot be empty", message: "Email cannot be empty" });
      }

      const updatedUser = await superiorDao.editUser(id, { name, email, designation, department });
      return res.status(200).json({
        message: "User details updated successfully.",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user details:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to update user details",
        message: error.message || "Failed to update user details",
      });
    }
  },

  // DELETE /api/superior/users/:id - Delete user safety guard
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const { superior_admin_id } = req.body || {};
      const requesterId = superior_admin_id || req.user?.id;

      if (!id) {
        return res.status(400).json({ error: "User ID parameter is required", message: "User ID parameter is required" });
      }

      if (requesterId) {
        const check = await pool.query(
          "SELECT id, role, is_active FROM users WHERE id = $1",
          [requesterId]
        );
        if (check.rows.length === 0 || check.rows[0].role !== "superior_admin" || !check.rows[0].is_active) {
          return res.status(403).json({
            error: "Only authorized Superior Admins can perform this action.",
            message: "Only authorized Superior Admins can perform this action.",
          });
        }
      }

      await superiorDao.deleteUser(id);
      return res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
      console.error("Error deleting user:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to delete user",
        message: error.message || "Failed to delete user",
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
      const { name, team_admin_id, initial_member_ids, superior_admin_id } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Team name is required", message: "Team name is required" });
      }

      if (superior_admin_id) {
        const check = await pool.query(
          "SELECT id, role, is_active FROM users WHERE id = $1",
          [superior_admin_id]
        );
        if (check.rows.length === 0 || check.rows[0].role !== "superior_admin" || !check.rows[0].is_active) {
          return res.status(403).json({
            error: "Only authorized Superior Admins can perform this action.",
            message: "Only authorized Superior Admins can perform this action.",
          });
        }
      }

      const team = await superiorDao.createTeam({
        name,
        team_admin_id,
        initial_member_ids,
        superior_admin_id,
      });
      return res.status(201).json({
        message: "Team created successfully",
        team,
      });
    } catch (error) {
      console.error("Error creating team:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to create team",
        message: error.message || "Failed to create team",
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
      const { superior_admin_id } = req.body || {};
      const requesterId = superior_admin_id || req.user?.id;

      if (!id) {
        return res.status(400).json({ error: "Team ID is required", message: "Team ID is required" });
      }

      if (requesterId) {
        const check = await pool.query(
          "SELECT id, role, is_active FROM users WHERE id = $1",
          [requesterId]
        );
        if (check.rows.length === 0 || check.rows[0].role !== "superior_admin" || !check.rows[0].is_active) {
          return res.status(403).json({
            error: "Only authorized Superior Admins can perform this action.",
            message: "Only authorized Superior Admins can perform this action.",
          });
        }
      }

      const team = await superiorDao.deactivateTeam(id);
      return res.status(200).json({
        message: "Team deactivated successfully.",
        team,
      });
    } catch (error) {
      console.error("Error deactivating team:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to deactivate team",
        message: error.message || "Failed to deactivate team",
      });
    }
  },

  // PUT /api/superior/teams/:id/activate
  async activateTeam(req, res) {
    try {
      const { id } = req.params;
      const { superior_admin_id } = req.body || {};
      const requesterId = superior_admin_id || req.user?.id;

      if (!id) {
        return res.status(400).json({ error: "Team ID is required", message: "Team ID is required" });
      }

      if (requesterId) {
        const check = await pool.query(
          "SELECT id, role, is_active FROM users WHERE id = $1",
          [requesterId]
        );
        if (check.rows.length === 0 || check.rows[0].role !== "superior_admin" || !check.rows[0].is_active) {
          return res.status(403).json({
            error: "Only authorized Superior Admins can perform this action.",
            message: "Only authorized Superior Admins can perform this action.",
          });
        }
      }

      const team = await superiorDao.activateTeam(id);
      return res.status(200).json({
        message: "Team activated successfully.",
        team,
      });
    } catch (error) {
      console.error("Error activating team:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to activate team",
        message: error.message || "Failed to activate team",
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

  // =========================================================================
  // TEAM LEAD & ROLE MANAGEMENT CONTROLLERS
  // =========================================================================

  // PUT /api/superior/users/:id/promote-team-lead
  async promoteTeamLead(req, res) {
    try {
      const { id } = req.params;
      const { team_id, remove_previous_lead_permission } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "User ID parameter is required" });
      }

      if (!team_id) {
        return res.status(400).json({ error: "team_id is required to promote to Team Lead" });
      }

      const loggedInUserId = req.user?.id;
      if (loggedInUserId && String(loggedInUserId) === String(id)) {
        return res.status(403).json({ error: "You cannot change your own role or team lead status" });
      }

      const result = await superiorDao.promoteUserToTeamLead({
        userId: id,
        teamId: team_id,
        removePreviousLeadPermission: remove_previous_lead_permission !== false,
        performedBy: loggedInUserId,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error promoting user to team lead:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to promote user to team lead",
        message: error.message || "Failed to promote user to team lead",
      });
    }
  },

  // PUT /api/superior/users/:id/demote-team-lead
  async demoteTeamLead(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "User ID parameter is required", message: "User ID parameter is required" });
      }

      const loggedInUserId = req.user?.id;
      if (loggedInUserId && String(loggedInUserId) === String(id)) {
        return res.status(403).json({ error: "You cannot change your own role or team lead status", message: "You cannot change your own role or team lead status" });
      }

      const result = await superiorDao.demoteTeamLead({
        userId: id,
        performedBy: loggedInUserId,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error demoting team lead to employee:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to demote team lead",
        message: error.message || "Failed to demote team lead",
      });
    }
  },

  // PUT /api/superior/users/:id/role
  async changeUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role, team_id, remove_previous_lead_permission } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "User ID parameter is required", message: "User ID parameter is required" });
      }

      if (!role) {
        return res.status(400).json({ error: "Role is required", message: "Role is required" });
      }

      const loggedInUserId = req.user?.id;
      if (loggedInUserId && String(loggedInUserId) === String(id)) {
        return res.status(403).json({ error: "You cannot change your own role", message: "You cannot change your own role" });
      }

      const result = await superiorDao.changeUserRole({
        userId: id,
        newRole: role,
        teamId: team_id,
        removePreviousLeadPermission: remove_previous_lead_permission !== false,
        performedBy: loggedInUserId,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error changing user role:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to change user role",
        message: error.message || "Failed to change user role",
      });
    }
  },

  // PUT /api/superior/teams/:id/team-lead
  async assignTeamLead(req, res) {
    try {
      const { id } = req.params;
      const { user_id, team_lead_user_id, remove_previous_lead_permission, superior_admin_id } = req.body || {};
      const targetUserId = team_lead_user_id || user_id;

      if (!id) {
        return res.status(400).json({ error: "Team ID parameter is required", message: "Team ID parameter is required" });
      }

      if (!targetUserId) {
        return res.status(400).json({ error: "User ID is required", message: "User ID is required" });
      }

      const result = await superiorDao.assignTeamLeadToTeam({
        teamId: id,
        userId: targetUserId,
        removePreviousLeadPermission: remove_previous_lead_permission !== false,
        performedBy: superior_admin_id || req.user?.id,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error assigning team in-charge to team:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to assign team in-charge",
        message: error.message || "Failed to assign team in-charge",
      });
    }
  },

  // DELETE /api/superior/teams/:id/team-lead
  async removeTeamLead(req, res) {
    try {
      const { id } = req.params;
      const { superior_admin_id } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "Team ID parameter is required", message: "Team ID parameter is required" });
      }

      const result = await superiorDao.removeTeamLeadFromTeam({
        teamId: id,
        performedBy: superior_admin_id || req.user?.id,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error removing team in-charge from team:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to remove team in-charge",
        message: error.message || "Failed to remove team in-charge",
      });
    }
  },

  // GET /api/superior/team-incharge-candidates - Active employees & team admins eligible for in-charge
  async getTeamInchargeCandidates(req, res) {
    try {
      const { team_id, search } = req.query;
      const result = await superiorDao.searchTeamInchargeCandidates(team_id || null, search || "");
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching team incharge candidates:", error);
      return res.status(500).json({
        error: "Failed to fetch team incharge candidates",
        message: error.message,
      });
    }
  },

  // GET /api/superior/team-lead-leave-requests - Get leave requests submitted by Team Leads
  async getTeamLeadLeaveRequests(req, res) {
    try {
      const superiorAdminId = req.query.superior_admin_id || req.user?.id || null;
      const requests = await superiorDao.getTeamLeadLeaveRequests(superiorAdminId);
      return res.status(200).json({
        message: "Team lead leave requests retrieved successfully",
        count: requests.length,
        data: requests,
      });
    } catch (error) {
      console.error("Error fetching team lead leave requests:", error);
      return res.status(500).json({
        error: "Failed to fetch team lead leave requests",
        details: error.message,
      });
    }
  },

  // GET /api/superior/unassigned-employees - Active employees without a team
  async getUnassignedEmployees(req, res) {
    try {
      const search = req.query.search || "";
      const employees = await superiorDao.getUnassignedEmployees(search);
      return res.status(200).json({
        count: employees.length,
        data: employees,
      });
    } catch (error) {
      console.error("Error fetching unassigned employees:", error);
      return res.status(500).json({
        error: "Failed to fetch unassigned employees",
        message: error.message,
      });
    }
  },

  // GET /api/superior/teams/:id/members - Fetch members of a team
  async getTeamMembers(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          error: "Team ID parameter is required",
          message: "Team ID parameter is required",
        });
      }
      const result = await superiorDao.getTeamMembers(id);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching team members:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to fetch team members",
        message: error.message || "Failed to fetch team members",
      });
    }
  },

  // GET /api/superior/team-member-candidates?team_id=TEAM_ID&search=TEXT
  async getTeamMemberCandidates(req, res) {
    try {
      const teamId = req.query.team_id;
      const search = req.query.search || "";
      const result = await superiorDao.searchTeamMemberCandidates(teamId, search);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error searching team member candidates:", error);
      return res.status(500).json({
        error: "Failed to search team member candidates",
        message: error.message,
      });
    }
  },

  // PUT /api/superior/teams/:id/members/:userId - Add or move member to team
  async addOrMoveTeamMember(req, res) {
    try {
      const { id, userId } = req.params;
      const { superior_admin_id, confirm_move } = req.body || {};

      if (superior_admin_id) {
        const check = await pool.query(
          "SELECT id, role, is_active FROM users WHERE id = $1",
          [superior_admin_id]
        );
        if (check.rows.length === 0 || check.rows[0].role !== "superior_admin" || !check.rows[0].is_active) {
          return res.status(403).json({
            error: "Only authorized Superior Admins can perform this action.",
            message: "Only authorized Superior Admins can perform this action.",
          });
        }
      }

      const result = await superiorDao.addOrMoveTeamMember({
        teamId: id,
        userId,
        superiorAdminId: superior_admin_id,
        confirmMove: Boolean(confirm_move),
      });
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error adding/moving team member:", error);
      const status = error.statusCode || 500;
      if (status === 409) {
        return res.status(409).json({
          error: error.message,
          message: error.message,
          current_team_name: error.current_team_name,
          requiresConfirmation: true,
        });
      }
      return res.status(status).json({
        error: error.message || "Failed to add/move team member",
        message: error.message || "Failed to add/move team member",
      });
    }
  },

  // DELETE /api/superior/teams/:id/members/:userId - Remove member from team
  async removeTeamMember(req, res) {
    try {
      const { id, userId } = req.params;
      const superiorAdminId = req.body?.superior_admin_id || req.query?.superior_admin_id;

      if (superiorAdminId) {
        const check = await pool.query(
          "SELECT id, role, is_active FROM users WHERE id = $1",
          [superiorAdminId]
        );
        if (check.rows.length === 0 || check.rows[0].role !== "superior_admin" || !check.rows[0].is_active) {
          return res.status(403).json({
            error: "Only authorized Superior Admins can perform this action.",
            message: "Only authorized Superior Admins can perform this action.",
          });
        }
      }

      const result = await superiorDao.removeMemberFromTeam({
        teamId: id,
        userId,
        superiorAdminId,
      });
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error removing team member:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to remove team member",
        message: error.message || "Failed to remove team member",
      });
    }
  },
};
