import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredUser,
  getToken,
  storeUser,
  updateStoredUser,
  clearStoredUser,
  isTeamAdmin,
  isSuperiorAdmin,
  isEmployee,
  isAdmin,
} from "../services/auth";

describe("frontend/src/services/auth.js", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("LocalStorage Session Management", () => {
    it("should return null if no user or token is stored", () => {
      expect(getStoredUser()).toBeNull();
      expect(getToken()).toBeNull();
    });

    it("should store and retrieve user and token cleanly", () => {
      const dummyUser = { id: "u-123", name: "Alex Morgan", role: "employee" };
      const dummyToken = "jwt-token-abc";

      storeUser(dummyUser, dummyToken);

      expect(getStoredUser()).toEqual(dummyUser);
      expect(getToken()).toBe(dummyToken);
    });

    it("should update stored user fields using updateStoredUser", () => {
      const initialUser = { id: "u-123", name: "Alex Morgan", must_change_password: true };
      storeUser(initialUser);

      const updated = updateStoredUser({ must_change_password: false });

      expect(updated.must_change_password).toBe(false);
      expect(getStoredUser().must_change_password).toBe(false);
    });

    it("should clear stored user and token when clearStoredUser is called", () => {
      storeUser({ id: "u-123" }, "token-123");
      clearStoredUser();

      expect(getStoredUser()).toBeNull();
      expect(getToken()).toBeNull();
    });
  });

  describe("Role Predicate Helpers", () => {
    it("should correctly identify team_admin / admin roles", () => {
      expect(isTeamAdmin({ role: "team_admin" })).toBe(true);
      expect(isTeamAdmin({ role: "admin" })).toBe(true);
      expect(isTeamAdmin({ role: "employee" })).toBe(false);
    });

    it("should correctly identify superior_admin role", () => {
      expect(isSuperiorAdmin({ role: "superior_admin" })).toBe(true);
      expect(isSuperiorAdmin({ role: "team_admin" })).toBe(false);
    });

    it("should correctly identify employee role", () => {
      expect(isEmployee({ role: "employee" })).toBe(true);
      expect(isEmployee({ role: "superior_admin" })).toBe(false);
    });

    it("should correctly identify any admin role (team or superior)", () => {
      expect(isAdmin({ role: "team_admin" })).toBe(true);
      expect(isAdmin({ role: "superior_admin" })).toBe(true);
      expect(isAdmin({ role: "employee" })).toBe(false);
    });
  });
});
