ALTER TABLE "PortfolioPosition" ADD COLUMN "positionCycleId" TEXT;
UPDATE "PortfolioPosition" SET "positionCycleId" = "id" WHERE "positionCycleId" IS NULL;

ALTER TABLE "VirtualTrade" ADD COLUMN "positionCycleId" TEXT;
ALTER TABLE "VirtualTrade" ADD COLUMN "requestedAmountUsd" REAL NOT NULL DEFAULT 0;
ALTER TABLE "VirtualTrade" ADD COLUMN "executionNotionalUsd" REAL NOT NULL DEFAULT 0;
ALTER TABLE "VirtualTrade" ADD COLUMN "feeUsd" REAL NOT NULL DEFAULT 0;
ALTER TABLE "VirtualTrade" ADD COLUMN "slippageUsd" REAL NOT NULL DEFAULT 0;
ALTER TABLE "VirtualTrade" ADD COLUMN "costBasisUsd" REAL;
ALTER TABLE "VirtualTrade" ADD COLUMN "realizedPnlUsd" REAL;
ALTER TABLE "VirtualTrade" ADD COLUMN "realizedPnlPercent" REAL;

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "payload" JSONB,
    "previousHash" TEXT,
    "eventHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "AuditEvent_eventHash_key" ON "AuditEvent"("eventHash");
CREATE INDEX "AuditEvent_category_createdAt_idx" ON "AuditEvent"("category", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx"
ON "AuditEvent"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent"("actorUserId", "createdAt");

CREATE TABLE "OperationalJobHeartbeat" (
    "jobKey" TEXT NOT NULL PRIMARY KEY,
    "lastStartedAt" DATETIME,
    "lastSucceededAt" DATETIME,
    "lastFailedAt" DATETIME,
    "lastError" TEXT,
    "metadata" JSONB,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ChatUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STAGED',
    "expiresAt" DATETIME NOT NULL,
    "linkedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatUpload_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ChatUpload_storedName_key" ON "ChatUpload"("storedName");
CREATE INDEX "ChatUpload_status_expiresAt_idx" ON "ChatUpload"("status", "expiresAt");
CREATE INDEX "ChatUpload_userId_createdAt_idx" ON "ChatUpload"("userId", "createdAt");
