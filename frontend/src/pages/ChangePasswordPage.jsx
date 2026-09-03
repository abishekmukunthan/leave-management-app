import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, Lock, AlertCircle, LogOut, ArrowRight } from "lucide-react";
import { getStoredUser, updateStoredUser, clearStoredUser } from "../services/auth";
import { changePassword as changePasswordApi } from "../services/api";
import { useLeave } from "../context/useLeave";

export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { showToast } = useLeave();
  const user = getStoredUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignOut = () => {
    clearStoredUser();
    navigate("/login", { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!currentPassword) {
      setErrorMsg("Please enter your current password.");
      return;
    }
    if (!newPassword) {
      setErrorMsg("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg("New password cannot be the same as your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirm password do not match.");
      return;
    }

    if (!user?.id) {
      setErrorMsg("User session not found. Please log in again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await changePasswordApi(user.id, currentPassword, newPassword);
      
      // Update stored user in localStorage
      updateStoredUser({ must_change_password: false });

      showToast(response.message || "Password changed successfully!", "success");

      // Redirect to correct dashboard based on role
      const updatedUser = getStoredUser();
      if (updatedUser?.role === "superior_admin") {
        navigate("/superior", { replace: true });
      } else if (updatedUser?.role === "team_admin" || updatedUser?.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Error changing password:", err);
      setErrorMsg(err.message || "Failed to change password. Please check your current password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: "480px" }}>
        {/* Header */}
        <div className="login-header">
          <div
            className="login-brand-icon"
            style={{ background: "#EEF2FF", color: "#4F46E5", borderColor: "#C7D2FE" }}
          >
            <ShieldCheck size={28} strokeWidth={2.5} />
          </div>
          <h2>Force Password Change</h2>
          <p>
            Welcome, <strong>{user?.name || "User"}</strong>! You must change your temporary password before accessing the portal.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="form-error-alert" style={{ marginBottom: "1.25rem" }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="current_password">
              Current / Temporary Password
            </label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                id="current_password"
                type={showCurrent ? "text" : "password"}
                className="form-input"
                placeholder="Enter current temporary password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new_password">
              New Password
            </label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                id="new_password"
                type={showNew ? "text" : "password"}
                className="form-input"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.25rem", display: "block" }}>
              Must be at least 8 characters and different from current password.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm_password">
              Confirm New Password
            </label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                id="confirm_password"
                type={showConfirm ? "text" : "password"}
                className="form-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="primary-btn login-submit-btn"
            disabled={isSubmitting}
            style={{ marginTop: "0.5rem" }}
          >
            {isSubmitting ? (
              <span>Updating Password...</span>
            ) : (
              <>
                <span>Update Password & Continue</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer Sign Out */}
        <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #E2E8F0", textAlign: "center" }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleSignOut}
            style={{ width: "100%", justifyContent: "center", gap: "0.5rem" }}
          >
            <LogOut size={16} />
            <span>Sign Out & Return to Login</span>
          </button>
        </div>
      </div>
    </div>
  );
};
