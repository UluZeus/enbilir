DROP INDEX "VipSubscriptionClaim_provider_providerReference_key";

-- A rejected or malicious claim must not permanently reserve a real payer's
-- receipt. Each account may submit the reference once; the unique payment row
-- and mandatory admin payer-identity check still decide who can be activated.
CREATE UNIQUE INDEX "VipSubscriptionClaim_provider_providerReference_userId_key"
ON "VipSubscriptionClaim"("provider", "providerReference", "userId");
