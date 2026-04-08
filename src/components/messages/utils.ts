/**
 * @file src/components/messages/utils.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Shared utilities for message components.
 *
 * @description
 * Provides PLATFORM_COLORS map and getImageUrl helper used by ThreadItem
 * and ThreadHeader components. The getImageUrl function parses the legacy
 * imageUrls JSON column. When the API includes the images relation,
 * components should migrate to getListingImageUrl from src/lib/image-helpers.ts.
 */

export const PLATFORM_COLORS: Record<string, string> = {
  CRAIGSLIST: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  EBAY: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  FACEBOOK: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  MERCARI: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  OFFERUP: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
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
