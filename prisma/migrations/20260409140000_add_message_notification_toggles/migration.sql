-- Story 10.4: Communication Email Notifications
-- Adds per-event notification toggles for message events to UserSettings.
-- Columns are added IF NOT EXISTS because the dev database may be synchronized
-- via `prisma db push` during local development, making this migration idempotent.

ALTER TABLE "UserSettings"
  ADD COLUMN IF NOT EXISTS "notifyMessageReceived" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyDraftReady" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyMessageSent" BOOLEAN NOT NULL DEFAULT false;
