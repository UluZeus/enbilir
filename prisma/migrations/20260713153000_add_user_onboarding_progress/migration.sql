ALTER TABLE "User" ADD COLUMN "onboardingGuideCompletedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "riskAppetiteCompletedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "riskAppetiteScore" REAL;
ALTER TABLE "User" ADD COLUMN "riskAppetiteProfile" TEXT;
ALTER TABLE "User" ADD COLUMN "aiAssistantOnboardingCompletedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "aiChatOnboardingCompletedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "leaderboardOnboardingCompletedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" DATETIME;
