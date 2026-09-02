import { useLeave } from "../context/useLeave";
import { Link } from "react-router-dom";
import {
  Building2,
  Mail,
  BarChart3,
  Plus,
  Phone,
  Calendar,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import { isSuperiorAdmin } from "../services/auth";

export const EmployeeProfilePage = () => {
  const { currentUser, loggedInUser } = useLeave();

  const user = loggedInUser || currentUser;
  const isSuperior = isSuperiorAdmin(user);
  const balances = Object.entries(currentUser.leaveBalances);

  return (
    <div className="profile-page-container">
      {/* Profile Header Hero Card */}
      <div className="profile-hero-card">
        <div className="profile-hero-content">
          <div className="profile-avatar-large">
            {(user.name || user.fullName || "U")
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div className="profile-hero-text">
            <div className="profile-title-row">
              <h2 className="profile-name">{user.name || user.fullName}</h2>
              <span className="profile-emp-badge">{user.id?.slice(0, 12)}</span>
              <span className="profile-status-active">● Active Account</span>
            </div>
            <p className="profile-designation-dept">
              {user.designation || user.role} • {user.department || user.team || "General"} Team
            </p>
            <p className="profile-contact-line">
              {user.email} &nbsp;|&nbsp; {currentUser.phone || "+1 (555) 019-2834"}
            </p>
          </div>
        </div>

        {!isSuperior && (
          <div className="profile-hero-actions">
            <Link to="/apply-leave" className="primary-btn" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Apply for Leave</span>
            </Link>
          </div>
        )}
      </div>

      <div className="profile-grid">
        {/* Employment & Organization Details */}
        <div className="profile-card">
          <div className="profile-card-header">
            <Building2 size={18} className="text-blue" />
            <h3>Employment & Organization Details</h3>
          </div>
          <div className="profile-info-list">
            <div className="profile-info-row">
              <span className="info-label">Employee ID</span>
              <span className="info-value font-mono font-bold">{user.id?.slice(0, 12)}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Full Name</span>
              <span className="info-value font-semibold">{user.name || user.fullName}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Designation / Role</span>
              <span className="info-value">{user.designation || user.role}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Department / Team</span>
              <span className="info-value">{user.department || user.team || "Engineering"}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Lead / Manager</span>
              <span className="info-value font-medium" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <User size={13} /> {currentUser.teamLead || "Priya Fernando"}
              </span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Employment Type</span>
              <span className="info-value">{currentUser.employmentType || "Permanent Full-Time"}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Date of Joining</span>
              <span className="info-value" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <Calendar size={13} /> {currentUser.dateOfJoining || "Jan 15, 2024"}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="profile-card">
          <div className="profile-card-header">
            <Mail size={18} className="text-blue" />
            <h3>Contact & Work Logistics</h3>
          </div>
          <div className="profile-info-list">
            <div className="profile-info-row">
              <span className="info-label">Work Email</span>
              <span className="info-value font-mono" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <Mail size={13} /> {user.email}
              </span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Phone Number</span>
              <span className="info-value" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <Phone size={13} /> {currentUser.phone || "+1 (555) 019-2834"}
              </span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Work Location</span>
              <span className="info-value" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <MapPin size={13} /> HQ - Building B, Floor 4 (Hybrid)
              </span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Standard Work Hours</span>
              <span className="info-value" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <Clock size={13} /> 09:00 AM – 06:00 PM (Mon - Fri)
              </span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Time Zone</span>
              <span className="info-value">UTC +05:30 (IST)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Balance Quotas Section */}
      {!isSuperior && (
        <div className="profile-card leave-balance-profile-card">
          <div className="profile-card-header">
            <BarChart3 size={18} className="text-blue" />
            <div>
              <h3>Annual Leave Balances & Quota Entitlements</h3>
              <p className="card-header-sub" style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Calculated for current fiscal calendar. Unused annual leaves roll over up to 5 days.
              </p>
            </div>
          </div>

          <div className="balance-grid" style={{ marginTop: "1rem" }}>
            {balances.map(([key, item]) => {
              const remaining = item.total - item.used;
              const percentageUsed = Math.round((item.used / item.total) * 100);
              const isHours = key === "timePermission";

              return (
                <div key={key} className="balance-card">
                  <div className="balance-header">
                    <span className="balance-type">{item.name}</span>
                    <span className="counter-pill pill-blue">
                      {remaining} {isHours ? "hrs" : "days"} left
                    </span>
                  </div>

                  <div className="balance-values">
                    <span className="balance-available">{remaining}</span>
                    <span className="balance-total">/ {item.total} {isHours ? "Hours" : "Days"}</span>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-fill fill-annual"
                      style={{ width: `${percentageUsed}%` }}
                    ></div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "#64748b" }}>
                    <span>{item.used} {isHours ? "hrs" : "days"} used</span>
                    <span>{percentageUsed}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
