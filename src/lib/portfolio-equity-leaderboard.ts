import "server-only";

import { createHash } from "node:crypto";
import type { LeagueType } from "@/generated/prisma/enums";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import {
  buildPortfolioPerformancePeriods,
  calculatePercentChange,
  normalizePortfolioHistory,
} from "@/lib/portfolio-history";
import { getPortfolioSnapshot, initialCashUsd } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { publicCompetitionUserWhere } from "@/lib/public-user-visibility";

export const portfolioEquityLeaderboardPageSize = 25;

export type PortfolioEquityLeaderboardRow = {
  alias: string;
  rank: number;
  totalValueUsd: number;
  totalReturnPercent: number | null;
  weeklyReturnPercent: number | null;
  monthlyReturnPercent: number | null;
  leagueNames: string[];
  isViewer: boolean;
};

export type PortfolioEquityLeaderboardLeagueRank = {
  name: string;
  type: LeagueType;
  rank: number | null;
  totalRankedMembers: number;
};

export type PortfolioEquityLeaderboardResult = {
  valuationAsOf: string;
  rows: PortfolioEquityLeaderboardRow[];
  totalRankedParticipants: number;
  excludedUnreliableCount: number;
  page: number;
  pageSize: typeof portfolioEquityLeaderboardPageSize;
  pageCount: number;
  firstRowIndex: number;
  lastRowIndex: number;
  viewerRank: number | null;
  viewerTotalValueUsd: number | null;
  viewerLeagues: PortfolioEquityLeaderboardLeagueRank[];
};

type EquityCandidate = {
  userId: string;
  alias: string;
  totalValueMicroUsd: number;
  weeklyReturnPercent: number | null;
  monthlyReturnPercent: number | null;
};

type RankedEquityCandidate = EquityCandidate & {
  rank: number;
};

const cashFxSymbolByMode = {
  EUR: "EUR/USD",
  CHF: "USD/CHF",
  TRY_REPO: "USD/TRY",
} as const;

function canonicalMicroUsd(valueUsd: number) {
  if (!Number.isFinite(valueUsd) || valueUsd < 0) return null;

  const microUsd = Math.round(valueUsd * 1_000_000);
  return Number.isSafeInteger(microUsd) ? microUsd : null;
}

function microUsdToUsd(microUsd: number) {
  return microUsd / 1_000_000;
}

function getPeriodReturn(
  history: ReturnType<typeof normalizePortfolioHistory>,
  totalValueUsd: number,
  now: Date,
  key: "WEEKLY" | "MONTHLY",
) {
  const performance = buildPortfolioPerformancePeriods(history, totalValueUsd, now)
    .find((period) => period.key === key);

  return performance && !performance.isPartial ? performance.change : null;
}

function safeNickname(nickname: string | null) {
  const trimmed = nickname?.trim();
  return trimmed || null;
}

export function createPortfolioParticipantAlias(userId: string, nickname: string | null) {
  const safe = safeNickname(nickname);
  if (safe) return safe;

  const hashPrefix = createHash("sha256").update(userId).digest("hex").slice(0, 6).toUpperCase();
  return `Participant #${hashPrefix}`;
}

export function rankPortfolioEquityCandidates(candidates: EquityCandidate[]): RankedEquityCandidate[] {
  const ordered = [...candidates].sort((left, right) => {
    if (left.totalValueMicroUsd !== right.totalValueMicroUsd) {
      return left.totalValueMicroUsd > right.totalValueMicroUsd ? -1 : 1;
    }

    return left.userId.localeCompare(right.userId);
  });
  let previousValue: number | null = null;
  let previousRank = 0;

  return ordered.map((candidate, index) => {
    const rank = previousValue === candidate.totalValueMicroUsd ? previousRank : index + 1;
    previousValue = candidate.totalValueMicroUsd;
    previousRank = rank;
    return { ...candidate, rank };
  });
}

function normalizeRequestedPage(requestedPage: number) {
  return Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
}

