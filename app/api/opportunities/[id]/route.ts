/**
 * @file app/api/opportunities/[id]/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.1
 * @brief Opportunity detail API — GET, PATCH, DELETE for a single opportunity.
 *
 * @description
 * Authenticated endpoints for reading, updating, and deleting a single
 * opportunity. All handlers enforce ownership via userId-scoped queries
 * and PATCH allowlists the fields that a client may update to prevent
 * mass assignment. PATCH fires a conversation status transition to
 * 'purchased' when the status changes to PURCHASED (story 8.5,
 * fire-and-forget).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { handleError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { getCurrentUserId } from '@/lib/auth';
import { transitionToPurchased } from '@/lib/conversation-status';
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

    // Verify ownership before mutation (prevents info leakage and unauthorized updates).
    const existing = await prisma.opportunity.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Opportunity not found');
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Allowlist updatable fields — prevents mass assignment of userId, listingId, etc.
    const updateData = pickUpdatableFields(body);

    // Compute actualProfit when both prices are present.
    if (body.purchasePrice !== undefined && body.resalePrice !== undefined) {
      const fees = typeof body.fees === 'number' ? body.fees : 0;
      updateData.actualProfit =
        (body.resalePrice as number) - (body.purchasePrice as number) - fees;
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: updateData,
      include: { listing: true },
    });

    // Fire-and-forget: transition conversation status to purchased (story 8.5).
    if (opportunity.status === 'PURCHASED' && opportunity.listing?.id) {
      transitionToPurchased(opportunity.listing.id, userId).catch(() => {});
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
