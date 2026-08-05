import "server-only";

import { randomUUID } from "node:crypto";
import {
  fetchYahooCorporateActionQuote,
  getYahooCumulativeSplitFactor,
} from "@/lib/ai-market/yahoo-corporate-actions";
import {
  getLiveMarketItemsForAssets,
  type LiveMarketAssetRequest,
} from "@/lib/live-market";
import { isExecutableMarketQuote } from "@/lib/executable-quote";
import { prisma } from "@/lib/prisma";
import {
  areVipAgentCorporateActionsReliable,
  areVipAgentOpenPositionPricesReliable,
  getVipAgentBuyIneligibilityReason,
  getVipAgentPortfolioDecision,
  getVipAgentPositionExitReason,
  isVipAgentTerminalDailyAction,
} from "@/lib/vip-agents/calculations";
import {
  VIP_AGENT_PERFORMANCE_BASE_USD,
  VIP_AGENT_RESERVE_USD,
  VIP_AGENT_STARTING_BALANCE_USD,
  VIP_AGENT_STRATEGIES,
  type VipAgentStrategy,
} from "@/lib/vip-agents/config";
import type { DecimalValue } from "@/lib/decimal";
import { decimal, decimalToNumber, nullableDecimalToNumber, roundDecimal } from "@/lib/decimal";

type PriceResult = {
  price: number | null;
  asOf: Date | null;
  availability: "EXECUTABLE" | "SESSION_UNAVAILABLE" | "UNAVAILABLE";
  error?: string;
};

const expectedNonExecutableMarketStates = new Set([
  "CLOSED",
  "PRE",
  "PREPRE",
  "POST",
  "POSTPOST",
  "PRE_MARKET",
  "POST_MARKET",
  "SESSION_CLOSED",
  "SESSION_UNAVAILABLE",
]);

function roundMoneyDecimal(value: DecimalValue) {
  return roundDecimal(value, 2);
}

function roundQuantityDecimal(value: DecimalValue) {
  return decimal(value).times(10_000).floor().div(10_000);
}

function decimalMin(left: ReturnType<typeof decimal>, right: ReturnType<typeof decimal>) {
  return left.lessThanOrEqualTo(right) ? left : right;
}

function decimalMax(left: ReturnType<typeof decimal>, right: ReturnType<typeof decimal>) {
  return left.greaterThanOrEqualTo(right) ? left : right;
}

export function calculateVipAgentAccountDecimal(input: {
  cashUsd: DecimalValue;
  positionsValueUsd: DecimalValue;
  reserveUsd: DecimalValue;
  performanceBaseUsd: DecimalValue;
}) {
  const totalBalanceUsd = roundMoneyDecimal(decimal(input.cashUsd).plus(input.positionsValueUsd));
  const performanceEquityUsd = roundMoneyDecimal(totalBalanceUsd.minus(input.reserveUsd));
  const pnlUsd = roundMoneyDecimal(performanceEquityUsd.minus(input.performanceBaseUsd));
  const performanceBaseUsd = decimal(input.performanceBaseUsd);
  const returnPercent = performanceBaseUsd.greaterThan(0)
    ? roundDecimal(pnlUsd.div(performanceBaseUsd).times(100), 4)
    : decimal(0);

  return { totalBalanceUsd, performanceEquityUsd, pnlUsd, returnPercent };
}

export function calculateVipAgentSellAccountingDecimal(input: {
  quantity: DecimalValue;
  priceUsd: DecimalValue;
  averagePriceUsd: DecimalValue;
  cashUsd: DecimalValue;
}) {
  const grossUsd = roundMoneyDecimal(decimal(input.quantity).times(input.priceUsd));
  const costBasisUsd = roundMoneyDecimal(decimal(input.quantity).times(input.averagePriceUsd));
  const realizedPnlUsd = roundMoneyDecimal(grossUsd.minus(costBasisUsd));
  const realizedPnlPercent = costBasisUsd.greaterThan(0)
    ? roundDecimal(realizedPnlUsd.div(costBasisUsd).times(100), 4)
    : decimal(0);
  const cashAfterUsd = roundMoneyDecimal(decimal(input.cashUsd).plus(grossUsd));

  return { grossUsd, costBasisUsd, realizedPnlUsd, realizedPnlPercent, cashAfterUsd };
}

