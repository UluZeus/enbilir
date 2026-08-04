import "server-only";

import { prisma } from "@/lib/prisma";
import {
  calculateVipAgentTradePnl,
  calculateVipAgentMaximumDrawdown,
  calculateVipAgentPeriods,
  getVipAgentHistoryPagination,
  VIP_AGENT_DECISION_PAGE_SIZE,
  VIP_AGENT_TRADE_PAGE_SIZE,
} from "@/lib/vip-agents/calculations";
import { VIP_AGENT_STRATEGIES } from "@/lib/vip-agents/config";
import { buildVipAgentDailyTip, type VipAgentTipIdea } from "@/lib/vip-agents/daily-tip";
import { decimalToNumber, nullableDecimalToNumber } from "@/lib/decimal";

function normalizeTipIdea<T extends { entryLow: Parameters<typeof decimalToNumber>[0]; entryHigh: Parameters<typeof decimalToNumber>[0]; stopLoss: Parameters<typeof decimalToNumber>[0]; targetPrice: Parameters<typeof decimalToNumber>[0] }>(idea: T) {
  return {
    ...idea,
    entryLow: decimalToNumber(idea.entryLow),
    entryHigh: decimalToNumber(idea.entryHigh),
    stopLoss: decimalToNumber(idea.stopLoss),
    targetPrice: decimalToNumber(idea.targetPrice),
  };
}

function normalizeSnapshot<T extends { cashUsd: Parameters<typeof decimalToNumber>[0]; reserveUsd: Parameters<typeof decimalToNumber>[0]; positionsValueUsd: Parameters<typeof decimalToNumber>[0]; totalBalanceUsd: Parameters<typeof decimalToNumber>[0]; performanceEquityUsd: Parameters<typeof decimalToNumber>[0]; pnlUsd: Parameters<typeof decimalToNumber>[0]; returnPercent: Parameters<typeof decimalToNumber>[0] }>(snapshot: T) {
  return {
    ...snapshot,
    cashUsd: decimalToNumber(snapshot.cashUsd),
    reserveUsd: decimalToNumber(snapshot.reserveUsd),
    positionsValueUsd: decimalToNumber(snapshot.positionsValueUsd),
    totalBalanceUsd: decimalToNumber(snapshot.totalBalanceUsd),
    performanceEquityUsd: decimalToNumber(snapshot.performanceEquityUsd),
    pnlUsd: decimalToNumber(snapshot.pnlUsd),
    returnPercent: decimalToNumber(snapshot.returnPercent),
  };
}

function normalizePosition<T extends { quantity: Parameters<typeof decimalToNumber>[0]; averagePriceUsd: Parameters<typeof decimalToNumber>[0]; lastPriceUsd: Parameters<typeof decimalToNumber>[0]; stopLossUsd: Parameters<typeof decimalToNumber>[0]; targetPriceUsd: Parameters<typeof decimalToNumber>[0]; secondaryTarget: Parameters<typeof nullableDecimalToNumber>[0]; appliedSplitFactor: Parameters<typeof decimalToNumber>[0] }>(position: T) {
  return {
    ...position,
    quantity: decimalToNumber(position.quantity),
    averagePriceUsd: decimalToNumber(position.averagePriceUsd),
    lastPriceUsd: decimalToNumber(position.lastPriceUsd),
    stopLossUsd: decimalToNumber(position.stopLossUsd),
    targetPriceUsd: decimalToNumber(position.targetPriceUsd),
    secondaryTarget: nullableDecimalToNumber(position.secondaryTarget),
    appliedSplitFactor: decimalToNumber(position.appliedSplitFactor),
  };
}

const DAILY_TIP_IDEA_SELECT = {
  id: true,
  symbol: true,
  displayName: true,
  currency: true,
  rank: true,
  stance: true,
  thesisSummary: true,
  confidenceScore: true,
  riskScore: true,
  entryLow: true,
  entryHigh: true,
  stopLoss: true,
  targetPrice: true,
} as const;

