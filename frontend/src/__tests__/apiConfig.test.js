import { describe, it, expect } from "vitest";
import { API_BASE_URL, buildApiUrl } from "../services/api";

describe("Frontend API Configuration", () => {
  it("should have a valid default or environment API_BASE_URL", () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe("string");
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });

  it("should format endpoint path correctly without duplicate /api/api", () => {
    const url = buildApiUrl("/api/auth/login");
    expect(url).not.toContain("/api/api");
    expect(url).toMatch(/\/api\/auth\/login$/);
  });

  it("should format endpoints with query params correctly", () => {
    const url = buildApiUrl("/api/leaves/my-leaves?employee_id=123");
    expect(url).not.toContain("/api/api");
    expect(url).toContain("/api/leaves/my-leaves?employee_id=123");
  });
});
