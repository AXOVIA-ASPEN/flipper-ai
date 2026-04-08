/**
 * @file src/lib/conversation-status.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Conversation status tracking and state transitions for listings.
 *
 * @description
 * Manages conversation lifecycle for marketplace listings. Tracks whether
 * a seller conversation is pending (awaiting reply), responded (seller
 * replied), or purchased (deal closed). Enforces valid state transitions:
 * null→pending, pending→responded, any→purchased. All DB queries are
 * scoped to userId for ownership enforcement.
 */

import prisma from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/errors';

/** Valid conversation status values */
export type ConversationStatus = 'pending' | 'responded' | 'purchased';

/** All valid conversation statuses */
export const CONVERSATION_STATUSES: readonly ConversationStatus[] = [
  'pending',
  'responded',
  'purchased',
] as const;

/**
 * Valid state transitions:
 * - null → pending (first outbound message sent)
 * - null → purchased (rare but valid: direct purchase without prior messaging)
 * - pending → responded (seller replied)
 * - responded → responded (additional replies, no-op)
 * - any → purchased (deal closed from any state)
 * - purchased → purchased (terminal, no-op)
 *
 * Invalid: responded→pending, purchased→pending, purchased→responded
 */
const VALID_TRANSITIONS: Record<string, ConversationStatus[]> = {
  null: ['pending', 'purchased'],
  pending: ['responded', 'purchased'],
  responded: ['responded', 'purchased'],
  purchased: ['purchased'],
};

/**
 * Check if a state transition is valid.
 */
function isValidTransition(
  from: string | null,
  to: ConversationStatus
): boolean {
  const key = from ?? 'null';
  const allowed = VALID_TRANSITIONS[key];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Get the conversation status for a listing.
 * Scoped to userId for ownership enforcement.
 */
export async function getConversationStatus(
  listingId: string,
  userId: string
): Promise<ConversationStatus | null> {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    select: { conversationStatus: true },
  });

  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  return (listing.conversationStatus as ConversationStatus) ?? null;
}

/**
 * Update conversation status with ownership check and transition validation.
 */
export async function updateConversationStatus(
  listingId: string,
  userId: string,
  status: ConversationStatus
): Promise<ConversationStatus> {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    select: { conversationStatus: true },
  });

  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  const currentStatus = listing.conversationStatus as ConversationStatus | null;

  if (!isValidTransition(currentStatus, status)) {
    throw new ValidationError(
      `Invalid conversation status transition: ${currentStatus ?? 'null'} → ${status}`
    );
  }

  // No-op for idempotent transitions
  if (currentStatus === status) {
    return status;
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: { conversationStatus: status },
  });

  return status;
}

/**
 * Transition to 'pending' — only if currently null (first outbound message).
 * Fire-and-forget safe: silently ignores invalid transitions.
 */
export async function transitionToPending(
  listingId: string,
  userId: string
): Promise<void> {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    select: { conversationStatus: true },
  });

  if (!listing) return;

  if (listing.conversationStatus === null) {
    await prisma.listing.update({
      where: { id: listingId },
      data: { conversationStatus: 'pending' },
    });
  }
}

/**
 * Transition to 'responded' — only if currently 'pending'.
 * Fire-and-forget safe: silently ignores invalid transitions.
 */
export async function transitionToResponded(
  listingId: string,
  userId: string
): Promise<void> {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    select: { conversationStatus: true },
  });

  if (!listing) return;

  if (listing.conversationStatus === 'pending') {
    await prisma.listing.update({
      where: { id: listingId },
      data: { conversationStatus: 'responded' },
    });
  }
}

/**
 * Transition to 'purchased' — from any state (terminal state).
 * Fire-and-forget safe: silently ignores if already purchased.
 */
export async function transitionToPurchased(
  listingId: string,
  userId: string
): Promise<void> {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    select: { conversationStatus: true },
  });

  if (!listing) return;

  if (listing.conversationStatus !== 'purchased') {
    await prisma.listing.update({
      where: { id: listingId },
      data: { conversationStatus: 'purchased' },
    });
  }
}