export async function getVipAgentDailyTips() {
  const [latestReport, agentRecords] = await Promise.all([
    prisma.vipResearchReport.findFirst({
      orderBy: { generatedAt: "desc" },
      select: {
        periodKey: true,
        ideas: {
          orderBy: { rank: "asc" },
          take: 5,
          select: DAILY_TIP_IDEA_SELECT,
        },
      },
    }),
    prisma.vipTradingAgent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        decisions: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 60,
          select: {
            runKey: true,
            symbol: true,
            action: true,
            priceUsd: true,
            reason: true,
            sourceIdeaId: true,
          },
        },
        positions: {
          select: {
            symbol: true,
            stopLossUsd: true,
            targetPriceUsd: true,
          },
        },
      },
    }),
  ]);
  const normalizedAgentRecords = agentRecords.map((agent) => ({
    ...agent,
    decisions: agent.decisions.map((decision) => ({ ...decision, priceUsd: nullableDecimalToNumber(decision.priceUsd) })),
    positions: agent.positions.map((position) => ({
      ...position,
      stopLossUsd: decimalToNumber(position.stopLossUsd),
      targetPriceUsd: decimalToNumber(position.targetPriceUsd),
    })),
  }));
  const recordsById = new Map(normalizedAgentRecords.map((agent) => [agent.id, agent]));
  const decisionsByAgent = new Map(normalizedAgentRecords.map((agent) => {
    const reportDecisions = latestReport
      ? agent.decisions.filter((decision) => decision.runKey === latestReport.periodKey)
      : [];
    const latestRunKey = agent.decisions[0]?.runKey;
    const decisions = latestReport
      ? reportDecisions
      : latestRunKey
        ? agent.decisions.filter((decision) => decision.runKey === latestRunKey)
        : [];
    return [agent.id, decisions] as const;
  }));
  const currentIdeas: VipAgentTipIdea[] = latestReport?.ideas.map(normalizeTipIdea) ?? [];
  const currentIdeaIds = new Set(currentIdeas.map((idea) => idea.id));
  const historicalIdeaIds = Array.from(new Set(
    Array.from(decisionsByAgent.values())
      .flatMap((decisions) => decisions.map((decision) => decision.sourceIdeaId))
      .filter((ideaId): ideaId is string => typeof ideaId === "string" && !currentIdeaIds.has(ideaId)),
  ));
  const historicalIdeas: VipAgentTipIdea[] = historicalIdeaIds.length > 0
    ? (await prisma.vipResearchIdea.findMany({
        where: { id: { in: historicalIdeaIds } },
        select: DAILY_TIP_IDEA_SELECT,
      })).map(normalizeTipIdea)
    : [];
  const ideas = [...currentIdeas, ...historicalIdeas];

  return VIP_AGENT_STRATEGIES.map((strategy) => {
    const agent = recordsById.get(strategy.id);
    return buildVipAgentDailyTip({
      strategy,
      decisions: decisionsByAgent.get(strategy.id) ?? [],
      ideas,
      positions: agent?.positions ?? [],
    });
  });
}

