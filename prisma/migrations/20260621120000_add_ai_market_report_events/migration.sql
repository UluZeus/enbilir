-- CreateTable
CREATE TABLE "AiMarketReportEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiMarketReportEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AiMarketReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiMarketReportEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AiMarketReportEvent_reportId_eventType_createdAt_idx" ON "AiMarketReportEvent"("reportId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AiMarketReportEvent_userId_eventType_createdAt_idx" ON "AiMarketReportEvent"("userId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AiMarketReportEvent_eventType_createdAt_idx" ON "AiMarketReportEvent"("eventType", "createdAt");
