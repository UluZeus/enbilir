import { beforeEach, describe, expect, it, vi } from "vitest";

const competitionMocks = vi.hoisted(() => ({
  userFindMany: vi.fn(),
  positionFindMany: vi.fn(),
  snapshotFindMany: vi.fn(),
  baselineFindMany: vi.fn(),
  membershipFindMany: vi.fn(),
  getLiveItems: vi.fn(),
  getPortfolioSnapshot: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: competitionMocks.userFindMany },
    portfolioPosition: { findMany: competitionMocks.positionFindMany },
    portfolioSnapshot: { findMany: competitionMocks.snapshotFindMany },
    weeklyPortfolioBaseline: { findMany: competitionMocks.baselineFindMany },
    leagueMembership: { findMany: competitionMocks.membershipFindMany },
  },
}));

vi.mock("@/lib/live-market", () => ({
  getLiveMarketItemsForSymbols: competitionMocks.getLiveItems,
}));

vi.mock("@/lib/portfolio", () => ({
  getPortfolioSnapshot: competitionMocks.getPortfolioSnapshot,
}));

import {
  getCompetitionResults,
  rankCompetitionCandidates,
} from "@/lib/competition-results";

const now = new Date("2026-07-30T12:00:00.000Z");

function user(id: string, name: string) {
  return {
    id,
    name,
    nickname: null,
    displayNameMode: "REAL_NAME" as const,
  };
}

function fullHistory(userId: string, startingValueUsd: number) {
  return [1, 7, 30, 90, 180, 365].map((days) => ({
    userId,
    portfolioValueUsd: startingValueUsd,
    capturedAt: new Date(now.getTime() - days * 86_400_000),
  }));
}

describe("competition results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    competitionMocks.userFindMany.mockResolvedValue([
      user("viewer", "Viewer"),
      user("alpha", "Alpha"),
      user("partial", "Partial"),
      user("unreliable", "Unreliable"),
    ]);
    competitionMocks.positionFindMany.mockResolvedValue([{ symbol: "AAPL" }]);
    competitionMocks.snapshotFindMany.mockResolvedValue([]);
    competitionMocks.baselineFindMany.mockResolvedValue([
      ...fullHistory("viewer", 100),
      ...fullHistory("alpha", 200),
      {
        userId: "partial",
        portfolioValueUsd: 100,
        capturedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
      ...fullHistory("unreliable", 100),
    ]);
    competitionMocks.getLiveItems.mockResolvedValue([]);
    competitionMocks.getPortfolioSnapshot.mockImplementation(async (userId: string) => ({
      totalValueUsd: userId === "alpha" ? 220 : 110,
      hasUnreliableValuation: userId === "unreliable",
    }));
    competitionMocks.membershipFindMany.mockResolvedValue([
      {
        league: {
          id: "private-league",
          name: "Private League",
          slug: "private-league",
          type: "PRIVATE",
          memberships: [
            { userId: "viewer" },
            { userId: "alpha" },
            { userId: "partial" },
          ],
        },
      },
    ]);
  });

  it("uses competition ranking for equal returns and userId only as the deterministic tie-break", () => {
    const rows = rankCompetitionCandidates([
      { userId: "z-user", displayName: "Zulu", returnPercent: 10, valueUsd: 110, changeUsd: 10 },
      { userId: "a-user", displayName: "Alpha", returnPercent: 10, valueUsd: 220, changeUsd: 20 },
      { userId: "m-user", displayName: "Middle", returnPercent: 5, valueUsd: 105, changeUsd: 5 },
    ]);

    expect(rows.map((row) => ({ userId: row.userId, rank: row.rank }))).toEqual([
      { userId: "a-user", rank: 1 },
      { userId: "z-user", rank: 1 },
      { userId: "m-user", rank: 3 },
    ]);
  });

  it("returns only reliable full-coverage live rankings and keeps USD/private member details viewer-only", async () => {
    const result = await getCompetitionResults("viewer", "WEEKLY", now);
    const weekly = result.periods.find((period) => period.key === "WEEKLY");

    expect(result.periods).toHaveLength(6);
    expect(weekly?.rows).toEqual([
      { displayName: "Alpha", rank: 1, returnPercent: 10, isViewer: false },
      { displayName: "Viewer", rank: 1, returnPercent: 10, isViewer: true },
    ]);
    expect(weekly?.excludedCounts).toEqual({ partialOrMissing: 1, unreliable: 1 });
    expect(weekly?.viewerRow).toEqual({
      displayName: "Viewer",
      rank: 1,
      returnPercent: 10,
      valueUsd: 110,
      changeUsd: 10,
    });
    expect(Object.keys(weekly!.rows[0]).sort()).toEqual([
      "displayName",
      "isViewer",
      "rank",
      "returnPercent",
    ]);
    expect(result.leagues).toEqual([
      {
        id: "private-league",
        name: "Private League",
        slug: "private-league",
        type: "PRIVATE",
        rank: 1,
        totalRankedMembers: 2,
        viewerReturnPercent: 10,
      },
    ]);
    expect(JSON.stringify(result.leagues)).not.toContain("Alpha");
    expect(JSON.stringify(result.leagues)).not.toContain("alpha");
  });

  it("scopes candidates to active verified public users", async () => {
    await getCompetitionResults("viewer", "DAILY", now);

    expect(competitionMocks.userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isActive: true,
        emailVerifiedAt: { not: null },
      },
    }));
  });
});
