-- Story 11.2: Twilio SMS Integration
-- Adds phone verification fields and the master SMS toggle to UserSettings.
-- Columns are added IF NOT EXISTS because the dev database is synchronized
-- via `prisma db push` during local development, so the columns may already
-- be present. This makes the migration idempotent across dev / CI / prod.

ALTER TABLE "UserSettings"
  ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "phoneVerificationCode" TEXT,
  ADD COLUMN IF NOT EXISTS "phoneVerificationExpiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "smsNotifications" BOOLEAN NOT NULL DEFAULT false;
