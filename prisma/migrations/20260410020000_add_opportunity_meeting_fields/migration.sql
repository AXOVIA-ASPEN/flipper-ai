-- Story 12.1: Meeting scheduling fields on Opportunity
--
-- These four columns were originally introduced via `prisma db push` during
-- development and were never captured as a migration. As a result a fresh
-- `prisma migrate deploy` (production provisioning) created the Opportunity
-- table without them, and the following migration
-- (20260411000000_add_meeting_route_settings) failed when it tried to build a
-- composite index on Opportunity(meetingTime, meetingLocation).
--
-- This migration backfills the missing column definitions BEFORE that index is
-- created. It is fully idempotent (ADD COLUMN IF NOT EXISTS), so it is a safe
-- no-op on any database where the columns already exist (e.g. dev databases
-- previously synced with `db push`).
ALTER TABLE "Opportunity"
  ADD COLUMN IF NOT EXISTS "meetingTime"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "meetingLocation" TEXT,
  ADD COLUMN IF NOT EXISTS "meetingType"     TEXT,
  ADD COLUMN IF NOT EXISTS "calendarEventId" TEXT;
