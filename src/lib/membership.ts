import type { MembershipTier } from "@/generated/prisma/enums";

export const membershipConfig = {
  fullVipPromotionEnabled: true,
  trialDays: 30,
  trialReminderDaysBeforeEnd: 7,
  vipMonthlyAmountTry: 100,
  freeDailyAiQueryLimit: 10,
  paidVipDailyAiQueryLimit: 15,
} as const;

export type MembershipSnapshot = {
  tier: MembershipTier;
  effectiveTier: MembershipTier;
  isTrialActive: boolean;
  isVipActive: boolean;
  isPaidVipActive: boolean;
  hasPromotionalVipAccess: boolean;
  trialEndsAt: Date;
  vipPaidUntil: Date | null;
};

export function addMembershipDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getMembershipSnapshot(
  user: {
    createdAt: Date;
    membershipTier?: MembershipTier | string | null;
    vipPaidUntil?: Date | null;
  },
  now = new Date(),
): MembershipSnapshot {
  const tier = user.membershipTier === "VIP" ? "VIP" : "STANDARD";
  const trialEndsAt = addMembershipDays(user.createdAt, membershipConfig.trialDays);
  const isTrialActive = now < trialEndsAt;
  const isPaidVipActive = tier === "VIP" && Boolean(user.vipPaidUntil && user.vipPaidUntil > now);
  const hasPromotionalVipAccess = membershipConfig.fullVipPromotionEnabled;
  const isVipActive = isPaidVipActive || hasPromotionalVipAccess;

  return {
    tier,
    effectiveTier: isVipActive ? "VIP" : "STANDARD",
    isTrialActive,
    isVipActive,
    isPaidVipActive,
    hasPromotionalVipAccess,
    trialEndsAt,
    vipPaidUntil: user.vipPaidUntil ?? null,
  };
}

export function formatTryAmount(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getMembershipLabel(tier: MembershipTier | "STANDARD" | "VIP", locale: "tr" | "en") {
  if (tier === "VIP") {
    return locale === "tr" ? "VIP destekçi" : "VIP supporter";
  }

  return locale === "tr" ? "Ücretsiz" : "Free";
}
