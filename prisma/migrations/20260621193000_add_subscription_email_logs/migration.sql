CREATE TABLE "SubscriptionEmailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionEmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SubscriptionEmailLog_userId_emailType_periodKey_key" ON "SubscriptionEmailLog"("userId", "emailType", "periodKey");
CREATE INDEX "SubscriptionEmailLog_emailType_periodKey_idx" ON "SubscriptionEmailLog"("emailType", "periodKey");
CREATE INDEX "SubscriptionEmailLog_sentAt_idx" ON "SubscriptionEmailLog"("sentAt");
