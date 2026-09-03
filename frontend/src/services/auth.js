const USER_STORAGE_KEY = "leaveease_current_user";
const TOKEN_STORAGE_KEY = "leaveease_auth_token";

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
};

export const storeUser = (user, token = null) => {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
};

export const updateStoredUser = (updates) => {
  const current = getStoredUser();
  if (current) {
    const updated = { ...current, ...updates };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
  return null;
};

export const clearStoredUser = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const isTeamAdmin = (user) => user?.role === "team_admin" || user?.role === "admin";
export const isSuperiorAdmin = (user) => user?.role === "superior_admin";
export const isEmployee = (user) => user?.role === "employee";
export const isAdmin = (user) => isTeamAdmin(user) || isSuperiorAdmin(user);
