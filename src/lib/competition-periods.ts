import { getDisplayName } from "@/lib/auth";
import { awardBadge } from "@/lib/badges";
import { getAcceptedFriendIds } from "@/lib/friends";
import { getPortfolioSnapshot, initialCashUsd } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import type { CompetitionPeriodType } from "@/generated/prisma/enums";

export const competitionPeriodTypes: CompetitionPeriodType[] = [
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "YEARLY",
];

export const competitionPeriodLabels: Record<CompetitionPeriodType, string> = {
  WEEKLY: "Haftalık",
  MONTHLY: "Aylık",
  QUARTERLY: "3 Aylık",
  SEMI_ANNUAL: "6 Aylık",
  YEARLY: "Yıllık",
};

const typeFallbackDays: Record<CompetitionPeriodType, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  SEMI_ANNUAL: 180,
  YEARLY: 365,
};

type RankedRow = {
  userId: string;
  displayName: string;
  portfolioValueUsd: number;
  cashUsd: number;
  positionsValueUsd: number;
  returnPercent: number;
  rank: number;
  source: "snapshot" | "live";
};

type PeriodLeaderboardMode = "live" | "snapshot";

function createFallbackPeriod(type: CompetitionPeriodType) {
  const now = new Date();
  const startsAt = new Date(now);
  startsAt.setDate(startsAt.getDate() - typeFallbackDays[type]);

  return {
    id: `fallback-${type}`,
    type,
    name: `${competitionPeriodLabels[type]} Geçici Dönem`,
    startsAt,
    endsAt: now,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getActiveCompetitionPeriod(type: CompetitionPeriodType) {
  const now = new Date();
  const activePeriod = await prisma.competitionPeriod.findFirst({
    where: {
      type,
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { startsAt: "desc" },
  });

  return activePeriod ?? createFallbackPeriod(type);
}

export async function getCompetitionPeriods() {
  return prisma.competitionPeriod.findMany({
    orderBy: [{ startsAt: "desc" }, { type: "asc" }],
  });
}

export async function getPeriodLeaderboard(type: CompetitionPeriodType, mode: PeriodLeaderboardMode = "live") {
  const period = await getActiveCompetitionPeriod(type);
  const hasPersistedPeriod = !period.id.startsWith("fallback-");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      nickname: true,
      displayNameMode: true,
      email: true,
      role: true,
    },
  });

  if (mode === "snapshot" && hasPersistedPeriod) {
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { periodId: period.id },
    });

    if (snapshots.length > 0) {
      const userMap = new Map(users.map((user) => [user.id, user]));
      const rankedRows = snapshots
        .map((snapshot) => {
          const user = userMap.get(snapshot.userId);

          return {
            userId: snapshot.userId,
            displayName: user ? getDisplayName(user) : "Kullanıcı",
            portfolioValueUsd: snapshot.portfolioValueUsd,
            cashUsd: snapshot.cashUsd,
            positionsValueUsd: snapshot.positionsValueUsd,
            returnPercent: snapshot.returnPercent,
            rank: snapshot.rank ?? 0,
            source: "snapshot" as const,
          };
        })
        .sort((a, b) => b.returnPercent - a.returnPercent)
        .map((row, index) => ({ ...row, rank: row.rank || index + 1 }));

      return { period, rows: rankedRows };
    }
  }

  const liveRows = await Promise.all(
    users.map(async (user) => {
      const snapshot = await getPortfolioSnapshot(user.id);

      return {
        userId: user.id,
        displayName: getDisplayName(user),
        portfolioValueUsd: snapshot.totalValueUsd,
        cashUsd: snapshot.cashValueUsd,
        positionsValueUsd: snapshot.positionsValueUsd,
        returnPercent: ((snapshot.totalValueUsd - initialCashUsd) / initialCashUsd) * 100,
        rank: 0,
        source: "live" as const,
      };
    }),
  );
  const rows = liveRows.sort((a, b) => b.returnPercent - a.returnPercent).map((row, index) => ({ ...row, rank: index + 1 }));

  return { period, rows };
}

export async function getCompetitionRankingsForUser(userId: string) {
  const friendIds = await getAcceptedFriendIds(userId);
  const friendScopeIds = [userId, ...friendIds];

  return Promise.all(
    competitionPeriodTypes.map(async (type) => {
      const leaderboard = await getPeriodLeaderboard(type);
      const friendRows = leaderboard.rows.filter((row) => friendScopeIds.includes(row.userId));
      const userRow = leaderboard.rows.find((row) => row.userId === userId);
      const friendRow = friendRows.find((row) => row.userId === userId);

      return {
        type,
        label: competitionPeriodLabels[type],
        period: leaderboard.period,
        overall: userRow?.rank ?? leaderboard.rows.length,
        friends: friendIds.length > 0 ? friendRow?.rank ?? null : null,
        totalUsers: leaderboard.rows.length,
        totalFriendsScope: friendRows.length,
        hasFriends: friendIds.length > 0,
        leaderName: leaderboard.rows[0]?.displayName ?? "-",
        source: leaderboard.rows[0]?.source ?? "live",
      };
    }),
  );
}

export async function awardLeaderBadgesForActivePeriods() {
  const [weekly, monthly] = await Promise.all([getPeriodLeaderboard("WEEKLY"), getPeriodLeaderboard("MONTHLY")]);
  const awarded: string[] = [];

  if (weekly.rows[0]) {
    await awardBadge(weekly.rows[0].userId, "WEEKLY_LEADER", { periodId: weekly.period.id, rank: 1 });
    awarded.push(`Haftalık: ${weekly.rows[0].displayName}`);
  }

  if (monthly.rows[0]) {
    await awardBadge(monthly.rows[0].userId, "MONTHLY_LEADER", { periodId: monthly.period.id, rank: 1 });
    awarded.push(`Aylık: ${monthly.rows[0].displayName}`);
  }

  return awarded;
}

export type CompetitionRankingPeriod = Awaited<ReturnType<typeof getCompetitionRankingsForUser>>[number];
export type PeriodLeaderboardRow = RankedRow;
