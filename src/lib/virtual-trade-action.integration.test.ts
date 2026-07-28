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
      priceUsd: 100,
      quoteCurrency: "USD",
      source: "yahoo",
      sourceAsOf: "2026-07-28T12:00:00.000Z",
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
    expect(tradeData.priceAsOf.toISOString()).toBe("2026-07-28T12:00:00.000Z");
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
