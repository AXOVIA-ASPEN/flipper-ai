-- Reconcile schema drift accumulated via `prisma db push`
--
-- Background: many columns, two whole tables (GoogleCalendarToken,
-- PasswordResetToken), and several indexes/constraints were applied to dev/prod
-- databases over time using `prisma db push`, which does NOT write migration
-- files. As a result the migration history fell far behind prisma/schema.prisma,
-- and a fresh `prisma migrate deploy` (production provisioning) produced a
-- database missing — among other things — User.firebaseUid (the auth lookup key),
-- User.stripeCustomerId, the entire password-reset and Google-Calendar token
-- tables, and ~15 Listing AI-analysis columns. The running app (Prisma Client is
-- generated from schema.prisma) would crash against such a database.
--
-- This migration backfills everything needed to make a migrate-deploy database
-- match schema.prisma exactly. It was generated with
--   prisma migrate diff --from-config-datasource --to-schema --script
-- and is purely additive EXCEPT one intentional omission: the diff also wanted to
-- DROP INDEX "monitoring_job_running_unique" — a PARTIAL unique index
-- (WHERE status = 'RUNNING') created in 20260408000000. Prisma cannot represent
-- partial indexes in schema.prisma (see the documenting comment on the
-- MonitoringJob model), so that DROP was removed here to preserve the index.

-- AlterTable
ALTER TABLE "AiAnalysisCache" ADD COLUMN     "analysisType" TEXT NOT NULL DEFAULT 'claude';

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "adjustedProfitMargin" DOUBLE PRECISION,
ADD COLUMN     "compMatchConfidence" TEXT,
ADD COLUMN     "completenessLabel" TEXT,
ADD COLUMN     "conditionRisk" TEXT,
ADD COLUMN     "estimatedShippingCost" DOUBLE PRECISION,
ADD COLUMN     "outsidePickupRadius" BOOLEAN,
ADD COLUMN     "pickupDistanceMiles" DOUBLE PRECISION,
ADD COLUMN     "sellerAccountAgeDays" INTEGER,
ADD COLUMN     "sellerRating" DOUBLE PRECISION,
ADD COLUMN     "sellerReviewCount" INTEGER,
ADD COLUMN     "shippingEstimatesJson" TEXT,
ADD COLUMN     "sizeCategory" TEXT,
ADD COLUMN     "soldVolume30Days" INTEGER,
ADD COLUMN     "soldVolume60Days" INTEGER,
ADD COLUMN     "soldVolume90Days" INTEGER,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NotificationEvent" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PriceHistory" ADD COLUMN     "dataType" TEXT NOT NULL DEFAULT 'sold';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firebaseUid" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "feeRateCraigslist" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "feeRateEbay" DOUBLE PRECISION NOT NULL DEFAULT 13.0,
ADD COLUMN     "feeRateFacebook" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "feeRateMercari" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
ADD COLUMN     "feeRateOfferup" DOUBLE PRECISION NOT NULL DEFAULT 12.9,
ADD COLUMN     "holdingCostDailyRate" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
ADD COLUMN     "homeLocation" TEXT,
ADD COLUMN     "maxPickupRadiusMiles" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "opportunityThreshold" INTEGER NOT NULL DEFAULT 70;

-- CreateTable
CREATE TABLE "GoogleCalendarToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "calendarEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarToken_userId_key" ON "GoogleCalendarToken"("userId");

-- CreateIndex
CREATE INDEX "GoogleCalendarToken_userId_idx" ON "GoogleCalendarToken"("userId");

-- CreateIndex
CREATE INDEX "GoogleCalendarToken_expiresAt_idx" ON "GoogleCalendarToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiAnalysisCache_listingId_analysisType_key" ON "AiAnalysisCache"("listingId", "analysisType");

-- CreateIndex
CREATE INDEX "Message_listingId_createdAt_idx" ON "Message"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_listingId_direction_createdAt_idx" ON "Message"("listingId", "direction", "createdAt");

-- CreateIndex
CREATE INDEX "PriceHistory_productName_platform_dataType_createdAt_idx" ON "PriceHistory"("productName", "platform", "dataType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "GoogleCalendarToken" ADD CONSTRAINT "GoogleCalendarToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "NotificationEvent_userId_listingId_eventType_deduplicationKey_k" RENAME TO "NotificationEvent_userId_listingId_eventType_deduplicationK_key";

