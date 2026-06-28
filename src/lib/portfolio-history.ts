import { getPeriodLeaderboard, type PeriodLeaderboardRow } from "@/lib/competition-periods";
import { calculateCompetitionReturnPercent } from "@/lib/portfolio";
import type { CompetitionPeriodType } from "@/generated/prisma/enums";

export type PortfolioPeriodKey = "DAILY" | CompetitionPeriodType;

export type PortfolioPerformancePeriod = {
  key: PortfolioPeriodKey;
  label: string;
  change: number | null;
  points: number[];
  source: "snapshot" | "live" | "modeled";
};

const periodLabels: Record<PortfolioPeriodKey, string> = {
  DAILY: "Günlük",
  WEEKLY: "Haftalık",
  MONTHLY: "Aylık",
  QUARTERLY: "3 Aylık",
  SEMI_ANNUAL: "6 Aylık",
  YEARLY: "Yıllık",
};

const competitionKeys: CompetitionPeriodType[] = ["WEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "YEARLY"];

function clampPoint(value: number) {
  return Math.max(8, Math.min(92, value));
}

function createPoints(change: number, key: PortfolioPeriodKey) {
  const endPoint = clampPoint(50 + Math.max(Math.min(change, 40), -40));

  if (key === "DAILY") {
    // Intraday portfolio snapshots are not stored yet. This is a conservative modeled path
    // from an estimated day-start value to the current value, not tick-by-tick live data.
    return [50, clampPoint(50 + change * 0.1), clampPoint(50 + change * 0.24), clampPoint(50 + change * 0.38), clampPoint(50 + change * 0.66), endPoint];
  }

  return [
    50,
    clampPoint(48 + change * 0.12),
    clampPoint(51 + change * 0.18),
    clampPoint(49 + change * 0.28),
    clampPoint(52 + change * 0.44),
    endPoint,
  ];
}

function calculateReturnPercent(currentValue: number) {
  if (!Number.isFinite(currentValue)) {
    return null;
  }

  return calculateCompetitionReturnPercent(currentValue);
}

function getModeledChange(totalValueUsd: number) {
  return calculateReturnPercent(totalValueUsd);
}

function getSnapshotChange(row: PeriodLeaderboardRow | undefined, totalValueUsd: number) {
  if (!row) {
    return getModeledChange(totalValueUsd);
  }

  return row.source === "snapshot" ? calculateReturnPercent(row.portfolioValueUsd) : getModeledChange(totalValueUsd);
}

export async function getPortfolioPerformancePeriods(userId: string, totalValueUsd: number): Promise<PortfolioPerformancePeriod[]> {
  const leaderboards = await Promise.all(competitionKeys.map((key) => getPeriodLeaderboard(key, "snapshot")));
  const rowsByKey = new Map<CompetitionPeriodType, PeriodLeaderboardRow | undefined>(
    leaderboards.map((leaderboard, index) => [competitionKeys[index], leaderboard.rows.find((row) => row.userId === userId)]),
  );

  const dailyChange = getModeledChange(totalValueUsd);
  const daily: PortfolioPerformancePeriod = {
    key: "DAILY",
    label: periodLabels.DAILY,
    change: dailyChange,
    points: createPoints(dailyChange ?? 0, "DAILY"),
    source: "modeled",
  };

  return [
    daily,
    ...competitionKeys.map((key) => {
      const row = rowsByKey.get(key);
      const change = getSnapshotChange(row, totalValueUsd);

      return {
        key,
        label: periodLabels[key],
        change,
        points: createPoints(change ?? 0, key),
        source: row?.source === "snapshot" ? "snapshot" as const : "modeled" as const,
      };
    }),
  ];
}
