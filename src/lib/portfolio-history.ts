import { prisma } from "@/lib/prisma";
import type { CompetitionPeriodType } from "@/generated/prisma/enums";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import { getPortfolioSnapshot } from "@/lib/portfolio";

export type PortfolioPeriodKey = "DAILY" | CompetitionPeriodType;

export type PortfolioPerformancePeriod = {
  key: PortfolioPeriodKey;
  label: string;
  change: number | null;
  changeUsd: number | null;
  startValueUsd: number | null;
  endValueUsd: number | null;
  points: number[];
  requestedDays: number;
  observedDays: number | null;
  coveragePercent: number;
  isPartial: boolean;
  source: "history" | "empty";
};

export type PortfolioEquityCaptureSummary = {
  capturedAt: string;
  eligibleUsers: number;
  capturedUsers: number;
  failedUsers: number;
};

export type PortfolioHistoryEntry = {
  capturedAt: Date;
  valueUsd: number;
  periodType: CompetitionPeriodType | undefined;
  source: "snapshot" | "weekly-baseline" | "live-current";
};

type SnapshotHistoryRecord = {
  portfolioValueUsd: number;
  capturedAt: Date;
  period: {
    type: CompetitionPeriodType;
  } | null;
};

type WeeklyBaselineHistoryRecord = {
  portfolioValueUsd: number;
  capturedAt: Date;
};

type PortfolioPeriodConfig = {
  key: PortfolioPeriodKey;
  label: string;
  days: number;
  minimumSpanMs: number;
};

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const equityHistoryPrefix = "equity-hour:";
const fullPeriodCoverageThreshold = 97.5;

const periodConfigs: PortfolioPeriodConfig[] = [
  { key: "DAILY", label: "Günlük", days: 1, minimumSpanMs: 30 * 60 * 1000 },
  { key: "WEEKLY", label: "Haftalık", days: 7, minimumSpanMs: 24 * hourMs },
  { key: "MONTHLY", label: "Aylık", days: 30, minimumSpanMs: 7 * dayMs },
  { key: "QUARTERLY", label: "3 Aylık", days: 90, minimumSpanMs: 21 * dayMs },
  { key: "SEMI_ANNUAL", label: "6 Aylık", days: 180, minimumSpanMs: 45 * dayMs },
  { key: "YEARLY", label: "Yıllık", days: 365, minimumSpanMs: 90 * dayMs },
];

function toValidDate(value: Date) {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toHistoryEntry(
  valueUsd: number,
  capturedAt: Date,
  source: PortfolioHistoryEntry["source"],
  periodType?: CompetitionPeriodType,
) {
  const date = toValidDate(capturedAt);

  if (!date || !Number.isFinite(valueUsd) || valueUsd <= 0) {
    return null;
  }

  return {
    capturedAt: date,
    valueUsd,
    periodType,
    source,
  } satisfies PortfolioHistoryEntry;
}

function dedupeHistory(entries: PortfolioHistoryEntry[]) {
  const ordered = [...entries].sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime());
  const deduped: PortfolioHistoryEntry[] = [];

  for (const entry of ordered) {
    const previous = deduped[deduped.length - 1];

    if (previous && Math.abs(previous.capturedAt.getTime() - entry.capturedAt.getTime()) < 1000 && previous.valueUsd === entry.valueUsd) {
      continue;
    }

    deduped.push(entry);
  }

  return deduped;
}

export function normalizePortfolioHistory(
  snapshots: SnapshotHistoryRecord[],
  weeklyBaselines: WeeklyBaselineHistoryRecord[],
) {
  const snapshotEntries = snapshots
    .map((snapshot) => toHistoryEntry(snapshot.portfolioValueUsd, snapshot.capturedAt, "snapshot", snapshot.period?.type))
    .filter((entry): entry is PortfolioHistoryEntry => Boolean(entry));
  const baselineEntries = weeklyBaselines
    .map((baseline) => toHistoryEntry(baseline.portfolioValueUsd, baseline.capturedAt, "weekly-baseline"))
    .filter((entry): entry is PortfolioHistoryEntry => Boolean(entry));

  return dedupeHistory([...snapshotEntries, ...baselineEntries]);
}

