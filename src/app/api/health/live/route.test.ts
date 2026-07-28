import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/live/route";

describe("GET /api/health/live", () => {
  it("returns only a minimal non-cacheable liveness response", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
