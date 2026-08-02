import { beforeEach, describe, expect, it, vi } from "vitest";

const leaderboardMocks = vi.hoisted(() => ({
  userFindMany: vi.fn(),
  snapshotFindMany: vi.fn(),
  baselineFindMany: vi.fn(),
  membershipFindMany: vi.fn(),
  getLiveItems: vi.fn(),
  hasVerifiedPortfolioQuote: vi.fn(),
  getCashModeUsdRate: vi.fn(),
  virtualAccountCreate: vi.fn(),
  virtualAccountUpdate: vi.fn(),
  positionFindMany: vi.fn(),
  tradeFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: leaderboardMocks.userFindMany },
    portfolioSnapshot: { findMany: leaderboardMocks.snapshotFindMany },
    weeklyPortfolioBaseline: { findMany: leaderboardMocks.baselineFindMany },
    leagueMembership: { findMany: leaderboardMocks.membershipFindMany },
    virtualAccount: {
      create: leaderboardMocks.virtualAccountCreate,
      update: leaderboardMocks.virtualAccountUpdate,
    },
    portfolioPosition: { findMany: leaderboardMocks.positionFindMany },
    virtualTrade: { findMany: leaderboardMocks.tradeFindMany },
  },
}));

vi.mock("@/lib/live-market", () => ({
  getLiveMarketItemsForSymbols: leaderboardMocks.getLiveItems,
}));

vi.mock("@/lib/portfolio", () => ({
  initialCashUsd: 1_000_000,
  hasVerifiedPortfolioQuote: leaderboardMocks.hasVerifiedPortfolioQuote,
  getCashModeUsdRate: leaderboardMocks.getCashModeUsdRate,
}));

import { getPortfolioEquityLeaderboard } from "@/lib/portfolio-equity-leaderboard";

const now = new Date("2026-08-02T12:00:00.000Z");

type ParticipantOptions = {
  name?: string;
  nickname?: string | null;
  displayNameMode?: "REAL_NAME" | "NICKNAME";
  cashMode?: "USD" | "EUR" | "CHF" | "TRY_REPO";
  cashAmount?: number;
  dailyRepoRate?: number;
  repoLastAccruedAt?: Date | null;
  updatedAt?: Date;
  positions?: Array<{
    symbol: string;
    market?: string;
    quantity: number;
    appliedSplitFactor?: number;
    corporateActionsCheckedAt?: Date | null;
  }>;
};

function participant(id: string, options: ParticipantOptions = {}) {
  return {
    id,
    name: options.name ?? "",
    nickname: options.nickname ?? null,
    displayNameMode: options.displayNameMode ?? "REAL_NAME",
    virtualAccount: {
      cashMode: options.cashMode ?? "USD",
      cashAmount: options.cashAmount ?? 1_000_000,
      dailyRepoRate: options.dailyRepoRate ?? 0.00125,
      repoLastAccruedAt: options.repoLastAccruedAt ?? null,
      updatedAt: options.updatedAt ?? new Date("2026-08-01T12:00:00.000Z"),
    },
    positions: (options.positions ?? []).map((position) => ({
      ...position,
      market: position.market ?? "Nasdaq Hisse",
      appliedSplitFactor: position.appliedSplitFactor ?? 1,
      corporateActionsCheckedAt: position.corporateActionsCheckedAt === undefined
        ? new Date("2026-08-01T12:00:00.000Z")
        : position.corporateActionsCheckedAt,
    })),
  };
}

function verifiedHistory(userId: string, weeklyValue: number, monthlyValue = weeklyValue) {
  return [
    {
      userId,
      periodKey: "equity-hour:2026070312",
      portfolioValueUsd: monthlyValue,
      capturedAt: new Date("2026-07-03T12:00:00.000Z"),
    },
    {
      userId,
      periodKey: "equity-hour:2026072612",
      portfolioValueUsd: weeklyValue,
      capturedAt: new Date("2026-07-26T12:00:00.000Z"),
    },
  ];
}

