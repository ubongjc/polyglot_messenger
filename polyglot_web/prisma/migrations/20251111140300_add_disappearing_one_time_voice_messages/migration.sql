-- AlterTable
ALTER TABLE "Message" ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "expiresInSeconds" INTEGER,
ADD COLUMN "isOneTimeView" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "viewedAt" TIMESTAMP(3),
ADD COLUMN "isVoiceMessage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "originalAudioUrl" TEXT,
ADD COLUMN "audioDurationMs" INTEGER;

-- CreateTable
CREATE TABLE "MessageView" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_expiresAt_idx" ON "Message"("expiresAt");

-- CreateIndex
CREATE INDEX "Message_isOneTimeView_viewedAt_idx" ON "Message"("isOneTimeView", "viewedAt");

-- CreateIndex
CREATE INDEX "MessageView_messageId_idx" ON "MessageView"("messageId");

-- CreateIndex
CREATE INDEX "MessageView_userId_idx" ON "MessageView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageView_messageId_userId_key" ON "MessageView"("messageId", "userId");

-- AddForeignKey
ALTER TABLE "MessageView" ADD CONSTRAINT "MessageView_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
