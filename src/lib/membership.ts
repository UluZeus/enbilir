import type { MembershipTier } from "@/generated/prisma/enums";

export const membershipConfig = {
  trialDays: 30,
  trialReminderDaysBeforeEnd: 7,
  standardMonthlyAmountTry: 70,
  vipMonthlyAmountTry: 100,
  standardPaymentLink: "https://isyerim.param.com.tr/#/paymentform/paymentrequest/3Ew19YnOU",
  vipPaymentLink: "https://isyerim.param.com.tr/#/paymentform/paymentrequest/hSern8=Ca",
} as const;

export type MembershipSnapshot = {
  tier: MembershipTier;
  effectiveTier: MembershipTier;
  isTrialActive: boolean;
  isVipActive: boolean;
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
  const isVipActive = tier === "VIP" && Boolean(user.vipPaidUntil && user.vipPaidUntil > now);

  return {
    tier,
    effectiveTier: isVipActive ? "VIP" : "STANDARD",
    isTrialActive,
    isVipActive,
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
    return locale === "tr" ? "VIP üyelik" : "VIP membership";
  }

  return locale === "tr" ? "Standart üyelik" : "Standard membership";
}
