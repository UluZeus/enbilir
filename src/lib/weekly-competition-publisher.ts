import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import { initialCashUsd, getPortfolioSnapshot } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { appendAuditEvent } from "@/lib/audit-log";
import { getSafePublicUserLabel } from "@/lib/public-user-visibility";

const istOffsetMs = 3 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getIstanbulMondayStartUtc(now: Date) {
  const istNow = new Date(now.getTime() + istOffsetMs);
  const day = istNow.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const mondayIst = new Date(Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate() + diffToMonday,
  ));

  return new Date(mondayIst.getTime() - istOffsetMs);
}

function periodKeyForEnd(end: Date) {
  const endIst = new Date(end.getTime() + istOffsetMs);
  return `${endIst.getUTCFullYear()}-${pad(endIst.getUTCMonth() + 1)}-${pad(endIst.getUTCDate())}`;
}

function rank<T extends { returnPercent: number; valueUsd: number }>(rows: T[]) {
  return [...rows]
    .sort((left, right) => right.returnPercent - left.returnPercent || right.valueUsd - left.valueUsd)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function publishWeeklyCompetition(now = new Date()) {
  const end = getIstanbulMondayStartUtc(now);
  const start = new Date(end.getTime() - 7 * dayMs);
  const publicationPeriodKey = periodKeyForEnd(end);
  const currentBaselineKey = periodKeyForEnd(new Date(end.getTime() + 7 * dayMs));

  const [users, heldSymbols, existingPublication] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, emailVerifiedAt: { not: null } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        nickname: true,
        displayNameMode: true,
        email: true,
        role: true,
      },
    }),
    prisma.portfolioPosition.findMany({
      where: { delistedAt: null },
      select: { symbol: true },
      distinct: ["symbol"],
    }),
    prisma.weeklyCompetitionPublication.findUnique({
      where: { periodKey: publicationPeriodKey },
      select: { id: true },
    }),
  ]);

  const marketItems = await getLiveMarketItemsForSymbols(heldSymbols.map((position) => position.symbol));
  const snapshots = await Promise.all(users.map(async (user) => ({
    user,
    portfolio: await getPortfolioSnapshot(user.id, marketItems),
  })));
  const reliableSnapshots = snapshots.filter((snapshot) => !snapshot.portfolio.hasUnreliableValuation);

  const baselineRows = await prisma.weeklyPortfolioBaseline.findMany({
    where: { periodKey: publicationPeriodKey },
    select: { userId: true, portfolioValueUsd: true },
  });
  const baselineByUserId = new Map(baselineRows.map((row) => [row.userId, row.portfolioValueUsd]));

  const weeklyRows = rank(reliableSnapshots.flatMap(({ user, portfolio }) => {
    const baseline = baselineByUserId.get(user.id);

    if (!baseline || baseline <= 0) {
      return [];
    }

    const valueUsd = portfolio.totalValueUsd - baseline;
    return [{
      userId: user.id,
      displayName: getSafePublicUserLabel(
        user.name,
        user.nickname,
        user.displayNameMode,
        user.email,
      ) ?? "",
      valueUsd,
      returnPercent: (valueUsd / baseline) * 100,
    }];
  }));
  const totalRows = rank(reliableSnapshots.map(({ user, portfolio }) => {
    const valueUsd = portfolio.totalValueUsd - initialCashUsd;
    return {
      userId: user.id,
      displayName: getSafePublicUserLabel(
        user.name,
        user.nickname,
        user.displayNameMode,
        user.email,
      ) ?? "",
      valueUsd,
      returnPercent: (valueUsd / initialCashUsd) * 100,
    };
  }));

  const result = await prisma.$transaction(async (transaction) => {
    for (const { user, portfolio } of reliableSnapshots) {
      await transaction.weeklyPortfolioBaseline.upsert({
        where: { periodKey_userId: { periodKey: currentBaselineKey, userId: user.id } },
        create: {
          periodKey: currentBaselineKey,
          userId: user.id,
          portfolioValueUsd: portfolio.totalValueUsd,
          capturedAt: now,
        },
        update: {},
      });
    }

    if (existingPublication) {
      return { reused: true, publicationId: existingPublication.id };
    }

    try {
      const publication = await transaction.weeklyCompetitionPublication.create({
        data: {
          periodKey: publicationPeriodKey,
          startsAt: start,
          endsAt: end,
          publishedAt: now,
          note: snapshots.length === reliableSnapshots.length
            ? "Sonuçlar doğrulanmış fiyatlarla ve dönem başlangıcı portföy değeri üzerinden hesaplandı."
            : `${snapshots.length - reliableSnapshots.length} kullanıcı, doğrulanmış güncel fiyat bulunamadığı için bu yayına dahil edilmedi.`,
          rows: {
            create: [
              ...weeklyRows.map((row) => ({ ...row, scope: "WEEKLY_GAIN" as const })),
              ...totalRows.map((row) => ({ ...row, scope: "TOTAL_GAIN" as const })),
            ],
          },
        },
        select: { id: true },
      });
      await appendAuditEvent(transaction, {
        category: "LEAGUE",
        entityType: "WeeklyCompetitionPublication",
        entityId: publication.id,
        action: "WEEKLY_RESULTS_PUBLISHED",
        payload: {
          periodKey: publicationPeriodKey,
          includedUsers: reliableSnapshots.length,
          excludedUsers: snapshots.length - reliableSnapshots.length,
        },
        createdAt: now,
      });

      return { reused: false, publicationId: publication.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const publication = await transaction.weeklyCompetitionPublication.findUniqueOrThrow({
          where: { periodKey: publicationPeriodKey },
          select: { id: true },
        });
        return { reused: true, publicationId: publication.id };
      }
      throw error;
    }
  });

  return {
    ...result,
    publicationPeriodKey,
    currentBaselineKey,
    includedUsers: reliableSnapshots.length,
    excludedUsers: snapshots.length - reliableSnapshots.length,
    weeklyRows: weeklyRows.length,
    totalRows: totalRows.length,
  };
}
