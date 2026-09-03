import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarDays,
  UserCheck,
  ShieldCheck,
  BarChart3,
  User,
  Users,
  Sliders,
  LogOut,
  CalendarCheck,
} from "lucide-react";
import { useLeave } from "../context/useLeave";
import { clearStoredUser, isTeamAdmin, isSuperiorAdmin } from "../services/auth";

export const Navbar = () => {
  const { loggedInUser, currentUser } = useLeave();
  const navigate = useNavigate();

  // Prefer loggedInUser from localStorage, fall back to context mock user
  const displayName = loggedInUser ? loggedInUser.name : currentUser.fullName;
  const displayRole = loggedInUser ? (loggedInUser.designation || loggedInUser.role) : currentUser.designation;
  const displayTeam = loggedInUser ? (loggedInUser.team_name || loggedInUser.department || "") : "";
  const initials = displayName.split(" ").map((n) => n[0]).join("");

  const userIsSuperiorAdmin = loggedInUser ? isSuperiorAdmin(loggedInUser) : false;
  const userIsTeamAdmin = loggedInUser ? isTeamAdmin(loggedInUser) : false;
  const isNormalEmployee = !userIsSuperiorAdmin && !userIsTeamAdmin;

  const handleSignOut = () => {
    clearStoredUser();
    navigate("/login");
  };

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <CalendarCheck size={22} strokeWidth={2.5} />
        </div>
        <div className="brand-text">
          <h2>LeaveEase</h2>
          <span>Leave Management</span>
        </div>
      </div>

      <div className="sidebar-section-title">
        {userIsSuperiorAdmin ? "EXECUTIVE PORTAL" : "MAIN NAVIGATION"}
      </div>

      <nav className="sidebar-nav">
        {/* Superior Admin Dashboard, User Management & Configuration Links */}
        {userIsSuperiorAdmin && (
          <>
            <NavLink
              to="/superior"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
              end
            >
              <span className="nav-icon">
                <BarChart3 size={18} strokeWidth={2} />
              </span>
              <span className="nav-label">Superior Dashboard</span>
            </NavLink>
            <NavLink
              to="/superior/users"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            >
              <span className="nav-icon">
                <Users size={18} strokeWidth={2} />
              </span>
              <span className="nav-label">User Management</span>
            </NavLink>
            <NavLink
              to="/superior/configuration"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            >
              <span className="nav-icon">
                <Sliders size={18} strokeWidth={2} />
              </span>
              <span className="nav-label">Configuration</span>
            </NavLink>
          </>
        )}

        {/* Team Admin Dashboard Link */}
        {userIsTeamAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
          >
            <span className="nav-icon">
              <ShieldCheck size={18} strokeWidth={2} />
            </span>
            <span className="nav-label">Team Admin Dashboard</span>
          </NavLink>
        )}

        {/* Regular Employee & Team Admin Personal Navigation */}
        {!userIsSuperiorAdmin && (
          <>
            {isNormalEmployee && (
              <NavLink
                to="/"
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
                end
              >
                <span className="nav-icon">
                  <LayoutDashboard size={18} strokeWidth={2} />
                </span>
                <span className="nav-label">Dashboard</span>
              </NavLink>
            )}

            <NavLink
              to="/apply-leave"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            >
              <span className="nav-icon">
                <CalendarPlus size={18} strokeWidth={2} />
              </span>
              <span className="nav-label">Apply Leave</span>
            </NavLink>

            <NavLink
              to="/my-leaves"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            >
              <span className="nav-icon">
                <CalendarDays size={18} strokeWidth={2} />
              </span>
              <span className="nav-label">My Leaves</span>
            </NavLink>

            <NavLink
              to="/substitute-requests"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            >
              <span className="nav-icon">
                <UserCheck size={18} strokeWidth={2} />
              </span>
              <span className="nav-label">Substitute Requests</span>
            </NavLink>

            <NavLink
              to="/calendar"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            >
              <span className="nav-icon">
                <CalendarDays size={18} strokeWidth={2} />
              </span>
              <span className="nav-label">Calendar</span>
            </NavLink>
          </>
        )}

        <div className="sidebar-section-title">ACCOUNT</div>

        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
        >
          <span className="nav-icon">
            <User size={18} strokeWidth={2} />
          </span>
          <span className="nav-label">Profile</span>
        </NavLink>
      </nav>

      {/* User Footer Profile & Sign Out */}
      <div className="sidebar-footer">
        <div className="user-profile-chip" onClick={() => navigate("/profile")}>
          <div className="avatar-circle">
            {initials}
          </div>
          <div className="user-details">
            <span className="user-name">{displayName}</span>
            <span className="user-role">{displayRole}{displayTeam ? ` • ${displayTeam}` : ""}</span>
          </div>
        </div>
        <button
          className="logout-button"
          onClick={handleSignOut}
          title="Sign Out"
        >
          <LogOut size={16} strokeWidth={2} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
