import type { VipAgentStrategy } from "@/lib/vip-agents/config";

export const VIP_AGENT_PERIODS = [
  { key: "daily", labelTr: "Günlük", labelEn: "Daily", days: 1 },
  { key: "weekly", labelTr: "Haftalık", labelEn: "Weekly", days: 7 },
  { key: "monthly", labelTr: "Aylık", labelEn: "Monthly", days: 30 },
  { key: "threeMonth", labelTr: "3 Aylık", labelEn: "3 Months", days: 90 },
  { key: "sixMonth", labelTr: "6 Aylık", labelEn: "6 Months", days: 180 },
  { key: "yearly", labelTr: "Yıllık", labelEn: "Yearly", days: 365 },
] as const;

export const VIP_AGENT_TRADE_PAGE_SIZE = 250;
export const VIP_AGENT_DECISION_PAGE_SIZE = 80;

type Snapshot = {
  performanceEquityUsd: number;
  capturedAt: Date;
};

type BuyIdea = {
  stance: string;
  confidenceScore: number;
  riskScore: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
};

type PositionExitInput = {
  price: number;
  stopLossUsd: number;
  targetPriceUsd: number;
  currentStance?: string | null;
};

type TradePnlInput = {
  side: string;
  positionCycleId: string;
  realizedPnlUsd?: number | null;
  realizedPnlPercent?: number | null;
};

type OpenPositionPnlInput = {
  positionCycleId: string;
  quantity: number;
  averagePriceUsd: number;
  lastPriceUsd: number;
};

type ClosingTradePnlInput = {
  positionCycleId: string;
  realizedPnlUsd: number | null;
  realizedPnlPercent: number | null;
};

type SplitAdjustablePosition = {
  quantity: number;
  averagePriceUsd: number;
  lastPriceUsd: number;
  stopLossUsd: number;
  targetPriceUsd: number;
  secondaryTarget: number | null;
  appliedSplitFactor: number;
};

export type VipAgentTradePnl = {
  pnlUsd: number | null;
  pnlPercent: number | null;
  pnlState: "OPEN" | "CLOSED" | "UNKNOWN";
};

export function calculateVipAgentPeriods(
  snapshots: Snapshot[],
  performanceBaseUsd: number,
  createdAt: Date,
  now = new Date(),
) {
  const ordered = [...snapshots].sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime());
  const current = ordered.at(-1);
  const currentEquity = current?.performanceEquityUsd ?? performanceBaseUsd;

  return VIP_AGENT_PERIODS.map((period) => {
    const cutoff = new Date(now.getTime() - period.days * 86_400_000);
    const eligible = ordered.filter((snapshot) => snapshot.capturedAt <= cutoff);
    const baseline = eligible.at(-1);
    const baselineEquity = baseline?.performanceEquityUsd ?? performanceBaseUsd;
    const pnlUsd = Number((currentEquity - baselineEquity).toFixed(2));
    return {
      ...period,
      pnlUsd,
      returnPercent: Number(((pnlUsd / performanceBaseUsd) * 100).toFixed(4)),
      isPartial: !baseline && createdAt > cutoff,
      baselineAt: baseline?.capturedAt ?? createdAt,
    };
  });
}

export function calculateVipAgentAccount(input: {
  cashUsd: number;
  positionsValueUsd: number;
  reserveUsd: number;
  performanceBaseUsd: number;
}) {
  const totalBalanceUsd = Number((input.cashUsd + input.positionsValueUsd).toFixed(2));
  const performanceEquityUsd = Number((totalBalanceUsd - input.reserveUsd).toFixed(2));
  const pnlUsd = Number((performanceEquityUsd - input.performanceBaseUsd).toFixed(2));
  const returnPercent = input.performanceBaseUsd > 0
    ? Number(((pnlUsd / input.performanceBaseUsd) * 100).toFixed(4))
    : 0;

  return { totalBalanceUsd, performanceEquityUsd, pnlUsd, returnPercent };
}

export function calculateVipAgentSplitAdjustment(
  position: SplitAdjustablePosition,
  cumulativeSplitFactor: number,
) {
  if (
    !Number.isFinite(cumulativeSplitFactor) ||
    cumulativeSplitFactor <= 0 ||
    !Number.isFinite(position.appliedSplitFactor) ||
    position.appliedSplitFactor <= 0
  ) {
    return null;
  }

  const adjustmentFactor = cumulativeSplitFactor / position.appliedSplitFactor;
  if (!Number.isFinite(adjustmentFactor) || adjustmentFactor <= 0) return null;
  const round = (value: number) => Number(value.toFixed(8));

  return {
    adjustmentFactor,
    hasAdjustment: Math.abs(adjustmentFactor - 1) > 1e-10,
    appliedSplitFactor: cumulativeSplitFactor,
    quantity: round(position.quantity * adjustmentFactor),
    averagePriceUsd: round(position.averagePriceUsd / adjustmentFactor),
    lastPriceUsd: round(position.lastPriceUsd / adjustmentFactor),
    stopLossUsd: round(position.stopLossUsd / adjustmentFactor),
    targetPriceUsd: round(position.targetPriceUsd / adjustmentFactor),
    secondaryTarget: position.secondaryTarget === null
      ? null
      : round(position.secondaryTarget / adjustmentFactor),
  };
}

