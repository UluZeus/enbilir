import { prisma } from "@/lib/prisma";
import type { CompetitionPeriodType } from "@/generated/prisma/enums";

export type PortfolioPeriodKey = "DAILY" | CompetitionPeriodType;

export type PortfolioPerformancePeriod = {
  key: PortfolioPeriodKey;
  label: string;
  change: number | null;
  points: number[];
  source: "history" | "empty";
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
  const ordered = scopedHistory.filter((entry) => entry.capturedAt.getTime() <= nowTime);
  const beforeCutoff = ordered
    .filter((entry) => {
      const time = entry.capturedAt.getTime();

      return time <= cutoffTime && time >= oldestUsefulBaseline;
    })
    .at(-1);
  const insideRange = ordered.filter((entry) => {
    const time = entry.capturedAt.getTime();

    return time > cutoffTime && time < nowTime;
  });
  const series = beforeCutoff ? [beforeCutoff, ...insideRange] : insideRange;

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

export async function getPortfolioPerformancePeriods(userId: string, totalValueUsd: number): Promise<PortfolioPerformancePeriod[]> {
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
  const now = new Date();

  return periodConfigs.map((period) => {
    const series = getPortfolioSeriesForRange(history, period.days, totalValueUsd, now, period.key);
    const firstPoint = series[0];
    const lastPoint = series[series.length - 1];
    const hasEnoughHistory = firstPoint && lastPoint && lastPoint.capturedAt.getTime() - firstPoint.capturedAt.getTime() >= period.minimumSpanMs;
    const change = hasEnoughHistory && firstPoint && lastPoint && series.length >= 2
      ? calculatePercentChange(firstPoint.valueUsd, lastPoint.valueUsd)
      : null;
    const points = change === null ? [] : buildSparklinePoints(series);

    return {
      key: period.key,
      label: period.label,
      change,
      points,
      source: change === null ? "empty" : "history",
    };
  });
}
