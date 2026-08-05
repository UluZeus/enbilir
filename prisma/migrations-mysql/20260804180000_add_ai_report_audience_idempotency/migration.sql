ALTER TABLE `AiMarketReport`
    ADD COLUMN `audienceKey` VARCHAR(191) NULL;

UPDATE `AiMarketReport`
SET `audienceKey` = CASE
    WHEN `userId` IS NOT NULL THEN `userId`
    ELSE CONCAT('LEGACY:', SHA2(`id`, 256))
END;

CREATE TEMPORARY TABLE `_AiMarketReportAudienceCanonical` AS
SELECT `periodKey`, `scope`, MIN(`id`) AS `canonicalId`
FROM `AiMarketReport`
WHERE `userId` IS NULL
  AND `scope` IN ('GLOBAL', 'WEEKLY')
GROUP BY `periodKey`, `scope`;

UPDATE `AiMarketReport` AS `report`
INNER JOIN `_AiMarketReportAudienceCanonical` AS `canonical`
    ON `canonical`.`canonicalId` = `report`.`id`
SET `report`.`audienceKey` = 'PUBLIC';

DROP TEMPORARY TABLE `_AiMarketReportAudienceCanonical`;

ALTER TABLE `AiMarketReport`
    MODIFY `audienceKey` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `AiMarketReport_audienceKey_periodKey_scope_key`
    ON `AiMarketReport`(`audienceKey`, `periodKey`, `scope`);
