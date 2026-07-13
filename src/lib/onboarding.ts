import { prisma } from "@/lib/prisma";
import { recordSiteAnalyticsEvent, siteAnalyticsEvents } from "@/lib/analytics";

export const onboardingStepIds = ["league", "risk", "guide", "assistant", "chat", "trade", "reports", "ranking"] as const;
export type OnboardingStepId = (typeof onboardingStepIds)[number];
export type TrackableOnboardingStep = "guide" | "assistant" | "chat" | "ranking";

export type OnboardingProgress = {
  userId: string;
  completedAt: Date | null;
  riskScore: number | null;
  riskProfile: string | null;
  steps: Record<OnboardingStepId, boolean>;
  completedCount: number;
  totalCount: number;
  percent: number;
  nextStep: OnboardingStepId | null;
};

export async function getOnboardingProgress(userId: string): Promise<OnboardingProgress> {
  const [user, leagueCount, tradeCount, reportReadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingGuideCompletedAt: true,
        riskAppetiteCompletedAt: true,
        riskAppetiteScore: true,
        riskAppetiteProfile: true,
        aiAssistantOnboardingCompletedAt: true,
        aiChatOnboardingCompletedAt: true,
        leaderboardOnboardingCompletedAt: true,
        onboardingCompletedAt: true,
      },
    }),
    prisma.leagueMembership.count({ where: { userId } }),
    prisma.virtualTrade.count({ where: { userId } }),
    prisma.aiMarketReportEvent.count({ where: { userId, eventType: "READ" } }),
  ]);

  if (!user) {
    throw new Error("Onboarding user not found");
  }

  const steps: Record<OnboardingStepId, boolean> = {
    league: leagueCount > 0,
    risk: Boolean(user.riskAppetiteCompletedAt),
    guide: Boolean(user.onboardingGuideCompletedAt),
    assistant: Boolean(user.aiAssistantOnboardingCompletedAt),
    chat: Boolean(user.aiChatOnboardingCompletedAt),
    trade: tradeCount > 0,
    reports: reportReadCount > 0,
    ranking: Boolean(user.leaderboardOnboardingCompletedAt),
  };
  const completedCount = onboardingStepIds.filter((step) => steps[step]).length;
  const nextStep = onboardingStepIds.find((step) => !steps[step]) ?? null;

  return {
    userId,
    completedAt: user.onboardingCompletedAt,
    riskScore: user.riskAppetiteScore,
    riskProfile: user.riskAppetiteProfile,
    steps,
    completedCount,
    totalCount: onboardingStepIds.length,
    percent: Math.round((completedCount / onboardingStepIds.length) * 100),
    nextStep,
  };
}

export async function markOnboardingStep(userId: string, step: TrackableOnboardingStep) {
  const field = {
    guide: "onboardingGuideCompletedAt",
    assistant: "aiAssistantOnboardingCompletedAt",
    chat: "aiChatOnboardingCompletedAt",
    ranking: "leaderboardOnboardingCompletedAt",
  }[step] as
    | "onboardingGuideCompletedAt"
    | "aiAssistantOnboardingCompletedAt"
    | "aiChatOnboardingCompletedAt"
    | "leaderboardOnboardingCompletedAt";

  await prisma.user.update({
    where: { id: userId },
    data: { [field]: new Date() },
  });

  return reconcileOnboardingCompletion(userId);
}

export async function markRiskOnboardingComplete(userId: string, score: number, profile: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      riskAppetiteCompletedAt: new Date(),
      riskAppetiteScore: score,
      riskAppetiteProfile: profile.slice(0, 120),
    },
  });

  return reconcileOnboardingCompletion(userId);
}

export async function reconcileOnboardingCompletion(userId: string) {
  const progress = await getOnboardingProgress(userId);

  if (!progress.nextStep && !progress.completedAt) {
    const completedAt = new Date();
    const result = await prisma.user.updateMany({
      where: { id: userId, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: completedAt },
    });
    if (result.count > 0) {
      await recordSiteAnalyticsEvent({
        eventType: siteAnalyticsEvents.onboardingComplete,
        userId,
        metadata: { completedCount: progress.completedCount, totalCount: progress.totalCount },
      });
    }
    return { ...progress, completedAt };
  }

  return progress;
}
