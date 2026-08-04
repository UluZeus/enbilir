-- Session-version checks revoke copied stateless session tokens after logout.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- OAuth states are signed in the browser and atomically consumed server-side.
CREATE TABLE "OAuthState" (
    "stateHash" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");
