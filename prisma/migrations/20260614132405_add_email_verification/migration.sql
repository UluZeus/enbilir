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
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" DATETIME,
    "emailVerificationTokenHash" TEXT,
    "emailVerificationExpiresAt" DATETIME,
    "emailVerificationSentAt" DATETIME,
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
UPDATE "new_User" SET "isActive" = 1;
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
