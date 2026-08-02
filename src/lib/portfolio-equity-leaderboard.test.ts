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
  nickname?: string | null;
  displayNameMode?: "REAL_NAME" | "NICKNAME";
  cashMode?: "USD" | "EUR" | "CHF" | "TRY_REPO";
  cashAmount?: number;
  dailyRepoRate?: number;
  repoLastAccruedAt?: Date | null;
  updatedAt?: Date;
  positions?: Array<{ symbol: string; quantity: number }>;
};

function participant(id: string, options: ParticipantOptions = {}) {
  return {
    id,
    nickname: options.nickname ?? null,
    displayNameMode: options.displayNameMode ?? "REAL_NAME",
    virtualAccount: {
      cashMode: options.cashMode ?? "USD",
      cashAmount: options.cashAmount ?? 1_000_000,
      dailyRepoRate: options.dailyRepoRate ?? 0.00125,
      repoLastAccruedAt: options.repoLastAccruedAt ?? null,
      updatedAt: options.updatedAt ?? new Date("2026-08-01T12:00:00.000Z"),
    },
    positions: options.positions ?? [],
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
        positions: expect.any(Object),
        virtualAccount: expect.any(Object),
      }),
    }));
    expect(leaderboardMocks.getLiveItems).toHaveBeenCalledTimes(1);
    expect(leaderboardMocks.getLiveItems).toHaveBeenCalledWith(["AAPL"]);
    expect(leaderboardMocks.positionFindMany).not.toHaveBeenCalled();
    expect(leaderboardMocks.tradeFindMany).not.toHaveBeenCalled();
    expect(leaderboardMocks.virtualAccountCreate).not.toHaveBeenCalled();
    expect(leaderboardMocks.virtualAccountUpdate).not.toHaveBeenCalled();
  });

  it("only exposes a configured nickname, never a nickname hidden by REAL_NAME mode", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("real-name-mode", { nickname: "Do Not Show", displayNameMode: "REAL_NAME" }),
      participant("nickname-mode", { nickname: "Market Friend", displayNameMode: "NICKNAME" }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([]);

    const result = await getPortfolioEquityLeaderboard("real-name-mode", now);

    expect(result.rows.map((row) => row.alias)).toEqual(["Market Friend", "Participant #72B3B7"]);
    expect(JSON.stringify(result)).not.toContain("Do Not Show");
  });

  it("excludes missing position quotes instead of using average cost, while valuing reliable cash FX and positions", async () => {
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

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ totalValueUsd: 1_100_000 });
    expect(result.excludedUnreliableCount).toBe(1);
    expect(leaderboardMocks.getLiveItems).toHaveBeenCalledWith(["AAPL", "EUR/USD", "MISSING"]);
    expect(leaderboardMocks.getCashModeUsdRate).toHaveBeenCalledWith("EUR", expect.any(Array));
  });

  it("keeps null period returns in the global equity ranking and excludes unreliable valuations", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("viewer"),
      participant("partial", { cashAmount: 1_500_000 }),
      participant("unreliable", { positions: [{ symbol: "MISSING", quantity: 1 }], cashAmount: 2_000_000 }),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue(verifiedHistory("viewer", 1_000_000));
    leaderboardMocks.hasVerifiedPortfolioQuote.mockImplementation((item: { symbol?: string } | undefined) => item?.symbol !== "MISSING");

    const result = await getPortfolioEquityLeaderboard("viewer", now);

    expect(result.rows.map((row) => row.totalValueUsd)).toEqual([1_500_000, 1_000_000]);
    expect(result.rows[0]).toMatchObject({ weeklyReturnPercent: null, monthlyReturnPercent: null, rank: 1 });
    expect(result.excludedUnreliableCount).toBe(1);
  });

  it("shows only permitted active league labels and gives the viewer private-league rank", async () => {
    leaderboardMocks.membershipFindMany.mockImplementation(async (query: { where: { userId?: string | { in: string[] } } }) => {
      if (query.where.userId === "viewer") {
        return [{
          league: { id: "viewer-private", name: "Viewer Private", type: "PRIVATE", memberships: [{ userId: "viewer" }, { userId: "alpha" }] },
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
      { name: "Viewer Private", type: "PRIVATE", rank: 2, totalRankedMembers: 2 },
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
