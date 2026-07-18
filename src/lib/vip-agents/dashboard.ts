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
      const latest = agent.snapshots[0];
      const totalPnlUsd = latest?.pnlUsd ?? 0;
      const realizedPnlUsd = realizedPnlByAgent.get(agent.id) ?? 0;
      return {
        id: agent.id,
        slug: agent.slug,
        name: agent.name,
        riskProfile: agent.riskProfile,
        description: agent.description,
        startingBalanceUsd: agent.startingBalanceUsd,
        performanceBaseUsd: agent.performanceBaseUsd,
        reserveUsd: agent.reserveUsd,
        cashUsd: latest?.cashUsd ?? agent.cashUsd,
        deployableCashUsd: Math.max(0, (latest?.cashUsd ?? agent.cashUsd) - (latest?.reserveUsd ?? agent.reserveUsd)),
        positionsValueUsd: latest?.positionsValueUsd ?? 0,
        performanceEquityUsd: latest?.performanceEquityUsd ?? agent.performanceBaseUsd,
        totalBalanceUsd: latest?.totalBalanceUsd ?? agent.cashUsd,
        totalPnlUsd,
        totalReturnPercent: latest?.returnPercent ?? 0,
        realizedPnlUsd,
        unrealizedPnlUsd: Number((totalPnlUsd - realizedPnlUsd).toFixed(2)),
        maximumDrawdownPercent: calculateVipAgentMaximumDrawdown(agent.snapshots, agent.performanceBaseUsd),
        latestSnapshotAt: latest?.capturedAt ?? null,
        lastRunAt: agent.lastRunAt,
        openPositionCount: agent._count.positions,
        tradeCount: agent._count.trades,
        periods: calculateVipAgentPeriods(agent.snapshots, agent.performanceBaseUsd, agent.createdAt),
        equityHistory: [...agent.snapshots]
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
  const buyCycleIds = trades
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
  const openPositionByCycle = new Map(agent.positions.map((position) => [position.positionCycleId, position]));
  const closingTradeByCycle = new Map(closingTrades.map((trade) => [trade.positionCycleId, trade]));
  const latest = agent.snapshots[0];
  const realizedPnlUsd = realizedPnl._sum.realizedPnlUsd ?? 0;
  const totalPnlUsd = latest?.pnlUsd ?? 0;

  return {
    ...agent,
    trades: trades.map((trade) => ({
      ...trade,
      ...calculateVipAgentTradePnl(
        trade,
        openPositionByCycle.get(trade.positionCycleId),
        closingTradeByCycle.get(trade.positionCycleId),
      ),
    })),
    decisions,
    tradePagination,
    decisionPagination,
    totalBalanceUsd: latest?.totalBalanceUsd ?? agent.cashUsd,
    totalPnlUsd,
    totalReturnPercent: latest?.returnPercent ?? 0,
    positionsValueUsd: latest?.positionsValueUsd ?? 0,
    deployableCashUsd: Math.max(0, (latest?.cashUsd ?? agent.cashUsd) - (latest?.reserveUsd ?? agent.reserveUsd)),
    realizedPnlUsd,
    unrealizedPnlUsd: Number((totalPnlUsd - realizedPnlUsd).toFixed(2)),
    maximumDrawdownPercent: calculateVipAgentMaximumDrawdown(agent.snapshots, agent.performanceBaseUsd),
    latestSnapshotAt: latest?.capturedAt ?? null,
    equityHistory: [...agent.snapshots]
      .reverse()
      .map((snapshot) => ({
        capturedAt: snapshot.capturedAt,
        performanceEquityUsd: snapshot.performanceEquityUsd,
        returnPercent: snapshot.returnPercent,
      })),
    periods: calculateVipAgentPeriods(agent.snapshots, agent.performanceBaseUsd, agent.createdAt),
    positions: agent.positions.map((position) => {
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
