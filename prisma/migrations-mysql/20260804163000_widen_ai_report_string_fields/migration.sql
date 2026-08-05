ALTER TABLE `AiMarketReport`
    MODIFY `marketRegime` VARCHAR(512) NULL,
    MODIFY `riskAppetite` VARCHAR(512) NULL;

ALTER TABLE `AiMarketReportNewsItem`
    MODIFY `title` VARCHAR(512) NOT NULL;
