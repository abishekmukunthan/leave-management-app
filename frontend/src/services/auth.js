// Demo users available for selection
export const DEMO_LOGIN_USERS = [
  {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "Alex Morgan",
    email: "alex.morgan@company.com",
    role: "employee",
    designation: "Senior Frontend Engineer",
    department: "Engineering",
    team: "Engineering",
    avatarColor: "#6366f1",
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    name: "Michael Chen",
    email: "michael.chen@company.com",
    role: "employee",
    designation: "Fullstack Developer",
    department: "Engineering",
    team: "Engineering",
    avatarColor: "#0ea5e9",
  },
  {
    id: "a0000000-0000-0000-0000-000000000004",
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    role: "employee",
    designation: "Sales Representative",
    department: "Sales",
    team: "Sales",
    avatarColor: "#f59e0b",
  },
  {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Priya Fernando",
    email: "priya.fernando@company.com",
    role: "team_admin",
    designation: "Engineering Lead & Manager",
    department: "Engineering",
    team: "Engineering",
    avatarColor: "#8b5cf6",
  },
  {
    id: "a0000000-0000-0000-0000-000000000005",
    name: "Nadia Perera",
    email: "nadia.perera@company.com",
    role: "superior_admin",
    designation: "Head of Operations & Superior Admin",
    department: "Executive Management",
    team: "Executive",
    avatarColor: "#ec4899",
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

export const isTeamAdmin = (user) => user?.role === "team_admin" || user?.role === "admin";
export const isSuperiorAdmin = (user) => user?.role === "superior_admin";
export const isEmployee = (user) => user?.role === "employee";
export const isAdmin = (user) => isTeamAdmin(user) || isSuperiorAdmin(user);
