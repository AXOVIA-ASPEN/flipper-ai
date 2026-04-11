/**
 * @file app/api/opportunities/[id]/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.2
 * @brief Opportunity detail API — GET, PATCH, DELETE for a single opportunity.
 *
 * @description
 * Authenticated endpoints for reading, updating, and deleting a single
 * opportunity. All handlers enforce ownership via userId-scoped queries
 * and PATCH allowlists the fields that a client may update to prevent
 * mass assignment. PATCH detects status transitions and creates
 * notification events for flip lifecycle tracking (Story 10.3).
 * PATCH also fires a conversation status transition to 'purchased'
 * when the status changes to PURCHASED (Story 8.5, fire-and-forget).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { handleError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { getCurrentUserId } from '@/lib/auth';
import { transitionToPurchased } from '@/lib/conversation-status';
import { deleteCalendarEvent, ensureValidToken, CalendarAuthRequiredError } from '@/lib/google-calendar';
import { hasValidToken } from '@/lib/google-calendar-token-store';
import {
  createFlipNotificationEvent,
  NotificationEventType,
} from '@/lib/notification-events';
import { logger } from '@/lib/logger';
import type { Prisma } from '@/generated/prisma';

/** Fields a client is allowed to update via PATCH. */
const UPDATABLE_FIELDS = [
  'status',
  'purchasePrice',
  'purchaseDate',
  'purchaseNotes',
  'resalePrice',
  'resalePlatform',
  'resaleUrl',
  'resaleDate',
  'fees',
  'notes',
] as const satisfies readonly (keyof Prisma.OpportunityUpdateInput)[];

function pickUpdatableFields(
  body: Record<string, unknown>
): Prisma.OpportunityUpdateInput {
  const out: Prisma.OpportunityUpdateInput = {};
  for (const key of UPDATABLE_FIELDS) {
    if (body[key] !== undefined) {
      // Cast: the allowlist guarantees the key is a valid update field;
      // Prisma will reject malformed values at the driver layer.
      (out as Record<string, unknown>)[key] = body[key];
    }
  }
  return out;
}

// GET /api/opportunities/[id] - Get a single opportunity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;
    const opportunity = await prisma.opportunity.findFirst({
      where: { id, userId },
      include: { listing: true },
    });

    if (!opportunity) {
      throw new NotFoundError('Opportunity not found');
    }

    return NextResponse.json(opportunity);
  } catch (error) {
    return handleError(error);
  }
}

// Valid status transitions for the opportunity lifecycle
const VALID_TRANSITIONS: Record<string, string[]> = {
  IDENTIFIED: ['CONTACTED', 'PASSED'],
  CONTACTED: ['PURCHASED', 'PASSED'],
  PURCHASED: ['LISTED', 'PASSED'],
  LISTED: ['SOLD', 'PASSED'],
  SOLD: [],
  PASSED: [],
};

