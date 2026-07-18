import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { membershipConfig } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { activateVipSubscriptionInTransaction } from "@/lib/vip-subscription";
import {
  canonicalizeVipPaymentReference,
  isValidVipPaymentReference,
  liveVipSubscriptionClaimStatuses,
  normalizeVipPaymentReference,
} from "@/lib/vip-subscription-claim-policy";

const MAX_PENDING_CLAIMS_PER_DAY = 3;

export async function submitVipSubscriptionClaim(input: { userId: string; providerReference: string; userNote?: string }) {
  const providerReference = normalizeVipPaymentReference(input.providerReference);
  const userNote = input.userNote?.trim().slice(0, 500) || null;

  if (!isValidVipPaymentReference(providerReference)) {
    throw new Error("Geçerli Param dekont veya işlem numarasını yazmalısınız.");
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.vipSubscriptionClaim.findFirst({
        where: {
          provider: "PARAM",
          providerReference,
          userId: input.userId,
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
          amountTry: membershipConfig.vipMonthlyAmountTry,
          userNote,
        },
        select: { id: true, userId: true, status: true },
      });

      return { reused: false, ...claim };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.vipSubscriptionClaim.findFirst({
        where: {
          provider: "PARAM",
          providerReference,
          userId: input.userId,
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
  adminNote?: string;
  payerIdentityConfirmed?: boolean;
}) {
  return prisma.$transaction(async (transaction) => {
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
        data: { status: "REJECTED", adminNote, reviewedBy: input.reviewerEmail, reviewedAt },
      });
      return { reused: false, status: "REJECTED", user: claim.user };
    }

    if (!input.payerIdentityConfirmed) {
      throw new Error("Param kaydındaki ödeyen e-postasının Enbilir hesabıyla eşleştiğini onaylamalısınız.");
    }

    const amountTry = Number(input.amountTry ?? claim.amountTry);
    if (!Number.isFinite(amountTry) || amountTry < membershipConfig.vipMonthlyAmountTry) {
      throw new Error("Doğrulanan ödeme tutarı VIP ücretinden düşük olamaz.");
    }

    const activation = await activateVipSubscriptionInTransaction(transaction, {
      email: claim.user.email,
      provider: claim.provider,
      providerReference: claim.providerReference,
      amountTry,
      rawPayload: { source: "ADMIN_VERIFIED_CLAIM", claimId: claim.id, reviewedBy: input.reviewerEmail },
    });

    await transaction.vipSubscriptionClaim.update({
      where: { id: claim.id },
      data: { status: "APPROVED", amountTry, adminNote, reviewedBy: input.reviewerEmail, reviewedAt },
    });

    return { reused: false, status: "APPROVED", activation, user: claim.user };
  });
}
