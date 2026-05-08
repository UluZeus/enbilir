-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "displayNameMode" TEXT NOT NULL DEFAULT 'REAL_NAME',
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "score" INTEGER NOT NULL DEFAULT 0,
    "kvkkDisclosureAccepted" BOOLEAN NOT NULL DEFAULT false,
    "kvkkDisclosureAcceptedAt" DATETIME,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" DATETIME,
    "noInvestmentAdviceAccepted" BOOLEAN NOT NULL DEFAULT false,
    "noInvestmentAdviceAcceptedAt" DATETIME,
    "electronicCommunicationConsent" BOOLEAN NOT NULL DEFAULT false,
    "electronicCommunicationConsentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "displayNameMode", "electronicCommunicationConsent", "electronicCommunicationConsentAt", "email", "id", "kvkkDisclosureAccepted", "kvkkDisclosureAcceptedAt", "name", "nickname", "noInvestmentAdviceAccepted", "noInvestmentAdviceAcceptedAt", "passwordHash", "role", "score", "termsAccepted", "termsAcceptedAt", "updatedAt") SELECT "createdAt", "displayNameMode", "electronicCommunicationConsent", "electronicCommunicationConsentAt", "email", "id", "kvkkDisclosureAccepted", "kvkkDisclosureAcceptedAt", "name", "nickname", "noInvestmentAdviceAccepted", "noInvestmentAdviceAcceptedAt", "passwordHash", "role", "score", "termsAccepted", "termsAcceptedAt", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");
