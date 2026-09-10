import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { LeaveProvider } from "../context/LeaveContext";
import App from "../App";
import {
  storeUser,
  getStoredUser,
  getToken,
  logoutUser,
  isTokenExpired,
  getValidatedAuth,
  LOGOUT_EVENT_KEY,
  USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
} from "../services/auth";

// Helper to create a fake JWT with a specific expiration timestamp (in seconds)
const createFakeJwt = (expSecondsFromNow) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = btoa(JSON.stringify({ id: "user-123", username: "alex.morgan", role: "employee", exp }));
  return `${header}.${payload}.fake_signature_hash`;
};

describe("Production Authentication Security & Session Sync", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("1. Demo Credentials Hiding in Production", () => {
    it("should NOT show Quick Demo Credentials and should show admin contact info when VITE_SHOW_DEMO_CREDENTIALS is not true", () => {
      render(
        <LeaveProvider>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </LeaveProvider>
      );

      // Verify "Quick Demo Credentials" is NOT in document
      expect(screen.queryByText(/Quick Demo Credentials/i)).not.toBeInTheDocument();
      // Verify Password@123 is NOT exposed in UI
      expect(screen.queryByText(/Password@123/i)).not.toBeInTheDocument();
      // Verify production help text is shown
      expect(
        screen.getByText(/Please contact your system administrator for login credentials/i)
      ).toBeInTheDocument();
    });
  });

  describe("2. Full Storage Cleanup on Logout", () => {
    it("should remove user, token, and leaveease session keys from both localStorage and sessionStorage on logoutUser", () => {
      const user = { id: "u-1", name: "Alex Morgan", role: "employee" };
      const token = createFakeJwt(3600);

      storeUser(user, token);
      localStorage.setItem("leaveease_temp_setting", "cached-value");
      sessionStorage.setItem("leaveease_session_data", "temp-data");

      expect(getStoredUser()).toEqual(user);
      expect(getToken()).toBe(token);

      // Trigger logout
      logoutUser({ broadcast: true });

      expect(getStoredUser()).toBeNull();
      expect(getToken()).toBeNull();
      expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem("leaveease_temp_setting")).toBeNull();
      expect(sessionStorage.getItem("leaveease_session_data")).toBeNull();
      // Verify logout event was written for multi-tab sync
      expect(localStorage.getItem(LOGOUT_EVENT_KEY)).toBeTruthy();
    });
  });

  describe("3. JWT Expiration Validation", () => {
    it("should return true for an expired token and false for a valid future token", () => {
      const validToken = createFakeJwt(3600); // Expires in 1 hour
      const expiredToken = createFakeJwt(-60); // Expired 1 minute ago

      expect(isTokenExpired(validToken)).toBe(false);
      expect(isTokenExpired(expiredToken)).toBe(true);
      expect(isTokenExpired(null)).toBe(true);
      expect(isTokenExpired("invalid-malformed-token")).toBe(true);
    });

    it("should invalidate auth and clear storage when token is expired via getValidatedAuth", () => {
      const user = { id: "u-1", name: "Alex Morgan", role: "employee", is_active: true };
      const expiredToken = createFakeJwt(-10);

      storeUser(user, expiredToken);

      const auth = getValidatedAuth();
      expect(auth.isValid).toBe(false);
      expect(auth.reason).toBe("expired");
      expect(auth.message).toContain("session has expired");
      // Storage should have been automatically cleared
      expect(getToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
    });

    it("should invalidate auth when user is marked inactive", () => {
      const user = { id: "u-1", name: "Inactive User", role: "employee", is_active: false };
      const validToken = createFakeJwt(3600);

      storeUser(user, validToken);

      const auth = getValidatedAuth();
      expect(auth.isValid).toBe(false);
      expect(auth.reason).toBe("inactive");
      expect(auth.message).toContain("inactive");
    });
  });

  describe("4. Multi-Tab Logout Synchronization", () => {
    it("should redirect to /login when storage event fires with logout event key", async () => {
      const user = { id: "u-1", name: "Alex Morgan", role: "employee", is_active: true };
      const token = createFakeJwt(3600);
      storeUser(user, token);

      render(<App />);

      // Verify initially authenticated page rendered
      expect(screen.queryByText(/Sign in to access/i)).not.toBeInTheDocument();

      // Simulate a storage event fired from another browser tab logging out
      act(() => {
        const storageEvent = new StorageEvent("storage", {
          key: LOGOUT_EVENT_KEY,
          newValue: Date.now().toString(),
        });
        window.dispatchEvent(storageEvent);
      });

      // After storage event, it should redirect to login page
      expect(screen.getByText(/Sign in to access your leave management portal/i)).toBeInTheDocument();
      expect(screen.getByText(/You have been logged out from another session\/tab/i)).toBeInTheDocument();
    });
  });
});
