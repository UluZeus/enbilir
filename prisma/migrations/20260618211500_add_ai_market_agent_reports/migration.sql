-- CreateTable
CREATE TABLE "AiMarketFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "displayName" TEXT,
    "assetClass" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiMarketFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiMarketReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "periodKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "model" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "macroSummary" TEXT NOT NULL,
    "marketRegime" TEXT,
    "riskAppetite" TEXT,
    "keyTakeaways" JSONB NOT NULL,
    "requiredCoverage" JSONB NOT NULL,
    "newsSummary" TEXT,
    "dataSnapshot" JSONB,
    "rawAiPayload" JSONB,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "disclaimer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiMarketReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiMarketReportAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL,
    "category" TEXT,
    "lastPrice" REAL,
    "changePercent" REAL,
    "signalType" TEXT,
    "confidence" REAL,
    "riskScore" REAL,
    "opportunityScore" REAL,
    "technicalCommentary" TEXT NOT NULL,
    "macroCommentary" TEXT,
    "newsCommentary" TEXT,
    "watchLevels" JSONB,
    "scenarios" JSONB,
    "sourcePayload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiMarketReportAsset_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AiMarketReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiMarketReportNewsItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "category" TEXT,
    "relevance" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiMarketReportNewsItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AiMarketReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AiMarketFavorite_userId_symbol_key" ON "AiMarketFavorite"("userId", "symbol");

-- CreateIndex
CREATE INDEX "AiMarketFavorite_userId_createdAt_idx" ON "AiMarketFavorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiMarketReport_userId_periodKey_scope_key" ON "AiMarketReport"("userId", "periodKey", "scope");

-- CreateIndex
CREATE INDEX "AiMarketReport_generatedAt_idx" ON "AiMarketReport"("generatedAt");

-- CreateIndex
CREATE INDEX "AiMarketReport_userId_generatedAt_idx" ON "AiMarketReport"("userId", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiMarketReportAsset_reportId_symbol_key" ON "AiMarketReportAsset"("reportId", "symbol");

-- CreateIndex
CREATE INDEX "AiMarketReportAsset_symbol_createdAt_idx" ON "AiMarketReportAsset"("symbol", "createdAt");

-- CreateIndex
CREATE INDEX "AiMarketReportNewsItem_reportId_relevance_idx" ON "AiMarketReportNewsItem"("reportId", "relevance");

-- CreateIndex
CREATE INDEX "AiMarketReportNewsItem_category_createdAt_idx" ON "AiMarketReportNewsItem"("category", "createdAt");
