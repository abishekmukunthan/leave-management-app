import { CheckCircle2, Clock, Users, XCircle, Check } from "lucide-react";

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
        return <CheckCircle2 size={12} strokeWidth={2.5} />;
      case "Waiting for Admin Approval":
        return <Clock size={12} strokeWidth={2.5} />;
      case "Waiting for Substitute Approval":
        return <Users size={12} strokeWidth={2.5} />;
      case "Rejected":
        return <XCircle size={12} strokeWidth={2.5} />;
      case "Accepted":
        return <Check size={12} strokeWidth={2.5} />;
      default:
        return null;
    }
  };

  const getStatusLabel = (statusStr) => {
    if (statusStr === "Waiting for Admin Approval") {
      return "Waiting for Team Lead Approval";
    }
    return statusStr;
  };

  return (
    <span className={`status-badge ${getBadgeClass(status)}`}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {getStatusIcon(status)}
      </span>
      <span>{getStatusLabel(status)}</span>
    </span>
  );
};
