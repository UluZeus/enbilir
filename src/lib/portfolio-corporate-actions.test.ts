import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchQuote: vi.fn(),
  updateMany: vi.fn(),
  tradeUpdateMany: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/ai-market/yahoo-corporate-actions", () => ({
  fetchYahooCorporateActionQuote: mocks.fetchQuote,
  getYahooCumulativeSplitFactor: (events: Array<{ factor: number }>) =>
    events.reduce((factor, event) => factor * event.factor, 1),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    portfolioPosition: {
      updateMany: mocks.updateMany,
      findUnique: mocks.findUnique,
    },
    virtualTrade: {
      updateMany: mocks.tradeUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}));

import {
  calculatePortfolioSplitAdjustment,
  isYahooEquityMarket,
  shouldForceCorporateActionSyncForPrice,
  shouldSyncPortfolioCorporateAction,
  syncPortfolioCorporateActions,
} from "@/lib/portfolio-corporate-actions";

describe("portfolio pre-trade stock-split adjustment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.tradeUpdateMany.mockResolvedValue({ count: 2 });
    mocks.transaction.mockImplementation(async (callback: (transaction: {
      portfolioPosition: { updateMany: typeof mocks.updateMany };
      virtualTrade: { updateMany: typeof mocks.tradeUpdateMany };
    }) => unknown) => callback({
      portfolioPosition: { updateMany: mocks.updateMany },
      virtualTrade: { updateMany: mocks.tradeUpdateMany },
    }));
  });

  it("adjusts the existing lot before a post-split buy so the new lot is not multiplied later", () => {
    const adjusted = calculatePortfolioSplitAdjustment({
      quantity: 10,
      averagePriceUsd: 100,
      appliedSplitFactor: 1,
    }, 2);

    expect(adjusted).toEqual({
      adjustmentFactor: 2,
      appliedSplitFactor: 2,
      quantity: 20,
      averagePriceUsd: 50,
    });

    const postSplitBuyQuantity = 10;
    const postSplitBuyCostUsd = 500;
    const combinedQuantity = adjusted!.quantity + postSplitBuyQuantity;
    const combinedCostUsd = adjusted!.quantity * adjusted!.averagePriceUsd + postSplitBuyCostUsd;

    expect(combinedQuantity).toBe(30);
    expect(combinedCostUsd / combinedQuantity).toBe(50);
    expect(calculatePortfolioSplitAdjustment({
      quantity: combinedQuantity,
      averagePriceUsd: combinedCostUsd / combinedQuantity,
      appliedSplitFactor: adjusted!.appliedSplitFactor,
    }, 2)).toMatchObject({
      adjustmentFactor: 1,
      quantity: 30,
      averagePriceUsd: 50,
    });
  });

  it("rejects invalid cumulative or previously applied split factors", () => {
    expect(calculatePortfolioSplitAdjustment({
      quantity: 10,
      averagePriceUsd: 100,
      appliedSplitFactor: 1,
    }, 0)).toBeNull();
    expect(calculatePortfolioSplitAdjustment({
      quantity: 10,
      averagePriceUsd: 100,
      appliedSplitFactor: 0,
    }, 2)).toBeNull();
  });

  it("forces a fresh corporate-action check before a trade even after a recent valuation check", () => {
    const now = new Date("2026-07-28T09:00:00.000Z");
    const position = {
      market: "Nasdaq Hisse",
      corporateActionsCheckedAt: new Date("2026-07-28T08:00:00.000Z"),
    };

    expect(shouldSyncPortfolioCorporateAction(position, now)).toBe(false);
    expect(shouldSyncPortfolioCorporateAction(position, now, true)).toBe(true);
  });

  it("limits corporate-action freshness requirements to Yahoo equity markets", () => {
    expect(isYahooEquityMarket("Nasdaq Hisse")).toBe(true);
    expect(isYahooEquityMarket("Kripto Para")).toBe(false);
    expect(isYahooEquityMarket("Emtia")).toBe(false);
    expect(isYahooEquityMarket("Döviz")).toBe(false);
    expect(shouldSyncPortfolioCorporateAction({
      market: "Kripto Para",
      corporateActionsCheckedAt: null,
    }, new Date("2026-07-28T09:00:00.000Z"))).toBe(false);
  });

  it("requires a new corporate-action check when the market price is newer than the last check", () => {
    expect(shouldForceCorporateActionSyncForPrice(
      new Date("2026-07-28T08:00:00.000Z"),
      new Date("2026-07-28T09:00:00.000Z"),
    )).toBe(true);
    expect(shouldForceCorporateActionSyncForPrice(
      new Date("2026-07-28T09:00:00.000Z"),
      new Date("2026-07-28T08:00:00.000Z"),
    )).toBe(false);
    expect(shouldForceCorporateActionSyncForPrice(null, new Date("2026-07-28T09:00:00.000Z"))).toBe(true);
  });

  it("marks a position unreliable when its required corporate-action lookup fails", async () => {
    mocks.fetchQuote.mockRejectedValue(new Error("provider unavailable"));
    const position = {
      id: "position-1",
      symbol: "NVDA",
      providerSymbol: "NVDA",
      market: "Nasdaq Hisse",
      quantity: 10,
      averagePriceUsd: 100,
      appliedSplitFactor: 1,
      corporateActionsCheckedAt: new Date("2026-07-28T08:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    await expect(syncPortfolioCorporateActions(
      [position],
      new Date("2026-07-28T09:00:00.000Z"),
      new Map([["NVDA", new Date("2026-07-28T08:30:00.000Z")]]),
    )).resolves.toEqual({
      updatedCount: 0,
      unreliablePositionIds: ["position-1"],
    });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("forces and records a split check before using a newer market price", async () => {
    mocks.fetchQuote.mockResolvedValue({
      providerSymbol: "NVDA",
      splitEvents: [{ factor: 2 }],
    });
    const position = {
      id: "position-2",
      userId: "user-1",
      positionCycleId: "cycle-1",
      symbol: "NVDA",
      providerSymbol: "NVDA",
      market: "Nasdaq Hisse",
      quantity: 10,
      averagePriceUsd: 100,
      appliedSplitFactor: 1,
      corporateActionsCheckedAt: new Date("2026-07-28T08:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    await expect(syncPortfolioCorporateActions(
      [position],
      new Date("2026-07-28T09:00:00.000Z"),
      new Map([["NVDA", new Date("2026-07-28T08:30:00.000Z")]]),
    )).resolves.toEqual({
      updatedCount: 1,
      unreliablePositionIds: [],
    });
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "position-2", appliedSplitFactor: 1 },
      data: expect.objectContaining({
        quantity: 20,
        averagePriceUsd: 50,
        appliedSplitFactor: 2,
      }),
    }));
    expect(mocks.tradeUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", positionCycleId: "cycle-1" },
      data: { quantity: { multiply: expect.anything() } },
    });
    expect(mocks.tradeUpdateMany.mock.calls[0][0].data.quantity.multiply.toString()).toBe("2");
  });

  it("split-adjusts pre-existing BUY and partial-SELL lot quantities in the same transaction", async () => {
    mocks.fetchQuote.mockResolvedValue({
      providerSymbol: "NVDA",
      splitEvents: [{ factor: 4 }],
    });
    const position = {
      id: "position-3",
      userId: "user-1",
      positionCycleId: "cycle-partial",
      symbol: "NVDA",
      providerSymbol: "NVDA",
      market: "Nasdaq Hisse",
      quantity: 6,
      averagePriceUsd: 100,
      appliedSplitFactor: 1,
      corporateActionsCheckedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    await syncPortfolioCorporateActions([position], new Date("2026-07-28T09:00:00.000Z"));

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.tradeUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", positionCycleId: "cycle-partial" },
      data: { quantity: { multiply: expect.anything() } },
    });
    expect(mocks.tradeUpdateMany.mock.calls[0][0].data.quantity.multiply.toString()).toBe("4");
  });
});
