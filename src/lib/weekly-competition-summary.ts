import { unstable_cache } from "next/cache";
import { getDisplayName } from "@/lib/auth";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import { getPortfolioSnapshot, initialCashUsd } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";

type RankedSummaryRow = {
  userId: string;
  displayName: string;
  valueUsd: number;
  returnPercent: number;
  rank: number;
};

type PublishedWeekWindow = {
  start: Date;
  end: Date;
  publishedAt: Date;
  key: string;
};

const istOffsetMs = 3 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getIstanbulMondayStartUtc(now = new Date()) {
  const istNow = new Date(now.getTime() + istOffsetMs);
  const day = istNow.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const mondayIst = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + diffToMonday, 0, 0, 0, 0));

  return new Date(mondayIst.getTime() - istOffsetMs);
}

function getPublishedWeekWindow(now = new Date()): PublishedWeekWindow {
  const thisWeekStart = getIstanbulMondayStartUtc(now);
  const thisWeekPublishTime = new Date(thisWeekStart.getTime() + 7 * hourMs);
  const end = now.getTime() >= thisWeekPublishTime.getTime()
    ? thisWeekStart
    : new Date(thisWeekStart.getTime() - 7 * dayMs);
  const start = new Date(end.getTime() - 7 * dayMs);
  const publishedAt = new Date(end.getTime() + 7 * hourMs);
  const endIst = new Date(end.getTime() + istOffsetMs);
  const key = `${endIst.getUTCFullYear()}-${pad(endIst.getUTCMonth() + 1)}-${pad(endIst.getUTCDate())}`;

  return { start, end, publishedAt, key };
}

function rankRows(rows: Omit<RankedSummaryRow, "rank">[]) {
  return rows
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function formatWeekRange(start: Date, end: Date, locale: "tr" | "en") {
  const formatter = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Istanbul",
  });
  const inclusiveEnd = new Date(end.getTime() - dayMs);

  return `${formatter.format(start)} - ${formatter.format(inclusiveEnd)}`;
}

const getCachedWeeklyCompetitionRows = unstable_cache(
  async () => {
    const window = getPublishedWeekWindow();
    const [users, trades, heldSymbols] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
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
      prisma.virtualTrade.findMany({
        where: {
          createdAt: {
            gte: window.start,
            lt: window.end,
          },
        },
        select: {
          userId: true,
          symbol: true,
          side: true,
          quantity: true,
          priceUsd: true,
        },
      }),
      prisma.portfolioPosition.findMany({
        select: { symbol: true },
        distinct: ["symbol"],
      }),
    ]);

    const tradeSymbols = trades.map((trade) => trade.symbol);
    const liveMarketItems = await getLiveMarketItemsForSymbols([...heldSymbols.map((position) => position.symbol), ...tradeSymbols]);
    const marketItemBySymbol = new Map(liveMarketItems.map((item) => [item.symbol, item]));
    const userById = new Map(users.map((user) => [user.id, user]));
    const weeklyValueByUser = new Map<string, number>();

    for (const trade of trades) {
      const marketItem = marketItemBySymbol.get(trade.symbol);
      const currentPriceUsd = marketItem?.priceUsd && marketItem.priceUsd > 0 ? marketItem.priceUsd : trade.priceUsd;
      const contribution = trade.side === "BUY"
        ? (currentPriceUsd - trade.priceUsd) * trade.quantity
        : (trade.priceUsd - currentPriceUsd) * trade.quantity;

      weeklyValueByUser.set(trade.userId, (weeklyValueByUser.get(trade.userId) ?? 0) + contribution);
    }

    const weeklyRows = rankRows(
      Array.from(weeklyValueByUser.entries()).map(([userId, valueUsd]) => {
        const user = userById.get(userId);

        return {
          userId,
          displayName: user ? getDisplayName(user) : "Kullanıcı",
          valueUsd,
          returnPercent: (valueUsd / initialCashUsd) * 100,
        };
      }),
    );

    const totalRows = rankRows(
      await Promise.all(
        users.map(async (user) => {
          const snapshot = await getPortfolioSnapshot(user.id, liveMarketItems);
          const profitUsd = snapshot.totalValueUsd - initialCashUsd;

          return {
            userId: user.id,
            displayName: getDisplayName(user),
            valueUsd: profitUsd,
            returnPercent: (profitUsd / initialCashUsd) * 100,
          };
        }),
      ),
    );

    return {
      weekKey: window.key,
      startIso: window.start.toISOString(),
      endIso: window.end.toISOString(),
      publishedAtIso: window.publishedAt.toISOString(),
      weeklyRows,
      totalRows,
    };
  },
  ["weekly-competition-summary-v1"],
  { revalidate: 3600 },
);

