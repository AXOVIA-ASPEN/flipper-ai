/**
 * Image URL helpers for UI components.
 *
 * Provides a consistent way to resolve the best available image URL for a
 * listing, preferring Firebase Storage URLs (ListingImage relation) over the
 * legacy JSON-stringified `imageUrls` column.
 */

import type { Listing, ListingImage } from '@/generated/prisma';

export type ListingWithImages = Listing & { images: ListingImage[] };

/**
 * Returns the primary image URL for a listing.
 *
 * Resolution order:
 * 1. First Firebase Storage URL from the `images` relation (storageUrl)
 * 2. First URL from the legacy `imageUrls` JSON column
 * 3. null if neither is available
 */
export function getListingImageUrl(listing: ListingWithImages): string | null {
  if (listing.images?.length > 0) {
    const sorted = listing.images.slice().sort((a, b) => a.imageIndex - b.imageIndex);
    return sorted[0].storageUrl;
  }
  if (listing.imageUrls) {
    try {
      const urls = JSON.parse(listing.imageUrls) as string[];
      return urls[0] || null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Returns all image URLs for a listing in imageIndex order.
 *
 * Resolution order:
 * 1. Firebase Storage URLs from the `images` relation, sorted by imageIndex
 * 2. URLs from the legacy `imageUrls` JSON column
 * 3. Empty array if neither is available
 */
export function getAllListingImageUrls(listing: ListingWithImages): string[] {
  if (listing.images?.length > 0) {
    return listing.images
      .slice()
      .sort((a, b) => a.imageIndex - b.imageIndex)
      .map((img) => img.storageUrl);
  }
  if (listing.imageUrls) {
    try {
      return JSON.parse(listing.imageUrls) as string[];
    } catch {
      return [];
    }
  }
  return [];
}
