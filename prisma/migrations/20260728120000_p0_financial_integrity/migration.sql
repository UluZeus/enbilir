-- P0 financial-integrity controls:
-- durable trade idempotency and quote provenance, position corporate-action state,
-- and a revocable payment lifecycle.
ALTER TABLE "PortfolioPosition" ADD COLUMN "providerSymbol" TEXT;
ALTER TABLE "PortfolioPosition" ADD COLUMN "appliedSplitFactor" REAL NOT NULL DEFAULT 1;
ALTER TABLE "PortfolioPosition" ADD COLUMN "corporateActionsCheckedAt" DATETIME;
ALTER TABLE "PortfolioPosition" ADD COLUMN "delistedAt" DATETIME;

ALTER TABLE "PortfolioSnapshot" ADD COLUMN "startingValueUsd" REAL NOT NULL DEFAULT 1000000;
ALTER TABLE "PortfolioSnapshot" ADD COLUMN "valuationStatus" TEXT NOT NULL DEFAULT 'VERIFIED';

ALTER TABLE "VirtualTrade" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "VirtualTrade" ADD COLUMN "quoteCurrency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "VirtualTrade" ADD COLUMN "priceSource" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "VirtualTrade" ADD COLUMN "priceAsOf" DATETIME;
CREATE UNIQUE INDEX "VirtualTrade_userId_idempotencyKey_key"
ON "VirtualTrade"("userId", "idempotencyKey");

-- SQLite does not permit ALTER TABLE ADD COLUMN with a non-constant
-- CURRENT_TIMESTAMP default. Rebuild the table so an existing database can
-- be upgraded without a partially applied migration.
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VipSubscriptionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PARAM',
    "providerReference" TEXT NOT NULL,
    "amountTry" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "paidAt" DATETIME NOT NULL,
    "paidUntil" DATETIME NOT NULL,
    "refundedAt" DATETIME,
    "revokedAt" DATETIME,
    "rawPayload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VipSubscriptionPayment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VipSubscriptionPayment" (
    "id", "userId", "provider", "providerReference", "amountTry",
    "currency", "status", "paidAt", "paidUntil", "refundedAt", "revokedAt",
    "rawPayload", "createdAt", "updatedAt"
)
SELECT
    "id", "userId", "provider", "providerReference", "amountTry",
    'TRY', 'PAID', "paidAt", "paidUntil", NULL, NULL,
    "rawPayload", "createdAt", "createdAt"
FROM "VipSubscriptionPayment";
DROP TABLE "VipSubscriptionPayment";
ALTER TABLE "new_VipSubscriptionPayment" RENAME TO "VipSubscriptionPayment";
CREATE UNIQUE INDEX "VipSubscriptionPayment_providerReference_key"
ON "VipSubscriptionPayment"("providerReference");
CREATE INDEX "VipSubscriptionPayment_userId_paidAt_idx"
ON "VipSubscriptionPayment"("userId", "paidAt");
CREATE INDEX "VipSubscriptionPayment_paidUntil_idx"
ON "VipSubscriptionPayment"("paidUntil");
CREATE INDEX "VipSubscriptionPayment_status_paidUntil_idx"
ON "VipSubscriptionPayment"("status", "paidUntil");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

CREATE TABLE "AiQueryReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiQueryReservation_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AiQueryReservation_tokenHash_key" ON "AiQueryReservation"("tokenHash");
CREATE INDEX "AiQueryReservation_userId_dayKey_purpose_idx"
ON "AiQueryReservation"("userId", "dayKey", "purpose");
CREATE INDEX "AiQueryReservation_expiresAt_consumedAt_idx"
ON "AiQueryReservation"("expiresAt", "consumedAt");

CREATE TABLE "SecurityRateLimit" (
    "keyHash" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "windowStart" DATETIME NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "SecurityRateLimit_scope_windowStart_idx"
ON "SecurityRateLimit"("scope", "windowStart");
CREATE INDEX "SecurityRateLimit_blockedUntil_idx"
ON "SecurityRateLimit"("blockedUntil");

CREATE TABLE "ChatRoomMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatRoomMembership_roomId_fkey"
      FOREIGN KEY ("roomId") REFERENCES "ChatRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatRoomMembership_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ChatRoomMembership_roomId_userId_key"
ON "ChatRoomMembership"("roomId", "userId");
CREATE INDEX "ChatRoomMembership_userId_joinedAt_idx"
ON "ChatRoomMembership"("userId", "joinedAt");
INSERT OR IGNORE INTO "ChatRoomMembership" ("id", "roomId", "userId", "role", "joinedAt")
SELECT 'chat_member_creator_' || "id", "id", "createdByUserId", 'OWNER', "createdAt"
FROM "ChatRoom"
WHERE "type" = 'PRIVATE' AND "createdByUserId" IS NOT NULL;
INSERT OR IGNORE INTO "ChatRoomMembership" ("id", "roomId", "userId", "role", "joinedAt")
SELECT 'chat_member_presence_' || "id", "roomId", "userId", 'MEMBER', "lastSeenAt"
FROM "ChatPresence"
WHERE "roomId" IN (SELECT "id" FROM "ChatRoom" WHERE "type" = 'PRIVATE');
