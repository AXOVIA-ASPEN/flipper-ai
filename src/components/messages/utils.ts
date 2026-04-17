/**
 * @file src/components/messages/utils.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.1
 * @brief Shared utilities for message components.
 *
 * @description
 * Provides PLATFORM_COLORS map and getImageUrl helper used by ThreadItem
 * and ThreadHeader components. Story 14.7 migration: PLATFORM_COLORS now
 * returns canonical `.fp-badge fp-badge-<color>` class strings; legacy
 * light/dark prefixes removed. The getImageUrl function parses the legacy
 * imageUrls JSON column. When the API includes the images relation,
 * components should migrate to getListingImageUrl from src/lib/image-helpers.ts.
 */

/**
 * Maps a platform identifier to a canonical fp-badge class string.
 * The mapping uses neutral/info colors (blue, gray, purple) because the
 * platform label is non-financial — per FR-UI-DESIGN-04, green is reserved
 * for profit. Unknown platforms fall back to fp-badge-gray at the call site.
 */
export const PLATFORM_COLORS: Record<string, string> = {
  CRAIGSLIST: 'fp-badge fp-badge-orange',
  EBAY: 'fp-badge fp-badge-blue',
  FACEBOOK: 'fp-badge fp-badge-purple',
  MERCARI: 'fp-badge fp-badge-red',
  OFFERUP: 'fp-badge fp-badge-yellow',
};

/**
 * Parses the legacy imageUrls JSON string and returns the first URL.
 * Note: Does not handle Firebase Storage images (ListingImage relation).
 * See src/lib/image-helpers.ts getListingImageUrl() for full resolution.
 */
export function getImageUrl(imageUrls: string | null): string | null {
  if (!imageUrls) return null;
  try {
    const urls = JSON.parse(imageUrls) as string[];
    return urls[0] || null;
  } catch {
    return null;
  }
}
