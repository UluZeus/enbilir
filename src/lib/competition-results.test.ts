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
      ...fullHistory("unreliable", 100).filter(
        (entry) => now.getTime() - entry.capturedAt.getTime() > 72 * 60 * 60 * 1000,
      ),
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
    expect(weekly?.topRows).toEqual(weekly?.rows);
    expect(weekly?.bottomRows).toEqual([]);
    expect(weekly?.totalRankedParticipants).toBe(2);
    expect(weekly?.leaderReturnPercent).toBe(10);
    expect(weekly?.pageCount).toBe(1);
    expect(weekly?.firstRowIndex).toBe(1);
    expect(weekly?.lastRowIndex).toBe(2);
    expect(weekly?.excludedCounts).toEqual({ partialOrMissing: 1, stalePrice: 0, unreliable: 1 });
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

  it("ranks a candidate whose portfolio is reliably valued from a verified market-closed quote", async () => {
    competitionMocks.userFindMany.mockResolvedValue([
      user("viewer", "Viewer"),
      user("alpha", "Alpha"),
    ]);
    competitionMocks.baselineFindMany.mockResolvedValue([
      ...fullHistory("viewer", 100),
      ...fullHistory("alpha", 100),
    ]);
    competitionMocks.getPortfolioSnapshot.mockImplementation(async (userId: string) => ({
      totalValueUsd: userId === "alpha" ? 120 : 105,
      hasUnreliableValuation: false,
      positions: [{ dataStatus: "close", valuationReliable: true }],
    }));

    const result = await getCompetitionResults("viewer", "WEEKLY", now);
    const weekly = result.periods.find((period) => period.key === "WEEKLY");

    expect(weekly?.rows).toEqual([
      { displayName: "Alpha", rank: 1, returnPercent: 20, isViewer: false },
      { displayName: "Viewer", rank: 2, returnPercent: 5, isViewer: true },
    ]);
    expect(weekly?.excludedCounts).toEqual({ partialOrMissing: 0, stalePrice: 0, unreliable: 0 });
  });

  it("scopes candidates to active verified public users", async () => {
    await getCompetitionResults("viewer", "DAILY", now);

    expect(competitionMocks.userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isActive: true,
        emailVerifiedAt: { not: null },
        trades: { some: {} },
      },
    }));
  });

  it("excludes a live-provider outage with a recent verified history endpoint as stale, without ranking it", async () => {
    const endpointAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    competitionMocks.userFindMany.mockResolvedValue([user("viewer", "Viewer")]);
    competitionMocks.baselineFindMany.mockResolvedValue([
      {
        userId: "viewer",
        portfolioValueUsd: 100,
        capturedAt: new Date(endpointAt.getTime() - 7 * 86_400_000),
      },
      {
        userId: "viewer",
        portfolioValueUsd: 112,
        capturedAt: endpointAt,
      },
    ]);
    competitionMocks.getLiveItems.mockRejectedValue(new Error("market provider unavailable"));
    competitionMocks.getPortfolioSnapshot.mockRejectedValue(new Error("provider unavailable"));

    const result = await getCompetitionResults("viewer", "WEEKLY", now);
    const weekly = result.periods.find((period) => period.key === "WEEKLY");

    expect(weekly?.rows).toEqual([]);
    expect(weekly?.valuationAsOf).toBe(now.toISOString());
    expect(weekly?.delayedValuationCount).toBe(0);
    expect(weekly?.excludedCounts).toEqual({ partialOrMissing: 0, stalePrice: 1, unreliable: 0 });
    expect(competitionMocks.getPortfolioSnapshot).toHaveBeenCalledWith("viewer", []);
  });

  it("excludes a persisted endpoint older than 72 hours when live valuation is unavailable", async () => {
    const staleEndpointAt = new Date(now.getTime() - 72 * 60 * 60 * 1000 - 1);

    competitionMocks.userFindMany.mockResolvedValue([user("viewer", "Viewer")]);
    competitionMocks.baselineFindMany.mockResolvedValue([
      {
        userId: "viewer",
        portfolioValueUsd: 100,
        capturedAt: new Date(staleEndpointAt.getTime() - 7 * 86_400_000),
      },
      {
        userId: "viewer",
        portfolioValueUsd: 112,
        capturedAt: staleEndpointAt,
      },
    ]);
    competitionMocks.getPortfolioSnapshot.mockResolvedValue({
      totalValueUsd: 112,
      hasUnreliableValuation: true,
    });

    const result = await getCompetitionResults("viewer", "WEEKLY", now);
    const weekly = result.periods.find((period) => period.key === "WEEKLY");

    expect(weekly?.rows).toEqual([]);
    expect(weekly?.delayedValuationCount).toBe(0);
    expect(weekly?.excludedCounts).toEqual({ partialOrMissing: 0, stalePrice: 0, unreliable: 1 });
  });

  it("queries only verified persisted portfolio history", async () => {
    await getCompetitionResults("viewer", "DAILY", now);

    expect(competitionMocks.snapshotFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: { in: ["viewer", "alpha", "partial", "unreliable"] },
        valuationStatus: "VERIFIED",
      },
    }));
    expect(competitionMocks.baselineFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: { in: ["viewer", "alpha", "partial", "unreliable"] },
        periodKey: { startsWith: "equity-hour:" },
      },
    }));
  });

  it("excludes accounts with no persisted trade from all ranking candidates", async () => {
    competitionMocks.userFindMany.mockResolvedValue([user("viewer", "Viewer")]);

    await getCompetitionResults("viewer", "DAILY", now);

    expect(competitionMocks.userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ trades: { some: {} } }),
    }));
  });

  it("paginates the selected period in 25-row pages while retaining global ranks and the viewer's global row", async () => {
    const participants = Array.from({ length: 53 }, (_, index) => user(
      `participant-${String(index + 1).padStart(2, "0")}`,
      `Participant ${index + 1}`,
    ));
    const viewer = participants[52];

    competitionMocks.userFindMany.mockResolvedValue(participants);
    competitionMocks.baselineFindMany.mockResolvedValue(participants.flatMap((participant) => fullHistory(participant.id, 100)));
    competitionMocks.getPortfolioSnapshot.mockImplementation(async (userId: string) => ({
      totalValueUsd: 153 - Number(userId.slice(-2)),
      hasUnreliableValuation: false,
    }));

    const [first, second, third] = await Promise.all([
      getCompetitionResults(viewer.id, "WEEKLY", now, 1),
      getCompetitionResults(viewer.id, "WEEKLY", now, 2),
      getCompetitionResults(viewer.id, "WEEKLY", now, 3),
    ]);
    const weeklyFirst = first.periods.find((period) => period.key === "WEEKLY")!;
    const weeklySecond = second.periods.find((period) => period.key === "WEEKLY")!;
    const weeklyThird = third.periods.find((period) => period.key === "WEEKLY")!;

    expect(weeklyFirst.rows).toHaveLength(25);
    expect(weeklySecond.rows).toHaveLength(25);
    expect(weeklyThird.rows).toHaveLength(3);
    expect(weeklyFirst.rows.map((row) => row.rank)).toEqual(Array.from({ length: 25 }, (_, index) => index + 1));
    expect(weeklySecond.rows.map((row) => row.rank)).toEqual(Array.from({ length: 25 }, (_, index) => index + 26));
    expect(weeklyThird.rows.map((row) => row.rank)).toEqual([51, 52, 53]);
    expect(weeklyFirst.rows.some((row) => row.isViewer)).toBe(false);
    expect(weeklyFirst.viewerRow).toMatchObject({ rank: 53, displayName: "Participant 53" });
    expect(weeklyFirst.viewerPage).toBe(3);
    expect(weeklyFirst.totalRankedParticipants).toBe(53);
    expect(weeklyFirst.pageCount).toBe(3);
    expect(weeklyThird.firstRowIndex).toBe(51);
    expect(weeklyThird.lastRowIndex).toBe(53);
    expect(first.periods.find((period) => period.key === "DAILY")?.rows).toEqual([]);
  });

  it("clamps invalid page values and keeps top and bottom lists disjoint for fewer than six participants", async () => {
    competitionMocks.userFindMany.mockResolvedValue([
      user("viewer", "Viewer"),
      user("alpha", "Alpha"),
      user("bravo", "Bravo"),
      user("charlie", "Charlie"),
    ]);
    competitionMocks.baselineFindMany.mockResolvedValue([
      ...fullHistory("viewer", 100),
      ...fullHistory("alpha", 100),
      ...fullHistory("bravo", 100),
      ...fullHistory("charlie", 100),
    ]);
    competitionMocks.getPortfolioSnapshot.mockImplementation(async (userId: string) => ({
      totalValueUsd: { viewer: 104, alpha: 103, bravo: 102, charlie: 101 }[userId]!,
      hasUnreliableValuation: false,
    }));

    const result = await getCompetitionResults("viewer", "WEEKLY", now, 999);
    const weekly = result.periods.find((period) => period.key === "WEEKLY")!;
    const listedNames = new Set(weekly.topRows.map((row) => row.displayName));

    expect(weekly.page).toBe(1);
    expect(weekly.bottomRows.every((row) => !listedNames.has(row.displayName))).toBe(true);
    expect(weekly.topRows).toHaveLength(3);
    expect(weekly.bottomRows).toHaveLength(1);
  });
});
