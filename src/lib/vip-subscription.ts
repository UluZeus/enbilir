import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { membershipConfig } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import {
  canonicalizeVipPaymentReference,
  normalizeVipPaymentProvider,
  normalizeVipPaymentReference,
} from "@/lib/vip-subscription-claim-policy";

type ActivateVipInput = {
  email: string;
  provider?: string;
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

export async function activateVipSubscriptionInTransaction(
  transaction: Prisma.TransactionClient,
  input: ActivateVipInput,
) {
  const email = input.email.trim().toLowerCase();
  const provider = normalizeVipPaymentProvider(input.provider);
  const providerPaymentId = normalizeVipPaymentReference(input.providerReference, provider);
  const providerReference = canonicalizeVipPaymentReference(providerPaymentId, provider);
  const months = Math.max(1, Math.min(12, Math.trunc(input.months ?? 1)));
  const paidAt = input.paidAt ?? new Date();

  if (!email || !providerPaymentId) {
    throw new Error("E-posta ve ödeme referansı zorunludur.");
  }

  if (!Number.isFinite(input.amountTry) || input.amountTry < membershipConfig.vipMonthlyAmountTry * months) {
    throw new Error("Ödeme tutarı seçilen VIP süresi için yetersiz.");
  }

  const user = await transaction.user.findUnique({
    where: { email },
    select: { id: true, vipPaidUntil: true },
  });

  if (!user) {
    throw new Error("Ödemeyle eşleşen Enbilir kullanıcısı bulunamadı.");
  }

  const existingPayment = await transaction.vipSubscriptionPayment.findFirst({
    where: { OR: [{ providerReference }, { providerReference: providerPaymentId }] },
    select: { id: true, userId: true, paidUntil: true },
  });

  if (existingPayment) {
    if (existingPayment.userId !== user.id) {
      throw new Error("Bu ödeme referansı başka bir Enbilir hesabına bağlıdır.");
    }

    await transaction.vipSubscriptionClaim.updateMany({
      where: { userId: user.id, provider, providerReference: providerPaymentId, status: "PENDING" },
      data: { status: "APPROVED", amountTry: input.amountTry, reviewedBy: "SYSTEM_VERIFIED_PAYMENT", reviewedAt: paidAt },
    });

    return { reused: true, paymentId: existingPayment.id, userId: existingPayment.userId, paidUntil: existingPayment.paidUntil };
  }

  const startAt = user.vipPaidUntil && user.vipPaidUntil > paidAt ? user.vipPaidUntil : paidAt;
  const paidUntil = addMonths(startAt, months);
  const payment = await transaction.vipSubscriptionPayment.create({
    data: {
      userId: user.id,
      provider,
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
  await transaction.vipSubscriptionClaim.updateMany({
    where: { userId: user.id, provider, providerReference: providerPaymentId, status: "PENDING" },
    data: { status: "APPROVED", amountTry: input.amountTry, reviewedBy: "SYSTEM_VERIFIED_PAYMENT", reviewedAt: paidAt },
  });

  return { reused: false, paymentId: payment.id, userId: user.id, paidUntil };
}

export async function activateVipSubscription(input: ActivateVipInput) {
  return prisma.$transaction((transaction) => activateVipSubscriptionInTransaction(transaction, input));
}
