-- CreateTable
CREATE TABLE "VipResearchReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "model" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marketContext" TEXT NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "methodologyVersion" TEXT NOT NULL DEFAULT 'vip-asymmetric-v1',
    "sourceSnapshot" JSONB,
    "rawAiPayload" JSONB,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "disclaimer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "VipResearchIdea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "providerSymbol" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL DEFAULT 'EQUITY',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "rank" INTEGER NOT NULL,
    "stance" TEXT NOT NULL,
    "thesisSummary" TEXT NOT NULL,
    "negativeCase" TEXT NOT NULL,
    "macroThesis" TEXT NOT NULL,
    "fundamentalThesis" TEXT NOT NULL,
    "technicalThesis" TEXT NOT NULL,
    "catalysts" JSONB NOT NULL,
    "exitPlan" TEXT NOT NULL,
    "institutionalPerception" TEXT NOT NULL,
    "shortInterestCommentary" TEXT NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "priceAtRecommendation" REAL NOT NULL,
    "entryLow" REAL NOT NULL,
    "entryHigh" REAL NOT NULL,
    "stopLoss" REAL NOT NULL,
    "targetPrice" REAL NOT NULL,
    "secondaryTargetPrice" REAL,
    "fundamentalSnapshot" JSONB NOT NULL,
    "technicalSnapshot" JSONB NOT NULL,
    "institutionalSnapshot" JSONB,
    "shortInterestSnapshot" JSONB,
    "sources" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VipResearchIdea_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "VipResearchReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "VipResearchIdeaEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ideaId" TEXT NOT NULL,
    "horizon" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "evaluatedAt" DATETIME,
    "priceAtEvaluation" REAL,
    "returnPercent" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VipResearchIdeaEvaluation_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "VipResearchIdea" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "VipResearchEmailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VipResearchEmailLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "VipResearchReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VipResearchEmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "VipSubscriptionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PARAM',
    "providerReference" TEXT NOT NULL,
    "amountTry" REAL NOT NULL,
    "paidAt" DATETIME NOT NULL,
    "paidUntil" DATETIME NOT NULL,
    "rawPayload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VipSubscriptionPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VipResearchReport_periodKey_key" ON "VipResearchReport"("periodKey");
CREATE INDEX "VipResearchReport_generatedAt_idx" ON "VipResearchReport"("generatedAt");
CREATE INDEX "VipResearchReport_status_generatedAt_idx" ON "VipResearchReport"("status", "generatedAt");
CREATE UNIQUE INDEX "VipResearchIdea_reportId_symbol_key" ON "VipResearchIdea"("reportId", "symbol");
CREATE UNIQUE INDEX "VipResearchIdea_reportId_rank_key" ON "VipResearchIdea"("reportId", "rank");
CREATE INDEX "VipResearchIdea_symbol_createdAt_idx" ON "VipResearchIdea"("symbol", "createdAt");
CREATE INDEX "VipResearchIdea_stance_confidenceScore_riskScore_idx" ON "VipResearchIdea"("stance", "confidenceScore", "riskScore");
CREATE UNIQUE INDEX "VipResearchIdeaEvaluation_ideaId_horizon_key" ON "VipResearchIdeaEvaluation"("ideaId", "horizon");
CREATE INDEX "VipResearchIdeaEvaluation_status_dueAt_idx" ON "VipResearchIdeaEvaluation"("status", "dueAt");
CREATE INDEX "VipResearchIdeaEvaluation_horizon_evaluatedAt_idx" ON "VipResearchIdeaEvaluation"("horizon", "evaluatedAt");
CREATE UNIQUE INDEX "VipResearchEmailLog_reportId_userId_key" ON "VipResearchEmailLog"("reportId", "userId");
CREATE INDEX "VipResearchEmailLog_status_sentAt_idx" ON "VipResearchEmailLog"("status", "sentAt");
CREATE INDEX "VipResearchEmailLog_userId_sentAt_idx" ON "VipResearchEmailLog"("userId", "sentAt");
CREATE UNIQUE INDEX "VipSubscriptionPayment_providerReference_key" ON "VipSubscriptionPayment"("providerReference");
CREATE INDEX "VipSubscriptionPayment_userId_paidAt_idx" ON "VipSubscriptionPayment"("userId", "paidAt");
CREATE INDEX "VipSubscriptionPayment_paidUntil_idx" ON "VipSubscriptionPayment"("paidUntil");
