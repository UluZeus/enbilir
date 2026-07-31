import type { LeagueType } from "@/generated/prisma/enums";
import { getDisplayName } from "@/lib/auth";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import {
  buildPortfolioPerformancePeriods,
  normalizePortfolioHistory,
  portfolioCompetitionPeriods,
  type PortfolioPeriodKey,
} from "@/lib/portfolio-history";
import { getPortfolioSnapshot } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { publicCompetitionUserWhere } from "@/lib/public-user-visibility";

type CompetitionCandidate = {
  userId: string;
  displayName: string;
  returnPercent: number;
  valueUsd: number;
  changeUsd: number;
};

type RankedCompetitionCandidate = CompetitionCandidate & {
  rank: number;
};

export type CompetitionResultRow = {
  displayName: string;
  rank: number;
  returnPercent: number;
  isViewer: boolean;
};

export type CompetitionViewerRow = {
  displayName: string;
  rank: number;
  returnPercent: number;
  valueUsd: number;
  changeUsd: number;
};

export type CompetitionPeriodResult = {
  key: PortfolioPeriodKey;
  requestedDays: number;
  rangeStartsAt: string;
  valuationAsOf: string;
  rows: CompetitionResultRow[];
  viewerRow: CompetitionViewerRow | null;
  excludedCounts: {
    partialOrMissing: number;
    unreliable: number;
  };
};

export type ViewerLeagueCompetitionResult = {
  id: string;
  name: string;
  slug: string;
  type: LeagueType;
  rank: number | null;
  totalRankedMembers: number;
  viewerReturnPercent: number | null;
};

export function rankCompetitionCandidates(candidates: CompetitionCandidate[]): RankedCompetitionCandidate[] {
  const ordered = [...candidates].sort((left, right) => {
    const returnOrder = right.returnPercent - left.returnPercent;

    if (returnOrder !== 0) return returnOrder;
    if (left.userId === right.userId) return 0;

    return left.userId < right.userId ? -1 : 1;
  });
  let previousReturn: number | null = null;
  let previousRank = 0;

  return ordered.map((candidate, index) => {
    const rank = previousReturn !== null && candidate.returnPercent === previousReturn
      ? previousRank
      : index + 1;

    previousReturn = candidate.returnPercent;
    previousRank = rank;

    return { ...candidate, rank };
  });
}

function createPublicRows(rows: RankedCompetitionCandidate[], viewerUserId: string): CompetitionResultRow[] {
  return rows.map((row) => ({
    displayName: row.displayName,
    rank: row.rank,
    returnPercent: row.returnPercent,
    isViewer: row.userId === viewerUserId,
  }));
}

function createViewerRow(rows: RankedCompetitionCandidate[], viewerUserId: string): CompetitionViewerRow | null {
  const viewer = rows.find((row) => row.userId === viewerUserId);

  if (!viewer) return null;

  return {
    displayName: viewer.displayName,
    rank: viewer.rank,
    returnPercent: viewer.returnPercent,
    valueUsd: viewer.valueUsd,
    changeUsd: viewer.changeUsd,
  };
}