export function calculatePercentChange(startValueUsd: number, endValueUsd: number) {
  if (!Number.isFinite(startValueUsd) || !Number.isFinite(endValueUsd) || startValueUsd <= 0) {
    return null;
  }

  const change = ((endValueUsd - startValueUsd) / startValueUsd) * 100;

  return Number.isFinite(change) ? change : null;
}

export function getPortfolioSeriesForRange(
  history: PortfolioHistoryEntry[],
  rangeDays: number,
  totalValueUsd: number,
  now = new Date(),
  periodKey?: PortfolioPeriodKey,
) {
  if (!Number.isFinite(totalValueUsd) || totalValueUsd <= 0) {
    return [];
  }

  const rangeMs = rangeDays * dayMs;
  const nowTime = now.getTime();
  const cutoffTime = nowTime - rangeMs;
  const oldestUsefulBaseline = cutoffTime - rangeMs;
  const scopedHistory = periodKey && periodKey !== "DAILY"
    ? history.filter((entry) => entry.source === "weekly-baseline" || entry.periodType === periodKey)
    : history;
  const ordered = scopedHistory
    .filter((entry) => {
      const time = entry.capturedAt.getTime();

      return time >= oldestUsefulBaseline && time < nowTime;
    })
    .sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime());
  const baseline = ordered.reduce<PortfolioHistoryEntry | null>((nearest, entry) => {
    if (!nearest) return entry;

    const nearestDistance = Math.abs(nearest.capturedAt.getTime() - cutoffTime);
    const entryDistance = Math.abs(entry.capturedAt.getTime() - cutoffTime);

    return entryDistance < nearestDistance ? entry : nearest;
  }, null);
  const series = baseline
    ? ordered.filter((entry) => entry.capturedAt.getTime() >= baseline.capturedAt.getTime())
    : [];

  if (series.length === 0) {
    return [];
  }

  const currentPoint = {
    capturedAt: now,
    valueUsd: totalValueUsd,
    periodType: undefined,
    source: "live-current" as const,
  };
  const lastPoint = series[series.length - 1];

  if (Math.abs(lastPoint.capturedAt.getTime() - nowTime) < 1000 && lastPoint.valueUsd === totalValueUsd) {
    return series;
  }

  return [...series, currentPoint];
}

export function calculatePortfolioPeriodCoverage(start: Date, end: Date, requestedDays: number) {
  const requestedSpanMs = requestedDays * dayMs;
  const observedSpanMs = Math.max(0, end.getTime() - start.getTime());

  if (!Number.isFinite(requestedSpanMs) || requestedSpanMs <= 0 || observedSpanMs <= 0) {
    return {
      observedDays: null,
      coveragePercent: 0,
      isPartial: true,
    };
  }

  // The score reflects period alignment in both directions: a shorter history is
  // incomplete, while a stale baseline that makes the interval too long is also
  // not presented as an exact full-period return.
  const coveragePercent = Math.min(100, (Math.min(observedSpanMs, requestedSpanMs) / Math.max(observedSpanMs, requestedSpanMs)) * 100);
  const requestedStartTime = end.getTime() - requestedSpanMs;
  const startsAtOrBeforeRequestedPeriod = start.getTime() <= requestedStartTime;

  return {
    observedDays: observedSpanMs / dayMs,
    coveragePercent,
    isPartial: !startsAtOrBeforeRequestedPeriod || coveragePercent < fullPeriodCoverageThreshold,
  };
}

export function buildSparklinePoints(series: PortfolioHistoryEntry[]) {
  const values = series.map((entry) => entry.valueUsd);

  if (values.length <= 12) {
    return values;
  }

  const bucketSize = Math.ceil(values.length / 12);
  const sampled: number[] = [];

  for (let index = 0; index < values.length; index += bucketSize) {
    sampled.push(values[Math.min(index + bucketSize - 1, values.length - 1)]);
  }

  if (sampled[sampled.length - 1] !== values[values.length - 1]) {
    sampled.push(values[values.length - 1]);
  }

  return sampled;
}

function getHourlyEquityPeriodKey(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  const hour = String(value.getUTCHours()).padStart(2, "0");

  return `${equityHistoryPrefix}${year}${month}${day}${hour}`;
}

