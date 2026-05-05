import { getCompetitionRankingsForUser } from "@/lib/competition-periods";
import { initialCashUsd } from "@/lib/portfolio";

const periodMultipliers = [
  { label: "Haftalık", multiplier: 0.22 },
  { label: "Aylık", multiplier: 0.45 },
  { label: "3 Aylık", multiplier: 0.72 },
  { label: "6 Aylık", multiplier: 0.86 },
  { label: "Yıllık", multiplier: 1 },
];

export async function getUserRankingPeriods(userId: string) {
  return getCompetitionRankingsForUser(userId);
}

export function getPortfolioChartPeriods(totalValueUsd: number) {
  const performancePercent = ((totalValueUsd - initialCashUsd) / initialCashUsd) * 100;

  return periodMultipliers.map((period) => {
    const change = performancePercent * period.multiplier;
    const endPoint = 50 + Math.max(Math.min(change, 40), -40);

    return {
      label: period.label,
      change,
      points: [50, 48 + change * 0.12, 51 + change * 0.18, 49 + change * 0.28, 52 + change * 0.44, endPoint],
    };
  });
}
