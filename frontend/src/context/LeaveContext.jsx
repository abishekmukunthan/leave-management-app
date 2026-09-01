import { useState } from "react";
import { LeaveContext } from "./leaveContextInstance";
import { initialCurrentUser, initialLeaves, initialSubstituteRequests, employeesList } from "../data/mockData";
import { getStoredUser } from "../services/auth";

export const LeaveProvider = ({ children }) => {
  const [currentUser] = useState(initialCurrentUser);
  const [leaves, setLeaves] = useState(initialLeaves);
  const [substituteRequests, setSubstituteRequests] = useState(initialSubstituteRequests);
  const [employees] = useState(employeesList);
  const [toastMessage, setToastMessage] = useState(null);

  // The actual logged-in user from localStorage (used for API calls and display)
  const loggedInUser = getStoredUser();

  const showToast = (message, type = "success") => {
    setToastMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Add new leave request (mock - kept for compatibility)
  const applyLeave = (newLeaveData) => {
    const newId = `LV-2024-${String(leaves.length + 1).padStart(3, "0")}`;
    const formattedLeave = {
      id: newId,
      employeeName: currentUser.fullName,
      employeeId: currentUser.id,
      status: "Waiting for Substitute Approval",
      appliedDate: new Date().toISOString().split("T")[0],
      ...newLeaveData,
    };

    setLeaves((prev) => [formattedLeave, ...prev]);

    if (newLeaveData.substituteName) {
      const datesStr =
        newLeaveData.leaveType === "Time Permission"
          ? `${newLeaveData.permissionDate} (${newLeaveData.permissionHours})`
          : `${newLeaveData.startDate} to ${newLeaveData.endDate}`;

      const newSubReq = {
        id: `SUB-${String(substituteRequests.length + 1).padStart(3, "0")}`,
        leaveId: newId,
        requestingEmployee: currentUser.fullName,
        requestingEmployeeId: currentUser.id,
        leaveType: newLeaveData.leaveType,
        dates: datesStr,
        assignedWork: newLeaveData.assignedWork,
        reason: newLeaveData.reason,
        status: "Waiting for Substitute Approval",
        appliedDate: formattedLeave.appliedDate,
      };

      setSubstituteRequests((prev) => [newSubReq, ...prev]);
    }

    showToast("Leave request submitted successfully!");
    return formattedLeave;
  };

  // Substitute responds (kept for compatibility)
  const handleSubstituteAction = (requestId, action) => {
    const isAccepted = action === "accept";
    const newStatus = isAccepted ? "Waiting for Admin Approval" : "Rejected";

    setSubstituteRequests((prev) =>
      prev.map((req) =>
        req.id === requestId ? { ...req, status: isAccepted ? "Accepted" : "Rejected" } : req
      )
    );

    const subReq = substituteRequests.find((r) => r.id === requestId);
    if (subReq && subReq.leaveId) {
      setLeaves((prev) =>
        prev.map((lv) => (lv.id === subReq.leaveId ? { ...lv, status: newStatus } : lv))
      );
    }

    showToast(
      isAccepted
        ? "Substitute request accepted! Forwarded to Admin."
        : "Substitute request rejected.",
      isAccepted ? "success" : "info"
    );
  };

  // Admin approves / rejects (kept for compatibility)
  const handleAdminAction = (leaveId, action) => {
    const isApproved = action === "approve";
    const newStatus = isApproved ? "Approved" : "Rejected";

    setLeaves((prev) =>
      prev.map((lv) => (lv.id === leaveId ? { ...lv, status: newStatus } : lv))
    );

    showToast(
      `Leave request ${leaveId} ${isApproved ? "Approved" : "Rejected"} by Admin.`,
      isApproved ? "success" : "warning"
    );
  };

  return (
    <LeaveContext.Provider
      value={{
        currentUser,
        loggedInUser,
        leaves,
        substituteRequests,
        employees,
        applyLeave,
        handleSubstituteAction,
        handleAdminAction,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </LeaveContext.Provider>
  );
};
