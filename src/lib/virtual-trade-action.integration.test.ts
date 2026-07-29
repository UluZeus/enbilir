import { beforeEach, describe, expect, it, vi } from "vitest";

const tradeMocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  getLiveMarketItem: vi.fn(),
  accrueRepo: vi.fn(),
  getCashRate: vi.fn(),
  positionFindUnique: vi.fn(),
  transaction: vi.fn(),
  accountFindUnique: vi.fn(),
  accountUpdate: vi.fn(),
  txPositionFindUnique: vi.fn(),
  positionCreate: vi.fn(),
  positionUpdate: vi.fn(),
  positionDelete: vi.fn(),
  tradeCreate: vi.fn(),
  tradeCount: vi.fn(),
  appendAudit: vi.fn(),
  syncCorporateAction: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: tradeMocks.cookieGet,
    set: tradeMocks.cookieSet,
  }),
  headers: async () => new Headers(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((target: unknown) => {
    throw new Error(`Unexpected redirect: ${String(target)}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  canAccessAdmin: vi.fn(),
  createSession: vi.fn(),
  destroySession: vi.fn(),
  getDisplayName: vi.fn(),
  getSessionUser: tradeMocks.getSessionUser,
}));

vi.mock("@/lib/live-market", () => ({
  getLiveMarketItem: tradeMocks.getLiveMarketItem,
}));

vi.mock("@/lib/portfolio", () => ({
  accrueRepoIfNeeded: tradeMocks.accrueRepo,
  cashToUsd: (amount: number, _mode: string, rate: number) => amount * rate,
  getCashModeUsdRate: tradeMocks.getCashRate,
  usdToCash: (amount: number, _mode: string, rate: number) => amount / rate,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    portfolioPosition: {
      findUnique: tradeMocks.positionFindUnique,
    },
    virtualTrade: {
      count: tradeMocks.tradeCount,
    },
    $transaction: tradeMocks.transaction,
  },
}));

vi.mock("@/lib/audit-log", () => ({
  appendAuditEvent: tradeMocks.appendAudit,
}));

vi.mock("@/lib/portfolio-corporate-actions", () => ({
  syncPortfolioPositionCorporateAction: tradeMocks.syncCorporateAction,
}));

vi.mock("@/lib/badges", () => ({
  awardBadge: vi.fn(),
  evaluateTradeBadges: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  recordSiteAnalyticsEvent: vi.fn(),
  siteAnalyticsEvents: { firstTrade: "FIRST_TRADE" },
}));

vi.mock("@/lib/onboarding", () => ({
  reconcileOnboardingCompletion: vi.fn(),
}));

import { tradeAction } from "@/lib/actions";

const transactionClient = {
  virtualAccount: {
    findUniqueOrThrow: tradeMocks.accountFindUnique,
    update: tradeMocks.accountUpdate,
  },
  portfolioPosition: {
    findUnique: tradeMocks.txPositionFindUnique,
    create: tradeMocks.positionCreate,
    update: tradeMocks.positionUpdate,
    delete: tradeMocks.positionDelete,
  },
  virtualTrade: {
    create: tradeMocks.tradeCreate,
  },
};

function tradeForm(input: {
  side: "BUY" | "SELL";
  amountUsd: number;
  idempotencyKey?: string;
  userId?: string;
}) {
  const form = new FormData();
  form.set("locale", "tr");
  form.set("userId", input.userId ?? "user-1");
  form.set("symbol", "AAPL");
  form.set("side", input.side);
  form.set("amountUsd", String(input.amountUsd));
  form.set("idempotencyKey", input.idempotencyKey ?? "release-gate-key-0001");
  return form;
}

describe("release gate: virtual BUY/SELL accounting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tradeMocks.getSessionUser.mockResolvedValue({
      id: "user-1",
      name: "Release User",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "release@example.test",
      role: "USER",
    });
    tradeMocks.cookieGet.mockReturnValue(undefined);
    tradeMocks.getLiveMarketItem.mockResolvedValue({
      symbol: "AAPL",
      dataSymbol: "AAPL",
      name: "Apple",
      market: "NASDAQ",
      category: "NASDAQ",
      dataStatus: "live",
      priceUsd: 100,
      price: "100",
      quoteCurrency: "USD",
      source: "yahoo",
      sourceAsOf: new Date().toISOString(),
      marketState: "REGULAR",
      executionEligible: true,
    });
    tradeMocks.accrueRepo.mockResolvedValue({
      userId: "user-1",
      cashAmount: 1_000,
      cashMode: "USD",
    });
    tradeMocks.getCashRate.mockResolvedValue(1);
    tradeMocks.positionFindUnique.mockResolvedValue(null);
    tradeMocks.accountFindUnique.mockResolvedValue({
      userId: "user-1",
      cashAmount: 1_000,
      cashMode: "USD",
    });
    tradeMocks.txPositionFindUnique.mockResolvedValue(null);
    tradeMocks.accountUpdate.mockResolvedValue({});
    tradeMocks.positionCreate.mockResolvedValue({ id: "position-1" });
    tradeMocks.positionUpdate.mockResolvedValue({});
    tradeMocks.positionDelete.mockResolvedValue({});
    tradeMocks.tradeCreate.mockResolvedValue({ id: "trade-1" });
    tradeMocks.tradeCount.mockResolvedValue(2);
    tradeMocks.appendAudit.mockResolvedValue({ id: "audit-1" });
    tradeMocks.syncCorporateAction.mockResolvedValue({ reliable: true, updated: false });
    tradeMocks.transaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) => callback(transactionClient),
    );
  });

  it("books a BUY with fee/slippage inside the requested cash budget", async () => {
    const result = await tradeAction(undefined, tradeForm({ side: "BUY", amountUsd: 500 }));

    expect(result).toEqual({
      ok: true,
      message: "Alım işlemi başarıyla gerçekleşti.",
    });
    expect(tradeMocks.accountUpdate).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { cashAmount: 500 },
    });
    expect(tradeMocks.positionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        symbol: "AAPL",
        quantity: expect.any(Number),
        averagePriceUsd: expect.any(Number),
      }),
    });
    const tradeData = tradeMocks.tradeCreate.mock.calls[0][0].data;
    expect(tradeData.side).toBe("BUY");
    expect(tradeData.totalUsd).toBe(500);
    expect(tradeData.executionNotionalUsd + tradeData.feeUsd).toBeCloseTo(500, 8);
    expect(tradeData.priceUsd).toBeGreaterThan(100);
    expect(tradeData.priceSource).toBe("yahoo");
    expect(Date.now() - tradeData.priceAsOf.getTime()).toBeLessThan(5_000);
  });

  it("blocks insufficient BUY cash before opening a database transaction", async () => {
    const result = await tradeAction(undefined, tradeForm({ side: "BUY", amountUsd: 1_001 }));

    expect(result).toEqual({
      ok: false,
      message: "Bu alım için yeterli sanal nakdin yok.",
    });
    expect(tradeMocks.transaction).not.toHaveBeenCalled();
    expect(tradeMocks.tradeCreate).not.toHaveBeenCalled();
  });

  it("rechecks and rejects an internally inconsistent executable quote", async () => {
    tradeMocks.getLiveMarketItem.mockResolvedValue({
      symbol: "AAPL",
      dataSymbol: "AAPL",
      name: "Apple",
      market: "NASDAQ",
      category: "NASDAQ",
      dataStatus: "live",
      priceUsd: 100,
      price: "100",
      quoteCurrency: "USD",
      source: "yahoo",
      sourceAsOf: new Date().toISOString(),
      marketState: "CLOSED",
      executionEligible: true,
    });

    const result = await tradeAction(undefined, tradeForm({ side: "BUY", amountUsd: 500 }));

    expect(result).toEqual({
      ok: false,
      message: "Bu ürün için açık piyasa saatine ait güncel ve doğrulanmış fiyat yok. İşlem güvenlik amacıyla uygulanmadı.",
    });
    expect(tradeMocks.transaction).not.toHaveBeenCalled();
    expect(tradeMocks.tradeCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["BUY", 100.1],
    ["SELL", 99.9],
  ] as const)("uses the Gate %s side of book and records durable quote provenance", async (side, referencePrice) => {
    const sourceAsOf = new Date().toISOString();
    tradeMocks.getLiveMarketItem.mockResolvedValue({
      symbol: "XAU/USD",
      dataSymbol: "xauusd",
      name: "Gold",
      market: "Emtia",
      category: "COMMODITY",
      dataStatus: "live",
      priceUsd: 100,
      markPriceUsd: 100,
      indexPriceUsd: 100,
      lastPriceUsd: 100,
      bidPriceUsd: 99.9,
      askPriceUsd: 100.1,
      markPriceNative: 100,
      indexPriceNative: 100,
      lastPriceNative: 100,
      bidPriceNative: 99.9,
      askPriceNative: 100.1,
      quoteCurrency: "USDT",
      source: "gate",
      sourceAsOf,
      retrievedAt: sourceAsOf,
      marketState: "REGULAR",
      marketStateSource: "gate-contract-status",
      providerSymbol: "XAU_USDT",
      providerStatus: "trading",
      providerDelisting: false,
      settleCurrency: "USDT",
      priceType: "MARK",
      priceUnit: "TROY_OUNCE",
      instrumentType: "PERPETUAL_FUTURE",
      exchange: "GATE_USDT_FUTURES",
      stablecoinRate: 1,
      stablecoinAsOf: sourceAsOf,
      stablecoinProvider: "coinbase",
      executionEligible: true,
    });
    if (side === "SELL") {
      const position = {
        id: "position-1",
        userId: "user-1",
        symbol: "AAPL",
        quantity: 20,
        averagePriceUsd: 90,
        positionCycleId: "cycle-1",
      };
      tradeMocks.positionFindUnique.mockResolvedValue(position);
      tradeMocks.txPositionFindUnique.mockResolvedValue(position);
    }

    const form = tradeForm({ side, amountUsd: side === "BUY" ? 500 : 198 });
    form.set("symbol", "XAU/USD");
    const result = await tradeAction(undefined, form);

    expect(result.ok).toBe(true);
    const tradeData = tradeMocks.tradeCreate.mock.calls.at(-1)?.[0].data;
    expect(tradeData.priceUsd).toBe(
      side === "BUY" ? 100.12002 : 99.88002,
    );
    if (side === "BUY") {
      expect(tradeMocks.positionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ providerSymbol: "XAU_USDT" }),
      });
    }
    expect(tradeMocks.appendAudit).toHaveBeenCalledWith(
      transactionClient,
      expect.objectContaining({
        payload: expect.objectContaining({
          providerSymbol: "XAU_USDT",
          valuationPriceType: "MARK",
          executionReferencePriceType: side === "BUY" ? "ASK" : "BID",
          priceUnit: "TROY_OUNCE",
          quotePriceUsd: referencePrice,
          bidPriceUsd: 99.9,
          askPriceUsd: 100.1,
          markPriceUsd: 100,
          indexPriceUsd: 100,
          lastPriceUsd: 100,
          stablecoinRate: 1,
          stablecoinAsOf: sourceAsOf,
          sourceAsOf,
          providerStatus: "trading",
          source: "gate",
          retrievedAt: sourceAsOf,
          stablecoinProvider: "coinbase",
          instrumentType: "PERPETUAL_FUTURE",
          exchange: "GATE_USDT_FUTURES",
          settleCurrency: "USDT",
        }),
      }),
    );
  });

  it("refetches a Gate quote after non-USD cash conversion and blocks a stale second quote", async () => {
    const callOrder: string[] = [];
    const sourceAsOf = new Date().toISOString();
    const validGateQuote = {
      symbol: "XAU/USD",
      dataSymbol: "xauusd",
      name: "Gold",
      market: "Emtia",
      category: "COMMODITY",
      dataStatus: "live",
      priceUsd: 100,
      markPriceUsd: 100,
      indexPriceUsd: 100,
      lastPriceUsd: 100,
      bidPriceUsd: 99.9,
      askPriceUsd: 100.1,
      markPriceNative: 100,
      indexPriceNative: 100,
      lastPriceNative: 100,
      bidPriceNative: 99.9,
      askPriceNative: 100.1,
      quoteCurrency: "USDT",
      source: "gate",
      sourceAsOf,
      retrievedAt: sourceAsOf,
      marketState: "REGULAR",
      marketStateSource: "gate-contract-status",
      providerSymbol: "XAU_USDT",
      providerStatus: "trading",
      providerDelisting: false,
      settleCurrency: "USDT",
      priceType: "MARK",
      priceUnit: "TROY_OUNCE",
      instrumentType: "PERPETUAL_FUTURE",
      exchange: "GATE_USDT_FUTURES",
      stablecoinRate: 1,
      stablecoinAsOf: sourceAsOf,
      stablecoinProvider: "coinbase",
      executionEligible: true,
    };
    tradeMocks.getLiveMarketItem
      .mockImplementationOnce(async () => {
        callOrder.push("initial-quote");
        return validGateQuote;
      })
      .mockImplementationOnce(async () => {
        callOrder.push("refreshed-quote");
        return {
          ...validGateQuote,
          retrievedAt: new Date(Date.now() - 15_001).toISOString(),
        };
      });
    tradeMocks.accrueRepo.mockResolvedValue({
      userId: "user-1",
      cashAmount: 1_000,
      cashMode: "EUR",
    });
    tradeMocks.accountFindUnique.mockResolvedValue({
      userId: "user-1",
      cashAmount: 1_000,
      cashMode: "EUR",
    });
    tradeMocks.getCashRate.mockImplementation(async () => {
      callOrder.push("cash-rate");
      return 1;
    });
    const form = tradeForm({ side: "BUY", amountUsd: 500 });
    form.set("symbol", "XAU/USD");

    const result = await tradeAction(undefined, form);

    expect(result.ok).toBe(false);
    expect(callOrder).toEqual(["initial-quote", "cash-rate", "refreshed-quote"]);
    expect(tradeMocks.transaction).not.toHaveBeenCalled();
  });

  it("blocks an oversized SELL before changing cash or holdings", async () => {
    tradeMocks.positionFindUnique.mockResolvedValue({
      id: "position-1",
      userId: "user-1",
      symbol: "AAPL",
      quantity: 2,
      averagePriceUsd: 90,
      positionCycleId: "cycle-1",
    });

    const result = await tradeAction(undefined, tradeForm({ side: "SELL", amountUsd: 300 }));

    expect(result).toEqual({
      ok: false,
      message: "Satmak istediğiniz miktar portföyünüzdeki miktardan fazla.",
    });
    expect(tradeMocks.transaction).not.toHaveBeenCalled();
    expect(tradeMocks.accountUpdate).not.toHaveBeenCalled();
  });

  it("books SELL proceeds and realized P&L without changing the remaining cost basis", async () => {
    const position = {
      id: "position-1",
      userId: "user-1",
      symbol: "AAPL",
      quantity: 5,
      averagePriceUsd: 90,
      positionCycleId: "cycle-1",
    };
    tradeMocks.positionFindUnique.mockResolvedValue(position);
    tradeMocks.txPositionFindUnique.mockResolvedValue(position);

    const result = await tradeAction(undefined, tradeForm({ side: "SELL", amountUsd: 200 }));

    expect(result).toEqual({
      ok: true,
      message: "Satış işlemi başarıyla gerçekleşti.",
    });
    expect(tradeMocks.positionUpdate).toHaveBeenCalledWith({
      where: { userId_symbol: { userId: "user-1", symbol: "AAPL" } },
      data: { quantity: 3 },
    });
    const tradeData = tradeMocks.tradeCreate.mock.calls[0][0].data;
    expect(tradeData.side).toBe("SELL");
    expect(tradeData.quantity).toBe(2);
    expect(tradeData.costBasisUsd).toBe(180);
    expect(tradeData.realizedPnlUsd).toBeGreaterThan(19);
    expect(tradeData.realizedPnlPercent).toBeGreaterThan(10);
    expect(tradeMocks.accountUpdate.mock.calls[0][0].data.cashAmount).toBeGreaterThan(1_199);
  });

  it("treats a repeated request nonce as already applied and creates no second trade", async () => {
    tradeMocks.cookieGet.mockReturnValue({ value: "release-gate-key-0001" });

    const result = await tradeAction(undefined, tradeForm({
      side: "BUY",
      amountUsd: 500,
      idempotencyKey: "release-gate-key-0001",
    }));

    expect(result).toEqual({
      ok: true,
      message: "Bu işlem zaten uygulanmıştı; tekrar yazılmadı.",
    });
    expect(tradeMocks.positionFindUnique).not.toHaveBeenCalled();
    expect(tradeMocks.transaction).not.toHaveBeenCalled();
    expect(tradeMocks.tradeCreate).not.toHaveBeenCalled();
  });

  it("never accepts a submitted user id that differs from the authenticated user", async () => {
    const result = await tradeAction(undefined, tradeForm({
      side: "BUY",
      amountUsd: 500,
      userId: "victim-user",
    }));

    expect(result).toEqual({
      ok: false,
      message: "Bu işlemi yalnızca kendi hesabın için yapabilirsin.",
    });
    expect(tradeMocks.transaction).not.toHaveBeenCalled();
  });
});
