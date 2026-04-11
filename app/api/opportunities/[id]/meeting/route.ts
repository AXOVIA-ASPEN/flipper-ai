/**
 * @file app/api/opportunities/[id]/meeting/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Meeting scheduling subroute — create/update and delete meeting for an opportunity.
 *
 * @description
 * POST  — accepts { meetingTime, meetingLocation, meetingType, timezone }.
 *         Saves meeting fields to DB FIRST (decoupled from calendar availability),
 *         then attempts Google Calendar create/update if the user has a connected
 *         calendar. Returns { code: 'CALENDAR_AUTH_REQUIRED' } with HTTP 401 if
 *         the refresh token is revoked.
 *
 * DELETE — clears all meeting fields and attempts Google Calendar deletion.
 *          Google 404 is treated as success.
 *
 * Note: meeting fields are NOT part of UPDATABLE_FIELDS in opportunities/[id]/route.ts;
 * all meeting changes must go through this subroute exclusively.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { handleError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import {
  ensureValidToken,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  CalendarAuthRequiredError,
} from '@/lib/google-calendar';
import { hasValidToken } from '@/lib/google-calendar-token-store';
import { logger } from '@/lib/logger';

// POST /api/opportunities/[id]/meeting
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const { id } = await params;

    const opportunity = await prisma.opportunity.findFirst({
      where: { id, userId },
      include: { listing: true },
    });
    if (!opportunity) throw new NotFoundError('Opportunity not found');

    const body = (await request.json()) as Record<string, unknown>;
    const { meetingTime, meetingLocation, meetingType, timezone } = body as {
      meetingTime?: string;
      meetingLocation?: string;
      meetingType?: string;
      timezone?: string;
    };

    if (!meetingTime) throw new ValidationError('meetingTime is required');
    if (!meetingLocation) throw new ValidationError('meetingLocation is required');
    if (!timezone || typeof timezone !== 'string' || timezone.trim() === '') {
      throw new ValidationError('timezone is required (IANA format, e.g. America/Los_Angeles)');
    }

    const meetingDate = new Date(meetingTime);
    if (isNaN(meetingDate.getTime())) {
      throw new ValidationError('meetingTime must be a valid ISO date string');
    }

    // 1. Save meeting data to DB FIRST (storage is decoupled from calendar availability)
    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        meetingTime: meetingDate,
        meetingLocation,
        meetingType: meetingType ?? null,
      },
      include: { listing: true },
    });

    // 2. Attempt calendar operation if Google Calendar is connected
    const calendarConnected = await hasValidToken(userId);
    if (!calendarConnected) {
      return NextResponse.json({ success: true, data: updated });
    }

    const listing = opportunity.listing;
    const titlePrefix = meetingType === 'sell' ? 'Sell' : 'Buy';
    const listingTitle = listing?.title ?? 'Item';
    const platform = listing?.platform ?? '';
    const platformSuffix = platform ? ` (${platform})` : '';

    const eventInput = {
      title: `${titlePrefix}: ${listingTitle}${platformSuffix}`,
      startTime: meetingDate,
      location: meetingLocation,
      description: [
        listing ? `Listing: ${listing.url ?? ''}` : '',
        listing?.sellerName ? `Seller/Buyer: ${listing.sellerName}` : '',
        listing?.sellerContact ? `Contact: ${listing.sellerContact}` : '',
        listing?.askingPrice ? `Asking price: $${listing.askingPrice}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      timezone,
    };

    try {
      const accessToken = await ensureValidToken(userId);
      let newEventId: string | undefined;

      if (opportunity.calendarEventId) {
        // Update existing event — may return new ID if stale
        const maybeNewId = await updateCalendarEvent(
          accessToken,
          opportunity.calendarEventId,
          eventInput
        );
        newEventId = maybeNewId ?? opportunity.calendarEventId;
      } else {
        // Create new event
        newEventId = await createCalendarEvent(accessToken, eventInput);
      }

      // Persist calendar event ID
      const final = await prisma.opportunity.update({
        where: { id },
        data: { calendarEventId: newEventId },
        include: { listing: true },
      });

      return NextResponse.json({ success: true, data: final });
    } catch (err) {
      if (err instanceof CalendarAuthRequiredError) {
        return NextResponse.json(
          { success: false, error: { code: 'CALENDAR_AUTH_REQUIRED' } },
          { status: 401 }
        );
      }
      // Non-fatal calendar error — log but return the saved meeting data
      logger.warn('calendar.event.create_update_failed', {
        opportunityId: id,
        err: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ success: true, data: updated });
    }
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/opportunities/[id]/meeting
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const { id } = await params;

    const opportunity = await prisma.opportunity.findFirst({
      where: { id, userId },
      select: { calendarEventId: true },
    });
    if (!opportunity) throw new NotFoundError('Opportunity not found');

    // Attempt calendar deletion if we have an event ID and a connected calendar
    if (opportunity.calendarEventId) {
      const calendarConnected = await hasValidToken(userId);
      if (calendarConnected) {
        try {
          const accessToken = await ensureValidToken(userId);
          await deleteCalendarEvent(accessToken, opportunity.calendarEventId);
        } catch (err) {
          // Non-fatal — log and continue with DB cleanup
          logger.warn('calendar.event.delete_failed', {
            opportunityId: id,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Clear all meeting fields
    await prisma.opportunity.update({
      where: { id },
      data: {
        meetingTime: null,
        meetingLocation: null,
        meetingType: null,
        calendarEventId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
