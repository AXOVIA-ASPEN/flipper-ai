/**
 * @file app/api/opportunities/[id]/maps-route/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief GET /api/opportunities/[id]/maps-route — driving route from saved home location to meeting.
 *
 * @description
 * Returns route data (travel time, distance, departure time, deep-link URL) for a scheduled
 * meeting on an opportunity. Requires PRO subscription (meeting_logistics feature gate).
 *
 * Response states:
 *  - ok              → full route data with departureTime and deepLinkUrl
 *  - past_meeting    → meetingTime is in the past (AC-2)
 *  - missing_home_location → UserSettings.homeLocation is null (AC-6)
 *  - degraded        → GOOGLE_MAPS_API_KEY not set or no route found (AC-5)
 *
 * Privacy: homeLocation is never logged in plain text. Use handleError() for all catch paths.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { getRoute } from '@/lib/maps-service';
import { enforceFeatureAccess } from '@/lib/tier-enforcement';
import {
  handleError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Authentication required');

    // Subscription gate: meeting_logistics is a PRO-tier feature
    await enforceFeatureAccess(userId, 'meetingLogistics');

    const { id } = await params;

    // Load opportunity with listing data
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: { listing: { select: { title: true, id: true } } },
    });

    if (!opportunity) {
      throw new NotFoundError('Opportunity');
    }

    // Ownership check
    if (opportunity.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Validate that a meeting location is set
    if (!opportunity.meetingLocation) {
      throw new ValidationError('No meeting location set for this opportunity');
    }

    const meetingLocation: string = opportunity.meetingLocation;
    const listingTitle: string = opportunity.listing?.title ?? 'Unknown Item';
    const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingLocation)}`;

    // AC-2: meeting already in the past → return past_meeting state
    if (opportunity.meetingTime && opportunity.meetingTime < new Date()) {
      return NextResponse.json({
        success: true,
        data: {
          state: 'past_meeting',
          location: meetingLocation,
          listingTitle,
          mapsSearchUrl,
        },
      });
    }

    // Load user settings for homeLocation and buffer
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { homeLocation: true, meetingDepartureBufferMinutes: true },
    });

    const homeLocation = settings?.homeLocation;
    const bufferMinutes = settings?.meetingDepartureBufferMinutes ?? 10;

    // AC-6: home location not configured → return nudge state
    if (!homeLocation) {
      return NextResponse.json({
        success: true,
        data: {
          state: 'missing_home_location',
          location: meetingLocation,
          listingTitle,
          mapsSearchUrl,
        },
      });
    }

    // Attempt route calculation (may return null if API key absent or ZERO_RESULTS)
    let route;
    try {
      route = await getRoute(homeLocation, meetingLocation, userId);
    } catch (routeErr) {
      // Log without including raw addresses
      logger.error('maps.route.error', {
        opportunityId: id,
        error: routeErr instanceof Error ? routeErr.message : String(routeErr),
      });
      // Degrade gracefully — don't throw for API errors, let UI show degraded state
      route = null;
    }

    // AC-5: degraded state when no route available
    if (!route) {
      return NextResponse.json({
        success: true,
        data: {
          state: 'degraded',
          location: meetingLocation,
          listingTitle,
          mapsSearchUrl,
        },
      });
    }

    // Compute departure time using buffer
    let departureTime: Date | null = null;
    let departureIsPast = false;

    if (opportunity.meetingTime) {
      departureTime = new Date(
        opportunity.meetingTime.getTime()
          - route.durationSeconds * 1000
          - bufferMinutes * 60 * 1000
      );
      departureIsPast = departureTime < new Date();
    }

    return NextResponse.json({
      success: true,
      data: {
        state: 'ok',
        route,
        departureTime: departureTime?.toISOString() ?? null,
        departureIsPast,
        deepLinkUrl: route.deepLinkUrl,
        mapsSearchUrl: route.mapsSearchUrl,
        location: meetingLocation,
        listingTitle,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

