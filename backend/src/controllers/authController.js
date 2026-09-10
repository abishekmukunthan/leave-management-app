import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authDao } from "../dao/authDao.js";

const JWT_SECRET = process.env.JWT_SECRET || "leave_management_jwt_secret_2026";

export const authController = {
  // POST /api/auth/login
  async login(req, res) {
    try {
      const { username, password } = req.body || {};

      if (!username || !password) {
        return res.status(400).json({
          error: "Username and password are required",
        });
      }

      // Find user by username or email
      const user = await authDao.findUserByUsername(username);

      if (!user) {
        return res.status(401).json({
          error: "Invalid username or password",
        });
      }

      // Check if user is active
      if (user.is_active === false) {
        return res.status(403).json({
          error: "User account is inactive. Please contact system administrator.",
        });
      }

      // Verify password with bcrypt
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: "Invalid username or password",
        });
      }

      // Sign JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Exclude password from returned user object
      const { password: _pwd, ...safeUserData } = user;
      safeUserData.permissions = Array.isArray(user.permissions) ? user.permissions : [];

      return res.status(200).json({
        message: "Login successful",
        token,
        user: safeUserData,
      });
    } catch (error) {
      console.error("Error during auth login:", error);
      return res.status(500).json({
        error: "Internal server error during login",
        details: error.message,
      });
    }
  },

  // POST /api/auth/change-password
  async changePassword(req, res) {
    try {
      const { user_id, current_password, new_password } = req.body || {};

      if (!user_id || !current_password || !new_password) {
        return res.status(400).json({
          message: "user_id, current_password, and new_password are required",
        });
      }

      // 1. Fetch user from DB
      const user = await authDao.findUserWithPasswordById(user_id);
      if (!user || user.is_active === false) {
        return res.status(400).json({
          message: "User not found or account is inactive",
        });
      }

      // 2. Verify current password
      const isCurrentValid = bcrypt.compareSync(current_password, user.password);
      if (!isCurrentValid) {
        return res.status(400).json({
          message: "Current password is incorrect",
        });
      }

      // 3. Validate new password length >= 8
      if (typeof new_password !== "string" || new_password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters",
        });
      }

      // 4. Ensure new password is not identical to current password
      if (current_password === new_password) {
        return res.status(400).json({
          message: "New password cannot be the same as current password",
        });
      }

      // 5. Hash new password and update user record
      const hashedNewPassword = bcrypt.hashSync(new_password, 10);
      await authDao.updatePassword(user_id, hashedNewPassword);

      return res.status(200).json({
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      return res.status(500).json({
        message: "Failed to change password",
        details: error.message,
      });
    }
  },
};
