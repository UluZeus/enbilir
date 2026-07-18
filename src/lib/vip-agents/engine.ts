import "server-only";

import { fetchYahooDailyCandles } from "@/lib/ai-market/yahoo-public";
import { prisma } from "@/lib/prisma";
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

function buyEligibility(strategy: VipAgentStrategy, idea: {
  stance: string;
  confidenceScore: number;
  riskScore: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
}, price: number) {
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

async function runAgent(strategy: VipAgentStrategy, now: Date, report: Awaited<ReturnType<typeof getLatestReport>>) {
  const runKey = getIstanbulDateKey(now);
  const agent = await prisma.vipTradingAgent.findUniqueOrThrow({
    where: { id: strategy.id },
    include: { positions: true },
  });
  const existingSnapshot = await prisma.vipTradingAgentSnapshot.findUnique({
    where: { agentId_periodKey: { agentId: agent.id, periodKey: runKey } },
    select: { id: true },
  });

  if (existingSnapshot) {
    return { agent: strategy.name, reused: true, trades: 0, decisions: 0 };
  }

  const ideas = report?.ideas ?? [];
  const priceMap = await fetchPriceMap([
    ...agent.positions.map((position) => ({ symbol: position.symbol, providerSymbol: position.providerSymbol })),
    ...ideas.map((idea) => ({ symbol: idea.symbol, providerSymbol: idea.providerSymbol })),
  ]);
  const ideaBySymbol = new Map(ideas.map((idea) => [idea.symbol, idea]));
  let cashUsd = agent.cashUsd;
  let positions = [...agent.positions];
  let tradeCount = 0;
  let decisionCount = 0;
  const decidedSymbols = new Set<string>();

  for (const position of [...positions]) {
    const priceResult = priceMap.get(position.symbol);
    const price = priceResult?.price;
    const currentIdea = ideaBySymbol.get(position.symbol);

    if (!price) {
      await prisma.vipTradingAgentDecision.create({
        data: { agentId: agent.id, runKey, symbol: position.symbol, action: "ERROR", reason: `Piyasa verisi yok: ${priceResult?.error ?? "bilinmeyen hata"}`, sourceIdeaId: currentIdea?.id },
      });
      decidedSymbols.add(position.symbol);
      decisionCount += 1;
      continue;
    }

    let sellReason: string | null = null;
    if (price <= position.stopLossUsd) sellReason = `Stop çalıştı: $${price.toFixed(2)} ≤ $${position.stopLossUsd.toFixed(2)}.`;
    else if (price >= position.targetPriceUsd) sellReason = `Birincil hedef gerçekleşti: $${price.toFixed(2)} ≥ $${position.targetPriceUsd.toFixed(2)}.`;
    else if (currentIdea?.stance === "UZAK_DUR") sellReason = "Güncel VIP raporu UZAK DUR notuna geçti.";

    if (!sellReason) {
      await prisma.$transaction([
        prisma.vipTradingAgentPosition.update({ where: { id: position.id }, data: { lastPriceUsd: price } }),
        prisma.vipTradingAgentDecision.create({
          data: { agentId: agent.id, runKey, symbol: position.symbol, action: "HOLD", priceUsd: price, reason: "Stop veya hedef tetiklenmedi; pozisyon korunuyor.", sourceIdeaId: currentIdea?.id ?? position.sourceIdeaId },
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
      prisma.vipTradingAgentDecision.create({
        data: { agentId: agent.id, runKey, symbol: position.symbol, action: "SELL", priceUsd: price, reason: sellReason, sourceIdeaId: currentIdea?.id ?? position.sourceIdeaId },
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
    let reason = price ? buyEligibility(strategy, idea, price) : `Piyasa verisi yok: ${priceResult?.error ?? "bilinmeyen hata"}`;

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
    const newPosition = {
      id: `pending-${idea.symbol}`,
      agentId: agent.id,
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
        data: { agentId: agent.id, symbol: idea.symbol, displayName: idea.displayName, side: "BUY", quantity, priceUsd: price, grossUsd, cashAfterUsd: cashUsd, portfolioAfterUsd: afterValue, reason: buyReason, sourceIdeaId: idea.id, executedAt: now },
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
  const totalBalanceUsd = roundMoney(cashUsd + positionsValueUsd);
  const performanceEquityUsd = roundMoney(totalBalanceUsd - agent.reserveUsd);
  const pnlUsd = roundMoney(performanceEquityUsd - agent.performanceBaseUsd);
  const returnPercent = Number(((pnlUsd / agent.performanceBaseUsd) * 100).toFixed(4));

  if (!report) {
    await prisma.vipTradingAgentDecision.create({
      data: { agentId: agent.id, runKey, symbol: "PORTFOY", action: "HOLD", reason: "Henüz VIP sabah raporu bulunmadığı için nakitte bekleniyor." },
    });
    decisionCount += 1;
  }

  await prisma.$transaction([
    prisma.vipTradingAgent.update({ where: { id: agent.id }, data: { cashUsd, lastRunAt: now } }),
    prisma.vipTradingAgentSnapshot.create({
      data: { agentId: agent.id, periodKey: runKey, cashUsd, reserveUsd: agent.reserveUsd, positionsValueUsd, totalBalanceUsd, performanceEquityUsd, pnlUsd, returnPercent, capturedAt: now },
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

export async function runVipTradingAgents(now = new Date()) {
  await ensureVipTradingAgents();
  const report = await getLatestReport();
  const results = [];
  for (const strategy of VIP_AGENT_STRATEGIES) results.push(await runAgent(strategy, now, report));
  return { reportId: report?.id ?? null, runKey: getIstanbulDateKey(now), agents: results };
}
