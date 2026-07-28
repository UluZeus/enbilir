import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

type DurableRateLimitInput = {
  scope: string;
  identity: string;
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
};

function getHashSecret() {
  const secret = process.env.RATE_LIMIT_HASH_SECRET ?? process.env.AUTH_SECRET ?? process.env.SESSION_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_HASH_SECRET or AUTH_SECRET must be configured in production.");
  }

  return secret ?? "enbilir-local-rate-limit";
}

function getKeyHash(scope: string, identity: string) {
  return createHmac("sha256", getHashSecret())
    .update(`${scope}:${identity.trim().toLowerCase()}`)
    .digest("hex");
}

export async function consumeDurableRateLimit(input: DurableRateLimitInput, now = new Date()) {
  const keyHash = getKeyHash(input.scope, input.identity);

  return prisma.$transaction(async (transaction) => {
    const current = await transaction.securityRateLimit.findUnique({ where: { keyHash } });

    if (current?.blockedUntil && current.blockedUntil > now) {
      return { allowed: false, retryAt: current.blockedUntil };
    }

    const windowExpired = !current || now.getTime() - current.windowStart.getTime() >= input.windowMs;
    const nextCount = windowExpired ? 1 : current.count + 1;
    const blockedUntil = nextCount > input.maxAttempts
      ? new Date(now.getTime() + input.blockMs)
      : null;

    await transaction.securityRateLimit.upsert({
      where: { keyHash },
      create: {
        keyHash,
        scope: input.scope,
        windowStart: now,
        count: nextCount,
        blockedUntil,
      },
      update: {
        scope: input.scope,
        windowStart: windowExpired ? now : current.windowStart,
        count: nextCount,
        blockedUntil,
      },
    });

    return { allowed: blockedUntil === null, retryAt: blockedUntil };
  });
}
