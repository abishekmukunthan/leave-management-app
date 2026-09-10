import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, Plus, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Navbar } from "./Navbar";
import { useLeave } from "../context/useLeave";
import { isSuperiorAdmin } from "../services/auth";

export const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toastMessage, currentUser, loggedInUser } = useLeave();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeUser = loggedInUser || currentUser;
  const isSuperior = isSuperiorAdmin(activeUser);

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
      case "/dashboard":
        return "Employee Dashboard";
      case "/apply-leave":
        return "Apply for Leave";
      case "/my-leaves":
        return "My Leave Applications";
      case "/substitute-requests":
        return "Substitute Duty Requests";
      case "/admin":
        return "Team Approvals";
      case "/superior":
        return "Superior Admin Monitoring";
      case "/profile":
        return "My Profile & Quotas";
      default:
        return "LeaveEase Portal";
    }
  };

  const getPageSubtitle = () => {
    switch (location.pathname) {
      case "/":
      case "/dashboard":
        return `Welcome back, ${activeUser.name || activeUser.fullName}. Here is your active leave summary.`;
      case "/apply-leave":
        return "Submit a new leave application or short time permission request.";
      case "/my-leaves":
        return "Track real-time approval status and details for all your applied leaves.";
      case "/substitute-requests":
        return "Review and respond to colleague substitute requests delegated to you.";
      case "/admin":
        return "Review, approve, and manage leave requests for your team members.";
      case "/superior":
        return "Organization-wide real-time leave monitoring and team attendance metrics.";
      case "/profile":
        return "View your account details, department assignment, and annual leave quotas.";
      default:
        return "";
    }
  };

  const renderToastIcon = (type) => {
    if (type === "success") return <CheckCircle2 size={16} />;
    if (type === "warning") return <AlertCircle size={16} />;
    return <Info size={16} />;
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
              <Menu size={20} />
            </button>
            <div className="page-heading">
              <h1 className="page-title">{getPageTitle()}</h1>
              <p className="page-subtitle">{getPageSubtitle()}</p>
            </div>
          </div>

          <div className="header-right">
            {!isSuperior && (
              <button
                className="quick-apply-btn"
                onClick={() => navigate("/apply-leave")}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Apply Leave</span>
              </button>
            )}

            <div className="header-user-badge" onClick={() => navigate("/profile")}>
              <div className="user-initials">
                {(activeUser.name || activeUser.fullName || "User")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="user-meta">
                <span className="user-name-header">
                  {activeUser.name || activeUser.fullName}
                </span>
                <span className="user-badge-tag">
                  {activeUser.department || activeUser.team || "Employee"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className={`toast-notification toast-${toastMessage.type}`}>
            <span className="toast-icon">
              {renderToastIcon(toastMessage.type)}
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
