import "server-only";
import { buildAiQueryQuota, getIstanbulAiQueryWindow, type AiQueryQuota } from "@/lib/ai-query-policy";
import { prisma } from "@/lib/prisma";

export class DailyAiQueryLimitReachedError extends Error {
  quota: AiQueryQuota;

  constructor(quota: AiQueryQuota) {
    super("Daily AI query limit reached");
    this.name = "DailyAiQueryLimitReachedError";
    this.quota = quota;
  }
}

export async function getAiQueryQuota({
  userId,
  isPaidVipActive,
  now = new Date(),
}: {
  userId: string;
  isPaidVipActive: boolean;
  now?: Date;
}) {
  const { dayKey, resetAt } = getIstanbulAiQueryWindow(now);
  const usage = await prisma.aiDailyQueryUsage.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
    select: { queryCount: true },
  });

  return buildAiQueryQuota({
    used: usage?.queryCount ?? 0,
    isPaidVipActive,
    resetAt,
  });
}

export async function reserveAiQuery({
  userId,
  isPaidVipActive,
  now = new Date(),
}: {
  userId: string;
  isPaidVipActive: boolean;
  now?: Date;
}) {
  const { dayKey, resetAt } = getIstanbulAiQueryWindow(now);

  return prisma.$transaction(async (transaction) => {
    const usage = await transaction.aiDailyQueryUsage.upsert({
      where: { userId_dayKey: { userId, dayKey } },
      create: { userId, dayKey, queryCount: 1 },
      update: { queryCount: { increment: 1 } },
      select: { queryCount: true },
    });
    const quota = buildAiQueryQuota({
      used: usage.queryCount,
      isPaidVipActive,
      resetAt,
    });

    if (usage.queryCount > quota.limit) {
      throw new DailyAiQueryLimitReachedError({
        ...quota,
        used: usage.queryCount - 1,
        remaining: 0,
      });
    }

    return quota;
  });
}
