import "server-only";

import { appendAuditEvent } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export async function updateElectronicCommunicationConsent({
  userId,
  consent,
  now = new Date(),
}: {
  userId: string;
  consent: boolean;
  now?: Date;
}) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        electronicCommunicationConsent: true,
      },
    });
    if (!user) {
      throw new Error("İletişim tercihi güncellenecek hesap bulunamadı.");
    }
    if (user.electronicCommunicationConsent === consent) {
      return { reused: true, consent };
    }

    await transaction.user.update({
      where: { id: userId },
      data: consent
        ? {
          electronicCommunicationConsent: true,
          electronicCommunicationConsentAt: now,
        }
        : {
          electronicCommunicationConsent: false,
        },
    });
    await appendAuditEvent(transaction, {
      category: "PRIVACY",
      entityType: "User",
      entityId: userId,
      action: consent
        ? "ELECTRONIC_COMMUNICATION_CONSENT_GRANTED"
        : "ELECTRONIC_COMMUNICATION_CONSENT_WITHDRAWN",
      actorUserId: userId,
      payload: {
        source: "ACCOUNT_PREFERENCES",
        noticeVersion: "electronic-communication-v1",
      },
      createdAt: now,
    });

    return { reused: false, consent };
  });
}
