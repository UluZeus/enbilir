import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeAgentAssets: vi.fn(),
  collectAgentNews: vi.fn(),
  generateAiReportDraft: vi.fn(),
  getUserFavoriteSymbols: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/ai-market/agent/analysis", () => ({
  AI_MARKET_AGENT_INTERVAL: "1d",
  analyzeAgentAssets: mocks.analyzeAgentAssets,
}));
vi.mock("@/lib/ai-market/agent/llm", () => ({ generateAiReportDraft: mocks.generateAiReportDraft }));
vi.mock("@/lib/ai-market/agent/news", () => ({ collectAgentNews: mocks.collectAgentNews }));
vi.mock("@/lib/ai-market/favorites", () => ({ getUserFavoriteSymbols: mocks.getUserFavoriteSymbols }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiMarketReport: {
      findFirst: mocks.findFirst,
      create: mocks.create,
    },
  },
}));

import { runAiMarketAgent } from "@/lib/ai-market/agent/report-agent";

function uniqueConflict(index: string) {
  return {
    code: "P2002",
    meta: {
      modelName: "AiMarketReport",
      driverAdapterError: { cause: { constraint: { index } } },
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.analyzeAgentAssets.mockResolvedValue([]);
  mocks.collectAgentNews.mockResolvedValue([]);
  mocks.generateAiReportDraft.mockResolvedValue(null);
  mocks.getUserFavoriteSymbols.mockResolvedValue([]);
});

describe("AI market report idempotency", () => {
  it("writes a non-null public audience key for global and weekly reports", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.create
      .mockResolvedValueOnce({ id: "global-report" })
      .mockResolvedValueOnce({ id: "weekly-report" });

    await runAiMarketAgent();
    await runAiMarketAgent({ reportMode: "WEEKLY" });

    expect(mocks.create.mock.calls[0][0].data).toMatchObject({
      audienceKey: "PUBLIC",
      scope: "GLOBAL",
      userId: null,
    });
    expect(mocks.create.mock.calls[1][0].data).toMatchObject({
      audienceKey: "PUBLIC",
      scope: "WEEKLY",
      userId: null,
    });
  });

  it("uses the user id as audience without changing user-scoped uniqueness", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "user-report" });

    await runAiMarketAgent({ userId: "user-1" });

    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ audienceKey: "user-1", scope: "USER", userId: "user-1" }),
    }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ audienceKey: "user-1", scope: "USER", userId: "user-1" }),
    }));
  });

  it("deterministically reuses the winner when concurrent global creates collide", async () => {
    mocks.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "winner", fallbackUsed: false });
    mocks.create
      .mockResolvedValueOnce({ id: "winner" })
      .mockRejectedValueOnce(uniqueConflict("AiMarketReport_audienceKey_periodKey_scope_key"));

    const results = await Promise.all([runAiMarketAgent(), runAiMarketAgent()]);

    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ reportId: "winner", reused: false }),
      expect.objectContaining({ reportId: "winner", reused: true, fallbackUsed: false }),
    ]));
  });

  it("does not hide P2002 errors from unrelated constraints", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const conflict = uniqueConflict("AiMarketReportAsset_reportId_symbol_key");
    mocks.create.mockRejectedValue(conflict);

    await expect(runAiMarketAgent()).rejects.toBe(conflict);
  });
});
