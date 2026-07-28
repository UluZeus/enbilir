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
    })).rejects.toThrow("eşleşmiyor");

    expect(claimMocks.activate).not.toHaveBeenCalled();
    expect(claimMocks.claimUpdate).not.toHaveBeenCalled();
  });

  it("rejects fractional or excessive subscription periods", async () => {
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
      amountTry: 150,
    })).rejects.toThrow("tam katı");
    await expect(activateVipSubscriptionClaimFromWebhook({
      claimId: "claim-1",
      providerReference: "PARAM-EXPECTED",
      amountTry: 1_300,
    })).rejects.toThrow("tam katı");

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
      amountTry: 200,
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
      amountTry: 200,
      months: 2,
      rawPayload: { fixture: true },
    }));
    expect(claimMocks.claimUpdate).toHaveBeenCalledWith({
      where: { id: "claim-1" },
      data: expect.objectContaining({
        status: "APPROVED",
        amountTry: 200,
        reviewedBy: "SYSTEM_VERIFIED_PAYMENT",
        reviewedAt: expect.any(Date),
      }),
    });
  });

  it("requires payer identity confirmation for manual approval", async () => {
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
      reviewerEmail: "admin@example.test",
      decision: "APPROVE",
      amountTry: 100,
      payerIdentityConfirmed: false,
    })).rejects.toThrow("eşleştiğini onaylamalısınız");

    expect(claimMocks.activate).not.toHaveBeenCalled();
  });
});