function calculateVipAgentSplitAdjustmentDecimal(
  position: {
    quantity: DecimalValue;
    averagePriceUsd: DecimalValue;
    lastPriceUsd: DecimalValue;
    stopLossUsd: DecimalValue;
    targetPriceUsd: DecimalValue;
    secondaryTarget: DecimalValue | null;
    appliedSplitFactor: DecimalValue;
  },
  cumulativeSplitFactor: number,
) {
  if (!Number.isFinite(cumulativeSplitFactor) || cumulativeSplitFactor <= 0) return null;
  const appliedSplitFactor = decimal(position.appliedSplitFactor);
  if (!appliedSplitFactor.isFinite() || appliedSplitFactor.lessThanOrEqualTo(0)) return null;
  const cumulativeFactor = decimal(String(cumulativeSplitFactor));
  const adjustmentFactor = cumulativeFactor.div(appliedSplitFactor);
  if (!adjustmentFactor.isFinite() || adjustmentFactor.lessThanOrEqualTo(0)) return null;

  return {
    quantity: roundDecimal(decimal(position.quantity).times(adjustmentFactor), 8),
    averagePriceUsd: roundDecimal(decimal(position.averagePriceUsd).div(adjustmentFactor), 8),
    lastPriceUsd: roundDecimal(decimal(position.lastPriceUsd).div(adjustmentFactor), 8),
    stopLossUsd: roundDecimal(decimal(position.stopLossUsd).div(adjustmentFactor), 8),
    targetPriceUsd: roundDecimal(decimal(position.targetPriceUsd).div(adjustmentFactor), 8),
    secondaryTarget: position.secondaryTarget === null
      ? null
      : roundDecimal(decimal(position.secondaryTarget).div(adjustmentFactor), 8),
    appliedSplitFactor: cumulativeFactor,
  };
}

export function getIstanbulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function ensureVipTradingAgents() {
  for (const strategy of VIP_AGENT_STRATEGIES) {
    await prisma.vipTradingAgent.upsert({
      where: { id: strategy.id },
      create: {
        id: strategy.id,
        slug: strategy.slug,
        name: strategy.name,
        riskProfile: strategy.riskProfile,
        description: strategy.description,
        startingBalanceUsd: VIP_AGENT_STARTING_BALANCE_USD,
        performanceBaseUsd: VIP_AGENT_PERFORMANCE_BASE_USD,
        reserveUsd: VIP_AGENT_RESERVE_USD,
        cashUsd: VIP_AGENT_STARTING_BALANCE_USD,
      },
      update: {
        name: strategy.name,
        riskProfile: strategy.riskProfile,
        description: strategy.description,
        isActive: true,
      },
    });
  }
}

function getPriceUnavailableResult(marketItem: Awaited<ReturnType<typeof getLiveMarketItemsForAssets>>[number] | undefined): PriceResult {
  const marketState = String(marketItem?.marketState ?? "UNAVAILABLE").toUpperCase();
  const isExpectedSessionState =
    Boolean(marketItem) &&
    marketItem!.source !== "fallback" &&
    marketItem!.source !== "representative" &&
    expectedNonExecutableMarketStates.has(marketState);

  if (isExpectedSessionState) {
    return {
      price: null,
      asOf: marketItem?.sourceAsOf ? new Date(marketItem.sourceAsOf) : null,
      availability: "SESSION_UNAVAILABLE",
      error: "Piyasa seansı kapalı veya açılış öncesi; güncel işlem fiyatı yok.",
    };
  }

  return {
    price: null,
    asOf: marketItem?.sourceAsOf ? new Date(marketItem.sourceAsOf) : null,
    availability: "UNAVAILABLE",
    error: marketItem
      ? "Güncel fiyat işlem için uygun değil; sağlayıcı tazelik veya seans doğrulaması başarısız."
      : "Sağlayıcı eşlemesi veya güncel fiyat alınamadı.",
  };
}

export function getVipAgentNoQuoteDecision(priceResult: Pick<PriceResult, "availability" | "error">) {
  return priceResult.availability === "SESSION_UNAVAILABLE"
    ? { action: "SKIP" as const, reason: priceResult.error ?? "Piyasa seansı işlem için uygun değil." }
    : { action: "ERROR" as const, reason: priceResult.error ?? "Güncel ve doğrulanmış fiyat alınamadı." };
}

