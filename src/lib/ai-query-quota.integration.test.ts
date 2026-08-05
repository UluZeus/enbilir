import { beforeEach, describe, expect, it, vi } from "vitest";

const quotaMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  upsert: vi.fn(),
  userFindUnique: vi.fn(),
  updateMany: vi.fn(),
  reservationCreate: vi.fn(),
  reservationUpdateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: quotaMocks.transaction,
    aiQueryReservation: { updateMany: quotaMocks.reservationUpdateMany },
  },
}));

import {
  DailyAiQueryLimitReachedError,
  finalizeAiQueryLease,
  releaseAiQueryLease,
  reserveAiQuery,
  reserveAiQueryLease,
} from "@/lib/ai-query-quota";

describe("release gate: daily AI quota reservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quotaMocks.transaction.mockImplementation(
      (callback: (transaction: unknown) => unknown) => callback({
        user: { findUnique: quotaMocks.userFindUnique },
        aiQueryReservation: {
          create: quotaMocks.reservationCreate,
          updateMany: quotaMocks.reservationUpdateMany,
        },
        aiDailyQueryUsage: {
          upsert: quotaMocks.upsert,
          updateMany: quotaMocks.updateMany,
        },
      }),
    );
    quotaMocks.userFindUnique.mockResolvedValue({
      membershipTier: "STANDARD",
      vipPaidUntil: null,
    });
    quotaMocks.updateMany.mockResolvedValue({ count: 1 });
    quotaMocks.reservationCreate.mockResolvedValue({ id: "lease-1" });
    quotaMocks.reservationUpdateMany.mockResolvedValue({ count: 1 });
  });

  it.each([
    { paid: false, allowedCount: 10, rejectedCount: 11 },
    { paid: true, allowedCount: 15, rejectedCount: 16 },
  ])("enforces the $allowedCount-query allowance atomically for paid=$paid", async ({
    paid,
    allowedCount,
    rejectedCount,
  }) => {
    quotaMocks.userFindUnique.mockResolvedValue({
      membershipTier: paid ? "VIP" : "STANDARD",
      vipPaidUntil: paid ? new Date("2026-08-28T12:00:00.000Z") : null,
    });
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

  it("uses the entitlement reread inside the quota transaction instead of a stale caller flag", async () => {
    quotaMocks.userFindUnique.mockResolvedValue({
      membershipTier: "STANDARD",
      vipPaidUntil: null,
    });
    quotaMocks.upsert.mockResolvedValue({ queryCount: 11 });

    await expect(reserveAiQuery({
      userId: "user-release-gate",
      isPaidVipActive: true,
      now: new Date("2026-07-28T12:00:00.000Z"),
    })).rejects.toMatchObject({
      quota: { limit: 10, used: 10, remaining: 0, isPaidVipActive: false },
    });

    expect(quotaMocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: "user-release-gate" },
      select: { membershipTier: true, vipPaidUntil: true },
    });
  });

  it("stores a hashed lease in the same transaction as the quota increment", async () => {
    quotaMocks.upsert.mockResolvedValue({ queryCount: 1 });

    const reservation = await reserveAiQueryLease({
      userId: "user-release-gate",
      now: new Date("2026-07-28T12:00:00.000Z"),
    });

    expect(reservation.leaseToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(quotaMocks.reservationCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-release-gate",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        dayKey: "2026-07-28",
        purpose: "TEXT_CHAT_QUOTA",
        expiresAt: new Date("2026-07-28T12:15:00.000Z"),
      },
    });
    expect(quotaMocks.reservationCreate.mock.calls[0][0].data.tokenHash).not.toBe(reservation.leaseToken);
  });

  it("releases only the exact unfinished lease in its original Istanbul day window", async () => {
    const reservedAt = new Date("2026-07-28T20:59:59.000Z");
    const leaseToken = "A".repeat(43);

    await expect(releaseAiQueryLease({
      userId: "user-release-gate",
      leaseToken,
      reservedAt,
    })).resolves.toBe(true);

    expect(quotaMocks.reservationUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-release-gate",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        dayKey: "2026-07-28",
        purpose: "TEXT_CHAT_QUOTA",
        consumedAt: null,
      },
      data: { consumedAt: expect.any(Date) },
    });
    expect(quotaMocks.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-release-gate",
        dayKey: "2026-07-28",
        queryCount: { gt: 0 },
      },
      data: { queryCount: { decrement: 1 } },
    });

    quotaMocks.reservationUpdateMany.mockResolvedValueOnce({ count: 0 });
    await expect(releaseAiQueryLease({
      userId: "user-release-gate",
      leaseToken,
      reservedAt,
    })).resolves.toBe(false);
    expect(quotaMocks.updateMany).toHaveBeenCalledTimes(1);
  });

  it("finalizes the exact lease so later release cannot reclaim it", async () => {
    const finalizedAt = new Date("2026-07-28T12:01:00.000Z");

    await expect(finalizeAiQueryLease({
      userId: "user-release-gate",
      leaseToken: "B".repeat(43),
      finalizedAt,
    })).resolves.toBe(true);

    expect(quotaMocks.reservationUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-release-gate",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        purpose: "TEXT_CHAT_QUOTA",
        consumedAt: null,
      },
      data: { consumedAt: finalizedAt },
    });
  });
});
