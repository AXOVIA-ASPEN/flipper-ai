-- Story 11.3: Multi-Channel Notification Preferences
-- Adds per-event push and SMS toggle columns to UserSettings.
-- All columns use IF NOT EXISTS for idempotency — dev environments that ran
-- `prisma db push` already have some of these columns in the Prisma schema.
--
-- CATCH-UP BLOCK (Stories 10.5 & 10.6):
-- These fields were added to schema.prisma but never landed as migrations.
-- They are included here so production deployments are not broken by schema drift.

-- ── Catch-up: Story 10.5 Smart Alert toggles ─────────────────────────────────
ALTER TABLE "UserSettings"
  ADD COLUMN IF NOT EXISTS "notifyReviewReceived"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyFlipGoneCold"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyFlipTurnedHot"   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyPriceChanges"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "flipGoneColdHours"     INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS "flipTurnedHotCount"    INTEGER NOT NULL DEFAULT 3;

-- ── Catch-up: Story 10.6 Monitoring toggle ───────────────────────────────────
ALTER TABLE "UserSettings"
  ADD COLUMN IF NOT EXISTS "notifyListingUnavailable" BOOLEAN NOT NULL DEFAULT true;

-- ── Story 11.3: Per-event push notification toggles ───────────────────────────
-- Requires master pushNotifications ON + browser Notification permission granted.
ALTER TABLE "UserSettings"
  ADD COLUMN IF NOT EXISTS "pushNotifyNewDeals"           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushNotifySoldItems"          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushNotifyMessageReceived"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushNotifyDraftReady"         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushNotifyMessageSent"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pushNotifyReviewReceived"     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushNotifyFlipGoneCold"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushNotifyFlipTurnedHot"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushNotifyPriceDrops"         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushNotifyExpiring"           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushNotifyListingUnavailable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushNotifyWeeklyDigest"       BOOLEAN NOT NULL DEFAULT false;

-- ── Story 11.3: Per-event SMS notification toggles ────────────────────────────
-- Requires master smsNotifications ON + verified phone number.
-- Conservative defaults (more OFF) to reduce alert fatigue and Twilio costs.
ALTER TABLE "UserSettings"
  ADD COLUMN IF NOT EXISTS "smsNotifyNewDeals"            BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "smsNotifySoldItems"           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "smsNotifyMessageReceived"     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "smsNotifyDraftReady"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "smsNotifyMessageSent"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "smsNotifyReviewReceived"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "smsNotifyFlipGoneCold"        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "smsNotifyFlipTurnedHot"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "smsNotifyPriceDrops"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "smsNotifyExpiring"            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "smsNotifyListingUnavailable"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "smsNotifyWeeklyDigest"        BOOLEAN NOT NULL DEFAULT false;
