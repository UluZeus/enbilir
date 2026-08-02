import { beforeEach, describe, expect, it, vi } from "vitest";

const leaderboardMocks = vi.hoisted(() => ({
  userFindMany: vi.fn(),
  positionFindMany: vi.fn(),
  snapshotFindMany: vi.fn(),
  baselineFindMany: vi.fn(),
  membershipFindMany: vi.fn(),
  getLiveItems: vi.fn(),
  getPortfolioSnapshot: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: leaderboardMocks.userFindMany },
    portfolioPosition: { findMany: leaderboardMocks.positionFindMany },
    portfolioSnapshot: { findMany: leaderboardMocks.snapshotFindMany },
    weeklyPortfolioBaseline: { findMany: leaderboardMocks.baselineFindMany },
    leagueMembership: { findMany: leaderboardMocks.membershipFindMany },
  },
}));

vi.mock("@/lib/live-market", () => ({
  getLiveMarketItemsForSymbols: leaderboardMocks.getLiveItems,
}));

vi.mock("@/lib/portfolio", () => ({
  initialCashUsd: 1_000_000,
  getPortfolioSnapshot: leaderboardMocks.getPortfolioSnapshot,
}));

import { getPortfolioEquityLeaderboard } from "@/lib/portfolio-equity-leaderboard";

const now = new Date("2026-08-02T12:00:00.000Z");

function participant(id: string, nickname: string | null = null, cashMode = "USD") {
  return { id, nickname, virtualAccount: { cashMode } };
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
      participant("viewer", "My nickname"),
      participant("alpha"),
      participant("beta"),
    ]);
    leaderboardMocks.positionFindMany.mockResolvedValue([{ symbol: "AAPL" }]);
    leaderboardMocks.snapshotFindMany.mockResolvedValue([]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([
      ...verifiedHistory("viewer", 1_000_000),
      ...verifiedHistory("alpha", 1_188_000, 1_180_000),
      ...verifiedHistory("beta", 550_000, 550_000),
    ]);
    leaderboardMocks.getLiveItems.mockResolvedValue([{ symbol: "AAPL" }]);
    leaderboardMocks.getPortfolioSnapshot.mockImplementation(async (userId: string) => ({
      totalValueUsd: { viewer: 1_050_000, alpha: 1_200_000, beta: 1_100_000 }[userId]!,
      hasUnreliableValuation: false,
    }));
    leaderboardMocks.membershipFindMany.mockResolvedValue([]);
  });

  it("ranks by current canonical equity rather than weekly return, preserving verified returns without a weekly trade", async () => {
    const result = await getPortfolioEquityLeaderboard("viewer", now);

    expect(result.rows.map((row) => ({ alias: row.alias, totalValueUsd: row.totalValueUsd, rank: row.rank }))).toEqual([
      { alias: "Participant #8ED3F6", totalValueUsd: 1_200_000, rank: 1 },
      { alias: "Participant #F44E64", totalValueUsd: 1_100_000, rank: 2 },
      { alias: "My nickname", totalValueUsd: 1_050_000, rank: 3 },
    ]);
    expect(result.rows[1]).toMatchObject({ weeklyReturnPercent: 100, monthlyReturnPercent: 100 });
    expect(result.rows[0]).toMatchObject({ weeklyReturnPercent: 1.01010101, monthlyReturnPercent: 1.69491525 });
    expect(result.rows[0]?.totalReturnPercent).toBe(20);
  });

  it("shares ranks for equal canonical micro-USD values and keeps deterministic alias order", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("viewer"),
      participant("z-user"),
      participant("a-user"),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue([
      ...verifiedHistory("viewer", 1_000_000),
      ...verifiedHistory("z-user", 1_000_000),
      ...verifiedHistory("a-user", 1_000_000),
    ]);
    leaderboardMocks.getPortfolioSnapshot.mockImplementation(async (userId: string) => ({
      totalValueUsd: userId === "viewer" ? 1_000_000 : 1_100_000.0000004,
      hasUnreliableValuation: false,
    }));

    const result = await getPortfolioEquityLeaderboard("viewer", now);

    expect(result.rows.map((row) => ({ alias: row.alias, rank: row.rank }))).toEqual([
      { alias: "Participant #67F844", rank: 1 },
      { alias: "Participant #E36939", rank: 1 },
      { alias: "Participant #D35CA5", rank: 3 },
    ]);
    expect(result.viewerRank).toBe(3);
  });

  it("keeps null period returns in the global equity ranking and excludes unreliable valuations without creating accounts", async () => {
    leaderboardMocks.userFindMany.mockResolvedValue([
      participant("viewer"),
      participant("partial"),
      participant("unreliable"),
    ]);
    leaderboardMocks.baselineFindMany.mockResolvedValue(verifiedHistory("viewer", 1_000_000));
    leaderboardMocks.getPortfolioSnapshot.mockImplementation(async (userId: string) => ({
      totalValueUsd: { viewer: 1_000_000, partial: 1_500_000, unreliable: 2_000_000 }[userId]!,
      hasUnreliableValuation: userId === "unreliable",
    }));

    const result = await getPortfolioEquityLeaderboard("viewer", now);

    expect(result.rows.map((row) => row.totalValueUsd)).toEqual([1_500_000, 1_000_000]);
    expect(result.rows[0]).toMatchObject({ weeklyReturnPercent: null, monthlyReturnPercent: null, rank: 1 });
    expect(result.excludedUnreliableCount).toBe(1);
    expect(leaderboardMocks.userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isActive: true,
        emailVerifiedAt: { not: null },
        virtualAccount: { isNot: null },
        trades: { some: {} },
      },
    }));
    expect(leaderboardMocks.getPortfolioSnapshot).toHaveBeenCalledTimes(3);
    expect(leaderboardMocks.getPortfolioSnapshot).not.toHaveBeenCalledWith("no-account", expect.anything());
  });

  it("shows only permitted active league labels, never returns a real name or raw user id, and gives the viewer private-league rank", async () => {
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
    expect(serialized).not.toContain("Real Person");
  });

  it("uses one shared held-plus-cash market batch and paginates 25 global equity rows", async () => {
    const users = Array.from({ length: 26 }, (_, index) => participant(`synthetic-${index + 1}`, null, index === 0 ? "EUR" : "USD"));
    leaderboardMocks.userFindMany.mockResolvedValue(users);
    leaderboardMocks.baselineFindMany.mockResolvedValue([]);
    leaderboardMocks.positionFindMany.mockResolvedValue([{ symbol: "AAPL" }, { symbol: "MSFT" }]);
    leaderboardMocks.getPortfolioSnapshot.mockImplementation(async (userId: string) => ({
      totalValueUsd: 1_000_000 + Number(userId.split("-").at(-1))!,
      hasUnreliableValuation: false,
    }));

    const first = await getPortfolioEquityLeaderboard("synthetic-1", now, 1);
    const second = await getPortfolioEquityLeaderboard("synthetic-1", now, 2);

    expect(leaderboardMocks.getLiveItems).toHaveBeenCalledWith(["AAPL", "EUR/USD", "MSFT"]);
    expect(first.rows).toHaveLength(25);
    expect(second.rows).toHaveLength(1);
    expect(first).toMatchObject({ page: 1, pageSize: 25, pageCount: 2, totalRankedParticipants: 26 });
    expect(second).toMatchObject({ page: 2, firstRowIndex: 26, lastRowIndex: 26 });
  });
});