export async function getCompetitionResults(
  viewerUserId: string,
  selectedPeriod: PortfolioPeriodKey,
  now = new Date(),
) {
  const users = await prisma.user.findMany({
    where: publicCompetitionUserWhere,
    select: {
      id: true,
      name: true,
      nickname: true,
      displayNameMode: true,
    },
  });
  const userIds = users.map((user) => user.id);
  const [heldSymbols, snapshots, weeklyBaselines, viewerLeagueMemberships] = await Promise.all([
    prisma.portfolioPosition.findMany({
      where: { userId: { in: userIds } },
      select: { symbol: true },
      distinct: ["symbol"],
    }),
    prisma.portfolioSnapshot.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        portfolioValueUsd: true,
        capturedAt: true,
        period: { select: { type: true } },
      },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.weeklyPortfolioBaseline.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        portfolioValueUsd: true,
        capturedAt: true,
      },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.leagueMembership.findMany({
      where: {
        userId: viewerUserId,
        league: { isActive: true },
      },
      select: {
        league: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            memberships: { select: { userId: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
  ]);
  const liveMarketItems = await getLiveMarketItemsForSymbols(heldSymbols.map((position) => position.symbol));
  const currentValuations = await Promise.all(users.map(async (user) => {
    try {
      const snapshot = await getPortfolioSnapshot(user.id, liveMarketItems);

      return {
        user,
        valueUsd: snapshot.totalValueUsd,
        reliable: !snapshot.hasUnreliableValuation,
      };
    } catch {
      return { user, valueUsd: null, reliable: false };
    }
  }));
  const snapshotsByUser = new Map<string, typeof snapshots>();
  const baselinesByUser = new Map<string, typeof weeklyBaselines>();

  for (const snapshot of snapshots) {
    const values = snapshotsByUser.get(snapshot.userId) ?? [];
    values.push(snapshot);
    snapshotsByUser.set(snapshot.userId, values);
  }

  for (const baseline of weeklyBaselines) {
    const values = baselinesByUser.get(baseline.userId) ?? [];
    values.push(baseline);
    baselinesByUser.set(baseline.userId, values);
  }

  const candidatesByPeriod = new Map<PortfolioPeriodKey, CompetitionCandidate[]>();
  const excludedByPeriod = new Map<PortfolioPeriodKey, CompetitionPeriodResult["excludedCounts"]>();

  for (const period of portfolioCompetitionPeriods) {
    candidatesByPeriod.set(period.key, []);
    excludedByPeriod.set(period.key, { partialOrMissing: 0, unreliable: 0 });
  }

  for (const valuation of currentValuations) {
    if (!valuation.reliable || valuation.valueUsd === null) {
      for (const excluded of excludedByPeriod.values()) excluded.unreliable += 1;
      continue;
    }

    const history = normalizePortfolioHistory(
      (snapshotsByUser.get(valuation.user.id) ?? []).map(({ portfolioValueUsd, capturedAt, period }) => ({
        portfolioValueUsd,
        capturedAt,
        period,
      })),
      (baselinesByUser.get(valuation.user.id) ?? []).map(({ portfolioValueUsd, capturedAt }) => ({
        portfolioValueUsd,
        capturedAt,
      })),
    );
    const performances = buildPortfolioPerformancePeriods(history, valuation.valueUsd, now);

    for (const performance of performances) {
      if (
        performance.isPartial
        || performance.change === null
        || performance.changeUsd === null
        || performance.endValueUsd === null
      ) {
        excludedByPeriod.get(performance.key)!.partialOrMissing += 1;
        continue;
      }

      candidatesByPeriod.get(performance.key)!.push({
        userId: valuation.user.id,
        displayName: getDisplayName(valuation.user),
        returnPercent: performance.change,
        valueUsd: performance.endValueUsd,
        changeUsd: performance.changeUsd,
      });
    }
  }

  const rankedByPeriod = new Map<PortfolioPeriodKey, RankedCompetitionCandidate[]>();
  const periods = portfolioCompetitionPeriods.map((period) => {
    const ranked = rankCompetitionCandidates(candidatesByPeriod.get(period.key) ?? []);
    rankedByPeriod.set(period.key, ranked);

    return {
      key: period.key,
      requestedDays: period.requestedDays,
      rangeStartsAt: new Date(now.getTime() - period.requestedDays * 86_400_000).toISOString(),
      valuationAsOf: now.toISOString(),
      rows: createPublicRows(ranked, viewerUserId),
      viewerRow: createViewerRow(ranked, viewerUserId),
      excludedCounts: excludedByPeriod.get(period.key)!,
    } satisfies CompetitionPeriodResult;
  });
  const selectedRows = rankedByPeriod.get(selectedPeriod) ?? [];
  const selectedByUserId = new Map(selectedRows.map((row) => [row.userId, row]));
  const leagues = viewerLeagueMemberships.map(({ league }) => {
    const leagueCandidates = league.memberships.flatMap(({ userId }) => {
      const candidate = selectedByUserId.get(userId);
      return candidate ? [candidate] : [];
    });
    const rankedMembers = rankCompetitionCandidates(leagueCandidates);
    const viewer = rankedMembers.find((row) => row.userId === viewerUserId);

    return {
      id: league.id,
      name: league.name,
      slug: league.slug,
      type: league.type,
      rank: viewer?.rank ?? null,
      totalRankedMembers: rankedMembers.length,
      viewerReturnPercent: viewer?.returnPercent ?? null,
    } satisfies ViewerLeagueCompetitionResult;
  });

  return { periods, leagues };
}
