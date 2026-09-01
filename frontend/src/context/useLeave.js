import { useContext } from "react";
import { LeaveContext } from "./leaveContextInstance";

export const useLeave = () => {
  const context = useContext(LeaveContext);
  if (!context) {
    throw new Error("useLeave must be used within a LeaveProvider");
  }
  return context;
};
