import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  claimMemberNotice: vi.fn(),
  getPaymentUrl: vi.fn(),
  consumeRateLimit: vi.fn(),
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
  claimMemberNotice: routeMocks.claimMemberNotice,
  isValidMemberNoticeEntryToken: (value: string) => /^[A-Za-z0-9_-]{16,128}$/.test(value),
}));
vi.mock("@/lib/param-vip-payment", () => ({
  getParamVipPaymentUrl: routeMocks.getPaymentUrl,
}));
vi.mock("@/lib/durable-rate-limit", () => ({
  consumeDurableRateLimit: routeMocks.consumeRateLimit,
}));

import { POST } from "./route";

function request(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/member-notices/claim", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
    },
    body: JSON.stringify(body),
  });
}

describe("member notice claim route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getSessionUser.mockResolvedValue({
      id: "user-1",
      email: "member@example.test",
    });
    routeMocks.getPaymentUrl.mockReturnValue(null);
    routeMocks.consumeRateLimit.mockResolvedValue({ allowed: true, retryAt: null });
  });

  it("rate-limits repeated claims by authenticated account with private no-store responses", async () => {
    routeMocks.consumeRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAt: new Date(Date.now() + 60_000),
    });

    const response = await POST(request({ entryToken: "synthetic-entry-token-1234" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(routeMocks.consumeRateLimit).toHaveBeenCalledWith({
      scope: "member-notice-claim",
      identity: "user-1",
      maxAttempts: 12,
      windowMs: 5 * 60 * 1000,
      blockMs: 5 * 60 * 1000,
    });
    expect(routeMocks.claimMemberNotice).not.toHaveBeenCalled();
  });

  it("requires an active authenticated session", async () => {
    routeMocks.getSessionUser.mockResolvedValueOnce(null);

    const response = await POST(request({ entryToken: "synthetic-entry-token-1234" }));

    expect(response.status).toBe(401);
    expect(routeMocks.claimMemberNotice).not.toHaveBeenCalled();
  });

  it("rejects cross-origin and malformed claims before database access", async () => {
    expect((await POST(request(
      { entryToken: "synthetic-entry-token-1234" },
      "https://attacker.example",
    ))).status).toBe(403);
    expect((await POST(request({ entryToken: "short", userId: "victim" }))).status).toBe(400);
    expect(routeMocks.claimMemberNotice).not.toHaveBeenCalled();
  });

  it("derives the account from session and returns the stable UI contract", async () => {
    routeMocks.claimMemberNotice.mockResolvedValueOnce({
      kind: "MONTHLY_SUPPORT",
      periodKey: "2026-07",
    });

    const response = await POST(request({
      entryToken: "synthetic-entry-token-1234",
      userId: "victim",
      tier: "VIP",
      count: 99,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      notice: {
        kind: "MONTHLY_SUPPORT",
        periodKey: "2026-07",
        paymentUrl: null,
      },
    });
    expect(routeMocks.claimMemberNotice).toHaveBeenCalledWith({
      userId: "user-1",
      entryToken: "synthetic-entry-token-1234",
    });
  });
});
