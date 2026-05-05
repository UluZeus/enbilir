-- CreateTable
CREATE TABLE "AdPlacement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slot" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displaySeconds" INTEGER NOT NULL DEFAULT 8,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AdPlacement_slot_isActive_priority_idx" ON "AdPlacement"("slot", "isActive", "priority");
