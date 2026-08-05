import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { buildAiQueryQuota, getIstanbulAiQueryWindow, type AiQueryQuota } from "@/lib/ai-query-policy";
import { prisma } from "@/lib/prisma";

const TEXT_QUERY_PURPOSE = "TEXT_CHAT_QUOTA";
const TEXT_QUERY_LEASE_TTL_MS = 15 * 60 * 1000;

function hashLeaseToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

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

async function reserveAiQueryInternal({
  userId,
  now = new Date(),
  leaseTokenHash,
}: {
  userId: string;
  isPaidVipActive?: boolean;
  now?: Date;
  leaseTokenHash?: string;
}) {
  const { dayKey, resetAt } = getIstanbulAiQueryWindow(now);

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { membershipTier: true, vipPaidUntil: true },
    });

    if (!user) {
      throw new Error("AI query user not found");
    }

    const isPaidVipActive = user.membershipTier === "VIP"
      && Boolean(user.vipPaidUntil && user.vipPaidUntil > now);
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

    if (leaseTokenHash) {
      await transaction.aiQueryReservation.create({
        data: {
          userId,
          tokenHash: leaseTokenHash,
          dayKey,
          purpose: TEXT_QUERY_PURPOSE,
          expiresAt: new Date(now.getTime() + TEXT_QUERY_LEASE_TTL_MS),
        },
      });
    }

    return quota;
  });
}

export async function reserveAiQuery(input: {
  userId: string;
  isPaidVipActive?: boolean;
  now?: Date;
}) {
  return reserveAiQueryInternal(input);
}

export async function reserveAiQueryLease(input: {
  userId: string;
  now?: Date;
}) {
  const leaseToken = randomBytes(32).toString("base64url");
  const quota = await reserveAiQueryInternal({
    ...input,
    leaseTokenHash: hashLeaseToken(leaseToken),
  });

  return { quota, leaseToken };
}

export async function finalizeAiQueryLease({
  userId,
  leaseToken,
  finalizedAt = new Date(),
}: {
  userId: string;
  leaseToken: string;
  finalizedAt?: Date;
}) {
  const finalized = await prisma.aiQueryReservation.updateMany({
    where: {
      userId,
      tokenHash: hashLeaseToken(leaseToken),
      purpose: TEXT_QUERY_PURPOSE,
      consumedAt: null,
    },
    data: { consumedAt: finalizedAt },
  });

  return finalized.count === 1;
}

export async function releaseAiQueryLease({
  userId,
  leaseToken,
  reservedAt,
}: {
  userId: string;
  leaseToken: string;
  reservedAt: Date;
}) {
  const { dayKey } = getIstanbulAiQueryWindow(reservedAt);

  return prisma.$transaction(async (transaction) => {
    const claimedLease = await transaction.aiQueryReservation.updateMany({
      where: {
        userId,
        tokenHash: hashLeaseToken(leaseToken),
        dayKey,
        purpose: TEXT_QUERY_PURPOSE,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });

    if (claimedLease.count !== 1) {
      return false;
    }

    const released = await transaction.aiDailyQueryUsage.updateMany({
      where: {
        userId,
        dayKey,
        queryCount: { gt: 0 },
      },
      data: { queryCount: { decrement: 1 } },
    });

    return released.count === 1;
  });
}
