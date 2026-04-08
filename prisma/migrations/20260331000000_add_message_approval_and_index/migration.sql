-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "messageApprovalRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Message_userId_status_direction_idx" ON "Message"("userId", "status", "direction");