export async function getPortfolioEquityLeaderboard(
  viewerUserId: string,
  now = new Date(),
  requestedPage = 1,
): Promise<PortfolioEquityLeaderboardResult> {
  const users = await prisma.user.findMany({
    where: {
      ...publicCompetitionUserWhere,
      virtualAccount: { isNot: null },
      trades: { some: {} },
    },
    select: {
      id: true,
      nickname: true,
      virtualAccount: { select: { cashMode: true } },
    },
  });
  const userIds = users.map((user) => user.id);

  const [heldSymbols, snapshots, weeklyBaselines, activeMemberships, viewerLeagueMemberships] = await Promise.all([
    prisma.portfolioPosition.findMany({
      where: { userId: { in: userIds } },
      select: { symbol: true },
      distinct: ["symbol"],
    }),
    prisma.portfolioSnapshot.findMany({
      where: { userId: { in: userIds }, valuationStatus: "VERIFIED" },
      select: {
        userId: true,
        portfolioValueUsd: true,
        capturedAt: true,
        period: { select: { type: true } },
      },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.weeklyPortfolioBaseline.findMany({
      where: { userId: { in: userIds }, periodKey: { startsWith: "equity-hour:" } },
      select: { userId: true, portfolioValueUsd: true, capturedAt: true },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.leagueMembership.findMany({
      where: { userId: { in: userIds }, league: { isActive: true } },
      select: { userId: true, league: { select: { id: true, name: true, type: true } } },
    }),
    prisma.leagueMembership.findMany({
      where: { userId: viewerUserId, league: { isActive: true } },
      select: {
        league: {
          select: {
            id: true,
            name: true,
            type: true,
            memberships: { select: { userId: true } },
          },
        },
      },
    }),
  ]);

  const snapshotHistoryByUserId = new Map<string, typeof snapshots>();
  const baselineHistoryByUserId = new Map<string, typeof weeklyBaselines>();
  for (const snapshot of snapshots) {
    const records = snapshotHistoryByUserId.get(snapshot.userId) ?? [];
    records.push(snapshot);
    snapshotHistoryByUserId.set(snapshot.userId, records);
  }
  for (const baseline of weeklyBaselines) {
    const records = baselineHistoryByUserId.get(baseline.userId) ?? [];
    records.push(baseline);
    baselineHistoryByUserId.set(baseline.userId, records);
  }

  const requestedSymbols = Array.from(new Set([
    ...heldSymbols.map((position) => position.symbol),
    ...users.flatMap((user) => {
      const mode = user.virtualAccount?.cashMode;
      return mode && mode !== "USD" ? [cashFxSymbolByMode[mode]] : [];
    }),
  ])).sort();
  const marketItems = await getLiveMarketItemsForSymbols(requestedSymbols).catch(() => []);

  let excludedUnreliableCount = 0;
  const candidates: EquityCandidate[] = [];
  for (const user of users) {
    try {
      const snapshot = await getPortfolioSnapshot(user.id, marketItems);
      if (snapshot.hasUnreliableValuation) {
        excludedUnreliableCount += 1;
        continue;
      }

      const totalValueMicroUsd = canonicalMicroUsd(snapshot.totalValueUsd);
      if (totalValueMicroUsd === null) {
        excludedUnreliableCount += 1;
        continue;
      }

      const totalValueUsd = microUsdToUsd(totalValueMicroUsd);
      const history = normalizePortfolioHistory(
        snapshotHistoryByUserId.get(user.id) ?? [],
        baselineHistoryByUserId.get(user.id) ?? [],
      );
      candidates.push({
        userId: user.id,
        alias: createPortfolioParticipantAlias(user.id, user.nickname),
        totalValueMicroUsd,
        weeklyReturnPercent: getPeriodReturn(history, totalValueUsd, now, "WEEKLY"),
        monthlyReturnPercent: getPeriodReturn(history, totalValueUsd, now, "MONTHLY"),
      });
    } catch {
      // A current equity rank cannot use a stale or synthetic fallback valuation.
      excludedUnreliableCount += 1;
    }
  }

  const ranked = rankPortfolioEquityCandidates(candidates);
  const candidateByUserId = new Map(ranked.map((candidate) => [candidate.userId, candidate]));
  const visiblePrivateLeagueIds = new Set(
    viewerLeagueMemberships
      .filter(({ league }) => league.type === "PRIVATE")
      .map(({ league }) => league.id),
  );
  const leagueNamesByUserId = new Map<string, Set<string>>();
  for (const membership of activeMemberships) {
    if (membership.league.type === "PRIVATE" && !visiblePrivateLeagueIds.has(membership.league.id)) {
      continue;
    }
    const names = leagueNamesByUserId.get(membership.userId) ?? new Set<string>();
    names.add(membership.league.name);
    leagueNamesByUserId.set(membership.userId, names);
  }

  const viewerLeagues = viewerLeagueMemberships.map(({ league }) => {
    const members = league.memberships.flatMap(({ userId }) => {
      const candidate = candidateByUserId.get(userId);
      return candidate ? [candidate] : [];
    });
    const rankedMembers = rankPortfolioEquityCandidates(members);
    const viewer = rankedMembers.find((candidate) => candidate.userId === viewerUserId);

    return {
      name: league.name,
      type: league.type,
      rank: viewer?.rank ?? null,
      totalRankedMembers: rankedMembers.length,
    } satisfies PortfolioEquityLeaderboardLeagueRank;
  });

  const totalRankedParticipants = ranked.length;
  const pageCount = Math.max(1, Math.ceil(totalRankedParticipants / portfolioEquityLeaderboardPageSize));
  const page = Math.min(normalizeRequestedPage(requestedPage), pageCount);
  const start = (page - 1) * portfolioEquityLeaderboardPageSize;
  const pageRows = ranked.slice(start, start + portfolioEquityLeaderboardPageSize).map((candidate) => ({
    alias: candidate.alias,
    rank: candidate.rank,
    totalValueUsd: microUsdToUsd(candidate.totalValueMicroUsd),
    totalReturnPercent: calculatePercentChange(initialCashUsd, microUsdToUsd(candidate.totalValueMicroUsd)),
    weeklyReturnPercent: candidate.weeklyReturnPercent,
    monthlyReturnPercent: candidate.monthlyReturnPercent,
    leagueNames: Array.from(leagueNamesByUserId.get(candidate.userId) ?? []).sort((left, right) => left.localeCompare(right)),
    isViewer: candidate.userId === viewerUserId,
  } satisfies PortfolioEquityLeaderboardRow));
  const viewer = candidateByUserId.get(viewerUserId);

  return {
    valuationAsOf: now.toISOString(),
    rows: pageRows,
    totalRankedParticipants,
    excludedUnreliableCount,
    page,
    pageSize: portfolioEquityLeaderboardPageSize,
    pageCount,
    firstRowIndex: pageRows.length > 0 ? start + 1 : 0,
    lastRowIndex: start + pageRows.length,
    viewerRank: viewer?.rank ?? null,
    viewerTotalValueUsd: viewer ? microUsdToUsd(viewer.totalValueMicroUsd) : null,
    viewerLeagues,
  };
}
