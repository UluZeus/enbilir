import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { membershipConfig } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { withSerializableTransaction } from "@/lib/serializable-transaction";
import { activateVipSubscriptionInTransaction } from "@/lib/vip-subscription";
import {
  canonicalizeVipPaymentReference,
  isValidVipPaymentReference,
  liveVipSubscriptionClaimStatuses,
  normalizeVipPaymentReference,
} from "@/lib/vip-subscription-claim-policy";
import { appendAuditEvent } from "@/lib/audit-log";

const MAX_PENDING_CLAIMS_PER_DAY = 3;

function isUniqueConstraintError(error: unknown) {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    || (
      typeof error === "object"
      && error !== null
      && "code" in error
      && error.code === "P2002"
    )
  );
}

export async function submitVipSubscriptionClaim(input: { userId: string; providerReference: string; userNote?: string }) {
  const providerReference = normalizeVipPaymentReference(input.providerReference);
  const activeReferenceKey = canonicalizeVipPaymentReference(providerReference);
  const userNote = input.userNote?.trim().slice(0, 500) || null;

  if (!isValidVipPaymentReference(providerReference)) {
    throw new Error("Geçerli Param dekont veya işlem numarasını yazmalısınız.");
  }

  try {
    return await withSerializableTransaction(async (transaction) => {
      const existing = await transaction.vipSubscriptionClaim.findFirst({
        where: {
          provider: "PARAM",
          OR: [
            { activeReferenceKey },
            { providerReference },
          ],
          status: { in: [...liveVipSubscriptionClaimStatuses] },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, userId: true, status: true },
      });

      if (existing) {
        if (existing.userId !== input.userId) throw new Error("Bu ödeme referansı daha önce başka bir hesap için bildirilmiş.");
        return { reused: true, ...existing };
      }

      const appliedPayment = await transaction.vipSubscriptionPayment.findFirst({
        where: {
          OR: [
            { providerReference: canonicalizeVipPaymentReference(providerReference) },
            { providerReference },
          ],
        },
        select: { userId: true },
      });

      if (appliedPayment) {
        throw new Error(appliedPayment.userId === input.userId
          ? "Bu ödeme daha önce hesabınıza uygulanmış."
          : "Bu ödeme referansı daha önce başka bir hesap için kullanılmış.");
      }

      const since = new Date(Date.now() - 86_400_000);
      const recentClaims = await transaction.vipSubscriptionClaim.count({
        where: { userId: input.userId, createdAt: { gte: since } },
      });

      if (recentClaims >= MAX_PENDING_CLAIMS_PER_DAY) {
        throw new Error("Son 24 saatteki ödeme bildirim sınırına ulaştınız. Mevcut bildirimin incelenmesini bekleyin.");
      }

      const claim = await transaction.vipSubscriptionClaim.create({
        data: {
          userId: input.userId,
          providerReference,
          activeReferenceKey,
          amountTry: membershipConfig.vipMonthlyAmountTry,
          userNote,
        },
        select: { id: true, userId: true, status: true },
      });
      await appendAuditEvent(transaction, {
        category: "PAYMENT",
        entityType: "VipSubscriptionClaim",
        entityId: claim.id,
        action: "CLAIM_SUBMITTED",
        actorUserId: input.userId,
        payload: { provider: "PARAM", providerReference },
      });

      return { reused: false, ...claim };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existing = await prisma.vipSubscriptionClaim.findFirst({
        where: {
          provider: "PARAM",
          activeReferenceKey,
          status: { in: [...liveVipSubscriptionClaimStatuses] },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, userId: true, status: true },
      });
      if (existing?.userId === input.userId) return { reused: true, ...existing };
      if (existing) throw new Error("Bu ödeme referansı daha önce başka bir hesap için bildirilmiş.");
    }
    throw error;
  }
}

export async function reviewVipSubscriptionClaim(input: {
  claimId: string;
  reviewerEmail: string;
  decision: "APPROVE" | "REJECT";
  amountTry?: number;
  currency?: string;
  payerEmail?: string;
  adminNote?: string;
}) {
  return withSerializableTransaction(async (transaction) => {
    const claim = await transaction.vipSubscriptionClaim.findUnique({
      where: { id: input.claimId },
      include: { user: { select: { email: true } } },
    });

    if (!claim) throw new Error("VIP ödeme bildirimi bulunamadı.");
    if (claim.status !== "PENDING") return { reused: true, status: claim.status, user: claim.user };

    const reviewedAt = new Date();
    const adminNote = input.adminNote?.trim().slice(0, 500) || null;

    if (input.decision === "REJECT") {
      await transaction.vipSubscriptionClaim.update({
        where: { id: claim.id },
        data: {
          status: "REJECTED",
          activeReferenceKey: null,
          adminNote,
          reviewedBy: input.reviewerEmail,
          reviewedAt,
        },
      });
      await appendAuditEvent(transaction, {
        category: "PAYMENT",
        entityType: "VipSubscriptionClaim",
        entityId: claim.id,
        action: "CLAIM_REJECTED",
        payload: { reviewerEmail: input.reviewerEmail },
        createdAt: reviewedAt,
      });
      return { reused: false, status: "REJECTED", user: claim.user };
    }

    const payerEmail = input.payerEmail?.trim().toLowerCase() ?? "";
    if (!payerEmail || payerEmail !== claim.user.email.trim().toLowerCase()) {
      throw new Error("Param kaydındaki ödeyen e-postası bağlı Enbilir hesabıyla eşleşmelidir.");
    }

    const amountTry = Number(input.amountTry ?? claim.amountTry);
    const currency = input.currency?.trim().toUpperCase() ?? "";
    if (currency !== "TRY" || amountTry !== membershipConfig.vipMonthlyAmountTry) {
      throw new Error("Doğrulanan ödeme tam 100 TL ve TRY olmalıdır.");
    }

    const activation = await activateVipSubscriptionInTransaction(transaction, {
      email: claim.user.email,
      provider: claim.provider,
      providerReference: claim.providerReference,
      amountTry,
      currency,
      rawPayload: { source: "ADMIN_VERIFIED_CLAIM", claimId: claim.id, reviewedBy: input.reviewerEmail },
    });

    await transaction.vipSubscriptionClaim.update({
      where: { id: claim.id },
      data: {
        status: "APPROVED",
        amountTry,
        verifiedPayerEmail: payerEmail,
        verifiedCurrency: currency,
        verifiedAmountTry: amountTry,
        adminNote,
        reviewedBy: input.reviewerEmail,
        reviewedAt,
      },
    });
    await appendAuditEvent(transaction, {
      category: "PAYMENT",
      entityType: "VipSubscriptionClaim",
      entityId: claim.id,
      action: "CLAIM_APPROVED",
      payload: { reviewerEmail: input.reviewerEmail, amountTry },
      createdAt: reviewedAt,
    });

    return { reused: false, status: "APPROVED", activation, user: claim.user };
  });
}

export async function activateVipSubscriptionClaimFromWebhook(input: {
  claimId: string;
  providerReference: string;
  amountTry: number;
  currency: string;
  payerEmail: string;
  rawPayload?: unknown;
}) {
  const providerReference = normalizeVipPaymentReference(input.providerReference);

  if (!input.claimId || !isValidVipPaymentReference(providerReference)) {
    throw new Error("Hesaba bağlı ödeme bildirimi ve geçerli Param referansı zorunludur.");
  }

  return withSerializableTransaction(async (transaction) => {
    const claim = await transaction.vipSubscriptionClaim.findUnique({
      where: { id: input.claimId },
      include: { user: { select: { email: true } } },
    });

    if (!claim || claim.provider !== "PARAM" || claim.providerReference !== providerReference) {
      throw new Error("Ödeme bildirimi bu hesap ve Param referansıyla eşleşmiyor.");
    }

    if (claim.status === "APPROVED") {
      const payment = await transaction.vipSubscriptionPayment.findFirst({
        where: {
          userId: claim.userId,
          OR: [
            { providerReference: canonicalizeVipPaymentReference(providerReference) },
            { providerReference },
          ],
        },
        select: { id: true, paidUntil: true },
      });
      if (!payment) throw new Error("Onay kaydına bağlı ödeme bulunamadı.");
      return { reused: true, paymentId: payment.id, userId: claim.userId, paidUntil: payment.paidUntil };
    }

    if (claim.status !== "PENDING") {
      throw new Error("Bu ödeme bildirimi artık etkinleştirilemez.");
    }

    const amountTry = Number(input.amountTry);
    const currency = input.currency.trim().toUpperCase();
    const payerEmail = input.payerEmail.trim().toLowerCase();

    if (currency !== "TRY" || amountTry !== membershipConfig.vipMonthlyAmountTry) {
      throw new Error("Doğrulanan ödeme tam 100 TL ve TRY olmalıdır.");
    }
    if (!payerEmail || payerEmail !== claim.user.email.trim().toLowerCase()) {
      throw new Error("Param kaydındaki ödeyen e-postası bağlı Enbilir hesabıyla eşleşmelidir.");
    }

    const paidAt = new Date();
    const activation = await activateVipSubscriptionInTransaction(transaction, {
      email: claim.user.email,
      provider: claim.provider,
      providerReference,
      amountTry,
      currency,
      paidAt,
      rawPayload: input.rawPayload,
    });

    await transaction.vipSubscriptionClaim.update({
      where: { id: claim.id },
      data: {
        status: "APPROVED",
        amountTry,
        verifiedPayerEmail: payerEmail,
        verifiedCurrency: currency,
        verifiedAmountTry: amountTry,
        reviewedBy: "SYSTEM_VERIFIED_PAYMENT",
        reviewedAt: paidAt,
      },
    });

    return activation;
  });
}
