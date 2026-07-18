import "server-only";

import { prisma } from "@/lib/prisma";
import { VIP_AGENT_STRATEGIES } from "@/lib/vip-agents/config";

export const VIP_AGENT_PERIODS = [
  { key: "daily", labelTr: "Günlük", labelEn: "Daily", days: 1 },
  { key: "weekly", labelTr: "Haftalık", labelEn: "Weekly", days: 7 },
  { key: "monthly", labelTr: "Aylık", labelEn: "Monthly", days: 30 },
  { key: "threeMonth", labelTr: "3 Aylık", labelEn: "3 Months", days: 90 },
  { key: "sixMonth", labelTr: "6 Aylık", labelEn: "6 Months", days: 180 },
  { key: "yearly", labelTr: "Yıllık", labelEn: "Yearly", days: 365 },
] as const;

type Snapshot = {
  performanceEquityUsd: number;
  capturedAt: Date;
};

function calculatePeriods(snapshots: Snapshot[], performanceBaseUsd: number, createdAt: Date, now = new Date()) {
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
        periods: calculatePeriods(agent.snapshots, agent.performanceBaseUsd, agent.createdAt),
      };
    });
}

export async function getVipAgentDetail(slug: string) {
  const agent = await prisma.vipTradingAgent.findUnique({
    where: { slug },
    include: {
      positions: { orderBy: { openedAt: "desc" } },
      trades: { orderBy: { executedAt: "desc" }, take: 250 },
      decisions: { orderBy: { createdAt: "desc" }, take: 250 },
      snapshots: { orderBy: { capturedAt: "desc" }, take: 400 },
    },
  });
  if (!agent) return null;
  const latest = agent.snapshots[0];

  return {
    ...agent,
    totalBalanceUsd: latest?.totalBalanceUsd ?? agent.cashUsd,
    totalPnlUsd: latest?.pnlUsd ?? 0,
    totalReturnPercent: latest?.returnPercent ?? 0,
    positionsValueUsd: latest?.positionsValueUsd ?? 0,
    periods: calculatePeriods(agent.snapshots, agent.performanceBaseUsd, agent.createdAt),
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