async function fetchPriceMap(items: LiveMarketAssetRequest[]) {
  const unique = Array.from(new Map(items.map((item) => [item.symbol.toUpperCase(), item])).values());
  const marketItems = await getLiveMarketItemsForAssets(unique);
  const marketItemBySymbol = new Map(marketItems.map((item) => [item.symbol, item]));

  return new Map(unique.map((item) => {
    const marketItem = marketItemBySymbol.get(item.symbol);
    const result: PriceResult = marketItem && isExecutableMarketQuote(marketItem)
      ? { price: marketItem.priceUsd, asOf: new Date(marketItem.sourceAsOf!), availability: "EXECUTABLE" }
      : getPriceUnavailableResult(marketItem);
    return [item.symbol, result] as const;
  }));
}

function buildVipAgentPriceRequests(
  ideas: Array<{ symbol: string; providerSymbol: string; assetClass: string }>,
  positions: Array<{ symbol: string; providerSymbol: string; assetClass?: string }>,
) {
  const requests = new Map<string, LiveMarketAssetRequest>();

  for (const item of [...ideas, ...positions]) {
    const symbol = item.symbol.trim();
    const providerSymbol = item.providerSymbol.trim();
    if (!symbol || !providerSymbol || requests.has(symbol.toUpperCase())) continue;
    requests.set(symbol.toUpperCase(), {
      symbol,
      providerSymbol,
      assetClass: item.assetClass,
    });
  }

  return Array.from(requests.values());
}

function positionValueDecimal(
  position: { symbol: string; quantity: DecimalValue; lastPriceUsd: DecimalValue },
  prices: Map<string, PriceResult>,
) {
  const livePrice = prices.get(position.symbol)?.price;
  const price = livePrice === null || livePrice === undefined
    ? decimal(position.lastPriceUsd)
    : decimal(String(livePrice));
  return decimal(position.quantity).times(price);
}

function portfolioValueDecimal(
  cashUsd: DecimalValue,
  positions: Array<{ symbol: string; quantity: DecimalValue; lastPriceUsd: DecimalValue }>,
  prices: Map<string, PriceResult>,
) {
  return positions.reduce(
    (sum, position) => sum.plus(positionValueDecimal(position, prices)),
    decimal(cashUsd),
  );
}

