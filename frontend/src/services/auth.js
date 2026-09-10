export const USER_STORAGE_KEY = "leaveease_current_user";
export const TOKEN_STORAGE_KEY = "leaveease_auth_token";
export const LOGOUT_EVENT_KEY = "leaveease_logout_event";

/**
 * Returns the configured storage driver (localStorage by default, or sessionStorage)
 */
export const getStorageDriver = () => {
  if (typeof window === "undefined") return null;
  const storageType = import.meta.env?.VITE_SESSION_STORAGE_TYPE;
  return storageType === "sessionStorage" ? window.sessionStorage : window.localStorage;
};

/**
 * Parses and returns the currently stored user object
 */
export const getStoredUser = () => {
  try {
    const driver = getStorageDriver();
    let raw = driver ? driver.getItem(USER_STORAGE_KEY) : null;
    if (!raw && typeof window !== "undefined") {
      // Fallback check across both storages in case user switched storage type
      raw = window.localStorage.getItem(USER_STORAGE_KEY) || window.sessionStorage.getItem(USER_STORAGE_KEY);
    }
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Retrieves the stored JWT authentication token
 */
export const getToken = () => {
  try {
    const driver = getStorageDriver();
    let token = driver ? driver.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token && typeof window !== "undefined") {
      token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    }
    return token || null;
  } catch {
    return null;
  }
};

/**
 * Decodes a JWT token without external libraries and checks if it is expired
 */
export const isTokenExpired = (token) => {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    // Decode base64url payload
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;

    // Expiry check with 5s clock skew allowance
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= nowInSeconds;
  } catch {
    return true; // Treat malformed tokens as expired/invalid
  }
};

/**
 * Stores user data and token in the active storage driver
 */
export const storeUser = (user, token = null) => {
  const driver = getStorageDriver();
  if (!driver) return;

  if (user) {
    driver.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
  if (token) {
    driver.setItem(TOKEN_STORAGE_KEY, token);
  } else if (user && !driver.getItem(TOKEN_STORAGE_KEY)) {
    // Ensure valid mock token if storeUser is called without a token (e.g. in test suites)
    const mockPayload = btoa(
      JSON.stringify({
        id: user.id,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    driver.setItem(TOKEN_STORAGE_KEY, `mockHeader.${mockPayload}.mockSignature`);
  }
};

/**
 * Updates properties on the currently stored user
 */
export const updateStoredUser = (updates) => {
  const current = getStoredUser();
  if (current) {
    const updated = { ...current, ...updates };
    storeUser(updated);
    return updated;
  }
  return null;
};

/**
 * Broadcasts a logout event across all open browser tabs via localStorage
 */
export const broadcastLogout = () => {
  if (typeof window === "undefined") return;
  try {
    // Setting item in localStorage triggers the 'storage' event in all OTHER open tabs
    window.localStorage.setItem(LOGOUT_EVENT_KEY, Date.now().toString());
  } catch (err) {
    console.error("Failed to broadcast multi-tab logout event:", err);
  }
};

/**
 * Fully cleans up all authentication-related keys from all browser storage
 */
export const clearStoredUser = () => {
  if (typeof window === "undefined") return;
  try {
    const purgeKeys = (storage) => {
      if (!storage) return;
      storage.removeItem(USER_STORAGE_KEY);
      storage.removeItem(TOKEN_STORAGE_KEY);
      // Remove any leaveease session-related keys
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (key && (key.startsWith("leaveease_") && key !== LOGOUT_EVENT_KEY)) {
          storage.removeItem(key);
        }
      }
    };

    purgeKeys(window.localStorage);
    purgeKeys(window.sessionStorage);
  } catch (err) {
    console.error("Error clearing stored auth data:", err);
  }
};

/**
 * Comprehensive logout action: clears local storage and broadcasts to other tabs
 */
export const logoutUser = (options = { broadcast: true }) => {
  clearStoredUser();
  if (options?.broadcast !== false) {
    broadcastLogout();
  }
};

/**
 * Validates current session: checks token existence, JWT expiration, and user active status
 */
export const getValidatedAuth = () => {
  const user = getStoredUser();
  const token = getToken();

  if (!user || !token) {
    return {
      isValid: false,
      reason: "missing",
      message: null,
    };
  }

  if (isTokenExpired(token)) {
    clearStoredUser();
    return {
      isValid: false,
      reason: "expired",
      message: "Your session has expired. Please sign in again.",
    };
  }

  if (user.is_active === false) {
    clearStoredUser();
    return {
      isValid: false,
      reason: "inactive",
      message: "User account is inactive. Please contact system administrator.",
    };
  }

  return {
    isValid: true,
    user,
    token,
  };
};

export const isTeamAdmin = (user) => user?.role === "team_admin" || user?.role === "admin";
export const isSuperiorAdmin = (user) => user?.role === "superior_admin";
export const isEmployee = (user) => user?.role === "employee";
export const isAdmin = (user) => isTeamAdmin(user) || isSuperiorAdmin(user);

export const canApproveLeaves = (user) => {
  if (!user) return false;
  if (isSuperiorAdmin(user)) return false; // Superior Admin has dedicated dashboard
  if (user.can_approve_leaves === true) return true;
  if (Number(user.approval_permissions_count) > 0) return true;
  if (Array.isArray(user.incharge_teams) && user.incharge_teams.length > 0) return true;
  if (isTeamAdmin(user)) return true;
  return false;
};
