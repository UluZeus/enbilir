import "server-only";

import { prisma } from "@/lib/prisma";
import {
  calculateVipAgentTradePnl,
  calculateVipAgentPeriods,
  getVipAgentHistoryPagination,
  VIP_AGENT_DECISION_PAGE_SIZE,
  VIP_AGENT_TRADE_PAGE_SIZE,
} from "@/lib/vip-agents/calculations";
import { VIP_AGENT_STRATEGIES } from "@/lib/vip-agents/config";

export async function getVipAgentSummaries() {
  const agents = await prisma.vipTradingAgent.findMany({
    where: { isActive: true },
    include: {
      snapshots: { orderBy: { capturedAt: "desc" }, take: 400 },
      _count: { select: { positions: true, trades: true } },
    },
  });
  const order = new Map(VIP_AGENT_STRATEGIES.map((strategy, index) => [strategy.id, index]));

  return agents
    .sort((left, right) => (order.get(left.id) ?? 99) - (order.get(right.id) ?? 99))
    .map((agent) => {
      const latest = agent.snapshots[0];
      return {
        id: agent.id,
        slug: agent.slug,
        name: agent.name,
        riskProfile: agent.riskProfile,
        description: agent.description,
        startingBalanceUsd: agent.startingBalanceUsd,
        performanceBaseUsd: agent.performanceBaseUsd,
        reserveUsd: agent.reserveUsd,
        totalBalanceUsd: latest?.totalBalanceUsd ?? agent.cashUsd,
        totalPnlUsd: latest?.pnlUsd ?? 0,
        totalReturnPercent: latest?.returnPercent ?? 0,
        lastRunAt: agent.lastRunAt,
        openPositionCount: agent._count.positions,
        tradeCount: agent._count.trades,
        periods: calculateVipAgentPeriods(agent.snapshots, agent.performanceBaseUsd, agent.createdAt),
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
      snapshots: { orderBy: { capturedAt: "desc" }, take: 400 },
      _count: { select: { trades: true, decisions: true } },
    },
  });
  if (!agent) return null;
  const tradePagination = getVipAgentHistoryPagination(history.tradePage, agent._count.trades, VIP_AGENT_TRADE_PAGE_SIZE);
  const decisionPagination = getVipAgentHistoryPagination(history.decisionPage, agent._count.decisions, VIP_AGENT_DECISION_PAGE_SIZE);
  const [trades, decisions] = await Promise.all([
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
    totalPnlUsd: latest?.pnlUsd ?? 0,
    totalReturnPercent: latest?.returnPercent ?? 0,
    positionsValueUsd: latest?.positionsValueUsd ?? 0,
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
