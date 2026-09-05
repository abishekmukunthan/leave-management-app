import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { substituteDao } from "../../src/dao/substituteDao.js";

// Mock DB pool
vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("Substitute Controller (/api/substitute-requests)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("PUT /api/substitute-requests/:id/accept", () => {
    it("should return 404 if substitute request is not found", async () => {
      vi.spyOn(substituteDao, "getSubstituteRequestById").mockResolvedValue(null);

      const res = await request(app).put("/api/substitute-requests/nonexistent-id/accept").send();

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Substitute request not found");
    });

    it("should accept substitute request and return 200", async () => {
      vi.spyOn(substituteDao, "getSubstituteRequestById").mockResolvedValue({
        id: "sub-req-123",
        substitute_status: "Pending",
      });
      vi.spyOn(substituteDao, "acceptSubstituteRequest").mockResolvedValue({
        id: "sub-req-123",
        substitute_status: "Accepted",
      });

      const res = await request(app).put("/api/substitute-requests/sub-req-123/accept").send();

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("accepted successfully");
      expect(res.body.data.substitute_status).toBe("Accepted");
    });
  });

  describe("PUT /api/substitute-requests/:id/reject", () => {
    it("should return 404 if substitute request is not found", async () => {
      vi.spyOn(substituteDao, "getSubstituteRequestById").mockResolvedValue(null);

      const res = await request(app)
        .put("/api/substitute-requests/nonexistent-id/reject")
        .send({ substitute_remarks: "Busy" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Substitute request not found");
    });

    it("should reject substitute request with remarks and return 200", async () => {
      vi.spyOn(substituteDao, "getSubstituteRequestById").mockResolvedValue({
        id: "sub-req-123",
        substitute_status: "Pending",
      });
      vi.spyOn(substituteDao, "rejectSubstituteRequest").mockResolvedValue({
        id: "sub-req-123",
        substitute_status: "Rejected",
        substitute_remarks: "On client site",
      });

      const res = await request(app)
        .put("/api/substitute-requests/sub-req-123/reject")
        .send({ substitute_remarks: "On client site" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Substitute duty request rejected");
      expect(res.body.data.substitute_status).toBe("Rejected");
    });
  });
});