describe("portfolio equity leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("viewer", { nickname: "Ignored private alias", cashAmount: 1_050_000 }),
      participant("alpha", { cashAmount: 1_190_000, positions: [{ symbol: "AAPL", quantity: 100 }] }),
      participant("beta", { cashAmount: 1_100_000 }),
    ]);
    leaderboardMocks.snapshotFindMany.mockResolvedValue([]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([
      ...verifiedHistory("viewer", 1_000_000),
      ...verifiedHistory("alpha", 1_188_000, 1_180_000),
      ...verifiedHistory("beta", 550_000, 550_000),
    ]);
    leaderboardMocks.getLiveItems.mockResolvedValue([{ symbol: "AAPL", priceUsd: 100 }]);
    leaderboardMocks.hasVerifiedPortfolioQuote.mockReturnValue(true);
    leaderboardMocks.getCashModeUsdRate.mockResolvedValue(1);
    leaderboardMocks.membershipFindMany.mockResolvedValue([]);
  });

  it("ranks pure current equity rather than weekly return, preserving verified returns without a weekly trade", async () => {
    const result = await getPortfolioEquityLeaderboard("viewer", now);

    expect(result.rows.map((row) => ({ alias: row.alias, totalValueUsd: row.totalValueUsd, rank: row.rank }))).toEqual([
      { alias: "Participant #8ED3F6", totalValueUsd: 1_200_000, rank: 1 },
      { alias: "Participant #F44E64", totalValueUsd: 1_100_000, rank: 2 },
      { alias: "Participant #D35CA5", totalValueUsd: 1_050_000, rank: 3 },
    ]);
    expect(result.rows[1]).toMatchObject({ weeklyReturnPercent: 100, monthlyReturnPercent: 100 });
    expect(result.rows[0]).toMatchObject({ weeklyReturnPercent: 1.01010101, monthlyReturnPercent: 1.69491525 });
    expect(result.rows[0]?.totalReturnPercent).toBe(20);
  });

  it("shares ranks for equal canonical micro-USD values and keeps deterministic alias order", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("viewer"),
      participant("z-user", { cashAmount: 1_100_000.0000004 }),
      participant("a-user", { cashAmount: 1_100_000.0000004 }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([
      ...verifiedHistory("viewer", 1_000_000),
      ...verifiedHistory("z-user", 1_000_000),
      ...verifiedHistory("a-user", 1_000_000),
    ]);

    const result = await getPortfolioEquityLeaderboard("viewer", now);

    expect(result.rows.map((row) => ({ alias: row.alias, rank: row.rank }))).toEqual([
      { alias: "Participant #67F844", rank: 1 },
      { alias: "Participant #E36939", rank: 1 },
      { alias: "Participant #D35CA5", rank: 3 },
    ]);
    expect(result.viewerRank).toBe(3);
  });

  it("uses read-only prefetched account and position data, with one market batch and no per-user fetch or writes", async () => {
    const result = await getPortfolioEquityLeaderboard("viewer", now);

    expect(result.rows[0]).toMatchObject({ totalValueUsd: 1_200_000 });
    expect(leaderboardMocks.userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isActive: true,
        emailVerifiedAt: { not: null },
        virtualAccount: { isNot: null },
        trades: { some: {} },
      },
      select: expect.objectContaining({
        name: true,
        positions: expect.any(Object),
        virtualAccount: expect.any(Object),
      }),
    }));
    const userSelect = leaderboardMocks.userFindMany.mock.calls[0]?.[0]?.select;
    expect(userSelect).not.toHaveProperty("email");
    expect(leaderboardMocks.getLiveItems).toHaveBeenCalledTimes(1);
    expect(leaderboardMocks.getLiveItems).toHaveBeenCalledWith(["AAPL"]);
    expect(leaderboardMocks.positionFindMany).not.toHaveBeenCalled();
    expect(leaderboardMocks.tradeFindMany).not.toHaveBeenCalled();
    expect(leaderboardMocks.virtualAccountCreate).not.toHaveBeenCalled();
    expect(leaderboardMocks.virtualAccountUpdate).not.toHaveBeenCalled();
  });

  it("uses the selected real name or nickname without leaking a hidden nickname", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("real-name-mode", {
        name: "  Real Person  ",
        nickname: "Do Not Show",
        displayNameMode: "REAL_NAME",
        cashAmount: 1_100_000,
      }),
      participant("nickname-mode", {
        name: "Private Real Name",
        nickname: "Market Friend",
        displayNameMode: "NICKNAME",
      }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([]);

    const result = await getPortfolioEquityLeaderboard("real-name-mode", now);

    expect(result.rows.map((row) => row.alias)).toEqual(["Real Person", "Market Friend"]);
    expect(JSON.stringify(result)).not.toContain("Do Not Show");
    expect(JSON.stringify(result)).not.toContain("Private Real Name");

    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("real-name-mode", {
        name: "  Real Person  ",
        nickname: "Do Not Show",
        displayNameMode: "REAL_NAME",
        positions: [{ symbol: "MISSING", quantity: 1 }],
      }),
      participant("nickname-mode", {
        name: "Private Real Name",
        nickname: "Market Friend",
        displayNameMode: "NICKNAME",
      }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([
      {
        userId: "real-name-mode",
        periodKey: "equity-hour:2026072909",
        portfolioValueUsd: 1_100_000,
        capturedAt: new Date("2026-07-29T09:00:00.000Z"),
      },
      {
        userId: "nickname-mode",
        periodKey: "equity-hour:2026072909",
        portfolioValueUsd: 1_000_000,
        capturedAt: new Date("2026-07-29T09:00:00.000Z"),
      },
    ]);
    leaderboardMocks.getLiveItems.mockResolvedValue([]);
    leaderboardMocks.hasVerifiedPortfolioQuote.mockReturnValue(false);

    const recordedResult = await getPortfolioEquityLeaderboard("real-name-mode", now);

    expect(recordedResult.valuationMode).toBe("RECORDED");
    expect(recordedResult.rows.map((row) => row.alias)).toEqual(result.rows.map((row) => row.alias));
    expect(JSON.stringify(recordedResult)).not.toContain("Do Not Show");
    expect(JSON.stringify(recordedResult)).not.toContain("Private Real Name");
  });

  it("never falls back to the real name when nickname mode has no usable nickname", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("null-nickname", {
        name: "Null Nickname Real Name",
        nickname: null,
        displayNameMode: "NICKNAME",
        cashAmount: 1_100_000,
      }),
      participant("blank-nickname", {
        name: "Blank Nickname Real Name",
        nickname: "   ",
        displayNameMode: "NICKNAME",
      }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([]);

    const result = await getPortfolioEquityLeaderboard("null-nickname", now);
    const serialized = JSON.stringify(result);

    expect(result.rows.map((row) => row.alias)).toEqual([
      expect.stringMatching(/^Participant #[A-F0-9]{6}$/),
      expect.stringMatching(/^Participant #[A-F0-9]{6}$/),
    ]);
    expect(serialized).not.toContain("Null Nickname Real Name");
    expect(serialized).not.toContain("Blank Nickname Real Name");
  });

  it("never exposes an email-shaped selected label in either display mode", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("email-real-name", {
        name: "  legacy.real@example.test  ",
        displayNameMode: "REAL_NAME",
        cashAmount: 1_100_000,
      }),
      participant("email-nickname", {
        name: "Private Real Name",
        nickname: "legacy.nick+board@example.test",
        displayNameMode: "NICKNAME",
      }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([]);

    const result = await getPortfolioEquityLeaderboard("email-real-name", now);
    const serialized = JSON.stringify(result);

    expect(result.rows.map((row) => row.alias)).toEqual([
      expect.stringMatching(/^Participant #[A-F0-9]{6}$/),
      expect.stringMatching(/^Participant #[A-F0-9]{6}$/),
    ]);
    expect(serialized).not.toContain("legacy.real@example.test");
    expect(serialized).not.toContain("legacy.nick+board@example.test");
    expect(serialized).not.toContain("Private Real Name");
  });

  it("never mixes a reliable live row with a missing quote when no common cohort exists", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("reliable-eur", {
        cashMode: "EUR",
        cashAmount: 500_000,
        positions: [{ symbol: "AAPL", quantity: 100 }],
      }),
      participant("missing-quote", { positions: [{ symbol: "MISSING", quantity: 1 }] }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([]);
    leaderboardMocks.getLiveItems.mockResolvedValue([{ symbol: "AAPL", priceUsd: 1_000 }, { symbol: "EUR/USD", priceUsd: 2 }]);
    leaderboardMocks.getCashModeUsdRate.mockResolvedValue(2);
    leaderboardMocks.hasVerifiedPortfolioQuote.mockImplementation((item: { symbol?: string } | undefined) => item?.symbol === "AAPL" || item?.symbol === "EUR/USD");

    const result = await getPortfolioEquityLeaderboard("reliable-eur", now);

    expect(result.rows).toEqual([]);
    expect(result).toMatchObject({ valuationMode: "RECORDED", valuationAsOf: null });
    expect(result.excludedUnreliableCount).toBe(2);
    expect(leaderboardMocks.getLiveItems).toHaveBeenCalledWith(["AAPL", "EUR/USD", "MISSING"]);
    expect(leaderboardMocks.getCashModeUsdRate).toHaveBeenCalledWith("EUR", expect.any(Array));
  });

  it("falls back the whole board to the latest complete recorded equity-hour cohort", async () => {
    const recordedAt = new Date("2026-07-29T09:00:00.000Z");
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("viewer", { cashAmount: 1_500_000 }),
      participant("alpha", { cashAmount: 1_400_000 }),
      participant("missing-live", {
        cashAmount: 2_000_000,
        positions: [{ symbol: "MISSING", quantity: 1 }],
      }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([
      ...["viewer", "alpha", "missing-live"].map((userId, index) => ({
        userId,
        periodKey: "equity-hour:2026072909",
        portfolioValueUsd: 1_100_000 + index * 100_000,
        capturedAt: recordedAt,
      })),
      {
        userId: "viewer",
        periodKey: "equity-hour:2026073009",
        portfolioValueUsd: 9_000_000,
        capturedAt: new Date("2026-07-30T09:00:00.000Z"),
      },
    ]);
    leaderboardMocks.getLiveItems.mockResolvedValue([]);
    leaderboardMocks.hasVerifiedPortfolioQuote.mockReturnValue(false);

    const result = await getPortfolioEquityLeaderboard("viewer", now);

    expect(result).toMatchObject({
      valuationMode: "RECORDED",
      valuationAsOf: recordedAt.toISOString(),
      totalRankedParticipants: 3,
      excludedUnreliableCount: 0,
    });
    expect(result.rows.map((row) => row.totalValueUsd)).toEqual([1_300_000, 1_200_000, 1_100_000]);
    expect(result.rows.some((row) => row.totalValueUsd === 1_500_000)).toBe(false);
  });

  it("falls back all equity positions when any Yahoo corporate-action verification is not fresh", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("fresh", { positions: [{ symbol: "AAPL", quantity: 100 }] }),
      participant("stale", {
        positions: [{
          symbol: "AAPL",
          quantity: 100,
          corporateActionsCheckedAt: new Date("2026-07-28T11:59:59.999Z"),
        }],
      }),
      participant("missing", {
        positions: [{ symbol: "AAPL", quantity: 100, corporateActionsCheckedAt: null }],
      }),
      participant("forward", {
        positions: [{
          symbol: "AAPL",
          quantity: 100,
          corporateActionsCheckedAt: new Date("2026-08-02T12:00:00.001Z"),
        }],
      }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue(
      ["fresh", "stale", "missing", "forward"].map((userId, index) => ({
        userId,
        periodKey: "equity-hour:2026072909",
        portfolioValueUsd: 1_100_000 + index,
        capturedAt: new Date("2026-07-29T09:00:00.000Z"),
      })),
    );
    leaderboardMocks.getLiveItems.mockResolvedValue([{ symbol: "AAPL", priceUsd: 1_000 }]);

    const result = await getPortfolioEquityLeaderboard("fresh", now);

    expect(result.rows).toHaveLength(4);
    expect(result).toMatchObject({ valuationMode: "RECORDED", excludedUnreliableCount: 0 });
  });

  it("keeps null period returns while recorded cohort values replace all mixed live values", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("viewer"),
      participant("partial", { cashAmount: 1_500_000 }),
      participant("unreliable", { positions: [{ symbol: "MISSING", quantity: 1 }], cashAmount: 2_000_000 }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([
      ...verifiedHistory("viewer", 1_000_000),
      ...["viewer", "partial", "unreliable"].map((userId, index) => ({
        userId,
        periodKey: "equity-hour:2026072909",
        portfolioValueUsd: 1_000_000 + index,
        capturedAt: new Date("2026-07-29T09:00:00.000Z"),
      })),
    ]);
    leaderboardMocks.hasVerifiedPortfolioQuote.mockImplementation((item: { symbol?: string } | undefined) => item?.symbol !== "MISSING");

    const result = await getPortfolioEquityLeaderboard("viewer", now);

    expect(result.rows.map((row) => row.totalValueUsd)).toEqual([1_000_002, 1_000_001, 1_000_000]);
    expect(result.rows[0]).toMatchObject({ weeklyReturnPercent: null, monthlyReturnPercent: null, rank: 1 });
    expect(result.excludedUnreliableCount).toBe(0);
  });

  it("does not require corporate-action timestamps for crypto positions", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("viewer", {
        positions: [{ symbol: "BTC", market: "Kripto Para", quantity: 1, corporateActionsCheckedAt: null }],
      }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([]);
    leaderboardMocks.getLiveItems.mockResolvedValue([{ symbol: "BTC", priceUsd: 100_000 }]);

    const result = await getPortfolioEquityLeaderboard("viewer", now);

    expect(result).toMatchObject({ valuationMode: "LIVE", valuationAsOf: now.toISOString() });
    expect(result.rows).toEqual([expect.objectContaining({ totalValueUsd: 1_100_000 })]);
  });

  it("shows only permitted active league labels and gives the viewer private-league rank", async () => {
    leaderboardMocks.membershipFindMany.mockImplementation(async (query: { where: { userId?: string | { in: string[] } } }) => {
      if (query.where.userId === "viewer") {
        return [{
          league: { id: "viewer-private", name: "Viewer Private", slug: "viewer-private", type: "PRIVATE", memberships: [{ userId: "viewer" }, { userId: "alpha" }] },
        }];
      }

      return [
        { userId: "viewer", league: { id: "public", name: "Public League", type: "GENERAL" } },
        { userId: "viewer", league: { id: "viewer-private", name: "Viewer Private", type: "PRIVATE" } },
        { userId: "alpha", league: { id: "public", name: "Public League", type: "GENERAL" } },
        { userId: "alpha", league: { id: "viewer-private", name: "Viewer Private", type: "PRIVATE" } },
        { userId: "beta", league: { id: "other-private", name: "Other Private", type: "PRIVATE" } },
      ];
    });

    const result = await getPortfolioEquityLeaderboard("viewer", now);
    const serialized = JSON.stringify(result);

    expect(result.rows[0]?.leagueNames).toEqual(["Public League", "Viewer Private"]);
    expect(result.rows[1]?.leagueNames).toEqual([]);
    expect(result.rows[2]?.leagueNames).toEqual(["Public League", "Viewer Private"]);
    expect(result.viewerLeagues).toEqual([
      { id: "viewer-private", name: "Viewer Private", slug: "viewer-private", type: "PRIVATE", rank: 2, totalRankedMembers: 2 },
    ]);
    expect(serialized).not.toContain('"viewer"');
    expect(serialized).not.toContain('"alpha"');
    expect(serialized).not.toContain('"beta"');
  });

  it("uses one shared held-plus-cash market batch and paginates 25 global equity rows", async () => {
    const users = Array.from({ length: 26 }, (_, index) => participant(`synthetic-${index + 1}`, {
      cashMode: index === 0 ? "EUR" : "USD",
      cashAmount: 1_000_000 + index + 1,
    }));
    leaderboardMocks.userFindMany.mockResolvedValue(users);
    leaderboardMocks.baselineFindMany.mockResolvedValue([]);
    leaderboardMocks.getLiveItems.mockResolvedValue([{ symbol: "EUR/USD", priceUsd: 1 }]);

    const first = await getPortfolioEquityLeaderboard("synthetic-1", now, 1);
    const second = await getPortfolioEquityLeaderboard("synthetic-1", now, 2);

    expect(leaderboardMocks.getLiveItems).toHaveBeenCalledWith(["EUR/USD"]);
    expect(first.rows).toHaveLength(25);
    expect(second.rows).toHaveLength(1);
    expect(first).toMatchObject({ page: 1, pageSize: 25, pageCount: 2, totalRankedParticipants: 26 });
    expect(second).toMatchObject({ page: 2, firstRowIndex: 26, lastRowIndex: 26 });
  });
});