export async function getWeeklyCompetitionSummary(locale: "tr" | "en", currentUserId?: string) {
  const storedSummary = await getLatestStoredWeeklyCompetitionSummary(locale, currentUserId);

  if (storedSummary) {
    return storedSummary;
  }

  const summary = await getCachedWeeklyCompetitionRows();
  const weeklyRank = currentUserId ? summary.weeklyRows.find((row) => row.userId === currentUserId)?.rank ?? null : null;
  const totalRank = currentUserId ? summary.totalRows.find((row) => row.userId === currentUserId)?.rank ?? null : null;
  const start = new Date(summary.startIso);
  const end = new Date(summary.endIso);

  return {
    weekKey: summary.weekKey,
    weekLabel: formatWeekRange(start, end, locale),
    publishedAtLabel: new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    }).format(new Date(summary.publishedAtIso)),
    weeklyTop: summary.weeklyRows.slice(0, 3),
    totalTop: summary.totalRows.slice(0, 3),
    currentUserWeeklyRank: weeklyRank,
    currentUserTotalRank: totalRank,
    note: locale === "tr"
      ? "Bu geçici görünüm canlı portföy ve son işlem verileriyle hesaplanmıştır. İlk kalıcı haftalık yayın sonrası arşivli sonuçlar gösterilir."
      : "This temporary view is calculated from live portfolio and recent trade data. Archived results are shown after the first persisted weekly publication.",
  };
}

async function getLatestStoredWeeklyCompetitionSummary(locale: "tr" | "en", currentUserId?: string) {
  const publication = await prisma.weeklyCompetitionPublication.findFirst({
    orderBy: { publishedAt: "desc" },
    include: {
      rows: {
        orderBy: [{ scope: "asc" }, { rank: "asc" }],
      },
    },
  });

  if (!publication) {
    return null;
  }

  const weeklyRows = publication.rows
    .filter((row) => row.scope === "WEEKLY_GAIN")
    .map((row) => ({
      userId: row.userId,
      displayName: row.displayName,
      valueUsd: row.valueUsd,
      returnPercent: row.returnPercent,
      rank: row.rank,
    }));
  const totalRows = publication.rows
    .filter((row) => row.scope === "TOTAL_GAIN")
    .map((row) => ({
      userId: row.userId,
      displayName: row.displayName,
      valueUsd: row.valueUsd,
      returnPercent: row.returnPercent,
      rank: row.rank,
    }));

  return {
    weekKey: publication.periodKey,
    weekLabel: formatWeekRange(publication.startsAt, publication.endsAt, locale),
    publishedAtLabel: new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    }).format(publication.publishedAt),
    weeklyTop: weeklyRows.slice(0, 3),
    totalTop: totalRows.slice(0, 3),
    currentUserWeeklyRank: currentUserId ? weeklyRows.find((row) => row.userId === currentUserId)?.rank ?? null : null,
    currentUserTotalRank: currentUserId ? totalRows.find((row) => row.userId === currentUserId)?.rank ?? null : null,
    note: publication.note,
  };
}