async function captureHourlyPortfolioValue(userId: string, totalValueUsd: number, capturedAt: Date) {
  if (!Number.isFinite(totalValueUsd) || totalValueUsd <= 0) return false;

  const periodKey = getHourlyEquityPeriodKey(capturedAt);

  try {
    await prisma.weeklyPortfolioBaseline.upsert({
      where: { periodKey_userId: { periodKey, userId } },
      update: {},
      create: { periodKey, userId, portfolioValueUsd: totalValueUsd, capturedAt },
    });

    if (capturedAt.getUTCHours() === 3) {
      await prisma.weeklyPortfolioBaseline.deleteMany({
        where: {
          userId,
          periodKey: { startsWith: equityHistoryPrefix },
          capturedAt: { lt: new Date(capturedAt.getTime() - 400 * dayMs) },
        },
      });
    }

    return true;
  } catch {
    // Performance history must never make the portfolio itself unavailable.
    return false;
  }
}

export async function captureActivePortfolioEquitySnapshots(capturedAt = new Date()): Promise<PortfolioEquityCaptureSummary> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      positions: { select: { symbol: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const symbols = Array.from(new Set(users.flatMap((user) => user.positions.map((position) => position.symbol))));
  const marketItems = await getLiveMarketItemsForSymbols(symbols);
  let capturedUsers = 0;
  let failedUsers = 0;
  const concurrency = 5;

  for (let index = 0; index < users.length; index += concurrency) {
    const batch = users.slice(index, index + concurrency);
    const results = await Promise.allSettled(batch.map(async (user) => {
      const snapshot = await getPortfolioSnapshot(user.id, marketItems);
      const captured = await captureHourlyPortfolioValue(user.id, snapshot.totalValueUsd, capturedAt);

      if (!captured) {
        throw new Error("Portfolio equity snapshot could not be stored.");
      }
    }));

    for (const result of results) {
      if (result.status === "fulfilled") capturedUsers += 1;
      else failedUsers += 1;
    }
  }

  return {
    capturedAt: capturedAt.toISOString(),
    eligibleUsers: users.length,
    capturedUsers,
    failedUsers,
  };
}

export async function getPortfolioPerformancePeriods(userId: string, totalValueUsd: number): Promise<PortfolioPerformancePeriod[]> {
  const now = new Date();
  await captureHourlyPortfolioValue(userId, totalValueUsd, now);
  const [snapshots, weeklyBaselines] = await Promise.all([
    prisma.portfolioSnapshot.findMany({
      where: { userId },
      select: {
        portfolioValueUsd: true,
        capturedAt: true,
        period: {
          select: {
            type: true,
          },
        },
      },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.weeklyPortfolioBaseline.findMany({
      where: { userId },
      select: {
        portfolioValueUsd: true,
        capturedAt: true,
      },
      orderBy: { capturedAt: "asc" },
    }),
  ]);
  const history = normalizePortfolioHistory(snapshots, weeklyBaselines);

  return periodConfigs.map((period) => {
    const series = getPortfolioSeriesForRange(history, period.days, totalValueUsd, now, period.key);
    const firstPoint = series[0];
    const lastPoint = series[series.length - 1];
    const hasEnoughHistory = firstPoint && lastPoint && lastPoint.capturedAt.getTime() - firstPoint.capturedAt.getTime() >= period.minimumSpanMs;
    const change = hasEnoughHistory && firstPoint && lastPoint && series.length >= 2
      ? calculatePercentChange(firstPoint.valueUsd, lastPoint.valueUsd)
      : null;
    const changeUsd = change === null || !firstPoint || !lastPoint
      ? null
      : lastPoint.valueUsd - firstPoint.valueUsd;
    const points = change === null ? [] : buildSparklinePoints(series);
    const coverage = firstPoint && lastPoint
      ? calculatePortfolioPeriodCoverage(firstPoint.capturedAt, lastPoint.capturedAt, period.days)
      : { observedDays: null, coveragePercent: 0, isPartial: true };

    return {
      key: period.key,
      label: period.label,
      change,
      changeUsd,
      startValueUsd: change === null ? null : firstPoint?.valueUsd ?? null,
      endValueUsd: change === null ? null : lastPoint?.valueUsd ?? null,
      points,
      requestedDays: period.days,
      observedDays: coverage.observedDays,
      coveragePercent: coverage.coveragePercent,
      isPartial: coverage.isPartial,
      source: change === null ? "empty" : "history",
    };
  });
}
