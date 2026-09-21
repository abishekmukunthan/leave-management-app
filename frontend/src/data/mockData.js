export const initialCurrentUser = {
  id: "EMP-2024-8842",
  fullName: "Alex Morgan",
  email: "alex.morgan@company.com",
  phone: "+1 (555) 234-5678",
  designation: "Senior Frontend Engineer",
  department: "Engineering",
  teamLead: "Sarah Jenkins",
  dateOfJoining: "March 15, 2022",
  employmentType: "Full-time / Permanent",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  leaveBalances: {
    annualLeave: { used: 0, total: 15, name: "Annual Leave" },
    sickLeave: { used: 0, total: 10, name: "Sick Leave" },
    casualLeave: { used: 0, total: 6, name: "Casual Leave" },
    emergencyLeave: { used: 0, total: 3, name: "Emergency Leave" },
    halfDayLeave: { used: 0, total: 4, name: "Half Day Leave" },
    timePermission: { used: 0, total: 6, name: "Time Permission (Hrs)" },
  }
};

export const employeesList = [
  { id: "EMP-101", name: "Sarah Jenkins", role: "Engineering Lead", department: "Engineering" },
  { id: "EMP-102", name: "Michael Chen", role: "Fullstack Developer", department: "Engineering" },
  { id: "EMP-103", name: "Emily Watson", role: "UI/UX Designer", department: "Design" },
  { id: "EMP-104", name: "David Kim", role: "DevOps Specialist", department: "Infrastructure" },
  { id: "EMP-105", name: "Jessica Taylor", role: "Product Manager", department: "Product" },
  { id: "EMP-106", name: "Robert Martinez", role: "QA Engineer", department: "Engineering" },
];

export const initialLeaves = [];
export const initialSubstituteRequests = [];

