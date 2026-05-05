-- CreateTable
CREATE TABLE "CompetitionPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "portfolioValueUsd" REAL NOT NULL,
    "cashUsd" REAL NOT NULL,
    "positionsValueUsd" REAL NOT NULL,
    "returnPercent" REAL NOT NULL,
    "rank" INTEGER,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PortfolioSnapshot_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CompetitionPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CompetitionPeriod_type_isActive_idx" ON "CompetitionPeriod"("type", "isActive");

-- CreateIndex
CREATE INDEX "CompetitionPeriod_startsAt_endsAt_idx" ON "CompetitionPeriod"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_periodId_rank_idx" ON "PortfolioSnapshot"("periodId", "rank");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_userId_idx" ON "PortfolioSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshot_userId_periodId_key" ON "PortfolioSnapshot"("userId", "periodId");
