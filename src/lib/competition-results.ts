import type { LeagueType } from "@/generated/prisma/enums";
import {
  buildPortfolioPerformancePeriods,
  normalizePortfolioHistory,
  portfolioCompetitionPeriods,
  type PortfolioPeriodKey,
} from "@/lib/portfolio-history";
import { selectLatestCommonPortfolioEquityCohort } from "@/lib/portfolio-equity-cohort";
import { prisma } from "@/lib/prisma";
import {
  getSafePublicUserLabel,
  publicCompetitionUserWhere,
} from "@/lib/public-user-visibility";
import { decimalToNumber } from "@/lib/decimal";

type CompetitionCandidate = {
  userId: string;
  displayName: string | null;
  returnPercent: number;
  valueUsd: number;
  changeUsd: number;
};

type RankedCompetitionCandidate = CompetitionCandidate & {
  rank: number;
};

export type CompetitionResultRow = {
  displayName: string | null;
  rank: number;
  returnPercent: number;
  isViewer: boolean;
};

export type CompetitionViewerRow = {
  displayName: string | null;
  rank: number;
  returnPercent: number;
  valueUsd: number;
  changeUsd: number;
};

export type CompetitionPeriodResult = {
  key: PortfolioPeriodKey;
  requestedDays: number;
  rangeStartsAt: string | null;
  valuationAsOf: string | null;
  totalRankedParticipants: number;
  leaderReturnPercent: number | null;
  topRows: CompetitionResultRow[];
  bottomRows: CompetitionResultRow[];
  rows: CompetitionResultRow[];
  viewerRow: CompetitionViewerRow | null;
  page: number;
  pageSize: number;
  pageCount: number;
  firstRowIndex: number;
  lastRowIndex: number;
  viewerPage: number | null;
  /** @deprecated Kept at zero while consumers migrate to stalePrice. */
  delayedValuationCount?: number;
  excludedCounts: {
    partialOrMissing: number;
    stalePrice: number;
    unreliable: number;
  };
};

