import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "./Navbar";
import { useLeave } from "../context/useLeave";

export const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toastMessage, currentUser } = useLeave();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
      case "/dashboard":
        return "Employee Dashboard";
      case "/apply-leave":
        return "Apply for Leave";
      case "/my-leaves":
        return "My Leave History";
      case "/substitute-requests":
        return "Substitute Duty Requests";
      case "/admin":
        return "Admin Approval Dashboard";
      case "/profile":
        return "Employee Profile";
      default:
        return "Leave Management System";
    }
  };

  const getPageSubtitle = () => {
    switch (location.pathname) {
      case "/":
      case "/dashboard":
        return `Welcome back, ${currentUser.fullName}. Here is your leave summary.`;
      case "/apply-leave":
        return "Submit a new leave application or time permission request.";
      case "/my-leaves":
        return "Track approval status and details for all your applied leaves.";
      case "/substitute-requests":
        return "Review and respond to colleagues requesting you as their substitute.";
      case "/admin":
        return "Manage and review team leave applications.";
      case "/profile":
        return "View your personal profile details, team information, and leave quotas.";
      default:
        return "";
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`sidebar-wrapper ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <Navbar />
      </div>

      {/* Main Content Area */}
      <div className="main-content-wrapper">
        {/* Top Header Bar */}
        <header className="top-header">
          <div className="header-left">
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="page-heading">
              <h1 className="page-title">{getPageTitle()}</h1>
              <p className="page-subtitle">{getPageSubtitle()}</p>
            </div>
          </div>

          <div className="header-right">
            <button
              className="quick-apply-btn"
              onClick={() => navigate("/apply-leave")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Apply Leave</span>
            </button>

            <div className="header-user-badge" onClick={() => navigate("/profile")}>
              <div className="user-initials">
                {currentUser.fullName.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="user-meta">
                <span className="user-name-header">{currentUser.fullName}</span>
                <span className="user-badge-tag">{currentUser.department}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className={`toast-notification toast-${toastMessage.type}`}>
            <span className="toast-icon">
              {toastMessage.type === "success" ? "✓" : "ℹ"}
            </span>
            <span>{toastMessage.message}</span>
          </div>
        )}

        {/* Page Content Body */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
