-- Story 12.2: Google Maps Route Generation
-- Adds departure-buffer and meeting-reminder-toggle to UserSettings.
-- Adds composite index on Opportunity(meetingTime, meetingLocation) for the
-- meeting-reminder scheduler query.

-- ── UserSettings: departure configuration ────────────────────────────────────
ALTER TABLE "UserSettings"
  ADD COLUMN IF NOT EXISTS "meetingDepartureBufferMinutes" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "notifyMeetingReminder"         BOOLEAN NOT NULL DEFAULT true;

-- ── Opportunity: scheduler performance index ──────────────────────────────────
-- Used by runMeetingReminderScheduler to efficiently query upcoming meetings.
CREATE INDEX IF NOT EXISTS "Opportunity_meetingTime_meetingLocation_idx"
  ON "Opportunity"("meetingTime", "meetingLocation");
