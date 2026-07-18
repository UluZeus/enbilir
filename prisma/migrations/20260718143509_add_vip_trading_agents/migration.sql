-- CreateTable
CREATE TABLE "VipTradingAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "riskProfile" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startingBalanceUsd" REAL NOT NULL DEFAULT 1100000,
    "performanceBaseUsd" REAL NOT NULL DEFAULT 1000000,
    "reserveUsd" REAL NOT NULL DEFAULT 100000,
    "cashUsd" REAL NOT NULL DEFAULT 1100000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VipTradingAgentPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "providerSymbol" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "averagePriceUsd" REAL NOT NULL,
    "lastPriceUsd" REAL NOT NULL,
    "stopLossUsd" REAL NOT NULL,
    "targetPriceUsd" REAL NOT NULL,
    "secondaryTarget" REAL,
    "sourceIdeaId" TEXT,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VipTradingAgentPosition_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "VipTradingAgent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VipTradingAgentTrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "priceUsd" REAL NOT NULL,
    "grossUsd" REAL NOT NULL,
    "costBasisUsd" REAL,
    "realizedPnlUsd" REAL,
    "realizedPnlPercent" REAL,
    "cashAfterUsd" REAL NOT NULL,
    "portfolioAfterUsd" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceIdeaId" TEXT,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VipTradingAgentTrade_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "VipTradingAgent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VipTradingAgentDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "runKey" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "priceUsd" REAL,
    "reason" TEXT NOT NULL,
    "sourceIdeaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VipTradingAgentDecision_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "VipTradingAgent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VipTradingAgentSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "cashUsd" REAL NOT NULL,
    "reserveUsd" REAL NOT NULL,
    "positionsValueUsd" REAL NOT NULL,
    "totalBalanceUsd" REAL NOT NULL,
    "performanceEquityUsd" REAL NOT NULL,
    "pnlUsd" REAL NOT NULL,
    "returnPercent" REAL NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VipTradingAgentSnapshot_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "VipTradingAgent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Seed the three permanent VIP simulation agents. The extra 100,000 USD is a
-- ring-fenced reserve; performance is always measured on the 1,000,000 USD base.
INSERT INTO "VipTradingAgent" ("id", "slug", "name", "riskProfile", "description", "startingBalanceUsd", "performanceBaseUsd", "reserveUsd", "cashUsd", "isActive", "createdAt", "updatedAt") VALUES
('vip-agent-sabit', 'sabit', 'SABİT', 'MUHAFAZAKAR', 'Yüksek güven, düşük risk ve güçlü nakit koruması arar. Portföy yoğunlaşmasını sıkı biçimde sınırlar.', 1100000, 1000000, 100000, 1100000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vip-agent-olgun', 'olgun', 'OLGUN', 'DENGELI', 'Güven, risk ve çeşitlendirme arasında denge kurar. Makul fiyat sapmalarına sınırlı tolerans gösterir.', 1100000, 1000000, 100000, 1100000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vip-agent-yildirim', 'yildirim', 'YILDIRIM', 'AGRESIF', 'Yüksek asimetri için daha geniş risk aralığını kabul eder; yine de VIP stop ve hedef disiplininden ayrılmaz.', 1100000, 1000000, 100000, 1100000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "attachment" JSONB,
    "hiddenAt" DATETIME,
    "hiddenReason" TEXT,
    "hiddenByUserId" TEXT,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_hiddenByUserId_fkey" FOREIGN KEY ("hiddenByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChatMessage" ("attachment", "body", "createdAt", "hiddenAt", "hiddenByUserId", "hiddenReason", "id", "reportCount", "roomId", "type", "userId") SELECT "attachment", "body", "createdAt", "hiddenAt", "hiddenByUserId", "hiddenReason", "id", "reportCount", "roomId", "type", "userId" FROM "ChatMessage";
DROP TABLE "ChatMessage";
ALTER TABLE "new_ChatMessage" RENAME TO "ChatMessage";
CREATE INDEX "ChatMessage_roomId_createdAt_idx" ON "ChatMessage"("roomId", "createdAt");
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");
CREATE INDEX "ChatMessage_type_createdAt_idx" ON "ChatMessage"("type", "createdAt");
CREATE INDEX "ChatMessage_hiddenAt_idx" ON "ChatMessage"("hiddenAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "VipTradingAgent_slug_key" ON "VipTradingAgent"("slug");

-- CreateIndex
CREATE INDEX "VipTradingAgent_isActive_lastRunAt_idx" ON "VipTradingAgent"("isActive", "lastRunAt");

-- CreateIndex
CREATE INDEX "VipTradingAgentPosition_symbol_updatedAt_idx" ON "VipTradingAgentPosition"("symbol", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VipTradingAgentPosition_agentId_symbol_key" ON "VipTradingAgentPosition"("agentId", "symbol");

-- CreateIndex
CREATE INDEX "VipTradingAgentTrade_agentId_executedAt_idx" ON "VipTradingAgentTrade"("agentId", "executedAt");

-- CreateIndex
CREATE INDEX "VipTradingAgentTrade_symbol_executedAt_idx" ON "VipTradingAgentTrade"("symbol", "executedAt");

-- CreateIndex
CREATE INDEX "VipTradingAgentDecision_agentId_createdAt_idx" ON "VipTradingAgentDecision"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "VipTradingAgentDecision_action_createdAt_idx" ON "VipTradingAgentDecision"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VipTradingAgentDecision_agentId_runKey_symbol_key" ON "VipTradingAgentDecision"("agentId", "runKey", "symbol");

-- CreateIndex
CREATE INDEX "VipTradingAgentSnapshot_agentId_capturedAt_idx" ON "VipTradingAgentSnapshot"("agentId", "capturedAt");

-- CreateIndex
CREATE INDEX "VipTradingAgentSnapshot_periodKey_returnPercent_idx" ON "VipTradingAgentSnapshot"("periodKey", "returnPercent");

-- CreateIndex
CREATE UNIQUE INDEX "VipTradingAgentSnapshot_agentId_periodKey_key" ON "VipTradingAgentSnapshot"("agentId", "periodKey");
