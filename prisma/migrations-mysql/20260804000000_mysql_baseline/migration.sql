-- Enbilir MySQL baseline, generated offline for MySQL 8.0.44.
-- The database must be created with utf8mb4_0900_ai_ci before this migration is deployed.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nickname` VARCHAR(191) NULL,
    `displayNameMode` ENUM('REAL_NAME', 'NICKNAME') NOT NULL DEFAULT 'REAL_NAME',
    `email` VARCHAR(254) NOT NULL,
    `passwordHash` VARCHAR(128) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `emailVerifiedAt` DATETIME(3) NULL,
    `emailVerificationTokenHash` VARCHAR(128) NULL,
    `emailVerificationExpiresAt` DATETIME(3) NULL,
    `emailVerificationSentAt` DATETIME(3) NULL,
    `role` ENUM('USER', 'ADMIN', 'MASTER_ADMIN') NOT NULL DEFAULT 'USER',
    `membershipTier` ENUM('STANDARD', 'VIP') NOT NULL DEFAULT 'STANDARD',
    `sessionVersion` INTEGER NOT NULL DEFAULT 0,
    `vipStartedAt` DATETIME(3) NULL,
    `vipPaidUntil` DATETIME(3) NULL,
    `vipLastReminderSentAt` DATETIME(3) NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `kvkkDisclosureAccepted` BOOLEAN NOT NULL DEFAULT false,
    `kvkkDisclosureAcceptedAt` DATETIME(3) NULL,
    `termsAccepted` BOOLEAN NOT NULL DEFAULT false,
    `termsAcceptedAt` DATETIME(3) NULL,
    `noInvestmentAdviceAccepted` BOOLEAN NOT NULL DEFAULT false,
    `noInvestmentAdviceAcceptedAt` DATETIME(3) NULL,
    `electronicCommunicationConsent` BOOLEAN NOT NULL DEFAULT false,
    `electronicCommunicationConsentAt` DATETIME(3) NULL,
    `onboardingGuideCompletedAt` DATETIME(3) NULL,
    `riskAppetiteCompletedAt` DATETIME(3) NULL,
    `riskAppetiteScore` DOUBLE NULL,
    `riskAppetiteProfile` VARCHAR(191) NULL,
    `aiAssistantOnboardingCompletedAt` DATETIME(3) NULL,
    `aiChatOnboardingCompletedAt` DATETIME(3) NULL,
    `leaderboardOnboardingCompletedAt` DATETIME(3) NULL,
    `onboardingCompletedAt` DATETIME(3) NULL,
    `supportIntroShownAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `OAuthState` (
    `stateHash` VARCHAR(128) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OAuthState_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`stateHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `OAuthAccount` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OAuthAccount_userId_idx`(`userId`),
    UNIQUE INDEX `OAuthAccount_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `BlogPost` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `titleTr` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `excerptTr` TEXT NOT NULL,
    `excerptEn` TEXT NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BlogPost_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AdPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `slot` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `imageUrl` TEXT NULL,
    `videoUrl` TEXT NULL,
    `linkUrl` TEXT NULL,
    `linkLabel` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `displaySeconds` INTEGER NOT NULL DEFAULT 8,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdPlacement_slot_isActive_priority_idx`(`slot`, `isActive`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `ManagedContentPage` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ManagedContentPage_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `ManagedContentItem` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('ANNOUNCEMENT', 'BLOG', 'EDUCATION', 'CONTACT') NOT NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'tr',
    `title` VARCHAR(191) NOT NULL,
    `excerpt` TEXT NULL,
    `body` LONGTEXT NOT NULL,
    `imageUrl` TEXT NULL,
    `videoUrl` TEXT NULL,
    `linkUrl` TEXT NULL,
    `linkLabel` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ManagedContentItem_type_locale_isActive_sortOrder_idx`(`type`, `locale`, `isActive`, `sortOrder`),
    INDEX `ManagedContentItem_isFeatured_isActive_idx`(`isFeatured`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `SiteVisualSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `value` LONGTEXT NOT NULL,
    `type` ENUM('TEXT', 'COLOR', 'IMAGE_URL', 'BOOLEAN') NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SiteVisualSetting_key_key`(`key`),
    INDEX `SiteVisualSetting_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VirtualAccount` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `cashMode` ENUM('USD', 'EUR', 'CHF', 'TRY_REPO') NOT NULL DEFAULT 'USD',
    `cashAmount` DECIMAL(30, 8) NOT NULL DEFAULT 1000000,
    `baseCurrency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `dailyRepoRate` DECIMAL(36, 12) NOT NULL DEFAULT 0.00125,
    `repoLastAccruedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VirtualAccount_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `PortfolioPosition` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `positionCycleId` VARCHAR(191) NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `providerSymbol` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `market` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(36, 12) NOT NULL,
    `averagePriceUsd` DECIMAL(30, 8) NOT NULL,
    `appliedSplitFactor` DECIMAL(36, 12) NOT NULL DEFAULT 1,
    `corporateActionsCheckedAt` DATETIME(3) NULL,
    `delistedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PortfolioPosition_userId_symbol_key`(`userId`, `symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VirtualTrade` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `positionCycleId` VARCHAR(191) NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `market` VARCHAR(191) NOT NULL,
    `side` ENUM('BUY', 'SELL') NOT NULL,
    `quantity` DECIMAL(36, 12) NOT NULL,
    `priceUsd` DECIMAL(30, 8) NOT NULL,
    `totalUsd` DECIMAL(30, 8) NOT NULL,
    `requestedAmountUsd` DECIMAL(30, 8) NOT NULL DEFAULT 0,
    `executionNotionalUsd` DECIMAL(30, 8) NOT NULL DEFAULT 0,
    `feeUsd` DECIMAL(30, 8) NOT NULL DEFAULT 0,
    `slippageUsd` DECIMAL(30, 8) NOT NULL DEFAULT 0,
    `costBasisUsd` DECIMAL(30, 8) NULL,
    `realizedPnlUsd` DECIMAL(30, 8) NULL,
    `realizedPnlPercent` DECIMAL(24, 12) NULL,
    `quoteCurrency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `priceSource` VARCHAR(191) NOT NULL DEFAULT 'UNKNOWN',
    `priceAsOf` DATETIME(3) NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VirtualTrade_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `VirtualTrade_userId_idempotencyKey_key`(`userId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `FriendRequest` (
    `id` VARCHAR(191) NOT NULL,
    `pairKey` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `receiverId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FriendRequest_pairKey_key`(`pairKey`),
    INDEX `FriendRequest_senderId_status_idx`(`senderId`, `status`),
    INDEX `FriendRequest_receiverId_status_idx`(`receiverId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `League` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('ROTARY', 'ROTARACT', 'INTERACT', 'PRIVATE', 'GENERAL') NOT NULL,
    `inviteCode` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `League_slug_key`(`slug`),
    UNIQUE INDEX `League_inviteCode_key`(`inviteCode`),
    INDEX `League_type_isActive_idx`(`type`, `isActive`),
    INDEX `League_createdByUserId_idx`(`createdByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `LeagueMembership` (
    `id` VARCHAR(191) NOT NULL,
    `leagueId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('MEMBER', 'MODERATOR', 'OWNER') NOT NULL DEFAULT 'MEMBER',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeagueMembership_userId_idx`(`userId`),
    UNIQUE INDEX `LeagueMembership_leagueId_userId_key`(`leagueId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `Badge` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `nameTr` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `descriptionTr` TEXT NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `icon` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Badge_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `UserBadge` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `badgeId` VARCHAR(191) NOT NULL,
    `earnedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserBadge_badgeId_idx`(`badgeId`),
    UNIQUE INDEX `UserBadge_userId_badgeId_key`(`userId`, `badgeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AchievementEvent` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AchievementEvent_userId_type_idx`(`userId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `CompetitionPeriod` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'YEARLY') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompetitionPeriod_type_isActive_idx`(`type`, `isActive`),
    INDEX `CompetitionPeriod_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `PortfolioSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `startingValueUsd` DECIMAL(30, 8) NOT NULL DEFAULT 1000000,
    `portfolioValueUsd` DECIMAL(30, 8) NOT NULL,
    `cashUsd` DECIMAL(30, 8) NOT NULL,
    `positionsValueUsd` DECIMAL(30, 8) NOT NULL,
    `returnPercent` DECIMAL(24, 12) NOT NULL,
    `valuationStatus` VARCHAR(191) NOT NULL DEFAULT 'VERIFIED',
    `rank` INTEGER NULL,
    `capturedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PortfolioSnapshot_periodId_rank_idx`(`periodId`, `rank`),
    INDEX `PortfolioSnapshot_userId_idx`(`userId`),
    UNIQUE INDEX `PortfolioSnapshot_userId_periodId_key`(`userId`, `periodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `WeeklyPortfolioBaseline` (
    `id` VARCHAR(191) NOT NULL,
    `periodKey` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `portfolioValueUsd` DECIMAL(30, 8) NOT NULL,
    `capturedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WeeklyPortfolioBaseline_capturedAt_idx`(`capturedAt`),
    INDEX `WeeklyPortfolioBaseline_userId_idx`(`userId`),
    UNIQUE INDEX `WeeklyPortfolioBaseline_periodKey_userId_key`(`periodKey`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `WeeklyCompetitionPublication` (
    `id` VARCHAR(191) NOT NULL,
    `periodKey` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `publishedAt` DATETIME(3) NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WeeklyCompetitionPublication_periodKey_key`(`periodKey`),
    INDEX `WeeklyCompetitionPublication_publishedAt_idx`(`publishedAt`),
    INDEX `WeeklyCompetitionPublication_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `WeeklyCompetitionResultRow` (
    `id` VARCHAR(191) NOT NULL,
    `publicationId` VARCHAR(191) NOT NULL,
    `scope` ENUM('WEEKLY_GAIN', 'TOTAL_GAIN') NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `valueUsd` DECIMAL(30, 8) NOT NULL,
    `returnPercent` DECIMAL(24, 12) NOT NULL,
    `rank` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WeeklyCompetitionResultRow_scope_rank_idx`(`scope`, `rank`),
    INDEX `WeeklyCompetitionResultRow_userId_scope_idx`(`userId`, `scope`),
    UNIQUE INDEX `WeeklyCompetitionResultRow_publicationId_scope_userId_key`(`publicationId`, `scope`, `userId`),
    UNIQUE INDEX `WeeklyCompetitionResultRow_publicationId_scope_rank_key`(`publicationId`, `scope`, `rank`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AiSignalLog` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `symbol` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `exchange` VARCHAR(191) NULL,
    `interval` VARCHAR(191) NOT NULL,
    `signalType` VARCHAR(191) NOT NULL,
    `recommendationText` TEXT NULL,
    `confidence` DOUBLE NULL,
    `riskScore` DOUBLE NULL,
    `opportunityScore` DOUBLE NULL,
    `priceAtSignal` DECIMAL(30, 8) NULL,
    `currency` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `indicatorsSnapshot` JSON NULL,
    `rawPayload` JSON NULL,

    INDEX `AiSignalLog_createdAt_idx`(`createdAt`),
    INDEX `AiSignalLog_symbol_interval_signalType_createdAt_idx`(`symbol`, `interval`, `signalType`, `createdAt`),
    INDEX `AiSignalLog_source_createdAt_idx`(`source`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AiSignalEvaluation` (
    `id` VARCHAR(191) NOT NULL,
    `signalLogId` VARCHAR(191) NOT NULL,
    `horizon` VARCHAR(191) NOT NULL,
    `evaluatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `priceAtEvaluation` DECIMAL(30, 8) NULL,
    `priceChangePercent` DECIMAL(24, 12) NULL,
    `directionCorrect` BOOLEAN NULL,
    `score` DOUBLE NULL,
    `resultLabel` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,

    INDEX `AiSignalEvaluation_horizon_evaluatedAt_idx`(`horizon`, `evaluatedAt`),
    INDEX `AiSignalEvaluation_status_idx`(`status`),
    UNIQUE INDEX `AiSignalEvaluation_signalLogId_horizon_key`(`signalLogId`, `horizon`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AiMarketFavorite` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `assetClass` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AiMarketFavorite_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `AiMarketFavorite_userId_symbol_key`(`userId`, `symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AiMarketReport` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `periodKey` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL DEFAULT 'GLOBAL',
    `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    `model` VARCHAR(191) NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `macroSummary` LONGTEXT NOT NULL,
    `marketRegime` VARCHAR(191) NULL,
    `riskAppetite` VARCHAR(191) NULL,
    `keyTakeaways` JSON NOT NULL,
    `requiredCoverage` JSON NOT NULL,
    `newsSummary` LONGTEXT NULL,
    `dataSnapshot` JSON NULL,
    `rawAiPayload` JSON NULL,
    `fallbackUsed` BOOLEAN NOT NULL DEFAULT false,
    `disclaimer` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AiMarketReport_generatedAt_idx`(`generatedAt`),
    INDEX `AiMarketReport_userId_generatedAt_idx`(`userId`, `generatedAt`),
    UNIQUE INDEX `AiMarketReport_userId_periodKey_scope_key`(`userId`, `periodKey`, `scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AiMarketReportEvent` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiMarketReportEvent_reportId_eventType_createdAt_idx`(`reportId`, `eventType`, `createdAt`),
    INDEX `AiMarketReportEvent_userId_eventType_createdAt_idx`(`userId`, `eventType`, `createdAt`),
    INDEX `AiMarketReportEvent_eventType_createdAt_idx`(`eventType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AiMarketReportAsset` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `assetClass` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `lastPrice` DECIMAL(30, 8) NULL,
    `changePercent` DECIMAL(24, 12) NULL,
    `signalType` VARCHAR(191) NULL,
    `confidence` DOUBLE NULL,
    `riskScore` DOUBLE NULL,
    `opportunityScore` DOUBLE NULL,
    `technicalCommentary` LONGTEXT NOT NULL,
    `macroCommentary` LONGTEXT NULL,
    `newsCommentary` LONGTEXT NULL,
    `watchLevels` JSON NULL,
    `scenarios` JSON NULL,
    `sourcePayload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiMarketReportAsset_symbol_createdAt_idx`(`symbol`, `createdAt`),
    UNIQUE INDEX `AiMarketReportAsset_reportId_symbol_key`(`reportId`, `symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AiMarketReportNewsItem` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `link` TEXT NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `category` VARCHAR(191) NULL,
    `relevance` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiMarketReportNewsItem_reportId_relevance_idx`(`reportId`, `relevance`),
    INDEX `AiMarketReportNewsItem_category_createdAt_idx`(`category`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `SubscriptionEmailLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `emailType` VARCHAR(191) NOT NULL,
    `periodKey` VARCHAR(191) NOT NULL,
    `subject` TEXT NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SubscriptionEmailLog_emailType_periodKey_idx`(`emailType`, `periodKey`),
    INDEX `SubscriptionEmailLog_sentAt_idx`(`sentAt`),
    UNIQUE INDEX `SubscriptionEmailLog_userId_emailType_periodKey_key`(`userId`, `emailType`, `periodKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `SupportReminderPeriod` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `periodKey` VARCHAR(191) NOT NULL,
    `onsitePromptCount` INTEGER NOT NULL DEFAULT 0,
    `suppressedAt` DATETIME(3) NULL,
    `emailAttemptedAt` DATETIME(3) NULL,
    `emailSentAt` DATETIME(3) NULL,
    `emailStatus` VARCHAR(191) NULL,
    `emailError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SupportReminderPeriod_periodKey_emailAttemptedAt_idx`(`periodKey`, `emailAttemptedAt`),
    UNIQUE INDEX `SupportReminderPeriod_userId_periodKey_key`(`userId`, `periodKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `SupportReminderEntry` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `entryTokenHash` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupportReminderEntry_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `SupportReminderEntry_periodId_entryTokenHash_key`(`periodId`, `entryTokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VipResearchReport` (
    `id` VARCHAR(191) NOT NULL,
    `periodKey` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    `model` VARCHAR(191) NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `marketContext` LONGTEXT NOT NULL,
    `executiveSummary` LONGTEXT NOT NULL,
    `methodologyVersion` VARCHAR(191) NOT NULL DEFAULT 'vip-asymmetric-v1',
    `sourceSnapshot` JSON NULL,
    `rawAiPayload` JSON NULL,
    `fallbackUsed` BOOLEAN NOT NULL DEFAULT false,
    `disclaimer` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VipResearchReport_periodKey_key`(`periodKey`),
    INDEX `VipResearchReport_generatedAt_idx`(`generatedAt`),
    INDEX `VipResearchReport_status_generatedAt_idx`(`status`, `generatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VipResearchIdea` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `providerSymbol` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `assetClass` VARCHAR(191) NOT NULL DEFAULT 'EQUITY',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `rank` INTEGER NOT NULL,
    `stance` VARCHAR(191) NOT NULL,
    `thesisSummary` LONGTEXT NOT NULL,
    `negativeCase` LONGTEXT NOT NULL,
    `macroThesis` LONGTEXT NOT NULL,
    `fundamentalThesis` LONGTEXT NOT NULL,
    `technicalThesis` LONGTEXT NOT NULL,
    `catalysts` JSON NOT NULL,
    `exitPlan` LONGTEXT NOT NULL,
    `institutionalPerception` LONGTEXT NOT NULL,
    `shortInterestCommentary` LONGTEXT NOT NULL,
    `confidenceScore` INTEGER NOT NULL,
    `riskScore` INTEGER NOT NULL,
    `priceAtRecommendation` DECIMAL(30, 8) NOT NULL,
    `entryLow` DECIMAL(30, 8) NOT NULL,
    `entryHigh` DECIMAL(30, 8) NOT NULL,
    `stopLoss` DECIMAL(30, 8) NOT NULL,
    `targetPrice` DECIMAL(30, 8) NOT NULL,
    `secondaryTargetPrice` DECIMAL(30, 8) NULL,
    `fundamentalSnapshot` JSON NOT NULL,
    `technicalSnapshot` JSON NOT NULL,
    `institutionalSnapshot` JSON NULL,
    `shortInterestSnapshot` JSON NULL,
    `sources` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VipResearchIdea_symbol_createdAt_idx`(`symbol`, `createdAt`),
    INDEX `VipResearchIdea_stance_confidenceScore_riskScore_idx`(`stance`, `confidenceScore`, `riskScore`),
    UNIQUE INDEX `VipResearchIdea_reportId_symbol_key`(`reportId`, `symbol`),
    UNIQUE INDEX `VipResearchIdea_reportId_rank_key`(`reportId`, `rank`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VipResearchIdeaEvaluation` (
    `id` VARCHAR(191) NOT NULL,
    `ideaId` VARCHAR(191) NOT NULL,
    `horizon` VARCHAR(191) NOT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `evaluatedAt` DATETIME(3) NULL,
    `priceAtEvaluation` DECIMAL(30, 8) NULL,
    `returnPercent` DECIMAL(24, 12) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VipResearchIdeaEvaluation_status_dueAt_idx`(`status`, `dueAt`),
    INDEX `VipResearchIdeaEvaluation_horizon_evaluatedAt_idx`(`horizon`, `evaluatedAt`),
    UNIQUE INDEX `VipResearchIdeaEvaluation_ideaId_horizon_key`(`ideaId`, `horizon`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VipResearchEmailLog` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SENT',
    `error` TEXT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VipResearchEmailLog_status_sentAt_idx`(`status`, `sentAt`),
    INDEX `VipResearchEmailLog_userId_sentAt_idx`(`userId`, `sentAt`),
    UNIQUE INDEX `VipResearchEmailLog_reportId_userId_key`(`reportId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VipSubscriptionPayment` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'PARAM',
    `providerReference` VARCHAR(191) NOT NULL,
    `amountTry` DECIMAL(30, 8) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PAID',
    `paidAt` DATETIME(3) NOT NULL,
    `paidUntil` DATETIME(3) NOT NULL,
    `refundedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `rawPayload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VipSubscriptionPayment_providerReference_key`(`providerReference`),
    INDEX `VipSubscriptionPayment_userId_paidAt_idx`(`userId`, `paidAt`),
    INDEX `VipSubscriptionPayment_status_paidUntil_idx`(`status`, `paidUntil`),
    INDEX `VipSubscriptionPayment_paidUntil_idx`(`paidUntil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VipSubscriptionClaim` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'PARAM',
    `providerReference` VARCHAR(191) NOT NULL,
    `activeReferenceKey` VARCHAR(191) NULL,
    `amountTry` DECIMAL(30, 8) NOT NULL DEFAULT 100,
    `verifiedPayerEmail` VARCHAR(254) NULL,
    `verifiedCurrency` VARCHAR(191) NULL,
    `verifiedAmountTry` DECIMAL(30, 8) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `userNote` TEXT NULL,
    `adminNote` TEXT NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VipSubscriptionClaim_activeReferenceKey_key`(`activeReferenceKey`),
    INDEX `VipSubscriptionClaim_provider_providerReference_userId_idx`(`provider`, `providerReference`, `userId`),
    INDEX `VipSubscriptionClaim_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `VipSubscriptionClaim_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VipTradingAgent` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `riskProfile` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `startingBalanceUsd` DECIMAL(30, 8) NOT NULL DEFAULT 1100000,
    `performanceBaseUsd` DECIMAL(30, 8) NOT NULL DEFAULT 1000000,
    `reserveUsd` DECIMAL(30, 8) NOT NULL DEFAULT 100000,
    `cashUsd` DECIMAL(30, 8) NOT NULL DEFAULT 1100000,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastRunAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VipTradingAgent_slug_key`(`slug`),
    INDEX `VipTradingAgent_isActive_lastRunAt_idx`(`isActive`, `lastRunAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VipTradingAgentPosition` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `positionCycleId` VARCHAR(191) NOT NULL,
    `appliedSplitFactor` DECIMAL(36, 12) NOT NULL DEFAULT 1,
    `corporateActionsCheckedAt` DATETIME(3) NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `providerSymbol` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(36, 12) NOT NULL,
    `averagePriceUsd` DECIMAL(30, 8) NOT NULL,
    `lastPriceUsd` DECIMAL(30, 8) NOT NULL,
    `stopLossUsd` DECIMAL(30, 8) NOT NULL,
    `targetPriceUsd` DECIMAL(30, 8) NOT NULL,
    `secondaryTarget` DECIMAL(30, 8) NULL,
    `sourceIdeaId` VARCHAR(191) NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VipTradingAgentPosition_symbol_updatedAt_idx`(`symbol`, `updatedAt`),
    UNIQUE INDEX `VipTradingAgentPosition_agentId_symbol_key`(`agentId`, `symbol`),
    UNIQUE INDEX `VipTradingAgentPosition_agentId_positionCycleId_key`(`agentId`, `positionCycleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VipTradingAgentTrade` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `positionCycleId` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `side` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(36, 12) NOT NULL,
    `priceUsd` DECIMAL(30, 8) NOT NULL,
    `grossUsd` DECIMAL(30, 8) NOT NULL,
    `costBasisUsd` DECIMAL(30, 8) NULL,
    `realizedPnlUsd` DECIMAL(30, 8) NULL,
    `realizedPnlPercent` DECIMAL(24, 12) NULL,
    `cashAfterUsd` DECIMAL(30, 8) NOT NULL,
    `portfolioAfterUsd` DECIMAL(30, 8) NOT NULL,
    `reason` TEXT NOT NULL,
    `sourceIdeaId` VARCHAR(191) NULL,
    `executedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VipTradingAgentTrade_agentId_positionCycleId_executedAt_idx`(`agentId`, `positionCycleId`, `executedAt`),
    INDEX `VipTradingAgentTrade_agentId_executedAt_idx`(`agentId`, `executedAt`),
    INDEX `VipTradingAgentTrade_symbol_executedAt_idx`(`symbol`, `executedAt`),
    UNIQUE INDEX `VipTradingAgentTrade_agentId_positionCycleId_side_key`(`agentId`, `positionCycleId`, `side`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VipTradingAgentDecision` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `runKey` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `priceUsd` DECIMAL(30, 8) NULL,
    `reason` TEXT NOT NULL,
    `sourceIdeaId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VipTradingAgentDecision_agentId_createdAt_idx`(`agentId`, `createdAt`),
    INDEX `VipTradingAgentDecision_action_createdAt_idx`(`action`, `createdAt`),
    UNIQUE INDEX `VipTradingAgentDecision_agentId_runKey_symbol_key`(`agentId`, `runKey`, `symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `VipTradingAgentSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `periodKey` VARCHAR(191) NOT NULL,
    `cashUsd` DECIMAL(30, 8) NOT NULL,
    `reserveUsd` DECIMAL(30, 8) NOT NULL,
    `positionsValueUsd` DECIMAL(30, 8) NOT NULL,
    `totalBalanceUsd` DECIMAL(30, 8) NOT NULL,
    `performanceEquityUsd` DECIMAL(30, 8) NOT NULL,
    `pnlUsd` DECIMAL(30, 8) NOT NULL,
    `returnPercent` DECIMAL(24, 12) NOT NULL,
    `capturedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VipTradingAgentSnapshot_agentId_capturedAt_idx`(`agentId`, `capturedAt`),
    INDEX `VipTradingAgentSnapshot_periodKey_returnPercent_idx`(`periodKey`, `returnPercent`),
    UNIQUE INDEX `VipTradingAgentSnapshot_agentId_periodKey_key`(`agentId`, `periodKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `SiteAnalyticsEvent` (
    `id` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `sessionKey` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NULL,
    `path` TEXT NULL,
    `referrer` TEXT NULL,
    `userAgent` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SiteAnalyticsEvent_eventType_createdAt_idx`(`eventType`, `createdAt`),
    INDEX `SiteAnalyticsEvent_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `SiteAnalyticsEvent_sessionKey_createdAt_idx`(`sessionKey`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AiDailyQueryUsage` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `dayKey` VARCHAR(191) NOT NULL,
    `queryCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AiDailyQueryUsage_dayKey_idx`(`dayKey`),
    UNIQUE INDEX `AiDailyQueryUsage_userId_dayKey_key`(`userId`, `dayKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AiQueryReservation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(128) NOT NULL,
    `dayKey` VARCHAR(191) NOT NULL,
    `purpose` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AiQueryReservation_tokenHash_key`(`tokenHash`),
    INDEX `AiQueryReservation_userId_dayKey_purpose_idx`(`userId`, `dayKey`, `purpose`),
    INDEX `AiQueryReservation_expiresAt_consumedAt_idx`(`expiresAt`, `consumedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `SecurityRateLimit` (
    `keyHash` VARCHAR(128) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `windowStart` DATETIME(3) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `blockedUntil` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SecurityRateLimit_scope_windowStart_idx`(`scope`, `windowStart`),
    INDEX `SecurityRateLimit_blockedUntil_idx`(`blockedUntil`),
    PRIMARY KEY (`keyHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `previousHash` VARCHAR(128) NULL,
    `eventHash` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AuditEvent_eventHash_key`(`eventHash`),
    INDEX `AuditEvent_category_createdAt_idx`(`category`, `createdAt`),
    INDEX `AuditEvent_entityType_entityId_createdAt_idx`(`entityType`, `entityId`, `createdAt`),
    INDEX `AuditEvent_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- The singleton row is updated first inside every audit append transaction.
-- InnoDB holds that row lock until commit, serializing the hash-chain head.
CREATE TABLE `AuditChainHead` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'global',
    `lastEventHash` VARCHAR(128) NULL,
    `lastCreatedAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `OperationalJobHeartbeat` (
    `jobKey` VARCHAR(191) NOT NULL,
    `lastStartedAt` DATETIME(3) NULL,
    `lastSucceededAt` DATETIME(3) NULL,
    `lastFailedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `metadata` JSON NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`jobKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `ChatRoom` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('GENERAL', 'PRIVATE') NOT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChatRoom_code_key`(`code`),
    INDEX `ChatRoom_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `ChatRoom_createdByUserId_idx`(`createdByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `ChatRoomMembership` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'MEMBER',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatRoomMembership_userId_joinedAt_idx`(`userId`, `joinedAt`),
    UNIQUE INDEX `ChatRoomMembership_roomId_userId_key`(`roomId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `ChatUpload` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `storedName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'STAGED',
    `expiresAt` DATETIME(3) NOT NULL,
    `linkedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ChatUpload_storedName_key`(`storedName`),
    INDEX `ChatUpload_status_expiresAt_idx`(`status`, `expiresAt`),
    INDEX `ChatUpload_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('TEXT', 'FILE', 'IMAGE', 'VIDEO', 'LOCATION', 'CONTACT', 'POLL') NOT NULL DEFAULT 'TEXT',
    `body` LONGTEXT NOT NULL,
    `attachment` JSON NULL,
    `hiddenAt` DATETIME(3) NULL,
    `hiddenReason` TEXT NULL,
    `hiddenByUserId` VARCHAR(191) NULL,
    `reportCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatMessage_roomId_createdAt_idx`(`roomId`, `createdAt`),
    INDEX `ChatMessage_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `ChatMessage_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `ChatMessage_hiddenAt_idx`(`hiddenAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `ChatPresence` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatPresence_lastSeenAt_idx`(`lastSeenAt`),
    INDEX `ChatPresence_userId_lastSeenAt_idx`(`userId`, `lastSeenAt`),
    UNIQUE INDEX `ChatPresence_roomId_userId_key`(`roomId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `ChatPollOption` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `ChatPollOption_messageId_sortOrder_idx`(`messageId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `ChatPollVote` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `optionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatPollVote_optionId_idx`(`optionId`),
    INDEX `ChatPollVote_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `ChatPollVote_messageId_userId_key`(`messageId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `ChatMessageReport` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    INDEX `ChatMessageReport_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `ChatMessageReport_reporterId_createdAt_idx`(`reporterId`, `createdAt`),
    UNIQUE INDEX `ChatMessageReport_messageId_reporterId_key`(`messageId`, `reporterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `ChatUserBlock` (
    `id` VARCHAR(191) NOT NULL,
    `blockerUserId` VARCHAR(191) NOT NULL,
    `blockedUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatUserBlock_blockedUserId_idx`(`blockedUserId`),
    UNIQUE INDEX `ChatUserBlock_blockerUserId_blockedUserId_key`(`blockerUserId`, `blockedUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `OAuthAccount` ADD CONSTRAINT `OAuthAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VirtualAccount` ADD CONSTRAINT `VirtualAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioPosition` ADD CONSTRAINT `PortfolioPosition_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VirtualTrade` ADD CONSTRAINT `VirtualTrade_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FriendRequest` ADD CONSTRAINT `FriendRequest_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FriendRequest` ADD CONSTRAINT `FriendRequest_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `League` ADD CONSTRAINT `League_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeagueMembership` ADD CONSTRAINT `LeagueMembership_leagueId_fkey` FOREIGN KEY (`leagueId`) REFERENCES `League`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeagueMembership` ADD CONSTRAINT `LeagueMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBadge` ADD CONSTRAINT `UserBadge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBadge` ADD CONSTRAINT `UserBadge_badgeId_fkey` FOREIGN KEY (`badgeId`) REFERENCES `Badge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AchievementEvent` ADD CONSTRAINT `AchievementEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioSnapshot` ADD CONSTRAINT `PortfolioSnapshot_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioSnapshot` ADD CONSTRAINT `PortfolioSnapshot_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `CompetitionPeriod`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyPortfolioBaseline` ADD CONSTRAINT `WeeklyPortfolioBaseline_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyCompetitionResultRow` ADD CONSTRAINT `WeeklyCompetitionResultRow_publicationId_fkey` FOREIGN KEY (`publicationId`) REFERENCES `WeeklyCompetitionPublication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyCompetitionResultRow` ADD CONSTRAINT `WeeklyCompetitionResultRow_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiSignalEvaluation` ADD CONSTRAINT `AiSignalEvaluation_signalLogId_fkey` FOREIGN KEY (`signalLogId`) REFERENCES `AiSignalLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiMarketFavorite` ADD CONSTRAINT `AiMarketFavorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiMarketReport` ADD CONSTRAINT `AiMarketReport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiMarketReportEvent` ADD CONSTRAINT `AiMarketReportEvent_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `AiMarketReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiMarketReportEvent` ADD CONSTRAINT `AiMarketReportEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiMarketReportAsset` ADD CONSTRAINT `AiMarketReportAsset_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `AiMarketReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiMarketReportNewsItem` ADD CONSTRAINT `AiMarketReportNewsItem_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `AiMarketReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionEmailLog` ADD CONSTRAINT `SubscriptionEmailLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportReminderPeriod` ADD CONSTRAINT `SupportReminderPeriod_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportReminderEntry` ADD CONSTRAINT `SupportReminderEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportReminderEntry` ADD CONSTRAINT `SupportReminderEntry_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `SupportReminderPeriod`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipResearchIdea` ADD CONSTRAINT `VipResearchIdea_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `VipResearchReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipResearchIdeaEvaluation` ADD CONSTRAINT `VipResearchIdeaEvaluation_ideaId_fkey` FOREIGN KEY (`ideaId`) REFERENCES `VipResearchIdea`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipResearchEmailLog` ADD CONSTRAINT `VipResearchEmailLog_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `VipResearchReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipResearchEmailLog` ADD CONSTRAINT `VipResearchEmailLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipSubscriptionPayment` ADD CONSTRAINT `VipSubscriptionPayment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipSubscriptionClaim` ADD CONSTRAINT `VipSubscriptionClaim_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipTradingAgentPosition` ADD CONSTRAINT `VipTradingAgentPosition_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `VipTradingAgent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipTradingAgentTrade` ADD CONSTRAINT `VipTradingAgentTrade_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `VipTradingAgent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipTradingAgentDecision` ADD CONSTRAINT `VipTradingAgentDecision_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `VipTradingAgent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipTradingAgentSnapshot` ADD CONSTRAINT `VipTradingAgentSnapshot_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `VipTradingAgent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteAnalyticsEvent` ADD CONSTRAINT `SiteAnalyticsEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiDailyQueryUsage` ADD CONSTRAINT `AiDailyQueryUsage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiQueryReservation` ADD CONSTRAINT `AiQueryReservation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatRoom` ADD CONSTRAINT `ChatRoom_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatRoomMembership` ADD CONSTRAINT `ChatRoomMembership_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `ChatRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatRoomMembership` ADD CONSTRAINT `ChatRoomMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatUpload` ADD CONSTRAINT `ChatUpload_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `ChatRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_hiddenByUserId_fkey` FOREIGN KEY (`hiddenByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatPresence` ADD CONSTRAINT `ChatPresence_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `ChatRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatPresence` ADD CONSTRAINT `ChatPresence_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatPollOption` ADD CONSTRAINT `ChatPollOption_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `ChatMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatPollVote` ADD CONSTRAINT `ChatPollVote_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `ChatMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatPollVote` ADD CONSTRAINT `ChatPollVote_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `ChatPollOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatPollVote` ADD CONSTRAINT `ChatPollVote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessageReport` ADD CONSTRAINT `ChatMessageReport_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `ChatMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessageReport` ADD CONSTRAINT `ChatMessageReport_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatUserBlock` ADD CONSTRAINT `ChatUserBlock_blockerUserId_fkey` FOREIGN KEY (`blockerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatUserBlock` ADD CONSTRAINT `ChatUserBlock_blockedUserId_fkey` FOREIGN KEY (`blockedUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
