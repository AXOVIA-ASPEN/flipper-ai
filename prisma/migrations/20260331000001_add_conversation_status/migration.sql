-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "conversationStatus" TEXT;

-- CreateIndex
CREATE INDEX "Listing_conversationStatus_idx" ON "Listing"("conversationStatus");
