import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appendAudit: vi.fn(),
  claimUpdateMany: vi.fn(),
  paymentCreate: vi.fn(),
  paymentFindFirst: vi.fn(),
  paymentFindMany: vi.fn(),
  paymentUpdate: vi.fn(),
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

vi.mock("@/lib/audit-log", () => ({
  appendAuditEvent: mocks.appendAudit,
}));

import {
  activateVipSubscriptionInTransaction,
  revokeVipSubscription,
} from "@/lib/vip-subscription";

describe("VIP entitlement recomputation after reversal", () => {
  const transactionClient = {
    vipSubscriptionPayment: {
      create: mocks.paymentCreate,
      findFirst: mocks.paymentFindFirst,
      findMany: mocks.paymentFindMany,
      update: mocks.paymentUpdate,
    },
    vipSubscriptionClaim: { updateMany: mocks.claimUpdateMany },
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-20T12:00:00.000Z"));
    mocks.transaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) => callback(transactionClient),
    );
    mocks.paymentFindFirst.mockResolvedValue({
      id: "payment-1",
      userId: "beneficiary-1",
      status: "PAID",
    });
    mocks.paymentFindMany.mockResolvedValue([
      {
        id: "payment-2",
        paidAt: new Date("2026-01-15T12:00:00.000Z"),
        paidUntil: new Date("2026-03-01T12:00:00.000Z"),
      },
      {
        id: "payment-3",
        paidAt: new Date("2026-02-10T12:00:00.000Z"),
        paidUntil: new Date("2026-04-01T12:00:00.000Z"),
      },
    ]);
    mocks.paymentUpdate.mockResolvedValue({ id: "payment" });
    mocks.paymentCreate.mockResolvedValue({ id: "payment-new" });
    mocks.claimUpdateMany.mockResolvedValue({ count: 1 });
    mocks.userUpdate.mockResolvedValue({ id: "beneficiary-1" });
    mocks.appendAudit.mockResolvedValue({ id: "audit-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes the refunded earlier service month from later stacked payments", async () => {
    await expect(revokeVipSubscription({
      provider: "PARAM",
      providerReference: "PARAM-REF-1",
      reason: "REFUNDED",
      actorPrincipal: "VIP_PAYMENT_WEBHOOK",
    })).resolves.toMatchObject({ reused: false, paymentId: "payment-1" });

    expect(mocks.paymentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: "beneficiary-1",
        status: "PAID",
        revokedAt: null,
      },
      orderBy: [{ paidAt: "asc" }, { id: "asc" }],
      select: { id: true, paidUntil: true, paidAt: true },
    }));
    expect(mocks.paymentUpdate).toHaveBeenCalledWith({
      where: { id: "payment-2" },
      data: { paidUntil: new Date("2026-02-15T12:00:00.000Z") },
    });
    expect(mocks.paymentUpdate).toHaveBeenCalledWith({
      where: { id: "payment-3" },
      data: { paidUntil: new Date("2026-03-15T12:00:00.000Z") },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "beneficiary-1" },
      data: {
        membershipTier: "VIP",
        vipStartedAt: new Date("2026-01-15T12:00:00.000Z"),
        vipPaidUntil: new Date("2026-03-15T12:00:00.000Z"),
        vipLastReminderSentAt: null,
      },
    });
  });

  it("attributes automated reversal to the service principal and keeps the beneficiary separate", async () => {
    await revokeVipSubscription({
      providerReference: "PARAM-REF-1",
      reason: "CHARGEBACK",
      actorPrincipal: "VIP_PAYMENT_WEBHOOK",
    });

    expect(mocks.appendAudit).toHaveBeenCalledWith(transactionClient, expect.objectContaining({
      actorUserId: null,
      payload: expect.objectContaining({
        actorPrincipal: "VIP_PAYMENT_WEBHOOK",
        beneficiaryUserId: "beneficiary-1",
      }),
    }));
  });

  it("attributes an admin activation to the immutable admin id, not the beneficiary", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "beneficiary-1",
      vipStartedAt: null,
      vipPaidUntil: null,
    });
    mocks.paymentFindFirst.mockResolvedValue(null);

    await activateVipSubscriptionInTransaction(transactionClient as never, {
      email: "member@example.test",
      providerReference: "PARAM-REF-2",
      amountTry: 100,
      paidAt: new Date("2026-01-20T12:00:00.000Z"),
      actorUserId: "admin-1",
      actorPrincipal: "ADMIN_USER",
    });

    expect(mocks.appendAudit).toHaveBeenCalledWith(transactionClient, expect.objectContaining({
      actorUserId: "admin-1",
      payload: expect.objectContaining({
        actorPrincipal: "ADMIN_USER",
        beneficiaryUserId: "beneficiary-1",
      }),
    }));
  });
});
