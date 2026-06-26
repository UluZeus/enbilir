-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE "ChatMessage" ADD COLUMN "attachment" JSONB;

-- CreateTable
CREATE TABLE "ChatPollOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChatPollOption_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatPollVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatPollVote_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ChatPollOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ChatMessage_type_createdAt_idx" ON "ChatMessage"("type", "createdAt");

-- CreateIndex
CREATE INDEX "ChatPollOption_messageId_sortOrder_idx" ON "ChatPollOption"("messageId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ChatPollVote_messageId_userId_key" ON "ChatPollVote"("messageId", "userId");

-- CreateIndex
CREATE INDEX "ChatPollVote_optionId_idx" ON "ChatPollVote"("optionId");

-- CreateIndex
CREATE INDEX "ChatPollVote_userId_createdAt_idx" ON "ChatPollVote"("userId", "createdAt");
