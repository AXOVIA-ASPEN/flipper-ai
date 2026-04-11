/**
 * file: src/lib/posting-queue-image-status.ts
 * author: Stephen Boyett
 * company: Axovia AI
 * date: 2026-04-08
 * version: 1.0
 * brief: Computes the imageStatus field exposed by the posting-queue API.
 *
 * description:
 *     Centralizes the three-state imageStatus computation used by
 *     GET /api/posting-queue and GET /api/posting-queue/[id] responses.
 *     The value is computed from the eagerly-loaded listing payload at
 *     serialization time — it is NOT persisted on PostingQueueItem because
 *     it would become stale the moment a user uploads images manually.
 *
 *     States:
 *       - 'available': listing.images has one or more Firebase Storage records
 *       - 'legacy-fallback': no ListingImage records, but legacy imageUrls JSON
 *         column is populated — cross-posting will attempt a runtime download
 *       - 'manual-upload-required': neither source has any URLs; the user must
 *         upload images themselves before posting (or accept a text-only listing)
 */

export type PostingQueueImageStatus =
  | 'available'
  | 'legacy-fallback'
  | 'manual-upload-required';

// Narrow listing shape — only the two fields we actually need to inspect.
// Kept loose on purpose so both the full Prisma Listing relation and the
// narrower API select shape in app/api/posting-queue/route.ts satisfy it.
interface ListingLike {
  images?: { id: string }[] | null;
  imageUrls?: string | null;
}

/**
 * Parse a legacy `imageUrls` JSON column and return true only when it
 * contains at least one string URL. Guards against empty arrays (`'[]'`),
 * non-array JSON (`'{}'`), malformed JSON, and other edge cases that
 * would cause a false `'legacy-fallback'` status.
 */
function hasLegacyUrls(imageUrls: string | null | undefined): boolean {
  if (!imageUrls) return false;
  try {
    const parsed = JSON.parse(imageUrls);
    return Array.isArray(parsed) && parsed.some((u): u is string => typeof u === 'string');
  } catch {
    return false;
  }
}

/**
 * Returns the imageStatus value for a listing, or null if the listing is
 * missing (e.g., soft-deleted but the queue item still exists).
 */
export function computeImageStatus(
  listing: ListingLike | null | undefined
): PostingQueueImageStatus | null {
  if (!listing) return null;
  if (listing.images && listing.images.length > 0) return 'available';
  if (hasLegacyUrls(listing.imageUrls)) return 'legacy-fallback';
  return 'manual-upload-required';
}
