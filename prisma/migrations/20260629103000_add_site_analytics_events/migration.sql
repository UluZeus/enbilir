-- First-party analytics events for key onboarding and product actions
CREATE TABLE "SiteAnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "sessionKey" TEXT,
    "locale" TEXT,
    "path" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SiteAnalyticsEvent_eventType_createdAt_idx" ON "SiteAnalyticsEvent"("eventType", "createdAt");
CREATE INDEX "SiteAnalyticsEvent_userId_createdAt_idx" ON "SiteAnalyticsEvent"("userId", "createdAt");
CREATE INDEX "SiteAnalyticsEvent_sessionKey_createdAt_idx" ON "SiteAnalyticsEvent"("sessionKey", "createdAt");
