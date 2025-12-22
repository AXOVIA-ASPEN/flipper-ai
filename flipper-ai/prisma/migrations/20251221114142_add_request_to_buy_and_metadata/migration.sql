-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "daysListed" INTEGER;
ALTER TABLE "Listing" ADD COLUMN "discountPercent" REAL;
ALTER TABLE "Listing" ADD COLUMN "estimatedWeight" REAL;
ALTER TABLE "Listing" ADD COLUMN "negotiable" BOOLEAN;
ALTER TABLE "Listing" ADD COLUMN "notes" TEXT;
ALTER TABLE "Listing" ADD COLUMN "profitHigh" REAL;
ALTER TABLE "Listing" ADD COLUMN "profitLow" REAL;
ALTER TABLE "Listing" ADD COLUMN "requestToBuy" TEXT;
ALTER TABLE "Listing" ADD COLUMN "resaleDifficulty" TEXT;
ALTER TABLE "Listing" ADD COLUMN "shippable" BOOLEAN;
ALTER TABLE "Listing" ADD COLUMN "tags" TEXT;
