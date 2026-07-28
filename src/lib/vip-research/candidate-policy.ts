import type { VipResearchCandidate } from "@/lib/vip-research/types";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const MAX_TECHNICAL_AGE_MS = 36 * 60 * 60 * 1000;
const MAX_FUNDAMENTAL_AGE_MS = 550 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

function hasAcceptableTimestamp(value: string | null, maximumAgeMs: number, now = new Date()) {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  const age = now.getTime() - timestamp;

  return Number.isFinite(timestamp) && age >= -MAX_FUTURE_SKEW_MS && age <= maximumAgeMs;
}

export function hasFreshVipTechnicalSnapshot(
  candidate: Pick<VipResearchCandidate, "technical">,
  now = new Date(),
) {
  return hasAcceptableTimestamp(candidate.technical.asOf, MAX_TECHNICAL_AGE_MS, now);
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
    hasAcceptableTimestamp(item.periodEnd, MAX_FUNDAMENTAL_AGE_MS) &&
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

export function getDeterministicVipScorecard(candidate: VipResearchCandidate) {
  const technical = candidate.technical;
  const atrAmount = technical.lastPrice * technical.atr14Pct / 100;
  const effectiveAtr = Math.max(atrAmount, technical.lastPrice * 0.005);
  const entryLow = Math.max(technical.support, technical.lastPrice - effectiveAtr * 0.65);
  const entryHigh = Math.max(entryLow, technical.lastPrice + effectiveAtr * 0.2);
  const stopLoss = Math.min(
    entryLow - effectiveAtr * 0.25,
    Math.max(entryLow - effectiveAtr * 1.2, technical.support * 0.97),
  );
  const minimumTarget = entryHigh + Math.max(entryLow - stopLoss, effectiveAtr) * 2;
  const targetPrice = Math.max(technical.resistance, minimumTarget);
  const confidenceScore = clamp(Math.round(candidate.quantitativeScore * 0.72), 1, 100);
  const riskScore = clamp(
    Math.round(100 - candidate.quantitativeScore * 0.55 + technical.atr14Pct * 2),
    1,
    100,
  );

  return {
    confidenceScore,
    riskScore,
    entryLow: round(entryLow),
    entryHigh: round(entryHigh),
    stopLoss: round(stopLoss),
    targetPrice: round(targetPrice),
    secondaryTargetPrice: round(targetPrice + (targetPrice - stopLoss) * 0.5),
  };
}