const verifiedEquityHistoryPrefix = "equity-hour:";
const competitionPageSize = 25;

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
  requestedPage = 1,
) {
  const users = await prisma.user.findMany({
    where: {
      ...publicCompetitionUserWhere,
      trades: { some: {} },
    },
    select: {
      id: true,
      name: true,
      nickname: true,
      displayNameMode: true,
      email: true,
    },
  });
  const userIds = users.map((user) => user.id);
  const [snapshots, weeklyBaselines, viewerLeagueMemberships] = await Promise.all([
    prisma.portfolioSnapshot.findMany({
      where: {
        userId: { in: userIds },
        valuationStatus: "VERIFIED",
      },
      select: {
        userId: true,
        portfolioValueUsd: true,
        capturedAt: true,
        period: { select: { type: true } },
      },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.weeklyPortfolioBaseline.findMany({
      where: {
        userId: { in: userIds },
        periodKey: { startsWith: verifiedEquityHistoryPrefix },
      },
      select: {
        userId: true,
        periodKey: true,
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
  const normalizedSnapshots = snapshots.map((snapshot) => ({
    ...snapshot,
    portfolioValueUsd: decimalToNumber(snapshot.portfolioValueUsd),
  }));
  const normalizedWeeklyBaselines = weeklyBaselines.map((baseline) => ({
    ...baseline,
    portfolioValueUsd: decimalToNumber(baseline.portfolioValueUsd),
  }));
  const snapshotsByUser = new Map<string, typeof normalizedSnapshots>();
  const baselinesByUser = new Map<string, typeof normalizedWeeklyBaselines>();

  for (const snapshot of normalizedSnapshots) {
    const values = snapshotsByUser.get(snapshot.userId) ?? [];
    values.push(snapshot);
    snapshotsByUser.set(snapshot.userId, values);
  }

  for (const baseline of normalizedWeeklyBaselines) {
    const values = baselinesByUser.get(baseline.userId) ?? [];
    values.push(baseline);
    baselinesByUser.set(baseline.userId, values);
  }

  const commonCohort = selectLatestCommonPortfolioEquityCohort(userIds, normalizedWeeklyBaselines, now);
  const recordedValuations = users.map((user) => {
    const history = normalizePortfolioHistory(
      (snapshotsByUser.get(user.id) ?? []).map(({ portfolioValueUsd, capturedAt, period }) => ({
        portfolioValueUsd,
        capturedAt,
        period,
      })),
      (baselinesByUser.get(user.id) ?? []).map(({ portfolioValueUsd, capturedAt }) => ({
        portfolioValueUsd,
        capturedAt,
      })),
    );
    const valueUsd = commonCohort?.valueByUserId.get(user.id);
    if (valueUsd !== undefined) {
      return { user, history, valueUsd, status: "recorded" as const };
    }
    return {
      user,
      history,
      status: "unreliable" as const,
    };
  });

  const candidatesByPeriod = new Map<PortfolioPeriodKey, CompetitionCandidate[]>();
  const excludedByPeriod = new Map<PortfolioPeriodKey, CompetitionPeriodResult["excludedCounts"]>();

  for (const period of portfolioCompetitionPeriods) {
    candidatesByPeriod.set(period.key, []);
    excludedByPeriod.set(period.key, { partialOrMissing: 0, stalePrice: 0, unreliable: 0 });
  }

  for (const valuation of recordedValuations) {
    if (valuation.status !== "recorded" || !commonCohort) {
      for (const excluded of excludedByPeriod.values()) excluded.unreliable += 1;
      continue;
    }

    const performances = buildPortfolioPerformancePeriods(
      valuation.history,
      valuation.valueUsd,
      commonCohort.capturedAt,
    );

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
        displayName: getSafePublicUserLabel(
          valuation.user.name,
          valuation.user.nickname,
          valuation.user.displayNameMode,
          valuation.user.email,
        ),
        returnPercent: performance.change,
        valueUsd: performance.endValueUsd,
        changeUsd: performance.changeUsd,
      });
    }
  }

  const rankedByPeriod = new Map<PortfolioPeriodKey, RankedCompetitionCandidate[]>();
  const normalizedRequestedPage = Number.isFinite(requestedPage)
    ? Math.max(1, Math.floor(requestedPage))
    : 1;
  const periods = portfolioCompetitionPeriods.map((period) => {
    const ranked = rankCompetitionCandidates(candidatesByPeriod.get(period.key) ?? []);
    rankedByPeriod.set(period.key, ranked);
    const totalRankedParticipants = ranked.length;
    const pageCount = Math.max(1, Math.ceil(totalRankedParticipants / competitionPageSize));
    const page = period.key === selectedPeriod
      ? Math.min(normalizedRequestedPage, pageCount)
      : 1;
    const pageStart = (page - 1) * competitionPageSize;
    const isSelectedPeriod = period.key === selectedPeriod;
    const pageRows = isSelectedPeriod
      ? ranked.slice(pageStart, pageStart + competitionPageSize)
      : [];
    const viewerIndex = ranked.findIndex((row) => row.userId === viewerUserId);
    const topRows = ranked.slice(0, Math.min(3, totalRankedParticipants));
    const bottomRows = ranked.slice(Math.max(3, totalRankedParticipants - 3));
    const valuationAsOf = commonCohort?.capturedAt ?? null;

    return {
      key: period.key,
      requestedDays: period.requestedDays,
      rangeStartsAt: valuationAsOf
        ? new Date(valuationAsOf.getTime() - period.requestedDays * 86_400_000).toISOString()
        : null,
      valuationAsOf: valuationAsOf?.toISOString() ?? null,
      totalRankedParticipants,
      leaderReturnPercent: ranked[0]?.returnPercent ?? null,
      topRows: createPublicRows(topRows, viewerUserId),
      bottomRows: createPublicRows(bottomRows, viewerUserId),
      rows: createPublicRows(pageRows, viewerUserId),
      viewerRow: isSelectedPeriod ? createViewerRow(ranked, viewerUserId) : null,
      page,
      pageSize: competitionPageSize,
      pageCount,
      firstRowIndex: isSelectedPeriod && pageRows.length > 0 ? pageStart + 1 : 0,
      lastRowIndex: isSelectedPeriod ? pageStart + pageRows.length : 0,
      viewerPage: isSelectedPeriod && viewerIndex >= 0
        ? Math.floor(viewerIndex / competitionPageSize) + 1
        : null,
      delayedValuationCount: 0,
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
