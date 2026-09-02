import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Check, ArrowRight, Shield } from "lucide-react";
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

  const getRoleDisplay = (role) => {
    switch (role) {
      case "superior_admin":
        return { label: "Superior Admin", bg: "#fce7f3", color: "#be185d" };
      case "team_admin":
      case "admin":
        return { label: "Team Admin", bg: "#f3e8ff", color: "#7e22ce" };
      default:
        return { label: "Employee", bg: "#e0f2fe", color: "#0369a1" };
    }
  };

  const handleContinue = () => {
    if (!selectedUserId) return;
    const user = DEMO_LOGIN_USERS.find((u) => u.id === selectedUserId);
    if (!user) return;

    setIsLoading(true);
    storeUser(user);

    setTimeout(() => {
      const roleInfo = getRoleDisplay(user.role);
      showToast(`Welcome, ${user.name}! Logged in as ${roleInfo.label}.`, "success");
      setIsLoading(false);

      if (user.role === "superior_admin") {
        navigate("/superior");
      } else if (user.role === "team_admin" || user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    }, 400);
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: "520px" }}>
        {/* Header */}
        <div className="login-header">
          <div className="login-brand-icon">
            <CalendarCheck size={28} strokeWidth={2.5} />
          </div>
          <h2>Welcome to LeaveEase</h2>
          <p>Select a demo role account to explore the leave management portal</p>
        </div>

        {/* User Selection Cards */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
            Choose Demo Account
          </p>

          {DEMO_LOGIN_USERS.map((user) => {
            const isSelected = selectedUserId === user.id;
            const initials = user.name.split(" ").map((n) => n[0]).join("");
            const roleInfo = getRoleDisplay(user.role);

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectUser(user.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.875rem 1rem",
                  border: `2px solid ${isSelected ? "#4f46e5" : "#e2e8f0"}`,
                  borderRadius: "12px",
                  background: isSelected ? "#eef2ff" : "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.18s ease",
                  boxShadow: isSelected ? "0 0 0 3px rgba(79,70,229,0.15)" : "none",
                  width: "100%",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: user.avatarColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9375rem" }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {user.designation} · <span style={{ fontWeight: 600 }}>{user.department}</span>
                  </div>
                </div>

                {/* Role Badge */}
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.6rem",
                    borderRadius: 9999,
                    background: roleInfo.bg,
                    color: roleInfo.color,
                    flexShrink: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {roleInfo.label}
                </span>

                {/* Selected indicator */}
                {isSelected && (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#4f46e5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Check size={12} strokeWidth={3} color="#fff" />
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
            style={{
              marginTop: "0.5rem",
              opacity: !selectedUserId ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <span>{isLoading ? "Signing in..." : selectedUserId ? "Continue to Portal" : "Select an Account First"}</span>
            {!isLoading && selectedUserId && <ArrowRight size={15} />}
          </button>

          {/* Footer note */}
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
            <Shield size={12} />
            <span>Demo environment — role boundaries automatically applied</span>
          </p>
        </div>
      </div>
    </div>
  );
};
