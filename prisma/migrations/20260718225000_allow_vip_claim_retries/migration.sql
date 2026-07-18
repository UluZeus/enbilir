DROP INDEX "VipSubscriptionClaim_provider_providerReference_userId_key";

CREATE INDEX "VipSubscriptionClaim_provider_providerReference_userId_idx"
ON "VipSubscriptionClaim"("provider", "providerReference", "userId");

-- Keep one live claim per account/reference while retaining every rejected
-- attempt as an immutable audit row that can be followed by a corrected retry.
CREATE UNIQUE INDEX "VipSubscriptionClaim_provider_reference_user_active_key"
ON "VipSubscriptionClaim"("provider", "providerReference", "userId")
WHERE "status" IN ('PENDING', 'APPROVED');
