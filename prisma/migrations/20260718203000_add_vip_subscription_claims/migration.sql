CREATE TABLE "VipSubscriptionClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PARAM',
    "providerReference" TEXT NOT NULL,
    "amountTry" REAL NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "userNote" TEXT,
    "adminNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VipSubscriptionClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VipSubscriptionClaim_provider_providerReference_key" ON "VipSubscriptionClaim"("provider", "providerReference");
CREATE INDEX "VipSubscriptionClaim_status_createdAt_idx" ON "VipSubscriptionClaim"("status", "createdAt");
CREATE INDEX "VipSubscriptionClaim_userId_createdAt_idx" ON "VipSubscriptionClaim"("userId", "createdAt");
