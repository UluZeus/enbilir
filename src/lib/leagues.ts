import { getDisplayName } from "@/lib/auth";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import { calculateCompetitionProfitLossUsd, calculateCompetitionReturnPercent, getPortfolioSnapshot } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import type { LeagueType } from "@/generated/prisma/enums";

export const leagueTypeLabels: Record<LeagueType, string> = {
  ROTARY: "Rotary",
  ROTARACT: "Rotaract",
  INTERACT: "Interact",
  PRIVATE: "Özel grup",
  GENERAL: "Genel lig",
};

export const leagueTypes: LeagueType[] = ["ROTARY", "ROTARACT", "INTERACT", "PRIVATE", "GENERAL"];

const inviteAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function slugifyLeagueName(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "lig";
}

export function createInviteCode() {
  return Array.from({ length: 8 }, () => inviteAlphabet[Math.floor(Math.random() * inviteAlphabet.length)]).join("");
}

export async function getUniqueLeagueSlug(name: string) {
  const baseSlug = slugifyLeagueName(name);
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.league.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function getUniqueInviteCode() {
  let inviteCode = createInviteCode();

  while (await prisma.league.findUnique({ where: { inviteCode }, select: { id: true } })) {
    inviteCode = createInviteCode();
  }

  return inviteCode;
}

export async function getUserLeagues(userId: string) {
  return prisma.leagueMembership.findMany({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    include: {
      league: {
        include: {
          _count: {
            select: { memberships: true },
          },
        },
      },
    },
  });
}

export async function getActiveLeagues() {
  return prisma.league.findMany({
    where: { isActive: true },
    orderBy: [{ createdAt: "desc" }],
    include: {
      _count: {
        select: { memberships: true },
      },
    },
    take: 24,
  });
}

export async function getLeagueDetail(slug: string) {
  return prisma.league.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { memberships: true },
      },
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              displayNameMode: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });
}

export async function getLeagueLeaderboard(leagueId: string, currentUserId?: string) {
  const memberships = await prisma.leagueMembership.findMany({
    where: { leagueId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nickname: true,
          displayNameMode: true,
          email: true,
          role: true,
        },
      },
    },
  });

  const membershipUserIds = memberships.map((membership) => membership.userId);
  const heldSymbols = await prisma.portfolioPosition.findMany({
    where: { userId: { in: membershipUserIds } },
    select: { symbol: true },
    distinct: ["symbol"],
  });
  const liveMarketItems = await getLiveMarketItemsForSymbols(heldSymbols.map((position) => position.symbol));
  const rows = await Promise.all(
    memberships.map(async (membership) => {
      const snapshot = await getPortfolioSnapshot(membership.userId, liveMarketItems);

      return {
        membershipId: membership.id,
        userId: membership.userId,
        displayName: getDisplayName(membership.user),
        role: membership.role,
        totalValueUsd: snapshot.totalValueUsd,
        profitLossUsd: calculateCompetitionProfitLossUsd(snapshot.totalValueUsd),
        profitLossPercent: calculateCompetitionReturnPercent(snapshot.totalValueUsd),
      };
    }),
  );

  const rankedRows = rows
    .sort((a, b) => b.totalValueUsd - a.totalValueUsd)
    .map((row, index) => ({ ...row, rank: index + 1 }));
  const currentUserRank = currentUserId ? rankedRows.find((row) => row.userId === currentUserId)?.rank ?? null : null;

  return {
    rows: rankedRows,
    currentUserRank,
  };
}
