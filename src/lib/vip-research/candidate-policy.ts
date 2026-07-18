import type { VipResearchCandidate } from "@/lib/vip-research/types";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function scoreVipCorporateFundamentals(candidate: VipResearchCandidate) {
  const snapshot = candidate.fundamental;

  if (candidate.assetClass !== "EQUITY" || !snapshot) {
    return 0;
  }

  let score = 35;
  const fcfGrowth = snapshot.freeCashFlowGrowthPct;
  const revenueGrowth = snapshot.revenueGrowthPct;
  const marginExpansion = snapshot.netMarginExpansionBps;
  const debtToAssets = snapshot.debtToAssetsPct;

  score += fcfGrowth !== null ? clamp(fcfGrowth / 3, -18, 22) : -20;
  score += revenueGrowth !== null ? clamp(revenueGrowth / 2, -10, 14) : -10;
  score += marginExpansion !== null ? clamp(marginExpansion / 50, -12, 14) : -10;
  score += debtToAssets !== null ? debtToAssets <= 25 ? 15 : debtToAssets <= 45 ? 7 : debtToAssets >= 70 ? -15 : 0 : -10;

  if (snapshot.freeCashFlow !== null && snapshot.freeCashFlow <= 0) score -= 25;
  if (snapshot.netMarginPct !== null && snapshot.netMarginPct <= 0) score -= 22;
  if (snapshot.netMarginExpansionBps !== null && snapshot.netMarginExpansionBps <= -500) score -= 12;
  if (snapshot.debtToFreeCashFlow !== null && snapshot.debtToFreeCashFlow > 10) score -= 12;

  return clamp(score, 0, 100);
}

export function hasRequiredVipResearchInputs(candidate: VipResearchCandidate) {
  if (candidate.assetClass !== "EQUITY") {
    return candidate.fundamentalFramework === "MACRO_MARKET_STRUCTURE";
  }

  const item = candidate.fundamental;

  return Boolean(
    candidate.fundamentalFramework === "CORPORATE_FINANCIALS" &&
    item &&
    item.freeCashFlow !== null &&
    item.freeCashFlowGrowthPct !== null &&
    item.totalDebt !== null &&
    item.debtToAssetsPct !== null &&
    item.netMarginPct !== null &&
    item.netMarginExpansionBps !== null,
  );
}

export function hasVipFundamentalVeto(candidate: VipResearchCandidate) {
  if (candidate.assetClass !== "EQUITY") {
    return false;
  }

  const fundamental = candidate.fundamental;

  return !fundamental ||
    (fundamental.freeCashFlow ?? 0) <= 0 ||
    (fundamental.netMarginPct ?? 0) <= 0 ||
    (fundamental.netMarginExpansionBps ?? 0) <= -500 ||
    (fundamental.debtToFreeCashFlow ?? 0) > 10;
}

export function calculateVipQuantitativeScore(candidate: VipResearchCandidate) {
  const institutionalAdjustment = candidate.institutional?.perception === "POSITIVE"
    ? 5
    : candidate.institutional?.perception === "NEGATIVE"
      ? -5
      : 0;
  const shortAdjustment = (candidate.shortInterest?.daysToCover ?? 0) >= 6 ? -6 : 0;
  const crowdingPenalty = Math.max(0, candidate.technical.crowdingScore - 30) * 0.35;
  const rawScore = candidate.assetClass === "EQUITY"
    ? candidate.technical.technicalScore * 0.52 + scoreVipCorporateFundamentals(candidate) * 0.48 + institutionalAdjustment + shortAdjustment - crowdingPenalty
    : candidate.technical.technicalScore * 0.82 + 18 - crowdingPenalty;

  return Math.round(clamp(rawScore, 0, 100) * 10) / 10;
}

export function calculateVipAsymmetryRank(
  candidate: Pick<VipResearchCandidate, "quantitativeScore">,
  idea: { confidenceScore: number; riskScore: number; stance: string },
) {
  const stanceAdjustment = idea.stance === "AL" ? 8 : idea.stance === "TUT" ? 2 : idea.stance === "IZLE" ? 0 : -18;

  return candidate.quantitativeScore * 0.6 +
    clamp(idea.confidenceScore, 1, 100) * 0.22 +
    (100 - clamp(idea.riskScore, 1, 100)) * 0.18 +
    stanceAdjustment;
}
