ALTER TABLE "VipTradingAgentPosition"
ADD COLUMN "appliedSplitFactor" REAL NOT NULL DEFAULT 1;

ALTER TABLE "VipTradingAgentPosition"
ADD COLUMN "corporateActionsCheckedAt" DATETIME;