export async function getVipAgentSummaries() {
  const [agents, realizedPnl] = await Promise.all([
    prisma.vipTradingAgent.findMany({
      where: { isActive: true },
      include: {
        snapshots: { orderBy: { capturedAt: "desc" } },
        _count: { select: { positions: true, trades: true } },
      },
    }),
    prisma.vipTradingAgentTrade.groupBy({
      by: ["agentId"],
      where: { side: "SELL" },
      _sum: { realizedPnlUsd: true },
    }),
  ]);
  const realizedPnlByAgent = new Map(realizedPnl.map((item) => [item.agentId, item._sum.realizedPnlUsd ?? 0]));
  const order = new Map(VIP_AGENT_STRATEGIES.map((strategy, index) => [strategy.id, index]));

  return agents
    .sort((left, right) => (order.get(left.id) ?? 99) - (order.get(right.id) ?? 99))
    .map((agent) => {
      const snapshots = agent.snapshots.map(normalizeSnapshot);
      const latest = snapshots[0];
      const performanceBaseUsd = decimalToNumber(agent.performanceBaseUsd);
      const totalPnlUsd = latest?.pnlUsd ?? 0;
      const realizedPnlUsd = nullableDecimalToNumber(realizedPnlByAgent.get(agent.id)) ?? 0;
      return {
        id: agent.id,
        slug: agent.slug,
        name: agent.name,
        riskProfile: agent.riskProfile,
        description: agent.description,
        startingBalanceUsd: decimalToNumber(agent.startingBalanceUsd),
        performanceBaseUsd,
        reserveUsd: decimalToNumber(agent.reserveUsd),
        cashUsd: latest?.cashUsd ?? decimalToNumber(agent.cashUsd),
        deployableCashUsd: Math.max(0, (latest?.cashUsd ?? decimalToNumber(agent.cashUsd)) - (latest?.reserveUsd ?? decimalToNumber(agent.reserveUsd))),
        positionsValueUsd: latest?.positionsValueUsd ?? 0,
        performanceEquityUsd: latest?.performanceEquityUsd ?? performanceBaseUsd,
        totalBalanceUsd: latest?.totalBalanceUsd ?? decimalToNumber(agent.cashUsd),
        totalPnlUsd,
        totalReturnPercent: latest?.returnPercent ?? 0,
        realizedPnlUsd,
        unrealizedPnlUsd: Number((totalPnlUsd - realizedPnlUsd).toFixed(2)),
        maximumDrawdownPercent: calculateVipAgentMaximumDrawdown(snapshots, performanceBaseUsd),
        latestSnapshotAt: latest?.capturedAt ?? null,
        lastRunAt: agent.lastRunAt,
        openPositionCount: agent._count.positions,
        tradeCount: agent._count.trades,
        periods: calculateVipAgentPeriods(snapshots, performanceBaseUsd, agent.createdAt),
        equityHistory: [...snapshots]
          .reverse()
          .map((snapshot) => ({
            capturedAt: snapshot.capturedAt,
            performanceEquityUsd: snapshot.performanceEquityUsd,
            returnPercent: snapshot.returnPercent,
          })),
      };
    });
}

