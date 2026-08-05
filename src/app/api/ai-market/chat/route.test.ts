import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analytics: vi.fn(),
  consumeVoiceReservation: vi.fn(),
  economyHeadlines: vi.fn(),
  finalizeAiQueryLease: vi.fn(),
  getLiveMarketItems: vi.fn(),
  getAiQueryQuota: vi.fn(),
  getSessionUser: vi.fn(),
  getVipAgentSummaries: vi.fn(),
  membershipSnapshot: vi.fn(),
  rateLimited: vi.fn(),
  releaseAiQueryLease: vi.fn(),
  reserveAiQueryLease: vi.fn(),
  userFindUnique: vi.fn(),
  aiMarketReportFindFirst: vi.fn(),
  vipResearchReportFindFirst: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  recordSiteAnalyticsEvent: mocks.analytics,
  siteAnalyticsEvents: { aiChat: "AI_CHAT" },
}));

vi.mock("@/lib/ai-query-quota", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai-query-quota")>();
  return {
    ...actual,
    getAiQueryQuota: mocks.getAiQueryQuota,
    finalizeAiQueryLease: mocks.finalizeAiQueryLease,
    releaseAiQueryLease: mocks.releaseAiQueryLease,
    reserveAiQueryLease: mocks.reserveAiQueryLease,
  };
});

vi.mock("@/lib/ai-query-reservation", () => ({
  consumeVoiceAiQueryReservation: mocks.consumeVoiceReservation,
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: mocks.getSessionUser,
}));

vi.mock("@/lib/economy-news", () => ({
  getEconomyHeadlines: mocks.economyHeadlines,
}));

vi.mock("@/lib/live-market", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/live-market")>();
  return {
    ...actual,
    getLiveMarketItems: mocks.getLiveMarketItems,
  };
});

vi.mock("@/lib/membership", () => ({
  getMembershipSnapshot: mocks.membershipSnapshot,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    aiMarketReport: { findFirst: mocks.aiMarketReportFindFirst },
    vipResearchReport: { findFirst: mocks.vipResearchReportFindFirst },
  },
}));

vi.mock("@/lib/request-rate-limit", () => ({
  FixedWindowRateLimiter: class {
    isRateLimited = mocks.rateLimited;
  },
  getRateLimitClientKey: () => "synthetic-client",
}));

vi.mock("@/lib/vip-agents/dashboard", () => ({
  getVipAgentSummaries: mocks.getVipAgentSummaries,
}));

import { POST } from "@/app/api/ai-market/chat/route";
import { DailyAiQueryLimitReachedError } from "@/lib/ai-query-quota";

const quota = {
  limit: 10,
  used: 1,
  remaining: 9,
  resetAt: "2026-07-30T21:00:00.000Z",
  isPaidVipActive: false,
};

function makeRequest(message: string) {
  return new Request("http://localhost/api/ai-market/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, locale: "tr", history: [] }),
  });
}

