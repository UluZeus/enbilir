import { beforeEach, describe, expect, it, vi } from "vitest";

const consentMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  appendAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: consentMocks.transaction,
  },
}));
vi.mock("@/lib/audit-log", () => ({
  appendAuditEvent: consentMocks.appendAudit,
}));

import { updateElectronicCommunicationConsent } from "@/lib/communication-consent";

describe("electronic communication consent preference", () => {
  const transactionClient = {
    user: {
      findUnique: consentMocks.findUnique,
      update: consentMocks.update,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consentMocks.transaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) => callback(transactionClient),
    );
    consentMocks.update.mockResolvedValue({ id: "user-1" });
    consentMocks.appendAudit.mockResolvedValue({ id: "audit-1" });
  });

  it("withdraws consent for the session-bound account and leaves an auditable event", async () => {
    const now = new Date("2026-07-29T12:00:00.000Z");
    consentMocks.findUnique.mockResolvedValue({
      id: "user-1",
      electronicCommunicationConsent: true,
    });

    await expect(updateElectronicCommunicationConsent({
      userId: "user-1",
      consent: false,
      now,
    })).resolves.toEqual({ reused: false, consent: false });

    expect(consentMocks.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        electronicCommunicationConsent: false,
      },
    });
    expect(consentMocks.appendAudit).toHaveBeenCalledWith(
      transactionClient,
      expect.objectContaining({
        category: "PRIVACY",
        entityType: "User",
        entityId: "user-1",
        action: "ELECTRONIC_COMMUNICATION_CONSENT_WITHDRAWN",
        actorUserId: "user-1",
        createdAt: now,
      }),
    );
  });

  it("does not duplicate an audit event when the preference is unchanged", async () => {
    consentMocks.findUnique.mockResolvedValue({
      id: "user-1",
      electronicCommunicationConsent: false,
    });

    await expect(updateElectronicCommunicationConsent({
      userId: "user-1",
      consent: false,
    })).resolves.toEqual({ reused: true, consent: false });
    expect(consentMocks.update).not.toHaveBeenCalled();
    expect(consentMocks.appendAudit).not.toHaveBeenCalled();
  });
});
