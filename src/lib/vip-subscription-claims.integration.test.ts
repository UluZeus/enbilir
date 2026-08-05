import { beforeEach, describe, expect, it, vi } from "vitest";

const claimMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  claimFindUnique: vi.fn(),
  claimUpdate: vi.fn(),
  paymentFindFirst: vi.fn(),
  activate: vi.fn(),
  appendAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: claimMocks.transaction,
  },
}));

vi.mock("@/lib/vip-subscription", () => ({
  activateVipSubscriptionInTransaction: claimMocks.activate,
}));

vi.mock("@/lib/audit-log", () => ({
  appendAuditEvent: claimMocks.appendAudit,
}));

import {
  activateVipSubscriptionClaimFromWebhook,
  reviewVipSubscriptionClaim,
} from "@/lib/vip-subscription-claims";

describe("release gate: account-bound VIP claim activation", () => {
  const transactionClient = {
    vipSubscriptionClaim: {
      findUnique: claimMocks.claimFindUnique,
      update: claimMocks.claimUpdate,
    },
    vipSubscriptionPayment: {
      findFirst: claimMocks.paymentFindFirst,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    claimMocks.transaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) => callback(transactionClient),
    );
    claimMocks.claimUpdate.mockResolvedValue({ id: "claim-1" });
    claimMocks.appendAudit.mockResolvedValue({ id: "audit-1" });
    claimMocks.activate.mockResolvedValue({
      reused: false,
      paymentId: "payment-1",
      userId: "user-1",
    });
  });

  it("rejects a webhook reference that is not the pending claim reference", async () => {
    claimMocks.claimFindUnique.mockResolvedValue({
      id: "claim-1",
      userId: "user-1",
      provider: "PARAM",
      providerReference: "PARAM-EXPECTED",
      amountTry: 100,
      status: "PENDING",
      user: { email: "member@example.test" },
    });

    await expect(activateVipSubscriptionClaimFromWebhook({
      claimId: "claim-1",
      providerReference: "PARAM-OTHER",
      amountTry: 100,
      currency: "TRY",
      payerEmail: "member@example.test",
    })).rejects.toThrow("eşleşmiyor");

    expect(claimMocks.activate).not.toHaveBeenCalled();
    expect(claimMocks.claimUpdate).not.toHaveBeenCalled();
  });

  it("rejects every amount other than exactly one 100 TRY month", async () => {
    claimMocks.claimFindUnique.mockResolvedValue({
      id: "claim-1",
      userId: "user-1",
      provider: "PARAM",
      providerReference: "PARAM-EXPECTED",
      amountTry: 100,
      status: "PENDING",
      user: { email: "member@example.test" },
    });

    await expect(activateVipSubscriptionClaimFromWebhook({
      claimId: "claim-1",
      providerReference: "PARAM-EXPECTED",
      amountTry: 99,
      currency: "TRY",
      payerEmail: "member@example.test",
    })).rejects.toThrow("tam 100 TL");
    await expect(activateVipSubscriptionClaimFromWebhook({
      claimId: "claim-1",
      providerReference: "PARAM-EXPECTED",
      amountTry: 200,
      currency: "TRY",
      payerEmail: "member@example.test",
    })).rejects.toThrow("tam 100 TL");
    await expect(activateVipSubscriptionClaimFromWebhook({
      claimId: "claim-1",
      providerReference: "PARAM-EXPECTED",
      amountTry: 100,
      currency: "EUR",
      payerEmail: "member@example.test",
    })).rejects.toThrow("TRY");

    expect(claimMocks.activate).not.toHaveBeenCalled();
  });

  it("activates only the matched pending claim and records its approval", async () => {
    claimMocks.claimFindUnique.mockResolvedValue({
      id: "claim-1",
      userId: "user-1",
      provider: "PARAM",
      providerReference: "PARAM-EXPECTED",
      amountTry: 100,
      status: "PENDING",
      user: { email: "member@example.test" },
    });

    await expect(activateVipSubscriptionClaimFromWebhook({
      claimId: "claim-1",
      providerReference: "PARAM-EXPECTED",
      amountTry: 100,
      currency: "TRY",
      payerEmail: "member@example.test",
      rawPayload: { fixture: true },
    })).resolves.toMatchObject({
      reused: false,
      paymentId: "payment-1",
      userId: "user-1",
    });

    expect(claimMocks.activate).toHaveBeenCalledWith(transactionClient, expect.objectContaining({
      email: "member@example.test",
      provider: "PARAM",
      providerReference: "PARAM-EXPECTED",
      amountTry: 100,
      currency: "TRY",
      rawPayload: { fixture: true },
    }));
    expect(claimMocks.claimUpdate).toHaveBeenCalledWith({
      where: { id: "claim-1" },
      data: expect.objectContaining({
        status: "APPROVED",
        amountTry: 100,
        reviewedBy: "SYSTEM_VERIFIED_PAYMENT",
        reviewedAt: expect.any(Date),
        verifiedPayerEmail: "member@example.test",
        verifiedCurrency: "TRY",
        verifiedAmountTry: 100,
      }),
    });
  });

  it("requires a typed payer email matching the bound account", async () => {
    claimMocks.claimFindUnique.mockResolvedValue({
      id: "claim-1",
      userId: "user-1",
      provider: "PARAM",
      providerReference: "PARAM-EXPECTED",
      amountTry: 100,
      status: "PENDING",
      user: { email: "member@example.test" },
    });

    await expect(reviewVipSubscriptionClaim({
      claimId: "claim-1",
      reviewerUserId: "admin-1",
      reviewerEmail: "admin@example.test",
      decision: "APPROVE",
      amountTry: 100,
      currency: "TRY",
      payerEmail: "other@example.test",
    })).rejects.toThrow("eşleşmelidir");

    expect(claimMocks.activate).not.toHaveBeenCalled();
  });

  it("passes the immutable admin user id as the activation audit actor", async () => {
    claimMocks.claimFindUnique.mockResolvedValue({
      id: "claim-1",
      userId: "user-1",
      provider: "PARAM",
      providerReference: "PARAM-EXPECTED",
      amountTry: 100,
      status: "PENDING",
      user: { email: "member@example.test" },
    });

    await reviewVipSubscriptionClaim({
      claimId: "claim-1",
      reviewerUserId: "admin-1",
      reviewerEmail: "admin@example.test",
      decision: "APPROVE",
      amountTry: 100,
      currency: "TRY",
      payerEmail: "member@example.test",
    });

    expect(claimMocks.activate).toHaveBeenCalledWith(transactionClient, expect.objectContaining({
      actorUserId: "admin-1",
      actorPrincipal: "ADMIN_USER",
    }));
    expect(claimMocks.appendAudit).toHaveBeenCalledWith(transactionClient, expect.objectContaining({
      actorUserId: "admin-1",
    }));
  });

  it("rejects a webhook payer email that does not match the bound account", async () => {
    claimMocks.claimFindUnique.mockResolvedValue({
      id: "claim-1",
      userId: "user-1",
      provider: "PARAM",
      providerReference: "PARAM-EXPECTED",
      amountTry: 100,
      status: "PENDING",
      user: { email: "member@example.test" },
    });

    await expect(activateVipSubscriptionClaimFromWebhook({
      claimId: "claim-1",
      providerReference: "PARAM-EXPECTED",
      amountTry: 100,
      currency: "TRY",
      payerEmail: "other@example.test",
    })).rejects.toThrow("eşleşmelidir");
    expect(claimMocks.activate).not.toHaveBeenCalled();
  });

  it("returns the verified existing payment after a concurrent duplicate activation collision", async () => {
    claimMocks.claimFindUnique
      .mockResolvedValueOnce({
        id: "claim-1",
        userId: "user-1",
        provider: "PARAM",
        providerReference: "PARAM-EXPECTED",
        amountTry: 100,
        status: "PENDING",
        user: { email: "member@example.test" },
      })
      .mockResolvedValueOnce({
        id: "claim-1",
        userId: "user-1",
        provider: "PARAM",
        providerReference: "PARAM-EXPECTED",
        status: "APPROVED",
        user: { email: "member@example.test" },
      });
    claimMocks.activate.mockRejectedValueOnce({ code: "P2002" });
    claimMocks.paymentFindFirst.mockResolvedValue({
      id: "payment-existing",
      userId: "user-1",
      status: "PAID",
      paidUntil: new Date("2026-08-28T12:00:00.000Z"),
    });

    await expect(activateVipSubscriptionClaimFromWebhook({
      claimId: "claim-1",
      providerReference: "PARAM-EXPECTED",
      amountTry: 100,
      currency: "TRY",
      payerEmail: "member@example.test",
    })).resolves.toMatchObject({
      reused: true,
      paymentId: "payment-existing",
      userId: "user-1",
    });
  });
});
