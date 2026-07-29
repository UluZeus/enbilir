import { beforeEach, describe, expect, it, vi } from "vitest";

const noticeMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdateMany: vi.fn(),
  periodUpsert: vi.fn(),
  periodUpdateMany: vi.fn(),
  periodFindUnique: vi.fn(),
  entryCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: noticeMocks.transaction,
  },
}));

import {
  claimMemberNotice,
  getIstanbulSupportMonth,
  suppressMemberNotice,
} from "@/lib/member-notices";

describe("account-bound member support notices", () => {
  const transactionClient = {
    user: {
      findUnique: noticeMocks.userFindUnique,
      updateMany: noticeMocks.userUpdateMany,
    },
    supportReminderPeriod: {
      upsert: noticeMocks.periodUpsert,
      updateMany: noticeMocks.periodUpdateMany,
      findUnique: noticeMocks.periodFindUnique,
    },
    supportReminderEntry: {
      create: noticeMocks.entryCreate,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    noticeMocks.transaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) => callback(transactionClient),
    );
    noticeMocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      isActive: true,
      supportIntroShownAt: new Date("2026-06-01T09:00:00.000Z"),
      membershipTier: "STANDARD",
      vipPaidUntil: null,
      vipSubscriptionClaims: [],
    });
    noticeMocks.periodUpsert.mockResolvedValue({
      id: "period-1",
      onsitePromptCount: 0,
      suppressedAt: null,
    });
    noticeMocks.entryCreate.mockResolvedValue({ id: "entry-1" });
    noticeMocks.periodUpdateMany.mockResolvedValue({ count: 1 });
    noticeMocks.periodFindUnique.mockResolvedValue({ onsitePromptCount: 1 });
  });

  it("uses Istanbul month boundaries, including year rollover", () => {
    expect(getIstanbulSupportMonth(new Date("2026-12-31T20:59:59.999Z"))).toMatchObject({
      periodKey: "2026-12",
      dayOfMonth: 31,
    });
    expect(getIstanbulSupportMonth(new Date("2026-12-31T21:00:00.000Z"))).toMatchObject({
      periodKey: "2027-01",
      dayOfMonth: 1,
    });
  });

  it("atomically caps monthly prompts at three and stores only the token hash", async () => {
    await expect(claimMemberNotice({
      userId: "user-1",
      entryToken: "synthetic-entry-token-1234",
      now: new Date("2026-07-29T12:00:00.000Z"),
    })).resolves.toEqual({
      kind: "MONTHLY_SUPPORT",
      periodKey: "2026-07",
    });

    expect(noticeMocks.entryCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        periodId: "period-1",
        entryTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
    expect(noticeMocks.entryCreate.mock.calls[0][0].data.entryTokenHash).not.toContain("synthetic-entry-token");
    expect(noticeMocks.periodUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "period-1",
        onsitePromptCount: { lt: 3 },
        suppressedAt: null,
      },
      data: {
        onsitePromptCount: { increment: 1 },
      },
    });

    noticeMocks.periodUpdateMany.mockResolvedValueOnce({ count: 0 });
    await expect(claimMemberNotice({
      userId: "user-1",
      entryToken: "synthetic-entry-token-5678",
      now: new Date("2026-07-29T12:00:00.000Z"),
    })).resolves.toBeNull();
    expect(noticeMocks.entryCreate).toHaveBeenCalledTimes(1);
  });

  it("does not create entry rows for capped or suppressed periods", async () => {
    noticeMocks.periodUpsert.mockResolvedValueOnce({
      id: "period-1",
      onsitePromptCount: 3,
      suppressedAt: null,
    });
    noticeMocks.periodUpdateMany.mockResolvedValueOnce({ count: 0 });

    await expect(claimMemberNotice({
      userId: "user-1",
      entryToken: "synthetic-entry-token-capped",
      now: new Date("2026-07-29T12:00:00.000Z"),
    })).resolves.toBeNull();
    expect(noticeMocks.entryCreate).not.toHaveBeenCalled();

    noticeMocks.userFindUnique.mockResolvedValueOnce({
      id: "user-1",
      isActive: true,
      supportIntroShownAt: null,
      membershipTier: "STANDARD",
      vipPaidUntil: null,
      vipSubscriptionClaims: [],
    });
    noticeMocks.periodUpsert.mockResolvedValueOnce({
      id: "period-1",
      onsitePromptCount: 0,
      suppressedAt: new Date("2026-07-01T10:00:00.000Z"),
    });

    await expect(claimMemberNotice({
      userId: "user-1",
      entryToken: "synthetic-entry-token-suppressed",
      now: new Date("2026-07-29T12:00:00.000Z"),
    })).resolves.toBeNull();
    expect(noticeMocks.entryCreate).not.toHaveBeenCalled();
    expect(noticeMocks.userUpdateMany).not.toHaveBeenCalled();
  });

  it("increments first, then lets duplicate entry failure roll back the transaction", async () => {
    noticeMocks.entryCreate.mockRejectedValueOnce({ code: "P2002" });

    await expect(claimMemberNotice({
      userId: "user-1",
      entryToken: "synthetic-entry-token-duplicate",
      now: new Date("2026-07-29T12:00:00.000Z"),
    })).resolves.toBeNull();

    expect(noticeMocks.periodUpdateMany).toHaveBeenCalledTimes(1);
    expect(noticeMocks.entryCreate).toHaveBeenCalledTimes(1);
    expect(noticeMocks.periodUpdateMany.mock.invocationCallOrder[0])
      .toBeLessThan(noticeMocks.entryCreate.mock.invocationCallOrder[0]);
  });

  it("shows the one-time introduction and counts it toward the monthly maximum of three", async () => {
    noticeMocks.userFindUnique.mockResolvedValueOnce({
      id: "user-1",
      isActive: true,
      supportIntroShownAt: null,
      membershipTier: "STANDARD",
      vipPaidUntil: null,
      vipSubscriptionClaims: [],
    });
    noticeMocks.userUpdateMany.mockResolvedValueOnce({ count: 1 });

    await expect(claimMemberNotice({
      userId: "user-1",
      entryToken: "synthetic-entry-token-1234",
      now: new Date("2026-07-29T12:00:00.000Z"),
    })).resolves.toEqual({
      kind: "ONBOARDING",
      periodKey: "ai-cost-support-v1",
    });
    expect(noticeMocks.periodUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "period-1",
        onsitePromptCount: { lt: 3 },
        suppressedAt: null,
      },
      data: {
        onsitePromptCount: { increment: 1 },
      },
    });
  });

  it("lets onboarding suppression close every remaining support prompt in the current month", async () => {
    await suppressMemberNotice({
      userId: "user-1",
      kind: "ONBOARDING",
      now: new Date("2026-07-29T12:00:00.000Z"),
    });

    expect(noticeMocks.periodUpsert).toHaveBeenCalledWith({
      where: {
        userId_periodKey: {
          userId: "user-1",
          periodKey: "2026-07",
        },
      },
      create: {
        userId: "user-1",
        periodKey: "2026-07",
        suppressedAt: new Date("2026-07-29T12:00:00.000Z"),
      },
      update: {
        suppressedAt: new Date("2026-07-29T12:00:00.000Z"),
      },
    });
  });

  it.each([
    {
      membershipTier: "VIP",
      vipPaidUntil: new Date("2026-08-29T12:00:00.000Z"),
      vipSubscriptionClaims: [],
    },
    {
      membershipTier: "STANDARD",
      vipPaidUntil: null,
      vipSubscriptionClaims: [{ id: "pending-claim" }],
    },
  ])("suppresses active paid and pending-payment accounts", async (override) => {
    noticeMocks.userFindUnique.mockResolvedValueOnce({
      id: "user-1",
      isActive: true,
      supportIntroShownAt: null,
      ...override,
    });

    await expect(claimMemberNotice({
      userId: "user-1",
      entryToken: "synthetic-entry-token-1234",
      now: new Date("2026-07-29T12:00:00.000Z"),
    })).resolves.toBeNull();
    expect(noticeMocks.entryCreate).not.toHaveBeenCalled();
  });
});
