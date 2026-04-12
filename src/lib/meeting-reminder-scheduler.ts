/**
 * @file src/lib/meeting-reminder-scheduler.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Background scheduler for "time to leave" departure reminder notifications (Story 12.2).
 *
 * @description
 * Runs every 5 minutes (triggered via /api/meeting-reminders/run). For each opportunity
 * with an upcoming meeting and `notifyMeetingReminder = true`, computes the departure time
 * and dispatches a `meeting.departure_reminder` notification.
 *
 * Idempotency: checks for existing NotificationEvent within 2h of meetingTime before creating.
 * Fallback: uses 1-hour default buffer when Google Maps route is unavailable (AC-3).
 * Privacy: homeLocation and meetingLocation are never logged in plain text.
 * Channels: FCM push, email, SMS — each dispatched independently.
 * A failure on one channel must never block the others.
 * Execution cap: 90 seconds max to stay within Cloud Run timeout budget.
 */

import prisma from '@/lib/db';
import { getRoute } from '@/lib/maps-service';
import { NotificationEventType } from '@/lib/notification-events';
import { pushNotificationService } from '@/lib/push-notification';
import { emailService } from '@/lib/email-service';
import { smsService } from '@/lib/sms-service';
import { logger } from '@/lib/logger';
import { Prisma } from '@/generated/prisma';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Send when `now >= departureTime - 5min AND now < meetingTime` */
const DISPATCH_WINDOW_MS = 5 * 60 * 1000;
/** Fallback departure buffer when route is unavailable: 1 hour before meeting (AC-3) */
const FALLBACK_BUFFER_MS = 60 * 60 * 1000;
/** Deduplication window: look back 2 hours before meetingTime for existing event */
const DEDUP_WINDOW_MS = 2 * 60 * 60 * 1000;
/** Max run duration — 90 seconds (stays within Cloud Run budget) */
export const MAX_RUN_DURATION_MS = 90 * 1000;

// ---------------------------------------------------------------------------
// Payload type for departure reminder
// ---------------------------------------------------------------------------

