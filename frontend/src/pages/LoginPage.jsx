import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEMO_LOGIN_USERS, storeUser } from "../services/auth";
import { useLeave } from "../context/useLeave";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { showToast } = useLeave();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
  };

  const handleContinue = () => {
    if (!selectedUserId) return;
    const user = DEMO_LOGIN_USERS.find((u) => u.id === selectedUserId);
    if (!user) return;

    setIsLoading(true);
    storeUser(user);

    setTimeout(() => {
      showToast(`Welcome, ${user.name}! Logged in as ${user.role === "admin" ? "Admin" : "Employee"}.`, "success");
      setIsLoading(false);
      navigate(user.role === "admin" ? "/admin" : "/");
    }, 500);
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: "480px" }}>
        {/* Header */}
        <div className="login-header">
          <div className="login-brand-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h2>Welcome to LeaveEase</h2>
          <p>Select a demo account to explore the portal</p>
        </div>

        {/* User Selection Cards */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
            Choose Demo Account
          </p>

          {DEMO_LOGIN_USERS.map((user) => {
            const isSelected = selectedUserId === user.id;
            const initials = user.name.split(" ").map((n) => n[0]).join("");
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectUser(user.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 1.125rem",
                  border: `2px solid ${isSelected ? "#6366f1" : "#e2e8f0"}`,
                  borderRadius: "12px",
                  background: isSelected ? "#eef2ff" : "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.18s ease",
                  boxShadow: isSelected ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
                  width: "100%",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: user.avatarColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.9375rem" }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                    {user.designation} · {user.department}
                  </div>
                </div>

                {/* Role Badge */}
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.6rem",
                    borderRadius: 9999,
                    background: user.role === "admin" ? "#f3e8ff" : "#e0f2fe",
                    color: user.role === "admin" ? "#7e22ce" : "#0369a1",
                    flexShrink: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {user.role === "admin" ? "Admin" : "Employee"}
                </span>

                {/* Selected indicator */}
                {isSelected && (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "#6366f1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}

          {/* Continue Button */}
          <button
            type="button"
            className="primary-btn login-btn"
            disabled={!selectedUserId || isLoading}
            onClick={handleContinue}
            style={{ marginTop: "0.5rem", opacity: !selectedUserId ? 0.5 : 1 }}
          >
            {isLoading ? "Signing in..." : selectedUserId ? "Continue to Portal →" : "Select an Account First"}
          </button>

          {/* Footer note */}
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", margin: 0 }}>
            🔒 Demo environment — no real credentials required
          </p>
        </div>
      </div>
    </div>
  );
};