async function runAgent(
  strategy: VipAgentStrategy,
  now: Date,
  report: NonNullable<Awaited<ReturnType<typeof getReportForRun>>>,
) {
  const runKey = getIstanbulDateKey(now);
  const leaseExpiresBefore = new Date(now.getTime() - 15 * 60 * 1000);
  const storedAgent = await prisma.vipTradingAgent.findUniqueOrThrow({
    where: { id: strategy.id },
    include: { positions: true },
  });
  const claimed = await prisma.vipTradingAgent.updateMany({
    where: {
      id: storedAgent.id,
      updatedAt: storedAgent.updatedAt,
      OR: [
        { lastRunAt: null },
        { lastRunAt: { lt: leaseExpiresBefore } },
      ],
    },
    data: { lastRunAt: now },
  });
  if (claimed.count !== 1) {
    const latest = await prisma.vipTradingAgentSnapshot.findUnique({
      where: { agentId_periodKey: { agentId: storedAgent.id, periodKey: runKey } },
    });
    return {
      agent: strategy.name,
      reused: true,
      trades: 0,
      decisions: 0,
      snapshotReliable: latest !== null,
      totalBalanceUsd: latest ? decimalToNumber(latest.totalBalanceUsd) : null,
      pnlUsd: latest ? decimalToNumber(latest.pnlUsd) : null,
      returnPercent: latest ? decimalToNumber(latest.returnPercent) : null,
    };
  }
  const agent = {
    ...storedAgent,
    positions: storedAgent.positions,
  };
  const existingRunDecisions = await prisma.vipTradingAgentDecision.findMany({
    where: { agentId: agent.id, runKey },
    select: { symbol: true, action: true },
  });

  const ideas = report.ideas.map((idea) => ({
    ...idea,
    priceAtRecommendation: decimalToNumber(idea.priceAtRecommendation),
    entryLow: decimalToNumber(idea.entryLow),
    entryHigh: decimalToNumber(idea.entryHigh),
    stopLoss: decimalToNumber(idea.stopLoss),
    targetPrice: decimalToNumber(idea.targetPrice),
    secondaryTargetPrice: nullableDecimalToNumber(idea.secondaryTargetPrice),
  }));
  const corporateActionResults = await Promise.all(agent.positions.map(async (position) => {
    try {
      const quote = await fetchYahooCorporateActionQuote({
        symbol: position.symbol,
        providerSymbol: position.providerSymbol,
        from: position.openedAt,
        asOf: now,
        timeoutMs: 8_000,
      });
      const adjustment = calculateVipAgentSplitAdjustmentDecimal(
        position,
        getYahooCumulativeSplitFactor(quote.splitEvents),
      );
      if (!adjustment) throw new Error("Geçersiz kümülatif split faktörü.");

      return {
        positionId: position.id,
        symbol: position.symbol,
        priceResult: { price: quote.price, asOf: quote.priceAsOf, availability: "EXECUTABLE" } satisfies PriceResult,
        adjustedData: {
          quantity: adjustment.quantity,
          averagePriceUsd: adjustment.averagePriceUsd,
          lastPriceUsd: adjustment.lastPriceUsd,
          stopLossUsd: adjustment.stopLossUsd,
          targetPriceUsd: adjustment.targetPriceUsd,
          secondaryTarget: adjustment.secondaryTarget,
          appliedSplitFactor: adjustment.appliedSplitFactor,
          corporateActionsCheckedAt: now,
        },
      };
    } catch (error) {
      return {
        positionId: position.id,
        symbol: position.symbol,
        priceResult: {
          price: null,
          asOf: null,
          availability: "UNAVAILABLE",
          error: `Kurumsal aksiyon doğrulanamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`,
        } satisfies PriceResult,
        adjustedData: null,
      };
    }
  }));
  const successfulAdjustments = corporateActionResults.filter((result) => result.adjustedData !== null);
  if (successfulAdjustments.length > 0) {
    await prisma.$transaction(successfulAdjustments.map((result) => prisma.vipTradingAgentPosition.update({
      where: { id: result.positionId },
      data: result.adjustedData!,
    })));
  }

  const adjustedDataByPositionId = new Map(corporateActionResults.map((result) => [result.positionId, result.adjustedData]));
  const corporateActionResultByPositionId = new Map(
    corporateActionResults.map((result) => [result.positionId, result]),
  );
  const failedCorporateActionPositionIds = new Set(
    corporateActionResults
      .filter((result) => result.adjustedData === null)
      .map((result) => result.positionId),
  );
  const priceMap = await fetchPriceMap(buildVipAgentPriceRequests(
    ideas.map((idea) => ({ symbol: idea.symbol, providerSymbol: idea.providerSymbol, assetClass: idea.assetClass })),
    agent.positions.map((position) => ({ symbol: position.symbol, providerSymbol: position.providerSymbol })),
  ));
  const ideaBySymbol = new Map(ideas.map((idea) => [idea.symbol, idea]));
  let cashUsd = decimal(agent.cashUsd);
  let positions = agent.positions.map((position) => {
    const adjustedData = adjustedDataByPositionId.get(position.id);
    return adjustedData ? { ...position, ...adjustedData } : position;
  });
  let tradeCount = 0;
  let decisionCount = 0;
  const decidedSymbols = new Set(
    existingRunDecisions
      .filter((decision) => isVipAgentTerminalDailyAction(decision.action))
      .map((decision) => decision.symbol),
  );

  for (const position of [...positions]) {
    if (decidedSymbols.has(position.symbol)) continue;
    const corporateActionResult = corporateActionResultByPositionId.get(position.id);
    if (!corporateActionResult?.adjustedData) {
      const reason = corporateActionResult?.priceResult.error
        ?? "Kurumsal aksiyon bilgisi doğrulanamadı; miktar, stop ve hedef güvenliği için işlem yapılmadı.";
      const currentIdea = ideaBySymbol.get(position.symbol);
      const sourceIdeaId = currentIdea?.id ?? position.sourceIdeaId;
      await prisma.vipTradingAgentDecision.upsert({
        where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: position.symbol } },
        create: { agentId: agent.id, runKey, symbol: position.symbol, action: "ERROR", reason, sourceIdeaId },
        update: { action: "ERROR", priceUsd: null, reason, sourceIdeaId },
      });
      decidedSymbols.add(position.symbol);
      decisionCount += 1;
      continue;
    }
    const priceResult = priceMap.get(position.symbol);
    const price = priceResult?.price;
    const currentIdea = ideaBySymbol.get(position.symbol);

    if (!price) {
      const noQuoteDecision = getVipAgentNoQuoteDecision(priceResult ?? {
        availability: "UNAVAILABLE",
        error: "Sağlayıcı eşlemesi veya güncel fiyat alınamadı.",
      });
      const reason = noQuoteDecision.reason;
      const sourceIdeaId = currentIdea?.id ?? position.sourceIdeaId;
      await prisma.vipTradingAgentDecision.upsert({
        where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: position.symbol } },
        create: { agentId: agent.id, runKey, symbol: position.symbol, action: noQuoteDecision.action, reason, sourceIdeaId },
        update: { action: noQuoteDecision.action, priceUsd: null, reason, sourceIdeaId },
      });
      decidedSymbols.add(position.symbol);
      decisionCount += 1;
      continue;
    }

    const sellReason = getVipAgentPositionExitReason({
      price,
      stopLossUsd: decimalToNumber(position.stopLossUsd),
      targetPriceUsd: decimalToNumber(position.targetPriceUsd),
      currentStance: currentIdea?.stance,
    });

    if (!sellReason) {
      const holdReason = "Stop veya hedef tetiklenmedi; pozisyon korunuyor.";
      const sourceIdeaId = currentIdea?.id ?? position.sourceIdeaId;
      await prisma.$transaction([
        prisma.vipTradingAgentPosition.update({ where: { id: position.id }, data: { lastPriceUsd: decimal(String(price)) } }),
        prisma.vipTradingAgentDecision.upsert({
          where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: position.symbol } },
          create: { agentId: agent.id, runKey, symbol: position.symbol, action: "HOLD", priceUsd: decimal(String(price)), reason: holdReason, sourceIdeaId },
          update: { action: "HOLD", priceUsd: decimal(String(price)), reason: holdReason, sourceIdeaId },
        }),
      ]);
      position.lastPriceUsd = decimal(String(price));
      decidedSymbols.add(position.symbol);
      decisionCount += 1;
      continue;
    }

    const priceUsd = decimal(String(price));
    const sellAccounting = calculateVipAgentSellAccountingDecimal({
      quantity: position.quantity,
      priceUsd,
      averagePriceUsd: position.averagePriceUsd,
      cashUsd,
    });
    const { grossUsd, costBasisUsd, realizedPnlUsd, realizedPnlPercent } = sellAccounting;
    cashUsd = sellAccounting.cashAfterUsd;
    positions = positions.filter((item) => item.id !== position.id);
    const afterValue = roundMoneyDecimal(portfolioValueDecimal(cashUsd, positions, priceMap));

    await prisma.$transaction([
      prisma.vipTradingAgent.update({ where: { id: agent.id }, data: { cashUsd } }),
      prisma.vipTradingAgentPosition.delete({ where: { id: position.id } }),
      prisma.vipTradingAgentTrade.create({
        data: {
          agentId: agent.id,
          positionCycleId: position.positionCycleId,
          symbol: position.symbol,
          displayName: position.displayName,
          side: "SELL",
          quantity: position.quantity,
          priceUsd,
          grossUsd,
          costBasisUsd,
          realizedPnlUsd,
          realizedPnlPercent,
          cashAfterUsd: cashUsd,
          portfolioAfterUsd: afterValue,
          reason: sellReason,
          sourceIdeaId: currentIdea?.id ?? position.sourceIdeaId,
          executedAt: now,
        },
      }),
      prisma.vipTradingAgentDecision.upsert({
        where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: position.symbol } },
        create: { agentId: agent.id, runKey, symbol: position.symbol, action: "SELL", priceUsd, reason: sellReason, sourceIdeaId: currentIdea?.id ?? position.sourceIdeaId },
        update: { action: "SELL", priceUsd, reason: sellReason, sourceIdeaId: currentIdea?.id ?? position.sourceIdeaId },
      }),
    ]);
    tradeCount += 1;
    decidedSymbols.add(position.symbol);
    decisionCount += 1;
  }

  for (const idea of ideas) {
    if (decidedSymbols.has(idea.symbol) || positions.some((position) => position.symbol === idea.symbol)) continue;
    const priceResult = priceMap.get(idea.symbol);
    const price = priceResult?.price;
    const noQuoteDecision = priceResult
      ? getVipAgentNoQuoteDecision(priceResult)
      : getVipAgentNoQuoteDecision({
        availability: "UNAVAILABLE",
        error: "Sağlayıcı eşlemesi veya güncel fiyat alınamadı.",
      });
    let reason = price ? getVipAgentBuyIneligibilityReason(strategy, idea, price) : noQuoteDecision.reason;

    if (!reason && positions.length >= strategy.maximumPositions) reason = `Azami ${strategy.maximumPositions} açık pozisyon sınırına ulaşıldı.`;
    const minimumCash = decimal(agent.reserveUsd).plus(
      decimal(agent.performanceBaseUsd).times(strategy.minimumActiveCashPercent).div(100),
    );
    const spendableCash = decimalMax(decimal(0), cashUsd.minus(minimumCash));
    if (!reason && spendableCash.lessThanOrEqualTo(0)) reason = "Ajanın zorunlu nakit tamponu nedeniyle kullanılabilir sermaye kalmadı.";

    if (reason || !price) {
      await prisma.vipTradingAgentDecision.upsert({
        where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: idea.symbol } },
        create: { agentId: agent.id, runKey, symbol: idea.symbol, action: price ? "SKIP" : noQuoteDecision.action, priceUsd: price ? decimal(String(price)) : null, reason: reason ?? "İşlem koşulları oluşmadı.", sourceIdeaId: idea.id },
        update: { action: price ? "SKIP" : noQuoteDecision.action, priceUsd: price ? decimal(String(price)) : null, reason: reason ?? "İşlem koşulları oluşmadı.", sourceIdeaId: idea.id },
      });
      decisionCount += 1;
      continue;
    }

    const conviction = Math.min(1, Math.max(0.7, idea.confidenceScore / 100));
    const maximumBudget = decimal(agent.performanceBaseUsd)
      .times(strategy.maximumPositionPercent)
      .div(100)
      .times(String(conviction));
    const budget = decimalMin(spendableCash, maximumBudget);
    const priceUsd = decimal(String(price));
    const quantity = roundQuantityDecimal(budget.div(priceUsd));
    if (quantity.lessThanOrEqualTo(0)) continue;
    const grossUsd = roundMoneyDecimal(quantity.times(priceUsd));
    cashUsd = roundMoneyDecimal(cashUsd.minus(grossUsd));
    const positionCycleId = randomUUID();
    const newPosition = {
      id: `pending-${idea.symbol}`,
      agentId: agent.id,
      positionCycleId,
      appliedSplitFactor: decimal(1),
      corporateActionsCheckedAt: null,
      symbol: idea.symbol,
      providerSymbol: idea.providerSymbol,
      displayName: idea.displayName,
      quantity,
      averagePriceUsd: priceUsd,
      lastPriceUsd: priceUsd,
      stopLossUsd: decimal(String(idea.stopLoss)),
      targetPriceUsd: decimal(String(idea.targetPrice)),
      secondaryTarget: idea.secondaryTargetPrice === null
        ? null
        : decimal(String(idea.secondaryTargetPrice)),
      sourceIdeaId: idea.id,
      openedAt: now,
      updatedAt: now,
    };
    positions.push(newPosition);
    const afterValue = roundMoneyDecimal(portfolioValueDecimal(cashUsd, positions, priceMap));
    const buyReason = `${strategy.name}, VIP AL notunu ${idea.confidenceScore}/100 güven ve ${idea.riskScore}/100 risk ile kabul etti; giriş bandı doğrulandı.`;

    await prisma.$transaction([
      prisma.vipTradingAgent.update({ where: { id: agent.id }, data: { cashUsd } }),
      prisma.vipTradingAgentPosition.create({ data: { ...newPosition, id: undefined } }),
      prisma.vipTradingAgentTrade.create({
        data: { agentId: agent.id, positionCycleId, symbol: idea.symbol, displayName: idea.displayName, side: "BUY", quantity, priceUsd, grossUsd, cashAfterUsd: cashUsd, portfolioAfterUsd: afterValue, reason: buyReason, sourceIdeaId: idea.id, executedAt: now },
      }),
      prisma.vipTradingAgentDecision.upsert({
        where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: idea.symbol } },
        create: { agentId: agent.id, runKey, symbol: idea.symbol, action: "BUY", priceUsd, reason: buyReason, sourceIdeaId: idea.id },
        update: { action: "BUY", priceUsd, reason: buyReason, sourceIdeaId: idea.id },
      }),
    ]);
    tradeCount += 1;
    decisionCount += 1;
  }

  const storedPositions = await prisma.vipTradingAgentPosition.findMany({ where: { agentId: agent.id } });
  const snapshotReliable =
    areVipAgentOpenPositionPricesReliable(storedPositions, priceMap) &&
    areVipAgentCorporateActionsReliable(storedPositions, failedCorporateActionPositionIds);
  const positionsValueUsd = roundMoneyDecimal(storedPositions.reduce(
    (sum, position) => sum.plus(positionValueDecimal(position, priceMap)),
    decimal(0),
  ));
  const { totalBalanceUsd, performanceEquityUsd, pnlUsd, returnPercent } = calculateVipAgentAccountDecimal({
    cashUsd,
    positionsValueUsd,
    reserveUsd: agent.reserveUsd,
    performanceBaseUsd: agent.performanceBaseUsd,
  });

  const runTradeCount = await prisma.vipTradingAgentDecision.count({
    where: { agentId: agent.id, runKey, action: { in: ["BUY", "SELL"] } },
  });
  const basePortfolioDecision = getVipAgentPortfolioDecision({
    hasReport: Boolean(report),
    ideaCount: ideas.length,
    tradeCount: runTradeCount,
  });
  const portfolioDecision = snapshotReliable
    ? basePortfolioDecision
    : {
        ...basePortfolioDecision,
        reason: `${basePortfolioDecision.reason} En az bir açık pozisyon için güncel ve doğrulanmış fiyat bulunamadığından performans anlık görüntüsü yayımlanmadı.`,
      };
  await prisma.vipTradingAgentDecision.upsert({
    where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: "PORTFOY" } },
    create: { agentId: agent.id, runKey, symbol: "PORTFOY", ...portfolioDecision },
    update: { ...portfolioDecision, priceUsd: null, sourceIdeaId: null },
  });
  decisionCount += 1;

  if (snapshotReliable) {
    await prisma.$transaction([
      prisma.vipTradingAgent.update({ where: { id: agent.id }, data: { cashUsd, lastRunAt: now } }),
      prisma.vipTradingAgentSnapshot.upsert({
        where: { agentId_periodKey: { agentId: agent.id, periodKey: runKey } },
        create: { agentId: agent.id, periodKey: runKey, cashUsd, reserveUsd: agent.reserveUsd, positionsValueUsd, totalBalanceUsd, performanceEquityUsd, pnlUsd, returnPercent, capturedAt: now },
        update: { cashUsd, reserveUsd: agent.reserveUsd, positionsValueUsd, totalBalanceUsd, performanceEquityUsd, pnlUsd, returnPercent, capturedAt: now },
      }),
    ]);
  } else {
    await prisma.vipTradingAgent.update({ where: { id: agent.id }, data: { cashUsd, lastRunAt: now } });
  }

  return {
    agent: strategy.name,
    reused: false,
    trades: tradeCount,
    decisions: decisionCount,
    snapshotReliable,
    totalBalanceUsd: decimalToNumber(totalBalanceUsd),
    pnlUsd: decimalToNumber(pnlUsd),
    returnPercent: decimalToNumber(returnPercent),
  };
}

async function getReportForRun(runKey: string) {
  return prisma.vipResearchReport.findUnique({
    where: { periodKey: runKey },
    include: { ideas: { orderBy: { rank: "asc" } } },
  });
}

export async function runVipTradingAgents(now = new Date()) {
  await ensureVipTradingAgents();
  const runKey = getIstanbulDateKey(now);
  const report = await getReportForRun(runKey);

  if (!report || report.status !== "COMPLETED") {
    return {
      reportId: null,
      runKey,
      deferred: true,
      reason: "Bugünün tamamlanmış VIP raporu henüz bulunmadığı için ajanlar önceki günün tezleriyle çalıştırılmadı.",
      agents: [],
    };
  }

  const results = [];
  for (const strategy of VIP_AGENT_STRATEGIES) {
    results.push(await runAgent(strategy, now, report));
  }
  return { reportId: report.id, runKey, deferred: false, agents: results };
}
