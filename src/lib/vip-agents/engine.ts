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
  calculateVipAgentAccount,
  calculateVipAgentSplitAdjustment,
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

function roundMoney(value: number) {
  return decimalToNumber(roundDecimal(String(value), 2));
}

function roundQuantity(value: number) {
  return decimalToNumber(decimal(String(value)).times(10_000).floor().div(10_000));
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

function positionValue(
  position: { symbol: string; quantity: number; lastPriceUsd: number },
  prices: Map<string, PriceResult>,
) {
  return position.quantity * (prices.get(position.symbol)?.price ?? position.lastPriceUsd);
}

function portfolioValue(
  cashUsd: number,
  positions: Array<{ symbol: string; quantity: number; lastPriceUsd: number }>,
  prices: Map<string, PriceResult>,
) {
  return cashUsd + positions.reduce((sum, position) => sum + positionValue(position, prices), 0);
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
    startingBalanceUsd: decimalToNumber(storedAgent.startingBalanceUsd),
    performanceBaseUsd: decimalToNumber(storedAgent.performanceBaseUsd),
    reserveUsd: decimalToNumber(storedAgent.reserveUsd),
    cashUsd: decimalToNumber(storedAgent.cashUsd),
    positions: storedAgent.positions.map((position) => ({
      ...position,
      quantity: decimalToNumber(position.quantity),
      averagePriceUsd: decimalToNumber(position.averagePriceUsd),
      lastPriceUsd: decimalToNumber(position.lastPriceUsd),
      stopLossUsd: decimalToNumber(position.stopLossUsd),
      targetPriceUsd: decimalToNumber(position.targetPriceUsd),
      secondaryTarget: nullableDecimalToNumber(position.secondaryTarget),
      appliedSplitFactor: decimalToNumber(position.appliedSplitFactor),
    })),
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
      const adjustment = calculateVipAgentSplitAdjustment(
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
  let cashUsd = agent.cashUsd;
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
      stopLossUsd: position.stopLossUsd,
      targetPriceUsd: position.targetPriceUsd,
      currentStance: currentIdea?.stance,
    });

    if (!sellReason) {
      const holdReason = "Stop veya hedef tetiklenmedi; pozisyon korunuyor.";
      const sourceIdeaId = currentIdea?.id ?? position.sourceIdeaId;
      await prisma.$transaction([
        prisma.vipTradingAgentPosition.update({ where: { id: position.id }, data: { lastPriceUsd: price } }),
        prisma.vipTradingAgentDecision.upsert({
          where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: position.symbol } },
          create: { agentId: agent.id, runKey, symbol: position.symbol, action: "HOLD", priceUsd: price, reason: holdReason, sourceIdeaId },
          update: { action: "HOLD", priceUsd: price, reason: holdReason, sourceIdeaId },
        }),
      ]);
      position.lastPriceUsd = price;
      decidedSymbols.add(position.symbol);
      decisionCount += 1;
      continue;
    }

    const grossUsd = roundMoney(position.quantity * price);
    const costBasisUsd = roundMoney(position.quantity * position.averagePriceUsd);
    const realizedPnlUsd = roundMoney(grossUsd - costBasisUsd);
    const realizedPnlPercent = costBasisUsd > 0 ? Number(((realizedPnlUsd / costBasisUsd) * 100).toFixed(4)) : 0;
    cashUsd = roundMoney(cashUsd + grossUsd);
    positions = positions.filter((item) => item.id !== position.id);
    const afterValue = roundMoney(portfolioValue(cashUsd, positions, priceMap));

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
          priceUsd: price,
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
        create: { agentId: agent.id, runKey, symbol: position.symbol, action: "SELL", priceUsd: price, reason: sellReason, sourceIdeaId: currentIdea?.id ?? position.sourceIdeaId },
        update: { action: "SELL", priceUsd: price, reason: sellReason, sourceIdeaId: currentIdea?.id ?? position.sourceIdeaId },
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
    const minimumCash = agent.reserveUsd + agent.performanceBaseUsd * (strategy.minimumActiveCashPercent / 100);
    const spendableCash = Math.max(0, cashUsd - minimumCash);
    if (!reason && spendableCash <= 0) reason = "Ajanın zorunlu nakit tamponu nedeniyle kullanılabilir sermaye kalmadı.";

    if (reason || !price) {
      await prisma.vipTradingAgentDecision.upsert({
        where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: idea.symbol } },
        create: { agentId: agent.id, runKey, symbol: idea.symbol, action: price ? "SKIP" : noQuoteDecision.action, priceUsd: price, reason: reason ?? "İşlem koşulları oluşmadı.", sourceIdeaId: idea.id },
        update: { action: price ? "SKIP" : noQuoteDecision.action, priceUsd: price, reason: reason ?? "İşlem koşulları oluşmadı.", sourceIdeaId: idea.id },
      });
      decisionCount += 1;
      continue;
    }

    const conviction = Math.min(1, Math.max(0.7, idea.confidenceScore / 100));
    const budget = Math.min(spendableCash, agent.performanceBaseUsd * (strategy.maximumPositionPercent / 100) * conviction);
    const quantity = roundQuantity(budget / price);
    if (quantity <= 0) continue;
    const grossUsd = roundMoney(quantity * price);
    cashUsd = roundMoney(cashUsd - grossUsd);
    const positionCycleId = randomUUID();
    const newPosition = {
      id: `pending-${idea.symbol}`,
      agentId: agent.id,
      positionCycleId,
      appliedSplitFactor: 1,
      corporateActionsCheckedAt: null,
      symbol: idea.symbol,
      providerSymbol: idea.providerSymbol,
      displayName: idea.displayName,
      quantity,
      averagePriceUsd: price,
      lastPriceUsd: price,
      stopLossUsd: idea.stopLoss,
      targetPriceUsd: idea.targetPrice,
      secondaryTarget: idea.secondaryTargetPrice,
      sourceIdeaId: idea.id,
      openedAt: now,
      updatedAt: now,
    };
    positions.push(newPosition);
    const afterValue = roundMoney(portfolioValue(cashUsd, positions, priceMap));
    const buyReason = `${strategy.name}, VIP AL notunu ${idea.confidenceScore}/100 güven ve ${idea.riskScore}/100 risk ile kabul etti; giriş bandı doğrulandı.`;

    await prisma.$transaction([
      prisma.vipTradingAgent.update({ where: { id: agent.id }, data: { cashUsd } }),
      prisma.vipTradingAgentPosition.create({ data: { ...newPosition, id: undefined } }),
      prisma.vipTradingAgentTrade.create({
        data: { agentId: agent.id, positionCycleId, symbol: idea.symbol, displayName: idea.displayName, side: "BUY", quantity, priceUsd: price, grossUsd, cashAfterUsd: cashUsd, portfolioAfterUsd: afterValue, reason: buyReason, sourceIdeaId: idea.id, executedAt: now },
      }),
      prisma.vipTradingAgentDecision.upsert({
        where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: idea.symbol } },
        create: { agentId: agent.id, runKey, symbol: idea.symbol, action: "BUY", priceUsd: price, reason: buyReason, sourceIdeaId: idea.id },
        update: { action: "BUY", priceUsd: price, reason: buyReason, sourceIdeaId: idea.id },
      }),
    ]);
    tradeCount += 1;
    decisionCount += 1;
  }

  const storedPositions = (await prisma.vipTradingAgentPosition.findMany({ where: { agentId: agent.id } }))
    .map((position) => ({
      ...position,
      quantity: decimalToNumber(position.quantity),
      averagePriceUsd: decimalToNumber(position.averagePriceUsd),
      lastPriceUsd: decimalToNumber(position.lastPriceUsd),
      stopLossUsd: decimalToNumber(position.stopLossUsd),
      targetPriceUsd: decimalToNumber(position.targetPriceUsd),
      secondaryTarget: nullableDecimalToNumber(position.secondaryTarget),
      appliedSplitFactor: decimalToNumber(position.appliedSplitFactor),
    }));
  const snapshotReliable =
    areVipAgentOpenPositionPricesReliable(storedPositions, priceMap) &&
    areVipAgentCorporateActionsReliable(storedPositions, failedCorporateActionPositionIds);
  const positionsValueUsd = roundMoney(storedPositions.reduce((sum, position) => sum + positionValue(position, priceMap), 0));
  const { totalBalanceUsd, performanceEquityUsd, pnlUsd, returnPercent } = calculateVipAgentAccount({
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

  return { agent: strategy.name, reused: false, trades: tradeCount, decisions: decisionCount, snapshotReliable, totalBalanceUsd, pnlUsd, returnPercent };
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
