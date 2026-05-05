-- CreateTable
CREATE TABLE "SiteVisualSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisualSetting_key_key" ON "SiteVisualSetting"("key");

-- CreateIndex
CREATE INDEX "SiteVisualSetting_type_idx" ON "SiteVisualSetting"("type");
