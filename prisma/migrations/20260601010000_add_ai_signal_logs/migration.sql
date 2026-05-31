-- CreateTable
CREATE TABLE "AiSignalLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symbol" TEXT NOT NULL,
    "displayName" TEXT,
    "exchange" TEXT,
    "interval" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "recommendationText" TEXT,
    "confidence" REAL,
    "riskScore" REAL,
    "opportunityScore" REAL,
    "priceAtSignal" REAL,
    "currency" TEXT,
    "source" TEXT,
    "reason" TEXT,
    "indicatorsSnapshot" JSONB,
    "rawPayload" JSONB
);

-- CreateTable
CREATE TABLE "AiSignalEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signalLogId" TEXT NOT NULL,
    "horizon" TEXT NOT NULL,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceAtEvaluation" REAL,
    "priceChangePercent" REAL,
    "directionCorrect" BOOLEAN,
    "score" REAL,
    "resultLabel" TEXT,
    "status" TEXT,
    CONSTRAINT "AiSignalEvaluation_signalLogId_fkey" FOREIGN KEY ("signalLogId") REFERENCES "AiSignalLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AiSignalLog_createdAt_idx" ON "AiSignalLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiSignalLog_symbol_interval_signalType_createdAt_idx" ON "AiSignalLog"("symbol", "interval", "signalType", "createdAt");

-- CreateIndex
CREATE INDEX "AiSignalLog_source_createdAt_idx" ON "AiSignalLog"("source", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiSignalEvaluation_signalLogId_horizon_key" ON "AiSignalEvaluation"("signalLogId", "horizon");

-- CreateIndex
CREATE INDEX "AiSignalEvaluation_horizon_evaluatedAt_idx" ON "AiSignalEvaluation"("horizon", "evaluatedAt");

-- CreateIndex
CREATE INDEX "AiSignalEvaluation_status_idx" ON "AiSignalEvaluation"("status");
