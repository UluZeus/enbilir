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
  reconcileOnboarding: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: tradeMocks.cookieGet,
    set: tradeMocks.cookieSet,
  }),
  headers: async () => new Headers(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: tradeMocks.revalidatePath,
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
  reconcileOnboardingCompletion: tradeMocks.reconcileOnboarding,
}));

import { tradeAction } from "@/lib/actions";
import { Prisma } from "@/generated/prisma/client";
import { isExecutableMarketQuote } from "@/lib/executable-quote";
import type { MarketItem } from "@/lib/market-data";
import { decimalToNumber } from "@/lib/decimal";

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
    tradeMocks.getLiveMarketItem.mockReset();
    tradeMocks.getCashRate.mockReset();
    tradeMocks.cookieSet.mockReset();
    tradeMocks.revalidatePath.mockReset();
    tradeMocks.transaction.mockReset();
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
    tradeMocks.reconcileOnboarding.mockResolvedValue(undefined);
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
      data: { cashAmount: expect.any(Prisma.Decimal) },
    });
    expect(tradeMocks.positionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        symbol: "AAPL",
        quantity: expect.any(Prisma.Decimal),
        averagePriceUsd: expect.any(Prisma.Decimal),
      }),
    });
    const tradeData = tradeMocks.tradeCreate.mock.calls[0][0].data;
    expect(tradeData.side).toBe("BUY");
    expect(decimalToNumber(tradeData.totalUsd)).toBe(500);
    expect(decimalToNumber(tradeData.executionNotionalUsd.plus(tradeData.feeUsd))).toBeCloseTo(500, 8);
    expect(decimalToNumber(tradeData.priceUsd)).toBeGreaterThan(100);
    expect(tradeData.priceSource).toBe("yahoo");
    expect(Date.now() - tradeData.priceAsOf.getTime()).toBeLessThan(5_000);
  });

  it("retries a serializable virtual-account mutation after a write conflict", async () => {
    tradeMocks.transaction
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError(
        "synthetic write conflict",
        { code: "P2034", clientVersion: "test" },
      ))
      .mockImplementationOnce(
        (callback: (transaction: typeof transactionClient) => unknown) => callback(transactionClient),
      );

    await expect(tradeAction(undefined, tradeForm({ side: "BUY", amountUsd: 500 }))).resolves.toEqual({
      ok: true,
      message: "Alım işlemi başarıyla gerçekleşti.",
    });

    expect(tradeMocks.transaction).toHaveBeenCalledTimes(2);
    expect(tradeMocks.transaction).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" }),
    );
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
      price: "100",
      priceUsd: 100,
      changePercent: 0,
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
    expect(decimalToNumber(tradeData.priceUsd)).toBe(
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
          quotePriceUsd: String(referencePrice),
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
    expect(tradeMocks.getLiveMarketItem).toHaveBeenCalledTimes(1);
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
      price: "100",
      priceUsd: 100,
      changePercent: 0,
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
      validGateQuote.retrievedAt = new Date(Date.now() - 15_001).toISOString();
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

  it("rejects a SELL that exceeds the exact 12-decimal holding by one unit", async () => {
    const position = {
      id: "position-1",
      userId: "user-1",
      symbol: "AAPL",
      quantity: new Prisma.Decimal("1.000000000000"),
      averagePriceUsd: 90,
      positionCycleId: "cycle-1",
    };
    tradeMocks.positionFindUnique.mockResolvedValue(position);
    tradeMocks.txPositionFindUnique.mockResolvedValue(position);

    const result = await tradeAction(undefined, tradeForm({
      side: "SELL",
      amountUsd: 100.0000000001,
    }));

    expect(result).toEqual({
      ok: false,
      message: "Satmak istediğiniz miktar portföyünüzdeki miktardan fazla.",
    });
    expect(tradeMocks.accountUpdate).not.toHaveBeenCalled();
    expect(tradeMocks.positionDelete).not.toHaveBeenCalled();
    expect(tradeMocks.tradeCreate).not.toHaveBeenCalled();
  });

  it("preserves and credits an exactly owned sub-micro remainder instead of deleting it as dust", async () => {
    const position = {
      id: "position-1",
      userId: "user-1",
      symbol: "AAPL",
      quantity: new Prisma.Decimal("1.000000500000"),
      averagePriceUsd: 90,
      positionCycleId: "cycle-1",
    };
    tradeMocks.positionFindUnique.mockResolvedValue(position);
    tradeMocks.txPositionFindUnique.mockResolvedValue(position);

    const result = await tradeAction(undefined, tradeForm({ side: "SELL", amountUsd: 100 }));

    expect(result.ok).toBe(true);
    expect(tradeMocks.positionDelete).not.toHaveBeenCalled();
    const remainingQuantity = tradeMocks.positionUpdate.mock.calls[0][0].data.quantity as Prisma.Decimal;
    expect(remainingQuantity.toFixed(12)).toBe("0.000000500000");
  });

  it("clamps only a whole-dollar UI-rounded full sale and recomputes proceeds from exact ownership", async () => {
    const position = {
      id: "position-1",
      userId: "user-1",
      symbol: "AAPL",
      quantity: new Prisma.Decimal("0.999999999999"),
      averagePriceUsd: 90,
      positionCycleId: "cycle-1",
    };
    tradeMocks.positionFindUnique.mockResolvedValue(position);
    tradeMocks.txPositionFindUnique.mockResolvedValue(position);

    const result = await tradeAction(undefined, tradeForm({ side: "SELL", amountUsd: 100 }));

    expect(result.ok).toBe(true);
    expect(tradeMocks.positionDelete).toHaveBeenCalledTimes(1);
    const tradeData = tradeMocks.tradeCreate.mock.calls[0][0].data;
    expect(tradeData.quantity).toBe("0.999999999999");
    expect(tradeData.totalUsd.lessThan(100)).toBe(true);
    expect(tradeData.totalUsd.toString()).toBe(
      tradeMocks.accountUpdate.mock.calls[0][0].data.cashAmount.minus(1_000).toString(),
    );
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
      data: { quantity: expect.any(Prisma.Decimal) },
    });
    const tradeData = tradeMocks.tradeCreate.mock.calls[0][0].data;
    expect(tradeData.side).toBe("SELL");
    expect(decimalToNumber(tradeData.quantity)).toBe(2);
    expect(decimalToNumber(tradeData.costBasisUsd)).toBe(180);
    expect(decimalToNumber(tradeData.realizedPnlUsd)).toBeGreaterThan(19);
    expect(decimalToNumber(tradeData.realizedPnlPercent)).toBeGreaterThan(10);
    expect(decimalToNumber(tradeMocks.accountUpdate.mock.calls[0][0].data.cashAmount)).toBeGreaterThan(1_199);
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
    expect(tradeMocks.cookieGet).toHaveBeenCalledWith("enbilir_trade_user-1");
    expect(tradeMocks.positionFindUnique).not.toHaveBeenCalled();
    expect(tradeMocks.transaction).not.toHaveBeenCalled();
    expect(tradeMocks.tradeCreate).not.toHaveBeenCalled();
  });

  it("uses the host-prefixed trade idempotency cookie for production reads and writes", async () => {
    vi.stubEnv("NODE_ENV", "production");

    try {
      const result = await tradeAction(undefined, tradeForm({ side: "BUY", amountUsd: 500 }));

      expect(result).toEqual({
        ok: true,
        message: "Alım işlemi başarıyla gerçekleşti.",
      });
      expect(tradeMocks.cookieGet).toHaveBeenCalledWith("__Host-enbilir_trade_user-1");
      expect(tradeMocks.cookieSet).toHaveBeenCalledWith(
        "__Host-enbilir_trade_user-1",
        "release-gate-key-0001",
        {
          httpOnly: true,
          sameSite: "strict",
          secure: true,
          path: "/",
          maxAge: 60 * 10,
        },
      );
    } finally {
      vi.unstubAllEnvs();
    }
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

  it("returns success and revalidates after post-commit onboarding reconciliation fails", async () => {
    tradeMocks.reconcileOnboarding.mockRejectedValueOnce(new Error("synthetic onboarding failure"));

    const result = await tradeAction(undefined, tradeForm({ side: "BUY", amountUsd: 500 }));

    expect(result).toEqual({
      ok: true,
      message: "Alım işlemi başarıyla gerçekleşti.",
    });
    expect(tradeMocks.tradeCreate).toHaveBeenCalledTimes(1);
    expect(tradeMocks.revalidatePath).toHaveBeenCalled();
  });

  it("refreshes an expired Yahoo quote once immediately before the transaction and recalculates execution", async () => {
    const initialQuote = {
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
    };
    const refreshedQuote = {
      ...initialQuote,
      priceUsd: 125,
      price: "125",
      sourceAsOf: new Date().toISOString(),
    };
    tradeMocks.getLiveMarketItem
      .mockResolvedValueOnce(initialQuote)
      .mockResolvedValueOnce(refreshedQuote);
    tradeMocks.getCashRate.mockImplementation(async () => {
      initialQuote.sourceAsOf = new Date(Date.now() - 20 * 60_000 - 1).toISOString();
      return 1;
    });

    const result = await tradeAction(undefined, tradeForm({ side: "BUY", amountUsd: 500 }));

    expect(result.ok).toBe(true);
    expect(tradeMocks.getLiveMarketItem).toHaveBeenNthCalledWith(2, "AAPL", { refresh: true });
    expect(decimalToNumber(tradeMocks.tradeCreate.mock.calls[0][0].data.quantity)).toBeCloseTo(
      500 / 125.0375,
      6,
    );
  });

  it("fails closed when a non-Gate quote expires and its single refresh is not executable", async () => {
    const initialQuote = {
      symbol: "AAPL",
      dataSymbol: "AAPL",
      name: "Apple",
      market: "NASDAQ",
      category: "NASDAQ",
      dataStatus: "live",
      priceUsd: 100,
      price: "100",
      source: "yahoo",
      sourceAsOf: new Date().toISOString(),
      marketState: "REGULAR",
      executionEligible: true,
    };
    tradeMocks.getLiveMarketItem
      .mockResolvedValueOnce(initialQuote)
      .mockResolvedValueOnce({ ...initialQuote, marketState: "CLOSED" });
    tradeMocks.getCashRate.mockImplementation(async () => {
      initialQuote.sourceAsOf = new Date(Date.now() - 20 * 60_000 - 1).toISOString();
      return 1;
    });

    const result = await tradeAction(undefined, tradeForm({ side: "BUY", amountUsd: 500 }));

    expect(result.ok).toBe(false);
    expect(tradeMocks.getLiveMarketItem).toHaveBeenCalledTimes(2);
    expect(tradeMocks.transaction).not.toHaveBeenCalled();
  });

  it("recalculates SELL quantity from the refreshed quote before rejecting position size", async () => {
    const position = {
      id: "position-1",
      userId: "user-1",
      symbol: "AAPL",
      quantity: 4.5,
      averagePriceUsd: 90,
      positionCycleId: "cycle-1",
    };
    const initialQuote = {
      symbol: "AAPL",
      dataSymbol: "AAPL",
      name: "Apple",
      market: "NASDAQ",
      category: "NASDAQ",
      dataStatus: "live",
      priceUsd: 100,
      price: "100",
      source: "yahoo",
      sourceAsOf: new Date().toISOString(),
      marketState: "REGULAR",
      executionEligible: true,
    };
    tradeMocks.positionFindUnique.mockResolvedValue(position);
    tradeMocks.txPositionFindUnique.mockResolvedValue(position);
    tradeMocks.getLiveMarketItem
      .mockResolvedValueOnce(initialQuote)
      .mockResolvedValueOnce({
        ...initialQuote,
        priceUsd: 125,
        price: "125",
        sourceAsOf: new Date().toISOString(),
      });
    tradeMocks.getCashRate.mockImplementation(async () => {
      initialQuote.sourceAsOf = new Date(Date.now() - 20 * 60_000 - 1).toISOString();
      return 1;
    });

    const result = await tradeAction(undefined, tradeForm({ side: "SELL", amountUsd: 500 }));

    expect(result.ok).toBe(true);
    expect(tradeMocks.getLiveMarketItem).toHaveBeenCalledTimes(2);
    expect(decimalToNumber(tradeMocks.tradeCreate.mock.calls[0][0].data.quantity)).toBe(4);
  });

  it("returns success when cookie persistence and path revalidation fail after commit", async () => {
    tradeMocks.cookieSet.mockImplementationOnce(() => {
      throw new Error("synthetic cookie failure");
    });
    tradeMocks.revalidatePath.mockImplementation(() => {
      throw new Error("synthetic revalidation failure");
    });

    const result = await tradeAction(undefined, tradeForm({ side: "BUY", amountUsd: 500 }));

    expect(result).toEqual({
      ok: true,
      message: "Alım işlemi başarıyla gerçekleşti.",
    });
    expect(tradeMocks.tradeCreate).toHaveBeenCalledTimes(1);
  });

  it("does not enter a transaction when Gate watermark rejects an otherwise executable refresh", async () => {
    const sourceAsOf = new Date(Date.now() - 20_000).toISOString();
    const gateQuote = {
      symbol: "XAU/USD",
      dataSymbol: "xauusd",
      name: "Gold",
      market: "Emtia",
      category: "COMMODITY",
      dataStatus: "live",
      price: "100",
      priceUsd: 100,
      changePercent: 0,
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
      retrievedAt: new Date().toISOString(),
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
      stablecoinAsOf: new Date().toISOString(),
      stablecoinProvider: "coinbase",
      executionEligible: true,
    } satisfies MarketItem;
    const rejectedRefresh = {
      ...gateQuote,
      sourceAsOf: new Date(Date.now() - 25_000).toISOString(),
      retrievedAt: new Date().toISOString(),
      executionEligible: false,
    };
    tradeMocks.getLiveMarketItem
      .mockResolvedValueOnce(gateQuote)
      .mockResolvedValueOnce(rejectedRefresh);
    tradeMocks.getCashRate.mockImplementation(async () => {
      gateQuote.retrievedAt = new Date(Date.now() - 15_001).toISOString();
      return 1;
    });
    const form = tradeForm({ side: "BUY", amountUsd: 500 });
    form.set("symbol", "XAU/USD");

    const result = await tradeAction(undefined, form);

    expect(isExecutableMarketQuote(rejectedRefresh, {
      requireEligibilityFlag: false,
    })).toBe(true);
    expect(result.ok).toBe(false);
    expect(tradeMocks.getLiveMarketItem).toHaveBeenCalledTimes(2);
    expect(tradeMocks.transaction).not.toHaveBeenCalled();
  });

  it("does not enter a transaction when the symbol watermark rejects an older Yahoo provider switch", async () => {
    const currentTime = Date.now();
    const gateQuote = {
      symbol: "XAU/USD",
      dataSymbol: "xauusd",
      name: "Gold",
      market: "Emtia",
      category: "COMMODITY",
      dataStatus: "live",
      price: "100",
      priceUsd: 100,
      changePercent: 0,
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
      sourceAsOf: new Date(currentTime - 20_000).toISOString(),
      retrievedAt: new Date(currentTime).toISOString(),
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
      stablecoinAsOf: new Date(currentTime).toISOString(),
      stablecoinProvider: "coinbase",
      executionEligible: true,
    } satisfies MarketItem;
    const rejectedYahoo = {
      symbol: "XAU/USD",
      dataSymbol: "xauusd",
      name: "Gold",
      market: "Emtia",
      category: "COMMODITY",
      dataStatus: "live",
      price: "2350",
      priceUsd: 2_350,
      priceNative: 2_350,
      changePercent: 0,
      source: "yahoo",
      sourceAsOf: new Date(currentTime - 25_000).toISOString(),
      marketState: "INFERRED_REGULAR",
      marketStateSource: "inferred-commodity-session",
      providerSymbol: "GC=F",
      instrumentType: "FUTURE",
      exchange: "CMX",
      regularSessionStart: new Date(currentTime - 60 * 60_000).toISOString(),
      regularSessionEnd: new Date(currentTime + 60 * 60_000).toISOString(),
      exchangeDataDelayedBy: 0,
      executionEligible: false,
    } satisfies MarketItem;
    tradeMocks.getLiveMarketItem
      .mockResolvedValueOnce(gateQuote)
      .mockResolvedValueOnce(rejectedYahoo);
    tradeMocks.getCashRate.mockImplementation(async () => {
      gateQuote.retrievedAt = new Date(Date.now() - 15_001).toISOString();
      return 1;
    });
    const form = tradeForm({ side: "BUY", amountUsd: 500 });
    form.set("symbol", "XAU/USD");

    const result = await tradeAction(undefined, form);

    expect(isExecutableMarketQuote(rejectedYahoo, {
      requireEligibilityFlag: false,
    })).toBe(true);
    expect(result.ok).toBe(false);
    expect(tradeMocks.getLiveMarketItem).toHaveBeenCalledTimes(2);
    expect(tradeMocks.transaction).not.toHaveBeenCalled();
  });

  it("treats only the VirtualTrade idempotency unique target as duplicate success", async () => {
    tradeMocks.transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError(
      "duplicate virtual trade",
      {
        code: "P2002",
        clientVersion: "test",
        meta: {
          modelName: "VirtualTrade",
          target: ["userId", "idempotencyKey"],
        },
      },
    ));

    const result = await tradeAction(undefined, tradeForm({ side: "BUY", amountUsd: 500 }));

    expect(result).toEqual({
      ok: true,
      message: "Bu işlem zaten uygulanmıştı; tekrar yazılmadı.",
    });
  });

  it("does not report a position unique violation as duplicate trade success", async () => {
    tradeMocks.transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError(
      "duplicate portfolio position",
      {
        code: "P2002",
        clientVersion: "test",
        meta: {
          modelName: "PortfolioPosition",
          target: ["userId", "symbol"],
        },
      },
    ));

    const result = await tradeAction(undefined, tradeForm({ side: "BUY", amountUsd: 500 }));

    expect(result).toEqual({
      ok: false,
      message: "duplicate portfolio position",
    });
  });
});
