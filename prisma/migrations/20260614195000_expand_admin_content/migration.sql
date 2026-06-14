-- AlterTable
ALTER TABLE "AdPlacement" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "AdPlacement" ADD COLUMN "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "ManagedContentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ManagedContentItem_type_locale_isActive_sortOrder_idx" ON "ManagedContentItem"("type", "locale", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ManagedContentItem_isFeatured_isActive_idx" ON "ManagedContentItem"("isFeatured", "isActive");
