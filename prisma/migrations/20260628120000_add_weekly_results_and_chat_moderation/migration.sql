-- Weekly competition archives and baselines
CREATE TABLE "WeeklyPortfolioBaseline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portfolioValueUsd" REAL NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyPortfolioBaseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WeeklyCompetitionPublication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodKey" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "WeeklyCompetitionResultRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicationId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "valueUsd" REAL NOT NULL,
    "returnPercent" REAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyCompetitionResultRow_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "WeeklyCompetitionPublication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyCompetitionResultRow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WeeklyPortfolioBaseline_periodKey_userId_key" ON "WeeklyPortfolioBaseline"("periodKey", "userId");
CREATE INDEX "WeeklyPortfolioBaseline_capturedAt_idx" ON "WeeklyPortfolioBaseline"("capturedAt");
CREATE INDEX "WeeklyPortfolioBaseline_userId_idx" ON "WeeklyPortfolioBaseline"("userId");
CREATE UNIQUE INDEX "WeeklyCompetitionPublication_periodKey_key" ON "WeeklyCompetitionPublication"("periodKey");
CREATE INDEX "WeeklyCompetitionPublication_publishedAt_idx" ON "WeeklyCompetitionPublication"("publishedAt");
CREATE INDEX "WeeklyCompetitionPublication_startsAt_endsAt_idx" ON "WeeklyCompetitionPublication"("startsAt", "endsAt");
CREATE UNIQUE INDEX "WeeklyCompetitionResultRow_publicationId_scope_userId_key" ON "WeeklyCompetitionResultRow"("publicationId", "scope", "userId");
CREATE UNIQUE INDEX "WeeklyCompetitionResultRow_publicationId_scope_rank_key" ON "WeeklyCompetitionResultRow"("publicationId", "scope", "rank");
CREATE INDEX "WeeklyCompetitionResultRow_scope_rank_idx" ON "WeeklyCompetitionResultRow"("scope", "rank");
CREATE INDEX "WeeklyCompetitionResultRow_userId_scope_idx" ON "WeeklyCompetitionResultRow"("userId", "scope");

-- Chat moderation
ALTER TABLE "ChatMessage" ADD COLUMN "hiddenAt" DATETIME;
ALTER TABLE "ChatMessage" ADD COLUMN "hiddenReason" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "hiddenByUserId" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "reportCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ChatMessageReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "ChatMessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ChatUserBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatUserBlock_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatUserBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ChatMessage_hiddenAt_idx" ON "ChatMessage"("hiddenAt");
CREATE UNIQUE INDEX "ChatMessageReport_messageId_reporterId_key" ON "ChatMessageReport"("messageId", "reporterId");
CREATE INDEX "ChatMessageReport_status_createdAt_idx" ON "ChatMessageReport"("status", "createdAt");
CREATE INDEX "ChatMessageReport_reporterId_createdAt_idx" ON "ChatMessageReport"("reporterId", "createdAt");
CREATE UNIQUE INDEX "ChatUserBlock_blockerUserId_blockedUserId_key" ON "ChatUserBlock"("blockerUserId", "blockedUserId");
CREATE INDEX "ChatUserBlock_blockedUserId_idx" ON "ChatUserBlock"("blockedUserId");
