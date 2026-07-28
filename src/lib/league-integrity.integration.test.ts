import { beforeEach, describe, expect, it, vi } from "vitest";

const leagueMocks = vi.hoisted(() => ({
  periodFindFirst: vi.fn(),
  userFindMany: vi.fn(),
  snapshotFindMany: vi.fn(),
  membershipFindMany: vi.fn(),
  positionFindMany: vi.fn(),
  getPortfolioSnapshot: vi.fn(),
  getMarketItems: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    competitionPeriod: { findFirst: leagueMocks.periodFindFirst },
    user: { findMany: leagueMocks.userFindMany },
    portfolioSnapshot: { findMany: leagueMocks.snapshotFindMany },
    leagueMembership: { findMany: leagueMocks.membershipFindMany },
    portfolioPosition: { findMany: leagueMocks.positionFindMany },
  },
}));

vi.mock("@/lib/auth", () => ({
  getDisplayName: (user: { name: string; nickname?: string | null; displayNameMode?: string }) =>
    user.displayNameMode === "NICKNAME" && user.nickname ? user.nickname : user.name,
}));

vi.mock("@/lib/portfolio", () => ({
  calculateCompetitionProfitLossUsd: (value: number) => value - 1_000_000,
  calculateCompetitionReturnPercent: (value: number) => ((value - 1_000_000) / 1_000_000) * 100,
  getPortfolioSnapshot: leagueMocks.getPortfolioSnapshot,
}));

vi.mock("@/lib/live-market", () => ({
  getLiveMarketItemsForSymbols: leagueMocks.getMarketItems,
}));

vi.mock("@/lib/badges", () => ({ awardBadge: vi.fn() }));
vi.mock("@/lib/friends", () => ({ getAcceptedFriendIds: vi.fn() }));

import { getPeriodLeaderboard } from "@/lib/competition-periods";
import { getLeagueLeaderboard } from "@/lib/leagues";

describe("release gate: league and leaderboard integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leagueMocks.getMarketItems.mockResolvedValue([]);
    leagueMocks.positionFindMany.mockResolvedValue([]);
  });

  it("publishes immutable verified snapshots only for currently eligible users", async () => {
    leagueMocks.periodFindFirst.mockResolvedValue({
      id: "period-weekly",
      type: "WEEKLY",
      name: "Weekly",
      startsAt: new Date("2026-07-20T04:00:00.000Z"),
      endsAt: new Date("2026-07-27T04:00:00.000Z"),
      isActive: true,
      createdAt: new Date("2026-07-20T04:00:00.000Z"),
      updatedAt: new Date("2026-07-27T04:00:00.000Z"),
    });
    leagueMocks.userFindMany.mockResolvedValue([
      {
        id: "active-low",
        name: "Active Low",
        nickname: null,
        displayNameMode: "REAL_NAME",
        email: "low@example.test",
        role: "USER",
      },
      {
        id: "active-high",
        name: "Active High",
        nickname: "High",
        displayNameMode: "NICKNAME",
        email: "high@example.test",
        role: "USER",
      },
    ]);
    leagueMocks.snapshotFindMany.mockResolvedValue([
      {
        userId: "active-low",
        portfolioValueUsd: 1_010_000,
        cashUsd: 900_000,
        positionsValueUsd: 110_000,
        returnPercent: 1,
        rank: 1,
      },
      {
        userId: "inactive-former-leader",
        portfolioValueUsd: 9_000_000,
        cashUsd: 9_000_000,
        positionsValueUsd: 0,
        returnPercent: 800,
        rank: 1,
      },
      {
        userId: "active-high",
        portfolioValueUsd: 1_030_000,
        cashUsd: 900_000,
        positionsValueUsd: 130_000,
        returnPercent: 3,
        rank: 99,
      },
    ]);

    const result = await getPeriodLeaderboard("WEEKLY", "snapshot");

    expect(leagueMocks.userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isActive: true,
        emailVerifiedAt: { not: null },
      },
    }));
    expect(leagueMocks.snapshotFindMany).toHaveBeenCalledWith({
      where: {
        periodId: "period-weekly",
        valuationStatus: "VERIFIED",
      },
    });
    expect(result.rows).toEqual([
      expect.objectContaining({
        userId: "active-high",
        displayName: "High",
        returnPercent: 3,
        rank: 1,
        source: "snapshot",
      }),
      expect.objectContaining({
        userId: "active-low",
        returnPercent: 1,
        rank: 2,
        source: "snapshot",
      }),
    ]);
    expect(leagueMocks.getMarketItems).not.toHaveBeenCalled();
    expect(leagueMocks.getPortfolioSnapshot).not.toHaveBeenCalled();
  });

  it("excludes unreliable live valuations and ranks by percentage, not nominal dollars", async () => {
    leagueMocks.membershipFindMany.mockResolvedValue([
      {
        id: "member-high-dollars",
        userId: "user-high-dollars",
        role: "MEMBER",
        user: {
          id: "user-high-dollars",
          name: "High Dollars",
          nickname: null,
          displayNameMode: "REAL_NAME",
          email: "dollars@example.test",
          role: "USER",
          isActive: true,
          emailVerifiedAt: new Date(),
        },
      },
      {
        id: "member-high-percent",
        userId: "user-high-percent",
        role: "MEMBER",
        user: {
          id: "user-high-percent",
          name: "High Percent",
          nickname: null,
          displayNameMode: "REAL_NAME",
          email: "percent@example.test",
          role: "USER",
          isActive: true,
          emailVerifiedAt: new Date(),
        },
      },
      {
        id: "member-unreliable",
        userId: "user-unreliable",
        role: "MEMBER",
        user: {
          id: "user-unreliable",
          name: "Unreliable",
          nickname: null,
          displayNameMode: "REAL_NAME",
          email: "unreliable@example.test",
          role: "USER",
          isActive: true,
          emailVerifiedAt: new Date(),
        },
      },
    ]);
    leagueMocks.getPortfolioSnapshot
      .mockResolvedValueOnce({ totalValueUsd: 1_020_000, hasUnreliableValuation: false })
      .mockResolvedValueOnce({ totalValueUsd: 1_030_000, hasUnreliableValuation: false })
      .mockResolvedValueOnce({ totalValueUsd: 9_000_000, hasUnreliableValuation: true });

    const result = await getLeagueLeaderboard("league-1", "user-high-percent");

    expect(leagueMocks.membershipFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        leagueId: "league-1",
        user: {
          isActive: true,
          emailVerifiedAt: { not: null },
        },
      },
    }));
    expect(result.rows.map((row) => row.userId)).toEqual([
      "user-high-percent",
      "user-high-dollars",
    ]);
    expect(result.rows.map((row) => row.rank)).toEqual([1, 2]);
    expect(result.currentUserRank).toBe(1);
  });
});
