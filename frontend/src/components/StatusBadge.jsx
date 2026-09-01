export const StatusBadge = ({ status }) => {
  const getBadgeClass = (statusStr) => {
    switch (statusStr) {
      case "Approved":
        return "badge-approved";
      case "Waiting for Admin Approval":
        return "badge-admin-approval";
      case "Waiting for Substitute Approval":
        return "badge-sub-approval";
      case "Rejected":
        return "badge-rejected";
      case "Accepted":
        return "badge-approved";
      default:
        return "badge-default";
    }
  };

  const getStatusIcon = (statusStr) => {
    switch (statusStr) {
      case "Approved":
        return "✓";
      case "Waiting for Admin Approval":
        return "⏳";
      case "Waiting for Substitute Approval":
        return "👥";
      case "Rejected":
        return "✕";
      default:
        return "•";
    }
  };

  return (
    <span className={`status-badge ${getBadgeClass(status)}`}>
      <span className="badge-icon">{getStatusIcon(status)}</span>
      <span>{status}</span>
    </span>
  );
};
