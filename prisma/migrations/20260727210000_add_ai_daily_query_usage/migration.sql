CREATE TABLE "AiDailyQueryUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "queryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiDailyQueryUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AiDailyQueryUsage_userId_dayKey_key" ON "AiDailyQueryUsage"("userId", "dayKey");
CREATE INDEX "AiDailyQueryUsage_dayKey_idx" ON "AiDailyQueryUsage"("dayKey");
