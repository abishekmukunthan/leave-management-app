import { useLeave } from "../context/useLeave";
import { Link } from "react-router-dom";

export const EmployeeProfilePage = () => {
  const { currentUser } = useLeave();

  const balances = Object.entries(currentUser.leaveBalances);

  return (
    <div className="profile-page-container">
      {/* Profile Header Hero Card */}
      <div className="profile-hero-card">
        <div className="profile-hero-content">
          <div className="profile-avatar-large">
            {currentUser.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div className="profile-hero-text">
            <div className="profile-title-row">
              <h2 className="profile-name">{currentUser.fullName}</h2>
              <span className="profile-emp-badge">{currentUser.id}</span>
              <span className="profile-status-active">● Active Full-Time</span>
            </div>
            <p className="profile-designation-dept">
              {currentUser.designation} • {currentUser.department} Team
            </p>
            <p className="profile-contact-line">
              📧 {currentUser.email} &nbsp;|&nbsp; 📱 {currentUser.phone}
            </p>
          </div>
        </div>

        <div className="profile-hero-actions">
          <Link to="/apply-leave" className="primary-btn">
            + Apply for Leave
          </Link>
        </div>
      </div>

      <div className="profile-grid">
        {/* Employment & Organization Details */}
        <div className="profile-card">
          <div className="profile-card-header">
            <span className="card-header-icon">🏢</span>
            <h3>Employment & Organization Information</h3>
          </div>
          <div className="profile-info-list">
            <div className="profile-info-row">
              <span className="info-label">Employee ID</span>
              <span className="info-value font-mono font-bold">{currentUser.id}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Full Name</span>
              <span className="info-value font-semibold">{currentUser.fullName}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Designation</span>
              <span className="info-value">{currentUser.designation}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Department</span>
              <span className="info-value">{currentUser.department}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Team Lead / Manager</span>
              <span className="info-value font-medium">👤 {currentUser.teamLead}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Employment Type</span>
              <span className="info-value">
                <span className="pill-employment">{currentUser.employmentType}</span>
              </span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Date of Joining</span>
              <span className="info-value">📅 {currentUser.dateOfJoining}</span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="profile-card">
          <div className="profile-card-header">
            <span className="card-header-icon">📬</span>
            <h3>Contact & Work Details</h3>
          </div>
          <div className="profile-info-list">
            <div className="profile-info-row">
              <span className="info-label">Work Email</span>
              <span className="info-value font-mono">{currentUser.email}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Phone Number</span>
              <span className="info-value">{currentUser.phone}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Work Location</span>
              <span className="info-value">HQ - Building B, Floor 4 (Hybrid)</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Standard Work Hours</span>
              <span className="info-value">09:00 AM – 06:00 PM (Mon - Fri)</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">Time Zone</span>
              <span className="info-value">UTC +05:30 (IST)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Balance Quotas Section */}
      <div className="profile-card leave-balance-profile-card">
        <div className="profile-card-header">
          <span className="card-header-icon">📊</span>
          <div>
            <h3>Annual Leave Balances & Quota Entitlements</h3>
            <p className="card-header-sub">
              Calculated for current fiscal calendar. Unused annual leaves roll over up to 5 days.
            </p>
          </div>
        </div>

        <div className="leave-quota-grid">
          {balances.map(([key, item]) => {
            const remaining = item.total - item.used;
            const percentageUsed = Math.round((item.used / item.total) * 100);
            const isHours = key === "timePermission";

            return (
              <div key={key} className="quota-card">
                <div className="quota-card-top">
                  <span className="quota-name">{item.name}</span>
                  <span className="quota-remaining-badge">
                    {remaining} {isHours ? "hrs" : "days"} left
                  </span>
                </div>

                <div className="quota-stats-row">
                  <span className="quota-used-text">
                    Used: <strong>{item.used}</strong> {isHours ? "hrs" : "days"}
                  </span>
                  <span className="quota-total-text">
                    Total Quota: <strong>{item.total}</strong> {isHours ? "hrs" : "days"}
                  </span>
                </div>

                <div className="progress-bar">
                  <div
                    className={`progress-fill ${
                      percentageUsed > 80
                        ? "fill-high"
                        : percentageUsed > 50
                        ? "fill-medium"
                        : "fill-normal"
                    }`}
                    style={{ width: `${percentageUsed}%` }}
                  ></div>
                </div>

                <div className="quota-card-footer">
                  <span className="quota-percent">{percentageUsed}% used</span>
                  <span className="quota-available">
                    {remaining} {isHours ? "hours" : "days"} available
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