// PATCH /api/opportunities/[id] - Update an opportunity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;

    // Fetch current state WITH status to detect transitions.
    const existing = await prisma.opportunity.findFirst({
      where: { id, userId },
      include: { listing: true },
    });

    if (!existing) {
      throw new NotFoundError('Opportunity not found');
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Validate status transition if status is being changed
    if (body.status !== undefined && typeof body.status === 'string') {
      const previousStatus = existing.status;
      const newStatus = body.status;

      if (previousStatus !== newStatus) {
        const allowed = VALID_TRANSITIONS[previousStatus];
        if (allowed && !allowed.includes(newStatus)) {
          throw new ValidationError(
            `Invalid status transition: ${previousStatus} → ${newStatus}`
          );
        }
      }
    }

    // Allowlist updatable fields — prevents mass assignment of userId, listingId, etc.
    const updateData = pickUpdatableFields(body);

    // Compute actualProfit when both prices are present.
    if (body.purchasePrice !== undefined && body.resalePrice !== undefined) {
      const fees = typeof body.fees === 'number' ? body.fees : 0;
      updateData.actualProfit =
        (body.resalePrice as number) - (body.purchasePrice as number) - fees;
    }

    const opportunity = await prisma.opportunity.update({
      where: { id, userId },
      data: updateData,
      include: { listing: true },
    });

    const previousStatus = existing.status;
    const newStatus = opportunity.status;

    // Fire-and-forget: transition conversation status to purchased (story 8.5).
    if (newStatus === 'PURCHASED' && previousStatus !== 'PURCHASED' && opportunity.listing?.id) {
      transitionToPurchased(opportunity.listing.id, userId).catch(() => {});
    }

    // Story 12.1: Fire-and-forget calendar event deletion when opportunity is PASSED.
    if (newStatus === 'PASSED' && previousStatus !== 'PASSED') {
      const calEventId = opportunity.calendarEventId;
      if (calEventId && opportunity.userId) {
        (async () => {
          try {
            const connected = await hasValidToken(opportunity.userId!);
            if (connected) {
              const accessToken = await ensureValidToken(opportunity.userId!);
              await deleteCalendarEvent(accessToken, calEventId);
            }
          } catch (err) {
            if (!(err instanceof CalendarAuthRequiredError)) {
              logger.warn('calendar.event.passed_deletion_failed', {
                opportunityId: opportunity.id,
                err: err instanceof Error ? err.message : String(err),
              });
            }
          }
        })().catch(() => {});
      }
    }

    // Story 10.3: Fire-and-forget notification events for status transitions
    if (previousStatus !== newStatus && opportunity.userId) {
      const listingTitle = opportunity.listing?.title ?? 'Unknown Item';
      const platform = opportunity.listing?.platform ?? 'Unknown';

      // flip.purchased
      if (newStatus === 'PURCHASED' && previousStatus !== 'PURCHASED') {
        createFlipNotificationEvent({
          userId: opportunity.userId,
          listingId: opportunity.listing?.id ?? null,
          eventType: NotificationEventType.FLIP_PURCHASED,
          payload: {
            listingTitle,
            purchasePrice: opportunity.purchasePrice ?? 0,
            estimatedProfit: opportunity.listing?.profitPotential ?? 0,
            platform,
          },
        }).catch((err) =>
          logger.error('notification.event.creation_failed', {
            err: err instanceof Error ? err.message : String(err),
            eventType: 'flip.purchased',
            userId: opportunity.userId,
            listingId: opportunity.listing?.id,
          })
        );
      }

      // flip.listed
      if (newStatus === 'LISTED' && previousStatus !== 'LISTED') {
        createFlipNotificationEvent({
          userId: opportunity.userId,
          listingId: opportunity.listing?.id ?? null,
          eventType: NotificationEventType.FLIP_LISTED,
          payload: {
            listingTitle,
            destinationPlatform:
              (body.resalePlatform as string) ??
              opportunity.resalePlatform ??
              'Unknown',
            listingUrl: (body.resaleUrl as string) ?? opportunity.resaleUrl ?? null,
          },
        }).catch((err) =>
          logger.error('notification.event.creation_failed', {
            err: err instanceof Error ? err.message : String(err),
            eventType: 'flip.listed',
            userId: opportunity.userId,
            listingId: opportunity.listing?.id,
          })
        );
      }

      // flip.sold
      if (newStatus === 'SOLD' && previousStatus !== 'SOLD') {
        const resalePrice =
          typeof body.resalePrice === 'number'
            ? body.resalePrice
            : opportunity.resalePrice;

        if (resalePrice != null && typeof resalePrice === 'number') {
          const purchasePrice = opportunity.purchasePrice ?? 0;
          const fees = opportunity.fees ?? 0;
          const actualProfit = resalePrice - purchasePrice - fees;
          const roiPercent =
            purchasePrice > 0 ? (actualProfit / purchasePrice) * 100 : 0;
          const purchaseDate = opportunity.purchaseDate;
          const daysToFlip = purchaseDate
            ? Math.floor(
                (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
              )
            : undefined;

          createFlipNotificationEvent({
            userId: opportunity.userId,
            listingId: opportunity.listing?.id ?? null,
            eventType: NotificationEventType.FLIP_SOLD,
            payload: {
              listingTitle,
              salePrice: resalePrice,
              actualProfit,
              purchasePrice,
              roiPercent,
              daysToFlip,
              platform,
            },
          }).catch((err) =>
            logger.error('notification.event.creation_failed', {
              err: err instanceof Error ? err.message : String(err),
              eventType: 'flip.sold',
              userId: opportunity.userId,
              listingId: opportunity.listing?.id,
            })
          );
        } else {
          logger.warn('notification.event.skipped.no_resale_price', {
            opportunityId: opportunity.id,
            eventType: 'flip.sold',
          });
        }
      }
    }

    return NextResponse.json(opportunity);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/opportunities/[id] - Delete an opportunity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;

    // Ownership-scoped lookup prevents a user from deleting another user's opportunity.
    const opportunity = await prisma.opportunity.findFirst({
      where: { id, userId },
      select: { listingId: true },
    });

    if (!opportunity) {
      throw new NotFoundError('Opportunity not found');
    }

    // Delete opportunity and reset listing status
    await prisma.$transaction([
      prisma.opportunity.delete({
        where: { id },
      }),
      prisma.listing.update({
        where: { id: opportunity.listingId },
        data: { status: 'NEW' },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
