import { beforeEach, describe, expect, it, vi } from "vitest";

const getOperationalReadiness = vi.fn();

vi.mock("@/lib/operations/health", () => ({
  getOperationalReadiness,
}));

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    vi.resetModules();
    getOperationalReadiness.mockReset();
  });

  it("returns 503 without exposing internal error details", async () => {
    getOperationalReadiness.mockResolvedValue({
      ready: false,
      checks: [
        { name: "database-read-write", status: "fail", detail: "sensitive path" },
        { name: "disk-capacity", status: "pass" },
      ],
    });
    const { GET } = await import("@/app/api/health/ready/route");
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).not.toContain("sensitive path");
    expect(JSON.parse(body)).toEqual({
      status: "not-ready",
      checks: [
        { name: "database-read-write", status: "fail" },
        { name: "disk-capacity", status: "pass" },
      ],
    });
  });

  it("returns 200 only when every required check is ready", async () => {
    getOperationalReadiness.mockResolvedValue({
      ready: true,
      checks: [{ name: "database-read-write", status: "pass" }],
    });
    const { GET } = await import("@/app/api/health/ready/route");
    const response = await GET();

    expect(response.status).toBe(200);
  });
});
