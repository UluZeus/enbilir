import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { membershipConfig } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

type ActivateVipInput = {
  email: string;
  providerReference: string;
  amountTry: number;
  paidAt?: Date;
  months?: number;
  rawPayload?: unknown;
};

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export async function activateVipSubscription(input: ActivateVipInput) {
  const email = input.email.trim().toLowerCase();
  const providerReference = input.providerReference.trim();
  const months = Math.max(1, Math.min(12, Math.trunc(input.months ?? 1)));
  const paidAt = input.paidAt ?? new Date();

  if (!email || !providerReference) {
    throw new Error("E-posta ve ödeme referansı zorunludur.");
  }

  if (!Number.isFinite(input.amountTry) || input.amountTry < membershipConfig.vipMonthlyAmountTry * months) {
    throw new Error("Ödeme tutarı seçilen VIP süresi için yetersiz.");
  }

  const existingPayment = await prisma.vipSubscriptionPayment.findUnique({
    where: { providerReference },
    select: { id: true, userId: true, paidUntil: true },
  });

  if (existingPayment) {
    return { reused: true, paymentId: existingPayment.id, userId: existingPayment.userId, paidUntil: existingPayment.paidUntil };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, vipPaidUntil: true },
  });

  if (!user) {
    throw new Error("Ödemeyle eşleşen Enbilir kullanıcısı bulunamadı.");
  }

  const startAt = user.vipPaidUntil && user.vipPaidUntil > paidAt ? user.vipPaidUntil : paidAt;
  const paidUntil = addMonths(startAt, months);
  const result = await prisma.$transaction(async (transaction) => {
    const payment = await transaction.vipSubscriptionPayment.create({
      data: {
        userId: user.id,
        providerReference,
        amountTry: input.amountTry,
        paidAt,
        paidUntil,
        rawPayload: (input.rawPayload ?? {}) as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    await transaction.user.update({
      where: { id: user.id },
      data: {
        membershipTier: "VIP",
        vipStartedAt: paidAt,
        vipPaidUntil: paidUntil,
        vipLastReminderSentAt: null,
      },
    });

    return payment;
  });

  return { reused: false, paymentId: result.id, userId: user.id, paidUntil };
}