export async function getVipAgentDetail(
  slug: string,
  history: { tradePage?: unknown; decisionPage?: unknown } = {},
) {
  const agent = await prisma.vipTradingAgent.findUnique({
    where: { slug },
    include: {
      positions: { orderBy: { openedAt: "desc" } },
      snapshots: { orderBy: { capturedAt: "desc" } },
      _count: { select: { trades: true, decisions: true } },
    },
  });
  if (!agent) return null;
  const tradePagination = getVipAgentHistoryPagination(history.tradePage, agent._count.trades, VIP_AGENT_TRADE_PAGE_SIZE);
  const decisionPagination = getVipAgentHistoryPagination(history.decisionPage, agent._count.decisions, VIP_AGENT_DECISION_PAGE_SIZE);
  const [trades, decisions, realizedPnl] = await Promise.all([
    prisma.vipTradingAgentTrade.findMany({
      where: { agentId: agent.id },
      orderBy: [{ executedAt: "desc" }, { id: "desc" }],
      skip: tradePagination.skip,
      take: tradePagination.pageSize,
    }),
    prisma.vipTradingAgentDecision.findMany({
      where: { agentId: agent.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: decisionPagination.skip,
      take: decisionPagination.pageSize,
    }),
    prisma.vipTradingAgentTrade.aggregate({
      where: { agentId: agent.id, side: "SELL" },
      _sum: { realizedPnlUsd: true },
    }),
  ]);
  const normalizedPositions = agent.positions.map(normalizePosition);
  const normalizedSnapshots = agent.snapshots.map(normalizeSnapshot);
  const normalizedTrades = trades.map((trade) => ({
    ...trade,
    quantity: decimalToNumber(trade.quantity),
    priceUsd: decimalToNumber(trade.priceUsd),
    grossUsd: decimalToNumber(trade.grossUsd),
    costBasisUsd: nullableDecimalToNumber(trade.costBasisUsd),
    realizedPnlUsd: nullableDecimalToNumber(trade.realizedPnlUsd),
    realizedPnlPercent: nullableDecimalToNumber(trade.realizedPnlPercent),
    cashAfterUsd: decimalToNumber(trade.cashAfterUsd),
    portfolioAfterUsd: decimalToNumber(trade.portfolioAfterUsd),
  }));
  const normalizedDecisions = decisions.map((decision) => ({
    ...decision,
    priceUsd: nullableDecimalToNumber(decision.priceUsd),
  }));
  const buyCycleIds = normalizedTrades
    .filter((trade) => trade.side === "BUY")
    .map((trade) => trade.positionCycleId);
  const closingTrades = buyCycleIds.length > 0
    ? await prisma.vipTradingAgentTrade.findMany({
        where: {
          agentId: agent.id,
          side: "SELL",
          positionCycleId: { in: buyCycleIds },
        },
        select: {
          positionCycleId: true,
          realizedPnlUsd: true,
          realizedPnlPercent: true,
        },
      })
    : [];
  const openPositionByCycle = new Map(normalizedPositions.map((position) => [position.positionCycleId, position]));
  const closingTradeByCycle = new Map(closingTrades.map((trade) => [trade.positionCycleId, {
    ...trade,
    realizedPnlUsd: nullableDecimalToNumber(trade.realizedPnlUsd),
    realizedPnlPercent: nullableDecimalToNumber(trade.realizedPnlPercent),
  }]));
  const latest = normalizedSnapshots[0];
  const realizedPnlUsd = nullableDecimalToNumber(realizedPnl._sum.realizedPnlUsd) ?? 0;
  const totalPnlUsd = latest?.pnlUsd ?? 0;

  return {
    ...agent,
    startingBalanceUsd: decimalToNumber(agent.startingBalanceUsd),
    performanceBaseUsd: decimalToNumber(agent.performanceBaseUsd),
    reserveUsd: decimalToNumber(agent.reserveUsd),
    cashUsd: decimalToNumber(agent.cashUsd),
    snapshots: normalizedSnapshots,
    trades: normalizedTrades.map((trade) => ({
      ...trade,
      ...calculateVipAgentTradePnl(
        trade,
        openPositionByCycle.get(trade.positionCycleId),
        closingTradeByCycle.get(trade.positionCycleId),
      ),
    })),
    decisions: normalizedDecisions,
    tradePagination,
    decisionPagination,
    totalBalanceUsd: latest?.totalBalanceUsd ?? decimalToNumber(agent.cashUsd),
    totalPnlUsd,
    totalReturnPercent: latest?.returnPercent ?? 0,
    positionsValueUsd: latest?.positionsValueUsd ?? 0,
    deployableCashUsd: Math.max(0, (latest?.cashUsd ?? decimalToNumber(agent.cashUsd)) - (latest?.reserveUsd ?? decimalToNumber(agent.reserveUsd))),
    realizedPnlUsd,
    unrealizedPnlUsd: Number((totalPnlUsd - realizedPnlUsd).toFixed(2)),
    maximumDrawdownPercent: calculateVipAgentMaximumDrawdown(normalizedSnapshots, decimalToNumber(agent.performanceBaseUsd)),
    latestSnapshotAt: latest?.capturedAt ?? null,
    equityHistory: [...normalizedSnapshots]
      .reverse()
      .map((snapshot) => ({
        capturedAt: snapshot.capturedAt,
        performanceEquityUsd: snapshot.performanceEquityUsd,
        returnPercent: snapshot.returnPercent,
      })),
    periods: calculateVipAgentPeriods(normalizedSnapshots, decimalToNumber(agent.performanceBaseUsd), agent.createdAt),
    positions: normalizedPositions.map((position) => {
      const unrealizedPnlUsd = Number(((position.lastPriceUsd - position.averagePriceUsd) * position.quantity).toFixed(2));
      const cost = position.averagePriceUsd * position.quantity;
      return {
        ...position,
        marketValueUsd: Number((position.lastPriceUsd * position.quantity).toFixed(2)),
        unrealizedPnlUsd,
        unrealizedPnlPercent: cost > 0 ? Number(((unrealizedPnlUsd / cost) * 100).toFixed(4)) : 0,
      };
    }),
  };
}
