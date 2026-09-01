// Demo users available for selection
export const DEMO_LOGIN_USERS = [
  {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "Alex Morgan",
    email: "alex.morgan@company.com",
    role: "employee",
    designation: "Senior Frontend Engineer",
    department: "Engineering",
    avatarColor: "#6366f1",
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    name: "Michael Chen",
    email: "michael.chen@company.com",
    role: "employee",
    designation: "Fullstack Developer",
    department: "Engineering",
    avatarColor: "#0ea5e9",
  },
  {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Priya Fernando",
    email: "priya.fernando@company.com",
    role: "admin",
    designation: "Team Lead / Admin",
    department: "Management",
    avatarColor: "#8b5cf6",
  },
];

const STORAGE_KEY = "leaveease_current_user";

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const storeUser = (user) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const clearStoredUser = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const isAdmin = (user) => user?.role === "admin";
