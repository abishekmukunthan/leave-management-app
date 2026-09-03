import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, ArrowRight, Shield, AlertCircle, Eye, EyeOff, Lock, User } from "lucide-react";
import { storeUser } from "../services/auth";
import { loginUser } from "../services/api";
import { useLeave } from "../context/useLeave";

const DEMO_CREDENTIAL_HINTS = [
  { username: "alex.morgan", role: "Employee", team: "Engineering" },
  { username: "priya.fernando", role: "Team Lead", team: "Engineering" },
  { username: "nadia.perera", role: "Superior Admin", team: "Executive" },
];

export const LoginPage = () => {
  const navigate = useNavigate();
  const { showToast } = useLeave();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim()) {
      setErrorMsg("Please enter your username.");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginUser(username.trim(), password);
      const { user, token, message } = response;

      // Store authenticated user and JWT token in localStorage
      storeUser(user, token);

      showToast(message || `Welcome back, ${user.name}!`, "success");

      // Redirect based on forced password change requirement or user role
      if (user.must_change_password) {
        navigate("/change-password");
      } else if (user.role === "superior_admin") {
        navigate("/superior");
      } else if (user.role === "team_admin" || user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg(err.message || "Failed to authenticate. Please check username and password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoUsername) => {
    setUsername(demoUsername);
    setPassword("Password@123");
    setErrorMsg("");
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: "480px" }}>
        {/* Header */}
        <div className="login-header">
          <div className="login-brand-icon">
            <CalendarCheck size={28} strokeWidth={2.5} />
          </div>
          <h2>Sign In to LeaveEase</h2>
          <p>Enter your username and password to access the leave portal</p>
        </div>

        <form onSubmit={handleLoginSubmit} style={{ padding: "1.75rem" }}>
          {errorMsg && (
            <div className="form-error-alert" style={{ marginBottom: "1.25rem" }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="form-group" style={{ marginBottom: "1.15rem" }}>
            <label htmlFor="username" className="form-label required">
              Username or Email
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <User
                size={16}
                style={{ position: "absolute", left: "0.8rem", color: "#94a3b8", pointerEvents: "none" }}
              />
              <input
                id="username"
                type="text"
                className="form-input"
                style={{ paddingLeft: "2.4rem" }}
                placeholder="e.g. alex.morgan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="password" className="form-label required">
              Password
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Lock
                size={16}
                style={{ position: "absolute", left: "0.8rem", color: "#94a3b8", pointerEvents: "none" }}
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                style={{ paddingLeft: "2.4rem", paddingRight: "2.4rem" }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.2rem",
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="primary-btn login-btn"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "0.9375rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <span>{isLoading ? "Signing in..." : "Sign In"}</span>
            {!isLoading && <ArrowRight size={16} />}
          </button>

          {/* Quick Demo Helper Section */}
          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.65rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "#64748b",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Quick Demo Credentials (Password: Password@123)
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {DEMO_CREDENTIAL_HINTS.map((item) => (
                <button
                  key={item.username}
                  type="button"
                  onClick={() => handleFillDemo(item.username)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.45rem 0.75rem",
                    borderRadius: "8px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    fontSize: "0.75rem",
                    color: "#334155",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.background = "#f8fafc";
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#4f46e5" }}>{item.username}</span>
                  <span style={{ color: "#64748b" }}>
                    {item.role} ({item.team})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Security Badge */}
          <div
            style={{
              marginTop: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              fontSize: "0.75rem",
              color: "#94a3b8",
            }}
          >
            <Shield size={13} />
            <span>Encrypted authentication via bcrypt & JWT</span>
          </div>
        </form>
      </div>
    </div>
  );
};
