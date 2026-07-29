ALTER TABLE "User" ADD COLUMN "supportIntroShownAt" DATETIME;
ALTER TABLE "VipSubscriptionClaim" ADD COLUMN "activeReferenceKey" TEXT;
ALTER TABLE "VipSubscriptionClaim" ADD COLUMN "verifiedPayerEmail" TEXT;
ALTER TABLE "VipSubscriptionClaim" ADD COLUMN "verifiedCurrency" TEXT;
ALTER TABLE "VipSubscriptionClaim" ADD COLUMN "verifiedAmountTry" REAL;
CREATE UNIQUE INDEX "VipSubscriptionClaim_activeReferenceKey_key"
ON "VipSubscriptionClaim"("activeReferenceKey");

CREATE TABLE "SupportReminderPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "onsitePromptCount" INTEGER NOT NULL DEFAULT 0 CHECK ("onsitePromptCount" >= 0 AND "onsitePromptCount" <= 3),
    "suppressedAt" DATETIME,
    "emailAttemptedAt" DATETIME,
    "emailSentAt" DATETIME,
    "emailStatus" TEXT,
    "emailError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportReminderPeriod_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SupportReminderPeriod_userId_periodKey_key"
ON "SupportReminderPeriod"("userId", "periodKey");
CREATE INDEX "SupportReminderPeriod_periodKey_emailAttemptedAt_idx"
ON "SupportReminderPeriod"("periodKey", "emailAttemptedAt");

CREATE TABLE "SupportReminderEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "entryTokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportReminderEntry_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupportReminderEntry_periodId_fkey"
      FOREIGN KEY ("periodId") REFERENCES "SupportReminderPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SupportReminderEntry_periodId_entryTokenHash_key"
ON "SupportReminderEntry"("periodId", "entryTokenHash");
CREATE INDEX "SupportReminderEntry_userId_createdAt_idx"
ON "SupportReminderEntry"("userId", "createdAt");
