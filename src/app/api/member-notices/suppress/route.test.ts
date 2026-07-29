import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  suppressMemberNotice: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  },
}));
vi.mock("@/lib/auth", () => ({
  getSessionUser: routeMocks.getSessionUser,
}));
vi.mock("@/lib/member-notices", () => ({
  suppressMemberNotice: routeMocks.suppressMemberNotice,
}));

import { POST } from "./route";

describe("member notice suppression route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getSessionUser.mockResolvedValue({
      id: "user-1",
      email: "member@example.test",
    });
    routeMocks.suppressMemberNotice.mockResolvedValue(undefined);
  });

  it("suppresses only the authenticated account's current notice period", async () => {
    const response = await POST(new Request("http://localhost/api/member-notices/suppress", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({
        kind: "MONTHLY_SUPPORT",
        userId: "victim",
        periodKey: "2099-01",
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(routeMocks.suppressMemberNotice).toHaveBeenCalledWith({
      userId: "user-1",
      kind: "MONTHLY_SUPPORT",
    });
  });
});
