import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("Production Configuration & CORS", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should allow requests with no origin (e.g. curl, health checks)", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Leave Management API is running");
  });

  it("should allow request from localhost:5173", async () => {
    const res = await request(app)
      .get("/")
      .set("Origin", "http://localhost:5173");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("should allow request from localhost:5174", async () => {
    const res = await request(app)
      .get("/")
      .set("Origin", "http://localhost:5174");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5174");
  });

  it("should allow request from FRONTEND_URL when configured", async () => {
    process.env.FRONTEND_URL = "https://leave-management-frontend.pages.dev";
    const res = await request(app)
      .get("/")
      .set("Origin", "https://leave-management-frontend.pages.dev");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("https://leave-management-frontend.pages.dev");
  });

  it("should block untrusted origin with 500/CORS error", async () => {
    const res = await request(app)
      .get("/")
      .set("Origin", "https://malicious-site.com");
    expect(res.status).toBe(500);
  });
});
