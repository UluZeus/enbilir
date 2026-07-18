import "server-only";

import { randomUUID } from "node:crypto";
import {
  fetchYahooCorporateActionQuote,
  getYahooCumulativeSplitFactor,
} from "@/lib/ai-market/yahoo-corporate-actions";
import { fetchYahooDailyCandles } from "@/lib/ai-market/yahoo-public";
import { prisma } from "@/lib/prisma";
import {
  calculateVipAgentAccount,
  calculateVipAgentSplitAdjustment,
  getVipAgentBuyIneligibilityReason,
  getVipAgentPortfolioDecision,
  getVipAgentPositionExitReason,
  isVipAgentTerminalDailyAction,
  shouldReuseVipAgentDailyRun,
} from "@/lib/vip-agents/calculations";
import {
  VIP_AGENT_PERFORMANCE_BASE_USD,
  VIP_AGENT_RESERVE_USD,
  VIP_AGENT_STARTING_BALANCE_USD,
  VIP_AGENT_STRATEGIES,
  type VipAgentStrategy,
} from "@/lib/vip-agents/config";

type PriceResult = { price: number | null; asOf: Date | null; error?: string };

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function roundQuantity(value: number) {
  return Math.floor(value * 10_000) / 10_000;
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

async function fetchLatestPrice(symbol: string): Promise<PriceResult> {
  try {
    const candles = await fetchYahooDailyCandles(symbol, "1mo", 8_000);
    const candle = candles.at(-1);
    if (!candle?.close) return { price: null, asOf: null, error: "Geçerli piyasa kapanışı bulunamadı." };
    return { price: candle.close, asOf: new Date(candle.openTime) };
  } catch (error) {
    return { price: null, asOf: null, error: error instanceof Error ? error.message : "Piyasa verisi alınamadı." };
  }
}

async function fetchPriceMap(items: Array<{ symbol: string; providerSymbol: string }>) {
  const unique = Array.from(new Map(items.map((item) => [item.symbol, item])).values());
  const entries = await Promise.all(unique.map(async (item) => [item.symbol, await fetchLatestPrice(item.providerSymbol)] as const));
  return new Map(entries);
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
  report: Awaited<ReturnType<typeof getLatestReport>>,
  force: boolean,
) {
  const runKey = getIstanbulDateKey(now);
  const agent = await prisma.vipTradingAgent.findUniqueOrThrow({
    where: { id: strategy.id },
    include: { positions: true },
  });
  const existingSnapshot = await prisma.vipTradingAgentSnapshot.findUnique({
    where: { agentId_periodKey: { agentId: agent.id, periodKey: runKey } },
    select: { id: true },
  });

  if (shouldReuseVipAgentDailyRun(Boolean(existingSnapshot), force)) {
    return { agent: strategy.name, reused: true, trades: 0, decisions: 0 };
  }

  const existingRunDecisions = await prisma.vipTradingAgentDecision.findMany({
    where: { agentId: agent.id, runKey },
    select: { symbol: true, action: true },
  });

  const ideas = report?.ideas ?? [];
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
        priceResult: { price: quote.price, asOf: quote.priceAsOf } satisfies PriceResult,
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
  const priceMap = await fetchPriceMap(ideas.map((idea) => ({ symbol: idea.symbol, providerSymbol: idea.providerSymbol })));
  for (const result of corporateActionResults) priceMap.set(result.symbol, result.priceResult);
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
    const priceResult = priceMap.get(position.symbol);
    const price = priceResult?.price;
    const currentIdea = ideaBySymbol.get(position.symbol);

    if (!price) {
      const reason = `Piyasa verisi yok: ${priceResult?.error ?? "bilinmeyen hata"}`;
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
    let reason = price ? getVipAgentBuyIneligibilityReason(strategy, idea, price) : `Piyasa verisi yok: ${priceResult?.error ?? "bilinmeyen hata"}`;

    if (!reason && positions.length >= strategy.maximumPositions) reason = `Azami ${strategy.maximumPositions} açık pozisyon sınırına ulaşıldı.`;
    const minimumCash = agent.reserveUsd + agent.performanceBaseUsd * (strategy.minimumActiveCashPercent / 100);
    const spendableCash = Math.max(0, cashUsd - minimumCash);
    if (!reason && spendableCash <= 0) reason = "Ajanın zorunlu nakit tamponu nedeniyle kullanılabilir sermaye kalmadı.";

    if (reason || !price) {
      await prisma.vipTradingAgentDecision.upsert({
        where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: idea.symbol } },
        create: { agentId: agent.id, runKey, symbol: idea.symbol, action: price ? "SKIP" : "ERROR", priceUsd: price, reason: reason ?? "İşlem koşulları oluşmadı.", sourceIdeaId: idea.id },
        update: { action: price ? "SKIP" : "ERROR", priceUsd: price, reason: reason ?? "İşlem koşulları oluşmadı.", sourceIdeaId: idea.id },
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

  const storedPositions = await prisma.vipTradingAgentPosition.findMany({ where: { agentId: agent.id } });
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
  const portfolioDecision = getVipAgentPortfolioDecision({
    hasReport: Boolean(report),
    ideaCount: ideas.length,
    tradeCount: runTradeCount,
  });
  await prisma.vipTradingAgentDecision.upsert({
    where: { agentId_runKey_symbol: { agentId: agent.id, runKey, symbol: "PORTFOY" } },
    create: { agentId: agent.id, runKey, symbol: "PORTFOY", ...portfolioDecision },
    update: { ...portfolioDecision, priceUsd: null, sourceIdeaId: null },
  });
  decisionCount += 1;

  await prisma.$transaction([
    prisma.vipTradingAgent.update({ where: { id: agent.id }, data: { cashUsd, lastRunAt: now } }),
    prisma.vipTradingAgentSnapshot.upsert({
      where: { agentId_periodKey: { agentId: agent.id, periodKey: runKey } },
      create: { agentId: agent.id, periodKey: runKey, cashUsd, reserveUsd: agent.reserveUsd, positionsValueUsd, totalBalanceUsd, performanceEquityUsd, pnlUsd, returnPercent, capturedAt: now },
      update: { cashUsd, reserveUsd: agent.reserveUsd, positionsValueUsd, totalBalanceUsd, performanceEquityUsd, pnlUsd, returnPercent, capturedAt: now },
    }),
  ]);

  return { agent: strategy.name, reused: false, trades: tradeCount, decisions: decisionCount, totalBalanceUsd, pnlUsd, returnPercent };
}

async function getLatestReport() {
  return prisma.vipResearchReport.findFirst({
    where: { status: "COMPLETED" },
    orderBy: { generatedAt: "desc" },
    include: { ideas: { orderBy: { rank: "asc" } } },
  });
}

export async function runVipTradingAgents(now = new Date(), options: { force?: boolean } = {}) {
  await ensureVipTradingAgents();
  const report = await getLatestReport();
  const results = [];
  for (const strategy of VIP_AGENT_STRATEGIES) {
    results.push(await runAgent(strategy, now, report, options.force === true));
  }
  return { reportId: report?.id ?? null, runKey: getIstanbulDateKey(now), agents: results };
}