export function shouldReuseVipAgentDailyRun(hasSnapshot: boolean, force: boolean) {
  return hasSnapshot && !force;
}

export function isVipAgentTerminalDailyAction(action: string) {
  return action === "BUY" || action === "SELL";
}

export function getVipAgentPortfolioDecision(input: {
  hasReport: boolean;
  ideaCount: number;
  tradeCount: number;
}) {
  if (!input.hasReport) {
    return {
      action: "HOLD",
      reason: "Henüz VIP sabah raporu bulunmadığı için nakitte bekleniyor.",
    };
  }

  return {
    action: "SUMMARY",
    reason: input.tradeCount > 0
      ? `${input.ideaCount} VIP fikri değerlendirildi; ${input.tradeCount} sanal işlem kaydedildi.`
      : `${input.ideaCount} VIP fikri değerlendirildi; yeni işlem koşulu oluşmadığı için nakit/portföy korunuyor.`,
  };
}

export function getVipAgentBuyIneligibilityReason(strategy: VipAgentStrategy, idea: BuyIdea, price: number) {
  if (idea.stance !== "AL") return `VIP notu ${idea.stance}; yalnızca AL fikirleri işleme açılır.`;
  if (idea.confidenceScore < strategy.minimumConfidence) return `Güven ${idea.confidenceScore}/100; ajan eşiği ${strategy.minimumConfidence}.`;
  if (idea.riskScore > strategy.maximumRisk) return `Risk ${idea.riskScore}/100; ajan tavanı ${strategy.maximumRisk}.`;
  const tolerance = strategy.entryTolerancePercent / 100;
  if (price < idea.entryLow * (1 - tolerance) || price > idea.entryHigh * (1 + tolerance)) {
    return `Fiyat $${price.toFixed(2)}, izin verilen giriş bandının dışında.`;
  }
  if (price <= idea.stopLoss) return "Fiyat VIP stop seviyesinde veya altında; yeni pozisyon açılmaz.";
  return null;
}

export function getVipAgentPositionExitReason(input: PositionExitInput) {
  if (input.price <= input.stopLossUsd) {
    return `Stop çalıştı: $${input.price.toFixed(2)} ≤ $${input.stopLossUsd.toFixed(2)}.`;
  }
  if (input.price >= input.targetPriceUsd) {
    return `Birincil hedef gerçekleşti: $${input.price.toFixed(2)} ≥ $${input.targetPriceUsd.toFixed(2)}.`;
  }
  if (input.currentStance === "UZAK_DUR") return "Güncel VIP raporu UZAK DUR notuna geçti.";
  return null;
}

export function calculateVipAgentTradePnl(
  trade: TradePnlInput,
  openPosition?: OpenPositionPnlInput,
  closingTrade?: ClosingTradePnlInput,
): VipAgentTradePnl {
  if (trade.side === "SELL") {
    return typeof trade.realizedPnlUsd === "number" && typeof trade.realizedPnlPercent === "number"
      ? { pnlUsd: trade.realizedPnlUsd, pnlPercent: trade.realizedPnlPercent, pnlState: "CLOSED" }
      : { pnlUsd: null, pnlPercent: null, pnlState: "UNKNOWN" };
  }

  if (closingTrade?.positionCycleId === trade.positionCycleId) {
    return typeof closingTrade.realizedPnlUsd === "number" && typeof closingTrade.realizedPnlPercent === "number"
      ? { pnlUsd: closingTrade.realizedPnlUsd, pnlPercent: closingTrade.realizedPnlPercent, pnlState: "CLOSED" }
      : { pnlUsd: null, pnlPercent: null, pnlState: "UNKNOWN" };
  }

  if (openPosition?.positionCycleId === trade.positionCycleId) {
    const costBasisUsd = openPosition.quantity * openPosition.averagePriceUsd;
    const pnlUsd = Number(((openPosition.lastPriceUsd - openPosition.averagePriceUsd) * openPosition.quantity).toFixed(2));
    return {
      pnlUsd,
      pnlPercent: costBasisUsd > 0 ? Number(((pnlUsd / costBasisUsd) * 100).toFixed(4)) : 0,
      pnlState: "OPEN",
    };
  }

  return { pnlUsd: null, pnlPercent: null, pnlState: "UNKNOWN" };
}

export function getVipAgentHistoryPagination(requestedPage: unknown, totalItems: number, pageSize: number) {
  const rawValue = Array.isArray(requestedPage) ? requestedPage[0] : requestedPage;
  const normalizedValue = typeof rawValue === "number" ? String(rawValue) : rawValue;
  const parsed = typeof normalizedValue === "string" && /^\d+$/.test(normalizedValue)
    ? Number(normalizedValue)
    : 1;
  const safeTotalItems = Number.isSafeInteger(totalItems) && totalItems > 0 ? totalItems : 0;
  const safePageSize = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 1;
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize));
  const requested = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
  const page = Math.min(requested, totalPages);
  const skip = (page - 1) * safePageSize;
  const firstItem = safeTotalItems === 0 ? 0 : skip + 1;
  const lastItem = Math.min(skip + safePageSize, safeTotalItems);

  return {
    page,
    pageSize: safePageSize,
    totalItems: safeTotalItems,
    totalPages,
    skip,
    firstItem,
    lastItem,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}
