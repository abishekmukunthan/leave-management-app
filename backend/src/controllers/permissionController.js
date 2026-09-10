import { permissionDao } from "../dao/permissionDao.js";

export const permissionController = {
  // 1. GET /api/superior/permissions
  async getAllPermissions(req, res) {
    try {
      const data = await permissionDao.getAllPermissions();
      return res.status(200).json({
        count: data.length,
        data,
      });
    } catch (error) {
      console.error("Error fetching permissions:", error);
      return res.status(500).json({
        error: "Failed to fetch permissions",
        details: error.message,
      });
    }
  },

  // 2. POST /api/superior/permissions
  async createPermission(req, res) {
    try {
      const { id, description, permission_type } = req.body || {};

      if (!id || typeof id !== "string" || !id.trim()) {
        return res.status(400).json({ error: "Permission ID is required." });
      }

      const trimmedId = id.trim();

      // Validation: Uppercase and only A-Z, 0-9, and underscores
      const idPattern = /^[A-Z0-9_]+$/;
      if (!idPattern.test(trimmedId)) {
        return res.status(400).json({
          error: "Permission ID must be uppercase and contain only letters (A-Z), numbers (0-9), and underscores (_).",
        });
      }

      if (!description || typeof description !== "string" || !description.trim()) {
        return res.status(400).json({ error: "Permission description is required." });
      }

      const newPerm = await permissionDao.createPermission({
        id: trimmedId,
        description: description.trim(),
        permission_type: permission_type || "LEAVE_APPROVAL",
      });

      return res.status(201).json({
        message: "Permission created successfully",
        data: newPerm,
      });
    } catch (error) {
      console.error("Error creating permission:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to create permission",
      });
    }
  },

  // 3. PUT /api/superior/permissions/:id
  async updatePermission(req, res) {
    try {
      const { id } = req.params;
      const { description, is_active } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "Permission ID parameter is required." });
      }

      const updated = await permissionDao.updatePermission(id, { description, is_active });
      return res.status(200).json({
        message: "Permission updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Error updating permission:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to update permission",
      });
    }
  },

  // 4. GET /api/superior/users/:id/permissions
  async getUserPermissions(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "User ID parameter is required." });
      }

      const permissions = await permissionDao.getUserPermissions(id);
      return res.status(200).json({
        user_id: id,
        permissions,
      });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      return res.status(500).json({
        error: "Failed to fetch user permissions",
        details: error.message,
      });
    }
  },

  // 5. PUT /api/superior/users/:id/permissions
  async updateUserPermissions(req, res) {
    try {
      const { id } = req.params;
      const { permission_ids, assigned_by } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "User ID parameter is required." });
      }

      if (!Array.isArray(permission_ids)) {
        return res.status(400).json({ error: "permission_ids must be an array of permission ID strings." });
      }

      const updatedList = await permissionDao.setUserPermissions(id, permission_ids, assigned_by);
      return res.status(200).json({
        message: "User permissions updated successfully",
        user_id: id,
        permissions: updatedList,
      });
    } catch (error) {
      console.error("Error updating user permissions:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to update user permissions",
      });
    }
  },

  // 6. GET /api/superior/teams/:id/approval-permission
  async getTeamApprovalPermission(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "Team ID parameter is required." });
      }

      const mapping = await permissionDao.getTeamApprovalPermission(id);
      if (!mapping) {
        return res.status(404).json({ error: "No approval permission mapping found for this team." });
      }

      return res.status(200).json({
        team_id: mapping.team_id,
        team_name: mapping.team_name,
        permission_id: mapping.permission_id,
        description: mapping.description,
      });
    } catch (error) {
      console.error("Error fetching team approval permission:", error);
      return res.status(500).json({
        error: "Failed to fetch team approval permission",
        details: error.message,
      });
    }
  },

  // 7. PUT /api/superior/teams/:id/approval-permission
  async updateTeamApprovalPermission(req, res) {
    try {
      const { id } = req.params;
      const { permission_id, created_by } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "Team ID parameter is required." });
      }

      if (!permission_id || typeof permission_id !== "string") {
        return res.status(400).json({ error: "permission_id string is required." });
      }

      const result = await permissionDao.setTeamApprovalPermission(id, permission_id, created_by);
      return res.status(200).json({
        message: "Team approval permission updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error updating team approval permission:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || "Failed to update team approval permission",
      });
    }
  },

  // 8. POST /api/superior/permissions/generate-team-permissions
  async generateTeamPermissions(req, res) {
    try {
      const superiorAdminId = req.body?.user_id || req.body?.assigned_by || null;
      const result = await permissionDao.generateMissingTeamPermissions(superiorAdminId);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error generating team permissions:", error);
      return res.status(500).json({
        error: "Failed to generate missing team permissions",
        details: error.message,
      });
    }
  },
};
