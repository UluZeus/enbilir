import { prisma } from "@/lib/prisma";

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

function formatWeekRange(start: Date, end: Date, locale: "tr" | "en") {
  const formatter = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Istanbul",
  });
  const inclusiveEnd = new Date(end.getTime() - dayMs);

  return `${formatter.format(start)} - ${formatter.format(inclusiveEnd)}`;
}

export async function getWeeklyCompetitionSummary(locale: "tr" | "en", currentUserId?: string) {
  const storedSummary = await getLatestStoredWeeklyCompetitionSummary(locale, currentUserId);

  if (storedSummary) {
    return storedSummary;
  }

  const window = getPublishedWeekWindow();

  return {
    weekKey: window.key,
    weekLabel: formatWeekRange(window.start, window.end, locale),
    publishedAtLabel: new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    }).format(window.publishedAt),
    weeklyTop: [],
    totalTop: [],
    currentUserWeeklyRank: null,
    currentUserTotalRank: null,
    note: locale === "tr"
      ? "Doğrulanmış ve değiştirilemez haftalık yayın henüz oluşmadı. Geçici veya fallback fiyatlarla sıralama gösterilmez."
      : "A verified, immutable weekly publication is not available yet. Rankings are never shown from temporary or fallback prices.",
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