export interface DepartureReminderPayload {
  opportunityId: string;
  listingId: string;
  listingTitle: string;
  sellerName?: string;
  meetingTime: string;           // ISO 8601
  meetingLocation: string;
  deepLinkUrl: string;           // Google Maps web deep link
  durationText: string;          // "30 mins" — or "Unknown" if degraded
  departureTime: string;         // ISO 8601
  routeDegraded: boolean;        // true = API not available
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface MeetingReminderRunSummary {
  processed: number;
  dispatched: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Main scheduler
// ---------------------------------------------------------------------------

/**
 * Run the meeting reminder scheduler.
 * Intended to be called every 5 minutes from the background job API endpoint.
 */
export async function runMeetingReminderScheduler(): Promise<MeetingReminderRunSummary> {
  const startTime = Date.now();
  const summary: MeetingReminderRunSummary = {
    processed: 0,
    dispatched: 0,
    skipped: 0,
    errors: 0,
    durationMs: 0,
  };

  const now = new Date();

  // Query: upcoming meetings, non-cancelled (meetingLocation not null), reminder enabled
  const upcoming = await prisma.opportunity.findMany({
    where: {
      meetingTime: { gt: now },
      meetingLocation: { not: null },
      user: {
        settings: { notifyMeetingReminder: true },
      },
    },
    include: {
      listing: { select: { id: true, title: true, sellerName: true } },
      user: {
        select: {
          id: true,
          email: true,
          settings: {
            select: {
              homeLocation: true,
              meetingDepartureBufferMinutes: true,
              notifyMeetingReminder: true,
              emailNotifications: true,
              pushNotifications: true,
              smsNotifications: true,
              phoneVerified: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
  });

  for (const opp of upcoming) {
    // Enforce max run duration
    if (Date.now() - startTime >= MAX_RUN_DURATION_MS) {
      logger.warn('meeting.reminder.max_duration_reached', {
        processed: summary.processed,
        remaining: upcoming.length - summary.processed,
      });
      break;
    }

    summary.processed++;

    try {
      const settings = opp.user?.settings;
      if (!settings || !opp.userId) {
        summary.skipped++;
        continue;
      }

      // meetingLocation is guaranteed non-null by the query
      const meetingLocation = opp.meetingLocation!;
      const meetingTime = opp.meetingTime!;
      const homeLocation = settings.homeLocation;

      // Skip if no home location (AC-6 — cannot compute departure)
      if (!homeLocation) {
        logger.warn('meeting.reminder.skip_no_home_location', {
          opportunityId: opp.id,
          userId: opp.userId.slice(0, 8) + '…',
        });
        summary.skipped++;
        continue;
      }

      // Attempt route calculation (cache reused if available)
      let durationMs: number;
      let durationText: string;
      let deepLinkUrl: string;
      let routeDegraded = false;

      try {
        const route = await getRoute(homeLocation, meetingLocation, opp.userId);
        if (route) {
          durationMs = route.durationSeconds * 1000;
          durationText = route.durationText;
          deepLinkUrl = route.deepLinkUrl;
        } else {
          durationMs = FALLBACK_BUFFER_MS;
          durationText = 'Unknown';
          deepLinkUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingLocation)}`;
          routeDegraded = true;
        }
      } catch {
        durationMs = FALLBACK_BUFFER_MS;
        durationText = 'Unknown';
        deepLinkUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingLocation)}`;
        routeDegraded = true;
      }

      // Compute departure time (meetingTime - travelDuration - userBuffer)
      const bufferMs = (settings.meetingDepartureBufferMinutes ?? 10) * 60 * 1000;
      const departureTime = new Date(meetingTime.getTime() - durationMs - bufferMs);
      const nowMs = Date.now();

      // Check if we're in the dispatch window: now >= departureTime - 5min AND now < meetingTime
      if (nowMs < departureTime.getTime() - DISPATCH_WINDOW_MS) {
        // Too early — will catch on a future run
        summary.skipped++;
        continue;
      }

      if (nowMs >= meetingTime.getTime()) {
        // Meeting already started — skip
        summary.skipped++;
        continue;
      }

      // Deduplication: check for existing event within 2h window
      const existingEvent = opp.listing?.id
        ? await prisma.notificationEvent.findFirst({
            where: {
              listingId: opp.listing.id,
              eventType: NotificationEventType.MEETING_DEPARTURE_REMINDER,
              createdAt: { gt: new Date(meetingTime.getTime() - DEDUP_WINDOW_MS) },
            },
            select: { id: true },
          })
        : null;

      if (existingEvent) {
        logger.debug('meeting.reminder.dedup_skip', { opportunityId: opp.id });
        summary.skipped++;
        continue;
      }

      // Re-check meetingLocation (meeting may have been cancelled since scheduler loaded)
      const freshOpp = await prisma.opportunity.findUnique({
        where: { id: opp.id },
        select: { meetingLocation: true },
      });
      if (!freshOpp?.meetingLocation) {
        logger.info('meeting.reminder.skip_meeting_cancelled', { opportunityId: opp.id });
        summary.skipped++;
        continue;
      }

      const listingTitle = opp.listing?.title ?? 'your item';

      const payload: DepartureReminderPayload = {
        opportunityId: opp.id,
        listingId: opp.listing?.id ?? '',
        listingTitle,
        sellerName: opp.listing?.sellerName ?? undefined,
        meetingTime: meetingTime.toISOString(),
        meetingLocation,
        deepLinkUrl,
        durationText,
        departureTime: departureTime.toISOString(),
        routeDegraded,
      };

      // Persist NotificationEvent for idempotency and audit trail
      if (opp.listing?.id) {
        try {
          await prisma.notificationEvent.create({
            data: {
              userId: opp.userId,
              listingId: opp.listing.id,
              eventType: NotificationEventType.MEETING_DEPARTURE_REMINDER,
              payload: payload as unknown as Prisma.InputJsonValue,
              deduplicationKey: `${opp.listing.id}:${NotificationEventType.MEETING_DEPARTURE_REMINDER}:${meetingTime.toISOString()}`,
              status: 'PENDING',
            },
          });
        } catch (err) {
          // P2002 = duplicate constraint — already created, proceed with dispatch
          if (
            !(err !== null &&
            typeof err === 'object' &&
            'code' in err &&
            (err as { code: string }).code === 'P2002')
          ) {
            throw err;
          }
        }
      }

      // Dispatch to all enabled channels independently
      const departureDisplayTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(departureTime);

      // --- FCM Push ---
      if (settings.pushNotifications) {
        const reminderMsg = routeDegraded
          ? `Time to leave for your ${listingTitle} meetup — travel time unavailable, allow extra time`
          : `Leave by ${departureDisplayTime} for your ${listingTitle} meetup`;

        pushNotificationService.sendToUser(opp.userId, {
          title: 'Time to leave for your meetup',
          body: reminderMsg,
          data: payload as unknown as Record<string, string>,
        }).catch((err: unknown) => {
          logger.error('meeting.reminder.push_failed', {
            opportunityId: opp.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      // --- Email ---
      if (settings.emailNotifications && opp.user?.email) {
        const emailBody = routeDegraded
          ? `Time to leave for your ${listingTitle} meetup — travel time unavailable, allow extra time`
          : `Leave by ${departureDisplayTime} for your ${listingTitle} meetup`;

        emailService.send({
          to: opp.user.email,
          subject: `Leave now — your ${listingTitle} meeting starts at ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(meetingTime)}`,
          html: `<p>${emailBody}</p><p><a href="${deepLinkUrl}">Open in Google Maps</a></p>`,
          text: emailBody,
        }).catch((err: unknown) => {
          logger.error('meeting.reminder.email_failed', {
            opportunityId: opp.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      // --- SMS ---
      if (settings.smsNotifications && settings.phoneVerified && settings.phoneNumber) {
        const location = meetingLocation.length > 30
          ? meetingLocation.slice(0, 27) + '…'
          : meetingLocation;
        const title = listingTitle.length > 20
          ? listingTitle.slice(0, 17) + '…'
          : listingTitle;

        const smsBody = `Flipper: Leave by ${departureDisplayTime} for your ${title} meetup at ${location} ${deepLinkUrl}`
          .slice(0, 160);

        smsService.send(settings.phoneNumber, smsBody).catch((err: unknown) => {
          logger.error('meeting.reminder.sms_failed', {
            opportunityId: opp.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      summary.dispatched++;
    } catch (err) {
      summary.errors++;
      logger.error('meeting.reminder.process_failed', {
        opportunityId: opp.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  summary.durationMs = Date.now() - startTime;
  logger.info('meeting.reminder.run_complete', summary as unknown as Record<string, unknown>);
  return summary;
}
