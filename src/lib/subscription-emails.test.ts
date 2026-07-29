import { beforeEach, describe, expect, it, vi } from "vitest";

const emailMocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  transaction: vi.fn(),
  candidatesFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  periodUpsert: vi.fn(),
  periodUpdateMany: vi.fn(),
  periodUpdate: vi.fn(),
  getPaymentUrl: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: emailMocks.sendEmail,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: emailMocks.transaction,
    user: {
      findMany: emailMocks.candidatesFindMany,
      findUnique: emailMocks.userFindUnique,
    },
    supportReminderPeriod: {
      update: emailMocks.periodUpdate,
    },
  },
}));
vi.mock("@/lib/param-vip-payment", () => ({
  getParamVipPaymentUrl: emailMocks.getPaymentUrl,
}));

import { runSubscriptionEmailJob } from "@/lib/subscription-emails";

const now = new Date("2026-07-10T09:00:00.000Z");
const eligibleUser = {
  id: "user-1",
  name: "Synthetic Member",
  email: "member@example.test",
  isActive: true,
  electronicCommunicationConsent: true,
  createdAt: new Date("2026-05-01T09:00:00.000Z"),
  membershipTier: "STANDARD",
  vipPaidUntil: null,
  vipSubscriptionClaims: [],
};

describe("monthly VIP support email", () => {
  const transactionClient = {
    user: {
      findUnique: emailMocks.userFindUnique,
    },
    supportReminderPeriod: {
      upsert: emailMocks.periodUpsert,
      updateMany: emailMocks.periodUpdateMany,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    emailMocks.candidatesFindMany.mockResolvedValue([eligibleUser]);
    emailMocks.userFindUnique.mockResolvedValue(eligibleUser);
    emailMocks.periodUpsert.mockResolvedValue({ id: "period-1" });
    emailMocks.periodUpdateMany.mockResolvedValue({ count: 1 });
    emailMocks.periodUpdate.mockResolvedValue({ id: "period-1" });
    emailMocks.sendEmail.mockResolvedValue({ skipped: false });
    emailMocks.getPaymentUrl.mockReturnValue(null);
    emailMocks.transaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) => callback(transactionClient),
    );
  });

  it("claims the monthly attempt before SMTP and records success without a live non-production URL", async () => {
    await expect(runSubscriptionEmailJob({ now })).resolves.toMatchObject({
      due: 1,
      sent: 1,
      failed: 0,
    });

    expect(emailMocks.periodUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "period-1",
        emailAttemptedAt: null,
      },
      data: {
        emailAttemptedAt: now,
        emailStatus: "CLAIMED",
        emailError: null,
      },
    });
    expect(emailMocks.candidatesFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        supportReminderPeriods: {
          none: {
            periodKey: "2026-07",
            emailAttemptedAt: { not: null },
          },
        },
      }),
    }));
    expect(emailMocks.periodUpdateMany.mock.invocationCallOrder[0])
      .toBeLessThan(emailMocks.sendEmail.mock.invocationCallOrder[0]);
    expect(emailMocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "member@example.test",
      text: expect.stringContaining("günlük 10"),
      html: expect.not.stringContaining("isyerim.param.com.tr"),
    }));
    expect(emailMocks.periodUpdate).toHaveBeenCalledWith({
      where: { id: "period-1" },
      data: {
        emailStatus: "SENT",
        emailSentAt: now,
        emailError: null,
      },
    });
  });

  it("allows only one SMTP call across concurrent monthly jobs", async () => {
    emailMocks.periodUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const results = await Promise.all([
      runSubscriptionEmailJob({ now }),
      runSubscriptionEmailJob({ now }),
    ]);

    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(results.reduce((total, result) => total + result.sent, 0)).toBe(1);
  });

  it("re-checks withdrawn consent after claiming and cancels before SMTP", async () => {
    emailMocks.userFindUnique
      .mockResolvedValueOnce(eligibleUser)
      .mockResolvedValueOnce({
        ...eligibleUser,
        electronicCommunicationConsent: false,
      });

    await expect(runSubscriptionEmailJob({ now })).resolves.toMatchObject({
      sent: 0,
      failed: 0,
    });

    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    expect(emailMocks.periodUpdate).toHaveBeenCalledWith({
      where: { id: "period-1" },
      data: {
        emailStatus: "CANCELLED",
        emailError: "CONSENT_OR_ELIGIBILITY_CHANGED",
      },
    });
  });

  it("excludes active paid and pending-payment accounts", async () => {
    emailMocks.candidatesFindMany.mockResolvedValueOnce([
      {
        ...eligibleUser,
        membershipTier: "VIP",
        vipPaidUntil: new Date("2026-08-01T09:00:00.000Z"),
      },
      {
        ...eligibleUser,
        id: "user-2",
        email: "pending@example.test",
        vipSubscriptionClaims: [{ id: "claim-1" }],
      },
    ]);

    await expect(runSubscriptionEmailJob({ now })).resolves.toMatchObject({
      due: 0,
      sent: 0,
    });
    expect(emailMocks.transaction).not.toHaveBeenCalled();
    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
  });
});
