import "server-only";

import { createHash } from "node:crypto";
import type { CashMode, DisplayNameMode, LeagueType } from "@/generated/prisma/enums";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import type { MarketItem } from "@/lib/market-data";
import {
  buildPortfolioPerformancePeriods,
  calculatePercentChange,
  normalizePortfolioHistory,
} from "@/lib/portfolio-history";
import { getCashModeUsdRate, hasVerifiedPortfolioQuote, initialCashUsd } from "@/lib/portfolio";
import { isYahooEquityMarket } from "@/lib/portfolio-corporate-actions";
import { selectLatestCommonPortfolioEquityCohort } from "@/lib/portfolio-equity-cohort";
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
  id: string;
  name: string;
  slug: string;
  type: LeagueType;
  rank: number | null;
  totalRankedMembers: number;
};

export type PortfolioEquityLeaderboardResult = {
  valuationMode: "LIVE" | "RECORDED";
  valuationAsOf: string | null;
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

type ReadOnlyPortfolioPosition = {
  symbol: string;
  market: string;
  quantity: number;
  appliedSplitFactor: number;
  corporateActionsCheckedAt: Date | null;
};

type ReadOnlyVirtualAccount = {
  cashMode: CashMode;
  cashAmount: number;
  dailyRepoRate: number;
  repoLastAccruedAt: Date | null;
  updatedAt: Date;
};

const cashFxSymbolByMode = {
  EUR: "EUR/USD",
  CHF: "USD/CHF",
  TRY_REPO: "USD/TRY",
} as const;

// Mirrors the maximum accepted Yahoo market-closed valuation age: the
// leaderboard does not mutate positions to repair corporate-action state.
const maximumCorporateActionVerificationAgeMs = 96 * 60 * 60 * 1_000;

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

export function createPortfolioParticipantAlias(
  userId: string,
  nickname: string | null,
  displayNameMode: DisplayNameMode,
) {
  const safe = displayNameMode === "NICKNAME" ? safeNickname(nickname) : null;
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

function findMarketItem(marketItems: MarketItem[], symbol: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();
  return marketItems.find((item) => item.symbol.trim().toUpperCase() === normalizedSymbol);
}

function calculateReadOnlyPositionsValueUsd(
  positions: ReadOnlyPortfolioPosition[],
  marketItems: MarketItem[],
  now: Date,
) {
  let totalValueUsd = 0;
  for (const position of positions) {
    if (!Number.isFinite(position.quantity) || position.quantity < 0) return null;
    if (position.quantity === 0) continue;

    if (
      !Number.isFinite(position.appliedSplitFactor)
      || position.appliedSplitFactor <= 0
    ) {
      return null;
    }

    if (isYahooEquityMarket(position.market)) {
      const verifiedAt = position.corporateActionsCheckedAt?.getTime();
      const corporateActionAgeMs = verifiedAt === undefined ? Number.NaN : now.getTime() - verifiedAt;
      if (
        !Number.isFinite(corporateActionAgeMs)
        || corporateActionAgeMs < 0
        || corporateActionAgeMs > maximumCorporateActionVerificationAgeMs
      ) {
        return null;
      }
    }

    const quote = findMarketItem(marketItems, position.symbol);
    if (
      !hasVerifiedPortfolioQuote(quote, now.getTime())
      || !quote
      || !Number.isFinite(quote.priceUsd)
      || quote.priceUsd <= 0
    ) {
      return null;
    }

    const valueUsd = position.quantity * quote.priceUsd;
    if (!Number.isFinite(valueUsd)) return null;
    totalValueUsd += valueUsd;
  }

  return Number.isFinite(totalValueUsd) ? totalValueUsd : null;
}

async function calculateReadOnlyCashValueUsd(
  account: ReadOnlyVirtualAccount,
  marketItems: MarketItem[],
  now: Date,
) {
  if (!Number.isFinite(account.cashAmount) || account.cashAmount < 0) return null;

  let cashAmount = account.cashAmount;
  if (account.cashMode === "TRY_REPO") {
    const lastAccruedAt = account.repoLastAccruedAt ?? account.updatedAt;
    const lastAccruedAtMs = lastAccruedAt.getTime();
    const elapsedDays = Math.floor((now.getTime() - lastAccruedAtMs) / 86_400_000);
    if (!Number.isFinite(lastAccruedAtMs) || !Number.isFinite(account.dailyRepoRate)) return null;

    if (elapsedDays > 0) {
      const factor = Math.pow(1 + account.dailyRepoRate, elapsedDays);
      if (!Number.isFinite(factor) || factor < 0) return null;
      cashAmount *= factor;
    }
  }

  if (!Number.isFinite(cashAmount) || cashAmount < 0) return null;
  if (account.cashMode === "USD") return cashAmount;

  const cashFxSymbol = cashFxSymbolByMode[account.cashMode];
  const cashFxQuote = findMarketItem(marketItems, cashFxSymbol);
  if (!hasVerifiedPortfolioQuote(cashFxQuote, now.getTime())) return null;

  const rateToUsd = await getCashModeUsdRate(account.cashMode, marketItems);
  if (rateToUsd === null || !Number.isFinite(rateToUsd) || rateToUsd <= 0) return null;

  const cashValueUsd = cashAmount * rateToUsd;
  return Number.isFinite(cashValueUsd) ? cashValueUsd : null;
}

async function calculateReadOnlyTotalValueUsd(
  account: ReadOnlyVirtualAccount | null,
  positions: ReadOnlyPortfolioPosition[],
  marketItems: MarketItem[],
  now: Date,
) {
  if (!account) return null;

  const [cashValueUsd, positionsValueUsd] = await Promise.all([
    calculateReadOnlyCashValueUsd(account, marketItems, now),
    Promise.resolve(calculateReadOnlyPositionsValueUsd(positions, marketItems, now)),
  ]);
  if (cashValueUsd === null || positionsValueUsd === null) return null;

  const totalValueUsd = cashValueUsd + positionsValueUsd;
  return Number.isFinite(totalValueUsd) && totalValueUsd >= 0 ? totalValueUsd : null;
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
      displayNameMode: true,
      virtualAccount: {
        select: {
          cashMode: true,
          cashAmount: true,
          dailyRepoRate: true,
          repoLastAccruedAt: true,
          updatedAt: true,
        },
      },
      positions: {
        select: {
          symbol: true,
          market: true,
          quantity: true,
          appliedSplitFactor: true,
          corporateActionsCheckedAt: true,
        },
      },
    },
  });
  const userIds = users.map((user) => user.id);

  const [snapshots, weeklyBaselines, activeMemberships, viewerLeagueMemberships] = await Promise.all([
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
      select: { userId: true, periodKey: true, portfolioValueUsd: true, capturedAt: true },
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
            slug: true,
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
    ...users.flatMap((user) => user.positions.map((position) => position.symbol)),
    ...users.flatMap((user) => {
      const mode = user.virtualAccount?.cashMode;
      return mode && mode !== "USD" ? [cashFxSymbolByMode[mode]] : [];
    }),
  ])).sort();
  const marketItems = await getLiveMarketItemsForSymbols(requestedSymbols).catch(() => []);

  const liveValueByUserId = new Map<string, number>();
  for (const user of users) {
    try {
      const totalValueUsd = await calculateReadOnlyTotalValueUsd(
        user.virtualAccount,
        user.positions,
        marketItems,
        now,
      );
      const totalValueMicroUsd = totalValueUsd === null ? null : canonicalMicroUsd(totalValueUsd);
      if (totalValueMicroUsd !== null) liveValueByUserId.set(user.id, totalValueMicroUsd);
    } catch {
      // One failed live valuation switches the whole board to a common recorded cohort.
    }
  }

  const hasCompleteLiveBoard = liveValueByUserId.size === users.length;
  const recordedCohort = hasCompleteLiveBoard
    ? null
    : selectLatestCommonPortfolioEquityCohort(userIds, weeklyBaselines, now);
  const valuationMode = hasCompleteLiveBoard ? "LIVE" as const : "RECORDED" as const;
  const valuationDate = hasCompleteLiveBoard ? now : recordedCohort?.capturedAt ?? null;
  const candidates: EquityCandidate[] = [];
  let excludedUnreliableCount = 0;

  for (const user of users) {
    const recordedValueUsd = recordedCohort?.valueByUserId.get(user.id);
    const totalValueMicroUsd = hasCompleteLiveBoard
      ? liveValueByUserId.get(user.id) ?? null
      : recordedValueUsd === undefined ? null : canonicalMicroUsd(recordedValueUsd);
    if (totalValueMicroUsd === null || !valuationDate) {
      excludedUnreliableCount += 1;
      continue;
    }

    const canonicalTotalValueUsd = microUsdToUsd(totalValueMicroUsd);
    const history = normalizePortfolioHistory(
      snapshotHistoryByUserId.get(user.id) ?? [],
      baselineHistoryByUserId.get(user.id) ?? [],
    );
    candidates.push({
      userId: user.id,
      alias: createPortfolioParticipantAlias(user.id, user.nickname, user.displayNameMode),
      totalValueMicroUsd,
      weeklyReturnPercent: getPeriodReturn(history, canonicalTotalValueUsd, valuationDate, "WEEKLY"),
      monthlyReturnPercent: getPeriodReturn(history, canonicalTotalValueUsd, valuationDate, "MONTHLY"),
    });
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
      id: league.id,
      name: league.name,
      slug: league.slug,
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
    valuationMode,
    valuationAsOf: valuationDate?.toISOString() ?? null,
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
