import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { membershipConfig } from "@/lib/membership";
import {
  canonicalizeVipPaymentReference,
  normalizeVipPaymentProvider,
  normalizeVipPaymentReference,
} from "@/lib/vip-subscription-claim-policy";
import { appendAuditEvent } from "@/lib/audit-log";
import { withSerializableTransaction } from "@/lib/serializable-transaction";

type ActivateVipInput = {
  email: string;
  provider?: string;
  providerReference: string;
  amountTry: number;
  currency?: string;
  paidAt?: Date;
  rawPayload?: unknown;
  actorUserId?: string | null;
  actorPrincipal?: string;
};

type RevokeVipInput = {
  provider?: string;
  providerReference: string;
  reason: "REFUNDED" | "CHARGEBACK" | "REVOKED";
  rawPayload?: unknown;
  actorUserId?: string | null;
  actorPrincipal?: string;
};

export function addOneClampedCalendarMonth(date: Date) {
  const originalDay = date.getUTCDate();
  const next = new Date(date);
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDayOfTargetMonth = new Date(Date.UTC(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  next.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
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
  const paidAt = input.paidAt ?? new Date();
  const currency = (input.currency ?? "TRY").trim().toUpperCase();

  if (!email || !providerPaymentId) {
    throw new Error("E-posta ve ödeme referansı zorunludur.");
  }

  if (currency !== "TRY" || input.amountTry !== membershipConfig.vipMonthlyAmountTry) {
    throw new Error("VIP desteği için doğrulanmış ödeme tam 100 TL ve TRY olmalıdır.");
  }

  const user = await transaction.user.findUnique({
    where: { email },
    select: { id: true, vipStartedAt: true, vipPaidUntil: true },
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
  const paidUntil = addOneClampedCalendarMonth(startAt);
  const payment = await transaction.vipSubscriptionPayment.create({
    data: {
      userId: user.id,
      provider,
      providerReference,
      amountTry: input.amountTry,
      currency,
      status: "PAID",
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
      vipStartedAt: user.vipStartedAt ?? paidAt,
      vipPaidUntil: paidUntil,
      vipLastReminderSentAt: null,
    },
  });
  await transaction.vipSubscriptionClaim.updateMany({
    where: { userId: user.id, provider, providerReference: providerPaymentId, status: "PENDING" },
    data: { status: "APPROVED", amountTry: input.amountTry, reviewedBy: "SYSTEM_VERIFIED_PAYMENT", reviewedAt: paidAt },
  });
  await appendAuditEvent(transaction, {
    category: "PAYMENT",
    entityType: "VipSubscriptionPayment",
    entityId: payment.id,
    action: "VIP_ACTIVATED",
    actorUserId: input.actorUserId ?? null,
    payload: {
      actorPrincipal: input.actorPrincipal ?? "VIP_SUBSCRIPTION_SERVICE",
      beneficiaryUserId: user.id,
      provider,
      providerReference,
      amountTry: input.amountTry,
      months: 1,
      paidUntil: paidUntil.toISOString(),
    },
    createdAt: paidAt,
  });

  return { reused: false, paymentId: payment.id, userId: user.id, paidUntil };
}

export async function activateVipSubscription(input: ActivateVipInput) {
  return withSerializableTransaction((transaction) => activateVipSubscriptionInTransaction(transaction, input));
}

export async function revokeVipSubscription(input: RevokeVipInput) {
  const provider = normalizeVipPaymentProvider(input.provider);
  const normalizedReference = normalizeVipPaymentReference(input.providerReference, provider);
  const providerReference = canonicalizeVipPaymentReference(normalizedReference, provider);
  const now = new Date();

  if (!normalizedReference) {
    throw new Error("Ödeme referansı zorunludur.");
  }

  return withSerializableTransaction(async (transaction) => {
    const payment = await transaction.vipSubscriptionPayment.findFirst({
      where: { OR: [{ providerReference }, { providerReference: normalizedReference }] },
      select: { id: true, userId: true, status: true },
    });

    if (!payment) {
      throw new Error("İptal edilecek VIP ödemesi bulunamadı.");
    }

    if (payment.status !== "PAID") {
      return { reused: true, paymentId: payment.id, userId: payment.userId };
    }

    await transaction.vipSubscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: input.reason,
        refundedAt: input.reason === "REFUNDED" ? now : null,
        revokedAt: now,
      },
    });

    const remainingPayments = await transaction.vipSubscriptionPayment.findMany({
      where: {
        userId: payment.userId,
        status: "PAID",
        revokedAt: null,
      },
      orderBy: [{ paidAt: "asc" }, { id: "asc" }],
      select: { id: true, paidUntil: true, paidAt: true },
    });
    let entitlementCursor: Date | null = null;
    const recomputedPayments: Array<{ paidAt: Date; paidUntil: Date }> = [];

    for (const remainingPayment of remainingPayments) {
      const startAt = entitlementCursor && entitlementCursor > remainingPayment.paidAt
        ? entitlementCursor
        : remainingPayment.paidAt;
      const paidUntil = addOneClampedCalendarMonth(startAt);

      if (paidUntil.getTime() !== remainingPayment.paidUntil.getTime()) {
        await transaction.vipSubscriptionPayment.update({
          where: { id: remainingPayment.id },
          data: { paidUntil },
        });
      }

      entitlementCursor = paidUntil;
      recomputedPayments.push({ paidAt: remainingPayment.paidAt, paidUntil });
    }

    const firstActivePaymentIndex = recomputedPayments.findIndex(({ paidUntil }) => paidUntil > now);
    const activePayments = firstActivePaymentIndex >= 0
      ? recomputedPayments.slice(firstActivePaymentIndex)
      : [];
    const activeUntil = activePayments.at(-1)?.paidUntil ?? null;

    await transaction.user.update({
      where: { id: payment.userId },
      data: {
        membershipTier: activeUntil ? "VIP" : "STANDARD",
        vipStartedAt: activePayments[0]?.paidAt ?? null,
        vipPaidUntil: activeUntil,
        vipLastReminderSentAt: null,
      },
    });
    await appendAuditEvent(transaction, {
      category: "PAYMENT",
      entityType: "VipSubscriptionPayment",
      entityId: payment.id,
      action: input.reason,
      actorUserId: input.actorUserId ?? null,
      payload: {
        actorPrincipal: input.actorPrincipal ?? "VIP_SUBSCRIPTION_SERVICE",
        beneficiaryUserId: payment.userId,
        provider,
        providerReference,
      },
      createdAt: now,
    });

    return { reused: false, paymentId: payment.id, userId: payment.userId };
  });
}