describe("AI market chat route resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    mocks.rateLimited.mockReturnValue(false);
    mocks.getSessionUser.mockResolvedValue({ id: "synthetic-user" });
    mocks.userFindUnique.mockResolvedValue({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      membershipTier: "FREE",
      vipPaidUntil: null,
    });
    mocks.membershipSnapshot.mockReturnValue({
      effectiveTier: "FREE",
      isPaidVipActive: false,
      isVipActive: false,
    });
    mocks.consumeVoiceReservation.mockResolvedValue(false);
    mocks.getLiveMarketItems.mockResolvedValue([]);
    mocks.getAiQueryQuota.mockResolvedValue(quota);
    mocks.aiMarketReportFindFirst.mockResolvedValue(null);
    mocks.vipResearchReportFindFirst.mockResolvedValue(null);
    mocks.getVipAgentSummaries.mockResolvedValue([]);
    mocks.economyHeadlines.mockResolvedValue([]);
    mocks.reserveAiQueryLease.mockResolvedValue({ quota, leaseToken: "synthetic-lease" });
    mocks.releaseAiQueryLease.mockResolvedValue(true);
    mocks.finalizeAiQueryLease.mockResolvedValue(true);
    mocks.analytics.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.unstubAllGlobals();
  });

  it("reserves before context generation and releases when no answer can be produced", async () => {
    mocks.getLiveMarketItems.mockRejectedValue(new Error("synthetic context failure"));

    const response = await POST(makeRequest("BTC nasıl?"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
    expect(mocks.reserveAiQueryLease).toHaveBeenCalledTimes(1);
    expect(mocks.releaseAiQueryLease).toHaveBeenCalledWith({
      userId: "synthetic-user",
      leaseToken: "synthetic-lease",
      reservedAt: expect.any(Date),
    });
    expect(mocks.reserveAiQueryLease.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getLiveMarketItems.mock.invocationCallOrder[0],
    );
  });

  it("rejects an already exhausted text quota before market or OpenAI work", async () => {
    const exhaustedQuota = {
      ...quota,
      used: quota.limit,
      remaining: 0,
    };
    mocks.reserveAiQueryLease.mockRejectedValue(new DailyAiQueryLimitReachedError(exhaustedQuota));
    process.env.OPENAI_API_KEY = "synthetic-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("NVDA ne olur?"));
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toMatchObject({
      code: "DAILY_QUERY_LIMIT_REACHED",
      quota: exhaustedQuota,
      error: expect.stringContaining("10 ücretsiz"),
    });
    expect(mocks.getLiveMarketItems).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.reserveAiQueryLease).toHaveBeenCalledTimes(1);
    expect(mocks.releaseAiQueryLease).not.toHaveBeenCalled();
  });

  it("returns the prepared JSON answer even when analytics recording fails", async () => {
    mocks.analytics.mockRejectedValue(new Error("synthetic analytics failure"));

    const response = await POST(makeRequest("BTC nasıl?"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      answer: expect.any(String),
      mode: "local",
      quota,
    });
    expect(mocks.reserveAiQueryLease).toHaveBeenCalledTimes(1);
    expect(mocks.finalizeAiQueryLease).toHaveBeenCalledWith({
      userId: "synthetic-user",
      leaseToken: "synthetic-lease",
    });
  });

  it("uses economy headlines for VIP site help without requiring citations", async () => {
    process.env.OPENAI_API_KEY = "synthetic-key";
    mocks.membershipSnapshot.mockReturnValue({
      effectiveTier: "VIP",
      isPaidVipActive: true,
      isVipActive: true,
    });
    mocks.economyHeadlines.mockResolvedValue([{
      title: "Synthetic economy headline",
      link: "https://news.example.test/economy",
      source: "Synthetic News",
      publishedAt: "2026-07-29T08:00:00.000Z",
    }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output_text: "VIP üyelik sayfasını menüden açabilirsiniz.",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));

    const response = await POST(makeRequest("VIP üyelik sayfasına nasıl giderim?"));
    const payload = await response.json();
    const fetchMock = vi.mocked(fetch);
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      mode: "openai",
      citations: [],
      researchStatus: "unavailable",
    });
    expect(requestBody).not.toHaveProperty("tools");
    expect(requestBody.input[0].content[0].text).toContain("Synthetic economy headline");
    expect(mocks.economyHeadlines).toHaveBeenCalledWith(8, "tr");
  });

  it("enforces asset-bound numeric evidence for Standard model answers", async () => {
    process.env.OPENAI_API_KEY = "synthetic-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output_text: "AAPL fiyat 210 USD.",
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const response = await POST(makeRequest("AAPL fiyatı nedir?"));
    const payload = await response.json();

    expect(payload.mode).toBe("openai");
    expect(payload.answer).toContain("İZLE / KANIT YETERSİZ");
    expect(payload.answer).not.toContain("210 USD");
  });

  it("keeps an exact Standard price only when the server has a fresh matching provider record", async () => {
    process.env.OPENAI_API_KEY = "synthetic-key";
    const sourceAsOf = new Date().toISOString();
    mocks.getLiveMarketItems.mockResolvedValue([{
      symbol: "AAPL",
      dataSymbol: "AAPL",
      name: "Apple",
      market: "NASDAQ",
      category: "NASDAQ",
      dataStatus: "live",
      source: "yahoo",
      price: "210 USD",
      priceUsd: 210,
      changePercent: 1.2,
      sourceAsOf,
    }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output_text: "AAPL fiyat 210 USD.",
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const response = await POST(makeRequest("AAPL fiyatı nedir?"));
    const payload = await response.json();

    expect(payload.mode).toBe("openai");
    expect(payload.answer).toContain("AAPL fiyat 210 USD");
    expect(payload.answer).not.toContain("KANIT YETERSİZ");
  });
});
