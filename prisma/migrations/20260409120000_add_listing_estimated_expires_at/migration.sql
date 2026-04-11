-- Story 10.2: Listing Monitoring Events
-- Adds computed expiry tracking to Listing so the monitoring pipeline can detect
-- listings approaching their platform-specific expiry window.

ALTER TABLE "Listing" ADD COLUMN "estimatedExpiresAt" TIMESTAMP(3);

CREATE INDEX "Listing_estimatedExpiresAt_idx" ON "Listing"("estimatedExpiresAt");
