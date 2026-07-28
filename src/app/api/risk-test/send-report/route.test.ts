import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeDurableRateLimit: vi.fn(),
  getSessionUser: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/lib/durable-rate-limit", () => ({ consumeDurableRateLimit: mocks.consumeDurableRateLimit }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/site-url", () => ({ getSiteUrl: () => "https://enbilir.test" }));
vi.mock("@/data/risk-appetite-test", () => ({
  formatRiskScore: () => "3.20",
  getRecommendedNextStepsForLocale: () => [{ title: "Next", href: "/panel" }],
  getRiskLegalWarningForLocale: () => "Not investment advice.",
  getRiskProfileByKeyForLocale: (key: string) => key === "balanced" ? {
    title: "Balanced",
    reportIntro: "Summary",
    portfolioSuggestions: ["Diversify"],
  } : null,
}));

import { POST } from "@/app/api/risk-test/send-report/route";

describe("risk report email route", () => {
  beforeEach(() => {
    mocks.getSessionUser.mockReset();
    mocks.sendEmail.mockReset();
    mocks.consumeDurableRateLimit.mockReset();
    mocks.consumeDurableRateLimit.mockResolvedValue({ allowed: true, retryAt: null });
  });

  it("rejects anonymous email relay attempts", async () => {
    mocks.getSessionUser.mockResolvedValue(null);

    const response = await POST(new Request("https://enbilir.test/api/risk-test/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "victim@example.test",
        averageScore: 3.2,
        profileKey: "balanced",
        locale: "tr",
      }),
    }));

    expect(response.status).toBe(401);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects a recipient that differs from the authenticated account email", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "user-1",
      email: "owner@example.test",
      role: "USER",
    });
    mocks.sendEmail.mockResolvedValue(undefined);

    const response = await POST(new Request("https://enbilir.test/api/risk-test/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "attacker-controlled@example.test",
        averageScore: 3.2,
        profileKey: "balanced",
        locale: "tr",
      }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("sends a valid report to the authenticated account email", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "user-2",
      email: "owner@example.test",
      role: "USER",
    });
    mocks.sendEmail.mockResolvedValue(undefined);

    const response = await POST(new Request("https://enbilir.test/api/risk-test/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.test",
        averageScore: 3.2,
        profileKey: "balanced",
        locale: "tr",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "owner@example.test",
    }));
  });

  it("enforces the durable per-account email limit", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "user-3",
      email: "owner@example.test",
      role: "USER",
    });
    mocks.consumeDurableRateLimit.mockResolvedValue({
      allowed: false,
      retryAt: new Date("2026-07-28T12:00:00.000Z"),
    });

    const response = await POST(new Request("https://enbilir.test/api/risk-test/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.test",
        averageScore: 3.2,
        profileKey: "balanced",
        locale: "tr",
      }),
    }));

    expect(response.status).toBe(429);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
