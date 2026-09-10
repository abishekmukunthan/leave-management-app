import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CalendarCheck, ArrowRight, Shield, AlertCircle, Eye, EyeOff, Lock, User, Info } from "lucide-react";
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
  const location = useLocation();
  const { showToast } = useLeave();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(() => {
    try {
      const sessionMsg = window.sessionStorage?.getItem("leaveease_session_expired_message");
      if (sessionMsg) {
        window.sessionStorage.removeItem("leaveease_session_expired_message");
        return sessionMsg;
      }
    } catch {
      // Ignore storage errors
    }
    return location.state?.message || "";
  });

  const showDemoCredentials = import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === "true";

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

      // Store authenticated user and JWT token in configured storage
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
    if (!showDemoCredentials) return;
    setUsername(demoUsername);
    setPassword("Password@123");
    setErrorMsg("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255, 255, 255, 0.98)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          padding: "2.25rem 2rem",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              marginBottom: "0.75rem",
              boxShadow: "0 8px 16px -4px rgba(79, 70, 229, 0.4)",
            }}
          >
            <CalendarCheck size={24} strokeWidth={2.5} />
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.025em",
              margin: "0 0 0.25rem 0",
            }}
          >
            LeaveEase
          </h1>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1e293b", margin: "0.5rem 0 0.25rem 0" }}>
            Sign In
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>
            Sign in to access your leave management portal
          </p>
        </div>

        {/* Error Notification Banner */}
        {errorMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.6rem",
              padding: "0.75rem 0.9rem",
              borderRadius: "8px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: "0.8125rem",
              marginBottom: "1.25rem",
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit}>
          {/* Username Input */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="login-username"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "0.35rem",
              }}
            >
              Username or Email
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  display: "flex",
                }}
              >
                <User size={16} />
              </span>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex.morgan"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.75rem 0.65rem 2.25rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.875rem",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="login-password"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "0.35rem",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  display: "flex",
                }}
              >
                <Lock size={16} />
              </span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "0.65rem 2.25rem 0.65rem 2.25rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.875rem",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "#94a3b8",
                  display: "flex",
                }}
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

          {/* Demo Helper Section or Production Info */}
          {showDemoCredentials ? (
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
          ) : (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "0.75rem 0.9rem",
                borderRadius: "8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8125rem",
                color: "#64748b",
                textAlign: "left",
              }}
            >
              <Info size={16} color="#6366f1" style={{ flexShrink: 0 }} />
              <span>Please contact your system administrator for login credentials.</span>
            </div>
          )}

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
