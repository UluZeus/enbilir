import { beforeEach, describe, expect, it, vi } from "vitest";

const quotaMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: quotaMocks.transaction,
  },
}));

import {
  DailyAiQueryLimitReachedError,
  reserveAiQuery,
} from "@/lib/ai-query-quota";

describe("release gate: daily AI quota reservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quotaMocks.transaction.mockImplementation(
      (callback: (transaction: unknown) => unknown) => callback({
        aiDailyQueryUsage: { upsert: quotaMocks.upsert },
      }),
    );
  });

  it.each([
    { paid: false, allowedCount: 10, rejectedCount: 11 },
    { paid: true, allowedCount: 15, rejectedCount: 16 },
  ])("enforces the $allowedCount-query allowance atomically for paid=$paid", async ({
    paid,
    allowedCount,
    rejectedCount,
  }) => {
    quotaMocks.upsert.mockResolvedValueOnce({ queryCount: allowedCount });

    await expect(reserveAiQuery({
      userId: "user-release-gate",
      isPaidVipActive: paid,
      now: new Date("2026-07-28T12:00:00.000Z"),
    })).resolves.toMatchObject({
      limit: allowedCount,
      used: allowedCount,
      remaining: 0,
    });

    quotaMocks.upsert.mockResolvedValueOnce({ queryCount: rejectedCount });

    await expect(reserveAiQuery({
      userId: "user-release-gate",
      isPaidVipActive: paid,
      now: new Date("2026-07-28T12:00:00.000Z"),
    })).rejects.toMatchObject({
      name: DailyAiQueryLimitReachedError.name,
      quota: {
        limit: allowedCount,
        used: allowedCount,
        remaining: 0,
      },
    });

    expect(quotaMocks.transaction).toHaveBeenCalledTimes(2);
    expect(quotaMocks.upsert).toHaveBeenLastCalledWith({
      where: {
        userId_dayKey: {
          userId: "user-release-gate",
          dayKey: "2026-07-28",
        },
      },
      create: {
        userId: "user-release-gate",
        dayKey: "2026-07-28",
        queryCount: 1,
      },
      update: { queryCount: { increment: 1 } },
      select: { queryCount: true },
    });
  });
});
