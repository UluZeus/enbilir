import { beforeEach, describe, expect, it, vi } from "vitest";

const submitMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  claimFindFirst: vi.fn(),
  recoveryFindFirst: vi.fn(),
  claimCount: vi.fn(),
  claimCreate: vi.fn(),
  paymentFindFirst: vi.fn(),
  appendAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: submitMocks.transaction,
    vipSubscriptionClaim: {
      findFirst: submitMocks.recoveryFindFirst,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({
  appendAuditEvent: submitMocks.appendAudit,
}));

import { submitVipSubscriptionClaim } from "@/lib/vip-subscription-claims";

describe("global Param claim ownership", () => {
  const transactionClient = {
    vipSubscriptionClaim: {
      findFirst: submitMocks.claimFindFirst,
      count: submitMocks.claimCount,
      create: submitMocks.claimCreate,
    },
    vipSubscriptionPayment: {
      findFirst: submitMocks.paymentFindFirst,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    submitMocks.transaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) => callback(transactionClient),
    );
    submitMocks.claimFindFirst.mockResolvedValue(null);
    submitMocks.paymentFindFirst.mockResolvedValue(null);
    submitMocks.claimCount.mockResolvedValue(0);
    submitMocks.claimCreate.mockResolvedValue({
      id: "claim-new",
      userId: "user-1",
      status: "PENDING",
    });
    submitMocks.appendAudit.mockResolvedValue({ id: "audit-1" });
  });

  it("rejects a live reference already bound to another account", async () => {
    submitMocks.claimFindFirst.mockResolvedValueOnce({
      id: "claim-other",
      userId: "user-2",
      status: "PENDING",
    });

    await expect(submitVipSubscriptionClaim({
      userId: "user-1",
      providerReference: "same-ref",
    })).rejects.toThrow("başka bir hesap");
    expect(submitMocks.claimCreate).not.toHaveBeenCalled();
    expect(submitMocks.claimFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { activeReferenceKey: "PARAM:SAME-REF" },
          { providerReference: "SAME-REF" },
        ],
      }),
    }));
  });

  it("reuses a rejected reference by assigning the canonical active key to the new claim", async () => {
    await expect(submitVipSubscriptionClaim({
      userId: "user-1",
      providerReference: "same-ref",
    })).resolves.toMatchObject({ reused: false, id: "claim-new" });
    expect(submitMocks.claimCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "user-1",
        providerReference: "SAME-REF",
        activeReferenceKey: "PARAM:SAME-REF",
      }),
    }));
  });

  it("recovers a concurrent unique-key loss globally and rejects the other owner", async () => {
    submitMocks.transaction.mockRejectedValueOnce({ code: "P2002" });
    submitMocks.recoveryFindFirst.mockResolvedValueOnce({
      id: "claim-other",
      userId: "user-2",
      status: "PENDING",
    });

    await expect(submitVipSubscriptionClaim({
      userId: "user-1",
      providerReference: "same-ref",
    })).rejects.toThrow("başka bir hesap");
    expect(submitMocks.recoveryFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        activeReferenceKey: "PARAM:SAME-REF",
      }),
    }));
  });
});
