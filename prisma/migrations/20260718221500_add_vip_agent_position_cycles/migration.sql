-- Each simulated position opening gets a permanent cycle identifier. This lets
-- historical BUY rows resolve only against their own open position or closing
-- SELL, even when the same symbol is bought again later.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_VipTradingAgentPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "positionCycleId" TEXT NOT NULL,
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

INSERT INTO "new_VipTradingAgentPosition" (
    "id", "agentId", "positionCycleId", "symbol", "providerSymbol",
    "displayName", "quantity", "averagePriceUsd", "lastPriceUsd",
    "stopLossUsd", "targetPriceUsd", "secondaryTarget", "sourceIdeaId",
    "openedAt", "updatedAt"
)
SELECT
    position."id",
    position."agentId",
    COALESCE(
        (
            SELECT buy."id"
            FROM "VipTradingAgentTrade" AS buy
            WHERE buy."agentId" = position."agentId"
              AND buy."symbol" = position."symbol"
              AND buy."side" = 'BUY'
              AND buy."executedAt" <= position."openedAt"
            ORDER BY buy."executedAt" DESC, buy."id" DESC
            LIMIT 1
        ),
        position."id"
    ),
    position."symbol",
    position."providerSymbol",
    position."displayName",
    position."quantity",
    position."averagePriceUsd",
    position."lastPriceUsd",
    position."stopLossUsd",
    position."targetPriceUsd",
    position."secondaryTarget",
    position."sourceIdeaId",
    position."openedAt",
    position."updatedAt"
FROM "VipTradingAgentPosition" AS position;

DROP TABLE "VipTradingAgentPosition";
ALTER TABLE "new_VipTradingAgentPosition" RENAME TO "VipTradingAgentPosition";

CREATE TABLE "new_VipTradingAgentTrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "positionCycleId" TEXT NOT NULL,
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

INSERT INTO "new_VipTradingAgentTrade" (
    "id", "agentId", "positionCycleId", "symbol", "displayName", "side",
    "quantity", "priceUsd", "grossUsd", "costBasisUsd", "realizedPnlUsd",
    "realizedPnlPercent", "cashAfterUsd", "portfolioAfterUsd", "reason",
    "sourceIdeaId", "executedAt"
)
SELECT
    trade."id",
    trade."agentId",
    CASE
        WHEN trade."side" = 'BUY' THEN trade."id"
        ELSE COALESCE(
            (
                SELECT buy."id"
                FROM "VipTradingAgentTrade" AS buy
                WHERE buy."agentId" = trade."agentId"
                  AND buy."symbol" = trade."symbol"
                  AND buy."side" = 'BUY'
                  AND buy."executedAt" <= trade."executedAt"
                ORDER BY buy."executedAt" DESC, buy."id" DESC
                LIMIT 1
            ),
            trade."id"
        )
    END,
    trade."symbol",
    trade."displayName",
    trade."side",
    trade."quantity",
    trade."priceUsd",
    trade."grossUsd",
    trade."costBasisUsd",
    trade."realizedPnlUsd",
    trade."realizedPnlPercent",
    trade."cashAfterUsd",
    trade."portfolioAfterUsd",
    trade."reason",
    trade."sourceIdeaId",
    trade."executedAt"
FROM "VipTradingAgentTrade" AS trade;

DROP TABLE "VipTradingAgentTrade";
ALTER TABLE "new_VipTradingAgentTrade" RENAME TO "VipTradingAgentTrade";

CREATE UNIQUE INDEX "VipTradingAgentPosition_agentId_symbol_key" ON "VipTradingAgentPosition"("agentId", "symbol");
CREATE UNIQUE INDEX "VipTradingAgentPosition_agentId_positionCycleId_key" ON "VipTradingAgentPosition"("agentId", "positionCycleId");
CREATE INDEX "VipTradingAgentPosition_symbol_updatedAt_idx" ON "VipTradingAgentPosition"("symbol", "updatedAt");

CREATE UNIQUE INDEX "VipTradingAgentTrade_agentId_positionCycleId_side_key" ON "VipTradingAgentTrade"("agentId", "positionCycleId", "side");
CREATE INDEX "VipTradingAgentTrade_agentId_positionCycleId_executedAt_idx" ON "VipTradingAgentTrade"("agentId", "positionCycleId", "executedAt");
CREATE INDEX "VipTradingAgentTrade_agentId_executedAt_idx" ON "VipTradingAgentTrade"("agentId", "executedAt");
CREATE INDEX "VipTradingAgentTrade_symbol_executedAt_idx" ON "VipTradingAgentTrade"("symbol", "executedAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
