import { NavLink, useNavigate } from "react-router-dom";
import { useLeave } from "../context/useLeave";
import { clearStoredUser, isAdmin } from "../services/auth";

export const Navbar = () => {
  const { loggedInUser, currentUser } = useLeave();
  const navigate = useNavigate();

  // Prefer loggedInUser from localStorage, fall back to context mock user
  const displayName = loggedInUser ? loggedInUser.name : currentUser.fullName;
  const displayRole = loggedInUser ? loggedInUser.designation : currentUser.designation;
  const initials = displayName.split(" ").map((n) => n[0]).join("");
  const showAdmin = loggedInUser ? isAdmin(loggedInUser) : true;

  const handleSignOut = () => {
    clearStoredUser();
    navigate("/login");
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <path d="M8 14h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M16 14h.01"></path>
            <path d="M8 18h.01"></path>
            <path d="M12 18h.01"></path>
          </svg>
        </div>
        <div className="brand-text">
          <h2>LeaveEase</h2>
          <span>Leave Management</span>
        </div>
      </div>

      <div className="sidebar-section-title">MAIN NAVIGATION</div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
          end
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </span>
          <span className="nav-label">Dashboard</span>
        </NavLink>

        <NavLink
          to="/apply-leave"
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </span>
          <span className="nav-label">Apply Leave</span>
        </NavLink>

        <NavLink
          to="/my-leaves"
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </span>
          <span className="nav-label">My Leaves</span>
        </NavLink>

        <NavLink
          to="/substitute-requests"
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </span>
          <span className="nav-label">Substitute Requests</span>
        </NavLink>

        {/* Admin section — only shown to admin users */}
        {showAdmin && (
          <>
            <div className="sidebar-section-title">ADMINISTRATION</div>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            >
              <span className="nav-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </span>
              <span className="nav-label">Admin Dashboard</span>
            </NavLink>
          </>
        )}

        <div className="sidebar-section-title">ACCOUNT</div>

        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </span>
          <span className="nav-label">Profile</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-chip" onClick={() => navigate("/profile")}>
          <div className="avatar-circle">
            {initials}
          </div>
          <div className="user-details">
            <span className="user-name">{displayName}</span>
            <span className="user-role">{displayRole}</span>
          </div>
        </div>
        <button
          className="logout-button"
          onClick={handleSignOut}
          title="Sign Out"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
